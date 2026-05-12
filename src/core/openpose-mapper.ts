import type { FrameData, Vec3, OpenPoseFrame } from '../types/pose'

export const BODY_KEYPOINTS = [
  'nose', 'neck', 'right_shoulder', 'right_elbow', 'right_wrist',
  'left_shoulder', 'left_elbow', 'left_wrist', 'right_hip', 'right_knee',
  'right_ankle', 'left_hip', 'left_knee', 'left_ankle', 'right_eye',
  'left_eye', 'right_ear', 'left_ear',
] as const

const MIXAMO_TO_BODY: Record<string, string> = {
  mixamorig_Neck: 'neck',
  mixamorig_RightArm: 'right_shoulder',
  mixamorig_RightForeArm: 'right_elbow',
  mixamorig_RightHand: 'right_wrist',
  mixamorig_LeftArm: 'left_shoulder',
  mixamorig_LeftForeArm: 'left_elbow',
  mixamorig_LeftHand: 'left_wrist',
  mixamorig_RightUpLeg: 'right_hip',
  mixamorig_RightLeg: 'right_knee',
  mixamorig_RightFoot: 'right_ankle',
  mixamorig_LeftUpLeg: 'left_hip',
  mixamorig_LeftLeg: 'left_knee',
  mixamorig_LeftFoot: 'left_ankle',
}

const HAND_FINGER_MAP: Record<string, number[]> = {
  Thumb: [1, 2, 3, 4],
  Index: [5, 6, 7, 8],
  Middle: [9, 10, 11, 12],
  Ring: [13, 14, 15, 16],
  Pinky: [17, 18, 19, 20],
}

function vecSub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function vecScale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s]
}

function vecMid(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
}

function vecLen(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
}

function vecNorm(v: Vec3): Vec3 | null {
  const l = vecLen(v)
  if (l < 1e-6) return null
  return [v[0] / l, v[1] / l, v[2] / l]
}

function deriveFaceKeypoints(joints: FrameData): Record<string, Vec3> {
  const headTop = joints.get('mixamorig_HeadTop_End')
  const headBase = joints.get('mixamorig_Head')
  const neck = joints.get('mixamorig_Neck')
  const rShoulder = joints.get('mixamorig_RightArm')
  const lShoulder = joints.get('mixamorig_LeftArm')

  const result: Record<string, Vec3> = {}
  if (!headBase && !headTop) return result

  let nose: Vec3
  if (headBase && headTop) {
    nose = vecMid(headBase, headTop)
  } else if (headTop) {
    nose = [...headTop]
  } else {
    nose = [...headBase!]
  }
  result.nose = nose

  let upVec: Vec3 | null = null
  const base = neck ?? headBase
  if (headTop && base) {
    upVec = vecNorm(vecSub(headTop, base))
  }

  let rightVec: Vec3 | null = null
  if (rShoulder && lShoulder) {
    rightVec = vecNorm(vecSub(rShoulder, lShoulder))
  }

  if (upVec && rightVec && headTop) {
    const baseRef = neck ?? headBase!
    const headHeight = vecLen(vecSub(headTop, baseRef))
    const eyeUp = vecScale(upVec, headHeight * 0.15)
    const eyeSide = vecScale(rightVec, headHeight * 0.15)
    const earSide = vecScale(rightVec, headHeight * 0.25)

    result.right_eye = vecAdd(vecAdd(nose, eyeUp), eyeSide)
    result.left_eye = vecSub(vecAdd(nose, eyeUp), eyeSide)
    result.right_ear = vecAdd(nose, earSide)
    result.left_ear = vecSub(nose, earSide)
  }

  return result
}

function mapHandKeypoints(joints: FrameData, side: 'Left' | 'Right'): (Vec3 | null)[] | null {
  const prefix = `mixamorig_${side}Hand`
  const wrist = joints.get(prefix)
  if (!wrist) return null

  const kps: (Vec3 | null)[] = new Array(21).fill(null)
  kps[0] = wrist

  for (const [finger, indices] of Object.entries(HAND_FINGER_MAP)) {
    for (let boneIdx = 0; boneIdx < indices.length; boneIdx++) {
      const boneName = `${prefix}${finger}${boneIdx + 1}`
      const pos = joints.get(boneName)
      if (pos) kps[indices[boneIdx]] = pos
    }
  }

  if (kps.slice(1).every(kp => kp === null)) return null
  return kps
}

export function mapFrameToOpenpose(joints: FrameData, drawHands: boolean): OpenPoseFrame {
  const faceKps = deriveFaceKeypoints(joints)

  const body: (Vec3 | null)[] = new Array(18).fill(null)

  for (const [mixName, opName] of Object.entries(MIXAMO_TO_BODY)) {
    const pos = joints.get(mixName)
    if (pos) {
      body[BODY_KEYPOINTS.indexOf(opName as typeof BODY_KEYPOINTS[number])] = pos
    }
  }

  for (const faceName of ['nose', 'right_eye', 'left_eye', 'right_ear', 'left_ear'] as const) {
    if (faceKps[faceName]) {
      body[BODY_KEYPOINTS.indexOf(faceName)] = faceKps[faceName]
    }
  }

  return {
    body,
    leftHand: drawHands ? mapHandKeypoints(joints, 'Left') : null,
    rightHand: drawHands ? mapHandKeypoints(joints, 'Right') : null,
  }
}

export function mapToOpenpose(rawFrames: FrameData[], drawHands: boolean): OpenPoseFrame[] {
  return rawFrames.map(frame => mapFrameToOpenpose(frame, drawHands))
}

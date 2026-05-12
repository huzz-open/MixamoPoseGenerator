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

// iBUG 300-W standard 68-point face template (normalized ~[-0.5, 0.5])
// Source: https://github.com/LynnHo/Facial-Landmarks-of-Face-Datasets/blob/master/standard_landmark_68pts.txt
const FACE_68_TEMPLATE: [number, number][] = [
  [-0.51105,-0.24368],[-0.50919,-0.11102],[-0.49652,0.02327],[-0.47124,0.15701],
  [-0.42508,0.28046],[-0.34844,0.38646],[-0.24897,0.47259],[-0.13143,0.53458],
  [0.00309,0.55314],[0.13544,0.53128],[0.24665,0.46490],[0.33960,0.37596],
  [0.40937,0.26841],[0.45088,0.14570],[0.47487,0.01464],[0.48653,-0.11700],
  [0.48685,-0.24627],
  [-0.41404,-0.36757],[-0.35431,-0.42701],[-0.26933,-0.44896],[-0.17910,-0.44080],
  [-0.09441,-0.41361],
  [0.09693,-0.41416],[0.18049,-0.44053],[0.26842,-0.44832],[0.35093,-0.42576],
  [0.40611,-0.36559],
  [0.00424,-0.29384],[0.00491,-0.21672],[0.00530,-0.14329],[0.00612,-0.06733],
  [-0.11396,0.02484],[-0.05713,0.03876],[0.00402,0.04893],[0.06433,0.03958],
  [0.11914,0.02668],
  [-0.32440,-0.26271],[-0.26523,-0.29584],[-0.19653,-0.29544],[-0.13453,-0.25383],
  [-0.19817,-0.23839],[-0.26746,-0.23779],
  [0.13330,-0.25298],[0.19726,-0.29485],[0.26592,-0.29320],[0.32244,-0.25975],
  [0.26697,-0.23612],[0.19851,-0.23697],
  [-0.19348,0.22360],[-0.12398,0.16954],[-0.04830,0.13928],[0.00488,0.15346],
  [0.05858,0.13932],[0.13269,0.17050],[0.19716,0.22352],
  [0.13447,0.27243],[0.06516,0.29927],[0.00461,0.30451],[-0.05574,0.29914],
  [-0.12687,0.27183],
  [-0.16628,0.22138],[-0.05071,0.20801],[0.00463,0.21274],[0.06050,0.20851],
  [0.17000,0.22193],[0.06141,0.21976],[0.00473,0.22424],[-0.05154,0.21919],
]

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

function deriveFace68Landmarks(joints: FrameData, scaleFactor: number): (Vec3 | null)[] | null {
  const headTop = joints.get('mixamorig_HeadTop_End')
  const headBase = joints.get('mixamorig_Head')
  const rShoulder = joints.get('mixamorig_RightArm')
  const lShoulder = joints.get('mixamorig_LeftArm')

  if (!headBase || !headTop) return null

  const headHeight = vecLen(vecSub(headTop, headBase))
  if (headHeight < 1e-6) return null

  const upVec = vecNorm(vecSub(headTop, headBase))
  if (!upVec) return null

  let rightVec: Vec3 | null = null
  if (rShoulder && lShoulder) {
    rightVec = vecNorm(vecSub(rShoulder, lShoulder))
  }
  if (!rightVec) rightVec = [1, 0, 0]

  const faceSize = headHeight * scaleFactor
  const faceCenter = vecMid(headBase, headTop)

  const result: (Vec3 | null)[] = []
  for (const [tx, ty] of FACE_68_TEMPLATE) {
    const pt = vecAdd(
      vecAdd(faceCenter, vecScale(rightVec, tx * faceSize)),
      vecScale(upVec, -ty * faceSize),
    )
    result.push(pt)
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

export function mapFrameToOpenpose(joints: FrameData, drawHands: boolean, drawFace: boolean = true, faceScale: number = 0.55): OpenPoseFrame {
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
    face: drawFace ? deriveFace68Landmarks(joints, faceScale) : null,
  }
}

export function mapToOpenpose(rawFrames: FrameData[], drawHands: boolean, drawFace: boolean = true, faceScale: number = 0.55): OpenPoseFrame[] {
  return rawFrames.map(frame => mapFrameToOpenpose(frame, drawHands, drawFace, faceScale))
}

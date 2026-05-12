export type Vec3 = [number, number, number]

export type JointMap = Map<string, Vec3>

export type FrameData = JointMap

export type Bone = [string, string]

export interface ParseResult {
  frames: FrameData[]
  bones: Bone[]
  frameCount: number
  /** Detected from animation time array; null if not determinable */
  fps: number | null
}

export interface OpenPoseKeypoint {
  x: number
  y: number
  z: number
}

export interface OpenPoseFrame {
  body: (Vec3 | null)[]
  leftHand: (Vec3 | null)[] | null
  rightHand: (Vec3 | null)[] | null
  face: (Vec3 | null)[] | null
}

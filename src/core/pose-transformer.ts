import type { FrameData, Vec3 } from '../types/pose'

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Build combined 3x3 rotation matrix from Euler angles (degrees).
 * Composition order matches Python: R = Rz @ (Rx @ Ry)
 * Returns flat 9-element array in row-major order.
 */
function buildRotationMatrix(rx: number, ry: number, rz: number): number[] {
  const a = deg2rad(rx), b = deg2rad(ry), c = deg2rad(rz)
  const ca = Math.cos(a), sa = Math.sin(a)
  const cb = Math.cos(b), sb = Math.sin(b)
  const cc = Math.cos(c), sc = Math.sin(c)

  // Rx
  const rx0 = [1, 0, 0]
  const rx1 = [0, ca, -sa]
  const rx2 = [0, sa, ca]

  // Ry
  const ry0 = [cb, 0, sb]
  const ry1 = [0, 1, 0]
  const ry2 = [-sb, 0, cb]

  // RxRy = Rx @ Ry
  const mul3 = (a: number[][], b: number[][]): number[][] => {
    const out: number[][] = [[], [], []]
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        out[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j]
      }
    }
    return out
  }

  const rxRy = mul3([rx0, rx1, rx2], [ry0, ry1, ry2])

  // Rz
  const rz0 = [cc, -sc, 0]
  const rz1 = [sc, cc, 0]
  const rz2 = [0, 0, 1]

  const R = mul3([rz0, rz1, rz2], rxRy)
  return [...R[0], ...R[1], ...R[2]]
}

function applyRotation(R: number[], v: Vec3): Vec3 {
  return [
    R[0] * v[0] + R[1] * v[1] + R[2] * v[2],
    R[3] * v[0] + R[4] * v[1] + R[5] * v[2],
    R[6] * v[0] + R[7] * v[1] + R[8] * v[2],
  ]
}

/** Deep-clone frames so mutations don't affect originals. */
export function cloneFrames(frames: FrameData[]): FrameData[] {
  return frames.map(frame => {
    const newFrame: FrameData = new Map()
    for (const [k, v] of frame) {
      newFrame.set(k, [v[0], v[1], v[2]])
    }
    return newFrame
  })
}

/**
 * Apply rotation, scaling, and centering to raw joint positions.
 * Matches Python apply_transform_to_frames exactly.
 */
export function transformFrames(
  frames: FrameData[],
  canvasWidth: number,
  canvasHeight: number,
  rotation: [number, number, number],
  scale: number,
): FrameData[] {
  const R = buildRotationMatrix(rotation[0], rotation[1], rotation[2])

  // Phase 1: scale + rotate
  for (const frame of frames) {
    for (const [joint, pos] of frame) {
      const scaled: Vec3 = [pos[0] * scale, pos[1] * scale, pos[2] * scale]
      frame.set(joint, applyRotation(R, scaled))
    }
  }

  // Phase 2: center
  const cx = Math.floor(canvasWidth / 2)
  const cy = Math.floor(canvasHeight / 2)

  for (const frame of frames) {
    const pts = Array.from(frame.values())
    if (pts.length === 0) continue

    let sumX = 0, sumY = 0
    for (const p of pts) { sumX += p[0]; sumY += p[1] }
    const avgX = sumX / pts.length
    const avgY = sumY / pts.length
    const dx = cx - avgX
    const dy = cy - avgY

    for (const [joint, pos] of frame) {
      frame.set(joint, [pos[0] + dx, pos[1] + dy, pos[2]])
    }
  }

  return frames
}

/** Evenly subsample frames to at most maxFrames. */
export function subsampleFrames<T>(frames: T[], maxFrames: number): T[] {
  if (frames.length <= maxFrames) return frames
  const step = frames.length / maxFrames
  return Array.from({ length: maxFrames }, (_, i) => frames[Math.round(i * step)])
}

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

const AUTO_FIT_PADDING = 0.05

/**
 * Apply rotation, auto-fit scaling, and centering to raw joint positions.
 * Automatically scales the skeleton to fill the canvas (with 5% padding),
 * using a consistent scale across all frames for stable animation.
 */
export function transformFrames(
  frames: FrameData[],
  canvasWidth: number,
  canvasHeight: number,
  rotation: [number, number, number],
): FrameData[] {
  const R = buildRotationMatrix(rotation[0], rotation[1], rotation[2])

  // Phase 1: rotate (no scaling yet)
  for (const frame of frames) {
    for (const [joint, pos] of frame) {
      frame.set(joint, applyRotation(R, pos))
    }
  }

  // Phase 2: compute global bounding box across ALL frames for stable animation
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  for (const frame of frames) {
    for (const pos of frame.values()) {
      if (pos[0] < minX) minX = pos[0]
      if (pos[0] > maxX) maxX = pos[0]
      if (pos[1] < minY) minY = pos[1]
      if (pos[1] > maxY) maxY = pos[1]
    }
  }

  const rangeX = maxX - minX
  const rangeY = maxY - minY
  if (rangeX <= 0 && rangeY <= 0) return frames

  // Phase 3: auto-fit scale to fill canvas with padding
  const usableW = canvasWidth * (1 - AUTO_FIT_PADDING * 2)
  const usableH = canvasHeight * (1 - AUTO_FIT_PADDING * 2)
  const scaleX = rangeX > 0 ? usableW / rangeX : Infinity
  const scaleY = rangeY > 0 ? usableH / rangeY : Infinity
  const autoScale = Math.min(scaleX, scaleY)

  // Phase 4: scale + center each frame
  const cx = canvasWidth / 2
  const cy = canvasHeight / 2
  const bboxCx = (minX + maxX) / 2
  const bboxCy = (minY + maxY) / 2

  for (const frame of frames) {
    for (const [joint, pos] of frame) {
      frame.set(joint, [
        (pos[0] - bboxCx) * autoScale + cx,
        (pos[1] - bboxCy) * autoScale + cy,
        pos[2] * autoScale,
      ])
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

import type { OpenPoseFrame, Vec3 } from '../../types/pose'
import type { Color } from '../render-utils'
import { ellipse2Poly, fillConvexPoly, fillCircle, drawLine, hsvToRgb, createBlackCanvas } from '../render-utils'

const LIMB_SEQ: [number, number][] = [
  [2, 3], [2, 6], [3, 4], [4, 5],
  [6, 7], [7, 8], [2, 9], [9, 10],
  [10, 11], [2, 12], [12, 13], [13, 14],
  [2, 1], [1, 15], [15, 17],
  [1, 16], [16, 18],
]

const COLORS: Color[] = [
  [255, 0, 0], [255, 85, 0], [255, 170, 0], [255, 255, 0],
  [170, 255, 0], [85, 255, 0], [0, 255, 0], [0, 255, 85],
  [0, 255, 170], [0, 255, 255], [0, 170, 255], [0, 85, 255],
  [0, 0, 255], [85, 0, 255], [170, 0, 255], [255, 0, 255],
  [255, 0, 170], [255, 0, 85],
]

const HAND_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
]

/**
 * Wan 2.2 DWPose body rendering:
 * 1. Draw all limbs with full color
 * 2. Darken entire canvas by 0.6
 * 3. Draw bright joint circles on top
 */
function drawBodyposeWan(ctx: CanvasRenderingContext2D, body: (Vec3 | null)[], W: number, H: number) {
  const stickwidth = 4

  for (let i = 0; i < LIMB_SEQ.length; i++) {
    const [k1Idx, k2Idx] = LIMB_SEQ[i]
    const kp1 = body[k1Idx - 1]
    const kp2 = body[k2Idx - 1]
    if (!kp1 || !kp2) continue

    // Wan 2.2 naming: Y0,Y1 = kp[0]; X0,X1 = kp[1]
    const Y0 = kp1[0], Y1 = kp2[0]
    const X0 = kp1[1], X1 = kp2[1]
    const mX = (X0 + X1) / 2.0
    const mY = (Y0 + Y1) / 2.0
    const length = Math.sqrt((X0 - X1) ** 2 + (Y0 - Y1) ** 2)
    if (length < 1) continue

    const angle = (Math.atan2(X0 - X1, Y0 - Y1) * 180) / Math.PI
    const polygon = ellipse2Poly(
      [Math.round(mY), Math.round(mX)],
      [Math.round(length / 2), stickwidth],
      Math.round(angle), 0, 360, 1
    )
    fillConvexPoly(ctx, polygon, COLORS[i])
  }

  // canvas *= 0.6 - darken entire canvas
  const imgData = ctx.getImageData(0, 0, W, H)
  const d = imgData.data
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(d[i] * 0.6)
    d[i + 1] = Math.round(d[i + 1] * 0.6)
    d[i + 2] = Math.round(d[i + 2] * 0.6)
  }
  ctx.putImageData(imgData, 0, 0)

  // Draw bright joint circles
  for (let i = 0; i < body.length; i++) {
    const kp = body[i]
    if (!kp) continue
    fillCircle(ctx, Math.round(kp[0]), Math.round(kp[1]), 4, COLORS[i])
  }
}

function drawHandposeWan(ctx: CanvasRenderingContext2D, hand: (Vec3 | null)[] | null) {
  if (!hand) return
  const eps = 0.01
  const nEdges = HAND_EDGES.length

  for (let ie = 0; ie < HAND_EDGES.length; ie++) {
    const [e1, e2] = HAND_EDGES[ie]
    const k1 = hand[e1], k2 = hand[e2]
    if (!k1 || !k2) continue
    const x1 = Math.round(k1[0]), y1 = Math.round(k1[1])
    const x2 = Math.round(k2[0]), y2 = Math.round(k2[1])
    if (x1 > eps && y1 > eps && x2 > eps && y2 > eps) {
      const color = hsvToRgb(ie / nEdges, 1.0, 1.0)
      drawLine(ctx, x1, y1, x2, y2, color, 2)
    }
  }

  for (const kp of hand) {
    if (!kp) continue
    const x = Math.round(kp[0]), y = Math.round(kp[1])
    if (x > eps && y > eps) {
      fillCircle(ctx, x, y, 4, [0, 0, 255])
    }
  }
}

export function renderDwposeFrame(
  frame: OpenPoseFrame,
  width: number,
  height: number,
  drawHands: boolean,
): HTMLCanvasElement {
  const [canvas, ctx] = createBlackCanvas(width, height)

  drawBodyposeWan(ctx, frame.body, width, height)
  if (drawHands) {
    drawHandposeWan(ctx, frame.leftHand)
    drawHandposeWan(ctx, frame.rightHand)
  }

  return canvas
}

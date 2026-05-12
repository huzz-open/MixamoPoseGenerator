import type { OpenPoseFrame, Vec3 } from '../../types/pose'
import type { Color } from '../render-utils'
import { ellipse2Poly, fillConvexPoly, fillCircle, drawLine, hsvToRgb, createBlackCanvas } from '../render-utils'

const LIMB_SEQ: [number, number][] = [
  [2, 3], [2, 6], [3, 4], [4, 5],
  [6, 7], [7, 8], [2, 9], [9, 10],
  [10, 11], [2, 12], [12, 13], [13, 14],
  [2, 1], [1, 15], [15, 17], [1, 16],
  [16, 18],
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

function drawBodypose(ctx: CanvasRenderingContext2D, body: (Vec3 | null)[], H: number, W: number, xinsrScaling: boolean) {
  const stickwidth = 4
  let stickScale = 1
  if (xinsrScaling) {
    const maxSide = Math.max(H, W)
    stickScale = maxSide < 500 ? 1 : Math.min(2 + Math.floor(maxSide / 1000), 7)
  }

  for (let i = 0; i < LIMB_SEQ.length; i++) {
    const [k1Idx, k2Idx] = LIMB_SEQ[i]
    const kp1 = body[k1Idx - 1]
    const kp2 = body[k2Idx - 1]
    if (!kp1 || !kp2) continue

    const x1 = kp1[0], y1 = kp1[1]
    const x2 = kp2[0], y2 = kp2[1]
    const mX = (y1 + y2) / 2.0
    const mY = (x1 + x2) / 2.0
    const length = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
    if (length < 1) continue

    const angle = (Math.atan2(y1 - y2, x1 - x2) * 180) / Math.PI
    const polygon = ellipse2Poly(
      [Math.round(mY), Math.round(mX)],
      [Math.round(length / 2), stickwidth * stickScale],
      Math.round(angle), 0, 360, 1
    )

    const color = COLORS[i]
    const limbColor: Color = [
      Math.round(color[0] * 0.6),
      Math.round(color[1] * 0.6),
      Math.round(color[2] * 0.6),
    ]
    fillConvexPoly(ctx, polygon, limbColor)
  }

  const jointRadius = xinsrScaling ? 4 * stickScale : 4
  for (let i = 0; i < body.length; i++) {
    const kp = body[i]
    if (!kp) continue
    fillCircle(ctx, Math.round(kp[0]), Math.round(kp[1]), jointRadius, COLORS[i])
  }
}

function drawFacepose(ctx: CanvasRenderingContext2D, face: (Vec3 | null)[] | null) {
  if (!face) return
  const eps = 0.01
  for (const kp of face) {
    if (!kp) continue
    const x = Math.round(kp[0]), y = Math.round(kp[1])
    if (x > eps && y > eps) {
      fillCircle(ctx, x, y, 3, [255, 255, 255])
    }
  }
}

function drawHandpose(ctx: CanvasRenderingContext2D, hand: (Vec3 | null)[] | null) {
  if (!hand) return
  const nEdges = HAND_EDGES.length

  for (let ie = 0; ie < HAND_EDGES.length; ie++) {
    const [e1, e2] = HAND_EDGES[ie]
    const k1 = hand[e1], k2 = hand[e2]
    if (!k1 || !k2) continue

    const x1 = Math.round(k1[0]), y1 = Math.round(k1[1])
    const x2 = Math.round(k2[0]), y2 = Math.round(k2[1])
    if (x1 > 0 && y1 > 0 && x2 > 0 && y2 > 0) {
      const color = hsvToRgb(ie / nEdges, 1.0, 1.0)
      drawLine(ctx, x1, y1, x2, y2, color, 2)
    }
  }

  for (const kp of hand) {
    if (!kp) continue
    const x = Math.round(kp[0]), y = Math.round(kp[1])
    if (x > 0 && y > 0) {
      fillCircle(ctx, x, y, 4, [0, 0, 255])
    }
  }
}

export function renderOpenposeFrame(
  frame: OpenPoseFrame,
  width: number,
  height: number,
  drawHands: boolean,
  drawFace: boolean = true,
  xinsrScaling: boolean = false,
): HTMLCanvasElement {
  const [canvas, ctx] = createBlackCanvas(width, height)

  drawBodypose(ctx, frame.body, height, width, xinsrScaling)
  if (drawHands) {
    drawHandpose(ctx, frame.leftHand)
    drawHandpose(ctx, frame.rightHand)
  }
  if (drawFace) {
    drawFacepose(ctx, frame.face)
  }

  return canvas
}

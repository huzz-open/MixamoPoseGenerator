import type { FrameData, Bone } from '../../types/pose'
import type { Color } from '../render-utils'
import { ellipse2Poly, fillConvexPoly, fillCircle, createBlackCanvas } from '../render-utils'

const BODY_REGION_COLORS: Record<string, Color> = {
  Spine: [0, 0, 255], Hips: [0, 0, 200],
  Neck: [180, 0, 180], Head: [255, 0, 255],
  LeftArm: [0, 200, 0], LeftForeArm: [0, 255, 0],
  LeftHand: [0, 255, 100], LeftUpLeg: [0, 200, 200],
  LeftLeg: [0, 255, 255], LeftFoot: [0, 255, 200],
  LeftToe: [100, 255, 200], LeftShoulder: [0, 180, 0],
  RightArm: [200, 100, 0], RightForeArm: [255, 130, 0],
  RightHand: [255, 170, 0], RightUpLeg: [200, 200, 0],
  RightLeg: [255, 255, 0], RightFoot: [255, 200, 0],
  RightToe: [255, 200, 100], RightShoulder: [180, 80, 0],
}

function getBoneColor(jointName: string): Color {
  const name = jointName.replace('mixamorig_', '')
  for (const [region, color] of Object.entries(BODY_REGION_COLORS)) {
    if (name.includes(region)) return color
  }
  return [200, 200, 200]
}

export function renderRawFrame(
  joints: FrameData,
  bones: Bone[],
  width: number,
  height: number,
): HTMLCanvasElement {
  const [canvas, ctx] = createBlackCanvas(width, height)
  const stickwidth = 3
  const jointRadius = 3

  for (const [parentName, childName] of bones) {
    const p1 = joints.get(parentName)
    const p2 = joints.get(childName)
    if (!p1 || !p2) continue

    const x1 = Math.round(p1[0]), y1 = Math.round(p1[1])
    const x2 = Math.round(p2[0]), y2 = Math.round(p2[1])
    const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    if (length < 1) continue

    const color = getBoneColor(childName)
    const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
    const mx = Math.floor((x1 + x2) / 2)
    const my = Math.floor((y1 + y2) / 2)

    const polygon = ellipse2Poly(
      [mx, my],
      [Math.floor(length / 2), stickwidth],
      Math.floor(angle), 0, 360, 1
    )

    // Simulate addWeighted blending (0.4 old + 0.6 new)
    ctx.globalAlpha = 0.6
    fillConvexPoly(ctx, polygon, color)
    ctx.globalAlpha = 1.0
  }

  for (const [jointName, pos] of joints) {
    const color = getBoneColor(jointName)
    fillCircle(ctx, Math.round(pos[0]), Math.round(pos[1]), jointRadius, color)
  }

  return canvas
}

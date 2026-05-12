import type { FrameData, Bone, OpenPoseFrame } from '../types/pose'
import type { SkeletonMode } from '../types/config'
import { renderRawFrame } from './canvas2d/raw-renderer'
import { renderOpenposeFrame } from './canvas2d/openpose-renderer'
import { renderDwposeFrame } from './canvas2d/dwpose-renderer'
import { mapFrameToOpenpose } from '../core/openpose-mapper'

export interface RenderOptions {
  drawHands: boolean
  drawFace: boolean
  faceScale: number
  xinsrScaling: boolean
}

export function renderFrame(
  mode: SkeletonMode,
  joints: FrameData,
  bones: Bone[],
  width: number,
  height: number,
  opts: RenderOptions,
): HTMLCanvasElement {
  if (mode === 'raw') {
    return renderRawFrame(joints, bones, width, height)
  }

  const opFrame = mapFrameToOpenpose(joints, opts.drawHands, opts.drawFace, opts.faceScale)

  if (mode === 'dwpose') {
    return renderDwposeFrame(opFrame, width, height, opts.drawHands, opts.drawFace)
  }

  return renderOpenposeFrame(opFrame, width, height, opts.drawHands, opts.drawFace, opts.xinsrScaling)
}

export function renderOpFrame(
  mode: SkeletonMode,
  opFrame: OpenPoseFrame,
  width: number,
  height: number,
  opts: RenderOptions,
): HTMLCanvasElement {
  if (mode === 'dwpose') {
    return renderDwposeFrame(opFrame, width, height, opts.drawHands, opts.drawFace)
  }
  return renderOpenposeFrame(opFrame, width, height, opts.drawHands, opts.drawFace, opts.xinsrScaling)
}

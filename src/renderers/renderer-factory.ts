import type { FrameData, Bone, OpenPoseFrame } from '../types/pose'
import type { SkeletonMode } from '../types/config'
import { renderRawFrame } from './canvas2d/raw-renderer'
import { renderOpenposeFrame } from './canvas2d/openpose-renderer'
import { renderDwposeFrame } from './canvas2d/dwpose-renderer'
import { mapFrameToOpenpose } from '../core/openpose-mapper'

export function renderFrame(
  mode: SkeletonMode,
  joints: FrameData,
  bones: Bone[],
  width: number,
  height: number,
  drawHands: boolean,
): HTMLCanvasElement {
  if (mode === 'raw') {
    return renderRawFrame(joints, bones, width, height)
  }

  const opFrame = mapFrameToOpenpose(joints, drawHands)

  if (mode === 'dwpose') {
    return renderDwposeFrame(opFrame, width, height, drawHands)
  }

  return renderOpenposeFrame(opFrame, width, height, drawHands)
}

export function renderOpFrame(
  mode: SkeletonMode,
  opFrame: OpenPoseFrame,
  width: number,
  height: number,
  drawHands: boolean,
): HTMLCanvasElement {
  if (mode === 'dwpose') {
    return renderDwposeFrame(opFrame, width, height, drawHands)
  }
  return renderOpenposeFrame(opFrame, width, height, drawHands)
}

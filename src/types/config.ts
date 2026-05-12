export type SkeletonMode = 'raw' | 'openpose' | 'dwpose'

export type DirectionPreset = 'single' | 'two' | 'four' | 'eight'

export type ExportFormat = 'png' | 'mp4'

export type LoopMode = 'auto' | 'count' | 'duration'

export interface DirectionConfig {
  name: string
  directions: Record<string, number>
  icon: string
}

export interface RenderConfig {
  skeletonMode: SkeletonMode
  drawHands: boolean
  drawFace: boolean
  xinsrScaling: boolean
  scale: number
  width: number
  height: number
}

export interface VideoExportConfig {
  width: number
  height: number
  fps: number
  loopMode: LoopMode
  loopCount: number
  loopDuration: number
}

export interface ExportConfig {
  format: ExportFormat
  outputName: string
  video: VideoExportConfig
}

export const DIRECTION_CONFIGS: Record<DirectionPreset, DirectionConfig> = {
  single: {
    name: '单方向',
    directions: { side: 90 },
    icon: '→',
  },
  two: {
    name: '左右两方向',
    directions: { right: 90, left: 270 },
    icon: '←→',
  },
  four: {
    name: '四方向',
    directions: { up: 0, right: 90, down: 180, left: 270 },
    icon: '✛',
  },
  eight: {
    name: '八方向',
    directions: {
      up: 0, up_right: 45, right: 90, down_right: 135,
      down: 180, down_left: 225, left: 270, up_left: 315,
    },
    icon: '✺',
  },
}

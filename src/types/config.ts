export type SkeletonMode = 'raw' | 'openpose' | 'dwpose'

export type ExportFormat = 'png' | 'mp4'

export type LoopMode = 'auto' | 'count' | 'duration'

export interface DirectionEntry {
  name: string
  angle: number
}

export interface DirectionPresetDef {
  id: string
  label: string
  icon: string
  directions: DirectionEntry[]
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

export const DIRECTION_PRESETS: DirectionPresetDef[] = [
  {
    id: 'single',
    label: '单方向',
    icon: '→',
    directions: [{ name: 'right', angle: 90 }],
  },
  {
    id: 'two',
    label: '左右',
    icon: '←→',
    directions: [
      { name: 'right', angle: 90 },
      { name: 'left', angle: 270 },
    ],
  },
  {
    id: 'four',
    label: '四方向',
    icon: '✛',
    directions: [
      { name: 'up', angle: 0 },
      { name: 'right', angle: 90 },
      { name: 'down', angle: 180 },
      { name: 'left', angle: 270 },
    ],
  },
  {
    id: 'eight',
    label: '八方向',
    icon: '✺',
    directions: [
      { name: 'up', angle: 0 },
      { name: 'up_right', angle: 45 },
      { name: 'right', angle: 90 },
      { name: 'down_right', angle: 135 },
      { name: 'down', angle: 180 },
      { name: 'down_left', angle: 225 },
      { name: 'left', angle: 270 },
      { name: 'up_left', angle: 315 },
    ],
  },
]

export const DEFAULT_DIRECTIONS: DirectionEntry[] = [
  { name: 'up', angle: 0 },
  { name: 'right', angle: 90 },
  { name: 'down', angle: 180 },
  { name: 'left', angle: 270 },
]

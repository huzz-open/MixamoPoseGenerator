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

export interface DirectionPresetRaw {
  id: string
  labelKey: string
  icon: string
  directions: DirectionEntry[]
}

export const DIRECTION_PRESETS_RAW: DirectionPresetRaw[] = [
  {
    id: 'single',
    labelKey: 'preset.single',
    icon: '→',
    directions: [{ name: 'right', angle: 90 }],
  },
  {
    id: 'two',
    labelKey: 'preset.two',
    icon: '←→',
    directions: [
      { name: 'right', angle: 90 },
      { name: 'left', angle: 270 },
    ],
  },
  {
    id: 'four',
    labelKey: 'preset.four',
    icon: '✛',
    directions: [
      { name: 'down', angle: 0 },
      { name: 'right', angle: 90 },
      { name: 'up', angle: 180 },
      { name: 'left', angle: 270 },
    ],
  },
  {
    id: 'eight',
    labelKey: 'preset.eight',
    icon: '✺',
    directions: [
      { name: 'down', angle: 0 },
      { name: 'down_right', angle: 45 },
      { name: 'right', angle: 90 },
      { name: 'up_right', angle: 135 },
      { name: 'up', angle: 180 },
      { name: 'up_left', angle: 225 },
      { name: 'left', angle: 270 },
      { name: 'down_left', angle: 315 },
    ],
  },
]

export const DEFAULT_DIRECTIONS: DirectionEntry[] = [
  { name: 'down', angle: 0 },
  { name: 'right', angle: 90 },
  { name: 'up', angle: 180 },
  { name: 'left', angle: 270 },
]

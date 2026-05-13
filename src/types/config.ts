export type SkeletonMode = 'raw' | 'openpose' | 'dwpose'

export type ExportFormat = 'png' | 'mp4'

export type LoopMode = 'auto' | 'count' | 'duration'

export interface AspectRatioPreset {
  id: string
  label: string
  w: number
  h: number
}

export const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  { id: '1:1', label: '1:1', w: 1, h: 1 },
  { id: '3:4', label: '3:4', w: 3, h: 4 },
  { id: '2:3', label: '2:3', w: 2, h: 3 },
  { id: '9:16', label: '9:16', w: 9, h: 16 },
  { id: '4:3', label: '4:3', w: 4, h: 3 },
  { id: '3:2', label: '3:2', w: 3, h: 2 },
  { id: '16:9', label: '16:9', w: 16, h: 9 },
  { id: 'custom', label: 'Custom', w: 0, h: 0 },
]

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

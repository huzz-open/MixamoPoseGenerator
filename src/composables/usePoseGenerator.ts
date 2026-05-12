import { ref, readonly } from 'vue'
import type { ParseResult } from '../types/pose'
import type { SkeletonMode, DirectionPreset } from '../types/config'
import { DIRECTION_CONFIGS } from '../types/config'
import { cloneFrames, transformFrames } from '../core/pose-transformer'
import { renderFrame } from '../renderers/renderer-factory'
import type { RenderOptions } from '../renderers/renderer-factory'

export interface DirectionResult {
  name: string
  frames: HTMLCanvasElement[]
}

let generationId = 0

export function usePoseGenerator() {
  const renderedDirections = ref<DirectionResult[]>([])
  const isGenerating = ref(false)
  const progress = ref({ current: 0, total: 0, label: '' })

  async function generatePreview(
    parseResult: ParseResult,
    preset: DirectionPreset,
    mode: SkeletonMode,
    opts: RenderOptions,
    scale: number,
    previewSize: number = 512,
  ) {
    const myId = ++generationId
    isGenerating.value = true

    const directions = DIRECTION_CONFIGS[preset].directions
    const dirEntries = Object.entries(directions)
    const total = dirEntries.length
    const results: DirectionResult[] = []

    try {
      for (let idx = 0; idx < dirEntries.length; idx++) {
        if (myId !== generationId) return
        const [dirName, yAngle] = dirEntries[idx]
        progress.value = { current: idx, total, label: dirName }

        const fc = cloneFrames(parseResult.frames)
        transformFrames(fc, previewSize, previewSize, [0, yAngle, 0], scale)

        const canvases: HTMLCanvasElement[] = []
        for (const joints of fc) {
          canvases.push(renderFrame(mode, joints, parseResult.bones, previewSize, previewSize, opts))
        }

        results.push({ name: dirName, frames: canvases })

        await new Promise(r => setTimeout(r, 0))
      }

      if (myId !== generationId) return
      renderedDirections.value = results
      progress.value = { current: total, total, label: '完成' }
    } finally {
      if (myId === generationId) {
        isGenerating.value = false
      }
    }
  }

  async function generateForExport(
    parseResult: ParseResult,
    preset: DirectionPreset,
    mode: SkeletonMode,
    opts: RenderOptions,
    scale: number,
    width: number,
    height: number,
    onProgress?: (current: number, total: number, dir: string) => void,
  ): Promise<DirectionResult[]> {
    const directions = DIRECTION_CONFIGS[preset].directions
    const dirEntries = Object.entries(directions)
    const results: DirectionResult[] = []

    for (let idx = 0; idx < dirEntries.length; idx++) {
      const [dirName, yAngle] = dirEntries[idx]
      const fc = cloneFrames(parseResult.frames)
      transformFrames(fc, width, height, [0, yAngle, 0], scale)

      const canvases: HTMLCanvasElement[] = []
      for (let i = 0; i < fc.length; i++) {
        canvases.push(renderFrame(mode, fc[i], parseResult.bones, width, height, opts))
        if (i % 5 === 0) {
          onProgress?.(idx * fc.length + i, dirEntries.length * fc.length, dirName)
          await new Promise(r => setTimeout(r, 0))
        }
      }

      results.push({ name: dirName, frames: canvases })
    }

    return results
  }

  return {
    renderedDirections: readonly(renderedDirections),
    isGenerating: readonly(isGenerating),
    progress: readonly(progress),
    generatePreview,
    generateForExport,
  }
}

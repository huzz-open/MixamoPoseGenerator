import { ref, readonly } from 'vue'
import { useI18n } from 'vue-i18n'
import JSZip from 'jszip'
import type { DirectionResult } from './usePoseGenerator'
import { exportMp4 } from '../exporters/video-exporter'
import { downloadBlob, composeSpriteSheet } from '../exporters/png-exporter'
import { renderSkinFrames } from '../exporters/skin-renderer'
import { flattenToRGB } from '../renderers/render-utils'
import type { SpriteSheetConfig } from '../types/config'

function canvasToBlob(canvas: HTMLCanvasElement, preserveAlpha = false): Promise<Blob> {
  const target = preserveAlpha ? canvas : flattenToRGB(canvas)
  return new Promise((resolve, reject) => {
    target.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to create blob from canvas'))
    }, 'image/png')
  })
}

export interface ExportOptions {
  png: boolean
  mp4: boolean
  spriteSheet?: SpriteSheetConfig
  pngDirections: DirectionResult[]
  mp4Directions?: DirectionResult[]
  animationName: string
  videoWidth: number
  videoHeight: number
  videoFps: number
  targetFrames: number
  daeXml?: string | null
  frameCount?: number
  directions?: { name: string; angle: number }[]
}

export function useExport() {
  const { t } = useI18n()
  const isExporting = ref(false)
  const exportProgress = ref({ current: 0, total: 0, label: '' })

  async function exportAll(opts: ExportOptions) {
    isExporting.value = true
    try {
      const zip = new JSZip()
      const dirCount = opts.pngDirections.length
      const folder = `${opts.animationName}_${dirCount}dir`

      if (opts.png) {
        let done = 0
        let total = 0
        for (const d of opts.pngDirections) total += d.frames.length

        for (const dir of opts.pngDirections) {
          const pad = String(dir.frames.length).length
          for (let i = 0; i < dir.frames.length; i++) {
            exportProgress.value = { current: done, total, label: `PNG ${dir.name}: ${i + 1}/${dir.frames.length}` }
            const blob = await canvasToBlob(dir.frames[i])
            zip.file(`${folder}/${dir.name}/${String(i).padStart(pad, '0')}.png`, blob)
            done++
          }
        }
      }

      if (opts.spriteSheet?.enabled && opts.daeXml && opts.frameCount && opts.directions) {
        exportProgress.value = { current: 0, total: 1, label: t('progress.renderingSkin') }

        const skinDirs = await renderSkinFrames(
          opts.daeXml,
          opts.directions,
          opts.frameCount,
          opts.videoWidth,
          opts.videoHeight,
          (cur, total, dir) => {
            exportProgress.value = { current: cur, total, label: `Skin ${dir}: ${cur}/${total}` }
          },
        )

        for (let i = 0; i < skinDirs.length; i++) {
          const dir = skinDirs[i]
          exportProgress.value = {
            current: i,
            total: skinDirs.length,
            label: `Sheet ${dir.name}`,
          }
          const sheet = composeSpriteSheet(dir.frames, opts.spriteSheet.cols, true)
          const blob = await canvasToBlob(sheet, true)
          zip.file(`${folder}/${dir.name}/spritesheet.png`, blob)
        }
      }

      if (opts.mp4 && opts.mp4Directions) {
        const dirs = opts.mp4Directions
        for (const dir of dirs) {
          exportProgress.value = { current: 0, total: dir.frames.length, label: `MP4 ${dir.name}: ${t('progress.encoding')}` }

          let frames = dir.frames
          if (opts.targetFrames > frames.length) {
            const loopCount = Math.ceil(opts.targetFrames / frames.length)
            const looped: HTMLCanvasElement[] = []
            for (let i = 0; i < loopCount; i++) looped.push(...frames)
            frames = looped.slice(0, opts.targetFrames)
          }

          const blob = await exportMp4({
            width: opts.videoWidth,
            height: opts.videoHeight,
            fps: opts.videoFps,
            frames,
            onProgress: (cur, total) => {
              exportProgress.value = { current: cur, total, label: `MP4 ${dir.name}: ${cur}/${total}` }
            },
          })

          const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
          zip.file(`${folder}/${dir.name}/${dir.name}.${ext}`, blob)
        }
      }

      exportProgress.value = { current: 0, total: 0, label: t('progress.packingZip') }
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
      downloadBlob(zipBlob, `${folder}.zip`)
    } finally {
      isExporting.value = false
    }
  }

  return {
    isExporting: readonly(isExporting),
    exportProgress: readonly(exportProgress),
    exportAll,
  }
}

import { ref, readonly } from 'vue'
import type { DirectionResult } from './usePoseGenerator'
import { exportPngZip, downloadBlob } from '../exporters/png-exporter'
import { exportMp4 } from '../exporters/video-exporter'

export function useExport() {
  const isExporting = ref(false)
  const exportProgress = ref({ current: 0, total: 0, label: '' })

  async function exportPng(
    directions: DirectionResult[],
    animationName: string,
  ) {
    isExporting.value = true
    exportProgress.value = { current: 0, total: 0, label: '打包 PNG...' }
    try {
      const blob = await exportPngZip(
        directions.map(d => ({ directionName: d.name, frames: d.frames })),
        animationName,
        (cur, total) => {
          exportProgress.value = { current: cur, total, label: `${cur}/${total} 帧` }
        },
      )
      downloadBlob(blob, `${animationName}_${directions.length}dir.zip`)
    } finally {
      isExporting.value = false
    }
  }

  async function exportVideo(
    directions: DirectionResult[],
    animationName: string,
    width: number,
    height: number,
    fps: number,
    targetFrames: number,
  ) {
    isExporting.value = true
    try {
      for (const dir of directions) {
        exportProgress.value = { current: 0, total: dir.frames.length, label: `${dir.name} 编码中...` }

        let frames = dir.frames
        // Loop to reach target frame count
        if (targetFrames > frames.length) {
          const loopCount = Math.ceil(targetFrames / frames.length)
          const looped: HTMLCanvasElement[] = []
          for (let i = 0; i < loopCount; i++) {
            looped.push(...frames)
          }
          frames = looped.slice(0, targetFrames)
        }

        const blob = await exportMp4({
          width,
          height,
          fps,
          frames,
          onProgress: (cur, total) => {
            exportProgress.value = { current: cur, total, label: `${dir.name}: ${cur}/${total}` }
          },
        })

        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
        downloadBlob(blob, `${animationName}_${dir.name}.${ext}`)
      }
    } finally {
      isExporting.value = false
    }
  }

  return {
    isExporting: readonly(isExporting),
    exportProgress: readonly(exportProgress),
    exportPng,
    exportVideo,
  }
}

import JSZip from 'jszip'
import { flattenToRGB } from '../renderers/render-utils'

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const rgb = flattenToRGB(canvas)
  return new Promise((resolve, reject) => {
    rgb.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to create blob from canvas'))
    }, 'image/png')
  })
}

export interface PngExportEntry {
  directionName: string
  frames: HTMLCanvasElement[]
}

/**
 * Export rendered frames as a ZIP file containing PNG sequences.
 * Structure: {animName}_{N}dir/{direction}/{00.png, 01.png, ...}
 */
export async function exportPngZip(
  entries: PngExportEntry[],
  animationName: string,
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> {
  const zip = new JSZip()
  const dirCount = entries.length
  const folder = `${animationName}_${dirCount}dir`

  let done = 0
  let total = 0
  for (const entry of entries) total += entry.frames.length

  for (const entry of entries) {
    const pad = String(entry.frames.length).length
    for (let i = 0; i < entry.frames.length; i++) {
      const blob = await canvasToBlob(entry.frames[i])
      const fileName = `${folder}/${entry.directionName}/${String(i).padStart(pad, '0')}.png`
      zip.file(fileName, blob)
      done++
      onProgress?.(done, total)
    }
  }

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
}

/**
 * Compose multiple frame canvases into a single sprite sheet canvas.
 * Frames are laid out left-to-right, top-to-bottom in a grid with the
 * given number of columns. Rows are derived automatically.
 */
export function composeSpriteSheet(
  frames: HTMLCanvasElement[],
  cols: number,
  transparent = false,
): HTMLCanvasElement {
  if (frames.length === 0) {
    const empty = document.createElement('canvas')
    empty.width = 1
    empty.height = 1
    return empty
  }

  const cellW = frames[0].width
  const cellH = frames[0].height
  const safeCols = Math.max(1, Math.min(cols, frames.length))
  const rows = Math.ceil(frames.length / safeCols)

  const canvas = document.createElement('canvas')
  canvas.width = safeCols * cellW
  canvas.height = rows * cellH
  const ctx = canvas.getContext('2d')!

  for (let i = 0; i < frames.length; i++) {
    const col = i % safeCols
    const row = Math.floor(i / safeCols)
    ctx.drawImage(frames[i], col * cellW, row * cellH)
  }

  return transparent ? canvas : flattenToRGB(canvas)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

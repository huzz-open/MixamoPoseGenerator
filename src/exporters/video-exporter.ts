import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { downloadBlob } from './png-exporter'

export interface VideoExportOptions {
  width: number
  height: number
  fps: number
  frames: HTMLCanvasElement[]
  onProgress?: (current: number, total: number) => void
}

/**
 * Export frames as MP4 using WebCodecs VideoEncoder + mp4-muxer.
 * Falls back to WebM via MediaRecorder if WebCodecs is unavailable.
 */
export async function exportMp4(options: VideoExportOptions): Promise<Blob> {
  const { width, height, fps, frames, onProgress } = options

  if (typeof VideoEncoder !== 'undefined') {
    return exportWithWebCodecs(width, height, fps, frames, onProgress)
  }
  return exportWithMediaRecorder(width, height, fps, frames, onProgress)
}

async function exportWithWebCodecs(
  width: number,
  height: number,
  fps: number,
  frames: HTMLCanvasElement[],
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> {
  const target = new ArrayBufferTarget()
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width,
      height,
    },
    fastStart: 'in-memory',
  })

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { throw e },
  })

  encoder.configure({
    codec: 'avc1.640028',
    width,
    height,
    bitrate: 4_000_000,
    framerate: fps,
  })

  const frameDuration = 1_000_000 / fps // microseconds

  for (let i = 0; i < frames.length; i++) {
    const vf = new VideoFrame(frames[i], {
      timestamp: i * frameDuration,
      duration: frameDuration,
    })
    encoder.encode(vf, { keyFrame: i % (fps * 2) === 0 })
    vf.close()
    onProgress?.(i + 1, frames.length)

    // Yield to keep UI responsive
    if (i % 10 === 0) await new Promise(r => setTimeout(r, 0))
  }

  await encoder.flush()
  encoder.close()
  muxer.finalize()

  return new Blob([target.buffer], { type: 'video/mp4' })
}

async function exportWithMediaRecorder(
  width: number,
  height: number,
  fps: number,
  frames: HTMLCanvasElement[],
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> {
  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = width
  outputCanvas.height = height
  const ctx = outputCanvas.getContext('2d')!

  const stream = outputCanvas.captureStream(0)
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 4_000_000,
  })

  const chunks: Blob[] = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

  const done = new Promise<void>(resolve => {
    recorder.onstop = () => resolve()
  })

  recorder.start()
  const frameDuration = 1000 / fps

  for (let i = 0; i < frames.length; i++) {
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(frames[i], 0, 0, width, height)

    const track = stream.getVideoTracks()[0] as any
    if (track.requestFrame) track.requestFrame()

    await new Promise(r => setTimeout(r, frameDuration))
    onProgress?.(i + 1, frames.length)
  }

  recorder.stop()
  await done

  return new Blob(chunks, { type: 'video/webm' })
}

export async function exportAndDownloadVideo(
  options: VideoExportOptions,
  filename: string,
) {
  const blob = await exportMp4(options)
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
  downloadBlob(blob, filename.replace(/\.\w+$/, `.${ext}`))
}

import { ref, readonly, onUnmounted, watch } from 'vue'
import type { DirectionResult } from './usePoseGenerator'

export function usePreview(directions: () => DirectionResult[]) {
  const currentDirection = ref(0)
  const currentFrame = ref(0)
  const isPlaying = ref(false)
  const fps = ref(10)
  let animHandle: number | null = null
  let lastTime = 0

  function frameCount(): number {
    const dirs = directions()
    if (dirs.length === 0) return 0
    return dirs[currentDirection.value]?.frames.length ?? 0
  }

  function currentCanvas(): HTMLCanvasElement | null {
    const dirs = directions()
    if (dirs.length === 0) return null
    const dir = dirs[currentDirection.value]
    if (!dir) return null
    return dir.frames[currentFrame.value] ?? null
  }

  function setDirection(idx: number) {
    currentDirection.value = idx
    currentFrame.value = 0
  }

  function nextFrame() {
    const count = frameCount()
    if (count > 0) {
      currentFrame.value = (currentFrame.value + 1) % count
    }
  }

  function prevFrame() {
    const count = frameCount()
    if (count > 0) {
      currentFrame.value = (currentFrame.value - 1 + count) % count
    }
  }

  function tick(now: number) {
    if (!isPlaying.value) return
    const interval = 1000 / fps.value
    if (now - lastTime >= interval) {
      lastTime = now
      nextFrame()
    }
    animHandle = requestAnimationFrame(tick)
  }

  function play() {
    if (isPlaying.value) return
    isPlaying.value = true
    lastTime = performance.now()
    animHandle = requestAnimationFrame(tick)
  }

  function pause() {
    isPlaying.value = false
    if (animHandle !== null) {
      cancelAnimationFrame(animHandle)
      animHandle = null
    }
  }

  function togglePlay() {
    if (isPlaying.value) pause()
    else play()
  }

  /**
   * When directions data updates, preserve play state.
   * Only clamp indices to valid range; don't pause or reset.
   */
  watch(directions, (newDirs) => {
    if (newDirs.length === 0) return

    // Clamp direction index
    if (currentDirection.value >= newDirs.length) {
      currentDirection.value = 0
    }

    // Clamp frame index
    const dir = newDirs[currentDirection.value]
    if (dir && dir.frames.length > 0) {
      if (currentFrame.value >= dir.frames.length) {
        currentFrame.value = currentFrame.value % dir.frames.length
      }
    } else {
      currentFrame.value = 0
    }

    // If was playing and got paused externally, auto-resume is already handled
    // because tick loop checks isPlaying and continues
  })

  onUnmounted(() => {
    pause()
  })

  return {
    currentDirection,
    currentFrame: readonly(currentFrame),
    isPlaying: readonly(isPlaying),
    fps,
    frameCount,
    currentCanvas,
    setDirection,
    nextFrame,
    prevFrame,
    play,
    pause,
    togglePlay,
  }
}

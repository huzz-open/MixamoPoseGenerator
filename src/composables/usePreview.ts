import { ref, onUnmounted, watch } from 'vue'
import type { DirectionResult } from './usePoseGenerator'

export function usePreview(directions: () => DirectionResult[]) {
  const currentDirection = ref(0)
  const currentFrame = ref(0)
  const isPlaying = ref(false)
  const fps = ref(10)
  let intervalId: ReturnType<typeof setInterval> | null = null

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

  function stopInterval() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function startInterval() {
    stopInterval()
    intervalId = setInterval(() => {
      nextFrame()
    }, 1000 / fps.value)
  }

  function play() {
    if (isPlaying.value) return
    isPlaying.value = true
    startInterval()
  }

  function pause() {
    isPlaying.value = false
    stopInterval()
  }

  function togglePlay() {
    if (isPlaying.value) pause()
    else play()
  }

  watch(fps, () => {
    if (isPlaying.value) startInterval()
  })

  watch(directions, (newDirs) => {
    if (newDirs.length === 0) return

    if (currentDirection.value >= newDirs.length) {
      currentDirection.value = 0
    }

    const dir = newDirs[currentDirection.value]
    if (dir && dir.frames.length > 0) {
      if (currentFrame.value >= dir.frames.length) {
        currentFrame.value = currentFrame.value % dir.frames.length
      }
    } else {
      currentFrame.value = 0
    }
  })

  onUnmounted(() => {
    pause()
  })

  return {
    currentDirection,
    currentFrame,
    isPlaying,
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

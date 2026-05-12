<script setup lang="ts">
import prevFrameIcon from '../../assets/icon/pre-frame.svg'
import nextFrameIcon from '../../assets/icon/next-frame.svg'
import playIcon from '../../assets/icon/play.svg'
import stopIcon from '../../assets/icon/stop.svg'

defineProps<{
  currentFrame: number
  frameCount: number
  isPlaying: boolean
  fps: number
}>()

const emit = defineEmits<{
  'update:fps': [value: number]
  togglePlay: []
  prevFrame: []
  nextFrame: []
}>()

function onFpsInput(e: Event) {
  const raw = parseInt((e.target as HTMLInputElement).value)
  if (isNaN(raw)) return
  emit('update:fps', Math.max(1, Math.min(160, raw)))
}
</script>

<template>
  <div class="controls">
    <div class="controls-left">
      <span class="label">FPS:</span>
      <input
        type="number"
        :value="fps"
        min="1"
        max="160"
        class="fps-input"
        @input="onFpsInput($event)"
      />
    </div>

    <div class="controls-center">
      <button class="ctrl-btn" title="上一帧" @click="emit('prevFrame')">
        <img :src="prevFrameIcon" class="ctrl-icon" />
      </button>
      <button class="ctrl-btn" @click="emit('togglePlay')" :title="isPlaying ? '停止' : '播放'">
        <img :src="isPlaying ? stopIcon : playIcon" class="ctrl-icon play-icon" />
      </button>
      <button class="ctrl-btn" title="下一帧" @click="emit('nextFrame')">
        <img :src="nextFrameIcon" class="ctrl-icon" />
      </button>
    </div>

    <div class="controls-right">
      <span class="frame-info">{{ currentFrame + 1 }}/{{ frameCount }}</span>
    </div>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
}
.controls-left, .controls-center, .controls-right {
  display: flex;
  align-items: center;
  gap: 6px;
}
.label { font-size: 12px; color: var(--text-secondary); white-space: nowrap; }
.fps-input {
  width: 44px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  padding: 2px 4px;
  font-size: 12px;
}
.ctrl-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.15s;
}
.ctrl-btn:hover { opacity: 1; }
.ctrl-icon {
  width: 16px;
  height: 16px;
  display: block;
}
.play-icon {
  width: 20px;
  height: 20px;
}
.frame-info {
  font-size: 12px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  min-width: 50px;
  text-align: right;
}
</style>

<script setup lang="ts">
defineProps<{
  directions: string[]
  currentDirection: number
  currentFrame: number
  frameCount: number
  isPlaying: boolean
  fps: number
}>()

const emit = defineEmits<{
  'update:currentDirection': [value: number]
  'update:fps': [value: number]
  togglePlay: []
  prevFrame: []
  nextFrame: []
}>()
</script>

<template>
  <div class="controls">
    <div class="controls-left">
      <span class="label">视角:</span>
      <select
        :value="currentDirection"
        @change="emit('update:currentDirection', parseInt(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="(dir, idx) in directions" :key="idx" :value="idx">{{ dir }}</option>
      </select>

      <span class="separator" />

      <span class="label">FPS:</span>
      <input
        type="number"
        :value="fps"
        min="1"
        max="60"
        class="fps-input"
        @input="emit('update:fps', parseInt(($event.target as HTMLInputElement).value) || 10)"
      />
    </div>

    <div class="controls-center">
      <button class="ctrl-btn" title="上一帧" @click="emit('prevFrame')">⏮</button>
      <button class="ctrl-btn play-btn" @click="emit('togglePlay')">
        {{ isPlaying ? '⏸' : '▶' }}
      </button>
      <button class="ctrl-btn" title="下一帧" @click="emit('nextFrame')">⏭</button>
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
.separator {
  width: 1px;
  height: 16px;
  background: var(--border);
  margin: 0 4px;
  flex-shrink: 0;
}
select {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  padding: 3px 6px;
  font-size: 12px;
}
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
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s;
}
.ctrl-btn:hover { background: var(--bg-hover); }
.play-btn { font-size: 14px; padding: 4px 12px; }
.frame-info {
  font-size: 12px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  min-width: 50px;
  text-align: right;
}
</style>

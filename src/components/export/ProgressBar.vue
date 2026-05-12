<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  current: number
  total: number
  label?: string
}>()

const pct = computed(() => {
  if (props.total === 0) return 0
  return Math.round((props.current / props.total) * 100)
})
</script>

<template>
  <div v-if="total > 0" class="progress-bar-wrap">
    <div class="progress-label">
      <span>{{ label }}</span>
      <span>{{ pct }}%</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill" :style="{ width: pct + '%' }" />
    </div>
  </div>
</template>

<style scoped>
.progress-bar-wrap { display: flex; flex-direction: column; gap: 3px; }
.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
}
.progress-track {
  height: 4px;
  background: var(--bg-secondary);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.15s;
}
</style>

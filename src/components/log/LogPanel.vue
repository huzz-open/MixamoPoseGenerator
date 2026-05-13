<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LogEntry } from '../../composables/useLog'

const { t } = useI18n()

const props = defineProps<{
  entries: readonly LogEntry[]
}>()

const emit = defineEmits<{
  clear: []
}>()

const scrollRef = ref<HTMLDivElement>()
const collapsed = ref(false)
const panelHeight = ref(140)

const MIN_HEIGHT = 100
const MAX_HEIGHT = 300

let dragStartY = 0
let dragStartH = 0

function onDragStart(e: MouseEvent) {
  e.preventDefault()
  dragStartY = e.clientY
  dragStartH = panelHeight.value
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
  document.body.style.cursor = 'ns-resize'
  document.body.style.userSelect = 'none'
}

function onDragMove(e: MouseEvent) {
  const delta = dragStartY - e.clientY
  panelHeight.value = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartH + delta))
}

function onDragEnd() {
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

function toggle() {
  collapsed.value = !collapsed.value
}

const panelStyle = computed(() =>
  collapsed.value
    ? { height: 'auto', minHeight: 'unset', maxHeight: 'unset' }
    : { height: `${panelHeight.value}px`, minHeight: `${MIN_HEIGHT}px`, maxHeight: `${MAX_HEIGHT}px` }
)

watch(() => props.entries.length, async () => {
  if (collapsed.value) return
  await nextTick()
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }
})
</script>

<template>
  <div class="log-panel" :class="{ collapsed }" :style="panelStyle">
    <div v-if="!collapsed" class="drag-handle" @mousedown="onDragStart">
      <div class="drag-grip" />
    </div>

    <div class="log-header">
      <span class="toggle-area" @click="toggle">
        <span class="toggle-icon">{{ collapsed ? '▸' : '▾' }}</span>
        <span>{{ t('log.title') }}</span>
        <span v-if="collapsed && entries.length > 0" class="badge">{{ entries.length }}</span>
      </span>
      <button
        v-if="entries.length > 0"
        class="clear-btn"
        :title="t('log.clear')"
        @click.stop="emit('clear')"
      >✕</button>
    </div>

    <div v-show="!collapsed" ref="scrollRef" class="log-content">
      <div
        v-for="(entry, i) in entries"
        :key="i"
        class="log-entry"
        :class="entry.level"
      >
        <span class="log-time">[{{ entry.time }}]</span>
        <span class="log-msg">{{ entry.message }}</span>
      </div>
      <div v-if="entries.length === 0" class="log-empty">{{ t('log.empty') }}</div>
    </div>
  </div>
</template>

<style scoped>
.log-panel {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border);
  position: relative;
  flex-shrink: 0;
  transition: height 0.15s ease;
}
.log-panel.collapsed {
  height: auto !important;
}

.drag-handle {
  position: absolute;
  top: -4px;
  left: 0;
  right: 0;
  height: 8px;
  cursor: ns-resize;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}
.drag-handle:hover .drag-grip,
.drag-handle:active .drag-grip {
  opacity: 0.8;
}
.drag-grip {
  width: 40px;
  height: 3px;
  border-radius: 2px;
  background: var(--text-secondary);
  opacity: 0.25;
  transition: opacity 0.15s;
}

.log-header {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
  transition: background 0.15s;
}
.toggle-area {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  flex: 1;
}
.toggle-area:hover {
  color: var(--text-primary);
}
.clear-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  padding: 0 4px;
  line-height: 1;
  opacity: 0.5;
  transition: opacity 0.15s, color 0.15s;
}
.clear-btn:hover {
  opacity: 1;
  color: var(--error, #f44);
}

.toggle-icon {
  font-size: 10px;
  width: 10px;
  text-align: center;
  color: var(--text-secondary);
}

.badge {
  margin-left: auto;
  font-size: 10px;
  background: var(--text-secondary);
  color: var(--bg-primary);
  border-radius: 8px;
  padding: 0 6px;
  line-height: 16px;
  font-weight: 700;
}

.log-content {
  overflow-y: auto;
  padding: 4px 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  flex: 1;
  min-height: 0;
}
.log-entry { padding: 1px 0; }
.log-time { color: var(--text-secondary); margin-right: 6px; }
.log-entry.info .log-msg { color: var(--text-secondary); }
.log-entry.success .log-msg { color: var(--success); }
.log-entry.error .log-msg { color: var(--error); }
.log-entry.warning .log-msg { color: var(--warning); }
.log-empty { color: var(--text-secondary); opacity: 0.5; padding: 8px 0; }
</style>

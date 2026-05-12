<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  canvas: HTMLCanvasElement | null
}>()

const containerRef = ref<HTMLDivElement>()
const displayCanvas = ref<HTMLCanvasElement>()

const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)

const MIN_ZOOM = 0.1
const MAX_ZOOM = 10
const ZOOM_STEP = 0.1

let isDragging = false
let dragStartX = 0
let dragStartY = 0
let panStartX = 0
let panStartY = 0

function drawFrame() {
  const dc = displayCanvas.value
  const container = containerRef.value
  if (!dc || !container) return

  const cw = container.clientWidth
  const ch = container.clientHeight
  if (cw === 0 || ch === 0) return

  dc.width = cw
  dc.height = ch

  const ctx = dc.getContext('2d')!
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, cw, ch)

  if (!props.canvas) return

  const srcW = props.canvas.width
  const srcH = props.canvas.height
  const fitScale = Math.min(cw / srcW, ch / srcH)
  const z = zoom.value
  const dw = srcW * fitScale * z
  const dh = srcH * fitScale * z
  const dx = (cw - dw) / 2 + panX.value
  const dy = (ch - dh) / 2 + panY.value

  ctx.imageSmoothingEnabled = z < 1
  ctx.drawImage(props.canvas, dx, dy, dw, dh)
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const container = containerRef.value
  if (!container || !props.canvas) return

  const rect = container.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top

  const cw = rect.width
  const ch = rect.height
  const oldZoom = zoom.value
  const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
  const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom + delta * oldZoom))

  // Zoom toward cursor position
  const cx = cw / 2 + panX.value
  const cy = ch / 2 + panY.value
  const factor = newZoom / oldZoom
  panX.value = mx - factor * (mx - cx) - cw / 2
  panY.value = my - factor * (my - cy) - ch / 2

  zoom.value = newZoom
  drawFrame()
}

function onPointerDown(e: PointerEvent) {
  if (!props.canvas) return
  isDragging = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  panStartX = panX.value
  panStartY = panY.value
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging) return
  panX.value = panStartX + (e.clientX - dragStartX)
  panY.value = panStartY + (e.clientY - dragStartY)
  drawFrame()
}

function onPointerUp(e: PointerEvent) {
  isDragging = false
  ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
}

function resetView() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
  drawFrame()
}

watch(() => props.canvas, drawFrame)
watch(zoom, drawFrame)

let ro: ResizeObserver | null = null
onMounted(() => {
  ro = new ResizeObserver(drawFrame)
  if (containerRef.value) ro.observe(containerRef.value)
})
onUnmounted(() => ro?.disconnect())
</script>

<template>
  <div
    ref="containerRef"
    class="preview-container"
    @wheel="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @dblclick="resetView"
  >
    <canvas ref="displayCanvas" class="display-canvas" />

    <div v-if="!canvas" class="empty-state">
      加载 DAE/ZIP 文件以预览
    </div>

    <div v-if="canvas" class="zoom-badge" :class="{ 'is-default': zoom === 1 }">
      {{ (zoom * 100).toFixed(0) }}%
    </div>
  </div>
</template>

<style scoped>
.preview-container {
  position: relative;
  flex: 1;
  min-height: 300px;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}
.preview-container:active {
  cursor: grabbing;
}
.display-canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  opacity: 0.5;
  font-size: 14px;
  pointer-events: none;
  cursor: default;
}
.zoom-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  pointer-events: none;
  user-select: none;
  transition: opacity 0.2s;
}
.zoom-badge.is-default {
  opacity: 0.4;
}
</style>

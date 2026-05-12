<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { DirectionPreset, SkeletonMode, ExportFormat, LoopMode } from './types/config'
import type { ParseResult } from './types/pose'
import { DIRECTION_CONFIGS } from './types/config'
import { useFileLoader } from './composables/useFileLoader'
import { usePoseGenerator } from './composables/usePoseGenerator'
import { usePreview } from './composables/usePreview'
import { useExport } from './composables/useExport'
import { useLog } from './composables/useLog'
import FileLoader from './components/config/FileLoader.vue'
import ConfigPanel from './components/config/ConfigPanel.vue'
import PreviewCanvas from './components/preview/PreviewCanvas.vue'
import AnimationControls from './components/preview/AnimationControls.vue'
import LogPanel from './components/log/LogPanel.vue'
import ProgressBar from './components/export/ProgressBar.vue'

const { parseResult, animationName, fullFileName, isLoading, error, loadFile } = useFileLoader()
const { renderedDirections, generatePreview, generateForExport } = usePoseGenerator()
const { isExporting, exportProgress, exportPng, exportVideo } = useExport()
const { entries: logEntries, log, clear: clearLog } = useLog()

const preview = usePreview(() => renderedDirections.value as any[])

// Config state
const directionPreset = ref<DirectionPreset>('four')
const skeletonMode = ref<SkeletonMode>('openpose')
const drawHands = ref(false)
const scale = ref(2.0)
const exportFormat = ref<ExportFormat>('png')
const videoWidth = ref(720)
const videoHeight = ref(1280)
const videoFps = ref(24)
const loopMode = ref<LoopMode>('auto')
const loopCount = ref(4)
const loopDuration = ref(3.5)

const directionNames = computed(() =>
  renderedDirections.value.map(d => d.name)
)

const currentCanvas = computed((): HTMLCanvasElement | null => {
  const dirs = renderedDirections.value
  if (dirs.length === 0) return null
  const dir = dirs[preview.currentDirection.value]
  if (!dir) return null
  return (dir.frames[preview.currentFrame.value] as HTMLCanvasElement) ?? null
})

const frameCount = computed(() => {
  const dirs = renderedDirections.value
  if (dirs.length === 0) return 0
  return dirs[preview.currentDirection.value]?.frames.length ?? 0
})

watch(error, (e) => { if (e) log(e, 'error') })

// --- Auto-generate logic ---

async function triggerPreview() {
  if (!parseResult.value) return
  const cfg = DIRECTION_CONFIGS[directionPreset.value]
  log(`生成预览 (${cfg.name}, ${skeletonMode.value})`, 'info')
  await generatePreview(
    parseResult.value as ParseResult,
    directionPreset.value,
    skeletonMode.value,
    drawHands.value,
    scale.value,
  )
  if (renderedDirections.value.length > 0) {
    const dirs = renderedDirections.value
    const total = dirs.reduce((s, d) => s + d.frames.length, 0)
    log(`预览就绪: ${dirs.length} 方向, ${total} 帧`, 'success')
  }
}

// Auto-generate after file loaded
watch(parseResult, (result) => {
  if (result) triggerPreview()
})

// Auto-regenerate on discrete config changes (immediate)
watch([directionPreset, skeletonMode, drawHands], () => {
  if (parseResult.value) triggerPreview()
})

async function onFileSelected(file: File) {
  log(`加载文件: ${file.name}`, 'info')
  await loadFile(file)
  if (parseResult.value) {
    const fileFps = parseResult.value.fps
    if (fileFps !== null) {
      videoFps.value = fileFps
      preview.fps.value = Math.min(fileFps, 30)
      log(`解析成功: ${animationName.value} (${parseResult.value.frameCount} 帧, 检测到 ${fileFps} FPS)`, 'success')
    } else {
      log(`解析成功: ${animationName.value} (${parseResult.value.frameCount} 帧, 未检测到 FPS, 使用默认 ${videoFps.value})`, 'success')
    }
  }
}

function computeTargetFrames(srcCount: number, fps: number): number {
  if (loopMode.value === 'count') {
    return srcCount * Math.max(1, loopCount.value)
  }
  if (loopMode.value === 'duration') {
    const raw = Math.ceil(loopDuration.value * fps)
    return raw > srcCount ? Math.ceil(raw / srcCount) * srcCount : srcCount
  }
  const wan = 81
  return wan > srcCount ? Math.ceil(wan / srcCount) * srcCount : srcCount
}

async function onExport() {
  if (renderedDirections.value.length === 0) {
    log('请先生成预览', 'warning')
    return
  }

  if (exportFormat.value === 'png') {
    log('开始导出 PNG...', 'info')
    await exportPng(renderedDirections.value as any[], animationName.value)
    log('PNG 导出完成', 'success')
  } else {
    if (!parseResult.value) return
    log('开始渲染并导出 MP4...', 'info')

    const dirs = await generateForExport(
      parseResult.value as ParseResult,
      directionPreset.value,
      skeletonMode.value,
      drawHands.value,
      scale.value,
      videoWidth.value,
      videoHeight.value,
      (cur, total, dir) => log(`渲染 ${dir}: ${cur}/${total}`, 'info'),
    )

    const target = computeTargetFrames(parseResult.value.frameCount, videoFps.value)
    await exportVideo(
      dirs as any[],
      animationName.value,
      videoWidth.value,
      videoHeight.value,
      videoFps.value,
      target,
    )
    log('MP4 导出完成', 'success')
  }
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>Mixamo Pose Generator</h1>
      <span class="version">Web v1.0</span>
    </header>

    <div class="app-body">
      <aside class="sidebar">
        <FileLoader
          :file-name="fullFileName || undefined"
          :frame-count="parseResult?.frameCount"
          :is-loading="isLoading"
          @file-selected="onFileSelected"
        />

        <ConfigPanel
          :direction-preset="directionPreset"
          :skeleton-mode="skeletonMode"
          :draw-hands="drawHands"
          :export-format="exportFormat"
          :video-width="videoWidth"
          :video-height="videoHeight"
          :video-fps="videoFps"
          :loop-mode="loopMode"
          :loop-count="loopCount"
          :loop-duration="loopDuration"
          :has-preview="renderedDirections.length > 0"
          :is-exporting="isExporting"
          @update:direction-preset="directionPreset = $event"
          @update:skeleton-mode="skeletonMode = $event"
          @update:draw-hands="drawHands = $event"
          @update:export-format="exportFormat = $event"
          @update:video-width="videoWidth = $event"
          @update:video-height="videoHeight = $event"
          @update:video-fps="videoFps = $event"
          @update:loop-mode="loopMode = $event"
          @update:loop-count="loopCount = $event"
          @update:loop-duration="loopDuration = $event"
          @export="onExport"
        />

        <ProgressBar
          v-if="isExporting"
          :current="exportProgress.current"
          :total="exportProgress.total"
          :label="exportProgress.label"
        />
      </aside>

      <main class="main-area">
        <PreviewCanvas :canvas="currentCanvas" />
        <AnimationControls
          v-if="renderedDirections.length > 0"
          :directions="directionNames"
          :current-direction="preview.currentDirection.value"
          :current-frame="preview.currentFrame.value"
          :frame-count="frameCount"
          :is-playing="preview.isPlaying.value"
          :fps="preview.fps.value"
          @update:current-direction="preview.setDirection($event)"
          @update:fps="preview.fps.value = $event"
          @toggle-play="preview.togglePlay()"
          @prev-frame="preview.prevFrame()"
          @next-frame="preview.nextFrame()"
        />
        <LogPanel :entries="logEntries" @clear="clearLog" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}
.app-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 10px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.app-header h1 { margin: 0; font-size: 16px; font-weight: 700; }
.version { font-size: 11px; color: var(--text-secondary); }
.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.sidebar {
  width: 340px;
  min-width: 300px;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  overflow-y: auto;
  border-right: 1px solid var(--border);
  background: var(--bg-primary);
}
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 4px;
  min-width: 0;
}
</style>

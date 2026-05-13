<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { SkeletonMode, LoopMode, DirectionEntry } from './types/config'
import type { ParseResult } from './types/pose'
import { DEFAULT_DIRECTIONS } from './types/config'
import { useFileLoader } from './composables/useFileLoader'
import { usePoseGenerator } from './composables/usePoseGenerator'
import { usePreview } from './composables/usePreview'
import { useExport } from './composables/useExport'
import FileLoader from './components/config/FileLoader.vue'
import ConfigPanel from './components/config/ConfigPanel.vue'
import PreviewCanvas from './components/preview/PreviewCanvas.vue'
import AnimationControls from './components/preview/AnimationControls.vue'
import MeshPreview from './components/preview/MeshPreview.vue'
import ProgressBar from './components/export/ProgressBar.vue'
import Toast from './components/Toast.vue'
import { useToast } from './composables/useToast'
import { useRotationHistory } from './composables/useRotationHistory'

const { parseResult, animationName, fullFileName, isLoading, error, daeXmlContent, loadFile } = useFileLoader()
const { renderedDirections, generatePreview, generateForExport } = usePoseGenerator()
const { isExporting, exportProgress, exportAll } = useExport()
const { toast } = useToast()
const rotationHistory = useRotationHistory()

const preview = usePreview(() => renderedDirections.value as any[])

// Config state
const activeDirections = ref<DirectionEntry[]>([...DEFAULT_DIRECTIONS])
const skeletonMode = ref<SkeletonMode>('openpose')
const drawHands = ref(true)
const drawFace = ref(true)
const faceScale = ref(0.55)
const xinsrScaling = ref(false)
const scale = ref(2.0)
const exportPng = ref(true)
const exportMp4 = ref(false)
const videoWidth = ref(720)
const videoHeight = ref(1280)
const videoFps = ref(24)
const loopMode = ref<LoopMode>('auto')
const loopCount = ref(4)
const loopDuration = ref(3.5)
const liveViewAngle = ref<number | null>(null)

const currentYAngle = computed(() => {
  const dirs = renderedDirections.value
  if (dirs.length === 0) return 0
  const dirName = dirs[preview.currentDirection.value]?.name
  if (!dirName) return 0
  const entry = activeDirections.value.find(d => d.name === dirName)
  return entry?.angle ?? 0
})

const renderOpts = computed(() => ({
  drawHands: drawHands.value,
  drawFace: drawFace.value,
  faceScale: faceScale.value,
  xinsrScaling: xinsrScaling.value,
}))

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

watch(error, (e) => {
  if (e) {
    console.error(e)
    toast(e, 'error', 4000)
  }
})

// --- Auto-generate logic ---

async function triggerPreview(autoPlay = false) {
  if (!parseResult.value || activeDirections.value.length === 0) return
  const wasPlaying = preview.isPlaying.value
  console.info(`生成预览 (${activeDirections.value.length}方向, ${skeletonMode.value})`)
  await generatePreview(
    parseResult.value as ParseResult,
    activeDirections.value,
    skeletonMode.value,
    renderOpts.value,
    scale.value,
  )
  if (renderedDirections.value.length > 0) {
    const dirs = renderedDirections.value
    const total = dirs.reduce((s, d) => s + d.frames.length, 0)
    console.info(`预览就绪: ${dirs.length} 方向, ${total} 帧`)
    if (autoPlay || wasPlaying) preview.play()
  }
}

watch(parseResult, (result) => {
  if (result) triggerPreview(true)
})

watch([activeDirections, skeletonMode, drawHands, drawFace, faceScale, xinsrScaling], () => {
  if (parseResult.value) triggerPreview()
}, { deep: true })

function applyAngleChange(name: string, angle: number, selectDirection = false) {
  const dirs = [...activeDirections.value]
  const idx = dirs.findIndex(d => d.name === name)
  if (idx < 0) return
  dirs[idx] = { ...dirs[idx], angle }
  activeDirections.value = dirs
  if (selectDirection) {
    preview.currentDirection.value = idx
  }
}

function onRotateEnd(angle: number) {
  const idx = preview.currentDirection.value
  const dirs = activeDirections.value
  if (idx < 0 || idx >= dirs.length) return
  const dir = dirs[idx]
  if (dir.angle === angle) return
  rotationHistory.push({ directionName: dir.name, oldAngle: dir.angle, newAngle: angle })
  applyAngleChange(dir.name, angle)
}

function onUndoRotation() {
  const record = rotationHistory.undo()
  if (!record) return
  applyAngleChange(record.directionName, record.oldAngle, true)
}

function onRedoRotation() {
  const record = rotationHistory.redo()
  if (!record) return
  applyAngleChange(record.directionName, record.newAngle, true)
}

function onKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      onUndoRotation()
    } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
      e.preventDefault()
      onRedoRotation()
    }
  }
}

onMounted(() => { document.addEventListener('keydown', onKeyDown) })
onUnmounted(() => { document.removeEventListener('keydown', onKeyDown) })

function onInvalidFile(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '未知'
  toast(`不支持的文件格式 (.${ext})，仅支持 .dae 和 .zip 文件`, 'warning')
}

async function onFileSelected(file: File) {
  console.info(`加载文件: ${file.name}`)
  await loadFile(file)
  if (parseResult.value) {
    const fileFps = parseResult.value.fps
    if (fileFps !== null) {
      videoFps.value = fileFps
      preview.fps.value = Math.min(fileFps, 30)
      console.info(`解析成功: ${animationName.value} (${parseResult.value.frameCount} 帧, 检测到 ${fileFps} FPS)`)
    } else {
      console.info(`解析成功: ${animationName.value} (${parseResult.value.frameCount} 帧, 未检测到 FPS, 使用默认 ${videoFps.value})`)
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
    console.warn('请先生成预览')
    return
  }

  const wantMp4 = exportMp4.value && parseResult.value
  let mp4Dirs: any[] | undefined

  if (wantMp4) {
    console.info('开始渲染高分辨率帧...')
    mp4Dirs = await generateForExport(
      parseResult.value as ParseResult,
      activeDirections.value,
      skeletonMode.value,
      renderOpts.value,
      scale.value,
      videoWidth.value,
      videoHeight.value,
      (cur, total, dir) => console.info(`渲染 ${dir}: ${cur}/${total}`),
    ) as any[]
  }

  console.info('开始打包导出...')
  await exportAll({
    png: exportPng.value,
    mp4: !!wantMp4,
    pngDirections: renderedDirections.value as any[],
    mp4Directions: mp4Dirs,
    animationName: animationName.value,
    videoWidth: videoWidth.value,
    videoHeight: videoHeight.value,
    videoFps: videoFps.value,
    targetFrames: wantMp4 ? computeTargetFrames(parseResult.value!.frameCount, videoFps.value) : 0,
  })
  console.info('导出完成')
}
</script>

<template>
  <div class="app">
    <Toast />
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
          @invalid-file="onInvalidFile"
        />

        <ConfigPanel
          :directions="activeDirections"
          :current-direction-index="preview.currentDirection.value"
          :live-view-angle="daeXmlContent ? liveViewAngle : null"
          :skeleton-mode="skeletonMode"
          :draw-hands="drawHands"
          :draw-face="drawFace"
          :face-scale="faceScale"
          :xinsr-scaling="xinsrScaling"
          :export-png="exportPng"
          :export-mp4="exportMp4"
          :video-width="videoWidth"
          :video-height="videoHeight"
          :video-fps="videoFps"
          :loop-mode="loopMode"
          :loop-count="loopCount"
          :loop-duration="loopDuration"
          :has-preview="renderedDirections.length > 0"
          :is-exporting="isExporting"
          @update:directions="activeDirections = $event"
          @select-direction="preview.setDirection($event)"
          @update:skeleton-mode="skeletonMode = $event"
          @update:draw-hands="drawHands = $event"
          @update:draw-face="drawFace = $event"
          @update:face-scale="faceScale = $event"
          @update:xinsr-scaling="xinsrScaling = $event"
          @update:export-png="exportPng = $event"
          @update:export-mp4="exportMp4 = $event"
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
        <MeshPreview
          v-if="daeXmlContent"
          :dae-xml="daeXmlContent"
          :y-angle="currentYAngle"
          :playing="preview.isPlaying.value"
          :current-frame="preview.currentFrame.value"
          :frame-count="frameCount"
          :fps="preview.fps.value"
          :skeleton-mode="skeletonMode"
          :pose-canvas="currentCanvas"
          :draw-hands="drawHands"
          :draw-face="drawFace"
          :face-scale="faceScale"
          :xinsr-scaling="xinsrScaling"
          :can-undo="rotationHistory.canUndo.value"
          :can-redo="rotationHistory.canRedo.value"
          @toggle-play="preview.togglePlay()"
          @prev-frame="preview.prevFrame()"
          @next-frame="preview.nextFrame()"
          @seek-frame="preview.currentFrame.value = $event"
          @update:fps="preview.fps.value = $event"
          @update:view-angle="liveViewAngle = $event"
          @rotate-end="onRotateEnd"
          @undo="onUndoRotation"
          @redo="onRedoRotation"
        />
        <template v-else>
          <PreviewCanvas :canvas="currentCanvas" />
          <AnimationControls
            v-if="renderedDirections.length > 0"
            :current-frame="preview.currentFrame.value"
            :frame-count="frameCount"
            :is-playing="preview.isPlaying.value"
            :fps="preview.fps.value"
            @update:fps="preview.fps.value = $event"
            @toggle-play="preview.togglePlay()"
            @prev-frame="preview.prevFrame()"
            @next-frame="preview.nextFrame()"
          />
        </template>
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

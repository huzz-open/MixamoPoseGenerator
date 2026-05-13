<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const emit = defineEmits<{
  fileSelected: [file: File]
  invalidFile: [fileName: string]
}>()

const isDragOver = ref(false)
const fileInput = ref<HTMLInputElement>()
let dragCounter = 0

function onDragEnter(e: DragEvent) {
  e.preventDefault()
  dragCounter++
  isDragOver.value = true
}

function onDragLeave() {
  dragCounter--
  if (dragCounter <= 0) {
    dragCounter = 0
    isDragOver.value = false
  }
}

function onDrop(e: DragEvent) {
  dragCounter = 0
  isDragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (!file) return
  if (/\.(dae|zip)$/i.test(file.name)) {
    emit('fileSelected', file)
  } else {
    emit('invalidFile', file.name)
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    if (/\.(dae|zip)$/i.test(file.name)) {
      emit('fileSelected', file)
    } else {
      emit('invalidFile', file.name)
    }
  }
  input.value = ''
}

function browse() {
  fileInput.value?.click()
}

const props = defineProps<{
  fileName?: string
  frameCount?: number
  isLoading?: boolean
}>()

const state = computed<'empty' | 'loading' | 'loaded'>(() => {
  if (props.isLoading) return 'loading'
  if (props.fileName) return 'loaded'
  return 'empty'
})

const isZip = computed(() => !!props.fileName && /\.zip$/i.test(props.fileName))
const fileTypeLabel = computed(() => isZip.value ? 'ZIP' : 'DAE')
</script>

<template>
  <div
    class="drop-zone"
    :class="{
      'drag-over': isDragOver,
      'has-file': state === 'loaded',
      'is-empty': state === 'empty',
    }"
    @dragover.prevent
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
    @click="state === 'empty' && browse()"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".dae,.zip"
      hidden
      @change="onFileChange"
    />

    <div class="layer" :class="{ active: state === 'empty' && !isDragOver }">
      <span class="upload-icon">⬆</span>
      <div class="text-group">
        <span>{{ t('fileLoader.dropHint') }}</span>
        <span class="hint">{{ t('fileLoader.clickHint') }}</span>
      </div>
    </div>

    <div class="layer" :class="{ active: isDragOver }">
      <span class="replace-icon">↻</span>
      <div class="text-group">
        <span>{{ fileName ? t('fileLoader.dropToReplace') : t('fileLoader.dropToLoad') }}</span>
      </div>
    </div>

    <div class="layer" :class="{ active: state === 'loading' && !isDragOver }">
      <span class="spinner" />
      <span>{{ t('fileLoader.parsing') }}</span>
    </div>

    <div class="layer" :class="{ active: state === 'loaded' && !isDragOver }">
      <span class="file-icon">{{ isZip ? '📦' : '🦴' }}</span>
      <div class="text-group">
        <span class="file-name" :title="fileName">{{ fileName }}</span>
        <span class="file-meta">
          <span class="file-type-badge" :class="isZip ? 'zip' : 'dae'">{{ fileTypeLabel }}</span>
          <span class="frame-count">{{ t('fileLoader.frames', { n: frameCount }) }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drop-zone {
  position: relative;
  height: 62px;
  border: 2px dashed var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  overflow: hidden;
}
.drop-zone.is-empty {
  cursor: pointer;
}
.drop-zone.is-empty:hover,
.drop-zone.drag-over {
  border-color: var(--accent);
  background: var(--bg-hover);
}
.drop-zone.has-file {
  border-color: var(--success);
}
.drop-zone.has-file.drag-over {
  border-color: var(--accent);
}

.layer {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 20px;
  color: var(--text-secondary);
  visibility: hidden;
  opacity: 0;
}
.layer.active {
  visibility: visible;
  opacity: 1;
}

.upload-icon { font-size: 22px; flex-shrink: 0; }
.file-icon { font-size: 22px; flex-shrink: 0; }
.replace-icon { font-size: 22px; flex-shrink: 0; color: var(--accent); }
.text-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  font-size: 13px;
  min-width: 0;
}
.hint { font-size: 12px; opacity: 0.6; }
.file-name {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 13px;
  word-break: break-all;
  line-height: 1.3;
}
.file-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.file-type-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  letter-spacing: 0.5px;
  line-height: 1.4;
}
.file-type-badge.dae {
  background: rgba(74, 125, 255, 0.15);
  color: var(--accent);
}
.file-type-badge.zip {
  background: rgba(255, 159, 10, 0.15);
  color: var(--warning);
}
.frame-count { font-size: 12px; color: var(--success); }
.spinner {
  display: inline-block;
  width: 20px; height: 20px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>

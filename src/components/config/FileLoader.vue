<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits<{
  fileSelected: [file: File]
}>()

const isDragOver = ref(false)
const fileInput = ref<HTMLInputElement>()

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file && /\.(dae|zip)$/i.test(file.name)) {
    emit('fileSelected', file)
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('fileSelected', file)
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

const isZip = computed(() => !!props.fileName && /\.zip$/i.test(props.fileName))
const fileTypeLabel = computed(() => isZip.value ? 'ZIP' : 'DAE')
</script>

<template>
  <div class="file-loader">
    <div
      class="drop-zone"
      :class="{
        'drag-over': isDragOver,
        'has-file': fileName,
        'replacing': isDragOver && fileName,
      }"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".dae,.zip"
        hidden
        @change="onFileChange"
      />

      <!-- Drag-over replace overlay -->
      <div v-if="isDragOver && fileName" class="replace-overlay">
        <span class="replace-icon">↻</span>
        <span>释放以替换文件</span>
      </div>

      <div v-if="isLoading" class="drop-content">
        <span class="spinner" />
        <span>解析中...</span>
      </div>
      <div v-else-if="fileName" class="drop-content loaded" :class="{ blurred: isDragOver }">
        <span class="file-icon" :class="isZip ? 'zip' : 'dae'">
          {{ isZip ? '📦' : '🦴' }}
        </span>
        <div class="file-info">
          <span class="file-name" :title="fileName">{{ fileName }}</span>
          <span class="file-meta">
            <span class="file-type-badge" :class="isZip ? 'zip' : 'dae'">{{ fileTypeLabel }}</span>
            <span class="frame-count">{{ frameCount }} 帧</span>
          </span>
        </div>
      </div>
      <div v-else class="drop-content" @click="browse">
        <span class="upload-icon">⬆</span>
        <span>拖放 DAE/ZIP 文件到此处</span>
        <span class="hint">或点击浏览</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drop-zone {
  position: relative;
  border: 2px dashed var(--border);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: default;
  transition: all 0.25s ease;
  background: var(--bg-secondary);
  overflow: hidden;
}
.drop-zone:not(.has-file) {
  cursor: pointer;
}
.drop-zone:not(.has-file):hover,
.drop-zone.drag-over:not(.has-file) {
  border-color: var(--accent);
  background: var(--bg-hover);
}
.drop-zone.has-file {
  border-style: solid;
  border-color: var(--success);
}
.drop-zone.replacing {
  border-color: var(--accent);
  border-style: dashed;
}
.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  transition: filter 0.25s ease, opacity 0.25s ease;
}
.drop-content.loaded {
  flex-direction: row;
  gap: 10px;
  justify-content: center;
}
.drop-content.blurred {
  filter: blur(3px);
  opacity: 0.35;
}
.replace-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  z-index: 1;
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  pointer-events: none;
  animation: fadeIn 0.15s ease;
}
.replace-icon {
  font-size: 22px;
  animation: pulse 1s ease infinite;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
.upload-icon { font-size: 24px; }
.file-icon { font-size: 22px; flex-shrink: 0; }
.hint { font-size: 12px; opacity: 0.6; }
.file-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}
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
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>

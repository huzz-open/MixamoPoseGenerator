<script setup lang="ts">
import type { DirectionPreset, SkeletonMode, ExportFormat, LoopMode } from '../../types/config'
import { DIRECTION_CONFIGS } from '../../types/config'

const props = defineProps<{
  directionPreset: DirectionPreset
  skeletonMode: SkeletonMode
  drawHands: boolean
  exportFormat: ExportFormat
  videoWidth: number
  videoHeight: number
  videoFps: number
  loopMode: LoopMode
  loopCount: number
  loopDuration: number
  hasPreview: boolean
  isExporting: boolean
}>()

const emit = defineEmits<{
  'update:directionPreset': [value: DirectionPreset]
  'update:skeletonMode': [value: SkeletonMode]
  'update:drawHands': [value: boolean]
  'update:exportFormat': [value: ExportFormat]
  'update:videoWidth': [value: number]
  'update:videoHeight': [value: number]
  'update:videoFps': [value: number]
  'update:loopMode': [value: LoopMode]
  'update:loopCount': [value: number]
  'update:loopDuration': [value: number]
  export: []
}>()

const dirPresets = Object.entries(DIRECTION_CONFIGS) as [DirectionPreset, typeof DIRECTION_CONFIGS[DirectionPreset]][]

const skeletonModes: { value: SkeletonMode; label: string }[] = [
  { value: 'raw', label: '原始骨架' },
  { value: 'openpose', label: 'OpenPose 18点' },
  { value: 'dwpose', label: 'DWPose (Wan 2.2)' },
]
</script>

<template>
  <div class="config-panel">
    <section>
      <h3>方向</h3>
      <div class="radio-group">
        <label v-for="[key, cfg] in dirPresets" :key="key" class="radio-label">
          <input
            type="radio"
            :value="key"
            :checked="directionPreset === key"
            @change="emit('update:directionPreset', key)"
          />
          <span>{{ cfg.icon }} {{ cfg.name }} ({{ Object.keys(cfg.directions).length }}方向)</span>
        </label>
      </div>
    </section>

    <div class="divider" />

    <section>
      <h3>骨架模式</h3>
      <div class="radio-group">
        <label v-for="m in skeletonModes" :key="m.value" class="radio-label">
          <input
            type="radio"
            :value="m.value"
            :checked="skeletonMode === m.value"
            @change="emit('update:skeletonMode', m.value)"
          />
          <span>{{ m.label }}</span>
        </label>
      </div>
      <label class="checkbox-label">
        <input
          type="checkbox"
          :checked="drawHands"
          @change="emit('update:drawHands', ($event.target as HTMLInputElement).checked)"
        />
        <span>手部关键点</span>
      </label>
    </section>

    <div class="divider" />

    <section>
      <h3>导出</h3>
      <div class="radio-group">
        <label class="radio-label">
          <input
            type="radio"
            value="png"
            :checked="exportFormat === 'png'"
            @change="emit('update:exportFormat', 'png')"
          />
          <span>PNG 帧图</span>
        </label>
        <label class="radio-label">
          <input
            type="radio"
            value="mp4"
            :checked="exportFormat === 'mp4'"
            @change="emit('update:exportFormat', 'mp4')"
          />
          <span>MP4 骨骼视频 (Wan 2.2)</span>
        </label>
      </div>

      <div v-if="exportFormat === 'mp4'" class="video-opts">
        <div class="input-row">
          <span>分辨率:</span>
          <input type="number" :value="videoWidth" min="128" max="4096" style="width:60px"
                 @input="emit('update:videoWidth', parseInt(($event.target as HTMLInputElement).value) || 720)" />
          <span>x</span>
          <input type="number" :value="videoHeight" min="128" max="4096" style="width:60px"
                 @input="emit('update:videoHeight', parseInt(($event.target as HTMLInputElement).value) || 1280)" />
        </div>
        <div class="input-row">
          <span>FPS:</span>
          <input type="number" :value="videoFps" min="12" max="60" style="width:50px"
                 @input="emit('update:videoFps', parseInt(($event.target as HTMLInputElement).value) || 24)" />
        </div>
        <div class="radio-group small">
          <label class="radio-label">
            <input type="radio" value="auto" :checked="loopMode === 'auto'" @change="emit('update:loopMode', 'auto')" />
            <span>自动(≥81帧)</span>
          </label>
          <label class="radio-label">
            <input type="radio" value="count" :checked="loopMode === 'count'" @change="emit('update:loopMode', 'count')" />
            <span>循环
              <input type="number" :value="loopCount" min="1" max="20" style="width:40px"
                     :disabled="loopMode !== 'count'"
                     @input="emit('update:loopCount', parseInt(($event.target as HTMLInputElement).value) || 4)" />
              次
            </span>
          </label>
          <label class="radio-label">
            <input type="radio" value="duration" :checked="loopMode === 'duration'" @change="emit('update:loopMode', 'duration')" />
            <span>目标
              <input type="number" :value="loopDuration" min="0.5" max="30" step="0.5" style="width:50px"
                     :disabled="loopMode !== 'duration'"
                     @input="emit('update:loopDuration', parseFloat(($event.target as HTMLInputElement).value) || 3.5)" />
              秒
            </span>
          </label>
        </div>
      </div>
    </section>

    <button
      class="btn btn-accent full-width"
      :disabled="!hasPreview || isExporting"
      @click="emit('export')"
    >
      {{ isExporting ? '导出中...' : '导出到磁盘' }}
    </button>
  </div>
</template>

<style scoped>
.config-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  overflow-y: auto;
}
section { display: flex; flex-direction: column; gap: 6px; }
h3 { margin: 0; font-size: 13px; font-weight: 600; color: var(--text-primary); }
.divider { height: 1px; background: var(--border); margin: 4px 0; }
.radio-group { display: flex; flex-direction: column; gap: 3px; padding-left: 4px; }
.radio-group.small { font-size: 12px; }
.radio-label, .checkbox-label {
  display: flex; align-items: center; gap: 6px; cursor: pointer;
  padding: 2px 0; font-size: 13px; color: var(--text-secondary);
}
.radio-label:hover, .checkbox-label:hover { color: var(--text-primary); }
.video-opts {
  display: flex; flex-direction: column; gap: 6px;
  padding: 8px; background: var(--bg-secondary); border-radius: 6px;
  margin-top: 4px;
}
.input-row {
  display: flex; align-items: center; gap: 6px; font-size: 12px;
  color: var(--text-secondary);
}
.input-row input[type=number] {
  background: var(--bg-input); border: 1px solid var(--border);
  border-radius: 4px; padding: 2px 4px; color: var(--text-primary);
  font-size: 12px;
}
.btn {
  padding: 8px 16px; border: none; border-radius: 6px;
  font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary {
  background: var(--accent); color: #fff;
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.btn-accent {
  background: var(--success); color: #fff;
}
.btn-accent:hover:not(:disabled) { filter: brightness(1.1); }
.full-width { width: 100%; }
</style>

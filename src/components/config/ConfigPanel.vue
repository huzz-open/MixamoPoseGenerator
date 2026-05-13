<script setup lang="ts">
import { ref } from 'vue'
import type { SkeletonMode, LoopMode, DirectionEntry, DirectionPresetDef } from '../../types/config'
import { DIRECTION_PRESETS } from '../../types/config'
import { useToast } from '../../composables/useToast'
import addIcon from '../../assets/icon/add.svg'
import clearIcon from '../../assets/icon/clear.svg'

const { toast } = useToast()

const props = defineProps<{
  directions: DirectionEntry[]
  currentDirectionIndex: number
  skeletonMode: SkeletonMode
  drawHands: boolean
  drawFace: boolean
  faceScale: number
  xinsrScaling: boolean
  exportPng: boolean
  exportMp4: boolean
  videoWidth: number
  videoHeight: number
  videoFps: number
  loopMode: LoopMode
  loopCount: number
  loopDuration: number
  liveViewAngle: number | null
  hasPreview: boolean
  isExporting: boolean
}>()

const emit = defineEmits<{
  'update:directions': [value: DirectionEntry[]]
  selectDirection: [index: number]
  'update:skeletonMode': [value: SkeletonMode]
  'update:drawHands': [value: boolean]
  'update:drawFace': [value: boolean]
  'update:faceScale': [value: number]
  'update:xinsrScaling': [value: boolean]
  'update:exportPng': [value: boolean]
  'update:exportMp4': [value: boolean]
  'update:videoWidth': [value: number]
  'update:videoHeight': [value: number]
  'update:videoFps': [value: number]
  'update:loopMode': [value: LoopMode]
  'update:loopCount': [value: number]
  'update:loopDuration': [value: number]
  export: []
}>()

const newDirName = ref('')
const newDirAngle = ref('')

const skeletonModes: { value: SkeletonMode; label: string; desc: string }[] = [
  { value: 'raw', label: '原始骨架', desc: '' },
  { value: 'openpose', label: 'OpenPose', desc: 'ControlNet / Wan-Fun' },
  { value: 'dwpose', label: 'DWPose', desc: 'Wan 2.1/2.2 Animate' },
]

function applyPreset(preset: DirectionPresetDef) {
  const existing = new Set(props.directions.map(d => d.angle))
  const toAdd = preset.directions.filter(pd => !existing.has(pd.angle))
  if (toAdd.length === 0) return
  emit('update:directions', [...props.directions, ...toAdd].sort((a, b) => a.angle - b.angle))
}

function removeDirection(idx: number) {
  const next = [...props.directions]
  next.splice(idx, 1)
  emit('update:directions', next)
}

function clearAllDirections() {
  emit('update:directions', [])
}

function addCustomDirection() {
  const raw = Number(newDirAngle.value)
  if (isNaN(raw) || raw < 0 || raw > 359) {
    toast('请输入 0~359 之间的角度', 'warning')
    return
  }
  const angle = Math.round(raw)
  const dup = props.directions.find(d => d.angle === angle)
  if (dup) {
    toast(`角度 ${angle}° 已存在 (${dup.name})，跳过添加`, 'warning')
    return
  }
  const name = newDirName.value.trim() || `${angle}`
  emit('update:directions', [...props.directions, { name, angle }].sort((a, b) => a.angle - b.angle))
  newDirName.value = ''
  newDirAngle.value = ''
}
</script>

<template>
  <div class="config-panel">
    <section>
      <h3>方向</h3>
      <div class="preset-row">
        <button
          v-for="preset in DIRECTION_PRESETS"
          :key="preset.id"
          class="preset-btn"
          @click="applyPreset(preset)"
        >{{ preset.icon }} {{ preset.label }}</button>
      </div>

      <div class="dir-list-container">
        <div v-if="directions.length > 0" class="dir-list">
          <div
            v-for="(dir, idx) in directions"
            :key="dir.name"
            class="dir-item"
            :class="{ 'dir-active': idx === currentDirectionIndex }"
            @click="emit('selectDirection', idx)"
          >
            <span class="dir-angle">{{ idx === currentDirectionIndex && liveViewAngle != null ? liveViewAngle : dir.angle }}°</span>
            <span class="dir-name">{{ dir.name }}</span>
            <button class="dir-remove" @click.stop="removeDirection(idx)" title="移除">×</button>
          </div>
        </div>
        <div v-else class="dir-empty">未选择任何方向</div>
      </div>

      <div class="dir-add-row">
        <input
          v-model="newDirAngle"
          type="text"
          inputmode="numeric"
          placeholder="角度"
          class="dir-input"
          style="width:48px; text-align:center"
          @keyup.enter="addCustomDirection"
        />
        <span class="dir-unit">°</span>
        <input
          v-model="newDirName"
          placeholder="名称(可选)"
          class="dir-input"
          style="flex:1"
          @keyup.enter="addCustomDirection"
        />
        <button class="dir-add-btn" @click="addCustomDirection" title="添加方向">
          <img :src="addIcon" alt="添加" class="dir-add-icon" />
        </button>
        <button class="dir-clear-btn" @click="clearAllDirections" title="清除全部">
          <img :src="clearIcon" alt="清除" class="dir-clear-icon" />
        </button>
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
          <span>{{ m.label }}<span v-if="m.desc" class="mode-desc"> ({{ m.desc }})</span></span>
        </label>
      </div>
      <div v-if="skeletonMode !== 'raw'" class="checkbox-group" style="margin-top:4px">
        <label class="checkbox-label">
          <input
            type="checkbox"
            :checked="drawHands"
            @change="emit('update:drawHands', ($event.target as HTMLInputElement).checked)"
          />
          <span>手部关键点</span>
        </label>
        <label class="checkbox-label">
          <input
            type="checkbox"
            :checked="drawFace"
            @change="emit('update:drawFace', ($event.target as HTMLInputElement).checked)"
          />
          <span>面部关键点 (68点)</span>
        </label>
        <div v-if="drawFace" class="face-scale-row">
          <span class="face-scale-label">面部比例</span>
          <input
            type="range"
            min="0.2"
            max="1.2"
            step="0.05"
            :value="faceScale"
            @input="emit('update:faceScale', parseFloat(($event.target as HTMLInputElement).value))"
          />
          <span class="face-scale-value">{{ faceScale.toFixed(2) }}</span>
        </div>
        <label v-if="skeletonMode === 'openpose'" class="checkbox-label">
          <input
            type="checkbox"
            :checked="xinsrScaling"
            @change="emit('update:xinsrScaling', ($event.target as HTMLInputElement).checked)"
          />
          <span>SDXL 高分辨率适配 (xinsr)</span>
        </label>
      </div>
    </section>

    <div class="divider" />

    <section>
      <h3>导出</h3>
      <div class="checkbox-group">
        <label class="checkbox-label">
          <input
            type="checkbox"
            :checked="exportPng"
            @change="emit('update:exportPng', ($event.target as HTMLInputElement).checked)"
          />
          <span>PNG 帧图</span>
        </label>
        <label class="checkbox-label">
          <input
            type="checkbox"
            :checked="exportMp4"
            @change="emit('update:exportMp4', ($event.target as HTMLInputElement).checked)"
          />
          <span>MP4 骨骼视频 (Wan 2.2)</span>
        </label>
      </div>

      <div v-if="exportMp4" class="video-opts">
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
      :disabled="!hasPreview || isExporting || (!exportPng && !exportMp4)"
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

/* Direction presets */
.preset-row {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}
.preset-row::-webkit-scrollbar { display: none; }
.preset-btn {
  flex: 1 1 0;
  padding: 3px 4px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  background: var(--accent, #4a9eff);
  border: 1px solid var(--accent, #4a9eff);
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
  white-space: nowrap;
  text-align: center;
}
.preset-btn:hover {
  filter: brightness(1.15);
}
.preset-btn:active {
  filter: brightness(0.9);
}

/* Direction list container */
.dir-list-container {
  height: 88px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
}
.dir-list-container:hover {
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.2) transparent;
}
.dir-list-container::-webkit-scrollbar { width: 0; background: transparent; }
.dir-list-container:hover::-webkit-scrollbar { width: 4px; }
.dir-list-container::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.2);
  border-radius: 4px;
}
.dir-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 2px 0;
}
.dir-item {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 4px 2px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}
.dir-item:hover {
  border-color: var(--accent, #4a9eff);
}
.dir-item.dir-active {
  background: rgba(74, 158, 255, 0.15);
  border-color: var(--accent, #4a9eff);
}
.dir-name { color: var(--text-primary); font-weight: 500; }
.dir-angle { color: var(--text-secondary); }
.dir-remove {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  padding: 0 2px;
  opacity: 0.5;
  transition: opacity 0.15s;
}
.dir-remove:hover { opacity: 1; color: #ff6b6b; }
.dir-empty {
  font-size: 12px;
  color: var(--text-secondary);
  opacity: 0.5;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Add direction */
.dir-add-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}
.dir-input {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  padding: 3px 6px;
  font-size: 12px;
}
.dir-unit {
  font-size: 12px;
  color: var(--text-secondary);
}
.dir-add-btn {
  background: none;
  border: none;
  padding: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.dir-add-btn:hover { opacity: 1; }
.dir-add-icon {
  width: 18px;
  height: 18px;
}
.dir-clear-btn {
  background: none;
  border: none;
  padding: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.dir-clear-btn:hover { opacity: 1; }
.dir-clear-icon {
  width: 18px;
  height: 18px;
}

.radio-group, .checkbox-group { display: flex; flex-direction: column; gap: 3px; padding-left: 4px; }
.radio-group.small { font-size: 12px; }
.radio-label, .checkbox-label {
  display: flex; align-items: center; gap: 6px; cursor: pointer;
  padding: 2px 0; font-size: 13px; color: var(--text-secondary);
}
.radio-label:hover, .checkbox-label:hover { color: var(--text-primary); }
.mode-desc { font-size: 11px; color: var(--text-secondary); opacity: 0.7; }
.face-scale-row {
  display: flex; align-items: center; gap: 6px;
  padding: 2px 0 2px 22px; font-size: 12px; color: var(--text-secondary);
}
.face-scale-row input[type=range] { flex: 1; height: 4px; accent-color: var(--accent); cursor: pointer; }
.face-scale-label { white-space: nowrap; }
.face-scale-value { font-variant-numeric: tabular-nums; min-width: 32px; text-align: right; }
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
.btn-accent {
  background: var(--success); color: #fff;
}
.btn-accent:hover:not(:disabled) { filter: brightness(1.1); }
.full-width { width: 100%; }
</style>

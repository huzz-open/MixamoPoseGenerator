<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { SkeletonMode } from '../../types/config'
import type { FrameData, Vec3, OpenPoseFrame } from '../../types/pose'
import { mapFrameToOpenpose } from '../../core/openpose-mapper'
import { renderOpFrame } from '../../renderers/renderer-factory'

import skinIcon from '../../assets/icon/skin.svg'
import inPlaceIcon from '../../assets/icon/in-place.svg'
import lockIcon from '../../assets/icon/lock.svg'
import axesIcon from '../../assets/icon/axes.svg'
import fitViewIcon from '../../assets/icon/fit-view.svg'
import resetIcon from '../../assets/icon/reset.svg'
import prevFrameIcon from '../../assets/icon/pre-frame.svg'
import nextFrameIcon from '../../assets/icon/next-frame.svg'
import playIcon from '../../assets/icon/play.svg'
import stopIcon from '../../assets/icon/stop.svg'
import undoIcon from '../../assets/icon/undo.svg'
import redoIcon from '../../assets/icon/redo.svg'

const props = defineProps<{
  daeXml: string | null
  yAngle: number
  playing: boolean
  currentFrame: number
  frameCount: number
  fps: number
  skeletonMode: SkeletonMode
  poseCanvas: HTMLCanvasElement | null
  drawHands: boolean
  drawFace: boolean
  faceScale: number
  xinsrScaling: boolean
  canUndo: boolean
  canRedo: boolean
}>()

const emit = defineEmits<{
  togglePlay: []
  prevFrame: []
  nextFrame: []
  seekFrame: [frame: number]
  'update:fps': [value: number]
  'update:viewAngle': [value: number]
  rotateEnd: [angle: number]
  undo: []
  redo: []
}>()

const containerRef = ref<HTMLDivElement>()
const poseOverlayRef = ref<HTMLCanvasElement>()
const loading = ref(false)
const errorMsg = ref('')
const debugInfo = ref('')

const showSkin = ref(true)
const poseOpacity = ref(0.5)
const skinHover = ref(false)
const inPlace = ref(true)
const showAxes = ref(false)
const lockRotation = ref(true)
const viewAngle = ref(0)
const hasSkin = ref(false)

const isOrthoMode = computed(() => props.skeletonMode !== 'raw')

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let perspCamera: THREE.PerspectiveCamera | null = null
let orthoCamera: THREE.OrthographicCamera | null = null
let controls: OrbitControls | null = null
let mixer: THREE.AnimationMixer | null = null
let activeAction: THREE.AnimationAction | null = null
let clipDuration = 0
let lastTime = 0
let modelGroup: THREE.Group | null = null
let gridHelper: THREE.GridHelper | null = null
let axesHelper: THREE.AxesHelper | null = null
let skeletonHelper: THREE.SkeletonHelper | null = null
let animId = 0
let orbitStartAzimuth = 0
let syncTimeout: ReturnType<typeof setTimeout> | null = null

let modelHeight = 1
let hipsRoot: THREE.Bone | null = null
let meshObjects: THREE.Object3D[] = []
let modelRoot: THREE.Object3D | null = null

function activeCamera(): THREE.Camera | null {
  return isOrthoMode.value ? orthoCamera : perspCamera
}

function updateViewAngle() {
  if (!controls) return
  const azimuthDeg = THREE.MathUtils.radToDeg(controls.getAzimuthalAngle())
  viewAngle.value = Math.round(((props.yAngle - azimuthDeg) % 360 + 360) % 360)
  emit('update:viewAngle', viewAngle.value)
}

function resetAzimuth() {
  const cam = activeCamera()
  if (!cam || !controls) return
  const dist = cam.position.distanceTo(controls.target)
  const polar = controls.getPolarAngle()
  cam.position.set(
    controls.target.x,
    controls.target.y + dist * Math.cos(polar),
    controls.target.z + dist * Math.sin(polar),
  )
  controls.update()
}

function onOrbitStart() {
  if (syncTimeout) { clearTimeout(syncTimeout); syncTimeout = null }
  orbitStartAzimuth = controls?.getAzimuthalAngle() ?? 0
}

function onOrbitEnd() {
  if (!controls) return
  const endAzimuth = controls.getAzimuthalAngle()
  if (Math.abs(endAzimuth - orbitStartAzimuth) > 0.005) {
    if (syncTimeout) clearTimeout(syncTimeout)
    syncTimeout = setTimeout(() => {
      emit('rotateEnd', viewAngle.value)
      syncTimeout = null
    }, 300)
  }
}

function applyRotationLock() {
  if (!controls) return
  if (isOrthoMode.value) {
    controls.minPolarAngle = Math.PI / 2
    controls.maxPolarAngle = Math.PI / 2
    return
  }
  if (lockRotation.value) {
    const polar = controls.getPolarAngle()
    controls.minPolarAngle = polar
    controls.maxPolarAngle = polar
  } else {
    controls.minPolarAngle = 0
    controls.maxPolarAngle = Math.PI
  }
}

function initScene() {
  const el = containerRef.value
  if (!el) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a1a)

  const aspect = el.clientWidth / el.clientHeight
  perspCamera = new THREE.PerspectiveCamera(35, aspect, 0.001, 10000)
  perspCamera.position.set(0, 1, 4)

  const halfH = 1
  orthoCamera = new THREE.OrthographicCamera(
    -halfH * aspect, halfH * aspect, halfH, -halfH, 0.001, 10000,
  )
  orthoCamera.position.set(0, 0.5, 5)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(el.clientWidth, el.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  el.appendChild(renderer.domElement)

  const cam = activeCamera()!
  controls = new OrbitControls(cam, renderer.domElement)
  controls.target.set(0, 0.8, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.1
  controls.addEventListener('change', updateViewAngle)
  controls.addEventListener('start', onOrbitStart)
  controls.addEventListener('end', onOrbitEnd)
  controls.update()

  const ambient = new THREE.AmbientLight(0xffffff, 1.2)
  scene.add(ambient)

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
  dirLight.position.set(2, 4, 3)
  scene.add(dirLight)

  const backLight = new THREE.DirectionalLight(0xffffff, 0.5)
  backLight.position.set(-2, 2, -3)
  scene.add(backLight)

  lastTime = performance.now()
}

function clearModel() {
  if (skeletonHelper && scene) {
    scene.remove(skeletonHelper)
    skeletonHelper.dispose()
    skeletonHelper = null
  }
  if (modelGroup && scene) {
    scene.remove(modelGroup)
    modelGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material?.dispose()
        }
      }
    })
    modelGroup = null
  }
  mixer = null
  activeAction = null
  clipDuration = 0
  hipsRoot = null
  meshObjects = []
  modelRoot = null
  hasSkin.value = false
  debugInfo.value = ''
}

function fitToView() {
  const cam = activeCamera()
  if (!cam || !controls) return
  const h = modelHeight

  if (cam instanceof THREE.PerspectiveCamera) {
    const fovRad = cam.fov * Math.PI / 180
    const dist = (h * 0.6) / Math.tan(fovRad / 2)
    cam.position.set(0, h * 0.5, dist)
    controls.target.set(0, h * 0.45, 0)
    cam.near = h * 0.01
    cam.far = h * 200
    cam.updateProjectionMatrix()
  } else if (cam instanceof THREE.OrthographicCamera) {
    const el = containerRef.value
    const aspect = el ? el.clientWidth / el.clientHeight : 1
    const halfH = h * 0.55
    cam.left = -halfH * aspect
    cam.right = halfH * aspect
    cam.top = halfH
    cam.bottom = -halfH
    cam.near = 0.001
    cam.far = h * 200
    cam.position.set(0, h * 0.5, h * 2)
    controls.target.set(0, h * 0.5, 0)
    cam.updateProjectionMatrix()
  }

  controls.update()
  applyRotationLock()
  updateViewAngle()
}

function resetRotation() {
  const cam = activeCamera()
  if (!cam || !controls) return
  const dist = cam.position.distanceTo(controls.target)
  const azimuth = controls.getAzimuthalAngle()
  const targetY = controls.target.y
  cam.position.set(
    controls.target.x + dist * Math.sin(azimuth),
    targetY,
    controls.target.z + dist * Math.cos(azimuth),
  )
  cam.up.set(0, 1, 0)
  controls.update()
  applyRotationLock()
  updateViewAngle()
}

function onFpsInput(e: Event) {
  const raw = parseInt((e.target as HTMLInputElement).value)
  if (isNaN(raw)) return
  emit('update:fps', Math.max(1, Math.min(160, raw)))
}

function onSeek(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value)
  emit('seekFrame', val)
}

function updateTimeScale() {
  if (!mixer || clipDuration <= 0 || props.frameCount <= 0) return
  const nativeFps = props.frameCount / clipDuration
  mixer.timeScale = props.fps / nativeFps
}

function seekToFrame(frame: number) {
  if (!mixer || !activeAction || clipDuration <= 0 || props.frameCount <= 0) return
  const t = (frame / props.frameCount) * clipDuration
  activeAction.time = t
  mixer.update(0)
  if (inPlace.value && hipsRoot) {
    hipsRoot.position.x = 0
    hipsRoot.position.z = 0
  }
}

function loadFromXml(xml: string) {
  if (!scene) return
  clearModel()
  loading.value = true
  errorMsg.value = ''

  try {
    const loader = new ColladaLoader()
    const parsed = loader.parse(xml, '')

    loading.value = false
    if (!parsed) {
      errorMsg.value = 'ColladaLoader 解析返回空'
      return
    }

    const root = parsed.scene
    let meshCount = 0
    let skinnedCount = 0
    let boneCount = 0
    let vertexCount = 0

    root.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh) {
        skinnedCount++
        vertexCount += child.geometry?.attributes?.position?.count ?? 0
        child.frustumCulled = false
        meshObjects.push(child)
      } else if (child instanceof THREE.Mesh) {
        meshCount++
        vertexCount += child.geometry?.attributes?.position?.count ?? 0
        child.frustumCulled = false
        meshObjects.push(child)
      }
      if (child instanceof THREE.Bone && !hipsRoot) {
        if (child.name === 'mixamorig_Hips' || child.name.includes('Hips')) {
          hipsRoot = child
        }
      }
      if (child instanceof THREE.Bone) boneCount++
    })

    root.updateWorldMatrix(true, true)

    const worldPos = new THREE.Vector3()
    const boneBox = new THREE.Box3()
    if (boneCount > 0) {
      root.traverse((child) => {
        if (child instanceof THREE.Bone) {
          child.getWorldPosition(worldPos)
          boneBox.expandByPoint(worldPos)
        }
      })
    }

    const boneSize = new THREE.Vector3()
    boneBox.getSize(boneSize)
    const useBones = boneCount > 0 && Math.max(boneSize.x, boneSize.y, boneSize.z) > 0.01

    const box = useBones ? boneBox : new THREE.Box3().setFromObject(root)
    const size = new THREE.Vector3()
    box.getSize(size)
    const center = new THREE.Vector3()
    box.getCenter(center)

    modelHeight = size.y > 0.001 ? size.y : 1

    hasSkin.value = (meshCount + skinnedCount) > 0
    debugInfo.value = `网格: ${meshCount + skinnedCount} | 顶点: ${vertexCount} | 骨骼: ${boneCount}`

    modelRoot = root
    modelGroup = new THREE.Group()
    modelGroup.add(root)

    if (Math.max(size.x, size.y, size.z) > 0.0001) {
      root.position.set(
        root.position.x - center.x,
        root.position.y - box.min.y,
        root.position.z - center.z,
      )
    }

    modelGroup.rotation.y = THREE.MathUtils.degToRad(props.yAngle)
    scene!.add(modelGroup)

    skeletonHelper = new THREE.SkeletonHelper(root)
    skeletonHelper.visible = !showSkin.value && !isOrthoMode.value
    scene!.add(skeletonHelper)

    if (gridHelper && scene) scene.remove(gridHelper)
    if (axesHelper && scene) scene.remove(axesHelper)
    const h = modelHeight
    gridHelper = new THREE.GridHelper(h * 3, 20, 0x444444, 0x333333)
    scene!.add(gridHelper)
    axesHelper = new THREE.AxesHelper(h * 0.3)
    axesHelper.visible = showAxes.value
    scene!.add(axesHelper)

    fitToView()
    applySkinVisibility()

    const clips = root.animations?.length
      ? root.animations
      : (parsed as any).animations ?? []

    if (clips.length > 0) {
      mixer = new THREE.AnimationMixer(root)
      const action = mixer.clipAction(clips[0])
      action.play()
      activeAction = action
      clipDuration = clips[0].duration
      updateTimeScale()
    }
  } catch (e: any) {
    loading.value = false
    errorMsg.value = `解析失败: ${(e as Error).message}`
    console.error('[MeshPreview] Parse error:', e)
  }
}

function applySkinVisibility() {
  const visible = hasSkin.value && showSkin.value
  for (const obj of meshObjects) {
    obj.visible = visible
  }
  if (skeletonHelper) {
    skeletonHelper.visible = !visible && !isOrthoMode.value
  }
}

function getBoneFrameData(): FrameData | null {
  if (!modelRoot) return null
  const frame: FrameData = new Map()
  const tmpVec = new THREE.Vector3()
  modelRoot.traverse((obj) => {
    if ((obj as THREE.Bone).isBone) {
      obj.getWorldPosition(tmpVec)
      frame.set(obj.name, [tmpVec.x, tmpVec.y, tmpVec.z])
    }
  })
  return frame.size > 0 ? frame : null
}

function projectOpenPoseFrame(frame: OpenPoseFrame, cam: THREE.Camera, w: number, h: number): OpenPoseFrame {
  const proj = (p: Vec3 | null): Vec3 | null => {
    if (!p) return null
    const v = new THREE.Vector3(p[0], p[1], p[2]).project(cam)
    return [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h, 0]
  }
  return {
    body: frame.body.map(proj),
    leftHand: frame.leftHand?.map(proj) ?? null,
    rightHand: frame.rightHand?.map(proj) ?? null,
    face: frame.face?.map(proj) ?? null,
  }
}

function drawPoseOverlay() {
  const overlay = poseOverlayRef.value
  if (!overlay || poseOpacity.value <= 0) {
    if (overlay) {
      const ctx = overlay.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height)
    }
    return
  }

  const el = containerRef.value
  const cam = activeCamera()
  if (!el || !cam) return

  const w = el.clientWidth
  const h = el.clientHeight
  if (overlay.width !== w) overlay.width = w
  if (overlay.height !== h) overlay.height = h

  const boneData = getBoneFrameData()
  if (!boneData) {
    const ctx = overlay.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, w, h)
    return
  }

  cam.updateMatrixWorld()
  const opFrame3D = mapFrameToOpenpose(boneData, props.drawHands, props.drawFace, props.faceScale)
  const opFrame2D = projectOpenPoseFrame(opFrame3D, cam, w, h)

  const mode = props.skeletonMode === 'raw' ? 'openpose' : props.skeletonMode
  const poseCanvas = renderOpFrame(mode, opFrame2D, w, h, {
    drawHands: props.drawHands,
    drawFace: props.drawFace,
    faceScale: props.faceScale,
    xinsrScaling: props.xinsrScaling,
  })

  const ctx = overlay.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, w, h)
  ctx.globalAlpha = poseOpacity.value
  ctx.drawImage(poseCanvas, 0, 0)
  ctx.globalAlpha = 1
}

function animate() {
  animId = requestAnimationFrame(animate)
  const cam = activeCamera()
  if (!renderer || !scene || !cam) return

  const now = performance.now()
  const delta = (now - lastTime) / 1000
  lastTime = now

  if (mixer && props.playing) {
    mixer.update(delta)
    if (inPlace.value && hipsRoot) {
      hipsRoot.position.x = 0
      hipsRoot.position.z = 0
    }
  }
  controls?.update()
  renderer.render(scene, cam)
  drawPoseOverlay()
}

function onResize() {
  const el = containerRef.value
  if (!el || !renderer) return
  const w = el.clientWidth
  const h = el.clientHeight
  if (w === 0 || h === 0) return

  if (perspCamera) {
    perspCamera.aspect = w / h
    perspCamera.updateProjectionMatrix()
  }
  if (orthoCamera) {
    const halfH = (orthoCamera.top - orthoCamera.bottom) / 2
    const aspect = w / h
    orthoCamera.left = -halfH * aspect
    orthoCamera.right = halfH * aspect
    orthoCamera.updateProjectionMatrix()
  }
  renderer.setSize(w, h)
}

let ro: ResizeObserver | null = null

onMounted(() => {
  initScene()
  animate()
  ro = new ResizeObserver(onResize)
  if (containerRef.value) ro.observe(containerRef.value)
  if (props.daeXml) loadFromXml(props.daeXml)
})

onUnmounted(() => {
  cancelAnimationFrame(animId)
  if (syncTimeout) { clearTimeout(syncTimeout); syncTimeout = null }
  ro?.disconnect()
  controls?.removeEventListener('change', updateViewAngle)
  controls?.removeEventListener('start', onOrbitStart)
  controls?.removeEventListener('end', onOrbitEnd)
  clearModel()
  controls?.dispose()
  renderer?.dispose()
  perspCamera = null
  orthoCamera = null
  if (renderer && containerRef.value?.contains(renderer.domElement)) {
    containerRef.value.removeChild(renderer.domElement)
  }
})

watch(() => props.daeXml, (xml) => {
  if (xml) loadFromXml(xml)
  else clearModel()
})

watch(() => props.yAngle, (angle) => {
  if (syncTimeout) { clearTimeout(syncTimeout); syncTimeout = null }
  if (modelGroup) {
    modelGroup.rotation.y = THREE.MathUtils.degToRad(angle)
  }
  resetAzimuth()
  updateViewAngle()
})

watch(() => props.currentFrame, (frame) => {
  if (!props.playing) {
    seekToFrame(frame)
  }
})

watch(showSkin, applySkinVisibility)

watch(showAxes, (v) => {
  if (axesHelper) axesHelper.visible = v
})

watch(lockRotation, () => {
  applyRotationLock()
})

watch(() => props.fps, () => {
  updateTimeScale()
})

function switchCamera() {
  const cam = activeCamera()
  if (!cam || !controls || !renderer) return
  controls.object = cam
  controls.enableRotate = true
  controls.enablePan = true
  applyRotationLock()
  applySkinVisibility()
  fitToView()
}

watch(isOrthoMode, () => {
  switchCamera()
})

watch([() => props.skeletonMode, () => props.drawHands, () => props.drawFace, () => props.faceScale, () => props.xinsrScaling], () => {
  drawPoseOverlay()
})
</script>

<template>
  <div class="mesh-wrapper">
    <div ref="containerRef" class="mesh-viewport">
      <div v-if="loading" class="overlay">加载 3D 模型中...</div>
      <div v-if="errorMsg" class="overlay error">{{ errorMsg }}</div>
      <div v-if="!daeXml && !loading" class="overlay">加载带皮肤的 DAE/ZIP 以预览 3D 模型</div>
      <div v-if="debugInfo" class="info-badge">{{ debugInfo }}</div>

      <canvas ref="poseOverlayRef" class="pose-overlay" />

      <div v-if="daeXml" class="viewport-toolbar">
        <div
          class="tb-skin-group"
          @mouseenter="skinHover = true"
          @mouseleave="skinHover = false"
        >
          <button
            class="tb-btn" :class="{ active: showSkin, disabled: !hasSkin }"
            :disabled="!hasSkin"
            :title="hasSkin ? '显示/隐藏皮肤' : '当前文件无皮肤数据'"
            @click="hasSkin && (showSkin = !showSkin)"
          ><img :src="skinIcon" class="tb-icon" /></button>
          <transition name="slider-fade">
            <div v-if="skinHover && showSkin && hasSkin" class="tb-slider-popup">
              <input
                type="range"
                class="tb-h-slider"
                title="Pose 不透明度"
                min="0" max="100" step="1"
                :value="Math.round(poseOpacity * 100)"
                @input="poseOpacity = parseInt(($event.target as HTMLInputElement).value) / 100"
              />
              <span class="tb-slider-val">{{ Math.round(poseOpacity * 100) }}</span>
            </div>
          </transition>
        </div>

        <button
          class="tb-btn" :class="{ active: inPlace }"
          title="原地播放：固定角色位置不位移"
          @click="inPlace = !inPlace"
        ><img :src="inPlaceIcon" class="tb-icon" /></button>

        <button
          class="tb-btn" :class="{ active: lockRotation }"
          title="锁定垂直旋转：仅允许水平方向旋转相机，防止视角上下倾斜"
          @click="lockRotation = !lockRotation"
        ><img :src="lockIcon" class="tb-icon" /></button>

        <button
          class="tb-btn" :class="{ active: showAxes }"
          title="显示/隐藏坐标轴"
          @click="showAxes = !showAxes"
        ><img :src="axesIcon" class="tb-icon" /></button>

        <div class="tb-divider" />

        <button
          class="tb-btn"
          title="适应窗口：自动调整相机以显示完整模型"
          @click="fitToView"
        ><img :src="fitViewIcon" class="tb-icon" /></button>

        <button
          class="tb-btn"
          title="重置旋转：将相机恢复到水平视角"
          @click="resetRotation"
        ><img :src="resetIcon" class="tb-icon" /></button>

        <div class="tb-divider" />

        <button
          class="tb-btn"
          :class="{ disabled: !canUndo }"
          :disabled="!canUndo"
          title="撤销旋转 (Ctrl+Z)"
          @click="emit('undo')"
        ><img :src="undoIcon" class="tb-icon" /></button>

        <button
          class="tb-btn"
          :class="{ disabled: !canRedo }"
          :disabled="!canRedo"
          title="重做旋转 (Ctrl+Shift+Z)"
          @click="emit('redo')"
        ><img :src="redoIcon" class="tb-icon" /></button>

        <div class="tb-divider" />

        <span class="tb-angle">{{ viewAngle }}°</span>
      </div>

      <div v-if="daeXml && frameCount > 0" class="playback-bar">
        <button class="pb-btn" title="上一帧" @click="emit('prevFrame')">
          <img :src="prevFrameIcon" class="pb-icon" />
        </button>
        <button class="pb-btn" :title="playing ? '停止' : '播放'" @click="emit('togglePlay')">
          <img :src="playing ? stopIcon : playIcon" class="pb-icon pb-play" />
        </button>
        <button class="pb-btn" title="下一帧" @click="emit('nextFrame')">
          <img :src="nextFrameIcon" class="pb-icon" />
        </button>

        <span class="pb-frame">{{ currentFrame + 1 }}<span class="pb-sep">/</span>{{ frameCount }}</span>

        <input
          type="range"
          class="pb-slider"
          :min="0"
          :max="Math.max(0, frameCount - 1)"
          :value="currentFrame"
          @input="onSeek"
        />

        <span class="pb-fps-label">FPS</span>
        <input
          type="number"
          class="pb-fps"
          :value="fps"
          min="1"
          max="160"
          @input="onFpsInput"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mesh-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.mesh-viewport {
  position: relative;
  flex: 1;
  min-height: 200px;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
}
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  opacity: 0.6;
  font-size: 14px;
  pointer-events: none;
  z-index: 1;
}
.overlay.error {
  color: #ff6b6b;
  opacity: 1;
}
.info-badge {
  position: absolute;
  bottom: 46px;
  right: 8px;
  padding: 3px 8px;
  font-size: 10px;
  color: var(--text-primary);
  background: rgba(0, 0, 0, 0.55);
  border-radius: 4px;
  pointer-events: none;
  user-select: none;
  opacity: 0.7;
}

.viewport-toolbar {
  position: absolute;
  left: 8px;
  bottom: 42px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 6px;
  backdrop-filter: blur(6px);
  z-index: 2;
}

.tb-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s, opacity 0.15s;
  opacity: 0.55;
}
.tb-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  opacity: 1;
}
.tb-btn.active {
  background: rgba(100, 160, 255, 0.25);
  opacity: 1;
}
.tb-btn.active:hover {
  background: rgba(100, 160, 255, 0.35);
}
.tb-btn.disabled {
  opacity: 0.25;
  cursor: not-allowed;
}
.tb-btn.disabled:hover {
  background: transparent;
  opacity: 0.25;
}

.tb-icon {
  width: 18px;
  height: 18px;
  filter: brightness(0) invert(1);
  pointer-events: none;
}

.tb-divider {
  width: 20px;
  height: 1px;
  background: rgba(255, 255, 255, 0.15);
  margin: 2px auto;
}

.tb-skin-group {
  position: relative;
}

.tb-slider-popup {
  position: absolute;
  left: 100%;
  top: 0;
  margin-left: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.75);
  border-radius: 4px;
  backdrop-filter: blur(6px);
  white-space: nowrap;
}

.tb-h-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 80px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.tb-h-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  cursor: pointer;
}
.tb-h-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  cursor: pointer;
}

.tb-slider-val {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  min-width: 20px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.slider-fade-enter-active,
.slider-fade-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.slider-fade-enter-from,
.slider-fade-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}

.pose-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.tb-angle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.6);
  user-select: none;
  white-space: nowrap;
}

/* Playback bar at viewport bottom */
.playback-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
  z-index: 3;
  height: 34px;
}

.pb-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  padding: 0;
  opacity: 0.7;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.pb-btn:hover { opacity: 1; }

.pb-icon {
  width: 14px;
  height: 14px;
  filter: brightness(0) invert(1);
  pointer-events: none;
}
.pb-play {
  width: 18px;
  height: 18px;
}

.pb-frame {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  min-width: 52px;
  text-align: center;
  flex-shrink: 0;
}
.pb-sep { opacity: 0.4; margin: 0 1px; }

.pb-slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  min-width: 60px;
}
.pb-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
}
.pb-slider::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
}

.pb-fps-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}
.pb-fps {
  width: 40px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 11px;
  padding: 1px 4px;
  text-align: center;
  flex-shrink: 0;
}
.pb-fps:focus {
  outline: none;
  border-color: rgba(100, 160, 255, 0.5);
}
</style>

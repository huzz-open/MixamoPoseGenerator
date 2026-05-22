import * as THREE from 'three'
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js'

export interface SkinRenderResult {
  name: string
  frames: HTMLCanvasElement[]
}

/**
 * Off-screen Three.js renderer that produces skin-only frames (no skeleton)
 * with transparent backgrounds for sprite sheet composition.
 */
export async function renderSkinFrames(
  daeXml: string,
  directions: { name: string; angle: number }[],
  frameCount: number,
  width: number,
  height: number,
  onProgress?: (current: number, total: number, dir: string) => void,
): Promise<SkinRenderResult[]> {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  })
  renderer.setSize(width, height)
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()

  scene.add(new THREE.AmbientLight(0xffffff, 1.2))
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
  dirLight.position.set(2, 4, 3)
  scene.add(dirLight)
  const backLight = new THREE.DirectionalLight(0xffffff, 0.5)
  backLight.position.set(-2, 2, -3)
  scene.add(backLight)

  const loader = new ColladaLoader()
  const parsed = loader.parse(daeXml, '')
  const root = parsed.scene

  let hipsRoot: THREE.Bone | null = null

  root.traverse((child) => {
    if (child instanceof THREE.SkinnedMesh || child instanceof THREE.Mesh) {
      child.frustumCulled = false
    }
    if (child instanceof THREE.Bone && !hipsRoot) {
      if (child.name === 'mixamorig_Hips' || child.name.includes('Hips')) {
        hipsRoot = child
      }
    }
  })

  root.updateWorldMatrix(true, true)

  const worldPos = new THREE.Vector3()
  const boneBox = new THREE.Box3()
  let boneCount = 0
  root.traverse((child) => {
    if (child instanceof THREE.Bone) {
      boneCount++
      child.getWorldPosition(worldPos)
      boneBox.expandByPoint(worldPos)
    }
  })

  const boneSize = new THREE.Vector3()
  boneBox.getSize(boneSize)
  const useBones = boneCount > 0 && Math.max(boneSize.x, boneSize.y, boneSize.z) > 0.01
  const box = useBones ? boneBox : new THREE.Box3().setFromObject(root)
  const size = new THREE.Vector3()
  box.getSize(size)
  const center = new THREE.Vector3()
  box.getCenter(center)
  const modelHeight = size.y > 0.001 ? size.y : 1

  root.position.set(
    root.position.x - center.x,
    root.position.y - box.min.y,
    root.position.z - center.z,
  )

  const modelGroup = new THREE.Group()
  modelGroup.add(root)
  scene.add(modelGroup)

  const clips = root.animations?.length
    ? root.animations
    : (parsed as any).animations ?? []

  let mixer: THREE.AnimationMixer | null = null
  let activeAction: THREE.AnimationAction | null = null
  let clipDuration = 0
  if (clips.length > 0) {
    mixer = new THREE.AnimationMixer(root)
    activeAction = mixer.clipAction(clips[0])
    activeAction.play()
    clipDuration = clips[0].duration
  }

  const aspect = width / height
  const halfH = modelHeight * 0.55
  const camera = new THREE.OrthographicCamera(
    -halfH * aspect, halfH * aspect,
    halfH, -halfH,
    0.001, modelHeight * 200,
  )
  camera.position.set(0, modelHeight * 0.5, modelHeight * 2)
  camera.lookAt(0, modelHeight * 0.5, 0)
  camera.updateProjectionMatrix()

  const results: SkinRenderResult[] = []
  const totalFrames = directions.length * frameCount
  let doneFrames = 0

  for (const dir of directions) {
    modelGroup.rotation.y = THREE.MathUtils.degToRad(dir.angle)

    const frames: HTMLCanvasElement[] = []
    for (let f = 0; f < frameCount; f++) {
      if (mixer && activeAction && clipDuration > 0 && frameCount > 0) {
        const t = (f / frameCount) * clipDuration
        activeAction.time = t
        mixer.update(0)
        if (hipsRoot) {
          hipsRoot.position.x = 0
          hipsRoot.position.z = 0
        }
      }

      renderer.clear()
      renderer.render(scene, camera)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(renderer.domElement, 0, 0)
      frames.push(canvas)

      doneFrames++
      if (doneFrames % 3 === 0) {
        onProgress?.(doneFrames, totalFrames, dir.name)
        await new Promise(r => setTimeout(r, 0))
      }
    }

    results.push({ name: dir.name, frames })
  }

  renderer.dispose()
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose()
      if (Array.isArray(child.material)) {
        child.material.forEach((m: THREE.Material) => m.dispose())
      } else {
        child.material?.dispose()
      }
    }
  })

  return results
}

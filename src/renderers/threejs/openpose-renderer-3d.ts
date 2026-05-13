import * as THREE from 'three'
import type { OpenPoseFrame, Vec3 } from '../../types/pose'

type Color3 = [number, number, number]

const LIMB_SEQ: [number, number][] = [
  [2, 3], [2, 6], [3, 4], [4, 5],
  [6, 7], [7, 8], [2, 9], [9, 10],
  [10, 11], [2, 12], [12, 13], [13, 14],
  [2, 1], [1, 15], [15, 17], [1, 16],
  [16, 18],
]

const COLORS: Color3[] = [
  [255, 0, 0], [255, 85, 0], [255, 170, 0], [255, 255, 0],
  [170, 255, 0], [85, 255, 0], [0, 255, 0], [0, 255, 85],
  [0, 255, 170], [0, 255, 255], [0, 170, 255], [0, 85, 255],
  [0, 0, 255], [85, 0, 255], [170, 0, 255], [255, 0, 255],
  [255, 0, 170], [255, 0, 85],
]

const HAND_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
]

function toHex([r, g, b]: Color3): number {
  return (r << 16) | (g << 8) | b
}

function hsvToRgb(h: number, s: number, v: number): Color3 {
  let r = 0, g = 0, b = 0
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

const _unitX = new THREE.Vector3(1, 0, 0)
const _dir = new THREE.Vector3()
const _mid = new THREE.Vector3()
const _quat = new THREE.Quaternion()

/**
 * Reusable Three.js scene for rendering OpenPose skeletons.
 * Mirrors the open-pose-editor approach: 3D sphere joints + stretched-sphere bones.
 * A single WebGLRenderer is shared across all frames to avoid context leaks.
 */
export class OpenposeScene {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.OrthographicCamera

  private jointSphereGeo: THREE.SphereGeometry
  private boneSphereGeo: THREE.SphereGeometry

  private jointMeshes: THREE.Mesh[] = []
  private jointMaterials: THREE.MeshBasicMaterial[] = []

  private boneMeshes: THREE.Mesh[] = []
  private boneMaterials: THREE.MeshBasicMaterial[] = []

  private handJointMeshes: THREE.Mesh[][] = [[], []]
  private handJointMat: THREE.MeshBasicMaterial
  private handBoneMeshes: THREE.Mesh[][] = [[], []]
  private handBoneMats: THREE.MeshBasicMaterial[][] = [[], []]

  private facePointMeshes: THREE.Mesh[] = []
  private facePointMat: THREE.MeshBasicMaterial

  private outputCanvas: HTMLCanvasElement

  private currentWidth = 0
  private currentHeight = 0

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    this.renderer.setClearColor(0x000000, 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(0, 1, 0, 1, -10000, 10000)
    this.camera.position.set(0, 0, 100)
    this.camera.lookAt(0, 0, 0)

    this.jointSphereGeo = new THREE.SphereGeometry(1, 12, 8)
    this.boneSphereGeo = new THREE.SphereGeometry(1, 10, 6)

    this.outputCanvas = document.createElement('canvas')

    for (let i = 0; i < 18; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: toHex(COLORS[i]) })
      const mesh = new THREE.Mesh(this.jointSphereGeo, mat)
      mesh.visible = false
      this.scene.add(mesh)
      this.jointMeshes.push(mesh)
      this.jointMaterials.push(mat)
    }

    for (let i = 0; i < LIMB_SEQ.length; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: toHex(COLORS[i]),
        transparent: true,
        opacity: 0.6,
      })
      const mesh = new THREE.Mesh(this.boneSphereGeo, mat)
      mesh.visible = false
      this.scene.add(mesh)
      this.boneMeshes.push(mesh)
      this.boneMaterials.push(mat)
    }

    this.handJointMat = new THREE.MeshBasicMaterial({ color: 0x0000ff })
    this.facePointMat = new THREE.MeshBasicMaterial({ color: 0xffffff })

    for (let h = 0; h < 2; h++) {
      for (let j = 0; j < 21; j++) {
        const mesh = new THREE.Mesh(this.jointSphereGeo, this.handJointMat)
        mesh.visible = false
        this.scene.add(mesh)
        this.handJointMeshes[h].push(mesh)
      }
      for (let e = 0; e < HAND_EDGES.length; e++) {
        const color = hsvToRgb(e / HAND_EDGES.length, 1.0, 1.0)
        const mat = new THREE.MeshBasicMaterial({ color: toHex(color) })
        const mesh = new THREE.Mesh(this.boneSphereGeo, mat)
        mesh.visible = false
        this.scene.add(mesh)
        this.handBoneMeshes[h].push(mesh)
        this.handBoneMats[h].push(mat)
      }
    }

    for (let i = 0; i < 68; i++) {
      const mesh = new THREE.Mesh(this.jointSphereGeo, this.facePointMat)
      mesh.visible = false
      this.scene.add(mesh)
      this.facePointMeshes.push(mesh)
    }
  }

  private updateCamera(w: number, h: number) {
    this.camera.left = 0
    this.camera.right = w
    this.camera.top = 0
    this.camera.bottom = h
    this.camera.updateProjectionMatrix()
  }

  private positionBone(mesh: THREE.Mesh, p1: Vec3, p2: Vec3, thickness: number) {
    _mid.set((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2)
    _dir.set(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2])
    const len = _dir.length()
    if (len < 0.5) {
      mesh.visible = false
      return
    }
    _dir.normalize()
    _quat.setFromUnitVectors(_unitX, _dir)

    mesh.position.copy(_mid)
    mesh.quaternion.copy(_quat)
    mesh.scale.set(len / 2, thickness, thickness)
    mesh.visible = true
  }

  renderFrame(
    frame: OpenPoseFrame,
    width: number,
    height: number,
    drawHands: boolean,
    drawFace: boolean = true,
    xinsrScaling: boolean = false,
  ): HTMLCanvasElement {
    if (width !== this.currentWidth || height !== this.currentHeight) {
      this.renderer.setSize(width, height)
      this.currentWidth = width
      this.currentHeight = height
    }
    this.updateCamera(width, height)

    const maxSide = Math.max(width, height)
    let stickScale = 1
    if (xinsrScaling) {
      stickScale = maxSide < 500 ? 1 : Math.min(2 + Math.floor(maxSide / 1000), 7)
    }
    const boneThickness = 4 * stickScale
    const jointRadius = 4 * stickScale

    for (let i = 0; i < 18; i++) {
      const kp = frame.body[i]
      const mesh = this.jointMeshes[i]
      if (kp) {
        mesh.position.set(kp[0], kp[1], kp[2])
        mesh.scale.setScalar(jointRadius)
        mesh.visible = true
      } else {
        mesh.visible = false
      }
    }

    for (let i = 0; i < LIMB_SEQ.length; i++) {
      const [k1, k2] = LIMB_SEQ[i]
      const p1 = frame.body[k1 - 1]
      const p2 = frame.body[k2 - 1]
      const mesh = this.boneMeshes[i]
      if (p1 && p2) {
        this.positionBone(mesh, p1, p2, boneThickness)
      } else {
        mesh.visible = false
      }
    }

    const hands = [frame.leftHand, frame.rightHand]
    for (let h = 0; h < 2; h++) {
      const hand = drawHands ? hands[h] : null
      for (let j = 0; j < 21; j++) {
        const mesh = this.handJointMeshes[h][j]
        const kp = hand?.[j]
        if (kp && kp[0] > 0 && kp[1] > 0) {
          mesh.position.set(kp[0], kp[1], kp[2])
          mesh.scale.setScalar(4)
          mesh.visible = true
        } else {
          mesh.visible = false
        }
      }
      for (let e = 0; e < HAND_EDGES.length; e++) {
        const mesh = this.handBoneMeshes[h][e]
        if (!hand) { mesh.visible = false; continue }
        const [e1, e2] = HAND_EDGES[e]
        const k1 = hand[e1], k2 = hand[e2]
        if (k1 && k2 && k1[0] > 0 && k1[1] > 0 && k2[0] > 0 && k2[1] > 0) {
          this.positionBone(mesh, k1, k2, 2)
        } else {
          mesh.visible = false
        }
      }
    }

    for (let i = 0; i < 68; i++) {
      const mesh = this.facePointMeshes[i]
      const kp = (drawFace && frame.face) ? frame.face[i] : null
      if (kp && kp[0] > 0.01 && kp[1] > 0.01) {
        mesh.position.set(kp[0], kp[1], kp[2])
        mesh.scale.setScalar(3)
        mesh.visible = true
      } else {
        mesh.visible = false
      }
    }

    this.renderer.render(this.scene, this.camera)

    const out = this.outputCanvas
    if (out.width !== width || out.height !== height) {
      out.width = width
      out.height = height
    }
    const ctx = out.getContext('2d')!
    ctx.drawImage(this.renderer.domElement, 0, 0)
    return out
  }

  dispose() {
    this.jointSphereGeo.dispose()
    this.boneSphereGeo.dispose()
    for (const m of this.jointMaterials) m.dispose()
    for (const m of this.boneMaterials) m.dispose()
    this.handJointMat.dispose()
    this.facePointMat.dispose()
    for (const arr of this.handBoneMats) for (const m of arr) m.dispose()
    this.renderer.dispose()
  }
}

let sharedScene: OpenposeScene | null = null

export function getOpenposeScene(): OpenposeScene {
  if (!sharedScene) {
    sharedScene = new OpenposeScene()
  }
  return sharedScene
}

export function disposeOpenposeScene() {
  if (sharedScene) {
    sharedScene.dispose()
    sharedScene = null
  }
}

export function renderOpenposeFrame3D(
  frame: OpenPoseFrame,
  width: number,
  height: number,
  drawHands: boolean,
  drawFace: boolean = true,
  xinsrScaling: boolean = false,
): HTMLCanvasElement {
  const scene = getOpenposeScene()
  const src = scene.renderFrame(frame, width, height, drawHands, drawFace, xinsrScaling)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(src, 0, 0)
  return canvas
}

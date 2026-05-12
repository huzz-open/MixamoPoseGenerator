import JSZip from 'jszip'
import type { Bone, ParseResult, Vec3 } from '../types/pose'

const COLLADA_NS = 'http://www.collada.org/2005/11/COLLADASchema'

interface AnimEntry {
  times: number[]
  matrices: Float64Array[]
}

function getByTag(parent: Element, tag: string): Element[] {
  return Array.from(parent.getElementsByTagNameNS(COLLADA_NS, tag))
}

function getFirstByTag(parent: Element, tag: string): Element | null {
  const nodes = parent.getElementsByTagNameNS(COLLADA_NS, tag)
  return nodes.length > 0 ? nodes[0] : null
}

function directChildrenByTag(parent: Element, tag: string): Element[] {
  return getByTag(parent, tag).filter(n => n.parentElement === parent)
}

function parseFloatArray(text: string): number[] {
  return text.trim().split(/\s+/).map(Number)
}

/** Row-major 4x4 matrix multiply: out = a * b */
function mat4Mul(a: Float64Array, b: Float64Array, out: Float64Array): Float64Array {
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      let sum = 0
      for (let k = 0; k < 4; k++) {
        sum += a[row * 4 + k] * b[k * 4 + col]
      }
      out[row * 4 + col] = sum
    }
  }
  return out
}

function identityMat4(): Float64Array {
  const m = new Float64Array(16)
  m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1
  return m
}

function parseAnimationData(root: Element): Map<string, AnimEntry> {
  const animData = new Map<string, AnimEntry>()
  const libAnims = getFirstByTag(root, 'library_animations')
  if (!libAnims) return animData

  for (const anim of directChildrenByTag(libAnims, 'animation')) {
    const animId = anim.getAttribute('id')
    if (!animId) continue
    const targetId = animId.split('-')[0]

    const inputSourceId = `${targetId}-Matrix-animation-input`
    const outputSourceId = `${targetId}-Matrix-animation-output-transform`

    const sources = getByTag(anim, 'source')
    let timesEl: Element | null = null
    let transformsEl: Element | null = null

    for (const src of sources) {
      const srcId = src.getAttribute('id')
      if (srcId === inputSourceId) {
        timesEl = getFirstByTag(src, 'float_array')
      } else if (srcId === outputSourceId) {
        transformsEl = getFirstByTag(src, 'float_array')
      }
    }

    if (!timesEl?.textContent || !transformsEl?.textContent) continue

    const times = parseFloatArray(timesEl.textContent)
    const raw = parseFloatArray(transformsEl.textContent)

    const matrices: Float64Array[] = []
    for (let i = 0; i < raw.length; i += 16) {
      matrices.push(new Float64Array(raw.slice(i, i + 16)))
    }

    animData.set(targetId, { times, matrices })
  }

  return animData
}

function findHipsNode(visualScene: Element): Element | null {
  return getByTag(visualScene, 'node').find(
    n => n.getAttribute('id') === 'mixamorig_Hips'
  ) ?? null
}

export function parseDae(xmlContent: string): ParseResult {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlContent, 'text/xml')
  const root = doc.documentElement

  if (root.tagName === 'parsererror' || root.querySelector('parsererror')) {
    throw new Error('无效的文件：内容不是有效的 XML/DAE 格式')
  }

  const visualScene = getByTag(root, 'visual_scene')[0]
  const animData = parseAnimationData(root)

  if (!visualScene || animData.size === 0) {
    throw new Error('无效的 DAE 文件：未找到场景或动画数据')
  }

  const firstEntry = animData.values().next().value as AnimEntry
  const numFrames = firstEntry.times.length

  const framesDict: Map<string, Vec3>[] = Array.from({ length: numFrames }, () => new Map())
  const bones: Bone[] = []
  let bonesCollected = false

  function parseJoint(
    node: Element,
    parentXform: Float64Array,
    timeIdx: number,
    parentName: string | null,
  ) {
    const jointName = node.getAttribute('id') || node.getAttribute('sid')
    if (!jointName || !jointName.startsWith('mixamorig_')) {
      for (const child of directChildrenByTag(node, 'node')) {
        parseJoint(child, parentXform, timeIdx, parentName)
      }
      return
    }

    let localXform: Float64Array
    const entry = animData.get(jointName)
    if (entry) {
      localXform = entry.matrices[timeIdx]
    } else {
      const matEl = Array.from(node.children).find(
        c => c.localName === 'matrix' && c.namespaceURI === COLLADA_NS
      )
      if (!matEl?.textContent) {
        for (const child of directChildrenByTag(node, 'node')) {
          parseJoint(child, parentXform, timeIdx, parentName)
        }
        return
      }
      localXform = new Float64Array(parseFloatArray(matEl.textContent))
    }

    const worldXform = mat4Mul(parentXform, localXform, new Float64Array(16))

    // Row-major: T[row][col] at index row*4+col
    // Translation column: T[0,3]=3, T[1,3]=7, T[2,3]=11
    framesDict[timeIdx].set(jointName, [
      worldXform[3],
      -worldXform[7],
      worldXform[11],
    ])

    if (!bonesCollected && parentName !== null) {
      bones.push([parentName, jointName])
    }

    for (const child of directChildrenByTag(node, 'node')) {
      parseJoint(child, worldXform, timeIdx, jointName)
    }
  }

  const identity = identityMat4()
  for (let t = 0; t < numFrames; t++) {
    const hipsNode = findHipsNode(visualScene)
    if (!hipsNode) throw new Error('无效的 DAE 文件：未找到 Mixamo 骨骼节点 (mixamorig_Hips)')
    parseJoint(hipsNode, identity, t, null)
    bonesCollected = true
  }

  let fps: number | null = null
  const times = firstEntry.times
  if (times.length >= 2) {
    const duration = times[times.length - 1] - times[0]
    if (duration > 0) {
      fps = Math.round((times.length - 1) / duration)
    }
  }

  return { frames: framesDict, bones, frameCount: numFrames, fps }
}

export async function parseDaeOrZip(file: File): Promise<ParseResult> {
  if (file.name.toLowerCase().endsWith('.zip')) {
    let zip: JSZip
    try {
      zip = await JSZip.loadAsync(file)
    } catch {
      throw new Error('无效的 ZIP 文件：无法解压')
    }
    const daeFile = Object.keys(zip.files).find(n => n.toLowerCase().endsWith('.dae'))
    if (!daeFile) throw new Error('ZIP 中未找到 DAE 文件')
    const content = await zip.files[daeFile].async('string')
    return parseDae(content)
  }
  const content = await file.text()
  return parseDae(content)
}

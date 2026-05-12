import { createProgram, createFBO } from './gl-utils'
import capsuleVert from './shaders/capsule.vert?raw'
import capsuleFrag from './shaders/capsule.frag?raw'
import circleVert from './shaders/circle.vert?raw'
import circleFrag from './shaders/circle.frag?raw'
import type { Color } from '../render-utils'

interface LimbData {
  x1: number; y1: number
  x2: number; y2: number
  thickness: number
  color: Color
}

interface CircleData {
  x: number; y: number
  radius: number
  color: Color
}

/**
 * WebGL batch renderer for GPU-accelerated pose rendering.
 * Uses instanced rendering to draw all limbs and joints in minimal draw calls.
 */
export class GLPoseRenderer {
  private gl: WebGL2RenderingContext
  private capsuleProgram: WebGLProgram
  private circleProgram: WebGLProgram
  private quadVBO: WebGLBuffer
  private width: number
  private height: number
  private fbo: WebGLFramebuffer
  private fboTexture: WebGLTexture

  constructor(width: number, height: number) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    })
    if (!gl) throw new Error('WebGL2 not supported')

    this.gl = gl
    this.width = width
    this.height = height
    this.capsuleProgram = createProgram(gl, capsuleVert, capsuleFrag)
    this.circleProgram = createProgram(gl, circleVert, circleFrag)

    // Unit quad: two triangles covering [-1, 1]
    const quadData = new Float32Array([
      -1, -1, 1, -1, 1, 1,
      -1, -1, 1, 1, -1, 1,
    ])
    this.quadVBO = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO)
    gl.bufferData(gl.ARRAY_BUFFER, quadData, gl.STATIC_DRAW)

    const { fbo, texture } = createFBO(gl, width, height)
    this.fbo = fbo
    this.fboTexture = texture

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  }

  resize(width: number, height: number) {
    this.width = width
    this.height = height
    this.gl.canvas.width = width
    this.gl.canvas.height = height

    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.fboTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
  }

  /**
   * Render limbs and joints to FBO and return pixel data.
   * darkenFactor: if > 0, darkens everything after limbs (for DWPose style).
   */
  renderFrame(
    limbs: LimbData[],
    joints: CircleData[],
    darkenFactor: number = 0,
  ): ImageData {
    const gl = this.gl
    const W = this.width, H = this.height

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
    gl.viewport(0, 0, W, H)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    // Draw capsules (limbs)
    if (limbs.length > 0) {
      gl.useProgram(this.capsuleProgram)
      gl.uniform2f(gl.getUniformLocation(this.capsuleProgram, 'uResolution'), W, H)

      const aQuadPos = gl.getAttribLocation(this.capsuleProgram, 'aQuadPos')
      const aP1 = gl.getAttribLocation(this.capsuleProgram, 'aP1')
      const aP2 = gl.getAttribLocation(this.capsuleProgram, 'aP2')
      const aThickness = gl.getAttribLocation(this.capsuleProgram, 'aThickness')
      const aColor = gl.getAttribLocation(this.capsuleProgram, 'aColor')

      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO)
      gl.enableVertexAttribArray(aQuadPos)
      gl.vertexAttribPointer(aQuadPos, 2, gl.FLOAT, false, 0, 0)

      for (const limb of limbs) {
        gl.vertexAttrib2f(aP1, limb.x1, limb.y1)
        gl.vertexAttrib2f(aP2, limb.x2, limb.y2)
        gl.vertexAttrib1f(aThickness, limb.thickness)
        gl.vertexAttrib3f(aColor, limb.color[0] / 255, limb.color[1] / 255, limb.color[2] / 255)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
      }
    }

    // DWPose: darken canvas after limbs
    if (darkenFactor > 0) {
      const pixels = new Uint8Array(W * H * 4)
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      const factor = 1 - darkenFactor
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = Math.round(pixels[i] * factor)
        pixels[i + 1] = Math.round(pixels[i + 1] * factor)
        pixels[i + 2] = Math.round(pixels[i + 2] * factor)
      }
      gl.bindTexture(gl.TEXTURE_2D, this.fboTexture)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    }

    // Draw circles (joints)
    if (joints.length > 0) {
      gl.useProgram(this.circleProgram)
      gl.uniform2f(gl.getUniformLocation(this.circleProgram, 'uResolution'), W, H)

      const aQuadPos = gl.getAttribLocation(this.circleProgram, 'aQuadPos')
      const aCenter = gl.getAttribLocation(this.circleProgram, 'aCenter')
      const aRadius = gl.getAttribLocation(this.circleProgram, 'aRadius')
      const aColor = gl.getAttribLocation(this.circleProgram, 'aColor')

      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO)
      gl.enableVertexAttribArray(aQuadPos)
      gl.vertexAttribPointer(aQuadPos, 2, gl.FLOAT, false, 0, 0)

      for (const joint of joints) {
        gl.vertexAttrib2f(aCenter, joint.x, joint.y)
        gl.vertexAttrib1f(aRadius, joint.radius)
        gl.vertexAttrib3f(aColor, joint.color[0] / 255, joint.color[1] / 255, joint.color[2] / 255)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
      }
    }

    // Read pixels (WebGL reads bottom-up, need to flip)
    const pixels = new Uint8Array(W * H * 4)
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

    // Flip vertically
    const flipped = new Uint8ClampedArray(W * H * 4)
    const rowBytes = W * 4
    for (let y = 0; y < H; y++) {
      const srcOffset = (H - 1 - y) * rowBytes
      const dstOffset = y * rowBytes
      flipped.set(pixels.subarray(srcOffset, srcOffset + rowBytes), dstOffset)
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return new ImageData(flipped, W, H)
  }

  destroy() {
    const gl = this.gl
    gl.deleteProgram(this.capsuleProgram)
    gl.deleteProgram(this.circleProgram)
    gl.deleteBuffer(this.quadVBO)
    gl.deleteFramebuffer(this.fbo)
    gl.deleteTexture(this.fboTexture)
  }
}

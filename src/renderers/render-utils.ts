export type Color = [number, number, number]

/**
 * Port of cv2.ellipse2Poly: generates polygon points for a rotated ellipse.
 * Returns array of [x, y] pairs forming a closed polygon.
 */
export function ellipse2Poly(
  center: [number, number],
  axes: [number, number],
  angleDeg: number,
  arcStart: number,
  arcEnd: number,
  delta: number,
): [number, number][] {
  const points: [number, number][] = []
  const angleRad = (angleDeg * Math.PI) / 180
  const cosA = Math.cos(angleRad)
  const sinA = Math.sin(angleRad)

  for (let t = arcStart; t <= arcEnd; t += delta) {
    const tRad = (t * Math.PI) / 180
    const px = axes[0] * Math.cos(tRad)
    const py = axes[1] * Math.sin(tRad)
    const rx = cosA * px - sinA * py + center[0]
    const ry = sinA * px + cosA * py + center[1]
    points.push([Math.round(rx), Math.round(ry)])
  }

  return points
}

/**
 * Fill a convex polygon on canvas using Canvas 2D.
 */
export function fillConvexPoly(
  ctx: CanvasRenderingContext2D,
  points: [number, number][],
  color: Color,
) {
  if (points.length < 3) return
  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1])
  }
  ctx.closePath()
  ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`
  ctx.fill()
}

export function fillCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: Color,
) {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`
  ctx.fill()
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  color: Color,
  thickness: number,
) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.strokeStyle = `rgb(${color[0]},${color[1]},${color[2]})`
  ctx.lineWidth = thickness
  ctx.lineCap = 'round'
  ctx.stroke()
}

/** HSV to RGB. H in [0,1], S in [0,1], V in [0,1]. Returns [R,G,B] in [0,255]. */
export function hsvToRgb(h: number, s: number, v: number): Color {
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

export function createBlackCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
  return [canvas, ctx]
}

export function createOffscreenBlack(width: number, height: number): [OffscreenCanvas, OffscreenCanvasRenderingContext2D] {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
  return [canvas, ctx]
}

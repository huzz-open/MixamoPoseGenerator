attribute vec2 aQuadPos;    // unit quad: [-1, -1] to [1, 1]
attribute vec2 aP1;         // limb endpoint 1 (px)
attribute vec2 aP2;         // limb endpoint 2 (px)
attribute float aThickness; // half-width
attribute vec3 aColor;      // RGB [0,1]

uniform vec2 uResolution;

varying vec2 vLocalPos;
varying vec3 vColor;
varying float vHalfLen;
varying float vThickness;

void main() {
  vec2 dir = aP2 - aP1;
  float len = length(dir);
  vec2 tangent = len > 0.001 ? dir / len : vec2(1.0, 0.0);
  vec2 normal = vec2(-tangent.y, tangent.x);

  vec2 center = (aP1 + aP2) * 0.5;
  float halfLen = len * 0.5;

  vec2 localOffset = aQuadPos;
  vec2 worldPos = center
    + tangent * localOffset.x * (halfLen + aThickness)
    + normal * localOffset.y * aThickness;

  vec2 ndc = (worldPos / uResolution) * 2.0 - 1.0;
  ndc.y = -ndc.y;
  gl_Position = vec4(ndc, 0.0, 1.0);

  vLocalPos = vec2(localOffset.x * (halfLen + aThickness), localOffset.y * aThickness);
  vColor = aColor;
  vHalfLen = halfLen;
  vThickness = aThickness;
}

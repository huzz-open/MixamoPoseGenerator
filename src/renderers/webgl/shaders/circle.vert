attribute vec2 aQuadPos;   // [-1, 1] unit quad
attribute vec2 aCenter;    // circle center (px)
attribute float aRadius;   // circle radius (px)
attribute vec3 aColor;     // RGB [0,1]

uniform vec2 uResolution;

varying vec2 vLocalPos;
varying vec3 vColor;
varying float vRadius;

void main() {
  vec2 worldPos = aCenter + aQuadPos * aRadius;
  vec2 ndc = (worldPos / uResolution) * 2.0 - 1.0;
  ndc.y = -ndc.y;
  gl_Position = vec4(ndc, 0.0, 1.0);

  vLocalPos = aQuadPos * aRadius;
  vColor = aColor;
  vRadius = aRadius;
}

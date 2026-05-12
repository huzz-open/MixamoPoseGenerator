precision mediump float;

varying vec2 vLocalPos;
varying vec3 vColor;
varying float vHalfLen;
varying float vThickness;

void main() {
  // SDF for capsule: distance to line segment clamped to radius
  float dx = abs(vLocalPos.x) - vHalfLen;
  float clampedX = max(dx, 0.0);
  float dist = length(vec2(clampedX, vLocalPos.y));

  if (dist > vThickness) {
    discard;
  }

  // Slight edge softening
  float alpha = 1.0 - smoothstep(vThickness - 1.0, vThickness, dist);
  gl_FragColor = vec4(vColor * alpha, alpha);
}

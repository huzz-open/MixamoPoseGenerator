precision mediump float;

varying vec2 vLocalPos;
varying vec3 vColor;
varying float vRadius;

void main() {
  float dist = length(vLocalPos);
  if (dist > vRadius) {
    discard;
  }
  float alpha = 1.0 - smoothstep(vRadius - 1.0, vRadius, dist);
  gl_FragColor = vec4(vColor * alpha, alpha);
}

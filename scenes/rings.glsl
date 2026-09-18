// Interference rings. Params: speed, rings, wobble
uniform float speed;
uniform float rings;
uniform float wobble;

void main(){
  vec2 uv = vuv();
  float t = u_time*speed + u_seed;
  vec2 c1 = 0.35*vec2(cos(t*0.7), sin(t*0.9));
  vec2 c2 = 0.35*vec2(cos(t*0.5 + 2.0), sin(t*0.6 + 1.0));
  vec2 c3 = 0.25*vec2(cos(-t*0.8 + 4.0), sin(t*0.4 + 3.0));
  float w = 1.0 + wobble*sin(t*0.3 + uv.x*3.0);
  float a = sin(length(uv - c1)*rings*w*6.2831 - t*2.0);
  float b = sin(length(uv - c2)*rings*6.2831 + t*1.5);
  float c = sin(length(uv - c3)*rings*0.7*6.2831 - t*1.1);
  float s = (a + b + c) / 3.0;
  float band = smoothstep(0.2, 0.9, abs(s));
  vec3 col = mix(vec3(0.02, 0.05, 0.12), vec3(0.9, 0.55, 0.2), band);
  col += vec3(0.1, 0.4, 0.7) * smoothstep(0.7, 1.0, s);
  col *= 1.0 - 0.6*smoothstep(0.5, 1.1, length(uv));
  fragColor = vec4(col, 1.0);
}

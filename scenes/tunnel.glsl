// Polar tunnel with twist. Params: speed, twist, glow
uniform float speed;
uniform float twist;
uniform float glow;

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*u_resolution) / u_resolution.y;
  float t = u_time*speed + u_seed;
  float r = length(uv) + 1e-4;
  float a = atan(uv.y, uv.x) + twist*sin(t*0.5) / r;
  float depth = 0.5 / r + t;
  float ang = a * 8.0 / 6.2831;
  vec2 cell = vec2(fract(ang) - 0.5, fract(depth) - 0.5);
  float id = floor(ang) + 8.0*floor(depth);
  float pulse = 0.5 + 0.5*sin(id*1.7 + t*3.0);
  float d = max(abs(cell.x), abs(cell.y));
  float edge = smoothstep(0.5, 0.42, d);
  float line = smoothstep(0.5, 0.47, d) - smoothstep(0.47, 0.44, d);
  vec3 base = 0.5 + 0.5*cos(vec3(0.0, 2.0, 4.0) + id*0.4 + t);
  vec3 col = base * edge * pulse * 0.6 + vec3(1.0, 0.9, 0.7) * line * glow;
  col *= smoothstep(0.0, 0.25, r);
  col *= 1.0 - 0.5*smoothstep(0.6, 1.1, r);
  fragColor = vec4(col, 1.0);
}

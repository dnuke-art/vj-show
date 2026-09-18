// Domain-warped fbm. Params: speed, warp, hueShift
uniform float speed;
uniform float warp;
uniform float hueShift;

float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for(int i=0;i<5;i++){ v += a*noise(p); p = r*p*2.0 + 10.0; a *= 0.5; }
  return v;
}
vec3 pal(float t){ return 0.5 + 0.5*cos(6.2831*(t + hueShift + vec3(0.0, 0.33, 0.67))); }

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*u_resolution) / u_resolution.y;
  float t = u_time*speed + u_seed;
  vec2 q = vec2(fbm(uv + t*0.3), fbm(uv - t*0.2 + 4.0));
  vec2 r = vec2(fbm(uv + warp*q + vec2(1.7, 9.2) + t*0.15),
                fbm(uv + warp*q + vec2(8.3, 2.8) - t*0.12));
  float f = fbm(uv + warp*r);
  vec3 col = pal(f*1.4 + 0.1*length(q));
  col = mix(col, vec3(0.02, 0.02, 0.05), smoothstep(0.0, 0.9, length(uv)*0.8));
  fragColor = vec4(col*(0.6 + 0.8*f), 1.0);
}

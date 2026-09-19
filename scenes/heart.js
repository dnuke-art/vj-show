// scenes/heart.js — port of the TiXL "HeartScatter" graph (tixl-heart-project) to vj-show.
//
// TiXL graph:  LoadObj(heart, 0.003) → TransformMesh(y -0.31) → SplitMeshVertices(ShadeFlat 1.61)
//              → SelectVertices(noise volume centred on OscillateVec3) → ScatterMeshFaces(Shrink 2.27, Amount 0.5)
//              → DrawMesh + SetMaterial + PointLight + SetFog → OrbitCamera(110°, 2.5) → Glow
// Everything up to DrawMesh is one vertex shader here: each face carries its three source positions
// so the per-face selection average and centroid shrink can be computed per vertex. SSAO is not ported.
// Every value is a pure function of show time, so tiled/synced instances line up.

const SCALE = 0.003, TRANSLATE_Y = -0.30977243, SHADE_FLAT = 1.61;

const OBJ = `o heart
v 157.516159 56.020260 -171.704475
v 3.225194 -16.867310 -166.807213
v 3.225189 162.455620 -135.325081
v 180.334396 -34.734818 -133.365654
v 275.387665 141.898308 54.271614
v 235.193542 100.523602 134.197273
v 294.704987 31.168755 22.411316
v 162.670120 165.009705 140.274773
v 122.296951 237.581398 -38.898430
v 147.820389 158.809296 -146.987343
v 151.767349 220.748543 74.533989
v 3.225193 213.945000 51.407013
v 288.700562 90.081144 -59.069248
v 3.225211 -30.493019 159.126747
v 3.224907 -237.728966 -0.457878
v 185.369171 6.730309 156.145348
v 126.850990 81.480556 171.704475
v 219.078171 58.728626 -148.452385
v 218.667404 157.660255 -114.482277
v 224.259796 209.027382 -27.595676
v 256.901199 -28.292778 -74.686859
v -143.011154 63.546705 171.645622
v 258.277954 -31.270241 71.790253
v -143.981888 74.910258 -171.512444
v -142.775467 159.884590 -145.524971
v -225.645508 166.794800 -94.553795
v -139.657547 223.229469 -71.637070
v -190.810120 -17.484779 137.808083
v -122.425636 237.728966 13.700162
v -246.368225 148.398582 83.959755
v -294.704987 89.554321 -9.255988
v -264.267365 47.305853 91.655457
v -248.062347 -44.311295 51.999245
v -279.631134 13.638313 -40.843243
v -211.776642 69.875607 148.581642
v -152.786850 218.741249 77.180931
v -234.640778 -46.329842 -72.696693
v -165.591553 -7.949158 -153.294670
v -235.834152 68.132793 -134.760872
v -232.868362 197.119682 -0.079982
v -145.699036 158.560020 144.917274
vt 0.767244 0.617824
vt 0.505472 0.464524
vt 0.505472 0.841682
vt 0.805957 0.426944
vt 0.967226 0.798446
vt 0.899032 0.711425
vt 1.000000 0.565555
vt 0.775988 0.847054
vt 0.707490 0.999690
vt 0.750794 0.834013
vt 0.757490 0.964286
vt 0.505472 0.949977
vt 0.989813 0.689462
vt 0.505472 0.435866
vt 0.505471 0.000000
vt 0.814500 0.514155
vt 0.715217 0.671373
vt 0.871691 0.623520
vt 0.870994 0.831597
vt 0.880482 0.939634
vt 0.935862 0.440494
vt 0.257366 0.633654
vt 0.938197 0.434231
vt 0.255719 0.657554
vt 0.257765 0.836275
vt 0.117167 0.850809
vt 0.263055 0.969504
vt 0.176269 0.463225
vt 0.292291 1.000000
vt 0.082009 0.812117
vt 0.000000 0.688354
vt 0.051641 0.599495
vt 0.079134 0.406803
vt 0.025574 0.528685
vt 0.140697 0.646965
vt 0.240780 0.960064
vt 0.101906 0.402557
vt 0.219055 0.483281
vt 0.099881 0.643299
vt 0.104913 0.914589
vt 0.252805 0.833489
vn 0.037093 0.031441 -0.998817
vn 0.009252 -0.334279 -0.942429
vn -0.005504 0.622532 -0.782575
vn 0.258356 -0.579699 -0.772788
vn 0.799934 0.518064 0.302847
vn 0.678921 0.078227 0.730032
vn 0.975322 -0.133883 0.175562
vn 0.119835 0.608406 0.784527
vn -0.046990 0.962560 -0.266966
vn 0.148528 0.616777 -0.772997
vn 0.229220 0.905625 0.356793
vn 0.007928 0.944511 0.328384
vn 0.921045 0.193346 -0.338072
vn -0.006958 -0.460407 0.887680
vn 0.021476 -0.999656 0.015041
vn 0.285489 -0.510723 0.810962
vn 0.044404 0.305952 0.951011
vn 0.614921 -0.008745 -0.788541
vn 0.620909 0.478105 -0.621198
vn 0.570027 0.802357 -0.176895
vn 0.709394 -0.641154 -0.292714
vn -0.079075 -0.014140 0.996768
vn 0.663254 -0.662404 0.348304
vn -0.043240 0.104609 -0.993573
vn -0.184075 0.524468 -0.831294
vn -0.664755 0.554965 -0.500115
vn 0.006284 0.930651 -0.365855
vn -0.313626 -0.566959 0.761706
vn -0.076131 0.996824 0.023347
vn -0.718746 0.483147 0.499973
vn -0.984786 0.165181 -0.053966
vn -0.865827 -0.108620 0.488411
vn -0.706091 -0.668151 0.234541
vn -0.924439 -0.296907 -0.239289
vn -0.546633 0.124768 0.828025
vn -0.208363 0.854678 0.475510
vn -0.602221 -0.694101 -0.394403
vn -0.253077 -0.541627 -0.801619
vn -0.697952 0.027654 -0.715610
vn -0.630765 0.775917 -0.009443
vn -0.046086 0.587437 0.807956
f 1/1/1 2/2/2 3/3/3
f 4/4/4 2/2/2 1/1/1
f 5/5/5 6/6/6 7/7/7
f 8/8/8 6/6/6 5/5/5
f 3/3/3 9/9/9 10/10/10
f 11/11/11 12/12/12 8/8/8
f 9/9/9 12/12/12 11/11/11
f 13/13/13 5/5/5 7/7/7
f 14/14/14 15/15/15 16/16/16
f 9/9/9 3/3/3 12/12/12
f 14/14/14 16/16/16 17/17/17
f 1/1/1 3/3/3 10/10/10
f 18/18/18 10/10/10 19/19/19
f 13/13/13 19/19/19 20/20/20
f 8/8/8 12/12/12 17/17/17
f 4/4/4 15/15/15 2/2/2
f 11/11/11 8/8/8 5/5/5
f 18/18/18 19/19/19 13/13/13
f 13/13/13 21/21/21 18/18/18
f 7/7/7 21/21/21 13/13/13
f 21/21/21 4/4/4 18/18/18
f 10/10/10 9/9/9 20/20/20
f 17/17/17 22/22/22 14/14/14
f 20/20/20 11/11/11 5/5/5
f 18/18/18 1/1/1 10/10/10
f 6/6/6 23/23/23 7/7/7
f 13/13/13 20/20/20 5/5/5
f 9/9/9 11/11/11 20/20/20
f 19/19/19 10/10/10 20/20/20
f 4/4/4 1/1/1 18/18/18
f 21/21/21 15/15/15 4/4/4
f 6/6/6 17/17/17 16/16/16
f 16/16/16 15/15/15 23/23/23
f 6/6/6 16/16/16 23/23/23
f 23/23/23 21/21/21 7/7/7
f 23/23/23 15/15/15 21/21/21
f 8/8/8 17/17/17 6/6/6
f 3/3/3 24/24/24 25/25/25
f 25/25/25 26/26/26 27/27/27
f 28/28/28 14/14/14 22/22/22
f 29/29/29 12/12/12 27/27/27
f 30/30/30 31/31/31 32/32/32
f 33/33/33 31/31/31 34/34/34
f 35/35/35 30/30/30 32/32/32
f 12/12/12 29/29/29 36/36/36
f 15/15/15 37/37/37 38/38/38
f 24/24/24 39/39/39 25/25/25
f 3/3/3 27/27/27 12/12/12
f 2/2/2 24/24/24 3/3/3
f 2/2/2 38/38/38 24/24/24
f 26/26/26 31/31/31 40/40/40
f 14/14/14 28/28/28 15/15/15
f 22/22/22 35/35/35 28/28/28
f 29/29/29 40/40/40 36/36/36
f 39/39/39 31/31/31 26/26/26
f 33/33/33 34/34/34 37/37/37
f 22/22/22 17/17/17 41/41/41
f 41/41/41 30/30/30 35/35/35
f 12/12/12 36/36/36 41/41/41
f 15/15/15 33/33/33 37/37/37
f 38/38/38 37/37/37 39/39/39
f 26/26/26 40/40/40 27/27/27
f 39/39/39 26/26/26 25/25/25
f 38/38/38 39/39/39 24/24/24
f 40/40/40 29/29/29 27/27/27
f 34/34/34 31/31/31 39/39/39
f 40/40/40 31/31/31 30/30/30
f 28/28/28 32/32/32 33/33/33
f 41/41/41 36/36/36 30/30/30
f 28/28/28 33/33/33 15/15/15
f 15/15/15 38/38/38 2/2/2
f 37/37/37 34/34/34 39/39/39
f 27/27/27 3/3/3 25/25/25
f 12/12/12 41/41/41 17/17/17
f 35/35/35 32/32/32 28/28/28
f 41/41/41 35/35/35 22/22/22
f 36/36/36 40/40/40 30/30/30
f 32/32/32 31/31/31 33/33/33`;

const SNOISE = `
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

const MESH_VS = `#version 300 es
precision highp float;
in vec3 a_pos; in vec3 a_nrm; in vec3 a_p0; in vec3 a_p1; in vec3 a_p2;
uniform mat4 u_proj, u_view;
uniform vec3 u_center;
uniform float u_threshold, u_falloff, u_noiseScale, u_amount, u_shrink;
out vec3 v_pos; out vec3 v_nrm;
${SNOISE}
// HLSL smoothstep tolerates edge0 > edge1; GLSL's is undefined there, so spell it out.
float sstep(float e0, float e1, float x){ float t = clamp((x - e0) / (e1 - e0), 0.0, 1.0); return t*t*(3.0 - 2.0*t); }
// SelectVertices, VolumeShape=Noise, Mode=Override, ClampResult=true
float sel(vec3 p){ float n = snoise((p - u_center) * u_noiseScale); return clamp(sstep(u_threshold + u_falloff, u_threshold, n), 0.0, 1.0); }
void main(){
  // ScatterMeshFaces: influence = mean vertex selection of the face; Shrink pulls toward the centroid
  float infl = clamp((sel(a_p0) + sel(a_p1) + sel(a_p2)) / 3.0, 0.0, 1.0);
  vec3 c = (a_p0 + a_p1 + a_p2) / 3.0;
  float k = infl * u_shrink * u_amount;
  vec3 pos = a_pos + (c - a_pos) * k;
  vec3 fn = cross(a_p1 - a_p0, a_p2 - a_p0) * sign(1.0 - k);   // k>1 turns the face inside out
  vec3 n = mix(normalize(a_nrm), normalize(fn), clamp(infl * 10.0, 0.0, 1.0));
  v_pos = pos; v_nrm = normalize(n);
  gl_Position = u_proj * u_view * vec4(pos, 1.0);
}`;

const MESH_FS = `#version 300 es
precision highp float;
in vec3 v_pos; in vec3 v_nrm;
uniform vec3 u_eye, u_lightPos, u_lightColor, u_baseColor, u_fogColor;
uniform float u_lightIntensity, u_lightDecay, u_metal, u_rough, u_spec, u_ambient, u_envStreak, u_fogDistance;
out vec4 fragColor;
const float PI = 3.14159265;
// stand-in for SetEnvironment's blurred blob cubemap: dark with one soft bright band
vec3 env(vec3 d){
  float band = exp(-pow((d.y - 0.25) * 4.0, 2.0)) * smoothstep(-0.4, 0.5, d.z);
  return vec3(0.48) * (0.12 + u_envStreak * band);
}
void main(){
  vec3 n = normalize(gl_FrontFacing ? v_nrm : -v_nrm);
  vec3 v = normalize(u_eye - v_pos);
  vec3 l = u_lightPos - v_pos;
  float dist = length(l); l /= dist;
  vec3 h = normalize(l + v);
  float ndl = max(dot(n, l), 0.0), ndv = max(dot(n, v), 1e-4), ndh = max(dot(n, h), 0.0), vdh = max(dot(v, h), 0.0);
  float a = max(u_rough * u_rough, 0.002);
  float d = a*a / (PI * pow(ndh*ndh*(a*a - 1.0) + 1.0, 2.0));
  float kk = (u_rough + 1.0); kk = kk*kk / 8.0;
  float g = (ndv / (ndv*(1.0-kk) + kk)) * (ndl / (ndl*(1.0-kk) + kk));
  vec3 f0 = mix(vec3(0.04), u_baseColor, u_metal);
  vec3 f = f0 + (1.0 - f0) * pow(1.0 - vdh, 5.0);
  vec3 spec = d * g * f / max(4.0 * ndl * ndv, 1e-3) * u_spec;
  vec3 diff = (1.0 - f) * (1.0 - u_metal) * u_baseColor / PI;
  vec3 radiance = u_lightColor * u_lightIntensity / pow(max(dist, 0.1), u_lightDecay);
  vec3 col = (diff + spec) * radiance * ndl;
  vec3 r = reflect(-v, n);
  vec3 fr = f0 + (max(vec3(1.0 - u_rough), f0) - f0) * pow(1.0 - ndv, 5.0);
  col += env(r) * fr * (1.0 - u_rough * 0.5) + u_baseColor * (1.0 - u_metal) * env(n) * u_ambient;
  float fog = clamp(length(u_eye - v_pos) / u_fogDistance, 0.0, 1.0);
  col = mix(col, u_fogColor, fog);
  fragColor = vec4(col, 1.0);
}`;

const BG_FS = `#version 300 es
precision highp float;
uniform vec2 u_fullRes, u_tileOrigin, u_res;
uniform vec3 u_clear; uniform float u_bgGlow; uniform vec2 u_bgPos;
out vec4 fragColor;
void main(){
  vec2 uv = (gl_FragCoord.xy + u_tileOrigin - 0.5 * u_fullRes) / u_fullRes.y;
  vec2 d = (uv - u_bgPos) * vec2(1.0, 2.6);
  float blob = exp(-dot(d, d) * 9.0);
  fragColor = vec4(u_clear + vec3(0.48) * u_bgGlow * blob, 1.0);
}`;

const BLUR_FS = `#version 300 es
precision highp float;
uniform sampler2D u_tex; uniform vec2 u_dir; uniform vec2 u_res;
out vec4 fragColor;
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 px = u_dir / u_res;
  vec4 c = texture(u_tex, uv) * 0.2270270270;
  c += (texture(u_tex, uv + px * 1.3846153846) + texture(u_tex, uv - px * 1.3846153846)) * 0.3162162162;
  c += (texture(u_tex, uv + px * 3.2307692308) + texture(u_tex, uv - px * 3.2307692308)) * 0.0702702703;
  fragColor = c;
}`;

const COMP_FS = `#version 300 es
precision highp float;
uniform sampler2D u_scene, u_glow; uniform vec2 u_res;
uniform vec3 u_glowColor; uniform float u_glowIntensity;
out vec4 fragColor;
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec3 c = texture(u_scene, uv).rgb + texture(u_glow, uv).rgb * u_glowColor * u_glowIntensity;
  fragColor = vec4(c, 1.0);
}`;

// ---------------------------------------------------------------------------
function parseObj(text){
  const v = [], vn = [], faces = [];
  for (const line of text.split('\n')) {
    const t = line.trim().split(/\s+/);
    if (t[0] === 'v') v.push([+t[1], +t[2], +t[3]]);
    else if (t[0] === 'vn') vn.push([+t[1], +t[2], +t[3]]);
    else if (t[0] === 'f') faces.push(t.slice(1, 4).map(s => { const p = s.split('/'); return [+p[0] - 1, p[2] ? +p[2] - 1 : +p[0] - 1]; }));
  }
  return { v, vn, faces };
}
const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const dot = (a, b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0]/l, a[1]/l, a[2]/l]; };

// LoadObj(scale) → TransformMesh(translate) → SplitMeshVertices(ShadeFlat): 15 floats per vertex
function buildMesh(){
  const { v, vn, faces } = parseObj(OBJ);
  const pos = v.map(p => [p[0]*SCALE, p[1]*SCALE + TRANSLATE_Y, p[2]*SCALE]);
  const out = [];
  for (const f of faces) {
    const p = f.map(([vi]) => pos[vi]);
    const n = f.map(([, ni]) => vn[ni] ? norm(vn[ni]) : norm(cross(sub(p[1], p[0]), sub(p[2], p[0]))));
    const nAvg = norm([n[0][0]+n[1][0]+n[2][0], n[0][1]+n[1][1]+n[2][1], n[0][2]+n[1][2]+n[2][2]]);
    for (let i = 0; i < 3; i++) {
      const ni = n[i].map((c, k) => c + (nAvg[k] - c) * SHADE_FLAT);   // lerp past 1 = extrapolate, as TiXL does
      out.push(...p[i], ...ni, ...p[0], ...p[1], ...p[2]);
    }
  }
  return new Float32Array(out);
}

function lookAt(eye, target, up){
  const f = norm(sub(target, eye)), s = norm(cross(f, up)), u = cross(s, f);
  return new Float32Array([ s[0], u[0], -f[0], 0,  s[1], u[1], -f[1], 0,  s[2], u[2], -f[2], 0,
                            -dot(s, eye), -dot(u, eye), dot(f, eye), 1 ]);
}
function rotateAxis(v, axis, ang){   // Rodrigues
  const c = Math.cos(ang), s = Math.sin(ang), k = norm(axis), d = dot(k, v), kx = cross(k, v);
  return [ v[0]*c + kx[0]*s + k[0]*d*(1-c), v[1]*c + kx[1]*s + k[1]*d*(1-c), v[2]*c + kx[2]*s + k[2]*d*(1-c) ];
}

// ---------------------------------------------------------------------------
export default function create(gl, api){
  const meshProg = api.compileProgram(MESH_VS, MESH_FS);
  const bgProg = api.compileProgram(api.VERT, BG_FS);
  const blurProg = api.compileProgram(api.VERT, BLUR_FS);
  const compProg = api.compileProgram(api.VERT, COMP_FS);
  const U = (p, n) => gl.getUniformLocation(p, n);

  const data = buildMesh();
  const vertexCount = data.length / 15;
  const vao = gl.createVertexArray();
  const vbo = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  ['a_pos', 'a_nrm', 'a_p0', 'a_p1', 'a_p2'].forEach((name, i) => {
    const loc = gl.getAttribLocation(meshProg, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 60, i * 12);
  });
  gl.bindVertexArray(null);

  let scene = null, depth = null, glowA = null, glowB = null, sw = 0, sh = 0;
  function ensureTargets(w, h){
    if (w === sw && h === sh) return;
    dispose(false);
    sw = w; sh = h;
    scene = api.makeTarget(w, h);
    depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fbo);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const gw = Math.max(1, w >> 2), gh = Math.max(1, h >> 2);
    glowA = api.makeTarget(gw, gh); glowB = api.makeTarget(gw, gh);
  }
  function dispose(all = true){
    if (scene) { api.freeTarget(scene); api.freeTarget(glowA); api.freeTarget(glowB); gl.deleteRenderbuffer(depth); }
    scene = glowA = glowB = depth = null; sw = sh = 0;
    if (all) { gl.deleteProgram(meshProg); gl.deleteProgram(bgProg); gl.deleteProgram(blurProg); gl.deleteProgram(compProg); gl.deleteBuffer(vbo); gl.deleteVertexArray(vao); }
  }

  function draw(ctx){
    const { target, time: t, params, fullW, fullH, tileX, tileY } = ctx;
    const P = (k, d) => (params[k] !== undefined ? params[k] : d);
    ensureTargets(target.w, target.h);
    const DEG = Math.PI / 180;

    // OscillateVec3 (defaults: amplitude (1,1,0), period 1, phase (π/2,0,0)) → SelectVertices.Center
    const ot = t * P('oscSpeed', 1.0), amp = P('oscAmplitude', 1.0);
    const center = [Math.sin(ot + 1.570789) * amp, Math.sin(ot) * amp, 0];

    // OrbitCamera: eye = Ry(yaw) · Rx(-orbitAngle) · (0,0,dist) + target, slow spin, slight roll wobble
    const tgt = P('target', [-0.59, -0.724, 0]);
    const dist = P('distance', 2.5), pitch = -P('orbitAngle', 110) * DEG;
    const yaw = (P('spinRate', 0.05) * t * 360 + P('spinOffset', 0)) * DEG;
    let e = [0, -dist * Math.sin(pitch), dist * Math.cos(pitch)];
    e = [e[0] * Math.cos(yaw) + e[2] * Math.sin(yaw), e[1], -e[0] * Math.sin(yaw) + e[2] * Math.cos(yaw)];
    const eye = [e[0] + tgt[0], e[1] + tgt[1], e[2] + tgt[2]];
    const roll = P('rollWobble', 5) * DEG * (0.6 * Math.sin(t * 0.37) + 0.4 * Math.sin(t * 0.71 + 1.3));
    const up = rotateAxis([0, 1, 0], sub(tgt, eye), roll);
    const view = lookAt(eye, tgt, up);
    const proj = api.tileProjection(P('fov', 45), 0.01, 100, fullW, fullH, tileX, tileY, target.w, target.h);

    // 1. background + mesh into the scene target (with depth)
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fbo);
    gl.viewport(0, 0, sw, sh);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(bgProg);
    const clear = P('clearColor', [0.051, 0.078, 0.081]);
    gl.uniform2f(U(bgProg, 'u_fullRes'), fullW, fullH);
    gl.uniform2f(U(bgProg, 'u_tileOrigin'), tileX, tileY);
    gl.uniform3fv(U(bgProg, 'u_clear'), clear);
    gl.uniform1f(U(bgProg, 'u_bgGlow'), P('bgGlow', 0.6));
    gl.uniform2fv(U(bgProg, 'u_bgPos'), P('bgPos', [0.25, 0.1]));
    api.drawQuad();

    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);            // DrawMesh Culling = None
    gl.useProgram(meshProg);
    gl.uniformMatrix4fv(U(meshProg, 'u_proj'), false, proj);
    gl.uniformMatrix4fv(U(meshProg, 'u_view'), false, view);
    gl.uniform3fv(U(meshProg, 'u_center'), center);
    gl.uniform1f(U(meshProg, 'u_threshold'), P('threshold', -1.82));
    gl.uniform1f(U(meshProg, 'u_falloff'), P('falloff', 2.0));
    gl.uniform1f(U(meshProg, 'u_noiseScale'), P('noiseScale', 0.91));
    gl.uniform1f(U(meshProg, 'u_amount'), P('amount', 0.5));
    gl.uniform1f(U(meshProg, 'u_shrink'), P('shrink', 2.27));
    gl.uniform3fv(U(meshProg, 'u_eye'), eye);
    gl.uniform3fv(U(meshProg, 'u_lightPos'), P('lightPos', [0.5, 0.3, 3.4]));
    gl.uniform3fv(U(meshProg, 'u_lightColor'), P('lightColor', [0.827, 0.920, 0.926]));
    gl.uniform1f(U(meshProg, 'u_lightIntensity'), P('lightIntensity', 1.1));
    gl.uniform1f(U(meshProg, 'u_lightDecay'), P('lightDecay', 2.29));
    gl.uniform3fv(U(meshProg, 'u_baseColor'), P('baseColor', [0.74, 0.74, 0.74]));
    gl.uniform1f(U(meshProg, 'u_metal'), P('metal', 0.19));
    gl.uniform1f(U(meshProg, 'u_rough'), P('roughness', 0.12));
    gl.uniform1f(U(meshProg, 'u_spec'), P('specular', 3.2));
    gl.uniform1f(U(meshProg, 'u_ambient'), P('ambient', 0.5));
    gl.uniform1f(U(meshProg, 'u_envStreak'), P('envStreak', 3.0));
    gl.uniform3fv(U(meshProg, 'u_fogColor'), P('fogColor', [0.301, 0.249, 0.225]));
    gl.uniform1f(U(meshProg, 'u_fogDistance'), P('fogDistance', 25.6));
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    gl.disable(gl.DEPTH_TEST);

    // 2. Glow: downsample, blur, add back
    const gw = glowA.w, gh = glowA.h;
    const radius = P('glowRadius', 11.9) / 4;
    gl.useProgram(blurProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(U(blurProg, 'u_tex'), 0);
    gl.uniform2f(U(blurProg, 'u_res'), gw, gh);
    let src = scene.tex, passes = P('glowPasses', 2);
    for (let i = 0; i < passes; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, glowB.fbo); gl.viewport(0, 0, gw, gh);
      gl.bindTexture(gl.TEXTURE_2D, src); gl.uniform2f(U(blurProg, 'u_dir'), radius, 0); api.drawQuad();
      gl.bindFramebuffer(gl.FRAMEBUFFER, glowA.fbo);
      gl.bindTexture(gl.TEXTURE_2D, glowB.tex); gl.uniform2f(U(blurProg, 'u_dir'), 0, radius); api.drawQuad();
      src = glowA.tex;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.viewport(0, 0, target.w, target.h);
    gl.useProgram(compProg);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, scene.tex); gl.uniform1i(U(compProg, 'u_scene'), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, glowA.tex); gl.uniform1i(U(compProg, 'u_glow'), 1);
    gl.uniform2f(U(compProg, 'u_res'), target.w, target.h);
    gl.uniform3fv(U(compProg, 'u_glowColor'), P('glowColor', [0.757, 1.0, 0.980]));
    gl.uniform1f(U(compProg, 'u_glowIntensity'), P('glowIntensity', 0.36));
    api.drawQuad();
  }

  return { draw, dispose };
}

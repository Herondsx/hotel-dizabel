// Cena principal (hero): o Hotel Solar D'Izabel na Serra da Mantiqueira, com ciclo do dia.
import * as THREE from 'three';
import { EffectComposer, RenderPass, UnrealBloomPass, OutputPass } from 'three';
import { createMaterials, forest, lightPoints, rng, lerp, clamp, smooth, bake, setMaxAnisotropy, texturesReady } from './core.js';
import { buildHotel } from './hotel.js';

const C = (h) => new THREE.Color(h);
const D = (x, y, z) => new THREE.Vector3(x, y, z).normalize();

/* ------------------------------------------------------------------------ */
/* Ciclo do dia: quadros-chave por hora                                     */
/* ------------------------------------------------------------------------ */
const K = (o) => ({
  ...o,
  top: C(o.top), hor: C(o.hor), bot: C(o.bot), sun: C(o.sun), light: C(o.light), hemiS: C(o.hemiS), hemiG: C(o.hemiG),
  fog: C(o.fog), cloud: C(o.cloud), cloudLit: C(o.cloudLit), mtn: C(o.mtn), ground: C(o.ground),
});
const KEYS = [
  K({ h: 5.5, top: '#0a1330', hor: '#3a3d62', bot: '#0b0e18', sun: '#ff7a50', glow: 0.4, sunDir: D(-0.85, -0.05, -0.4), disc: 0, light: '#a8b6e8', lightI: 0.45, lightDir: D(-0.55, 0.6, 0.55), hemiS: '#34426e', hemiG: '#16110c', hemiI: 0.5, fog: '#252a44', exp: 1.15, lights: 1, stars: 0.6, cloud: '#3e4262', cloudLit: '#8a6a86', cover: 0.42, mtn: '#141b30', ground: '#14140f', bloom: 0.8, env: 0.5 }),
  K({ h: 6.4, top: '#3a5a94', hor: '#f2ac7c', bot: '#3a3030', sun: '#ff9a5a', glow: 1.1, sunDir: D(-0.9, 0.03, -0.35), disc: 1, light: '#ffb27a', lightI: 1.5, lightDir: D(-0.9, 0.14, 0.2), hemiS: '#9aa6c8', hemiG: '#3a2c22', hemiI: 0.75, fog: '#b49a9a', exp: 1.08, lights: 0.55, stars: 0.05, cloud: '#6a6a86', cloudLit: '#ffb08a', cover: 0.45, mtn: '#4a4e6e', ground: '#2a281c', bloom: 0.5, env: 0.8 }),
  K({ h: 8.5, top: '#3f7fcc', hor: '#c2d9ec', bot: '#9fb0a6', sun: '#fff0d6', glow: 0.5, sunDir: D(-0.6, 0.48, 0.3), disc: 1, light: '#fff0dc', lightI: 3.1, lightDir: D(-0.6, 0.48, 0.45), hemiS: '#cfe3ff', hemiG: '#6c5a3a', hemiI: 1.15, fog: '#c9d8e2', exp: 1.0, lights: 0, stars: 0, cloud: '#c8d2de', cloudLit: '#ffffff', cover: 0.42, mtn: '#71899a', ground: '#4a5a32', bloom: 0.1, env: 1 }),
  K({ h: 12.5, top: '#2f76d0', hor: '#c0d8ee', bot: '#a8b8aa', sun: '#fffaf0', glow: 0.45, sunDir: D(0.12, 0.95, 0.3), disc: 1, light: '#fff6ea', lightI: 3.4, lightDir: D(0.15, 0.9, 0.42), hemiS: '#d2e6ff', hemiG: '#6c5a3a', hemiI: 1.25, fog: '#cfdde6', exp: 0.98, lights: 0, stars: 0, cloud: '#ced8e4', cloudLit: '#ffffff', cover: 0.4, mtn: '#7890a0', ground: '#4e5e34', bloom: 0.08, env: 1 }),
  K({ h: 16, top: '#3d7ac6', hor: '#dcd8cc', bot: '#a8a898', sun: '#ffe8c4', glow: 0.6, sunDir: D(0.6, 0.45, 0.25), disc: 1, light: '#ffe6c8', lightI: 3.0, lightDir: D(0.55, 0.5, 0.45), hemiS: '#cfd8f0', hemiG: '#6a5638', hemiI: 1.1, fog: '#d6d6d2', exp: 1.0, lights: 0, stars: 0, cloud: '#d2d2d8', cloudLit: '#fff4e0', cover: 0.42, mtn: '#7a8a98', ground: '#4e5a32', bloom: 0.1, env: 1 }),
  K({ h: 17.6, top: '#5a7cb4', hor: '#f4bf86', bot: '#8a7a6a', sun: '#ffaa5c', glow: 1.25, sunDir: D(0.8, 0.13, -0.25), disc: 1, light: '#ffbe7c', lightI: 2.4, lightDir: D(0.78, 0.22, 0.42), hemiS: '#bcb0aa', hemiG: '#5a4630', hemiI: 0.9, fog: '#d8b898', exp: 1.04, lights: 0.12, stars: 0, cloud: '#9a8a9a', cloudLit: '#ffcc90', cover: 0.45, mtn: '#7a6e78', ground: '#3e4428', bloom: 0.2, env: 0.9 }),
  K({ h: 18.2, top: '#2e4884', hor: '#ee875a', bot: '#4a3a3a', sun: '#ff6e3c', glow: 1.5, sunDir: D(0.86, 0.0, -0.5), disc: 1, light: '#ff9a62', lightI: 1.1, lightDir: D(0.8, 0.1, 0.35), hemiS: '#7a7aa8', hemiG: '#3a2a20', hemiI: 0.7, fog: '#8a6a78', exp: 1.08, lights: 0.65, stars: 0, cloud: '#4e4466', cloudLit: '#ff9670', cover: 0.46, mtn: '#3a3a58', ground: '#24221a', bloom: 0.5, env: 0.7 }),
  K({ h: 18.8, top: '#081335', hor: '#2c4274', bot: '#0a0f1e', sun: '#ff9a5c', glow: 0.34, sunDir: D(0.85, -0.02, -0.52), disc: 0, light: '#9fb4ff', lightI: 0.75, lightDir: D(-0.6, 0.62, 0.55), hemiS: '#3c5694', hemiG: '#1e150d', hemiI: 0.6, fog: '#1a2643', exp: 1.12, lights: 1, stars: 0.45, cloud: '#232a44', cloudLit: '#5a4e70', cover: 0.44, mtn: '#141d33', ground: '#14140f', bloom: 0.7, env: 0.55 }),
  K({ h: 20.5, top: '#040a1e', hor: '#14213f', bot: '#05070f', sun: '#3a3a60', glow: 0.1, sunDir: D(0.8, -0.2, -0.5), disc: 0, light: '#8ea4e8', lightI: 0.5, lightDir: D(-0.55, 0.7, 0.45), hemiS: '#26345c', hemiG: '#100c08', hemiI: 0.42, fog: '#0f1730', exp: 1.18, lights: 1, stars: 1, cloud: '#151b30', cloudLit: '#262c46', cover: 0.4, mtn: '#0b1124', ground: '#0c0c0a', bloom: 0.75, env: 0.4 }),
  K({ h: 22.5, top: '#030818', hor: '#0f1a34', bot: '#04060c', sun: '#30305a', glow: 0.08, sunDir: D(0.8, -0.3, -0.5), disc: 0, light: '#8ea4e8', lightI: 0.45, lightDir: D(-0.55, 0.7, 0.45), hemiS: '#222f55', hemiG: '#0d0a07', hemiI: 0.4, fog: '#0c1228', exp: 1.2, lights: 1, stars: 1, cloud: '#121729', cloudLit: '#20253c', cover: 0.4, mtn: '#090e1e', ground: '#0a0a08', bloom: 0.75, env: 0.38 }),
];
const NUMS = ['glow', 'disc', 'lightI', 'hemiI', 'exp', 'lights', 'stars', 'cover', 'bloom', 'env'];
const COLS = ['top', 'hor', 'bot', 'sun', 'light', 'hemiS', 'hemiG', 'fog', 'cloud', 'cloudLit', 'mtn', 'ground'];
const VECS = ['sunDir', 'lightDir'];
const cur = K({ ...KEYS[7], h: 18.8 });
cur.sunDir = KEYS[7].sunDir.clone();
cur.lightDir = KEYS[7].lightDir.clone();
function sampleKeys(h) {
  h = clamp(h, KEYS[0].h, KEYS[KEYS.length - 1].h);
  let i = 0;
  while (i < KEYS.length - 2 && h > KEYS[i + 1].h) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = smooth(0, 1, (h - a.h) / (b.h - a.h));
  for (const k of NUMS) cur[k] = lerp(a[k], b[k], t);
  for (const k of COLS) cur[k].copy(a[k]).lerp(b[k], t);
  for (const k of VECS) cur[k].copy(a[k]).lerp(b[k], t).normalize();
  cur.h = h;
  return cur;
}

/* ------------------------------------------------------------------------ */
export function createHero(canvas, { logoUrl, pinsEl, onHover, onSelect, onTime, onQuality } = {}) {
  const mobile = window.matchMedia('(max-width: 820px)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let quality = mobile ? 1 : 2; // 2 = alta, 1 = média, 0 = baixa

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
  let basePR = Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(basePR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 3000);
  const { M } = createMaterials();

  /* Céu (gradiente + sol + nuvens + estrelas) ----------------------------- */
  const skyU = {
    top: { value: C('#000') }, hor: { value: C('#000') }, bot: { value: C('#000') }, sun: { value: C('#fff') },
    sunDir: { value: new THREE.Vector3(0, 1, 0) }, disc: { value: 0 }, glow: { value: 1 }, stars: { value: 0 },
    cloudC: { value: C('#fff') }, cloudLit: { value: C('#fff') }, cover: { value: 0.42 }, time: { value: 0 },
  };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyU,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 top, hor, bot, sun, sunDir, cloudC, cloudLit; uniform float disc, glow, stars, cover, time;
      varying vec3 vD;
      float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
      void main(){
        vec3 d = normalize(vD);
        float h = d.y;
        vec3 c = mix(hor, top, pow(smoothstep(-0.02, 0.62, h), 0.75));
        c = mix(c, bot, smoothstep(0.0, -0.25, h));
        vec3 sd = normalize(sunDir);
        float s = max(dot(d, sd), 0.0);
        float hz = 1.0 - smoothstep(-0.05, 0.45, h);
        c += sun * glow * (pow(s, 5.0) * 0.35 * hz + pow(s, 64.0) * 0.55);
        c += sun * disc * smoothstep(0.99935, 0.99972, s) * 14.0;
        if (stars > 0.001 && h > 0.0) {
          vec3 q = d * 760.0;
          vec3 cell = floor(q);
          float r = h31(cell);
          float tw = 0.65 + 0.35 * sin(time * 2.5 + r * 60.0);
          float st = step(0.9972, r) * smoothstep(0.5, 0.05, length(fract(q) - 0.5));
          c += vec3(0.9, 0.95, 1.0) * st * tw * stars * (1.2 + 3.0 * step(0.9995, r)) * smoothstep(0.02, 0.3, h);
        }
        if (h > 0.0) {
          vec2 uv = d.xz / (h + 0.1) * 0.9 + vec2(time * 0.0045, time * 0.0016);
          float n = fbm(uv * 1.6);
          float n2 = fbm(uv * 4.0 + 3.1);
          float dens = smoothstep(1.0 - cover, 1.0 - cover * 0.45, n + n2 * 0.12) * smoothstep(0.0, 0.16, h);
          vec2 sdx = normalize(sd.xz + 1e-4), dx = normalize(d.xz + 1e-4);
          float toward = pow(max(dot(dx, sdx), 0.0), 2.0) * (1.0 - smoothstep(0.0, 0.6, h));
          float edge = smoothstep(0.0, 0.25, dens);
          vec3 cc = mix(cloudC, cloudLit, clamp(0.3 + 0.7 * toward + (1.0 - edge) * 0.35, 0.0, 1.0));
          c = mix(c, cc, dens * 0.94);
        }
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const skyGeo = new THREE.SphereGeometry(1500, 48, 24);
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  scene.add(sky);
  scene.fog = new THREE.Fog(0x000000, 45, 300);

  // ambiente (reflexos/luz indireta) gerado a partir do próprio céu
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(skyGeo, skyMat));
  const envGroundMat = new THREE.MeshBasicMaterial({ color: 0x223322, side: THREE.DoubleSide });
  const envGround = new THREE.Mesh(new THREE.CircleGeometry(1400, 32), envGroundMat);
  envGround.rotation.x = -Math.PI / 2;
  envGround.position.y = -8;
  envScene.add(envGround);
  let envRT = null, envDirty = true, envLast = 0;
  function updateEnv(now) {
    if (!envDirty || now - envLast < 220) return;
    envDirty = false;
    envLast = now;
    const rt = pmrem.fromScene(envScene, 0, 0.5, 4000);
    scene.environment = rt.texture;
    if (envRT) envRT.dispose();
    envRT = rt;
  }

  /* Luzes ------------------------------------------------------------------ */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  const smap = mobile ? 1024 : 4096;
  sun.shadow.mapSize.set(smap, smap);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 24, bottom: -18, near: 1, far: 180 });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.035;
  sun.shadow.radius = 3;
  sun.target.position.set(0, 4, 2);
  scene.add(sun, sun.target);

  /* Terreno ---------------------------------------------------------------- */
  const groundY = (x, z) => {
    const d = Math.hypot(x, z);
    return smooth(45, 220, d) * (7 + 6 * Math.sin(x * 0.017 + 1.3) * Math.cos(z * 0.021) + 3 * Math.sin(x * 0.051) * Math.sin(z * 0.043));
  };
  {
    const S = 900, seg = 160;
    const geo = new THREE.PlaneGeometry(S, S, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, groundY(x, z) - 0.02);
      uv.setXY(i, uv.getX(i) * S, uv.getY(i) * S);
    }
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, M.grass);
    ground.receiveShadow = true;
    scene.add(ground);
    const flat = (w, d, x, z) => {
      const g = new THREE.PlaneGeometry(w, d);
      g.rotateX(-Math.PI / 2);
      const u = g.attributes.uv;
      for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * w, u.getY(i) * d);
      const m = new THREE.Mesh(g, M.pavers);
      m.position.set(x, 0.012, z);
      m.receiveShadow = true;
      scene.add(m);
    };
    flat(30, 4.6, 0, 13.6);
    flat(3, 2.3, 0.1, 10.35);
  }

  /* Montanhas com névoa atmosférica --------------------------------------- */
  const mtnMats = [];
  [[-300, 34, 1, 1600], [-390, 56, 2, 1900], [-500, 90, 3, 2300]].forEach(([z, amp, seed, width], li) => {
    const r = rng(seed * 13 + 5);
    const ph = Array.from({ length: 6 }, () => r() * Math.PI * 2);
    const N = 260, p = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const x = -width / 2 + (width * i) / N;
      let v = Math.sin(x * 0.006 + ph[0]) + 0.55 * Math.sin(x * 0.017 + ph[1]) + 0.3 * Math.sin(x * 0.043 + ph[2]) + 0.12 * Math.sin(x * 0.11 + ph[3]) + 0.05 * Math.sin(x * 0.31 + ph[4]);
      v = (v + 2) / 4;
      p.push(x, 4 + amp * v, 0, x, -30, 0);
      if (i < N) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setIndex(idx);
    const m = new THREE.ShaderMaterial({
      uniforms: { uCol: { value: C('#223') }, uHaze: { value: C('#556') }, uTop: { value: amp + 4 } },
      vertexShader: `varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uCol, uHaze; uniform float uTop; varying float vY;
        void main(){ float t = smoothstep(-6.0, uTop * 0.85, vY); gl_FragColor = vec4(mix(uHaze, uCol, t), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
    });
    m.userData.layer = li;
    mtnMats.push(m);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.z = z;
    mesh.renderOrder = -5;
    scene.add(mesh);
  });

  /* Hotel ------------------------------------------------------------------ */
  const logoTex = new THREE.TextureLoader().load(logoUrl);
  logoTex.colorSpace = THREE.SRGBColorSpace;
  const hotel = buildHotel(M, { logoTex });
  bake(hotel.group);
  scene.add(hotel.group, hotel.decals);
  const glassU = hotel.glass.shared;

  const lampLights = hotel.lamps.map((p) => {
    const l = new THREE.PointLight(0xffc887, 0, 14, 1.8);
    l.position.copy(p);
    scene.add(l);
    return l;
  });
  const porch = [new THREE.PointLight(0xffb45e, 0, 13, 1.6), new THREE.PointLight(0xffb45e, 0, 13, 1.6)];
  porch[0].position.set(-4.5, 2.6, 8.6);
  porch[1].position.set(4.5, 2.6, 8.6);
  scene.add(...porch);

  const strings = lightPoints(hotel.strings, { color: 0xffd9a0, size: 1.4 });
  scene.add(strings);

  /* Árvores ---------------------------------------------------------------- */
  const trees = [];
  const r = rng(77);
  [[-15, -15, 1.05], [-4, -21, 1.15], [9, -19, 1], [17, -11, 1.1], [24, -26, 1.2], [-25, -30, 1.1], [3, -38, 1.25],
    [-33, -12, 1.1], [-22, -2, 0.95], [-30, 9, 1.2], [24, 2, 1.05], [33, 13, 1.15], [-38, 26, 1.3], [30, 30, 1.1]]
    .forEach(([x, z, s], i) => trees.push({ type: 'araucaria', x, z, s, variant: i }));
  for (let i = 0; i < (mobile ? 22 : 44); i++) {
    const a = Math.PI * (1.08 + r() * 0.84), d = 75 + r() * 140;
    const x = Math.cos(a) * d, z = Math.sin(a) * d - 10;
    trees.push({ type: r() < 0.72 ? 'araucaria' : 'pine', x, z, s: 0.9 + r() * 0.5, y: groundY(x, z) - 0.5, variant: i });
  }
  [[-17, 1], [17, -3], [-19, -11], [13, -25], [-10, -30], [27, -16]].forEach(([x, z], i) => trees.push({ type: 'pine', x, z, s: 0.9 + (i % 3) * 0.15, variant: i }));
  [[-17, 7, 0.95], [15.5, 9, 0.9], [-25, 15, 1.1], [20, 17, 1.0]].forEach(([x, z, s], i) => trees.push({ type: 'round', x, z, s, variant: i }));
  scene.add(forest(trees, M, { variants: 3 }));

  /* Grama 3D (lâminas instanciadas com vento) ------------------------------ */
  const grassU = { uTime: { value: 0 }, uWind: { value: 1 } };
  let grassMesh = null;
  {
    const blade = new THREE.PlaneGeometry(0.07, 1, 1, 4);
    blade.translate(0, 0.5, 0);
    const bp = blade.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const y = bp.getY(i);
      bp.setX(i, bp.getX(i) * (1 - y * 0.92));
      bp.setZ(i, y * y * 0.18);
    }
    const bn = blade.attributes.normal;
    for (let i = 0; i < bn.count; i++) bn.setXYZ(i, 0, 0.85, 0.5);
    const inLawn = (x, z) => {
      if (x > -10.2 && x < 10.6 && z > -7.5 && z < 8.3) return false; // prédio + varanda
      if (z > 11.1 && z < 16.1 && Math.abs(x) < 15.2) return false; // pátio de pedras
      if (Math.abs(x - 0.1) < 1.7 && z > 8.8 && z < 11.6) return false; // caminho
      return true;
    };
    const count = quality >= 2 ? 90000 : 26000;
    const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.82, metalness: 0 });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, grassU);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uWind; varying float vBH;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vBH = position.y;
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          float sway = sin(uTime * 1.7 + ip.x * 0.31 + ip.z * 0.23) * 0.6 + sin(uTime * 3.1 + ip.x * 1.3 + ip.z * 0.7) * 0.25;
          transformed.x += sway * position.y * position.y * 0.16 * uWind;
          transformed.z += sway * position.y * position.y * 0.06 * uWind;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vBH;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(0.32, 1.12, smoothstep(0.0, 1.0, vBH));');
    };
    const im = new THREE.InstancedMesh(blade, mat, count);
    const d = new THREE.Object3D();
    const cols = [C('#4f6e33'), C('#5f7c3a'), C('#45622c'), C('#738a46'), C('#3d5828'), C('#83924c')];
    const rr = rng(9);
    let n = 0, guard = 0;
    while (n < count && guard++ < count * 6) {
      // mais densa perto da câmera (gramado da frente)
      const x = (rr() * 2 - 1) * 46, z = -22 + Math.pow(rr(), 0.7) * 58;
      if (!inLawn(x, z)) continue;
      const near = 1 - smooth(18, 46, Math.hypot(x + 10, z - 22));
      if (rr() > 0.25 + 0.75 * near) continue;
      d.position.set(x, groundY(x, z) - 0.02, z);
      d.rotation.set(0, rr() * Math.PI * 2, 0);
      const hgt = 0.18 + rr() * 0.32;
      d.scale.set(0.7 + rr() * 0.8, hgt, 1);
      d.updateMatrix();
      im.setMatrixAt(n, d.matrix);
      im.setColorAt(n, cols[Math.floor(rr() * cols.length)]);
      n++;
    }
    im.count = n;
    im.receiveShadow = true;
    im.frustumCulled = false;
    grassMesh = im;
    scene.add(im);
  }

  /* Vagalumes -------------------------------------------------------------- */
  const ffMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uI: { value: 1 }, uPR: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float aSeed; uniform float uTime, uPR; varying float vA;
      void main(){
        vec3 p = position;
        float t = uTime * 0.35 + aSeed * 50.0;
        p += vec3(sin(t)*1.6, sin(t*1.7)*0.6, cos(t*0.8)*1.6);
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uPR * 40.0 / -mv.z;
        vA = 0.5 + 0.5 * sin(uTime * 2.0 + aSeed * 30.0);
      }`,
    fragmentShader: `
      uniform float uI; varying float vA;
      void main(){ float d = length(gl_PointCoord-0.5); float a = exp(-d*d*30.0); gl_FragColor = vec4(vec3(1.0,0.85,0.45) * 2.0, a*vA*uI); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  {
    const n = mobile ? 60 : 140, p = [], s = [];
    for (let i = 0; i < n; i++) {
      p.push(-26 + Math.random() * 52, 0.4 + Math.random() * 4, -8 + Math.random() * 34);
      s.push(Math.random());
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(s, 1));
    const ff = new THREE.Points(g, ffMat);
    ff.frustumCulled = false;
    scene.add(ff);
  }

  /* Fumaça das chaminés ---------------------------------------------------- */
  const smokeMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCol: { value: C('#cfd6e0') }, uA: { value: 0.35 }, uPR: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float aSeed; uniform float uTime, uPR; varying float vA;
      void main(){
        float life = fract(uTime * 0.06 + aSeed);
        vec3 p = position + vec3(life * 3.5 + sin(life*6.0+aSeed*9.0)*0.4, life * 7.0, -life*1.2);
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uPR * (80.0 + life * 420.0) / -mv.z;
        vA = smoothstep(0.0, 0.12, life) * (1.0 - life);
      }`,
    fragmentShader: `
      uniform vec3 uCol; uniform float uA; varying float vA;
      void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.0,d); gl_FragColor = vec4(uCol, a*a*vA*uA); }`,
    transparent: true, depthWrite: false,
  });
  {
    const p = [], s = [];
    for (const c of hotel.chimneys)
      for (let i = 0; i < 26; i++) {
        p.push(c.x, c.y, c.z);
        s.push(i / 26 + Math.random() * 0.02);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(s, 1));
    const sm = new THREE.Points(g, smokeMat);
    sm.frustumCulled = false;
    scene.add(sm);
  }

  /* Pós-processamento: brilho (bloom) ------------------------------------- */
  let composer = null, bloom = null;
  function buildComposer() {
    if (composer) composer.dispose();
    composer = null;
    if (quality === 0) return;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: quality >= 2 ? 4 : 2 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.6, 0.55, 0.86);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);
  }

  /* Aplicação da hora do dia ---------------------------------------------- */
  let hour = 18.8, hourTarget = 18.8, playing = false;
  const tmp = new THREE.Color();
  function applyTime(h) {
    const k = sampleKeys(h);
    skyU.top.value.copy(k.top);
    skyU.hor.value.copy(k.hor);
    skyU.bot.value.copy(k.bot);
    skyU.sun.value.copy(k.sun);
    skyU.sunDir.value.copy(k.sunDir);
    skyU.disc.value = k.disc * smooth(-0.02, 0.02, k.sunDir.y);
    skyU.glow.value = k.glow;
    skyU.stars.value = k.stars;
    skyU.cloudC.value.copy(k.cloud);
    skyU.cloudLit.value.copy(k.cloudLit);
    skyU.cover.value = k.cover;
    scene.fog.color.copy(k.fog);
    hemi.color.copy(k.hemiS);
    hemi.groundColor.copy(k.hemiG);
    hemi.intensity = k.hemiI;
    sun.color.copy(k.light);
    sun.intensity = k.lightI;
    sun.position.copy(k.lightDir).multiplyScalar(80).add(sun.target.position);
    scene.environmentIntensity = k.env;
    renderer.toneMappingExposure = k.exp;
    envGroundMat.color.copy(k.ground);
    mtnMats.forEach((m) => {
      const L = m.userData.layer;
      m.uniforms.uCol.value.copy(k.mtn).lerp(k.hor, [0.0, 0.22, 0.42][L]);
      m.uniforms.uHaze.value.copy(k.hor).lerp(k.fog, 0.3);
    });
    const L = k.lights;
    glassU.uLight.value = L;
    glassU.uDay.value = smooth(0.4, 1.0, 1 - L) * smooth(0.0, 0.25, k.sunDir.y + 0.1);
    glassU.uSkyTop.value.copy(k.top);
    glassU.uSkyHor.value.copy(k.hor);
    glassU.uGround.value.copy(k.ground);
    M.globe.emissiveIntensity = lerp(0.15, 2.6, L);
    scene.fog.near = lerp(80, 45, L);
    scene.fog.far = lerp(560, 300, L);
    hotel.signMat.emissiveIntensity = 0.28 * L;
    strings.material.uniforms.uIntensity.value = smooth(0.3, 1, L);
    ffMat.uniforms.uI.value = smooth(0.6, 1, L) * smooth(0.6, 1.0, k.stars + 0.4);
    smokeMat.uniforms.uCol.value.copy(tmp.set('#e6e9ee')).lerp(C('#7d889c'), L);
    lampLights.forEach((l) => (l.intensity = 22 * L));
    porch.forEach((l) => (l.intensity = 24 * L));
    if (bloom) {
      bloom.strength = k.bloom;
      bloom.threshold = lerp(1.05, 0.9, L);
    }
    renderer.shadowMap.needsUpdate = true;
    envDirty = true;
  }

  /* Câmera ------------------------------------------------------------------ */
  const state = { intro: 0, introStart: -1, progress: 0, mx: 0, my: 0, tmx: 0, tmy: 0, yaw: 0, pitch: 0, vyaw: 0, idle: 0 };
  const P = {
    intro: { p: new THREE.Vector3(-62, 34, 96), t: new THREE.Vector3(0, 4, 0) },
    rest: { p: new THREE.Vector3(-27, 6.2, 47), t: new THREE.Vector3(-6.2, 7.6, 0) },
    restP: { p: new THREE.Vector3(-12, 5.6, 62), t: new THREE.Vector3(0.5, 9.5, 0) },
    end: { p: new THREE.Vector3(0.35, 2.4, 13.2), t: new THREE.Vector3(0.15, 2.25, 6.4) },
  };
  const pivot = new THREE.Vector3(0.5, 4, 2);
  const vp = new THREE.Vector3(), vt = new THREE.Vector3(), rel = new THREE.Vector3();
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let portrait = false;

  function updateCamera(time) {
    const rest = portrait ? P.restP : P.rest;
    const e = ease(state.intro);
    vp.copy(P.intro.p).lerp(rest.p, e);
    vt.copy(P.intro.t).lerp(rest.t, e);
    const s = ease(clamp(state.progress));
    vp.lerp(P.end.p, s);
    vt.lerp(P.end.t, s);
    const k = 1 - s;
    // órbita por arraste (em torno do prédio)
    if (Math.abs(state.yaw) > 1e-4 || Math.abs(state.pitch) > 1e-4) {
      rel.copy(vp).sub(pivot).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw * k);
      rel.y += state.pitch * 14 * k;
      vp.copy(pivot).add(rel);
      vt.x = lerp(vt.x, pivot.x, Math.min(1, Math.abs(state.yaw) * 0.9) * k);
    }
    vp.x += (state.mx * 2.2 + Math.sin(time * 0.12) * 0.6) * k;
    vp.y += state.my * 1.1 * k;
    vt.x += state.mx * 0.5 * k;
    camera.position.copy(vp);
    camera.lookAt(vt);
    camera.fov = lerp(portrait ? 40 : 32, 44, s);
    camera.updateProjectionMatrix();
  }

  /* Interação: janelas, pinos e arraste -------------------------------------- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const winMeshes = hotel.windows.map((w) => w.mesh);
  let hovered = null, down = null, dragging = false, pointer = null;
  const hoverAmt = new Map();
  function pick(cx, cy) {
    const rc = canvas.getBoundingClientRect();
    ndc.set(((cx - rc.left) / rc.width) * 2 - 1, -((cy - rc.top) / rc.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(winMeshes, false)[0];
    return hit ? hotel.windows.find((w) => w.mesh === hit.object) : null;
  }
  function interactive() {
    return state.intro > 0.98 && state.progress < 0.18;
  }
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, yaw: state.yaw, pitch: state.pitch, t: performance.now(), type: e.pointerType };
    dragging = false;
  });
  window.addEventListener('pointermove', (e) => {
    pointer = { x: e.clientX, y: e.clientY };
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!dragging && Math.hypot(dx, dy) > 6) {
      dragging = true;
      canvas.style.cursor = 'grabbing';
      setHover(null);
    }
    if (dragging) {
      const prev = state.yaw;
      state.yaw = clamp(down.yaw - dx * 0.0042, -0.75, 0.75);
      state.vyaw = state.yaw - prev;
      if (down.type === 'mouse') state.pitch = clamp(down.pitch + dy * 0.0012, -0.12, 0.22);
      state.idle = 0;
    }
  }, { passive: true });
  window.addEventListener('pointerup', (e) => {
    if (down && !dragging && interactive()) {
      const w = pick(e.clientX, e.clientY);
      if (w && onSelect) onSelect(w.space);
    }
    down = null;
    dragging = false;
    canvas.style.cursor = '';
  });
  canvas.addEventListener('pointerleave', () => {
    pointer = null;
    if (!down) setHover(null);
  });
  function setHover(w, x, y) {
    if (w === hovered && !w) return;
    hovered = w;
    canvas.style.cursor = w ? 'pointer' : '';
    onHover && onHover(w ? w.space : null, x, y);
  }

  // pinos HTML sobre a fachada
  const pins = [];
  if (pinsEl) {
    for (const a of hotel.anchors) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hpin';
      b.innerHTML = `<span class="hpin__dot"></span><span class="hpin__label">${a.label}</span>`;
      b.addEventListener('click', () => onSelect && onSelect(a.id));
      b.addEventListener('mouseenter', () => {
        const w = hotel.windows.find((x) => x.space === a.id);
        if (w) hoverAmt.set(w, 1);
      });
      pinsEl.appendChild(b);
      pins.push({ a, el: b });
    }
  }
  const pv = new THREE.Vector3();
  function updatePins() {
    if (!pins.length) return;
    const show = interactive() && !dragging;
    pinsEl.classList.toggle('is-visible', show);
    if (!show) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    for (const { a, el } of pins) {
      pv.copy(a.pos).project(camera);
      el.style.transform = `translate3d(${((pv.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-pv.y * 0.5 + 0.5) * h).toFixed(1)}px, 0)`;
    }
  }

  /* Tamanho / loop -------------------------------------------------------------- */
  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    portrait = camera.aspect < 0.95;
    if (portrait) camera.setViewOffset(w, h, 0, Math.round(h * 0.25), w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    if (composer) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
    }
  }
  resize();
  buildComposer();
  new ResizeObserver(resize).observe(canvas);

  // qualidade adaptativa: mede o tempo de quadro e reduz se necessário
  const perf = { n: 0, sum: 0, checks: 0 };
  function adapt(dt) {
    if (perf.checks >= 3 || state.intro < 1) return;
    perf.n++;
    perf.sum += dt;
    if (perf.n < 90) return;
    const avg = perf.sum / perf.n;
    perf.n = perf.sum = 0;
    perf.checks++;
    if (avg > 0.026 && quality > 0) {
      quality--;
      if (quality === 1) {
        basePR = Math.min(basePR, 1.25);
        renderer.setPixelRatio(basePR);
        if (grassMesh) grassMesh.count = Math.min(grassMesh.count, 26000);
      }
      if (quality === 0) {
        renderer.setPixelRatio(1);
        sun.shadow.mapSize.set(1024, 1024);
        if (sun.shadow.map) {
          sun.shadow.map.dispose();
          sun.shadow.map = null;
        }
        renderer.shadowMap.needsUpdate = true;
      }
      resize();
      buildComposer();
      applyTime(hour);
      onQuality && onQuality(quality);
    }
  }

  let active = true, last = performance.now();
  const clock = { t: 0 };
  function render() {
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!active) return;
    clock.t += dt;
    if (state.introStart >= 0) state.intro = clamp((now - state.introStart) / 3600);
    state.mx += (state.tmx - state.mx) * Math.min(1, dt * 2.5);
    state.my += (state.tmy - state.my) * Math.min(1, dt * 2.5);
    // volta suave da órbita quando ocioso
    if (!dragging) {
      state.idle += dt;
      state.yaw += state.vyaw;
      state.vyaw *= 0.9;
      state.yaw = clamp(state.yaw, -0.75, 0.75);
      if (state.idle > 3.5) {
        state.yaw *= 1 - Math.min(1, dt * 0.6);
        state.pitch *= 1 - Math.min(1, dt * 0.6);
      }
    }
    // hora do dia
    if (playing) {
      hourTarget += dt * 0.75;
      if (hourTarget > 22.4) hourTarget = 5.6;
    }
    if (Math.abs(hour - hourTarget) > 0.002) {
      const jump = Math.abs(hourTarget - hour) > 8;
      hour = jump ? hourTarget : hour + (hourTarget - hour) * Math.min(1, dt * (playing ? 8 : 2.6));
      applyTime(hour);
      onTime && onTime(hour);
    }
    updateEnv(now);
    // hover nas janelas
    if (pointer && !down && interactive()) {
      const w = pick(pointer.x, pointer.y);
      if (w !== hovered) setHover(w, pointer.x, pointer.y);
      else if (w) onHover && onHover(w.space, pointer.x, pointer.y);
    } else if (hovered && !interactive()) setHover(null);
    for (const w of hotel.windows) {
      const target = w === hovered ? 1 : hoverAmt.get(w) || 0;
      w.mat.uniforms.uHover.value += (target - w.mat.uniforms.uHover.value) * Math.min(1, dt * 8);
      if (hoverAmt.get(w)) hoverAmt.set(w, Math.max(0, hoverAmt.get(w) - dt * 1.2));
    }
    glassU.uTime.value = clock.t;
    skyU.time.value = clock.t;
    grassU.uTime.value = clock.t;
    strings.material.uniforms.uTime.value = clock.t;
    ffMat.uniforms.uTime.value = clock.t;
    smokeMat.uniforms.uTime.value = clock.t;
    updateCamera(clock.t);
    updatePins();
    render();
    adapt(dt);
  }

  applyTime(hour);
  updateCamera(0);
  const ready = texturesReady().then(() => {
    renderer.shadowMap.needsUpdate = true;
    envDirty = true;
    updateEnv(performance.now() + 1000);
    renderer.compile(scene, camera);
    render();
    requestAnimationFrame(frame);
  });

  return {
    ready,
    start() { state.introStart = performance.now(); },
    skipIntro() { state.intro = 1; state.introStart = -1; },
    setProgress(p) { state.progress = p; },
    setPointer(x, y) { state.tmx = x; state.tmy = y; },
    setTime(h, animate = true) { hourTarget = clamp(h, 5.6, 22.4); if (!animate) { hour = hourTarget; applyTime(hour); } },
    getTime: () => hourTarget,
    setPlaying(v) { playing = !!v && !reduced; },
    isPlaying: () => playing,
    isNight: () => hourTarget >= 18.4 || hourTarget < 6.2,
    setActive(v) { active = v; if (v) last = performance.now(); },
    renderOnce() { applyTime(hour = hourTarget); envDirty = true; updateEnv(performance.now() + 1e6); updateCamera(clock.t); updatePins(); render(); },
    get quality() { return quality; },
    renderer,
  };
}

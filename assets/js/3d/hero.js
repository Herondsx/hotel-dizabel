// Cena principal (hero): o hotel ao entardecer na Serra da Mantiqueira.
import * as THREE from 'three';
import { RoomEnvironment } from 'three';
import { createMaterials, forest, lightPoints, rng, lerp, clamp, smooth, bake } from './core.js';
import { buildHotel } from './hotel.js';

const C = (h) => new THREE.Color(h);
const MOODS = {
  day: {
    top: C('#3f84cf'), hor: C('#d7e6ef'), bot: C('#a9b8ad'), fog: C('#cddbe3'),
    sun: C('#fff2d6'), sunDir: new THREE.Vector3(0.45, 0.55, -0.7).normalize(), disc: 1,
    dir: C('#fff0d8'), dirI: 3.2, dirPos: new THREE.Vector3(-30, 52, 34),
    hemiS: C('#d2e6ff'), hemiG: C('#6c5a3a'), hemiI: 1.25, env: 0.55, exp: 1.0,
    mt: [C('#8ba3b3'), C('#a6bbc8'), C('#bfcfd9')],
  },
  night: {
    top: C('#050d27'), hor: C('#2a3f70'), bot: C('#0a0f1e'), fog: C('#1a2643'),
    sun: C('#ff9a5c'), sunDir: new THREE.Vector3(0.85, 0.04, -0.52).normalize(), disc: 0,
    dir: C('#9fb4ff'), dirI: 0.75, dirPos: new THREE.Vector3(-34, 40, 40),
    hemiS: C('#3c5694'), hemiG: C('#1e150d'), hemiI: 0.6, env: 0.16, exp: 1.12,
    mt: [C('#111a31'), C('#18233f'), C('#212f52')],
  },
};

export function createHero(canvas, { logoUrl, quality = 'high' } = {}) {
  const mobile = window.matchMedia('(max-width: 820px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 2000);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const { M } = createMaterials();

  /* Céu ------------------------------------------------------------------ */
  const skyU = {
    top: { value: C('#000') }, hor: { value: C('#000') }, bot: { value: C('#000') },
    sun: { value: C('#fff') }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, disc: { value: 1 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1200, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: skyU,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 top, hor, bot, sun, sunDir; uniform float disc; varying vec3 vD;
        void main(){
          float h = vD.y;
          vec3 c = mix(hor, top, pow(smoothstep(-0.02, 0.6, h), 0.8));
          c = mix(c, bot, smoothstep(0.0, -0.25, h));
          float s = max(dot(vD, normalize(sunDir)), 0.0);
          float hz = 1.0 - smoothstep(-0.05, 0.42, h);
          c += sun * (pow(s, 5.0) * 0.32 * hz + pow(s, 48.0) * 0.45 * mix(hz, 1.0, disc));
          c += sun * disc * smoothstep(0.9993, 0.9996, s) * 4.0;
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  scene.add(sky);

  // estrelas
  const starGeo = new THREE.BufferGeometry();
  {
    const r = rng(42), p = [];
    for (let i = 0; i < 1400; i++) {
      const th = r() * Math.PI * 2, y = 0.05 + Math.pow(r(), 0.7) * 0.95, rr = Math.sqrt(1 - y * y);
      p.push(Math.cos(th) * rr * 1000, y * 1000, Math.sin(th) * rr * 1000);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  }
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 1, fog: false, depthWrite: false });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  scene.fog = new THREE.Fog(0x000000, 40, 260);

  /* Luzes ---------------------------------------------------------------- */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -24, near: 1, far: 160 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  sun.target.position.set(0, 4, 0);
  scene.add(sun, sun.target);

  /* Terreno -------------------------------------------------------------- */
  {
    const S = 900, seg = 120;
    const geo = new THREE.PlaneGeometry(S, S, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), d = Math.hypot(x, z);
      const k = smooth(45, 220, d);
      const h = k * (7 + 6 * Math.sin(x * 0.017 + 1.3) * Math.cos(z * 0.021) + 3 * Math.sin(x * 0.051) * Math.sin(z * 0.043));
      pos.setY(i, h - 0.02);
      uv.setXY(i, uv.getX(i) * S, uv.getY(i) * S);
    }
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, M.grass);
    ground.receiveShadow = true;
    scene.add(ground);
    // pátio de pedras
    const pg = new THREE.PlaneGeometry(30, 4.6);
    pg.rotateX(-Math.PI / 2);
    const puv = pg.attributes.uv;
    for (let i = 0; i < puv.count; i++) puv.setXY(i, puv.getX(i) * 30, puv.getY(i) * 4.6);
    const pav = new THREE.Mesh(pg, M.pavers);
    pav.position.set(0, 0.01, 13.6);
    pav.receiveShadow = true;
    scene.add(pav);
    // caminho até a escada
    const cg = new THREE.PlaneGeometry(3, 2.2);
    cg.rotateX(-Math.PI / 2);
    const cp = new THREE.Mesh(cg, M.pavers);
    cp.position.set(0.1, 0.015, 10.4);
    cp.receiveShadow = true;
    scene.add(cp);
  }

  /* Montanhas (Serra da Mantiqueira) ----------------------------------- */
  const mtMats = [];
  [[-300, 34, 1, 1600], [-390, 56, 2, 1900], [-500, 90, 3, 2300]].forEach(([z, amp, seed, width], li) => {
    const r = rng(seed * 13 + 5);
    const ph = Array.from({ length: 6 }, () => r() * Math.PI * 2);
    const N = 220, p = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const x = -width / 2 + (width * i) / N;
      let v = Math.sin(x * 0.006 + ph[0]) + 0.55 * Math.sin(x * 0.017 + ph[1]) + 0.3 * Math.sin(x * 0.043 + ph[2]) + 0.12 * Math.sin(x * 0.11 + ph[3]);
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
    const m = new THREE.MeshBasicMaterial({ color: 0x223355, fog: false });
    m.userData.layer = li;
    mtMats.push(m);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.z = z;
    mesh.renderOrder = -1;
    scene.add(mesh);
  });

  /* Hotel ------------------------------------------------------------------ */
  const logoTex = new THREE.TextureLoader().load(logoUrl);
  logoTex.colorSpace = THREE.SRGBColorSpace;
  const hotel = buildHotel(M, { logoTex });
  bake(hotel.group);
  scene.add(hotel.group);

  // luzes dos postes e da varanda
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

  const strings = lightPoints(hotel.strings, { color: 0xffd9a0, size: 2.4 });
  scene.add(strings);

  /* Árvores ---------------------------------------------------------------- */
  const trees = [];
  const r = rng(77);
  [[-15, -15, 1.05], [-4, -21, 1.15], [9, -19, 1], [17, -11, 1.1], [24, -26, 1.2], [-25, -30, 1.1], [3, -38, 1.25],
    [-33, -12, 1.1], [-22, -2, 0.95], [-30, 9, 1.2], [24, 2, 1.05], [33, 13, 1.15], [-38, 26, 1.3], [30, 30, 1.1]]
    .forEach(([x, z, s], i) => trees.push({ type: 'araucaria', x, z, s, variant: i }));
  for (let i = 0; i < (mobile ? 22 : 44); i++) {
    const a = Math.PI * (1.08 + r() * 0.84), d = 75 + r() * 140;
    trees.push({ type: r() < 0.7 ? 'araucaria' : 'pine', x: Math.cos(a) * d, z: Math.sin(a) * d - 10, s: 0.9 + r() * 0.5, y: smooth(45, 220, d) * 6 - 0.5, variant: i });
  }
  [[-17, 1], [17, -3], [-19, -11], [13, -25], [-10, -30], [27, -16]].forEach(([x, z], i) => trees.push({ type: 'pine', x, z, s: 0.9 + (i % 3) * 0.15, variant: i }));
  [[-17, 7, 0.95], [15.5, 9, 0.9], [-25, 15, 1.1], [20, 17, 1.0]].forEach(([x, z, s], i) => trees.push({ type: 'round', x, z, s, variant: i }));
  scene.add(forest(trees, M, { variants: 3 }));

  /* Vagalumes ------------------------------------------------------------- */
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
      void main(){ float d = length(gl_PointCoord-0.5); float a = exp(-d*d*30.0); gl_FragColor = vec4(vec3(1.0,0.85,0.45), a*vA*uI); }`,
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

  /* Humor (dia / noite) ------------------------------------------------- */
  let night = 1, nightTarget = 1;
  const tmp = new THREE.Color();
  function applyMood(n) {
    const D = MOODS.day, N = MOODS.night;
    skyU.top.value.copy(D.top).lerp(N.top, n);
    skyU.hor.value.copy(D.hor).lerp(N.hor, n);
    skyU.bot.value.copy(D.bot).lerp(N.bot, n);
    skyU.sun.value.copy(D.sun).lerp(N.sun, n);
    skyU.sunDir.value.copy(D.sunDir).lerp(N.sunDir, n).normalize();
    skyU.disc.value = lerp(D.disc, N.disc, n);
    scene.fog.color.copy(D.fog).lerp(N.fog, n);
    hemi.color.copy(D.hemiS).lerp(N.hemiS, n);
    hemi.groundColor.copy(D.hemiG).lerp(N.hemiG, n);
    hemi.intensity = lerp(D.hemiI, N.hemiI, n);
    sun.color.copy(D.dir).lerp(N.dir, n);
    sun.intensity = lerp(D.dirI, N.dirI, n);
    sun.position.copy(D.dirPos).lerp(N.dirPos, n);
    scene.environmentIntensity = lerp(D.env, N.env, n);
    renderer.toneMappingExposure = lerp(D.exp, N.exp, n);
    mtMats.forEach((m) => m.color.copy(D.mt[m.userData.layer]).lerp(N.mt[m.userData.layer], n));
    starMat.opacity = n * n;
    const glow = lerp(0.04, 2.7, n);
    for (const m of [M.glassA, M.glassB, M.glassC]) m.emissiveIntensity = glow * m.userData.k;
    M.door.emissiveIntensity = lerp(0.1, 2.2, n);
    M.globe.emissiveIntensity = lerp(0.2, 3.2, n);
    hotel.signMat.emissiveIntensity = 0.28 * n;
    strings.material.uniforms.uIntensity.value = smooth(0.35, 1, n);
    ffMat.uniforms.uI.value = smooth(0.5, 1, n);
    smokeMat.uniforms.uCol.value.copy(tmp.set('#e6e9ee')).lerp(C('#7d889c'), n);
    lampLights.forEach((l) => (l.intensity = 22 * n));
    porch.forEach((l) => (l.intensity = 26 * n));
    renderer.shadowMap.needsUpdate = true;
  }
  applyMood(night);

  /* Câmera ------------------------------------------------------------- */
  const state = { intro: 0, introStart: -1, progress: 0, mx: 0, my: 0, tmx: 0, tmy: 0 };
  const P = {
    intro: { p: new THREE.Vector3(-62, 34, 96), t: new THREE.Vector3(0, 4, 0) },
    rest: { p: new THREE.Vector3(-27, 6.2, 47), t: new THREE.Vector3(-6.2, 7.6, 0) },
    restP: { p: new THREE.Vector3(-12, 5.6, 62), t: new THREE.Vector3(0.5, 9.5, 0) },
    end: { p: new THREE.Vector3(0.35, 2.4, 13.2), t: new THREE.Vector3(0.15, 2.25, 6.4) },
  };
  const vp = new THREE.Vector3(), vt = new THREE.Vector3(), vp2 = new THREE.Vector3(), vt2 = new THREE.Vector3();
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
    vp.x += (state.mx * 2.2 + Math.sin(time * 0.12) * 0.6) * k;
    vp.y += state.my * 1.1 * k;
    vt.x += state.mx * 0.5 * k;
    camera.position.copy(vp);
    camera.lookAt(vt);
    camera.fov = lerp(portrait ? 40 : 32, 44, s);
    camera.updateProjectionMatrix();
  }

  /* Tamanho / loop -------------------------------------------------------- */
  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    portrait = camera.aspect < 0.95;
    // no celular, sobe a cena para o texto ficar abaixo do prédio
    if (portrait) camera.setViewOffset(w, h, 0, Math.round(h * 0.25), w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  let active = true, raf = 0, last = performance.now();
  const clock = { t: 0 };
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!active) return;
    clock.t += dt;
    if (state.introStart >= 0) state.intro = clamp((now - state.introStart) / 3600);
    state.mx += (state.tmx - state.mx) * Math.min(1, dt * 2.5);
    state.my += (state.tmy - state.my) * Math.min(1, dt * 2.5);
    if (Math.abs(night - nightTarget) > 0.001) {
      night += (nightTarget - night) * Math.min(1, dt * 2.2);
      applyMood(night);
    }
    strings.material.uniforms.uTime.value = clock.t;
    ffMat.uniforms.uTime.value = clock.t;
    smokeMat.uniforms.uTime.value = clock.t;
    updateCamera(clock.t);
    renderer.render(scene, camera);
  }

  // primeira renderização (compila shaders e sombras)
  renderer.shadowMap.needsUpdate = true;
  updateCamera(0);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  raf = requestAnimationFrame(frame);

  return {
    start() { state.introStart = performance.now(); },
    skipIntro() { state.intro = 1; state.introStart = -1; },
    setProgress(p) { state.progress = p; },
    setPointer(x, y) { state.tmx = x; state.tmy = y; },
    setNight(on) { nightTarget = on ? 1 : 0; },
    isNight: () => nightTarget === 1,
    setActive(v) { active = v; if (v) last = performance.now(); },
    renderOnce() { applyMood(night = nightTarget); updateCamera(clock.t); renderer.render(scene, camera); },
    renderer,
  };
}

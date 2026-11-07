// Modelo procedural da fachada do Hotel Solar D'Izabel (estilo montanha / alpino)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three';
import { box, block, cyl, uvBox, pointsAlong, loadTex, contactShadowTex, bushParts, merge } from './core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ------------------------------------------------------------------------ */
/* Vidro com "interior" real (foto do quarto) em paralaxe + reflexo do céu     */
/* ------------------------------------------------------------------------ */
export function createGlassSystem() {
  const shared = {
    uInterior: { value: loadTex('interiors.webp', { srgb: true }) },
    uLight: { value: 1 },
    uDay: { value: 0 },
    uTime: { value: 0 },
    uSkyTop: { value: new THREE.Color(0x0a1530) },
    uSkyHor: { value: new THREE.Color(0x2a3f70) },
    uGround: { value: new THREE.Color(0x1a1a14) },
  };
  shared.uInterior.value.wrapS = shared.uInterior.value.wrapT = THREE.ClampToEdgeWrapping;
  const vertexShader = /* glsl */ `
    varying vec2 vUv; varying vec3 vViewL; varying vec3 vWorldPos; varying vec3 vWorldN;
    void main(){
      vUv = uv;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      vWorldN = normalize(mat3(modelMatrix) * normal);
      vec3 camL = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
      vViewL = camL - position;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`;
  const fragmentShader = /* glsl */ `
    uniform sampler2D uInterior; uniform vec4 uCell; uniform vec2 uSize;
    uniform float uLight, uK, uHover, uDay, uCurtain, uTime, uDepth;
    uniform vec3 uSkyTop, uSkyHor, uGround;
    varying vec2 vUv; varying vec3 vViewL; varying vec3 vWorldPos; varying vec3 vWorldN;
    void main(){
      vec3 vL = normalize(vViewL);
      float vz = max(vL.z, 0.08);
      vec2 p = (vUv - 0.5) * uSize;
      // parede do fundo do cômodo a uDepth metros atrás do vidro
      vec2 hit = p - vL.xy / vz * uDepth;
      vec2 roomSize = uSize * 2.2 + vec2(0.8);
      vec2 ruv = hit / roomSize + 0.5;
      float inside = step(0.0, ruv.x) * step(ruv.x, 1.0) * step(0.0, ruv.y) * step(ruv.y, 1.0);
      ruv = clamp(ruv, 0.003, 0.997);
      vec3 room = texture2D(uInterior, uCell.xy + ruv * uCell.zw).rgb * mix(0.3, 1.0, inside);
      // cortinas logo atrás do vidro
      vec2 cp = p - vL.xy / vz * 0.12;
      float cx = cp.x / uSize.x + 0.5;
      float side = 0.0;
      if (uCurtain > 0.5) {
        float wl = 0.19 + 0.025 * sin(cp.y * 4.0);
        side = smoothstep(wl, wl - 0.05, cx) + smoothstep(1.0 - wl, 1.0 - wl + 0.05, cx);
      }
      float folds = 0.62 + 0.38 * sin(cx * 64.0 + sin(cp.y * 2.3) * 1.5);
      vec3 curtain = vec3(0.98, 0.9, 0.78) * folds;
      float sheer = uCurtain > 1.5 ? 0.3 : 0.0;
      vec3 inner = mix(room, curtain * 0.85, clamp(side + sheer, 0.0, 1.0));
      float lit = uLight * uK;
      vec3 interior = inner * (0.05 + 0.1 * uDay + lit * 1.35);
      // reflexo (Fresnel) do céu
      vec3 N = normalize(vWorldN);
      vec3 V = normalize(cameraPosition - vWorldPos);
      float ndv = clamp(dot(N, V), 0.0, 1.0);
      float fres = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
      vec3 R = reflect(-V, N);
      vec3 sky = R.y > 0.0 ? mix(uSkyHor, uSkyTop, pow(clamp(R.y, 0.0, 1.0), 0.6)) : mix(uSkyHor, uGround, clamp(-R.y * 3.0, 0.0, 1.0));
      float reflAmt = clamp(fres * 1.3 + 0.07 + uDay * 0.3, 0.0, 0.88) * (1.0 - min(lit, 1.0) * 0.55);
      vec3 col = interior * (1.0 - reflAmt) + sky * reflAmt;
      col += vec3(1.0, 0.7, 0.36) * uHover * (0.5 + 0.2 * sin(uTime * 5.0));
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  function make(cell, { k = 1, w = 1.3, h = 1.4, curtain = 1, depth = 2.4 } = {}) {
    const c = cell % 4, r = Math.floor(cell / 4);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        uCell: { value: new THREE.Vector4(c / 4, 1 - (r + 1) / 3, 1 / 4, 1 / 3) },
        uSize: { value: new THREE.Vector2(w, h) },
        uK: { value: k },
        uHover: { value: 0 },
        uCurtain: { value: curtain },
        uDepth: { value: depth },
      },
      vertexShader,
      fragmentShader,
    });
    return mat;
  }
  return { shared, make };
}

/* Janela com caixilho, peitoril, moldura e venezianas ---------------------- */
export function windowUnit(M, { w = 1.3, h = 1.4, glass = M.glassA, shutters = 'open', sill = true, surround = false } = {}) {
  const g = new THREE.Group();
  const fr = 0.09;
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glass);
  gl.position.z = 0.02;
  gl.userData.keep = true;
  g.add(gl);
  g.userData.glass = gl;
  g.add(box(w + fr * 2, fr, 0.14, M.frame, 0, h / 2 + fr / 2, 0.05, false));
  g.add(box(w + fr * 2, fr, 0.14, M.frame, 0, -h / 2 - fr / 2, 0.05, false));
  g.add(box(fr, h, 0.14, M.frame, -w / 2 - fr / 2, 0, 0.05, false));
  g.add(box(fr, h, 0.14, M.frame, w / 2 + fr / 2, 0, 0.05, false));
  g.add(box(0.05, h, 0.06, M.frame, 0, 0, 0.05, false));
  g.add(box(w, 0.05, 0.06, M.frame, 0, h * 0.2, 0.05, false));
  if (surround && M.trim) {
    const t = 0.13, W2 = w + fr * 2 + t * 2;
    g.add(box(W2, t, 0.07, M.trim, 0, h / 2 + fr + t / 2, 0.02));
    g.add(box(t, h + fr * 2, 0.07, M.trim, -w / 2 - fr - t / 2, 0, 0.02));
    g.add(box(t, h + fr * 2, 0.07, M.trim, w / 2 + fr + t / 2, 0, 0.02));
  }
  if (sill) g.add(box(w + 0.46, 0.09, 0.3, M.sill, 0, -h / 2 - fr - 0.04, 0.1));
  if (shutters === 'open')
    for (const s of [-1, 1]) g.add(box(w / 2 + 0.04, h + 0.12, 0.05, M.shutter, s * (w / 2 + fr + w / 4 + 0.1 + (surround ? 0.13 : 0)), 0, 0.08));
  if (shutters === 'closed')
    for (const s of [-1, 1]) g.add(box(w / 2, h, 0.05, M.shutter, s * (w / 4), 0, 0.09));
  return g;
}

/* Guirlanda com luzinhas ----------------------------------------------------- */
export function wreath(M, strings, x, y, z) {
  const g = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.13, 8, 22), M.wreath);
  g.position.set(x, y, z + 0.08);
  g.castShadow = true;
  if (strings)
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      strings.push(x + Math.cos(a) * 0.42, y + Math.sin(a) * 0.42, z + 0.22);
    }
  return g;
}

// geometria da água do telhado com UV: u ao longo da cumeeira, v subindo a água
function roofSlabGeo(len, t, depth, flip) {
  const g = uvBox(len, t, depth);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 8; i < 16; i++) uv.setXY(i, p.getZ(i), flip ? -p.getX(i) : p.getX(i));
  return g;
}

/**
 * Ala com empena (duas águas, cumeeira no eixo Z).
 * W = { x, z, w, d, eave, ridge, ohSide, ohRight, ohFront, y0 }  — eave = 0 cria só o triângulo.
 */
export function gableWing(M, W, { strings, bodyMat = M.stucco, roofMats } = {}) {
  const g = new THREE.Group();
  const hw = W.w / 2, rise = W.ridge - W.eave;
  const y0 = W.y0 || 0;
  const ohF = W.ohFront ?? 1.0;

  const sh = new THREE.Shape();
  sh.moveTo(-hw, 0);
  sh.lineTo(hw, 0);
  if (W.eave > 0) sh.lineTo(hw, W.eave);
  sh.lineTo(0, W.ridge);
  if (W.eave > 0) sh.lineTo(-hw, W.eave);
  sh.closePath();
  const bg = new THREE.ExtrudeGeometry(sh, { depth: W.d, bevelEnabled: false });
  bg.translate(0, 0, -W.d / 2);
  const body = new THREE.Mesh(bg, bodyMat);
  body.position.set(W.x, y0, W.z);
  body.castShadow = body.receiveShadow = true;
  g.add(body);

  const t = 0.3;
  const L = Math.hypot(hw, rise), a = Math.atan2(rise, hw);
  const mats = roofMats || [M.fascia, M.fascia, M.roof, M.roofUnder, M.fascia, M.fascia];
  for (const side of [-1, 1]) {
    const ohS = side > 0 && W.ohRight != null ? W.ohRight : (W.ohSide ?? 0.9);
    const len = L + ohS + 0.18;
    const m = new THREE.Mesh(roofSlabGeo(len, t, W.d + ohF * 2, side > 0), mats);
    const ux = -side * Math.cos(a), uy = Math.sin(a);
    const nx = side * Math.sin(a), ny = Math.cos(a);
    const sc = (L + 0.18 - ohS) / 2;
    m.position.set(W.x + side * hw + ux * sc + nx * t / 2, y0 + W.eave + uy * sc + ny * t / 2, W.z);
    m.rotation.z = side < 0 ? a : -a;
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    if (strings) {
      const zf = W.z + W.d / 2 + ohF + 0.02;
      const p0 = V(W.x + side * hw - ux * ohS - nx * 0.07, y0 + W.eave - uy * ohS - ny * 0.07, zf);
      const p1 = V(W.x - nx * 0.07, y0 + W.ridge - ny * 0.07 + 0.05, zf);
      pointsAlong(p0, p1, 0.32, strings);
    }
  }
  g.add(box(0.34, 0.24, W.d + ohF * 2 + 0.02, M.fascia, W.x, y0 + W.ridge + t / Math.cos(a) - 0.02, W.z));
  const purl = [[0, W.ridge - 0.45], [-hw * 0.5, W.eave + rise * 0.5 - 0.4], [hw * 0.5, W.eave + rise * 0.5 - 0.4]];
  for (const [px, py] of purl) g.add(box(0.2, 0.26, W.d + ohF * 2 - 0.15, M.woodDark || M.roofUnder, W.x + px, y0 + py, W.z));
  return g;
}

/* Pedras de cunhal (chanfradas) ------------------------------------------- */
function quoins(M, corners, group) {
  const list = [];
  for (const c of corners) {
    const n = Math.floor((c.top - c.bottom) / 0.42);
    for (let k = 0; k < n; k++) {
      const long = k % 2 === 0;
      const ax = long ? 0.78 : 0.46, bz = long ? 0.46 : 0.78;
      list.push({ x: c.x - c.sx * (ax / 2 - 0.07), y: c.bottom + k * 0.42 + 0.2, z: c.z - c.sz * (bz / 2 - 0.07), ax, bz });
    }
  }
  const im = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 2, 0.07), M.quoin, list.length);
  const d = new THREE.Object3D();
  const col = new THREE.Color();
  list.forEach((q, i) => {
    d.position.set(q.x, q.y, q.z);
    d.scale.set(q.ax, 0.38, q.bz);
    d.rotation.set((Math.random() - 0.5) * 0.02, 0, (Math.random() - 0.5) * 0.02);
    d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
    const v = 0.86 + Math.random() * 0.22;
    im.setColorAt(i, col.setRGB(v, v * 0.985, v * 0.96));
  });
  im.castShadow = im.receiveShadow = true;
  group.add(im);
}

/**
 * Hotel completo para a cena externa.
 * Retorna { group, strings, lamps, chimneys, signMat, windows, anchors, decals, glass }
 */
export function buildHotel(M, { logoTex } = {}) {
  const g = new THREE.Group();
  const strings = [];
  const windows = [];
  const add = (o) => (g.add(o), o);
  const glass = createGlassSystem();

  const A = { x: -4.4, z: 0, w: 7.6, d: 9, eave: 7.3, ridge: 11.9, ohSide: 0.9, ohRight: 0.25, ohFront: 1.1 };
  const B = { x: 3.9, z: -1.4, w: 9.8, d: 10.6, eave: 8.0, ridge: 13.6, ohSide: 1.0, ohFront: 1.2 };
  add(gableWing(M, A, { strings }));
  add(gableWing(M, B, { strings }));
  const fA = A.z + A.d / 2, fB = B.z + B.d / 2;

  // embasamento em pedra
  add(block(A.w + 0.16, 0.9, A.d + 0.16, M.stone, A.x, 0, A.z));
  add(block(B.w + 0.16, 0.9, B.d + 0.16, M.stone, B.x, 0, B.z));
  // faixa de pedra (cintas) sob os beirais laterais
  quoins(M, [
    { x: A.x - A.w / 2, z: fA, sx: -1, sz: 1, bottom: 0.9, top: A.eave },
    { x: A.x + A.w / 2, z: fA, sx: 1, sz: 1, bottom: 3.5, top: A.eave },
    { x: A.x - A.w / 2, z: A.z - A.d / 2, sx: -1, sz: -1, bottom: 0.9, top: A.eave },
    { x: B.x + B.w / 2, z: fB, sx: 1, sz: 1, bottom: 0.9, top: B.eave },
    { x: B.x + B.w / 2, z: B.z - B.d / 2, sx: 1, sz: -1, bottom: 0.9, top: B.eave },
  ], g);

  // janelas: cell = índice no atlas de interiores (fotos reais), space = ambiente do site
  const win = (o, x, y, z, ry = 0) => {
    const mat = o.cell != null ? glass.make(o.cell, { k: o.k ?? 1, w: o.w, h: o.h, curtain: o.curtain ?? 1, depth: o.depth ?? 2.4 }) : M.glassOff;
    const u = windowUnit(M, { w: o.w, h: o.h, glass: mat, shutters: o.shutters ?? 'open', sill: o.sill ?? true, surround: o.surround ?? true });
    u.position.set(x, y, z);
    u.rotation.y = ry;
    add(u);
    if (o.space) windows.push({ mesh: u.userData.glass, space: o.space, mat });
    return u;
  };
  // ala A
  win({ w: 1.2, h: 1.2, cell: 0, k: 1.0, space: 'master' }, A.x, 9.35, fA);
  add(wreath(M, strings, A.x, 7.9, fA));
  win({ w: 1.5, h: 1.45, cell: 1, k: 0.85, space: 'luxo' }, A.x, 5.55, fA);
  // ala B
  const ocu = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.09, 10, 32), M.sill);
  ocu.position.set(B.x, 11.7, fB + 0.06);
  ocu.castShadow = true;
  add(ocu);
  const ocg = new THREE.Mesh(new THREE.CircleGeometry(0.46, 28), glass.make(5, { k: 0.55, w: 0.92, h: 0.92, curtain: 2 }));
  ocg.position.set(B.x, 11.7, fB + 0.02);
  ocg.userData.keep = true;
  add(ocg);
  win({ w: 1.25, h: 1.3, cell: 2, k: 1.0, space: 'master-triplo' }, B.x - 2.1, 9.3, fB);
  win({ w: 1.25, h: 1.3, cell: 3, k: 0.7, space: 'master-quadruplo', curtain: 2 }, B.x + 2.1, 9.3, fB);
  win({ w: 1.5, h: 1.45, shutters: 'closed' }, B.x - 2.2, 5.7, fB);
  win({ w: 1.5, h: 1.45, cell: 4, k: 0.9, space: 'luxo-triplo' }, B.x + 2.2, 5.7, fB);
  add(wreath(M, strings, B.x, 7.45, fB));
  // laterais
  const lA = A.x - A.w / 2, rB = B.x + B.w / 2;
  win({ w: 1.3, h: 1.35, cell: 5, k: 0.6, space: 'master' }, lA, 5.6, -2, -Math.PI / 2);
  win({ w: 1.3, h: 1.35, shutters: 'closed' }, lA, 5.6, 2, -Math.PI / 2);
  win({ w: 1.3, h: 1.35, cell: 10, k: 0.9, space: 'lareira' }, lA, 2.1, -1.5, -Math.PI / 2);
  win({ w: 1.3, h: 1.35, cell: 1, k: 0.75, space: 'luxo' }, rB, 5.8, -4.6, Math.PI / 2);
  win({ w: 1.3, h: 1.35, shutters: 'closed' }, rB, 5.8, -0.6, Math.PI / 2);
  win({ w: 1.3, h: 1.35, cell: 6, k: 1.0, space: 'cafe' }, rB, 2.2, -4.6, Math.PI / 2);
  win({ w: 1.3, h: 1.35, cell: 11, k: 0.6, space: 'lareira' }, rB, 2.2, -1.2, Math.PI / 2);
  // fundos
  win({ w: 1.3, h: 1.3, cell: 4, k: 0.7 }, A.x, 5.5, A.z - A.d / 2, Math.PI);
  win({ w: 1.3, h: 1.3, cell: 3, k: 0.5 }, B.x - 2, 5.7, B.z - B.d / 2, Math.PI);
  win({ w: 1.3, h: 1.3, cell: 2, k: 0.9 }, B.x + 2, 9.2, B.z - B.d / 2, Math.PI);

  // chaminés
  const chA = V(A.x - 1.9, 0, A.z - 2.2), chB = V(B.x + 2.7, 0, B.z - 3.0);
  add(block(1.05, 12.7 - 6, 1.05, M.stone, chA.x, 6, chA.z));
  add(block(1.35, 0.18, 1.35, M.fascia, chA.x, 12.7, chA.z));
  add(cyl(0.11, 0.11, 0.55, M.iron, chA.x, 12.88, chA.z, 10));
  add(block(1.15, 12.4 - 8, 1.15, M.stucco, chB.x, 8, chB.z));
  add(block(1.4, 0.18, 1.4, M.fascia, chB.x, 12.4, chB.z));

  // ----- varanda / restaurante térreo (frente envidraçada) -----
  const zF = 7.0, x0 = -8.7, x1 = 8.9;
  add(block(x1 - x0 + 0.2, 0.55, zF - 3.2, M.stone, (x0 + x1) / 2, 0, (zF + 3.2) / 2));
  const pillars = [-8.4, -4.7, -1.15, 1.35, 5.1, 8.6];
  for (const px of pillars) add(block(0.72, 3.3, 0.72, M.stone, px, 0, zF - 0.3));
  const bays = [[-8.4, -4.7, 'w', 8, 'lareira'], [-4.7, -1.15, 'w', 7, 'lareira'], [-1.15, 1.35, 'door', 9, 'recepcao'], [1.35, 5.1, 'w', 6, 'cafe'], [5.1, 8.6, 'w', 6, 'cafe']];
  bays.forEach(([a, b, type, cell, space], i) => {
    const cx = (a + b) / 2, bw = b - a - 0.72;
    add(block(bw + 0.02, 0.32, 0.5, M.stucco, cx, 2.98, zF - 0.32));
    if (type === 'w') {
      add(block(bw, 0.95, 0.24, M.panel, cx, 0.55, zF - 0.3));
      const mat = glass.make(cell, { k: i % 2 ? 0.95 : 1.1, w: bw - 0.2, h: 1.42, curtain: 1, depth: 3.2 });
      const w = windowUnit(M, { w: bw - 0.2, h: 1.42, glass: mat, shutters: null, sill: false });
      w.position.set(cx, 2.22, zF - 0.32);
      add(w);
      windows.push({ mesh: w.userData.glass, space, mat });
      add(block(bw, 2.5, 0.1, M.woodDark, cx, 0.5, zF - 0.62, false));
    } else {
      const dw = bw - 0.3;
      const mat = glass.make(cell, { k: 1.2, w: dw, h: 2.35, curtain: 0, depth: 3.6 });
      const door = new THREE.Mesh(new THREE.PlaneGeometry(dw, 2.35), mat);
      door.position.set(cx, 0.55 + 1.18, zF - 0.55);
      add(door);
      windows.push({ mesh: door, space, mat });
      add(box(0.12, 2.45, 0.2, M.frame, cx - dw / 2, 0.55 + 1.22, zF - 0.5));
      add(box(0.12, 2.45, 0.2, M.frame, cx + dw / 2, 0.55 + 1.22, zF - 0.5));
      add(box(dw + 0.24, 0.12, 0.2, M.frame, cx, 0.55 + 2.4, zF - 0.5));
    }
  });
  add(block(0.25, 3.3, zF - 3.4, M.stucco, x0 - 0.05, 0, (zF + 3.4) / 2));
  add(block(0.25, 3.3, zF - 3.4, M.stucco, x1 + 0.05, 0, (zF + 3.4) / 2));
  {
    const mat = glass.make(6, { k: 0.9, w: 1.7, h: 1.4, curtain: 1, depth: 3 });
    const sw = windowUnit(M, { w: 1.7, h: 1.4, glass: mat, shutters: null, sill: false });
    sw.position.set(x1 + 0.2, 2.1, 5.2);
    sw.rotation.y = Math.PI / 2;
    add(sw);
    windows.push({ mesh: sw.userData.glass, space: 'cafe', mat });
  }

  // telhado da varanda (telha colonial)
  {
    const zA = 3.2, yA = 4.15, zB = 7.8, yB = 3.32;
    const L = Math.hypot(zB - zA, yA - yB), ang = Math.atan2(yA - yB, zB - zA);
    const m = new THREE.Mesh(uvBox(x1 - x0 + 1.0, 0.18, L), [M.fascia, M.fascia, M.terracotta, M.roofUnder, M.fascia, M.fascia]);
    m.position.set((x0 + x1) / 2, (yA + yB) / 2 + 0.09, (zA + zB) / 2);
    m.rotation.x = ang;
    m.castShadow = m.receiveShadow = true;
    add(m);
    // calha
    const gut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, x1 - x0 + 1.0, 10, 1, true, 0, Math.PI), M.iron);
    gut.rotation.z = Math.PI / 2;
    gut.rotation.x = Math.PI;
    gut.position.set((x0 + x1) / 2, yB - 0.02, zB + 0.06);
    add(gut);
    pointsAlong(V(x0 - 0.5, yB - 0.08, zB + 0.05), V(x1 + 0.5, yB - 0.08, zB + 0.05), 0.3, strings);
  }

  // escadaria
  for (let k = 0; k < 4; k++) add(block(2.6, 0.14 * (4 - k), 0.62, M.sill, 0.1, 0, zF + 0.3 + k * 0.6));

  // postes de luz
  const lamps = [V(-1.9, 2.95, 9.9), V(2.15, 2.95, 9.9), V(-8.8, 2.95, 9.4)];
  for (const l of lamps) {
    add(cyl(0.05, 0.09, 2.75, M.iron, l.x, 0, l.z, 10));
    add(cyl(0.13, 0.13, 0.08, M.iron, l.x, 2.68, l.z, 12));
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.21, 20, 14), M.globe);
    gl.position.copy(l);
    add(gl);
  }

  // placa com logo
  const signMat = new THREE.MeshStandardMaterial({ color: 0xf3ebdb, roughness: 0.7, emissive: 0xffe0b0, emissiveIntensity: 0 });
  {
    const sx = 3.9, sz = 9.6;
    add(cyl(0.05, 0.05, 2.3, M.iron, sx - 0.85, 0, sz, 8));
    add(cyl(0.05, 0.05, 2.3, M.iron, sx + 0.85, 0, sz, 8));
    add(box(1.62, 1.18, 0.07, M.woodDark, sx, 1.55, sz));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.06), signMat);
    face.position.set(sx, 1.55, sz + 0.04);
    add(face);
    if (logoTex) {
      const lm = new THREE.MeshStandardMaterial({ map: logoTex, color: 0x2a160b, transparent: true, alphaTest: 0.2, roughness: 0.6 });
      const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.88), lm);
      logo.position.set(sx, 1.55, sz + 0.05);
      add(logo);
    }
  }

  // jardim: arbustos (tufos de folhas), vasos, flores
  const leafCards = [], cores = [];
  const bushAt = (x, z, s, y) => bushParts(x, y ?? s * 0.72, z, s * 1.1, s * 0.85, s, Math.round((x + 50) * 10 + z * 7), leafCards, cores);
  [[-7.7, 7.6, 0.75], [-6.2, 7.7, 0.6], [-4.1, 7.65, 0.7], [-2.4, 7.8, 0.55], [2.6, 7.75, 0.6], [4.6, 7.6, 0.72], [6.5, 7.7, 0.62], [8.2, 7.6, 0.75],
    [-9.6, 4.5, 0.9], [-9.8, 1.5, 1.0], [10.0, 2.0, 0.9], [10.2, -2.5, 1.1], [-5.5, 10.6, 0.5], [6.4, 10.5, 0.55]].forEach(([x, z, s]) => bushAt(x, z, s));
  for (const px of [-1.55, 1.75]) {
    add(cyl(0.34, 0.24, 0.55, M.pot, px, 0.55, zF + 0.1, 18));
    bushAt(px, zF + 0.1, 0.32, 1.35);
  }
  {
    const coreMesh = new THREE.Mesh(merge(cores), M.foliage);
    coreMesh.castShadow = coreMesh.receiveShadow = true;
    coreMesh.userData.keep = true;
    add(coreMesh);
    const leafMesh = new THREE.Mesh(merge(leafCards), M.leaves);
    leafMesh.customDepthMaterial = M.leavesDepth;
    leafMesh.castShadow = leafMesh.receiveShadow = true;
    leafMesh.userData.keep = true;
    add(leafMesh);
  }
  {
    const cols = [0xc8322f, 0xf2efe6, 0xd96aa0, 0x8e6bc4, 0xe0473a, 0xf6d36b].map((c) => new THREE.Color(c));
    const n = 420;
    const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.055, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), n);
    const d = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const left = i % 2 === 0;
      const x = left ? -8.6 + Math.random() * 7.0 : 2.4 + Math.random() * 6.8;
      d.position.set(x, 0.12 + Math.random() * 0.42, 8.0 + Math.random() * 1.5);
      d.scale.setScalar(0.6 + Math.random() * 0.9);
      d.updateMatrix();
      fl.setMatrixAt(i, d.matrix);
      fl.setColorAt(i, cols[i % cols.length]);
    }
    fl.castShadow = true;
    add(fl);
  }

  // sombras de contato no chão (oclusão ambiente "assada")
  const decals = new THREE.Group();
  {
    const tex = contactShadowTex();
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, map: tex, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const quad = (cx, cz, w, d, o = 0.55) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), o === 0.55 ? mat : Object.assign(mat.clone(), { opacity: o }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(cx, 0.025, cz);
      m.renderOrder = 1;
      decals.add(m);
    };
    quad(A.x, A.z, A.w + 3.2, A.d + 3.2);
    quad(B.x, B.z, B.w + 3.2, B.d + 3.2);
    quad((x0 + x1) / 2, 5.4, x1 - x0 + 3, 6.0, 0.45);
  }

  const anchors = [
    { id: 'master', label: 'Apartamentos', pos: V(A.x, 10.3, fA + 0.4) },
    { id: 'lareira', label: 'Salas com lareira', pos: V(chA.x, 13.4, chA.z) },
    { id: 'recepcao', label: 'Recepção 24h', pos: V(0.1, 3.1, zF - 0.2) },
    { id: 'cafe', label: 'Café da manhã', pos: V(3.2, 3.15, zF - 0.1) },
  ];

  return { group: g, strings, lamps, signMat, windows, anchors, decals, glass, chimneys: [V(chA.x, 13.3, chA.z), V(chB.x, 12.6, chB.z)] };
}

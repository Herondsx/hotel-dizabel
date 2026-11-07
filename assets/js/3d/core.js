// Núcleo 3D compartilhado: texturas PBR, materiais, helpers de geometria e natureza.
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */
export const rng = (seed = 1) => {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
};
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const cvs = (w, h = w) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

function canvasTex(c, { srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function grain(g, w, h, amt, r) {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amt;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

function wrap(S, x, y, fn) {
  for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(x + ox, y + oy);
}

/* ------------------------------------------------------------------ */
/* Texturas PBR (geradas offline em assets/tex)                        */
/* ------------------------------------------------------------------ */
const TEX_BASE = new URL('../../tex/', import.meta.url).href;
export const loadingManager = new THREE.LoadingManager();
const loader = new THREE.TextureLoader(loadingManager);
const texCache = new Map();
let maxAniso = 8;
export function setMaxAnisotropy(v) {
  maxAniso = Math.max(1, Math.min(16, v || 8));
}

let pending = 0;
const waiters = [];
export const texProgress = { loaded: 0, total: 0 };
function texDone() {
  texProgress.loaded++;
  pending = Math.max(0, pending - 1);
  if (pending === 0) waiters.splice(0).forEach((f) => f());
}
/** Promessa resolvida quando todas as texturas pedidas até agora terminaram de carregar. */
export function texturesReady() {
  return pending === 0 ? Promise.resolve() : new Promise((r) => waiters.push(r));
}

export function loadTex(file, { srgb = false, repeat = [1, 1], key = '' } = {}) {
  const k = `${file}|${repeat.join('x')}|${key}`;
  if (texCache.has(k)) return texCache.get(k);
  pending++;
  texProgress.total++;
  const t = loader.load(TEX_BASE + file, texDone, undefined, texDone);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = maxAniso;
  t.repeat.set(repeat[0], repeat[1]);
  texCache.set(k, t);
  return t;
}

/** Material PBR a partir de um conjunto <name>_c / _n / _orm.  tile = tamanho do ladrilho em metros. */
export function pbr(name, tile = 1, { color = 0xffffff, normal = 1, ao = 0.85, rough = 1, metal = 0, orm = true, extra = {} } = {}) {
  const t = Array.isArray(tile) ? tile : [tile, tile];
  const repeat = [1 / t[0], 1 / t[1]];
  const map = loadTex(`${name}_c.webp`, { srgb: true, repeat });
  const normalMap = loadTex(`${name}_n.webp`, { repeat });
  const o = orm ? loadTex(`${name}_orm.webp`, { repeat }) : null;
  return new THREE.MeshStandardMaterial({
    color,
    map,
    normalMap,
    normalScale: new THREE.Vector2(normal, normal),
    roughnessMap: o,
    aoMap: o,
    aoMapIntensity: ao,
    roughness: rough,
    metalness: metal,
    ...extra,
  });
}

/* ------------------------------------------------------------------ */
/* Texturas de canvas (pequenas)                                        */
/* ------------------------------------------------------------------ */
export function planksTex(base = [150, 90, 50], seed = 11, plankH = 26) {
  const S = 256, c = cvs(S), g = c.getContext('2d'), r = rng(seed);
  const rows = Math.round(S / plankH), rh = S / rows;
  for (let i = 0; i < rows; i++) {
    let x = -r() * 120;
    while (x < S) {
      const len = 90 + r() * 140;
      const v = (r() - 0.5) * 38;
      const col = `rgb(${base[0] + v},${base[1] + v * 0.7},${base[2] + v * 0.5})`;
      wrap(S, x, i * rh, (px, py) => {
        g.fillStyle = col;
        g.fillRect(px, py, len, rh);
        g.strokeStyle = 'rgba(40,20,8,0.5)';
        g.lineWidth = 1.5;
        g.strokeRect(px + 0.5, py + 0.5, len - 1, rh - 1);
      });
      x += len;
    }
  }
  grain(g, S, S, 14, r);
  return canvasTex(c);
}

export function windowGlowTex(seed = 1) {
  const c = cvs(128), g = c.getContext('2d'), r = rng(seed);
  const grd = g.createLinearGradient(0, 0, 0, 128);
  grd.addColorStop(0, '#ffcf8e');
  grd.addColorStop(0.55, '#ffb766');
  grd.addColorStop(1, '#a8582a');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  for (const side of [0, 1]) {
    const x0 = side ? 128 - 30 - r() * 8 : 0;
    const w = 30 + r() * 8;
    for (let i = 0; i < w; i += 4) {
      g.fillStyle = `rgba(255,240,215,${0.5 + 0.25 * Math.sin(i * 0.9)})`;
      g.fillRect(x0 + i, 0, 3, 128);
    }
  }
  g.fillStyle = 'rgba(90,40,15,0.45)';
  g.fillRect(36, 96, 56, 32);
  return canvasTex(c);
}

export function glowSpriteTex() {
  const c = cvs(64), g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function checkerTex(a = '#2a3756', b = '#f2efe8', n = 8) {
  const c = cvs(64), g = c.getContext('2d'), s = 64 / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      g.fillStyle = (i + j) % 2 ? a : b;
      g.fillRect(i * s, j * s, s, s);
    }
  return canvasTex(c);
}

export function tilesTex(base = '#e3dccd', line = '#b9b0a0', n = 8) {
  const c = cvs(128), g = c.getContext('2d'), s = 128 / n, r = rng(4);
  g.fillStyle = line;
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const v = (r() - 0.5) * 12;
      g.fillStyle = base;
      g.fillRect(i * s + 1, j * s + 1, s - 2, s - 2);
      g.fillStyle = v > 0 ? `rgba(255,255,255,${v / 60})` : `rgba(0,0,0,${-v / 60})`;
      g.fillRect(i * s + 1, j * s + 1, s - 2, s - 2);
    }
  return canvasTex(c);
}

// sombra de contato (gradiente retangular suave) para o chão
export function contactShadowTex() {
  const S = 256, c = cvs(S), g = c.getContext('2d');
  const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = Math.max(0, Math.abs(x - S / 2) - S * 0.3) / (S * 0.2);
      const dy = Math.max(0, Math.abs(y - S / 2) - S * 0.3) / (S * 0.2);
      const d = Math.min(1, Math.hypot(dx, dy));
      const a = Math.pow(1 - d, 2.2);
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = a * 255;
    }
  g.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}

/* ------------------------------------------------------------------ */
/* Materiais                                                            */
/* ------------------------------------------------------------------ */
export function createMaterials() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const glow = windowGlowTex(2), glow2 = windowGlowTex(7);
  const legacyGlass = (map, k) => {
    const m = std({ color: 0x14110e, roughness: 0.18, metalness: 0.35, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 1 });
    m.userData.k = k;
    return m;
  };
  const M = {
    stucco: pbr('stucco', 2.5, { normal: 1.0, color: 0xf2e9d8 }),
    trim: pbr('stucco', 1.2, { normal: 0.5, color: 0xf6f0e4 }),
    stone: pbr('stone', 1.6, { normal: 1.25, ao: 1 }),
    quoin: pbr('granite', 0.9, { normal: 1.0, color: 0xe2ded6 }),
    sill: pbr('granite', 0.9, { normal: 0.6, color: 0xeeeae3 }),
    roof: pbr('roof', 2.0, { normal: 1.1, ao: 1 }),
    terracotta: pbr('clay', 1.6, { normal: 1.5, ao: 1, color: 0xcfa595 }),
    roofUnder: pbr('woodboards', 2.0, { normal: 0.8, color: 0xc89a78 }),
    wood: pbr('woodboards', 2.0, { normal: 0.6, color: 0xb47c55 }),
    woodDark: pbr('woodboards', 2.0, { normal: 0.6, color: 0x6a4630 }),
    fascia: pbr('paint', 1, { color: 0x3c4842, normal: 0.6 }),
    frame: pbr('paint', 1, { color: 0x3e4c43, normal: 0.6 }),
    panel: pbr('paint', 1, { color: 0x4a5a50, normal: 0.6 }),
    shutter: pbr('louver', [1, 0.75], { normal: 1.1, ao: 1 }),
    pavers: pbr('pavers', 2.0, { normal: 1.0, ao: 1 }),
    grass: pbr('grass', 4.0, { normal: 0.7, ao: 0.6 }),
    iron: std({ color: 0x1b1a19, roughness: 0.45, metalness: 0.7 }),
    hedge: pbr('grass', 0.7, { color: 0x6f8f55, normal: 1.5, extra: { flatShading: false } }),
    hedgeDark: pbr('grass', 0.7, { color: 0x4d6a3e, normal: 1.5 }),
    pot: std({ color: 0xa65a35, roughness: 0.85 }),
    globe: std({ color: 0xfff1d8, emissive: 0xffd08a, emissiveIntensity: 2, roughness: 0.3 }),
    wreath: std({ color: 0x24391f, roughness: 0.9, flatShading: true }),
    foliage: std({ vertexColors: true, roughness: 0.92, flatShading: true }),
    bark: std({ vertexColors: true, roughness: 0.95 }),
    needles: new THREE.MeshStandardMaterial({
      map: loadTex('needles.webp', { srgb: true }),
      vertexColors: true,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
      roughness: 0.88,
    }),
    spruce: new THREE.MeshStandardMaterial({
      map: loadTex('spruce.webp', { srgb: true }),
      vertexColors: true,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.9,
    }),
    leaves: new THREE.MeshStandardMaterial({
      map: loadTex('leaves.webp', { srgb: true }),
      vertexColors: true,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.8,
    }),
    // vidros "simples" (usados na casca da maquete)
    glassA: legacyGlass(glow, 1.0),
    glassB: legacyGlass(glow2, 0.75),
    glassC: legacyGlass(glow, 0.45),
    glassOff: std({ color: 0x1b2024, roughness: 0.08, metalness: 0.7 }),
    door: std({ color: 0x1a0f08, emissive: 0xffffff, emissiveMap: glow2, emissiveIntensity: 1, roughness: 0.4 }),
  };
  M.needlesDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: M.needles.map, alphaTest: 0.42 });
  M.leavesDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: M.leaves.map, alphaTest: 0.5 });
  M.spruceDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: M.spruce.map, alphaTest: 0.5 });
  return { M };
}

/* ------------------------------------------------------------------ */
/* Geometria                                                           */
/* ------------------------------------------------------------------ */
export function uvBox(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++)
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * dims[f][0], uv.getY(k) * dims[f][1]);
    }
  return g;
}

// UV por projeção de caixa (em metros) para qualquer geometria
export function boxProjectUV(geo, scale = 1) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ax >= ay && ax >= az) [u, v] = [p.getZ(i), p.getY(i)];
    else if (ay >= az) [u, v] = [p.getX(i), p.getZ(i)];
    else [u, v] = [p.getX(i), p.getY(i)];
    uv[i * 2] = u * scale;
    uv[i * 2 + 1] = v * scale;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

export function box(w, h, d, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(uvBox(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

export function block(w, h, d, mat, x = 0, y = 0, z = 0, shadow = true) {
  return box(w, h, d, mat, x, y + h / 2, z, shadow);
}

export function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// funde geometrias (posição, normal, cor por vértice e — se houver — UV)
export function merge(parts) {
  let n = 0;
  const gs = parts.map((p) => {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    if (p.matrix) g.applyMatrix4(p.matrix);
    n += g.attributes.position.count;
    return g;
  });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  gs.forEach((g, i) => {
    const c = parts[i].color;
    const cnt = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    for (let k = 0; k < cnt; k++) {
      col[(o + k) * 3] = c.r;
      col[(o + k) * 3 + 1] = c.g;
      col[(o + k) * 3 + 2] = c.b;
    }
    o += cnt;
    g.dispose();
    parts[i].geo.dispose();
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const mat4 = (p, q, s) => new THREE.Matrix4().compose(p, q || new THREE.Quaternion(), s || V(1, 1, 1));

/* ------------------------------------------------------------------ */
/* Natureza                                                            */
/* ------------------------------------------------------------------ */
const BARK = new THREE.Color(0x5b4434);
const LEAF = [0x2d4a2a, 0x355630, 0x26402a, 0x3b5a33].map((c) => new THREE.Color(c));
const NEEDLE = [0x8fa58a, 0x7f9878, 0x9ab08f, 0x738c70].map((c) => new THREE.Color(c));

// tufo de agulhas: 4 cartões cruzados com a textura de agulhas (base no ponto do galho)
function needleTuft(parts, at, dir, s, color, r) {
  const outward = V(dir.x, 0, dir.z).normalize();
  const nrm = outward.clone().multiplyScalar(0.55).add(V(0, 1, 0)).normalize();
  for (let i = 0; i < 4; i++) {
    const g = new THREE.PlaneGeometry(1.9 * s, 1.7 * s);
    g.translate(0, 0.85 * s, 0);
    const q = new THREE.Quaternion()
      .setFromEuler(new THREE.Euler(0, Math.atan2(outward.x, outward.z) + (i * Math.PI) / 4 + r() * 0.3, 0))
      .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.35 - r() * 0.3, 0, (r() - 0.5) * 0.5)));
    // normal "da copa" (para cima/fora) — iluminação suave e volumosa
    const ln = nrm.clone().applyQuaternion(q.clone().invert());
    const n = g.attributes.normal;
    for (let k = 0; k < n.count; k++) n.setXYZ(k, ln.x, ln.y, ln.z);
    parts.push({ geo: g, matrix: mat4(at, q), color });
  }
  // cartão horizontal (coroa vista de cima)
  const h = new THREE.PlaneGeometry(2.2 * s, 2.2 * s);
  h.rotateX(-Math.PI / 2);
  h.translate(0, 0.55 * s, 0);
  const hn = h.attributes.normal;
  for (let k = 0; k < hn.count; k++) hn.setXYZ(k, nrm.x * 0.3, 1, nrm.z * 0.3);
  parts.push({ geo: h, matrix: mat4(at, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * 6, 0))), color });
}

// Araucária (pinheiro-do-paraná) — o símbolo de Campos do Jordão
export function araucariaGeo(seed = 1) {
  const r = rng(seed * 97 + 3);
  const H = 15 + r() * 4;
  const bark = [], cards = [];
  bark.push({ geo: new THREE.CylinderGeometry(0.15, 0.42, H, 8), matrix: mat4(V(0, H / 2, 0)), color: BARK });
  const whorls = 4 + Math.floor(r() * 2);
  for (let w = 0; w < whorls; w++) {
    const t = w / (whorls - 1);
    const y = H * (0.66 + 0.32 * t);
    const nb = 5 + Math.floor(r() * 2);
    const len = (5.0 - t * 3.0) * (0.85 + r() * 0.3);
    for (let b = 0; b < nb; b++) {
      const ang = (b / nb) * Math.PI * 2 + w * 0.9 + r() * 0.5;
      const elev = 0.05 + t * 0.45 + r() * 0.1;
      const dir = V(Math.cos(ang) * Math.cos(elev), Math.sin(elev), Math.sin(ang) * Math.cos(elev));
      const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
      const br = new THREE.CylinderGeometry(0.035, 0.09, len, 5);
      br.translate(0, len / 2, 0);
      bark.push({ geo: br, matrix: mat4(V(0, y, 0), q), color: BARK });
      const end = V(0, y, 0).addScaledVector(dir, len);
      const s = (0.85 + r() * 0.35) * (1 - t * 0.15);
      const c = NEEDLE[Math.floor(r() * 4)];
      needleTuft(cards, end, dir, s, c, r);
      if (len > 2.6) needleTuft(cards, V(0, y, 0).addScaledVector(dir, len * 0.58), dir, s * 0.62, NEEDLE[Math.floor(r() * 4)], r);
    }
  }
  needleTuft(cards, V(0, H - 0.2, 0), V(0.01, 1, 0), 1.0, NEEDLE[1], r);
  return { bark: merge(bark), leaves: merge(cards), height: H, kind: 'needles' };
}

// cartão orientado por eixos (x = tangente, y = direção do "leque"), normal da copa
function card(parts, at, xAxis, yAxis, w, h, nrm, color, centered = false) {
  const g = new THREE.PlaneGeometry(w, h);
  if (!centered) g.translate(0, h / 2, 0);
  const z = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
  const m = new THREE.Matrix4().makeBasis(xAxis.clone().normalize(), yAxis.clone().normalize(), z);
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  const ln = nrm.clone().applyQuaternion(q.clone().invert());
  const n = g.attributes.normal;
  for (let k = 0; k < n.count; k++) n.setXYZ(k, ln.x, ln.y, ln.z);
  parts.push({ geo: g, matrix: mat4(at, q), color });
}

// Pinheiro: silhuetas cruzadas com textura desenhada (técnica clássica, leve e convincente)
export function pineGeo(seed = 1) {
  const r = rng(seed * 31 + 7);
  const s = 0.9 + r() * 0.4;
  const H = 10.5 * s, Wd = 4.6 * s * (0.85 + r() * 0.3);
  const bark = [{ geo: new THREE.CylinderGeometry(0.08, 0.26, H * 0.25, 6), matrix: mat4(V(0, H * 0.125, 0)), color: BARK }];
  const cards = [];
  const up = V(0, 1, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 4 + r() * 0.2;
    const g = new THREE.PlaneGeometry(Wd, H, 2, 1);
    g.translate(0, H / 2, 0);
    const xAxis = V(Math.cos(a), 0, Math.sin(a));
    const q = new THREE.Quaternion().setFromAxisAngle(up, -a);
    const n = g.attributes.normal, p = g.attributes.position;
    for (let k = 0; k < n.count; k++) {
      const sx = Math.sign(p.getX(k));
      const wn = xAxis.clone().multiplyScalar(sx * 0.75).add(V(0, 0.65, 0)).normalize();
      const ln = wn.applyQuaternion(q.clone().invert());
      n.setXYZ(k, ln.x, ln.y, ln.z);
    }
    cards.push({ geo: g, matrix: mat4(V(0, 0.3, 0), q), color: new THREE.Color(0.78 + r() * 0.12, 0.85 + r() * 0.1, 0.8) });
  }
  return { bark: merge(bark), leaves: merge(cards), height: H, kind: 'spruce' };
}

function outwardCard(parts, p, dir, s, nrm, col, r) {
  const rnd = V(r() - 0.5, r() - 0.5, r() - 0.5);
  const xa = new THREE.Vector3().crossVectors(dir, rnd.lengthSq() > 1e-4 ? rnd : V(0, 1, 0)).normalize();
  const ya = new THREE.Vector3().crossVectors(dir, xa).normalize();
  card(parts, p, xa, ya, s, s, nrm, col, true);
}

// Árvore de copa arredondada (folhas em tufos voltados para fora + miolo escuro)
export function roundTreeGeo(seed = 1) {
  const r = rng(seed * 53 + 11);
  const H = 5 + r() * 3;
  const bark = [{ geo: new THREE.CylinderGeometry(0.14, 0.3, H * 0.75, 7), matrix: mat4(V(0, H * 0.375, 0)), color: BARK }];
  const R = 2.1 + r() * 0.8;
  const c0 = V(0, H * 0.72, 0);
  bark.push({ geo: new THREE.IcosahedronGeometry(1, 2), matrix: mat4(c0, null, V(R * 0.78, R * 0.66, R * 0.78)), color: new THREE.Color(0x1d3216) });
  const cards = [];
  const n = 54;
  for (let i = 0; i < n; i++) {
    const dir = V(r() * 2 - 1, (r() * 2 - 1) * 0.85 + 0.1, r() * 2 - 1).normalize();
    const d = R * (0.78 + 0.22 * r());
    const p = c0.clone().add(V(dir.x * d, dir.y * d * 0.82, dir.z * d));
    const nrm = dir.clone().add(V(0, 0.3, 0)).normalize();
    const col = LEAF[Math.floor(r() * 4)].clone().offsetHSL(0.03, 0.05, 0.12 + dir.y * 0.06);
    const s = 1.35 + r() * 0.6;
    outwardCard(cards, p, dir, s, nrm, col, r);
    if (i % 2) outwardCard(cards, p, dir.clone().add(V(r() - 0.5, 0.4, r() - 0.5)).normalize(), s * 0.8, nrm, col, r);
  }
  return { bark: merge(bark), leaves: merge(cards), height: H, kind: 'leaves' };
}

// Arbusto (para jardins): miolo escuro + tufos de folhas
export function bushParts(x, y, z, sx, sy, sz, seed, cards, cores) {
  const r = rng(seed * 17 + 3);
  const core = new THREE.IcosahedronGeometry(1, 2);
  cores.push({ geo: core, matrix: mat4(V(x, y, z), null, V(sx * 0.8, sy * 0.76, sz * 0.8)), color: new THREE.Color(0x1f3318) });
  const n = Math.round(12 + sx * sz * 14);
  for (let i = 0; i < n; i++) {
    const dir = V(r() * 2 - 1, r() * 1.4 - 0.25, r() * 2 - 1).normalize();
    const p = V(x + dir.x * sx * 0.82, y + dir.y * sy * 0.78, z + dir.z * sz * 0.82);
    const nrm = dir.clone().add(V(0, 0.45, 0)).normalize();
    const col = LEAF[Math.floor(r() * 4)].clone().offsetHSL(0.02, 0.04, 0.08);
    const s = 0.5 + r() * 0.3 * Math.min(sx, 1.2);
    outwardCard(cards, p, dir, s, nrm, col, r);
  }
}

/**
 * Florestas instanciadas.  list: [{ type: 'araucaria'|'pine'|'round', x, z, y?, s?, rot?, variant? }]
 */
export function forest(list, M, { variants = 3, shadows = true } = {}) {
  const group = new THREE.Group();
  const makers = { araucaria: araucariaGeo, pine: pineGeo, round: roundTreeGeo };
  const buckets = {};
  list.forEach((t, i) => {
    const v = (t.variant ?? i) % variants;
    const key = `${t.type}:${v}`;
    (buckets[key] ||= { type: t.type, v, items: [] }).items.push(t);
  });
  const dummy = new THREE.Object3D();
  for (const key in buckets) {
    const { type, v, items } = buckets[key];
    const geo = makers[type](v + 1);
    const barkM = new THREE.InstancedMesh(geo.bark, M.bark, items.length);
    const leafMat = { needles: M.needles, leaves: M.leaves, spruce: M.spruce }[geo.kind] || M.foliage;
    const leafM = new THREE.InstancedMesh(geo.leaves, leafMat, items.length);
    const depth = { needles: M.needlesDepth, leaves: M.leavesDepth, spruce: M.spruceDepth }[geo.kind];
    if (depth) leafM.customDepthMaterial = depth;
    items.forEach((t, i) => {
      dummy.position.set(t.x, t.y ?? 0, t.z);
      dummy.rotation.set(0, t.rot ?? (i * 2.39), 0);
      dummy.scale.setScalar(t.s ?? 1);
      dummy.updateMatrix();
      barkM.setMatrixAt(i, dummy.matrix);
      leafM.setMatrixAt(i, dummy.matrix);
    });
    for (const m of [barkM, leafM]) {
      m.castShadow = shadows;
      m.receiveShadow = true;
      m.computeBoundingSphere();
      group.add(m);
    }
  }
  return group;
}

/* ------------------------------------------------------------------ */
/* Pontos de luz (cordões de luz)                                      */
/* ------------------------------------------------------------------ */
export function lightPoints(positions, { color = 0xffd9a0, size = 1, intensity = 1 } = {}) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const seeds = new Float32Array(positions.length / 3).map(() => Math.random());
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: size },
      uIntensity: { value: intensity },
      uColor: { value: new THREE.Color(color) },
      uPR: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed; uniform float uTime, uSize, uPR; varying float vTw;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uPR * (60.0 / -mv.z);
        vTw = 0.8 + 0.2 * sin(uTime * 2.2 + aSeed * 40.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uIntensity; varying float vTw;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = exp(-d * d * 60.0) + 0.35 * exp(-d * d * 10.0);
        gl_FragColor = vec4(uColor * vTw * (1.0 + 2.5 * exp(-d*d*80.0)), a * uIntensity);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

export function pointsAlong(a, b, spacing = 0.35, out = []) {
  const n = Math.max(2, Math.round(a.distanceTo(b) / spacing));
  for (let i = 0; i <= n; i++) {
    const p = a.clone().lerp(b, i / n);
    out.push(p.x, p.y, p.z);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* "Assar" grupos estáticos: funde malhas por material (menos draw calls) */
/* ------------------------------------------------------------------ */
function concatGeos(geos) {
  let n = 0;
  for (const g of geos) n += g.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of geos) {
    pos.set(g.pos, o * 3);
    nor.set(g.nor, o * 3);
    uv.set(g.uv, o * 2);
    o += g.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
}

export function bake(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map();
  const remove = [];
  const m4 = new THREE.Matrix4();
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.visible) return;
    for (let p = o; p && p !== group; p = p.parent) if (p.userData.keep) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some((m) => m.transparent || m.isShaderMaterial)) return;
    m4.multiplyMatrices(inv, o.matrixWorld);
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(m4);
    const P = g.attributes.position.array, N = g.attributes.normal.array;
    const U = g.attributes.uv ? g.attributes.uv.array : new Float32Array(g.attributes.position.count * 2);
    const ranges = Array.isArray(o.material) && g.groups.length
      ? g.groups.map((gr) => ({ start: gr.start, count: gr.count, mat: o.material[gr.materialIndex] }))
      : [{ start: 0, count: g.attributes.position.count, mat: mats[0] }];
    for (const r of ranges) {
      if (!r.mat) continue;
      const key = r.mat.uuid + (o.castShadow ? ':s' : ':n');
      if (!buckets.has(key)) buckets.set(key, { mat: r.mat, cast: o.castShadow, geos: [] });
      buckets.get(key).geos.push({
        count: r.count,
        pos: P.subarray(r.start * 3, (r.start + r.count) * 3),
        nor: N.subarray(r.start * 3, (r.start + r.count) * 3),
        uv: U.subarray(r.start * 2, (r.start + r.count) * 2),
      });
    }
    remove.push(o);
  });
  remove.forEach((o) => {
    o.parent.remove(o);
    o.geometry.dispose();
  });
  for (const { mat, cast, geos } of buckets.values()) {
    const mesh = new THREE.Mesh(concatGeos(geos), mat);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

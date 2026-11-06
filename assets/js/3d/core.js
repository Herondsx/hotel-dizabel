// Núcleo 3D compartilhado: texturas procedurais, materiais, helpers de geometria e natureza.
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

function tex(c, { srgb = true } = {}) {
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

// desenha nas 9 posições para a textura ficar contínua (tileable)
function wrap(S, x, y, fn) {
  for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(x + ox, y + oy);
}

function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/* ------------------------------------------------------------------ */
/* Texturas procedurais                                                */
/* ------------------------------------------------------------------ */
export function stuccoTex(base = '#ebdfc8', seed = 3) {
  const S = 256, c = cvs(S), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 110; i++) {
    const x = r() * S, y = r() * S, rad = 5 + r() * 36, a = r() * 0.055, dark = r() < 0.55;
    wrap(S, x, y, (px, py) => {
      g.fillStyle = dark ? `rgba(110,85,50,${a})` : `rgba(255,252,240,${a})`;
      g.beginPath();
      g.arc(px, py, rad, 0, 7);
      g.fill();
    });
  }
  grain(g, S, S, 24, r);
  return tex(c);
}

export function stoneTex(seed = 5, palette = ['#8f8b83', '#7a766f', '#a29b8f', '#6d6a63', '#aaa497', '#857f74'], mortar = '#4d4943') {
  const S = 256, c = cvs(S), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = mortar;
  g.fillRect(0, 0, S, S);
  const rows = [32, 28, 36, 30, 34, 26, 40, 30];
  let y = 0;
  for (const rh of rows) {
    const widths = [];
    let rem = S;
    while (rem > 0) {
      let w = 30 + r() * 44;
      if (rem - w < 30) w = rem;
      widths.push(w);
      rem -= w;
    }
    const xo = r() * S;
    let x = 0;
    for (const sw of widths) {
      const col = palette[Math.floor(r() * palette.length)];
      const jx = (r() - 0.5) * 3, jh = (r() - 0.5) * 4;
      wrap(S, x + xo, y, (px, py) => {
        g.fillStyle = col;
        rrect(g, px + 2 + jx, py + 2, sw - 4, rh - 4 + jh, 7);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.07)';
        rrect(g, px + 4, py + 3, sw - 10, (rh - 6) * 0.45, 5);
        g.fill();
      });
      x += sw;
    }
    y += rh;
  }
  grain(g, S, S, 30, r);
  return tex(c);
}

export function shinglesTex(base = [66, 78, 74], seed = 9) {
  const S = 256, c = cvs(S), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = 'rgb(28,33,31)';
  g.fillRect(0, 0, S, S);
  const rows = 10, rh = S / rows;
  for (let i = 0; i < rows; i++) {
    const cols = 9, cw = S / cols, off = (i % 2) * cw * 0.5;
    for (let j = -1; j <= cols; j++) {
      const v = (r() - 0.5) * 26;
      g.fillStyle = `rgb(${base[0] + v},${base[1] + v},${base[2] + v})`;
      g.fillRect(j * cw + off + 1, i * rh, cw - 2, rh - 2);
      g.fillStyle = 'rgba(0,0,0,0.28)';
      g.fillRect(j * cw + off + 1, i * rh + rh - 6, cw - 2, 4);
    }
  }
  grain(g, S, S, 16, r);
  const t = tex(c);
  t.rotation = Math.PI / 2;
  return t;
}

export function terracottaTex(seed = 17) {
  const S = 256, c = cvs(S), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = '#5a2414';
  g.fillRect(0, 0, S, S);
  const rows = 8, rh = S / rows, cols = 10, cw = S / cols;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const v = (r() - 0.5) * 30;
      const grd = g.createLinearGradient(j * cw, 0, j * cw + cw, 0);
      grd.addColorStop(0, `rgb(${120 + v},${52 + v * 0.5},${30})`);
      grd.addColorStop(0.5, `rgb(${178 + v},${86 + v * 0.5},${52})`);
      grd.addColorStop(1, `rgb(${112 + v},${48 + v * 0.5},${28})`);
      g.fillStyle = grd;
      g.fillRect(j * cw + 1, i * rh, cw - 2, rh - 3);
    }
  }
  grain(g, S, S, 18, r);
  const t = tex(c);
  t.rotation = Math.PI / 2;
  return t;
}

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
      // veios
      g.strokeStyle = 'rgba(60,30,10,0.18)';
      g.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        const yy = i * rh + 4 + r() * (rh - 8);
        g.beginPath();
        g.moveTo(x, yy);
        g.bezierCurveTo(x + len * 0.3, yy + (r() - 0.5) * 6, x + len * 0.6, yy + (r() - 0.5) * 6, x + len, yy);
        g.stroke();
      }
      x += len;
    }
  }
  grain(g, S, S, 14, r);
  return tex(c);
}

export function grassTex(seed = 13) {
  const S = 256, c = cvs(S), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = '#4c6a33';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 260; i++) {
    const x = r() * S, y = r() * S, rad = 2 + r() * 18, light = r() < 0.5, a = 0.05 + r() * 0.12;
    wrap(S, x, y, (px, py) => {
      g.fillStyle = light ? `rgba(130,160,70,${a})` : `rgba(30,50,20,${a})`;
      g.beginPath();
      g.arc(px, py, rad, 0, 7);
      g.fill();
    });
  }
  grain(g, S, S, 40, r);
  return tex(c);
}

export function slatsTex() {
  const c = cvs(64), g = c.getContext('2d');
  g.fillStyle = '#7d8c78';
  g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8) {
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.fillRect(0, y + 6, 64, 2);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fillRect(0, y, 64, 2);
  }
  return tex(c);
}

// "interior" iluminado visto pela janela: cortinas + gradiente quente
export function windowGlowTex(seed = 1) {
  const c = cvs(128), g = c.getContext('2d'), r = rng(seed);
  const grd = g.createLinearGradient(0, 0, 0, 128);
  grd.addColorStop(0, '#ffcf8e');
  grd.addColorStop(0.55, '#ffb766');
  grd.addColorStop(1, '#a8582a');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  // luminária
  const lg = g.createRadialGradient(64, 34, 2, 64, 34, 50);
  lg.addColorStop(0, 'rgba(255,245,220,0.9)');
  lg.addColorStop(1, 'rgba(255,245,220,0)');
  g.fillStyle = lg;
  g.fillRect(0, 0, 128, 128);
  // cortinas
  for (const side of [0, 1]) {
    const x0 = side ? 128 - 30 - r() * 8 : 0;
    const w = 30 + r() * 8;
    for (let i = 0; i < w; i += 4) {
      g.fillStyle = `rgba(255,240,215,${0.5 + 0.25 * Math.sin(i * 0.9)})`;
      g.fillRect(x0 + i, 0, 3, 128);
    }
  }
  // silhueta de móveis
  g.fillStyle = 'rgba(90,40,15,0.45)';
  g.fillRect(36, 96, 56, 32);
  return tex(c);
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
  return tex(c);
}

export function tilesTex(base = '#e3dccd', line = '#b9b0a0', n = 8) {
  const c = cvs(128), g = c.getContext('2d'), s = 128 / n, r = rng(4);
  g.fillStyle = line;
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const v = (r() - 0.5) * 12;
      g.fillStyle = base;
      g.globalAlpha = 1;
      g.fillRect(i * s + 1, j * s + 1, s - 2, s - 2);
      g.fillStyle = v > 0 ? `rgba(255,255,255,${v / 60})` : `rgba(0,0,0,${-v / 60})`;
      g.fillRect(i * s + 1, j * s + 1, s - 2, s - 2);
    }
  return tex(c);
}

/* ------------------------------------------------------------------ */
/* Materiais                                                            */
/* ------------------------------------------------------------------ */
export function createMaterials() {
  const T = {
    stucco: stuccoTex(),
    stone: stoneTex(),
    roof: shinglesTex(),
    terracotta: terracottaTex(),
    planks: planksTex(),
    grass: grassTex(),
    pavers: stoneTex(21, ['#a9a397', '#9b958a', '#b6b0a3', '#8e897e'], '#5f5a52'),
    slats: slatsTex(),
    glow: windowGlowTex(2),
    glow2: windowGlowTex(7),
  };
  // UVs estão em metros: repeat = 1 / tamanho do ladrilho (m)
  T.stucco.repeat.set(1 / 3.2, 1 / 3.2);
  T.stone.repeat.set(1 / 1.7, 1 / 1.7);
  T.roof.repeat.set(1 / 2.6, 1 / 2.6);
  T.terracotta.repeat.set(1 / 2.2, 1 / 2.2);
  T.planks.repeat.set(1 / 3, 1 / 3);
  T.grass.repeat.set(1 / 9, 1 / 9);
  T.pavers.repeat.set(1 / 2.2, 1 / 2.2);
  T.slats.repeat.set(1, 1);

  const std = (o) => new THREE.MeshStandardMaterial(o);
  const glass = (map, k) => {
    const m = std({ color: 0x14110e, roughness: 0.18, metalness: 0.35, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 1 });
    m.userData.k = k; // fator de brilho noturno
    return m;
  };
  const M = {
    stucco: std({ map: T.stucco, roughness: 0.95 }),
    stone: std({ map: T.stone, roughness: 0.92 }),
    quoin: std({ color: 0x8d887f, roughness: 0.95, flatShading: true }),
    roof: std({ map: T.roof, roughness: 0.72, metalness: 0.05 }),
    roofUnder: std({ color: 0x6a4026, roughness: 0.85 }),
    fascia: std({ color: 0x38433e, roughness: 0.7 }),
    frame: std({ color: 0x3d4b42, roughness: 0.55 }),
    shutter: std({ map: T.slats, roughness: 0.7 }),
    panel: std({ color: 0x46534a, roughness: 0.7 }),
    terracotta: std({ map: T.terracotta, roughness: 0.8 }),
    wood: std({ color: 0x6e4325, roughness: 0.7 }),
    woodDark: std({ color: 0x3e2617, roughness: 0.7 }),
    iron: std({ color: 0x1b1a19, roughness: 0.45, metalness: 0.6 }),
    sill: std({ color: 0xcfc6b4, roughness: 0.9 }),
    grass: std({ map: T.grass, roughness: 1 }),
    pavers: std({ map: T.pavers, roughness: 0.95 }),
    hedge: std({ color: 0x3a5a2c, roughness: 0.95, flatShading: true }),
    hedgeDark: std({ color: 0x2b4422, roughness: 0.95, flatShading: true }),
    pot: std({ color: 0xa65a35, roughness: 0.85 }),
    globe: std({ color: 0xfff1d8, emissive: 0xffd08a, emissiveIntensity: 2, roughness: 0.3 }),
    door: std({ color: 0x1a0f08, emissive: 0xffffff, emissiveMap: T.glow2, emissiveIntensity: 1, roughness: 0.4 }),
    wreath: std({ color: 0x24391f, roughness: 0.9, flatShading: true }),
    foliage: std({ vertexColors: true, roughness: 0.92, flatShading: true }),
    bark: std({ vertexColors: true, roughness: 0.95, flatShading: true }),
    sign: std({ color: 0xf1e8d6, roughness: 0.7 }),
    glassA: glass(T.glow, 1.0),
    glassB: glass(T.glow2, 0.75),
    glassC: glass(T.glow, 0.45),
    glassOff: std({ color: 0x1b2024, roughness: 0.12, metalness: 0.6 }),
  };
  return { T, M };
}

/* ------------------------------------------------------------------ */
/* Geometria                                                           */
/* ------------------------------------------------------------------ */
// Caixa com UV em metros (textura não estica)
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

export function box(w, h, d, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(uvBox(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

// caixa apoiada no chão (y = base)
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

// funde várias geometrias em uma (com cores por vértice)
export function merge(parts) {
  let n = 0;
  const gs = parts.map((p) => {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    if (p.matrix) g.applyMatrix4(p.matrix);
    n += g.attributes.position.count;
    return g;
  });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  gs.forEach((g, i) => {
    const c = parts[i].color;
    const cnt = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
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

// Araucária (pinheiro-do-paraná) — o símbolo de Campos do Jordão
export function araucariaGeo(seed = 1) {
  const r = rng(seed * 97 + 3);
  const H = 15 + r() * 4;
  const bark = [], leaves = [];
  bark.push({ geo: new THREE.CylinderGeometry(0.15, 0.42, H, 7), matrix: mat4(V(0, H / 2, 0)), color: BARK });
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
      const br = new THREE.CylinderGeometry(0.035, 0.09, len, 4);
      br.translate(0, len / 2, 0);
      bark.push({ geo: br, matrix: mat4(V(0, y, 0), q), color: BARK });
      // ponta virada para cima (formato de candelabro)
      const end = V(0, y, 0).addScaledVector(dir, len);
      const tip = new THREE.CylinderGeometry(0.03, 0.05, 1.1, 4);
      tip.translate(0, 0.55, 0);
      bark.push({ geo: tip, matrix: mat4(end, new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(ang) * 0.35, 0, -Math.cos(ang) * 0.35))), color: BARK });
      const s = (0.85 + r() * 0.35) * (1 - t * 0.15);
      const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(ang) * 0.32, r() * 3, -Math.cos(ang) * 0.32));
      leaves.push({ geo: new THREE.IcosahedronGeometry(1, 1), matrix: mat4(end.clone().add(V(0, 0.75 * s, 0)), tilt, V(1.55 * s, 0.75 * s, 1.55 * s)), color: LEAF[Math.floor(r() * 4)] });
      if (len > 2.6) {
        const mid = V(0, y, 0).addScaledVector(dir, len * 0.6);
        leaves.push({ geo: new THREE.IcosahedronGeometry(1, 0), matrix: mat4(mid.add(V(0, 0.3, 0)), tilt, V(0.9 * s, 0.42 * s, 0.9 * s)), color: LEAF[Math.floor(r() * 4)] });
      }
    }
  }
  leaves.push({ geo: new THREE.IcosahedronGeometry(1, 1), matrix: mat4(V(0, H + 0.3, 0), null, V(1.3, 0.6, 1.3)), color: LEAF[1] });
  return { bark: merge(bark), leaves: merge(leaves), height: H };
}

// Pinheiro/cipreste cônico
export function pineGeo(seed = 1) {
  const r = rng(seed * 31 + 7);
  const H = 8 + r() * 5;
  const bark = [{ geo: new THREE.CylinderGeometry(0.12, 0.25, H * 0.3, 6), matrix: mat4(V(0, H * 0.15, 0)), color: BARK }];
  const leaves = [];
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const rad = (1 - t) * (1.9 + r() * 0.5) + 0.3;
    const h = H * 0.42;
    leaves.push({ geo: new THREE.ConeGeometry(rad, h, 7), matrix: mat4(V(0, H * 0.22 + t * H * 0.62 + h / 2, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * 3, 0))), color: LEAF[i % 3 === 0 ? 2 : 0] });
  }
  return { bark: merge(bark), leaves: merge(leaves), height: H };
}

// Árvore arredondada
export function roundTreeGeo(seed = 1) {
  const r = rng(seed * 53 + 11);
  const H = 5 + r() * 3;
  const bark = [{ geo: new THREE.CylinderGeometry(0.16, 0.3, H * 0.6, 6), matrix: mat4(V(0, H * 0.3, 0)), color: BARK }];
  const leaves = [];
  const n = 5 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = r() * 1.4;
    const s = 1.3 + r() * 1.1;
    leaves.push({ geo: new THREE.IcosahedronGeometry(1, 1), matrix: mat4(V(Math.cos(a) * d, H * 0.62 + r() * 1.8, Math.sin(a) * d), null, V(s, s * 0.85, s)), color: LEAF[Math.floor(r() * 4)].clone().offsetHSL(0.02, 0, 0.03) });
  }
  return { bark: merge(bark), leaves: merge(leaves), height: H };
}

/**
 * Cria florestas instanciadas.
 * list: [{ type: 'araucaria'|'pine'|'round', x, z, y?, s?, rot? }]
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
    const leafM = new THREE.InstancedMesh(geo.leaves, M.foliage, items.length);
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
/* Pontos de luz (cordões de luz, vagalumes)                           */
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
        gl_FragColor = vec4(uColor * vTw * (1.0 + exp(-d*d*80.0)), a * uIntensity);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

// pontos ao longo de uma linha
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
    if (mats.some((m) => m.transparent)) return;
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

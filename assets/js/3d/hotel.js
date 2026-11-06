// Modelo procedural da fachada do Hotel Solar D'Izabel (estilo montanha / alpino)
import * as THREE from 'three';
import { box, block, cyl, uvBox, pointsAlong } from './core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* Janela com caixilho, peitoril e venezianas ------------------------------- */
export function windowUnit(M, { w = 1.3, h = 1.4, glass = M.glassA, shutters = 'open', sill = true } = {}) {
  const g = new THREE.Group();
  const fr = 0.09;
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glass);
  gl.position.z = 0.02;
  g.add(gl);
  g.add(box(w + fr * 2, fr, 0.14, M.frame, 0, h / 2 + fr / 2, 0.05, false));
  g.add(box(w + fr * 2, fr, 0.14, M.frame, 0, -h / 2 - fr / 2, 0.05, false));
  g.add(box(fr, h, 0.14, M.frame, -w / 2 - fr / 2, 0, 0.05, false));
  g.add(box(fr, h, 0.14, M.frame, w / 2 + fr / 2, 0, 0.05, false));
  g.add(box(0.05, h, 0.06, M.frame, 0, 0, 0.05, false));
  g.add(box(w, 0.05, 0.06, M.frame, 0, h * 0.2, 0.05, false));
  if (sill) g.add(box(w + 0.4, 0.09, 0.28, M.sill, 0, -h / 2 - fr - 0.04, 0.1));
  if (shutters === 'open')
    for (const s of [-1, 1]) g.add(box(w / 2 + 0.04, h + 0.12, 0.05, M.shutter, s * (w / 2 + fr + w / 4 + 0.08), 0, 0.07));
  if (shutters === 'closed')
    for (const s of [-1, 1]) g.add(box(w / 2, h, 0.05, M.shutter, s * (w / 4), 0, 0.09));
  return g;
}

/* Guirlanda (a fachada real tem guirlandas iluminadas) --------------------- */
export function wreath(M, strings, x, y, z) {
  const g = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.13, 6, 18), M.wreath);
  g.position.set(x, y, z + 0.08);
  g.castShadow = true;
  if (strings)
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      strings.push(x + Math.cos(a) * 0.42, y + Math.sin(a) * 0.42, z + 0.22);
    }
  return g;
}

/**
 * Ala com empena (telhado de duas águas, cumeeira no eixo Z).
 * W = { x, z, w, d, eave, ridge, ohSide, ohFront, y0 }
 * Se eave === 0 cria só o "triângulo" da empena (usado na maquete).
 */
export function gableWing(M, W, { strings, bodyMat = M.stucco, roofMats } = {}) {
  const g = new THREE.Group();
  const hw = W.w / 2, rise = W.ridge - W.eave;
  const y0 = W.y0 || 0;
  const ohF = W.ohFront ?? 1.0;

  // corpo (pentágono extrudado)
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

  // águas do telhado
  const t = 0.3;
  const L = Math.hypot(hw, rise), a = Math.atan2(rise, hw);
  const mats = roofMats || [M.fascia, M.fascia, M.roof, M.roofUnder, M.fascia, M.fascia];
  for (const side of [-1, 1]) {
    const ohS = side > 0 && W.ohRight != null ? W.ohRight : (W.ohSide ?? 0.9);
    const len = L + ohS + 0.18;
    const m = new THREE.Mesh(uvBox(len, t, W.d + ohF * 2), mats);
    const ux = -side * Math.cos(a), uy = Math.sin(a);
    const nx = side * Math.sin(a), ny = Math.cos(a);
    const sc = (L + 0.18 - ohS) / 2;
    m.position.set(W.x + side * hw + ux * sc + nx * t / 2, y0 + W.eave + uy * sc + ny * t / 2, W.z);
    m.rotation.z = side < 0 ? a : -a;
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    // cordão de luz sob a borda da empena frontal
    if (strings) {
      const zf = W.z + W.d / 2 + ohF + 0.02;
      const p0 = V(W.x + side * hw - ux * ohS - nx * 0.07, y0 + W.eave - uy * ohS - ny * 0.07, zf);
      const p1 = V(W.x - nx * 0.07, y0 + W.ridge - ny * 0.07 + 0.05, zf);
      pointsAlong(p0, p1, 0.32, strings);
    }
  }
  // cumeeira
  g.add(box(0.32, 0.22, W.d + ohF * 2 + 0.02, M.fascia, W.x, y0 + W.ridge + t / Math.cos(a) - 0.02, W.z));
  // terças aparentes (vigas sob o beiral)
  const purl = [[0, W.ridge - 0.45], [-hw * 0.5, W.eave + rise * 0.5 - 0.4], [hw * 0.5, W.eave + rise * 0.5 - 0.4]];
  for (const [px, py] of purl) g.add(box(0.2, 0.26, W.d + ohF * 2 - 0.15, M.roofUnder, W.x + px, y0 + py, W.z));
  return g;
}

/* Pedras de cunhal (quoins) instanciadas ---------------------------------- */
function quoins(M, corners, group) {
  const list = [];
  for (const c of corners) {
    const n = Math.floor((c.top - c.bottom) / 0.42);
    for (let k = 0; k < n; k++) {
      const long = k % 2 === 0;
      const ax = long ? 0.78 : 0.46, bz = long ? 0.46 : 0.78;
      list.push({
        x: c.x - c.sx * (ax / 2 - 0.07),
        y: c.bottom + k * 0.42 + 0.2,
        z: c.z - c.sz * (bz / 2 - 0.07),
        ax, bz,
      });
    }
  }
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.quoin, list.length);
  const d = new THREE.Object3D();
  const col = new THREE.Color();
  list.forEach((q, i) => {
    d.position.set(q.x, q.y, q.z);
    d.scale.set(q.ax, 0.38, q.bz);
    d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
    const v = 0.85 + Math.random() * 0.3;
    im.setColorAt(i, col.setRGB(v, v * 0.98, v * 0.94));
  });
  im.castShadow = im.receiveShadow = true;
  group.add(im);
}

/**
 * Hotel completo para a cena externa.
 * Retorna { group, strings: number[], lamps: Vector3[], chimneys: Vector3[], signMat }
 */
export function buildHotel(M, { logoTex } = {}) {
  const g = new THREE.Group();
  const strings = [];
  const add = (o) => (g.add(o), o);

  const A = { x: -4.4, z: 0, w: 7.6, d: 9, eave: 7.3, ridge: 11.9, ohSide: 0.9, ohRight: 0.25, ohFront: 1.1 };
  const B = { x: 3.9, z: -1.4, w: 9.8, d: 10.6, eave: 8.0, ridge: 13.6, ohSide: 1.0, ohFront: 1.2 };
  add(gableWing(M, A, { strings }));
  add(gableWing(M, B, { strings }));
  const fA = A.z + A.d / 2, fB = B.z + B.d / 2;

  // embasamento em pedra
  add(block(A.w + 0.14, 0.9, A.d + 0.14, M.stone, A.x, 0, A.z));
  add(block(B.w + 0.14, 0.9, B.d + 0.14, M.stone, B.x, 0, B.z));
  quoins(M, [
    { x: A.x - A.w / 2, z: fA, sx: -1, sz: 1, bottom: 0.9, top: A.eave },
    { x: A.x + A.w / 2, z: fA, sx: 1, sz: 1, bottom: 3.5, top: A.eave },
    { x: A.x - A.w / 2, z: A.z - A.d / 2, sx: -1, sz: -1, bottom: 0.9, top: A.eave },
    { x: B.x + B.w / 2, z: fB, sx: 1, sz: 1, bottom: 0.9, top: B.eave },
    { x: B.x + B.w / 2, z: B.z - B.d / 2, sx: 1, sz: -1, bottom: 0.9, top: B.eave },
  ], g);

  // janelas — ala A (frente)
  const win = (opts, x, y, z, ry = 0) => {
    const w = windowUnit(M, opts);
    w.position.set(x, y, z);
    w.rotation.y = ry;
    return add(w);
  };
  win({ w: 1.2, h: 1.2, glass: M.glassA }, A.x, 9.35, fA);
  add(wreath(M, strings, A.x, 7.9, fA));
  win({ w: 1.5, h: 1.45, glass: M.glassB }, A.x, 5.55, fA);
  // ala B (frente)
  const ocu = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.09, 8, 28), M.sill);
  ocu.position.set(B.x, 11.7, fB + 0.06);
  add(ocu);
  const ocg = new THREE.Mesh(new THREE.CircleGeometry(0.46, 24), M.glassC);
  ocg.position.set(B.x, 11.7, fB + 0.02);
  add(ocg);
  win({ w: 1.25, h: 1.3, glass: M.glassA }, B.x - 2.1, 9.3, fB);
  win({ w: 1.25, h: 1.3, glass: M.glassOff, shutters: 'closed' }, B.x + 2.1, 9.3, fB);
  win({ w: 1.5, h: 1.45, glass: M.glassOff, shutters: 'closed' }, B.x - 2.2, 5.7, fB);
  win({ w: 1.5, h: 1.45, glass: M.glassB }, B.x + 2.2, 5.7, fB);
  add(wreath(M, strings, B.x, 7.45, fB));
  // laterais
  const lA = A.x - A.w / 2, rB = B.x + B.w / 2;
  win({ w: 1.3, h: 1.35, glass: M.glassC }, lA, 5.6, -2, -Math.PI / 2);
  win({ w: 1.3, h: 1.35, glass: M.glassOff, shutters: 'closed' }, lA, 5.6, 2, -Math.PI / 2);
  win({ w: 1.3, h: 1.35, glass: M.glassA }, lA, 2.1, -1.5, -Math.PI / 2);
  win({ w: 1.3, h: 1.35, glass: M.glassB }, rB, 5.8, -4.6, Math.PI / 2);
  win({ w: 1.3, h: 1.35, glass: M.glassOff, shutters: 'closed' }, rB, 5.8, -0.6, Math.PI / 2);
  win({ w: 1.3, h: 1.35, glass: M.glassA }, rB, 2.2, -4.6, Math.PI / 2);
  win({ w: 1.3, h: 1.35, glass: M.glassC }, rB, 2.2, -1.2, Math.PI / 2);
  // fundos
  win({ w: 1.3, h: 1.3, glass: M.glassB }, A.x, 5.5, A.z - A.d / 2, Math.PI);
  win({ w: 1.3, h: 1.3, glass: M.glassC }, B.x - 2, 5.7, B.z - B.d / 2, Math.PI);
  win({ w: 1.3, h: 1.3, glass: M.glassA }, B.x + 2, 9.2, B.z - B.d / 2, Math.PI);

  // chaminés
  const chA = V(A.x - 1.9, 0, A.z - 2.2), chB = V(B.x + 2.7, 0, B.z - 3.0);
  add(block(1.05, 12.7 - 6, 1.05, M.stone, chA.x, 6, chA.z));
  add(block(1.35, 0.18, 1.35, M.fascia, chA.x, 12.7, chA.z));
  add(cyl(0.11, 0.11, 0.55, M.iron, chA.x, 12.88, chA.z, 8));
  add(block(1.15, 12.4 - 8, 1.15, M.stucco, chB.x, 8, chB.z));
  add(block(1.4, 0.18, 1.4, M.fascia, chB.x, 12.4, chB.z));

  // ----- varanda / restaurante térreo (frente envidraçada) -----
  const zF = 7.0, x0 = -8.7, x1 = 8.9;
  add(block(x1 - x0 + 0.2, 0.55, zF - 3.2, M.stone, (x0 + x1) / 2, 0, (zF + 3.2) / 2));
  const pillars = [-8.4, -4.7, -1.15, 1.35, 5.1, 8.6];
  for (const px of pillars) add(block(0.72, 3.3, 0.72, M.stone, px, 0, zF - 0.3));
  const bays = [[-8.4, -4.7, 'w'], [-4.7, -1.15, 'w'], [-1.15, 1.35, 'door'], [1.35, 5.1, 'w'], [5.1, 8.6, 'w']];
  const glasses = [M.glassA, M.glassB, null, M.glassA, M.glassB];
  bays.forEach(([a, b, type], i) => {
    const cx = (a + b) / 2, bw = b - a - 0.72;
    add(block(bw + 0.02, 0.32, 0.5, M.stucco, cx, 2.98, zF - 0.32));
    if (type === 'w') {
      add(block(bw, 0.95, 0.24, M.panel, cx, 0.55, zF - 0.3));
      const w = windowUnit(M, { w: bw - 0.2, h: 1.42, glass: glasses[i], shutters: null, sill: false });
      w.position.set(cx, 2.22, zF - 0.32);
      add(w);
      add(block(bw, 2.5, 0.1, M.woodDark, cx, 0.5, zF - 0.62, false));
    } else {
      const door = new THREE.Mesh(new THREE.PlaneGeometry(bw - 0.3, 2.35), M.door);
      door.position.set(cx, 0.55 + 1.18, zF - 0.55);
      add(door);
      add(box(0.12, 2.45, 0.2, M.frame, cx - (bw - 0.3) / 2, 0.55 + 1.22, zF - 0.5));
      add(box(0.12, 2.45, 0.2, M.frame, cx + (bw - 0.3) / 2, 0.55 + 1.22, zF - 0.5));
    }
  });
  add(block(0.25, 3.3, zF - 3.4, M.stucco, x0 - 0.05, 0, (zF + 3.4) / 2));
  add(block(0.25, 3.3, zF - 3.4, M.stucco, x1 + 0.05, 0, (zF + 3.4) / 2));
  const sw = windowUnit(M, { w: 1.7, h: 1.4, glass: M.glassA, shutters: null, sill: false });
  sw.position.set(x1 + 0.2, 2.1, 5.2);
  sw.rotation.y = Math.PI / 2;
  add(sw);

  // telhado da varanda (telha cerâmica)
  {
    const zA = 3.2, yA = 4.15, zB = 7.8, yB = 3.32;
    const L = Math.hypot(zB - zA, yA - yB), ang = Math.atan2(yA - yB, zB - zA);
    const m = new THREE.Mesh(uvBox(x1 - x0 + 1.0, 0.18, L), [M.fascia, M.fascia, M.terracotta, M.roofUnder, M.fascia, M.fascia]);
    m.position.set((x0 + x1) / 2, (yA + yB) / 2 + 0.09, (zA + zB) / 2);
    m.rotation.x = ang;
    m.castShadow = m.receiveShadow = true;
    add(m);
    pointsAlong(V(x0 - 0.5, yB - 0.05, zB + 0.03), V(x1 + 0.5, yB - 0.05, zB + 0.03), 0.3, strings);
  }

  // escadaria
  for (let k = 0; k < 4; k++) add(block(2.6, 0.14 * (4 - k), 0.62, M.sill, 0.1, 0, zF + 0.3 + k * 0.6));

  // postes de luz
  const lamps = [V(-1.9, 2.95, 9.9), V(2.15, 2.95, 9.9), V(-8.8, 2.95, 9.4)];
  for (const l of lamps) {
    add(cyl(0.05, 0.09, 2.75, M.iron, l.x, 0, l.z, 8));
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12), M.globe);
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

  // jardim: arbustos, vasos, flores
  const bush = (x, z, s, mat = M.hedge) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), mat);
    m.position.set(x, s * 0.75, z);
    m.scale.set(s * 1.1, s * 0.85, s);
    m.castShadow = m.receiveShadow = true;
    return add(m);
  };
  [[-7.7, 7.6, 0.75], [-6.2, 7.7, 0.6], [-4.1, 7.65, 0.7], [-2.4, 7.8, 0.55], [2.6, 7.75, 0.6], [4.6, 7.6, 0.72], [6.5, 7.7, 0.62], [8.2, 7.6, 0.75],
    [-9.6, 4.5, 0.9], [-9.8, 1.5, 1.0], [10.0, 2.0, 0.9], [10.2, -2.5, 1.1], [-5.5, 10.6, 0.5], [6.4, 10.5, 0.55]].forEach(([x, z, s], i) => bush(x, z, s, i % 3 ? M.hedge : M.hedgeDark));
  for (const px of [-1.55, 1.75]) {
    add(cyl(0.34, 0.24, 0.55, M.pot, px, 0.55, zF + 0.1, 14));
    bush(px, zF + 0.1, 0.32).position.y = 1.35;
  }
  {
    const cols = [0xc8322f, 0xf2efe6, 0xd96aa0, 0x8e6bc4, 0xe0473a, 0xf6d36b].map((c) => new THREE.Color(c));
    const n = 260;
    const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.065, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), n);
    const d = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const left = i % 2 === 0;
      const x = left ? -8.6 + Math.random() * 7.0 : 2.4 + Math.random() * 6.8;
      d.position.set(x, 0.15 + Math.random() * 0.45, 8.0 + Math.random() * 1.5);
      d.scale.setScalar(0.7 + Math.random() * 0.8);
      d.updateMatrix();
      fl.setMatrixAt(i, d.matrix);
      fl.setColorAt(i, cols[i % cols.length]);
    }
    add(fl);
  }

  return { group: g, strings, lamps, signMat, chimneys: [V(chA.x, 13.3, chA.z), V(chB.x, 12.6, chB.z)] };
}

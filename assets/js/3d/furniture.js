// Mobiliário em miniatura para a maquete (escala real em metros)
import * as THREE from 'three';
import { block, box, cyl, tilesTex, checkerTex, rng, pbr } from './core.js';

export function interiorMaterials() {
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, ...o });
  const tiles = tilesTex('#e8e1d2', '#b9ae9a', 8);
  tiles.repeat.set(1 / 1.2, 1 / 1.2);
  const plaid = checkerTex('#2b3a5c', '#f1eee6', 6);
  plaid.repeat.set(2.5, 2.5);
  const plaidBeige = checkerTex('#a07a4a', '#f3ead8', 6);
  plaidBeige.repeat.set(2.5, 2.5);
  return {
    floor: pbr('floor', 2.2, { normal: 0.8 }),
    floorDark: pbr('floor', 2.2, { normal: 0.8, color: 0x9c7660 }),
    tile: std({ map: tiles, roughness: 0.35 }),
    wall: std({ color: 0xf2eadc, roughness: 0.95 }),
    cap: std({ color: 0x2a170c, roughness: 0.9 }),
    slab: std({ color: 0x3a2214, roughness: 0.85 }),
    wainscot: std({ color: 0xa5643a, roughness: 0.6 }),
    linen: std({ color: 0xf7f4ee, roughness: 0.95 }),
    beige: std({ color: 0xd9c49f }),
    navy: std({ color: 0x2b3756 }),
    plaid: std({ map: plaid }),
    plaidBeige: std({ map: plaidBeige }),
    red: std({ color: 0xa3282c }),
    gold: std({ color: 0xc9a35d, roughness: 0.5 }),
    wood: std({ color: 0xa0612f, roughness: 0.55 }),
    woodDark: std({ color: 0x5d361c, roughness: 0.55 }),
    leather: std({ color: 0x8a5631, roughness: 0.5 }),
    leatherDark: std({ color: 0x3b2b25, roughness: 0.45 }),
    fabric: std({ color: 0xcdb895 }),
    fabricGray: std({ color: 0x8c8a86 }),
    sofa: std({ color: 0xf0ebe0 }),
    rugBlue: std({ color: 0x33497a }),
    rugBeige: std({ color: 0xa69a86 }),
    rugRed: std({ color: 0x8e3a2c }),
    rugCream: std({ color: 0xe6dfcf }),
    marble: std({ color: 0xe9dfcc, roughness: 0.25 }),
    porcelain: std({ color: 0xfbfbf8, roughness: 0.2 }),
    water: std({ color: 0x86d0d4, roughness: 0.05, emissive: 0x2f7e86, emissiveIntensity: 0.45 }),
    glass: std({ color: 0xd8f0f4, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.28, depthWrite: false }),
    chrome: std({ color: 0xd0d4d8, metalness: 0.9, roughness: 0.2 }),
    black: std({ color: 0x141414, roughness: 0.4 }),
    tv: std({ color: 0x0d0e10, roughness: 0.2, metalness: 0.3, emissive: 0x1f3550, emissiveIntensity: 0.5 }),
    shade: std({ color: 0xfff3dc, emissive: 0xffc06a, emissiveIntensity: 1.4 }),
    fire: new THREE.MeshBasicMaterial({ color: 0xff7a1f }),
    fire2: new THREE.MeshBasicMaterial({ color: 0xffd36a }),
    brick: std({ color: 0xa3533a }),
    soot: std({ color: 0x17100c }),
    plant: std({ color: 0x3f6d35, flatShading: true, roughness: 0.9 }),
    pot: std({ color: 0xa65a35 }),
    white: std({ color: 0xf4f1ea }),
    food: [0xf2a33a, 0xd8432f, 0xf5d36b, 0xc98b4b, 0x7cb342, 0xf7f1e3, 0xe86a92].map((c) => std({ color: c, roughness: 0.6 })),
    juice: [0xff9f1c, 0xb5d86a, 0xf3a6c0, 0xfaf7ef].map((c) => std({ color: c, roughness: 0.15, transparent: true, opacity: 0.85, emissive: c, emissiveIntensity: 0.12 })),
    play: [0xd8342c, 0xf2c230, 0x3daa5a, 0x2f7fd6].map((c) => std({ color: c, roughness: 0.45 })),
    rubber: std({ color: 0x6f8f4a, roughness: 1 }),
  };
}

const G = () => new THREE.Group();
const at = (o, x = 0, y = 0, z = 0, ry = 0) => {
  o.position.set(x, y, z);
  o.rotation.y = ry;
  return o;
};

/* Quarto ------------------------------------------------------------------- */
export function bed(F, { w = 1.7, l = 2.05, throwMat = F.navy, pillow = F.plaid } = {}) {
  const g = G();
  g.add(block(w + 0.1, 0.3, l, F.woodDark, 0, 0, 0));
  g.add(block(w, 0.24, l - 0.06, F.linen, 0, 0.3, 0.01));
  g.add(block(w + 0.08, 0.07, l * 0.72, F.linen, 0, 0.53, l * 0.13));
  g.add(block(w + 0.1, 0.05, 0.42, throwMat, 0, 0.58, l / 2 - 0.34));
  g.add(block(w + 0.18, 1.0, 0.08, F.wood, 0, 0, -l / 2 - 0.02));
  const pc = w > 1.2 ? [-w / 4, w / 4] : [0];
  for (const px of pc) {
    g.add(block(w / pc.length - 0.12, 0.13, 0.32, F.linen, px, 0.54, -l / 2 + 0.24));
    const c = box(Math.min(0.42, w / pc.length - 0.25), 0.32, 0.1, pillow, px, 0.78, -l / 2 + 0.44);
    c.rotation.x = -0.35;
    g.add(c);
  }
  return g;
}

export function nightstand(F) {
  const g = G();
  g.add(block(0.45, 0.5, 0.4, F.wood));
  g.add(cyl(0.04, 0.07, 0.22, F.woodDark, 0, 0.5, 0, 10));
  g.add(cyl(0.09, 0.15, 0.2, F.shade, 0, 0.72, 0, 14));
  return g;
}

export function armchair(F, mat = F.fabric) {
  const g = G();
  g.add(block(0.72, 0.42, 0.7, mat));
  g.add(block(0.72, 0.5, 0.16, mat, 0, 0.42, -0.27));
  g.add(block(0.13, 0.22, 0.7, mat, -0.3, 0.42, 0));
  g.add(block(0.13, 0.22, 0.7, mat, 0.3, 0.42, 0));
  return g;
}

export function sofa(F, w = 2.2, mat = F.sofa) {
  const g = G();
  g.add(block(w, 0.42, 0.88, mat));
  g.add(block(w, 0.45, 0.2, mat, 0, 0.42, -0.34));
  g.add(block(0.2, 0.22, 0.88, mat, -w / 2 + 0.1, 0.42, 0));
  g.add(block(0.2, 0.22, 0.88, mat, w / 2 - 0.1, 0.42, 0));
  const n = Math.max(2, Math.round((w - 0.4) / 0.7));
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.2 + ((w - 0.4) / n) * (i + 0.5);
    g.add(block((w - 0.4) / n - 0.04, 0.1, 0.6, mat, x, 0.42, 0.08));
  }
  return g;
}

export function deskTv(F) {
  const g = G();
  g.add(block(1.3, 0.05, 0.5, F.wood, 0, 0.72, 0));
  for (const [x, z] of [[-0.6, -0.2], [0.6, -0.2], [-0.6, 0.2], [0.6, 0.2]]) g.add(block(0.05, 0.72, 0.05, F.woodDark, x, 0, z));
  g.add(block(0.85, 0.5, 0.05, F.tv, 0.1, 0.77, -0.18));
  g.add(block(0.45, 0.55, 0.45, F.porcelain, -0.95, 0, 0));
  // cadeira
  const c = G();
  c.add(block(0.42, 0.05, 0.42, F.woodDark, 0, 0.45, 0));
  c.add(block(0.42, 0.5, 0.05, F.woodDark, 0, 0.5, 0.2));
  for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) c.add(block(0.04, 0.45, 0.04, F.woodDark, x, 0, z));
  g.add(at(c, 0.2, 0, 0.55, Math.PI));
  return g;
}

export function wardrobe(F, w = 1.2, h = 1.15) {
  const g = G();
  g.add(block(w, h, 0.6, F.wood));
  g.add(block(0.02, h - 0.1, 0.02, F.woodDark, 0, 0.05, 0.3));
  return g;
}

export function rug(F, w, l, mat) {
  return block(w, 0.02, l, mat, 0, 0, 0, false);
}

/* Banheiro ----------------------------------------------------------------- */
export function cornerTub(F, r = 1.3) {
  const g = G();
  const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.55, 22, 1, false, 0, Math.PI / 2), F.marble);
  t.position.y = 0.275;
  t.castShadow = t.receiveShadow = true;
  g.add(t);
  const w = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.16, r - 0.16, 0.02, 22, 1, false, 0, Math.PI / 2), F.water);
  w.position.set(0.04, 0.55, 0.04);
  g.add(w);
  g.add(cyl(0.03, 0.03, 0.12, F.chrome, r * 0.25, 0.55, r * 0.25, 8));
  return g;
}

export function shower(F, w = 1.0, d = 1.0) {
  const g = G();
  g.add(block(w, 0.05, d, F.porcelain));
  const gl1 = block(w, 1.15, 0.02, F.glass, 0, 0.05, d / 2, false);
  const gl2 = block(0.02, 1.15, d, F.glass, w / 2, 0.05, 0, false);
  g.add(gl1, gl2);
  g.add(block(w + 0.02, 0.03, 0.03, F.chrome, 0, 1.2, d / 2));
  return g;
}

export function vanity(F, w = 1.3) {
  const g = G();
  g.add(block(w, 0.75, 0.5, F.wood));
  g.add(block(w + 0.04, 0.05, 0.54, F.marble, 0, 0.75, 0));
  g.add(cyl(0.17, 0.14, 0.06, F.porcelain, 0, 0.78, 0.02, 16));
  g.add(cyl(0.015, 0.015, 0.16, F.chrome, 0, 0.8, -0.18, 6));
  return g;
}

export function toilet(F) {
  const g = G();
  g.add(cyl(0.17, 0.14, 0.4, F.porcelain, 0, 0, 0.05, 14));
  g.add(block(0.4, 0.38, 0.16, F.porcelain, 0, 0.32, -0.2));
  return g;
}

/* Áreas sociais ------------------------------------------------------------ */
export function fireplace(F) {
  const g = G();
  g.add(block(2.0, 1.15, 0.5, F.wall));
  g.add(block(2.2, 0.08, 0.6, F.wood, 0, 1.15, 0.02));
  g.add(block(1.0, 0.72, 0.1, F.soot, 0, 0.12, 0.22));
  g.add(block(1.15, 0.08, 0.1, F.brick, 0, 0.84, 0.24));
  g.add(block(2.2, 0.06, 0.8, F.brick, 0, 0, 0.55));
  const fire = G();
  [[0, 0.32, 0.18, F.fire], [-0.2, 0.24, 0.12, F.fire], [0.2, 0.26, 0.13, F.fire], [0, 0.2, 0.1, F.fire2]].forEach(([x, h, r, m]) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), m);
    c.position.set(x, 0.14 + h / 2, 0.3);
    fire.add(c);
  });
  for (const x of [-0.18, 0.18]) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 7), F.woodDark);
    l.rotation.z = Math.PI / 2;
    l.rotation.y = x * 1.6;
    l.position.set(0, 0.16, 0.3);
    fire.add(l);
  }
  g.add(fire);
  g.userData.fire = fire;
  return g;
}

export function bookshelf(F, w = 2.2, h = 1.2, seed = 1) {
  const g = G();
  g.add(block(w, h, 0.36, F.wood));
  const r = rng(seed);
  const rows = 3, sh = (h - 0.1) / rows;
  const books = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), 80);
  const d = new THREE.Object3D();
  const cols = [0x7a2b22, 0x2c3d5c, 0x3d5a35, 0xc9a35d, 0x5a3a26, 0xe8dcc2, 0x8c5a2b].map((c) => new THREE.Color(c));
  let k = 0;
  for (let row = 0; row < rows; row++) {
    g.add(block(w - 0.06, sh - 0.04, 0.02, F.woodDark, 0, 0.06 + row * sh, 0.17, false));
    let x = -w / 2 + 0.08;
    while (x < w / 2 - 0.12 && k < 80) {
      const bw = 0.04 + r() * 0.04, bh = sh * (0.55 + r() * 0.35);
      d.position.set(x + bw / 2, 0.06 + row * sh + bh / 2, 0.2);
      d.scale.set(bw, bh, 0.22);
      d.updateMatrix();
      books.setMatrixAt(k, d.matrix);
      books.setColorAt(k, cols[Math.floor(r() * cols.length)]);
      x += bw + 0.005 + (r() < 0.1 ? 0.12 : 0);
      k++;
    }
  }
  books.count = k;
  books.castShadow = true;
  g.add(books);
  return g;
}

export function coffeeTable(F, w = 1.2, d = 0.7) {
  const g = G();
  g.add(block(w, 0.06, d, F.wood, 0, 0.38, 0));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(block(0.05, 0.38, 0.05, F.black, x * (w / 2 - 0.06), 0, z * (d / 2 - 0.06)));
  return g;
}

export function plant(F, s = 1) {
  const g = G();
  g.add(cyl(0.18 * s, 0.13 * s, 0.32 * s, F.pot, 0, 0, 0, 10));
  const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32 * s, 0), F.plant);
  l.position.y = 0.55 * s;
  l.scale.y = 1.3;
  l.castShadow = true;
  g.add(l);
  return g;
}

export function floorLamp(F) {
  const g = G();
  g.add(cyl(0.02, 0.02, 1.25, F.black, 0, 0, 0, 6));
  g.add(cyl(0.12, 0.18, 0.25, F.shade, 0, 1.2, 0, 14));
  return g;
}

export function receptionCounter(F) {
  const g = G();
  g.add(block(2.2, 1.0, 0.55, F.wood));
  g.add(block(2.3, 0.05, 0.65, F.woodDark, 0, 1.0, 0));
  g.add(block(0.55, 1.0, 1.1, F.wood, 1.1, 0, -0.55));
  g.add(block(0.5, 0.3, 0.05, F.black, -0.3, 1.05, -0.12));
  g.add(cyl(0.05, 0.06, 0.05, F.gold, 0.6, 1.05, 0.1, 10));
  return g;
}

export function diningSet(F, chairs = 4, round = false) {
  const g = G();
  if (round) g.add(cyl(0.45, 0.45, 0.05, F.wood, 0, 0.72, 0, 20));
  else g.add(block(0.85, 0.05, 0.85, F.wood, 0, 0.72, 0));
  g.add(cyl(0.05, 0.12, 0.72, F.woodDark, 0, 0, 0, 8));
  g.add(block(0.55, 0.012, 0.55, F.white, 0, 0.77, 0, false));
  const pos = [[0, 0.62, Math.PI], [0, -0.62, 0], [0.62, 0, -Math.PI / 2], [-0.62, 0, Math.PI / 2]].slice(0, chairs);
  for (const [x, z, ry] of pos) {
    const c = G();
    c.add(block(0.42, 0.05, 0.42, F.woodDark, 0, 0.45, 0));
    c.add(block(0.42, 0.5, 0.05, F.woodDark, 0, 0.5, -0.19));
    for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) c.add(block(0.04, 0.45, 0.04, F.woodDark, a, 0, b));
    g.add(at(c, x, 0, z, ry));
  }
  return g;
}

export function buffet(F, w = 4.2, seed = 3) {
  const g = G();
  g.add(block(w, 0.88, 0.7, F.wood));
  g.add(block(w + 0.06, 0.05, 0.76, F.marble, 0, 0.88, 0));
  const r = rng(seed);
  const items = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.6 }), 90);
  const d = new THREE.Object3D();
  const cols = [0xf2a33a, 0xd8432f, 0xf5d36b, 0xc98b4b, 0x7cb342, 0xf7f1e3, 0xe86a92, 0xb5763c].map((c) => new THREE.Color(c));
  let k = 0;
  // pratos e travessas
  const plates = Math.floor(w / 0.55);
  for (let i = 0; i < plates; i++) {
    const x = -w / 2 + 0.3 + i * ((w - 0.6) / Math.max(1, plates - 1));
    g.add(cyl(0.2, 0.2, 0.025, F.white, x, 0.93, 0.08, 16));
    for (let j = 0; j < 9 && k < 90; j++) {
      const a = r() * 6.28, rr = r() * 0.13, s = 0.035 + r() * 0.03;
      d.position.set(x + Math.cos(a) * rr, 0.97 + s * 0.6, 0.08 + Math.sin(a) * rr);
      d.scale.set(s, s * 0.8, s);
      d.updateMatrix();
      items.setMatrixAt(k, d.matrix);
      items.setColorAt(k, cols[(i * 3 + j) % cols.length]);
      k++;
    }
  }
  items.count = k;
  g.add(items);
  // jarras de suco (como na foto do café)
  F.juice.forEach((m, i) => {
    const j = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.26, 12), m);
    j.position.set(-w / 2 + 0.25 + i * 0.2, 0.93 + 0.13, -0.22);
    g.add(j);
  });
  // bolo
  g.add(cyl(0.16, 0.16, 0.16, F.food[3], w / 2 - 0.35, 0.93, -0.18, 16));
  return g;
}

export function stairs(F, steps = 10, run = 0.27, rise = 0.3, width = 1.0) {
  const g = G();
  for (let i = 0; i < steps; i++) g.add(block(run, rise * (i + 1), width, F.wood, i * run + run / 2, 0, 0));
  return g;
}

export function playground(F) {
  const [red, yellow, green, blue] = F.play;
  const g = G();
  g.add(block(5.2, 0.06, 4.6, F.rubber, 0, 0, 0, false));
  const tower = (x, z, col, roof) => {
    const t = G();
    for (const [a, b] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) t.add(block(0.12, 1.9, 0.12, col, a, 0, b));
    t.add(block(1.05, 0.08, 1.05, yellow, 0, 0.9, 0));
    t.add(block(1.05, 0.5, 0.06, col, 0, 0.98, 0.5));
    t.add(block(1.05, 0.5, 0.06, col, 0, 0.98, -0.5));
    const rf = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.6, 4), roof);
    rf.position.y = 2.2;
    rf.rotation.y = Math.PI / 4;
    rf.castShadow = true;
    t.add(rf);
    return at(t, x, 0, z);
  };
  g.add(tower(-1.2, -0.6, red, blue), tower(0.6, -0.6, green, red));
  // ponte
  g.add(block(0.75, 0.08, 0.9, blue, -0.3, 0.9, -0.6));
  // escorregador
  const s = box(0.6, 0.06, 2.2, blue, 1.6, 0.5, 0.75);
  s.rotation.x = 0.42;
  s.rotation.y = -0.5;
  g.add(s);
  // escalada
  const c = box(0.9, 0.06, 1.3, yellow, -1.2, 0.48, 0.55);
  c.rotation.x = -0.75;
  g.add(c);
  // balanço (quadro)
  g.add(block(0.1, 1.6, 0.1, red, 1.6, 0, -1.8), block(0.1, 1.6, 0.1, red, -0.2, 0, -1.8), block(2.0, 0.1, 0.12, red, 0.7, 1.6, -1.8));
  return g;
}

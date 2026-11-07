// Maquete interativa: o hotel em corte, andar por andar.
// Passe o mouse sobre um ambiente: ele "sai" da maquete como uma gaveta.
import * as THREE from 'three';
import { RoomEnvironment } from 'three';
import { createMaterials, uvBox, block, box, cyl, forest, lerp, clamp, smooth, bake } from './core.js';
import { gableWing, windowUnit } from './hotel.js';
import * as FU from './furniture.js';

const H = 1.25; // altura das paredes cortadas
const FH = 3.2; // pé-direito
const ZB = -4.5, ZC = -3.3, ZF = 4.5;
const D = ZF - ZC, CZ = (ZF + ZC) / 2;

export const FLOORS = [
  { name: 'Térreo', cells: [['recepcao', -9, -4], ['lareira', -4, 3], ['cafe', 3, 9]] },
  { name: '1º andar', cells: [['luxo', -9, -3.4], ['master', -3.4, 3], ['luxo-triplo', 3, 9]] },
  { name: '2º andar', cells: [['master-triplo', -9, -1], ['master-quadruplo', -1, 9]] },
];

const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createMaquete(canvas, { pinsEl, labels = {}, photos = {}, onHover, onSelect, onFrame, onFrameHover } = {}) {
  const mobile = window.matchMedia('(max-width: 820px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 400);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;

  const { M } = createMaterials();
  M.grass.color.set(0x9db088);
  const F = FU.interiorMaterials();

  /* Luzes ------------------------------------------------------------------ */
  scene.add(new THREE.HemisphereLight(0xfff3e2, 0x3a2a20, 1.15));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.6);
  key.position.set(-20, 34, 26);
  key.target.position.set(0, 3, -2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 120 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xc9d8ff, 0.7);
  fill.position.set(24, 12, -10);
  scene.add(fill);
  const hoverLight = new THREE.PointLight(0xffd29a, 0, 9, 1.6);
  scene.add(hoverLight);

  const model = new THREE.Group();
  scene.add(model);

  /* Pedestal e terreno ------------------------------------------------------ */
  {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(19.6, 20.2, 1.0, 96), F.woodDark);
    ped.position.y = -0.82;
    ped.receiveShadow = true;
    model.add(ped);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(19.6, 0.05, 6, 120), F.gold);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.32;
    model.add(rim);
    const gg = new THREE.CylinderGeometry(19.3, 19.3, 0.06, 96);
    const uv = gg.attributes.uv;
    const gp = gg.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, gp.getX(i), gp.getZ(i));
    const grass = new THREE.Mesh(gg, M.grass);
    grass.position.y = -0.3;
    grass.receiveShadow = true;
    model.add(grass);
    const path = block(2.6, 0.04, 10.5, M.pavers, 0.1, -0.29, 10.2, false);
    model.add(path);
    model.add(block(16, 0.04, 2.2, M.pavers, 0, -0.29, 6.0, false));
    // arbustos e flores na frente
    const site = new THREE.Group();
    [[-7.5, 7.6, 0.55], [-5.5, 7.7, 0.45], [-3.2, 7.6, 0.5], [3.4, 7.6, 0.5], [5.8, 7.7, 0.45], [-10.2, 3, 0.7], [-10.4, -1.5, 0.75], [10.2, -2.0, 0.7], [-9.5, -6.5, 0.8], [9.6, -6.8, 0.8]].forEach(([x, z, s], i) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), i % 2 ? M.hedge : M.hedgeDark);
      m.position.set(x, -0.27 + s * 0.7, z);
      m.scale.set(s * 1.2, s * 0.85, s);
      m.castShadow = m.receiveShadow = true;
      site.add(m);
    });
    model.add(site);
    const trees = [
      { type: 'araucaria', x: -15, z: -8, s: 0.42 }, { type: 'araucaria', x: -11, z: -13.5, s: 0.38 }, { type: 'araucaria', x: -3, z: -16.5, s: 0.45 },
      { type: 'araucaria', x: 6, z: -16, s: 0.4 }, { type: 'araucaria', x: 13, z: -11.5, s: 0.43 }, { type: 'araucaria', x: 16.5, z: -4, s: 0.38 },
      { type: 'pine', x: -16.5, z: 1.5, s: 0.5 }, { type: 'pine', x: 17.5, z: 3.5, s: 0.45 }, { type: 'pine', x: -7, z: -14, s: 0.45 },
      { type: 'round', x: -14, z: 9, s: 0.55 }, { type: 'round', x: 9.5, z: -13.5, s: 0.5 }, { type: 'round', x: -16.5, z: -4, s: 0.5 },
    ].map((t, i) => ({ ...t, y: -0.27, variant: i }));
    model.add(forest(trees, M, { variants: 2 }));
  }

  /* Células (ambientes) ----------------------------------------------------- */
  const wallMats = [F.wall, F.wall, F.cap, F.wall, F.wall, F.wall];
  const wall = (w, d, x, z, h = H) => {
    const m = new THREE.Mesh(uvBox(w, h, d), wallMats);
    m.position.set(x, h / 2 + 0.06, z);
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  const place = (o, x, z, ry = 0) => {
    o.position.set(x, 0.06, z);
    o.rotation.y = ry;
    return o;
  };

  const cells = [];
  const fires = [];
  const fireLights = [];

  function roomCell(kind, W) {
    const g = new THREE.Group();
    const x0 = -W / 2, x1 = W / 2, z0 = -D / 2, z1 = D / 2;
    const master = kind.startsWith('master');
    const throwMat = master ? F.beige : F.navy;
    const pillow = master ? F.plaidBeige : F.plaid;
    const rugMat = master ? F.rugBeige : F.rugBlue;
    g.add(block(W - 0.04, 0.06, D - 0.04, F.floor));
    const bd = 2.4, zp = z0 + bd, ex = x0 + 1.15;
    // paredes
    g.add(wall(x1 - (x0 + 1.05), 0.12, (x0 + 1.05 + x1) / 2, z0 + 0.06));
    g.add(wall(0.2, 0.12, x0 + 0.1, z0 + 0.06));
    g.add(wall(0.1, D, x0 + 0.05, 0), wall(0.1, D, x1 - 0.05, 0));
    g.add(wall(x1 - ex, 0.1, (ex + x1) / 2, zp));
    g.add(wall(0.1, 1.1, ex, z0 + 0.55), wall(0.1, bd - 1.95, ex, z0 + 1.95 + (bd - 1.95) / 2));
    g.add(wall(W, 0.1, 0, z1 - 0.05, 0.32));
    // lambri de madeira (como nos quartos reais)
    g.add(block(x1 - ex - 0.12, 0.8, 0.03, F.wainscot, (ex + x1) / 2, 0.06, zp + 0.065));
    g.add(block(0.03, 0.8, z1 - zp - 0.3, F.wainscot, x0 + 0.115, 0.06, (zp + z1) / 2));
    g.add(block(0.03, 0.8, z1 - zp - 0.3, F.wainscot, x1 - 0.115, 0.06, (zp + z1) / 2));
    // banheiro
    const bx0 = ex + 0.06, bx1 = x1 - 0.11, bz0 = z0 + 0.13, bz1 = zp - 0.06;
    g.add(block(bx1 - bx0, 0.012, bz1 - bz0, F.tile, (bx0 + bx1) / 2, 0.06, (bz0 + bz1) / 2, false));
    if (master) {
      g.add(place(FU.cornerTub(F, 1.3), bx1, bz0, -Math.PI / 2));
      g.add(place(FU.shower(F, 1.0, 1.0), bx0 + 0.52, bz0 + 0.52));
      g.add(place(FU.vanity(F, 1.2), (bx0 + 1.1 + bx1 - 1.35) / 2, bz0 + 0.27));
      g.add(place(FU.toilet(F), bx0 + 0.3, bz1 - 0.4, Math.PI / 2));
    } else {
      g.add(place(FU.shower(F, 1.0, 1.0), bx1 - 0.52, bz0 + 0.52, Math.PI / 2));
      g.add(place(FU.vanity(F, 1.2), (bx0 + bx1) / 2 - 0.4, bz0 + 0.27));
      g.add(place(FU.toilet(F), bx0 + 0.3, bz1 - 0.4, Math.PI / 2));
    }
    // camas
    const singles = kind === 'master-quadruplo' ? 2 : kind.endsWith('triplo') ? 1 : 0;
    const items = [['ns', 0.45], ['queen', 1.82], ['ns', 0.45]];
    for (let i = 0; i < singles; i++) items.push(['single', 1.05], ['ns', 0.45]);
    const total = items.reduce((a, [, w]) => a + w + 0.06, -0.06);
    const left = x0 + 1.05, right = x1 - 0.2;
    let x = (left + right) / 2 - total / 2;
    const zb = zp + 0.08;
    for (const [type, w] of items) {
      const cx = x + w / 2;
      if (type === 'ns') g.add(place(FU.nightstand(F), cx, zb + 0.24));
      if (type === 'queen') {
        g.add(place(FU.bed(F, { w: 1.7, throwMat, pillow }), cx, zb + 1.04));
        g.add(place(FU.rug(F, 2.5, 1.7, rugMat), cx, zb + 2.0));
      }
      if (type === 'single') g.add(place(FU.bed(F, { w: 0.95, l: 1.95, throwMat, pillow }), cx, zb + 0.99));
      x += w + 0.06;
    }
    g.add(place(FU.wardrobe(F, 1.15), x0 + 0.42, zp + 0.75, Math.PI / 2));
    g.add(place(FU.deskTv(F), x0 + 0.45, z1 - 1.55, Math.PI / 2));
    g.add(place(FU.armchair(F, master ? F.fabric : F.fabricGray), x1 - 0.75, z1 - 0.9, -2.5));
    if (W > 7) {
      g.add(place(FU.armchair(F, F.fabric), x1 - 1.75, z1 - 0.75, -3.0));
      g.add(place(FU.coffeeTable(F, 0.6, 0.6), x1 - 1.3, z1 - 1.6));
    }
    g.add(place(FU.plant(F, 0.8), x0 + 0.4, z1 - 0.45));
    return g;
  }

  function commonCell(kind, W) {
    const g = new THREE.Group();
    const x0 = -W / 2, x1 = W / 2, z0 = -D / 2, z1 = D / 2;
    g.add(block(W - 0.04, 0.06, D - 0.04, kind === 'cafe' ? F.floorDark : F.floor));
    g.add(wall(W - 1.2, 0.12, (x0 + 1.2 + x1) / 2, z0 + 0.06));
    g.add(wall(0.1, D, x0 + 0.05, 0), wall(0.1, D, x1 - 0.05, 0));
    g.add(wall(W, 0.1, 0, z1 - 0.05, 0.32));
    if (kind === 'recepcao') {
      g.add(place(FU.bookshelf(F, 2.6, 1.2, 3), 0.5, z0 + 0.32));
      g.add(place(FU.receptionCounter(F), 0.4, -0.8));
      g.add(place(FU.rug(F, 2.4, 1.6, F.rugRed), 0.1, 1.6));
      const desk = new THREE.Group();
      desk.add(block(1.0, 0.05, 0.55, F.wood, 0, 0.72, 0));
      for (const [a, b] of [[-0.45, -0.22], [0.45, -0.22], [-0.45, 0.22], [0.45, 0.22]]) desk.add(block(0.05, 0.72, 0.05, F.woodDark, a, 0, b));
      g.add(place(desk, -1.4, 2.6));
      g.add(place(FU.armchair(F, F.leather), 1.3, 2.6, -2.6));
      g.add(place(FU.plant(F, 1), x1 - 0.45, z1 - 0.5));
      g.add(place(FU.plant(F, 0.9), x0 + 0.45, z0 + 0.5));
    }
    if (kind === 'lareira') {
      const fp = FU.fireplace(F);
      fp.userData.fire.userData.keep = true;
      fires.push(fp.userData.fire);
      g.add(place(fp, 0, z0 + 0.38));
      g.add(place(FU.bookshelf(F, 1.7, 1.2, 7), -2.3, z0 + 0.3));
      g.add(place(FU.bookshelf(F, 1.7, 1.2, 9), 2.3, z0 + 0.3));
      g.add(place(FU.rug(F, 3.6, 2.8, F.rugCream), 0, 0.2));
      g.add(place(FU.coffeeTable(F, 1.3, 0.75), 0, 0.15));
      g.add(place(FU.sofa(F, 2.6, F.sofa), 0, 1.55, Math.PI));
      g.add(place(FU.armchair(F, F.leather), -1.75, -0.2, Math.PI / 2));
      g.add(place(FU.armchair(F, F.leather), 1.75, -0.2, -Math.PI / 2));
      g.add(place(FU.sofa(F, 2.0, F.leatherDark), x0 + 0.6, 2.4, Math.PI / 2));
      g.add(place(FU.floorLamp(F), 2.7, 1.9));
      g.add(place(FU.plant(F, 1), x1 - 0.5, z1 - 0.5));
      const fl = new THREE.PointLight(0xff8a3a, 6, 7, 1.6);
      fl.position.set(0, 0.8, z0 + 1.2);
      g.add(fl);
      fireLights.push(fl);
    }
    if (kind === 'cafe') {
      g.add(place(FU.buffet(F, 4.4, 5), 0.3, z0 + 0.55));
      [[-1.7, -1.0, 4, false], [0.4, -0.9, 2, true], [2.1, -0.4, 2, false], [-1.6, 1.4, 4, true], [0.6, 1.5, 4, false], [-0.5, 3.1, 2, true], [1.9, 2.9, 2, false]]
        .forEach(([x, z, n, rd]) => g.add(place(FU.diningSet(F, n, rd), x, z)));
      g.add(place(FU.plant(F, 1), x0 + 0.45, z1 - 0.5));
      g.add(place(FU.plant(F, 0.9), x1 - 0.45, z0 + 1.3));
    }
    return g;
  }

  function corridor(i) {
    const g = new THREE.Group();
    g.add(block(18, 0.06, ZC - ZB - 0.02, F.floorDark, 0, 0, (ZB + ZC) / 2));
    g.add(block(13, 0.015, 0.5, F.rugRed, 1.5, 0.06, (ZB + ZC) / 2, false));
    g.add(wall(18, 0.12, 0, ZB + 0.06));
    g.add(wall(0.12, ZC - ZB, -8.94, (ZB + ZC) / 2), wall(0.12, ZC - ZB, 8.94, (ZB + ZC) / 2));
    if (i < 2) {
      const st = FU.stairs(F, 10, 0.27, 0.3, 0.95);
      st.position.set(-8.75, 0.06, (ZB + ZC) / 2);
      g.add(st);
    }
    return g;
  }

  /* Casca externa (fachada) — some ao "explodir" a maquete --------------- */
  const SM = {};
  ['stucco', 'stone', 'roof', 'roofUnder', 'fascia', 'frame', 'shutter', 'sill', 'panel', 'glassA', 'glassB', 'glassOff'].forEach((k) => (SM[k] = M[k].clone()));
  SM.glassA.emissiveIntensity = 1.5;
  SM.glassB.emissiveIntensity = 1.1;
  const shellMats = Object.values(SM);

  function shell(i) {
    const g = new THREE.Group();
    const hgt = FH - 0.3, mat = i === 0 ? SM.stone : SM.stucco;
    g.add(block(18.4, hgt, 0.16, mat, 0, 0, ZF + 0.1));
    g.add(block(18.4, hgt, 0.16, SM.stucco, 0, 0, ZB - 0.1));
    g.add(block(0.16, hgt, ZF - ZB + 0.36, SM.stucco, -9.12, 0, 0));
    g.add(block(0.16, hgt, ZF - ZB + 0.36, SM.stucco, 9.12, 0, 0));
    const fl = FLOORS[i];
    fl.cells.forEach(([id, a, b], k) => {
      const w = b - a, cx = (a + b) / 2;
      const xs = w > 7 ? [cx - w / 4, cx + w / 4] : [cx];
      xs.forEach((x, j) => {
        const opts = i === 0
          ? { w: Math.min(2.6, w - 1.4), h: 1.6, glass: SM.glassA, shutters: null, sill: false }
          : { w: 1.3, h: 1.3, glass: (k + j) % 3 === 1 ? SM.glassOff : (k + j) % 2 ? SM.glassB : SM.glassA, shutters: (k + j) % 3 === 1 ? 'closed' : 'open' };
        const u = windowUnit(SM, opts);
        u.position.set(x, i === 0 ? 1.45 : 1.55, ZF + 0.18);
        g.add(u);
      });
    });
    for (const s of [-1, 1]) {
      const u = windowUnit(SM, { w: 1.2, h: 1.2, glass: SM.glassB, shutters: 'open' });
      u.position.set(s * 9.2, 1.55, 0.5);
      u.rotation.y = (s * Math.PI) / 2;
      g.add(u);
    }
    return bake(g);
  }

  /* Montagem dos andares --------------------------------------------------- */
  const floors = FLOORS.map((fl, i) => {
    const group = new THREE.Group();
    const slabMats = [F.slab, F.slab, F.slab, F.slab, F.slab, F.slab];
    const slab = new THREE.Mesh(uvBox(18.3, 0.3, ZF - ZB + 0.2), slabMats);
    slab.position.set(0, -0.15, 0);
    slab.castShadow = slab.receiveShadow = true;
    group.add(slab);
    group.add(bake(corridor(i)));
    const sh = shell(i);
    group.add(sh);
    fl.cells.forEach(([id, a, b]) => {
      const W = b - a;
      const inner = ['recepcao', 'lareira', 'cafe'].includes(id) ? commonCell(id, W) : roomCell(id, W);
      bake(inner);
      const cell = makeCell(id, inner, W, D, (a + b) / 2, CZ, i);
      group.add(cell.group);
    });
    model.add(group);
    return { group, shell: sh, i, lift: 0, liftTarget: 0 };
  });

  // Espaço Kids no jardim
  {
    const pg = FU.playground(F);
    bake(pg);
    const kids = makeCell('kids', pg, 5.4, 4.8, 12.6, 4.6, -1, -0.27);
    model.add(kids.group);
  }

  function makeCell(id, inner, W, Dd, cx, cz, floor, y = 0) {
    const group = new THREE.Group();
    group.position.set(cx, y, cz);
    group.add(inner);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(W, 1.6, Dd), new THREE.MeshBasicMaterial());
    hit.position.y = 0.8;
    hit.visible = false;
    hit.userData.id = id;
    group.add(hit);
    // moldura dourada de destaque
    const om = new THREE.MeshBasicMaterial({ color: 0xe0b36a, transparent: true, opacity: 0, depthWrite: false });
    const o = new THREE.Group();
    const t = 0.09;
    o.add(box(W + t, 0.05, t, om, 0, 0.1, Dd / 2), box(W + t, 0.05, t, om, 0, 0.1, -Dd / 2), box(t, 0.05, Dd, om, -W / 2, 0.1, 0), box(t, 0.05, Dd, om, W / 2, 0.1, 0));
    o.children.forEach((c) => (c.castShadow = false));
    group.add(o);
    const cell = { id, group, hit, om, floor, base: new THREE.Vector3(cx, y, cz), hover: 0, W, D: Dd };
    cells.push(cell);
    return cell;
  }

  // Telhado
  const roof = new THREE.Group();
  roof.add(gableWing(SM, { x: -5, z: 0, w: 8.3, d: 9.2, eave: 0, ridge: 4.4, ohSide: 0.7, ohFront: 0.8 }));
  roof.add(gableWing(SM, { x: 4.1, z: 0, w: 10.1, d: 9.2, eave: 0, ridge: 5.3, ohSide: 0.7, ohFront: 0.8 }));
  {
    const w1 = windowUnit(SM, { w: 1.1, h: 1.1, glass: SM.glassA });
    w1.position.set(-5, 1.6, 4.62);
    roof.add(w1);
    const w2 = windowUnit(SM, { w: 1.2, h: 1.2, glass: SM.glassB });
    w2.position.set(4.1, 1.8, 4.62);
    roof.add(w2);
    roof.add(block(1.0, 4.6, 1.0, SM.stone, -6.8, 0, -2));
    roof.add(block(1.25, 0.16, 1.25, SM.fascia, -6.8, 4.6, -2));
  }
  bake(roof);
  model.add(roof);

  /* Estado ------------------------------------------------------------------ */
  let explode = 0, explodeTarget = 0;
  let hovered = null, selected = null, floorFocus = null;
  const view = { theta: -0.5, phi: 1.15, radius: 55, target: new THREE.Vector3(0, 5, 0) };
  const user = { theta: 0, phi: 0, zoom: 1 };
  const focus = { k: 0, target: new THREE.Vector3(), radius: 18, phi: 0.95 };
  let viewOffsetX = 0, viewOffsetY = 0;

  function setShellOpacity(o) {
    for (const m of shellMats) {
      const tr = o < 0.995;
      if (m.transparent !== tr) {
        m.transparent = tr;
        m.needsUpdate = true;
      }
      m.opacity = o;
      m.depthWrite = o > 0.6;
    }
    const vis = o > 0.01;
    floors.forEach((f) => (f.shell.visible = vis));
    roof.visible = vis;
  }

  function layout(dt) {
    explode += (explodeTarget - explode) * Math.min(1, dt * 6);
    const e = explode, k = easeIO(clamp(e));
    floors.forEach((f, i) => {
      f.lift += (f.liftTarget - f.lift) * Math.min(1, dt * 4);
      f.group.position.set(0, lerp(i * FH, i * 5.6, k) + f.lift, lerp(0, -i * 3.3, k));
    });
    const so = 1 - smooth(0.04, 0.45, e);
    setShellOpacity(so);
    roof.position.set(0, lerp(3 * FH - 0.3, 3 * FH + 14, smooth(0, 0.6, e)), lerp(0, -8, k));
    // células
    for (const c of cells) {
      const target = c.id === hovered || c.id === selected ? 1 : 0;
      c.hover += (target - c.hover) * Math.min(1, dt * 7);
      const h = easeIO(clamp(c.hover));
      c.group.position.set(c.base.x, c.base.y + h * 0.3, c.base.z + (c.floor >= 0 ? h * 1.5 : 0));
      c.om.opacity = h;
    }
  }

  const tmpV = new THREE.Vector3();
  function cellWorldCenter(c, out) {
    c.group.updateWorldMatrix(true, false);
    return out.set(0, 0.6, 0).applyMatrix4(c.group.matrixWorld);
  }

  function updateCamera(dt, t) {
    const e = easeIO(clamp(explode));
    const baseTarget = tmpV.set(lerp(0, 1.5, e), lerp(5.2, 7.4, e), lerp(0, -3.2, e));
    let basePhi = lerp(1.2, 0.98, e) + user.phi;
    basePhi = clamp(basePhi, 0.45, 1.42);
    const aspect = camera.aspect;
    const fit = Math.max(1, 1.55 / Math.max(aspect, 0.5));
    let baseRadius = lerp(54, 63, e) * fit;
    if (floorFocus !== null) {
      const f = floors[floorFocus];
      baseTarget.set(0, f.group.position.y + 0.5, f.group.position.z);
      baseRadius = 40 * fit;
      basePhi = clamp(0.88 + user.phi, 0.45, 1.42);
    }
    const fk = easeIO(focus.k);
    const sway = selected || dragging ? 0 : Math.sin(t * 0.18) * 0.1;
    view.theta += (-0.5 + user.theta + sway - view.theta) * Math.min(1, dt * 4);
    const phiGoal = lerp(basePhi, focus.phi, fk);
    view.phi += (phiGoal - view.phi) * Math.min(1, dt * 4);
    const rGoal = lerp(baseRadius, focus.radius * Math.min(fit, 1.6), fk) * user.zoom;
    view.radius += (rGoal - view.radius) * Math.min(1, dt * 3.5);
    const tGoal = baseTarget.lerp(focus.target, fk);
    view.target.lerp(tGoal, Math.min(1, dt * 4));
    const st = Math.sin(view.phi);
    camera.position.set(
      view.target.x + view.radius * st * Math.sin(view.theta),
      view.target.y + view.radius * Math.cos(view.phi),
      view.target.z + view.radius * st * Math.cos(view.theta),
    );
    camera.lookAt(view.target);
  }

  /* Molduras de fotos reais flutuando sobre o ambiente selecionado ---------- */
  const frameGroup = new THREE.Group();
  scene.add(frameGroup);
  const frameLoader = new THREE.TextureLoader();
  const frameTex = new Map();
  const frameGeo = new THREE.PlaneGeometry(1, 2 / 3);
  const borderGeo = new THREE.BoxGeometry(1.07, 2 / 3 + 0.07, 0.035);
  const borderMat = new THREE.MeshStandardMaterial({ color: 0xf6efe2, roughness: 0.55 });
  let frames = [], framesFor = null, hoveredFrame = null;
  function buildFrames(id) {
    frames.forEach((f) => frameGroup.remove(f));
    frames = [];
    framesFor = id;
    if (!id) return;
    const list = (photos[id] || []).slice(0, 4);
    list.forEach((url, i) => {
      let tex = frameTex.get(url);
      if (!tex) {
        tex = frameLoader.load(url);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        frameTex.set(url, tex);
      }
      const g = new THREE.Group();
      const pic = new THREE.Mesh(frameGeo, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      pic.position.z = 0.02;
      pic.userData.frame = i;
      const border = new THREE.Mesh(borderGeo, borderMat);
      border.castShadow = true;
      g.add(border, pic);
      g.userData = { idx: i, born: t + 0.35 + i * 0.09, pic, hover: 0 };
      g.scale.setScalar(0.0001);
      frameGroup.add(g);
      frames.push(g);
    });
  }
  const fRight = new THREE.Vector3(), fUp = new THREE.Vector3(), fBase = new THREE.Vector3();
  const backOut = (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
  function updateFrames(dt) {
    if (selected !== framesFor) buildFrames(selected);
    if (!frames.length) return;
    const c = cells.find((cc) => cc.id === selected);
    cellWorldCenter(c, fBase);
    fRight.setFromMatrixColumn(camera.matrixWorld, 0);
    fUp.setFromMatrixColumn(camera.matrixWorld, 1);
    const n = frames.length, w = Math.min(2.3, 7.4 / n), gap = w * 1.08;
    const vis = focus.k > 0.55 ? 1 : 0;
    frames.forEach((g, i) => {
      const u = g.userData;
      const age = clamp((t - u.born) / 0.7);
      u.hover += ((g === hoveredFrame ? 1 : 0) - u.hover) * Math.min(1, dt * 10);
      const sc = w * backOut(age) * vis * (1 + u.hover * 0.12) + 0.0001;
      g.scale.set(sc, sc, sc);
      const off = (i - (n - 1) / 2) * gap;
      g.position.copy(fBase)
        .addScaledVector(fRight, off)
        .addScaledVector(fUp, 2.3 + Math.sin(t * 1.3 + i * 1.7) * 0.07 + u.hover * 0.18 + (1 - age) * -0.6);
      g.quaternion.copy(camera.quaternion);
    });
  }

  /* Pinos (rótulos HTML) ---------------------------------------------------- */
  const pins = new Map();
  if (pinsEl) {
    for (const c of cells) {
      const b = document.createElement('button');
      b.className = 'pin';
      b.type = 'button';
      b.dataset.id = c.id;
      b.innerHTML = `<span class="pin__dot"></span><span class="pin__label">${labels[c.id] || c.id}</span>`;
      b.addEventListener('mouseenter', () => setHover(c.id));
      b.addEventListener('mouseleave', () => setHover(null));
      b.addEventListener('focus', () => setHover(c.id));
      b.addEventListener('blur', () => setHover(null));
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        select(c.id);
      });
      pinsEl.appendChild(b);
      pins.set(c.id, b);
    }
  }
  const proj = new THREE.Vector3();
  function updatePins() {
    if (!pinsEl) return;
    const show = explode > 0.75;
    pinsEl.classList.toggle('is-visible', show);
    if (!show) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    for (const c of cells) {
      const el = pins.get(c.id);
      cellWorldCenter(c, proj);
      proj.y += 1.1;
      proj.project(camera);
      const x = (proj.x * 0.5 + 0.5) * w, y = (-proj.y * 0.5 + 0.5) * h;
      const hiddenFloor = floorFocus !== null && c.floor !== floorFocus && c.floor >= 0 && c.floor > floorFocus;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.classList.toggle('is-active', c.id === hovered || c.id === selected);
      el.classList.toggle('is-hidden', proj.z > 1 || hiddenFloor);
    }
  }

  /* Interação --------------------------------------------------------------- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hits = cells.map((c) => c.hit);
  let dragging = false, down = null, pointerInside = false;

  function pickFrame(ev) {
    if (!frames.length || focus.k < 0.55) return null;
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(frames.map((f) => f.userData.pic), false)[0];
    return hit ? frames.find((f) => f.userData.pic === hit.object) : null;
  }
  function pick(ev) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const visibleHits = hits.filter((h) => {
      const c = cells.find((cc) => cc.hit === h);
      return !(floorFocus !== null && c.floor > floorFocus);
    });
    const res = ray.intersectObjects(visibleHits, false);
    return res.length ? res[0].object.userData.id : null;
  }

  function setHover(id) {
    if (id === hovered) return;
    hovered = id;
    canvas.style.cursor = id ? 'pointer' : dragging ? 'grabbing' : 'grab';
    onHover && onHover(id);
  }

  function select(id) {
    selected = id;
    if (id) {
      const c = cells.find((cc) => cc.id === id);
      if (c && c.floor >= 0 && floorFocus !== null && c.floor > floorFocus) setFloor(c.floor);
      focus.k = 0;
      focusAnim = 1;
    } else focusAnim = -1;
    onSelect && onSelect(id);
  }
  let focusAnim = 0;

  function setFloor(i) {
    floorFocus = i;
    floors.forEach((f) => (f.liftTarget = i !== null && f.i > i ? 26 : 0));
  }

  const touches = new Map();
  let pinch = null;
  canvas.addEventListener('pointerdown', (ev) => {
    touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (touches.size === 2) {
      const [a, b] = [...touches.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: user.zoom };
      down = null;
      return;
    }
    down = { x: ev.clientX, y: ev.clientY, t: user.theta, p: user.phi, type: ev.pointerType };
    dragging = false;
  });
  canvas.addEventListener('wheel', (ev) => {
    if (!ev.ctrlKey) return;
    ev.preventDefault();
    user.zoom = clamp(user.zoom * (1 + ev.deltaY * 0.004), 0.5, 1.45);
  }, { passive: false });
  window.addEventListener('pointermove', (ev) => {
    if (touches.has(ev.pointerId)) touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pinch && touches.size === 2) {
      const [a, b] = [...touches.values()];
      user.zoom = clamp(pinch.z * (pinch.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y))), 0.5, 1.45);
      return;
    }
    if (down) {
      const dx = ev.clientX - down.x, dy = ev.clientY - down.y;
      if (!dragging && Math.hypot(dx, dy) > 6) {
        dragging = true;
        canvas.style.cursor = 'grabbing';
      }
      if (dragging) {
        user.theta = clamp(down.t - dx * 0.006, -1.3, 1.3);
        if (down.type === 'mouse') user.phi = clamp(down.p - dy * 0.004, -0.5, 0.35);
      }
      return;
    }
    if (!pointerInside || explode < 0.7) return;
    const f = pickFrame(ev);
    if (f !== hoveredFrame) {
      hoveredFrame = f;
      onFrameHover && onFrameHover(f ? f.userData.idx : null);
    }
    if (f) {
      canvas.style.cursor = 'zoom-in';
      return;
    }
    setHover(pick(ev));
  });
  window.addEventListener('pointerup', (ev) => {
    touches.delete(ev.pointerId);
    if (touches.size < 2) pinch = null;
    if (down && !dragging && explode > 0.7 && ev.target === canvas) {
      const f = pickFrame(ev);
      if (f) {
        onFrame && onFrame(selected, f.userData.idx);
      } else {
        const id = pick(ev);
        select(id === selected ? null : id);
      }
    }
    down = null;
    dragging = false;
    canvas.style.cursor = hovered ? 'pointer' : 'grab';
  });
  canvas.addEventListener('pointerenter', () => (pointerInside = true));
  canvas.addEventListener('pointerleave', () => {
    pointerInside = false;
    if (!down) setHover(null);
    if (hoveredFrame) {
      hoveredFrame = null;
      onFrameHover && onFrameHover(null);
    }
  });
  window.addEventListener('pointercancel', (ev) => {
    touches.delete(ev.pointerId);
    pinch = null;
  });

  /* Loop -------------------------------------------------------------------- */
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (viewOffsetX || viewOffsetY) camera.setViewOffset(w, h, viewOffsetX, viewOffsetY, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  let active = false, last = performance.now(), t = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!active) return;
    step(dt);
    renderer.render(scene, camera);
  }
  function step(dt) {
    t += dt;
    if (focusAnim) {
      focus.k = clamp(focus.k + focusAnim * dt * 1.1);
      if (focus.k === 0 || focus.k === 1) focusAnim = 0;
    }
    if (selected) {
      const c = cells.find((cc) => cc.id === selected);
      cellWorldCenter(c, focus.target);
      focus.radius = c.floor < 0 ? 20 : Math.max(19, c.W * 2.7);
    }
    layout(dt);
    updateCamera(dt, t);
    const hc = cells.find((c) => c.id === (hovered || selected));
    if (hc) {
      cellWorldCenter(hc, hoverLight.position);
      hoverLight.position.y += 2.4;
      hoverLight.position.z += 1;
    }
    hoverLight.intensity += ((hc ? 14 : 0) - hoverLight.intensity) * Math.min(1, dt * 6);
    for (const f of fires) {
      f.scale.y = 0.85 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.07;
      f.scale.x = 1 + Math.sin(t * 9.1) * 0.05;
    }
    for (const l of fireLights) l.intensity = 5 + Math.sin(t * 11) * 1.2 + Math.sin(t * 17.3) * 0.8;
    updateFrames(dt);
    updatePins();
  }
  requestAnimationFrame(frame);
  setShellOpacity(1);
  renderer.compile(scene, camera);

  return {
    setExplode(p) { explodeTarget = clamp(p); },
    setActive(v) { active = v; if (v) last = performance.now(); },
    hover: setHover,
    select,
    setFloor,
    setViewOffset(px, py = 0) { viewOffsetX = px; viewOffsetY = py; resize(); },
    zoomBy(f) { user.zoom = clamp(user.zoom * f, 0.5, 1.45); },
    resetView() { user.theta = 0; user.phi = 0; user.zoom = 1; },
    renderOnce(dt = 1) { for (let i = 0; i < 40; i++) step(dt / 40 * 3); renderer.render(scene, camera); },
    get selected() { return selected; },
    renderer,
  };
}

// Hotel Solar D'Izabel — orquestração do site
import { SPACES, ROOM_ORDER, ROOM_AMENITIES, CAFE_CAPTIONS, GALLERY, INFOS, CONTACT } from './data.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const html = document.documentElement;
const body = document.body;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;
const isDesktop = () => window.innerWidth > 900;
const { gsap, ScrollTrigger, Lenis } = window;

/* ------------------------------------------------------------------------- */
/* WebGL disponível?                                                         */
/* ------------------------------------------------------------------------- */
const webgl = (() => {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
})();
if (!webgl) html.classList.add('no-webgl');

/* ------------------------------------------------------------------------- */
/* Preloader                                                                 */
/* ------------------------------------------------------------------------- */
const pre = $('.preloader');
const preCount = $('.preloader__count b');
let preShown = 0, preTarget = 0;
function setLoad(p) {
  preTarget = Math.max(preTarget, p);
}
(function tickPre() {
  preShown += (preTarget - preShown) * 0.12;
  if (preTarget - preShown < 0.4) preShown = preTarget;
  const v = Math.round(preShown);
  preCount.textContent = v;
  pre.style.setProperty('--p', v + '%');
  if (!body.classList.contains('is-ready')) requestAnimationFrame(tickPre);
})();

/* ------------------------------------------------------------------------- */
/* Scroll suave + ScrollTrigger                                               */
/* ------------------------------------------------------------------------- */
let lenis = null;
if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
if (Lenis && !reduced) {
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, smoothWheel: true });
  lenis.stop();
  if (gsap) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => {
      lenis.raf(t);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }
}
function scrollToY(y, opts = {}) {
  if (lenis) lenis.scrollTo(y, { duration: 1.6, ...opts });
  else {
    window.scrollTo({ top: typeof y === 'number' ? y : y.getBoundingClientRect().top + window.scrollY, behavior: reduced ? 'auto' : 'smooth' });
    opts.onComplete && setTimeout(opts.onComplete, 900);
  }
}

/* ------------------------------------------------------------------------- */
/* Conteúdo dinâmico                                                          */
/* ------------------------------------------------------------------------- */
function buildRooms() {
  const grid = $('.rooms__grid');
  grid.innerHTML = ROOM_ORDER.map((id) => {
    const r = SPACES[id];
    const bars = r.thumbs.map((_, i) => `<i class="${i === 0 ? 'is-on' : ''}"></i>`).join('');
    return `
    <article class="room-card" data-room="${id}" data-reveal>
      <div class="room-card__media" data-cursor="Deslize">
        <img src="${r.thumbs[0]}" alt="${r.name}" loading="lazy">
        <span class="room-card__glare"></span>
        <span class="room-card__tag">${r.photos.length} fotos</span>
        ${r.hydro ? '<span class="room-card__tag room-card__hydro">Hidromassagem</span>' : ''}
        <div class="room-card__bars">${bars}</div>
      </div>
      <div class="room-card__body">
        <p class="room-card__meta"><span>Até ${r.guests} hóspedes</span></p>
        <h3>${r.name}</h3>
        <p>${r.desc}</p>
        <div class="room-card__actions">
          <button class="link-btn" type="button" data-tour="${id}">Tour de fotos</button>
          <button class="link-btn" type="button" data-3d="${id}">Ver na maquete 3D</button>
        </div>
      </div>
    </article>`;
  }).join('');

  $$('.room-card').forEach((card) => {
    const r = SPACES[card.dataset.room];
    const media = $('.room-card__media', card);
    const img = $('img', media);
    const bars = $$('.room-card__bars i', media);
    let idx = 0, loaded = false;
    const show = (i) => {
      if (i === idx) return;
      idx = i;
      img.src = r.thumbs[i];
      bars.forEach((b, k) => b.classList.toggle('is-on', k === i));
    };
    const preload = () => {
      if (loaded) return;
      loaded = true;
      r.thumbs.forEach((src) => (new Image().src = src));
    };
    media.addEventListener('pointerenter', preload);
    media.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const rect = media.getBoundingClientRect();
      show(clamp(Math.floor(((e.clientX - rect.left) / rect.width) * r.thumbs.length), 0, r.thumbs.length - 1));
    });
    media.addEventListener('click', (e) => {
      if (e.pointerType === 'mouse' || !e.pointerType) openTour(card.dataset.room, idx);
      else {
        preload();
        show((idx + 1) % r.thumbs.length);
      }
    });
    // inclinação 3D
    if (finePointer && !reduced) {
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width, y = (e.clientY - rect.top) / rect.height;
        card.style.transform = `perspective(1100px) rotateX(${(0.5 - y) * 5}deg) rotateY(${(x - 0.5) * 6}deg) translateY(-4px)`;
        media.style.setProperty('--gx', `${x * 100}%`);
        media.style.setProperty('--gy', `${y * 100}%`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
        show(0);
      });
    }
  });
}

function buildCafe() {
  const track = $('.cafe__track');
  const c = SPACES.cafe;
  track.innerHTML = c.photos.map((src, i) => `
    <div class="cafe__item">
      <figure><img src="${c.thumbs[i].replace('/t/', '/')}" alt="${CAFE_CAPTIONS[i]}" loading="lazy"></figure>
      <figcaption>${CAFE_CAPTIONS[i]}<small>${String(i + 1).padStart(2, '0')}</small></figcaption>
    </div>`).join('');
  $$('.cafe__item', track).forEach((it, i) => it.addEventListener('click', () => openTour('cafe', i, true)));
}

function buildGallery() {
  const grid = $('.gallery__grid');
  grid.innerHTML = GALLERY.map((g, i) => `
    <button class="gallery__item" type="button" data-i="${i}" data-cat="${g.cat}" data-cursor="Ver">
      <img src="${g.t}" alt="${g.alt}" loading="lazy"><span>${g.alt}</span>
    </button>`).join('');
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.gallery__item');
    if (!b) return;
    const visible = $$('.gallery__item:not(.is-out)', grid).map((el) => GALLERY[+el.dataset.i]);
    const start = visible.indexOf(GALLERY[+b.dataset.i]);
    openTour({ title: 'Galeria', eyebrow: "Hotel Solar D'Izabel", photos: visible.map((g) => g.src), thumbs: visible.map((g) => g.t) }, start, true);
  });
  $$('.gallery__filters button').forEach((btn) =>
    btn.addEventListener('click', () => {
      $$('.gallery__filters button').forEach((b) => b.classList.toggle('is-active', b === btn));
      const cat = btn.dataset.cat;
      $$('.gallery__item', grid).forEach((it) => it.classList.toggle('is-out', cat !== 'all' && it.dataset.cat !== cat));
      ScrollTrigger && ScrollTrigger.refresh();
    }),
  );
}

function buildInfos() {
  $('.accordion').innerHTML = INFOS.map(([t, d], i) => `
    <details ${i === 0 ? 'open' : ''} data-reveal><summary>${t}<i></i></summary><p>${d}</p></details>`).join('');
}

buildRooms();
buildCafe();
buildGallery();
buildInfos();
$('.year').textContent = new Date().getFullYear();

/* ------------------------------------------------------------------------- */
/* Texto: divisão em palavras + revelações                                     */
/* ------------------------------------------------------------------------- */
function splitWords(el) {
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(' '));
          else {
            const w = document.createElement('span');
            w.className = 'w';
            const s = document.createElement('span');
            s.textContent = part;
            s.style.setProperty('--i', i++);
            w.appendChild(s);
            frag.appendChild(w);
          }
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  walk(el);
}
$$('[data-split]').forEach(splitWords);

const io = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }),
  { threshold: 0.15, rootMargin: '0px 0px -6% 0px' },
);
$$('[data-reveal], [data-split]').forEach((el) => io.observe(el));

// contadores
const countIO = new IntersectionObserver((entries) =>
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    const end = +e.target.dataset.count;
    const t0 = performance.now();
    const step = (now) => {
      const k = clamp((now - t0) / 1600);
      e.target.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }),
);
$$('[data-count]').forEach((el) => countIO.observe(el));

// mapa carregado sob demanda
const mapIO = new IntersectionObserver((entries) =>
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.src = e.target.dataset.src;
    mapIO.disconnect();
  }), { rootMargin: '600px' });
$$('iframe[data-src]').forEach((f) => mapIO.observe(f));

/* ------------------------------------------------------------------------- */
/* Navegação                                                                  */
/* ------------------------------------------------------------------------- */
const nav = $('.nav');
const toggle = $('.nav__toggle');
function setMenu(open) {
  body.classList.toggle('menu-open', open);
  toggle.setAttribute('aria-expanded', open);
  $('.menu').setAttribute('aria-hidden', !open);
  if (lenis) open ? lenis.stop() : lenis.start();
}
toggle.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));

let lastY = 0;
function onScrollNav(y) {
  const heroH = window.innerHeight * 1.6;
  nav.classList.toggle('is-solid', y > heroH);
  nav.classList.toggle('is-hidden', y > heroH && y > lastY + 4 && !body.classList.contains('menu-open'));
  if (y < lastY - 4) nav.classList.remove('is-hidden');
  lastY = y;
}
if (lenis) lenis.on('scroll', ({ scroll }) => onScrollNav(scroll));
else window.addEventListener('scroll', () => onScrollNav(window.scrollY), { passive: true });

let maqueteST = null;
function maqueteOpenY() {
  if (maqueteST) return maqueteST.start + (maqueteST.end - maqueteST.start) * 0.82;
  return $('#maquete').getBoundingClientRect().top + window.scrollY;
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  if (id.length < 2) return;
  const target = $(id);
  if (!target) return;
  e.preventDefault();
  setMenu(false);
  if (id === '#maquete') scrollToY(maqueteOpenY(), { duration: 2.2 });
  else if (id === '#inicio') scrollToY(0, { duration: 2 });
  else scrollToY(target.getBoundingClientRect().top + window.scrollY - (id === '#cafe' ? 0 : 40));
});

/* ------------------------------------------------------------------------- */
/* Cursor personalizado                                                       */
/* ------------------------------------------------------------------------- */
const cursor = $('.cursor');
const cursorLabel = $('.cursor__label');
let forcedLabel = '';
if (finePointer && !reduced) {
  body.classList.add('has-cursor');
  let cx = -100, cy = -100, tx = -100, ty = -100;
  window.addEventListener('pointermove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
  });
  document.addEventListener('pointerover', (e) => {
    const lab = e.target.closest('[data-cursor]');
    const link = e.target.closest('a, button, summary, .pin');
    updateCursor(lab ? lab.dataset.cursor : '', !!link);
  });
  document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
  document.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'));
  (function loop() {
    cx += (tx - cx) * 0.22;
    cy += (ty - cy) * 0.22;
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(loop);
  })();
}
let hoverLabel = '', hoverLink = false;
function updateCursor(label, link) {
  hoverLabel = label;
  hoverLink = link;
  const l = forcedLabel || hoverLabel;
  cursorLabel.textContent = l;
  cursor.classList.toggle('has-label', !!l);
  cursor.classList.toggle('is-link', !l && hoverLink);
}
function setForcedCursor(l) {
  forcedLabel = l;
  updateCursor(hoverLabel, hoverLink);
}

/* ------------------------------------------------------------------------- */
/* Tour imersivo de fotos (anel 3D em CSS)                                    */
/* ------------------------------------------------------------------------- */
const tour = $('.tour');
const ringEl = $('.tour__ring');
const ringInner = $('.tour__ring-inner');
const viewer = $('.tour__viewer');
const viewerImg = $('.tour__img');
let tourData = null, tourIdx = 0, ringRot = 0, ringVel = 0, ringRAF = 0, ringStep = 0, lastFocus = null;

function openTour(src, start = 0, direct = false) {
  const d = typeof src === 'string' ? { ...SPACES[src], id: src } : src;
  const eyebrow = d.eyebrow || (d.kind === 'room' ? `Acomodação · até ${d.guests} hóspedes` : d.kind === 'extra' ? 'Experiência' : 'Hotel Solar D\'Izabel');
  tourData = d;
  lastFocus = document.activeElement;
  $('.tour__eyebrow').textContent = eyebrow;
  $('.tour__title').textContent = d.name || d.title;
  // monta o anel
  const photos = d.thumbs || d.photos;
  const n = Math.max(photos.length, 9);
  const list = Array.from({ length: n }, (_, i) => i % photos.length);
  const w = Math.min(window.innerWidth * (isDesktop() ? 0.26 : 0.56), 400);
  ringStep = 360 / n;
  const radius = Math.round(w / 2 / Math.tan(Math.PI / n) * 1.12);
  ringInner.style.setProperty('--w', `${w}px`);
  ringInner.innerHTML = list.map((pi, i) => `
    <button class="tour__card" type="button" data-pi="${pi}" style="--w:${w}px; transform: rotateY(${i * ringStep}deg) translateZ(${radius}px)">
      <img src="${photos[pi]}" alt="${(d.name || d.title)} — foto ${pi + 1}" loading="lazy" draggable="false">
    </button>`).join('');
  ringInner.dataset.radius = radius;
  ringRot = -start * ringStep;
  tour.hidden = false;
  body.style.overflow = 'hidden';
  lenis && lenis.stop();
  cancelAnimationFrame(ringRAF);
  ringLoop();
  if (direct) openViewer(start);
  else viewer.hidden = true;
  $('.tour__close').focus();
}
function closeTour() {
  tour.hidden = true;
  viewer.hidden = true;
  cancelAnimationFrame(ringRAF);
  body.style.overflow = '';
  lenis && lenis.start();
  lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
}
let dragRing = null;
function ringLoop() {
  if (!dragRing) {
    ringVel *= 0.94;
    ringRot += ringVel + (reduced || !viewer.hidden ? 0 : -0.045);
  }
  const r = ringInner.dataset.radius;
  ringInner.style.transform = `translateZ(${-r}px) rotateX(-4deg) rotateY(${ringRot}deg)`;
  ringRAF = requestAnimationFrame(ringLoop);
}
ringEl.addEventListener('pointerdown', (e) => {
  dragRing = { x: e.clientX, rot: ringRot, moved: false, t: performance.now(), lastX: e.clientX };
  ringEl.setPointerCapture(e.pointerId);
});
ringEl.addEventListener('pointermove', (e) => {
  if (!dragRing) return;
  const dx = e.clientX - dragRing.x;
  if (Math.abs(dx) > 5) dragRing.moved = true;
  ringVel = (e.clientX - dragRing.lastX) * 0.12;
  dragRing.lastX = e.clientX;
  ringRot = dragRing.rot + dx * 0.18;
});
ringEl.addEventListener('pointerup', (e) => {
  if (dragRing && !dragRing.moved) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const card = el && el.closest('.tour__card');
    if (card) openViewer(+card.dataset.pi);
  }
  dragRing = null;
});
ringEl.addEventListener('wheel', (e) => {
  ringVel += (e.deltaY + e.deltaX) * -0.01;
  e.preventDefault();
}, { passive: false });
function openViewer(i) {
  const photos = tourData.photos;
  tourIdx = (i + photos.length) % photos.length;
  viewerImg.src = photos[tourIdx];
  viewerImg.alt = `${tourData.name || tourData.title} — foto ${tourIdx + 1}`;
  $('.tour__count').textContent = `${String(tourIdx + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}`;
  viewer.hidden = false;
  if (gsap && !reduced) gsap.fromTo(viewerImg, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' });
}
$('.tour__nav--prev').addEventListener('click', () => openViewer(tourIdx - 1));
$('.tour__nav--next').addEventListener('click', () => openViewer(tourIdx + 1));
viewer.addEventListener('click', (e) => {
  if (e.target === viewer) viewer.hidden = true;
});
$('.tour__close').addEventListener('click', () => (viewer.hidden ? closeTour() : (viewer.hidden = true)));
window.addEventListener('keydown', (e) => {
  if (tour.hidden) {
    if (e.key === 'Escape' && body.classList.contains('menu-open')) setMenu(false);
    return;
  }
  if (e.key === 'Escape') viewer.hidden ? closeTour() : (viewer.hidden = true);
  if (e.key === 'ArrowRight') viewer.hidden ? (ringVel -= 2) : openViewer(tourIdx + 1);
  if (e.key === 'ArrowLeft') viewer.hidden ? (ringVel += 2) : openViewer(tourIdx - 1);
});
let swipeX = null;
viewer.addEventListener('pointerdown', (e) => (swipeX = e.clientX));
viewer.addEventListener('pointerup', (e) => {
  if (swipeX === null) return;
  const dx = e.clientX - swipeX;
  if (Math.abs(dx) > 50) openViewer(tourIdx + (dx < 0 ? 1 : -1));
  swipeX = null;
});
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-tour]');
  if (t) openTour(t.dataset.tour);
  const m = e.target.closest('[data-3d]');
  if (m) goToMaquete(m.dataset['3d']);
});

/* ------------------------------------------------------------------------- */
/* Painel da maquete                                                          */
/* ------------------------------------------------------------------------- */
const MQ_ORDER = ['recepcao', 'lareira', 'cafe', 'luxo', 'master', 'luxo-triplo', 'master-triplo', 'master-quadruplo', 'kids'];
const panel = $('.mq-panel');
const idle = $('.mq-panel__idle');
const detail = $('.mq-panel__detail');
let maquete = null, mqSelected = null;

$('.mq-list').innerHTML = MQ_ORDER.map((id) => {
  const s = SPACES[id];
  const tag = s.kind === 'room' ? `até ${s.guests} hóspedes` : s.floor === 'Jardim' ? 'jardim' : 'área comum';
  return `<li><button type="button" data-id="${id}"><span>${s.label}</span><small>${tag}</small></button></li>`;
}).join('');
$$('.mq-list button').forEach((b) => {
  b.addEventListener('mouseenter', () => maquete && maquete.hover(b.dataset.id));
  b.addEventListener('mouseleave', () => maquete && maquete.hover(null));
  b.addEventListener('click', () => (maquete ? maquete.select(b.dataset.id) : showDetail(b.dataset.id, true)));
});
$('.mq-panel__back').addEventListener('click', () => (maquete ? maquete.select(null) : showDetail(null)));
$('.mq-tour').addEventListener('click', () => mqSelected && openTour(mqSelected));

function showDetail(id, lock = false) {
  if (lock) mqSelected = id;
  if (!id) {
    detail.hidden = true;
    idle.hidden = false;
    return;
  }
  const s = SPACES[id];
  $('.mq-f-eyebrow', detail).textContent = s.kind === 'room' ? `Acomodação · até ${s.guests} hóspedes` : s.floor === 'Jardim' ? 'No jardim' : 'Área comum';
  $('.mq-f-name', detail).textContent = s.name;
  $('.mq-f-short', detail).textContent = s.desc;
  $('.mq-thumbs', detail).innerHTML = s.thumbs.slice(0, 4).map((t, i) => `<button type="button" data-i="${i}" aria-label="Abrir foto ${i + 1}"><img src="${i === 0 ? s.photos[0] : t}" alt="" loading="lazy"></button>`).join('');
  $$('.mq-thumbs button', detail).forEach((b) => b.addEventListener('click', () => openTour(id, +b.dataset.i, true)));
  const chips = s.kind === 'room' ? [...(s.hydro ? ['Banheira de hidromassagem'] : []), ...ROOM_AMENITIES] : s.features || [];
  $('.mq-f-chips', detail).innerHTML = chips.map((c, i) => `<li class="${i === 0 && s.hydro ? 'is-gold' : ''}">${c}</li>`).join('');
  $('.mq-tour', detail).textContent = `Ver fotos reais (${s.photos.length})`;
  $('.mq-panel__back', detail).hidden = !lock && !mqSelected;
  detail.hidden = false;
  idle.hidden = true;
}

function goToMaquete(id) {
  scrollToY(maqueteOpenY(), {
    duration: 2.2,
    onComplete: () => {
      showDetail(id, true);
      // a maquete pode ainda estar carregando: seleciona assim que estiver pronta
      initMaquete().then(() => setTimeout(() => maquete && maquete.select(id), 150));
    },
  });
}

$$('.maquete__floors button').forEach((b) =>
  b.addEventListener('click', () => {
    $$('.maquete__floors button').forEach((x) => x.classList.toggle('is-active', x === b));
    const f = b.dataset.floor;
    if (maquete) {
      maquete.select(null);
      maquete.setFloor(f === 'all' ? null : +f);
    }
  }),
);

$$('.maquete__zoom button').forEach((b) =>
  b.addEventListener('click', () => {
    if (!maquete) return;
    const z = b.dataset.zoom;
    if (z === 'in') maquete.zoomBy(0.8);
    if (z === 'out') maquete.zoomBy(1.25);
    if (z === 'reset') {
      maquete.select(null);
      maquete.setFloor(null);
      maquete.resetView();
      $$('.maquete__floors button').forEach((x) => x.classList.toggle('is-active', x.dataset.floor === 'all'));
    }
  }),
);
window.addEventListener('keydown', (e) => {
  if (!maquete || !stageVisible || !stage.classList.contains('is-open') || !tour.hidden) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault();
    const i = MQ_ORDER.indexOf(mqSelected);
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = i < 0 ? (dir > 0 ? 0 : MQ_ORDER.length - 1) : (i + dir + MQ_ORDER.length) % MQ_ORDER.length;
    maquete.select(MQ_ORDER[next]);
  }
  if (e.key === 'Escape' && mqSelected) maquete.select(null);
});

/* ------------------------------------------------------------------------- */
/* Cenas 3D                                                                   */
/* ------------------------------------------------------------------------- */
let hero = null;
const stage = $('.maquete__stage');

/* Cartão de prévia (segue o cursor) ------------------------------------------- */
const peek = $('.peek');
const peekImg = $('.peek__img img');
let peekId = null;
const mouse = { x: -999, y: -999 };
window.addEventListener('pointermove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  if (peekId) positionPeek(mouse.x, mouse.y);
}, { passive: true });
function positionPeek(x, y) {
  const w = 260, h = peek.offsetHeight || 240;
  let px = x + 24, py = y + 24;
  if (px + w > window.innerWidth - 12) px = x - w - 24;
  if (py + h > window.innerHeight - 12) py = y - h - 18;
  peek.style.transform = `translate3d(${Math.round(px)}px, ${Math.round(py)}px, 0)`;
}
function showPeek(id, x = mouse.x, y = mouse.y, cta = 'Clique para ver as fotos') {
  const s = id && SPACES[id];
  if (!s || !finePointer) return hidePeek();
  if (peekId !== id) {
    peekId = id;
    peekImg.src = s.thumbs[0];
    $('.peek__name').textContent = s.name;
    $('.peek__eyebrow').textContent = s.kind === 'room' ? `Até ${s.guests} hóspedes${s.hydro ? ' · hidromassagem' : ''}` : s.floor === 'Jardim' ? 'No jardim' : 'Área comum';
  }
  $('.peek__cta').textContent = cta;
  peek.classList.add('is-on');
  positionPeek(x, y);
}
function hidePeek() {
  peekId = null;
  peek.classList.remove('is-on');
}

/* Hora do dia ------------------------------------------------------------------ */
const tod = $('.tod');
const todRange = $('.tod__range');
const todTime = $('.tod__time');
const todPlay = $('.tod__play');
let rangeDrag = false;
const fmtHour = (h) => {
  let hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  if (mm === 60) { hh++; mm = 0; }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};
function syncTime(h) {
  if (!rangeDrag) todRange.value = h;
  todTime.textContent = fmtHour(h);
  tod.classList.toggle('is-night', h >= 18.45 || h < 6.1);
  $$('.tod__marks button').forEach((b) => b.classList.toggle('is-active', Math.abs(+b.dataset.h - h) < 0.35));
}

async function initHero() {
  if (!webgl) return;
  try {
    setLoad(12);
    const [{ createHero }, core] = await Promise.all([import('./3d/hero.js'), import('./3d/core.js')]);
    setLoad(35);
    await new Promise((r) => requestAnimationFrame(r));
    const pinsEl = $('.hero__pins');
    hero = createHero($('.hero__canvas'), {
      logoUrl: 'assets/img/logo.png',
      pinsEl,
      onHover: (id, x, y) => (id ? showPeek(id, x, y) : hidePeek()),
      onSelect: (id) => {
        hidePeek();
        openTour(id);
      },
      onTime: syncTime,
    });
    // progresso real do carregamento das texturas
    let done = false;
    hero.ready.then(() => (done = true));
    while (!done) {
      const p = core.texProgress;
      setLoad(35 + (p.total ? (p.loaded / p.total) * 55 : 0));
      await new Promise((r) => setTimeout(r, 120));
    }
    setLoad(92);
    if (reduced) hero.skipIntro();
    syncTime(hero.getTime());
    todRange.addEventListener('pointerdown', () => (rangeDrag = true));
    window.addEventListener('pointerup', () => (rangeDrag = false));
    todRange.addEventListener('input', () => {
      hero.setPlaying(false);
      todPlay.setAttribute('aria-pressed', 'false');
      hero.setTime(+todRange.value, false);
      syncTime(+todRange.value);
    });
    $$('.tod__marks button').forEach((b) =>
      b.addEventListener('click', () => {
        hero.setPlaying(false);
        todPlay.setAttribute('aria-pressed', 'false');
        hero.setTime(+b.dataset.h, true);
      }),
    );
    todPlay.addEventListener('click', () => {
      const on = !hero.isPlaying();
      hero.setPlaying(on);
      todPlay.setAttribute('aria-pressed', String(on));
    });
    // rótulos dos pinos visíveis por alguns segundos após a entrada
    setTimeout(() => {
      pinsEl.classList.add('show-labels');
      setTimeout(() => pinsEl.classList.remove('show-labels'), 6500);
    }, 4200);
    window.addEventListener('pointermove', (e) => {
      hero.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    }, { passive: true });
    if (window.DeviceOrientationEvent && !finePointer) {
      window.addEventListener('deviceorientation', (e) => {
        if (e.gamma == null) return;
        hero.setPointer(clamp(e.gamma / 30, -1, 1), clamp((e.beta - 45) / 30, -1, 1));
      }, { passive: true });
    }
  } catch (err) {
    console.error(err);
    html.classList.add('no-webgl');
  }
}

let maquetePromise = null;
function initMaquete() {
  if (!webgl) return Promise.resolve();
  // garante uma única instância (o pré-aquecimento e o gatilho de rolagem podem chamar juntos)
  if (!maquetePromise) maquetePromise = createMaqueteOnce();
  return maquetePromise;
}
async function createMaqueteOnce() {
  try {
    const { createMaquete } = await import('./3d/maquete.js');
    const labels = Object.fromEntries(Object.entries(SPACES).map(([k, v]) => [k, v.label]));
    maquete = createMaquete($('.maquete__canvas'), {
      pinsEl: $('.maquete__pins'),
      labels,
      photos: Object.fromEntries(Object.entries(SPACES).map(([k, v]) => [k, v.thumbs])),
      onHover: (id) => {
        $$('.mq-list button').forEach((b) => b.classList.toggle('is-hover', b.dataset.id === id));
        if (!mqSelected) showDetail(id);
        setForcedCursor(id ? 'Ver' : '');
        if (id && id !== mqSelected) showPeek(id, mouse.x, mouse.y, 'Clique para entrar no ambiente');
        else hidePeek();
      },
      onFrame: (id, idx) => openTour(id, idx, true),
      onFrameHover: (idx) => setForcedCursor(idx != null ? 'Ampliar' : ''),
      onSelect: (id) => {
        mqSelected = id;
        hidePeek();
        showDetail(id, true);
        if (id) $$('.maquete__floors button').forEach((x) => x.classList.toggle('is-active', x.dataset.floor === 'all'));
      },
    });
    layoutMaquete();
    window.addEventListener('resize', layoutMaquete);
    if (stageVisible) maquete.setActive(true);
    maquete.setExplode(lastExplode);
    if (mqSelected) maquete.select(mqSelected);
  } catch (err) {
    console.error(err);
  }
}
function layoutMaquete() {
  if (!maquete) return;
  if (isDesktop()) maquete.setViewOffset(Math.round((panel.offsetWidth + 40) * 0.5), 0);
  else maquete.setViewOffset(0, Math.round(window.innerHeight * 0.07));
}

/* ------------------------------------------------------------------------- */
/* Animações de rolagem                                                       */
/* ------------------------------------------------------------------------- */
let stageVisible = false, lastExplode = 0;
function setupScroll() {
  if (!gsap || !ScrollTrigger) {
    stage.classList.add('is-open');
    lastExplode = 1;
    return;
  }
  const heroContent = $('.hero__content');
  const heroAside = $('.hero__aside');
  const heroFade = $('.hero__fade');
  const heroShade = $('.hero__shade');

  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: '+=110%',
    pin: true,
    scrub: true,
    onUpdate: (st) => {
      const p = st.progress;
      hero && hero.setProgress(p);
      const k = smooth(0, 0.35, p);
      heroContent.style.opacity = heroAside.style.opacity = String(1 - k);
      heroContent.style.transform = `translateY(${-60 * k}px)`;
      heroShade.style.opacity = String(1 - smooth(0.2, 0.6, p) * 0.7);
      heroFade.style.opacity = String(smooth(0.78, 1, p));
    },
  });
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    endTrigger: '.intro',
    end: 'top top',
    onLeave: () => hero && hero.setActive(false),
    onEnterBack: () => hero && hero.setActive(true),
  });

  maqueteST = ScrollTrigger.create({
    trigger: stage,
    start: 'top top',
    end: '+=150%',
    pin: true,
    scrub: true,
    onUpdate: (st) => {
      lastExplode = clamp(st.progress / 0.72);
      maquete && maquete.setExplode(lastExplode);
      stage.style.setProperty('--p', lastExplode);
      $('.maquete__progress').style.setProperty('--p', lastExplode);
      stage.classList.toggle('is-open', lastExplode > 0.82);
    },
  });
  ScrollTrigger.create({
    trigger: '.maquete',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (st) => {
      stageVisible = st.isActive;
      if (st.isActive && !maquete) initMaquete();
      maquete && maquete.setActive(st.isActive);
    },
  });

  // café: rolagem horizontal
  ScrollTrigger.matchMedia({
    '(min-width: 901px)': () => {
      const track = $('.cafe__track');
      const dist = () => track.scrollWidth - window.innerWidth;
      const tw = gsap.to(track, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: { trigger: '.cafe__pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true },
      });
      $$('.cafe__item img').forEach((img) =>
        gsap.fromTo(img, { scale: 1.25 }, { scale: 1.02, ease: 'none', scrollTrigger: { trigger: img.closest('.cafe__item'), containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } }),
      );
      return () => gsap.set(track, { x: 0 });
    },
  });

  // parallax
  $$('[data-parallax]').forEach((el) => {
    gsap.fromTo(el, { yPercent: 0 }, { yPercent: +el.dataset.parallax, ease: 'none', scrollTrigger: { trigger: '.intro', start: 'top bottom', end: 'bottom top', scrub: true } });
    const img = $('img', el);
    gsap.fromTo(img, { scale: 1.18 }, { scale: 1.02, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.fromTo('.final__bg', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.cafe__bg', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.cafe', start: 'top bottom', end: 'bottom top', scrub: true } });

  // link ativo no menu
  $$('.nav__links a').forEach((a) => {
    const sec = $(a.getAttribute('href'));
    if (!sec) return;
    ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: (st) => a.classList.toggle('is-current', st.isActive) });
  });
}

/* ------------------------------------------------------------------------- */
/* Inicialização                                                              */
/* ------------------------------------------------------------------------- */
(async function boot() {
  setLoad(5);
  const fonts = document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve();
  const minTime = new Promise((r) => setTimeout(r, reduced ? 200 : 1300));
  await initHero();
  await fonts;
  setLoad(100);
  await minTime;
  await new Promise((r) => setTimeout(r, 350));
  setupScroll();
  window.scrollTo(0, 0);
  body.classList.add('is-ready');
  body.classList.remove('is-loading');
  lenis && lenis.start();
  hero && hero.start();
  ScrollTrigger && ScrollTrigger.refresh();
  // pré-aquece a maquete quando o navegador estiver ocioso
  const warm = () => initMaquete();
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 3500 });
  else setTimeout(warm, 2500);
})();

// expõe para depuração
window.__dizabel = { get hero() { return hero; }, get maquete() { return maquete; }, get lenis() { return lenis; }, maqueteOpenY, openTour, CONTACT };

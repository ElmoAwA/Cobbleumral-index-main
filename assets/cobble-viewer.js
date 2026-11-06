// Visor de modelos Bedrock de Cobblemon sobre three.js.
import * as THREE from './vendor/three.module.min.js';

const rad = d => d * Math.PI / 180;
const loader = new THREE.TextureLoader();
loader.setCrossOrigin('anonymous');

function loadTex(url) {
  return new Promise((ok, no) => loader.load(url, t => {
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    ok(t);
  }, undefined, no));
}

// Devuelve los rectángulos UV de un cubo con box-UV de Minecraft.
function boxUV(uv, s, mirror) {
  const [u, v] = uv, [w, h, d] = s.map(n => Math.floor(n + 1e-4) === n ? n : n);
  const f = {
    north: [u + d, v + d, u + d + w, v + d + h],
    east: [u, v + d, u + d, v + d + h],
    south: [u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h],
    west: [u + d + w, v + d, u + 2 * d + w, v + d + h],
    up: [u + d + w, v + d, u + d, v],
    down: [u + d + 2 * w, v, u + d + w, v + d],
  };
  if (mirror) {
    const flip = r => [r[2], r[1], r[0], r[3]];
    const e = f.east; f.east = flip(f.west); f.west = flip(e);
    f.north = flip(f.north); f.south = flip(f.south);
    f.up = flip(f.up); f.down = flip(f.down);
  }
  return f;
}

function faceCorners(a, b) {
  const [x1, y1, z1] = a, [x2, y2, z2] = b;
  return { // arriba-izq, abajo-izq, abajo-der, arriba-der vistos desde afuera
    north: [[x2, y2, z1], [x2, y1, z1], [x1, y1, z1], [x1, y2, z1]],
    south: [[x1, y2, z2], [x1, y1, z2], [x2, y1, z2], [x2, y2, z2]],
    east: [[x2, y2, z2], [x2, y1, z2], [x2, y1, z1], [x2, y2, z1]],
    west: [[x1, y2, z1], [x1, y1, z1], [x1, y1, z2], [x1, y2, z2]],
    up: [[x1, y2, z1], [x1, y2, z2], [x2, y2, z2], [x2, y2, z1]],
    down: [[x1, y1, z2], [x1, y1, z1], [x2, y1, z1], [x2, y1, z2]],
  };
}
const NORMALS = { north: [0, 0, -1], south: [0, 0, 1], east: [1, 0, 0], west: [-1, 0, 0], up: [0, 1, 0], down: [0, -1, 0] };

function cubeGeometry(c, W, H, boneMirror) {
  const [ox, oy, oz] = c.origin, [sx, sy, sz] = c.size, inf = c.inflate || 0;
  const a = [-(ox + sx) - inf, oy - inf, oz - inf], b = [-ox + inf, oy + sy + inf, oz + sz + inf];
  const corners = faceCorners(a, b);
  const mirror = c.mirror ?? boneMirror;
  const rects = {};
  if (Array.isArray(c.uv)) Object.assign(rects, boxUV(c.uv, c.size, mirror));
  else if (c.uv) for (const [k, f] of Object.entries(c.uv)) {
    if (!f || !f.uv) continue;
    const us = f.uv_size || [0, 0];
    rects[k] = [f.uv[0], f.uv[1], f.uv[0] + us[0], f.uv[1] + us[1]];
  }
  const pos = [], nor = [], uvs = [], idx = [];
  for (const k of Object.keys(corners)) {
    const r = rects[k]; if (!r) continue;
    if (r[0] === r[2] || r[1] === r[3]) continue;
    const n = pos.length / 3;
    const [tl, bl, br, tr] = corners[k];
    pos.push(...tl, ...bl, ...br, ...tr);
    for (let i = 0; i < 4; i++) nor.push(...NORMALS[k]);
    const [u1, v1, u2, v2] = [r[0] / W, 1 - r[1] / H, r[2] / W, 1 - r[3] / H];
    uvs.push(u1, v1, u1, v2, u2, v2, u2, v1);
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
  }
  return { pos, nor, uvs, idx };
}

function mergeInto(g, acc) {
  const off = acc.pos.length / 3;
  acc.pos.push(...g.pos); acc.nor.push(...g.nor); acc.uvs.push(...g.uvs);
  for (const i of g.idx) acc.idx.push(i + off);
}
function toGeo(acc) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(acc.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(acc.nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(acc.uvs, 2));
  g.setIndex(acc.idx);
  return g;
}

// Molang: lo justo para las animaciones de idle (trigonometría en grados).
const molangCache = new Map();
const M = {
  sin: d => Math.sin(rad(d)), cos: d => Math.cos(rad(d)), abs: Math.abs, floor: Math.floor, ceil: Math.ceil,
  sqrt: Math.sqrt, pow: Math.pow, min: Math.min, max: Math.max, mod: (a, b) => a % b, round: Math.round,
  clamp: (v, a, b) => Math.min(b, Math.max(a, v)), lerp: (a, b, t) => a + (b - a) * t, pi: Math.PI, exp: Math.exp,
  atan: x => Math.atan(x) * 180 / Math.PI, asin: x => Math.asin(x) * 180 / Math.PI, acos: x => Math.acos(x) * 180 / Math.PI,
};
function molang(src) {
  if (typeof src === 'number') return () => src;
  if (molangCache.has(src)) return molangCache.get(src);
  let fn;
  try {
    const js = String(src).toLowerCase()
      .replace(/(query|q)\.(anim_time|life_time)/g, 't')
      .replace(/math\./g, 'M.')
      .replace(/\b(query|q|variable|v|temp)\.[a-z_0-9.]+/g, '0');
    if (/[^0-9a-zM.+\-*\/%()<>=!?:&|,\s_t]/.test(js.replace(/M\.[a-z]+/g, 'M'))) throw 0;
    fn = new Function('t', 'M', `return (${js})||0`);
    fn(0, M);
  } catch { fn = () => 0; }
  const f = t => fn(t, M);
  molangCache.set(src, f);
  return f;
}
const vec = v => (Array.isArray(v) ? v : [v, v, v]).map(molang);

function channel(def) {
  if (def === undefined) return null;
  if (Array.isArray(def) || typeof def !== 'object') { const c = vec(def); return t => c.map(f => f(t)); }
  const keys = Object.keys(def).map(k => {
    const raw = def[k]; const obj = raw && !Array.isArray(raw) && typeof raw === 'object';
    return { t: parseFloat(k), pre: vec(obj ? (raw.pre ?? raw.post) : raw), post: vec(obj ? (raw.post ?? raw.pre) : raw) };
  }).sort((a, b) => a.t - b.t);
  if (!keys.length) return null;
  return t => {
    if (t <= keys[0].t) return keys[0].pre.map(f => f(t));
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t < b.t) {
        const k = (t - a.t) / (b.t - a.t);
        return a.post.map((f, j) => { const x = f(t); return x + (b.pre[j](t) - x) * k; });
      }
    }
    return keys[keys.length - 1].post.map(f => f(t));
  };
}

const cache = new Map();
export function fetchModel(base, key) {
  if (!cache.has(key)) cache.set(key, fetch(`${base}m/${key}.json`).then(r => { if (!r.ok) throw new Error('modelo no encontrado: ' + key); return r.json(); }));
  return cache.get(key);
}

function buildRig(d, mat, emMat) {
  const root = new THREE.Group(), bones = {}, list = [];
  const defs = {}; d.b.forEach(b => defs[b.name] = b);
  for (const b of d.b) {
    const g = new THREE.Group(); g.name = b.name; bones[b.name] = g;
    const p = b.pivot || [0, 0, 0];
    g.userData.pivot = [-p[0], p[1], p[2]];
    const r = b.rotation || [0, 0, 0];
    g.userData.rest = [-rad(r[0]), -rad(r[1]), rad(r[2])];
    g.rotation.order = 'ZYX';
    g.rotation.set(...g.userData.rest);
    list.push(g);
    const acc = { pos: [], nor: [], uvs: [], idx: [] };
    for (const c of b.cubes || []) {
      const cg = cubeGeometry(c, d.w, d.h, b.mirror);
      if (c.rotation) {
        const pv = c.pivot || c.origin;
        const q = new THREE.Euler(-rad(c.rotation[0]), -rad(c.rotation[1]), rad(c.rotation[2]), 'ZYX');
        const m = new THREE.Matrix4().makeTranslation(-pv[0], pv[1], pv[2])
          .multiply(new THREE.Matrix4().makeRotationFromEuler(q))
          .multiply(new THREE.Matrix4().makeTranslation(pv[0], -pv[1], -pv[2]));
        const nm = new THREE.Matrix3().getNormalMatrix(m), v = new THREE.Vector3();
        for (let i = 0; i < cg.pos.length; i += 3) {
          v.fromArray(cg.pos, i).applyMatrix4(m).toArray(cg.pos, i);
          v.fromArray(cg.nor, i).applyMatrix3(nm).normalize().toArray(cg.nor, i);
        }
      }
      mergeInto(cg, acc);
    }
    if (acc.pos.length) {
      // Los vértices están en espacio de modelo: se llevan al espacio local del hueso.
      for (let i = 0; i < acc.pos.length; i += 3) {
        acc.pos[i] -= g.userData.pivot[0]; acc.pos[i + 1] -= g.userData.pivot[1]; acc.pos[i + 2] -= g.userData.pivot[2];
      }
      const geo = toGeo(acc);
      g.add(new THREE.Mesh(geo, mat));
      if (emMat) { const e = new THREE.Mesh(geo, emMat); e.renderOrder = 2; g.add(e); }
    }
  }
  for (const b of d.b) {
    const g = bones[b.name], par = b.parent && bones[b.parent];
    const pp = par ? par.userData.pivot : [0, 0, 0], p = g.userData.pivot;
    g.position.set(p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]);
    g.userData.base = g.position.clone();
    (par || root).add(g);
  }
  const tracks = [];
  let len = 0;
  for (const a of d.a || []) {
    len = Math.max(len, a.animation_length || 0);
    for (const [name, ch] of Object.entries(a.bones || {})) {
      const g = bones[name]; if (!g) continue;
      tracks.push({ g, rot: channel(ch.rotation), pos: channel(ch.position), scl: channel(ch.scale) });
    }
  }
  const pose = t => {
    const tt = len ? t % len : t;
    for (const l of list) { l.rotation.set(...l.userData.rest); l.position.copy(l.userData.base); l.scale.set(1, 1, 1); }
    for (const k of tracks) {
      if (k.rot) { const r = k.rot(tt); k.g.rotation.x -= rad(r[0]); k.g.rotation.y -= rad(r[1]); k.g.rotation.z += rad(r[2]); }
      if (k.pos) { const p = k.pos(tt); k.g.position.x -= p[0]; k.g.position.y += p[1]; k.g.position.z += p[2]; }
      if (k.scl) { const s = k.scl(tt); k.g.scale.set(s[0], s[1], s[2]); }
    }
  };
  return { root, pose };
}

export class CobbleViewer {
  constructor(canvas, { base, turntable = true, drag = true, yaw = Math.PI - 0.6, pitch = 0.14, transparent = true, light = 'umbral' } = {}) {
    this.canvas = canvas; this.base = base; this.turntable = turntable;
    this.yaw = yaw; this.pitch = pitch; this.t = 0; this.running = false;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: transparent, antialias: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(26, 1, 0.5, 2000);
    const warm = light === 'neutral' ? 0xffffff : 0xfff0d8;
    this.scene.add(new THREE.HemisphereLight(0xffffff, light === 'neutral' ? 0xb8b0c8 : 0x6a5aa8, 2.3));
    const sun = new THREE.DirectionalLight(warm, 1.5); sun.position.set(-40, 80, 90); this.scene.add(sun);
    if (light !== 'neutral') { const rim = new THREE.DirectionalLight(0x8fc8ff, 0.9); rim.position.set(70, 30, -60); this.scene.add(rim); }
    this.pivot = new THREE.Group(); this.scene.add(this.pivot);
    this._resize = () => this.resize();
    if (typeof ResizeObserver !== 'undefined') { this._ro = new ResizeObserver(this._resize); this._ro.observe(canvas); }
    if (drag) this._bindDrag();
    this.resize();
  }
  _bindDrag() {
    let on = false, lx = 0, ly = 0, c = this.canvas;
    c.style.touchAction = 'pan-y';
    c.addEventListener('pointerdown', e => { on = true; lx = e.clientX; ly = e.clientY; this.dragged = true; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', e => { if (!on) return; this.yaw += (e.clientX - lx) * .012; this.pitch = Math.max(-.5, Math.min(.9, this.pitch + (e.clientY - ly) * .008)); lx = e.clientX; ly = e.clientY; this._draw(); });
    const up = () => { on = false; this.spinPauseUntil = performance.now() + 2500; };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  }
  resize() {
    const c = this.canvas, w = c.clientWidth || c.width, h = c.clientHeight || c.height;
    if (!w || !h) return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this._fit(); this._draw();
  }
  async load(key, shiny = false) {
    const token = this.token = Symbol();
    const d = await fetchModel(this.base, key);
    const tp = shiny && d.s ? d.s : d.t, ep = shiny ? (d.es || null) : d.e;
    const [tex, em] = await Promise.all([loadTex(this.base + 't/' + tp), ep ? loadTex(this.base + 't/' + ep).catch(() => null) : null]);
    if (token !== this.token) return;
    const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: .5, side: THREE.DoubleSide });
    const emMat = em ? new THREE.MeshBasicMaterial({ map: em, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }) : null;
    this.pivot.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.map?.dispose(); o.material.dispose(); } });
    this.pivot.clear();
    this.rig = buildRig(d, mat, emMat);
    this.pivot.add(this.rig.root);
    this.rig.pose(0);
    this.hasShiny = !!d.s;
    this._fit(); this._draw();
  }
  _fit() {
    if (!this.rig) return;
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.rig.root);
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    this.center = c;
    const rad3 = Math.max(s.y * .56, Math.hypot(s.x, s.z) * .5 / Math.min(1, this.camera.aspect) * .92);
    this.dist = rad3 / Math.tan(rad(this.camera.fov / 2)) * 1.08;
  }
  _draw() {
    if (!this.rig || !this.center) { return; }
    const d = this.dist, c = this.center;
    this.pivot.position.set(0, 0, 0);
    this.camera.position.set(
      c.x + Math.sin(this.yaw) * Math.cos(this.pitch) * d,
      c.y + Math.sin(this.pitch) * d,
      c.z + Math.cos(this.yaw) * Math.cos(this.pitch) * d);
    this.camera.lookAt(c);
    this.renderer.render(this.scene, this.camera);
  }
  start() {
    if (this.running) return; this.running = true;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let last = performance.now();
    const loop = n => {
      if (!this.running) return;
      const dt = Math.min(.1, (n - last) / 1000); last = n;
      this.t += dt;
      if (this.rig && !reduce) {
        this.rig.pose(this.t);
        if (this.turntable && !(this.spinPauseUntil > n)) this.yaw += dt * .32;
      }
      this._draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  destroy() { this.stop(); this._ro?.disconnect(); this.renderer.dispose(); this.renderer.forceContextLoss?.(); }
  snapshot(type = 'image/webp', q = .9) { this._draw(); return this.canvas.toDataURL(type, q); }
}

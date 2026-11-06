(() => {
const base = 'cobblemon/';
const $ = id => document.getElementById(id);

// Copiar la IP
$('copiar').addEventListener('click', async e => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText($('ip').textContent); b.textContent = 'Copiada'; }
  catch { const r = document.createRange(); r.selectNodeContents($('ip')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Ctrl + C'; }
  setTimeout(() => b.textContent = 'Copiar IP', 1800);
});

// Jugadores conectados: solo se muestra a partir de 5.
fetch('https://api.mcsrvstat.us/3/mc.cobbleumbral.fun').then(r => r.json()).then(d => {
  if (d.online && d.players?.online >= 5) $('estado').innerHTML = `<i></i>${d.players.online} entrenadores conectados ahora`;
}).catch(() => {});

// Dibujo en bloques
const R = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w + .02}" height="${h + .02}" fill="${c}"/>`;
let semilla = 7;
const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
const estrellas = (n, alto, c = '#fff3cf') => { let s = ''; for (let i = 0; i < n; i++) s += R(Math.floor(azar() * 40), Math.floor(azar() * alto), 1, 1, c); return s; };

let luna = '';
for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
  if (Math.hypot(x - 15.5, y - 15.5) > 15.6) continue;
  const n = (x * 7 + y * 13 + x * y) % 11;
  const crater = Math.hypot(x - 10, y - 11) < 3 || Math.hypot(x - 21, y - 20) < 4 || Math.hypot(x - 22, y - 7) < 1.8;
  luna += R(x, y, 1, 1, crater ? '#e9d49e' : n < 2 ? '#f6e6b6' : '#fff3cf');
}
$('luna').innerHTML = luna;
const hz = $('horizonte'), W = 160, H = 12;
hz.setAttribute('viewBox', `0 0 ${W} ${H}`);
let cols = '', cerca = '';
for (let x = 0; x < W; x++) {
  const a = 6 + Math.round(2.6 * Math.sin(x * .13) + 1.7 * Math.sin(x * .41 + 2));
  const b = 2 + Math.round(1.4 * Math.sin(x * .23 + 1) + .8 * Math.sin(x * .7));
  cols += R(x, H - a, 1, a, '#3a1f6c'); cerca += R(x, H - b, 1, b, '#1b1446');
}
hz.innerHTML = cols + cerca;

const escenas = {
  liga() { // podio con público de banderines
    let s = R(0, 0, 40, 26, '#2c1f6e') + estrellas(26, 12);
    for (let x = 0; x < 40; x += 4) s += R(x, 2 + (x % 8 ? 1 : 0), 2, 3, x % 8 ? '#e5589b' : '#ffc93c');
    for (let x = 0; x < 40; x++) s += R(x, 1, 1, 1, '#c6bdea');
    s += R(0, 23, 40, 3, '#1b1446');
    s += R(13, 20, 14, 4, '#ffc93c') + R(13, 23, 14, 1, '#a86f00');
    s += R(4, 22, 9, 2, '#c6bdea') + R(27, 22, 9, 2, '#d98a4b');
    return s;
  },
  torneo() { // llave de eliminación
    let s = R(0, 0, 40, 26, '#14305f');
    const L = '#62dcff', D = '#2b5a99';
    for (let i = 0; i < 4; i++) { const y = 3 + i * 6; s += R(1, y, 6, 2, D) + R(33, y, 6, 2, D); }
    for (let i = 0; i < 2; i++) {
      const y = 4 + i * 12;
      s += R(7, y, 2, 1, L) + R(7, y + 6, 2, 1, L) + R(9, y, 1, 7, L) + R(10, y + 3, 3, 1, L);
      s += R(31, y, 2, 1, L) + R(31, y + 6, 2, 1, L) + R(30, y, 1, 7, L) + R(27, y + 3, 3, 1, L);
    }
    s += R(0, 24, 40, 2, '#0d1f42') + R(10, 22, 20, 2, '#2b5a99');
    return s;
  },
  dungeon() { // muro de piedra con antorchas
    let s = R(0, 0, 40, 26, '#35304f');
    for (let y = 0; y < 22; y += 3) for (let x = (y % 2 ? -3 : 0); x < 40; x += 6) { s += R(Math.max(x, 0), y, 5 + Math.min(x, 0), 2, azar() < .3 ? '#463f66' : '#3d3759'); }
    s += R(13, 6, 14, 18, '#120d2a') + R(11, 4, 2, 20, '#5a5378') + R(27, 4, 2, 20, '#5a5378') + R(13, 4, 14, 2, '#5a5378');
    for (const x of [5, 33]) s += R(x, 11, 2, 5, '#6b4423') + R(x - 1, 8, 4, 3, '#f08a3e') + R(x, 6, 2, 3, '#ffc93c') + R(x - 3, 6, 8, 8, '#ffc93c22');
    s += R(0, 23, 40, 3, '#231f3b');
    return s;
  },
  noche() { // bosque con ojos en la oscuridad
    let s = R(0, 0, 40, 26, '#1b1446') + estrellas(30, 13) + R(30, 2, 6, 6, '#fff3cf') + R(32, 3, 4, 4, '#1b1446');
    for (let x = 0; x < 40; x += 1) { const h = 6 + Math.round(3 * Math.sin(x * .9) + 2 * Math.sin(x * .31)); s += R(x, 23 - h, 1, h, '#2d1f5e'); }
    for (const [x, y, c] of [[4, 17, '#ff5a5a'], [34, 15, '#ffc93c'], [9, 13, '#62dcff'], [29, 19, '#ff5a5a']]) s += R(x, y, 1, 1, c) + R(x + 2, y, 1, 1, c);
    s += R(0, 22, 40, 4, '#120d33');
    return s;
  },
  mesa() { // mesa de encantar y runas flotando
    let s = R(0, 0, 40, 26, '#241048');
    const runas = ['#62dcff', '#c084ff', '#ffc93c'];
    for (let i = 0; i < 26; i++) { const x = Math.floor(azar() * 38), y = Math.floor(azar() * 17), c = runas[i % 3]; s += R(x, y, 2, 1, c) + (i % 2 ? R(x, y + 1, 1, 1, c) : R(x + 1, y + 1, 1, 1, c)); }
    s += R(9, 21, 22, 3, '#3a1020') + R(9, 21, 22, 1, '#c23b55') + R(9, 21, 2, 1, '#62dcff') + R(29, 21, 2, 1, '#62dcff') + R(0, 24, 40, 2, '#160a2e');
    return s;
  },
};
document.querySelectorAll('[data-escena]').forEach(e => {
  e.insertAdjacentHTML('afterbegin', `<svg viewBox="0 0 40 26" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${escenas[e.dataset.escena]()}</svg>`);
});

// 3D si el navegador puede cargarlo. Abriendo el archivo directo se usan las imágenes.
const cargar3D = import('./cobble-viewer.js').then(m => m.CobbleViewer).catch(() => null);

function vitrina({ canvas, img, boton, opciones }) {
  let vis = null, clave = null, shiny = false;
  const pintar = (k, nombre) => {
    clave = k;
    img.src = `${base}i/${k}.webp`; img.alt = nombre;
    if (vis) vis.load(k, shiny).catch(() => {});
  };
  boton.addEventListener('click', () => {
    shiny = !shiny; boton.setAttribute('aria-pressed', shiny);
    if (vis) vis.load(clave, shiny).catch(() => {});
  });
  const encender = async () => {
    const C = await cargar3D;
    if (!C) { boton.hidden = true; return; }
    try {
      const v = new C(canvas, { base });
      canvas.hidden = false; v.resize();
      await v.load(clave, shiny);
      vis = v; img.hidden = true; v.start();
      new IntersectionObserver(([e]) => { e.isIntersecting ? v.start() : v.stop(); }).observe(canvas);
    } catch { canvas.hidden = true; boton.hidden = true; }
  };
  return { pintar, encender };
}

const elenco = [['umbreon', 'Umbreon'], ['gengar', 'Gengar'], ['charizard', 'Charizard'], ['lucario', 'Lucario'], ['garchomp', 'Garchomp'], ['metagross', 'Metagross'], ['gholdengo', 'Gholdengo'], ['kingambit', 'Kingambit']];
let i = 0;
const hero = vitrina({ canvas: $('heroe'), img: $('heroeImg'), boton: $('shiny') });
const verHero = () => { $('nombre').textContent = elenco[i][1]; hero.pintar(...elenco[i]); };
verHero(); hero.encender();
$('otro').addEventListener('click', () => { i = (i + 1) % elenco.length; verHero(); });

const inis = [['bulbasaur','Bulbasaur'],['charmander','Charmander'],['squirtle','Squirtle'],['chikorita','Chikorita'],['cyndaquil','Cyndaquil'],['totodile','Totodile'],['treecko','Treecko'],['torchic','Torchic'],['mudkip','Mudkip'],['turtwig','Turtwig'],['chimchar','Chimchar'],['piplup','Piplup'],['snivy','Snivy'],['tepig','Tepig'],['oshawott','Oshawott'],['chespin','Chespin'],['fennekin','Fennekin'],['froakie','Froakie'],['rowlet','Rowlet'],['litten','Litten'],['popplio','Popplio'],['grookey','Grookey'],['scorbunny','Scorbunny'],['sobble','Sobble'],['sprigatito','Sprigatito'],['fuecoco','Fuecoco'],['quaxly','Quaxly']];
const grilla = $('iniciales');
const ini = vitrina({ canvas: $('vitrina'), img: $('vitrinaImg'), boton: $('shinyIni') });
const verIni = (k, n) => { $('nombreIni').textContent = n; [...grilla.children].forEach(b => b.setAttribute('aria-pressed', b.dataset.k === k)); ini.pintar(k, n); };
inis.forEach(([k, n]) => {
  const b = document.createElement('button'); b.type = 'button'; b.dataset.k = k; b.title = n; b.setAttribute('aria-label', n);
  b.innerHTML = `<img src="${base}i/${k}.webp" alt="" loading="lazy" width="96" height="96">`;
  b.addEventListener('click', () => verIni(k, n));
  grilla.append(b);
});
verIni('rowlet', 'Rowlet');
const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { obs.disconnect(); ini.encender(); } }, { rootMargin: '200px' });
obs.observe($('vitrinaImg').parentElement);
})();

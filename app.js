/* Pokédex do Henrique — app principal */
'use strict';

const TOTAL = 1025;
const API = 'https://pokeapi.co/api/v2';
const SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const art = (id, shiny) => `${SPR}/other/official-artwork/${shiny ? 'shiny/' : ''}${id}.png`;
const sprite = id => `${SPR}/${id}.png`;
const BALL = `${SPR.replace('/pokemon', '')}/items/poke-ball.png`;

const GENS = [
  { n: 1, a: 1, b: 151, r: 'Kanto' }, { n: 2, a: 152, b: 251, r: 'Johto' },
  { n: 3, a: 252, b: 386, r: 'Hoenn' }, { n: 4, a: 387, b: 493, r: 'Sinnoh' },
  { n: 5, a: 494, b: 649, r: 'Unova' }, { n: 6, a: 650, b: 721, r: 'Kalos' },
  { n: 7, a: 722, b: 809, r: 'Alola' }, { n: 8, a: 810, b: 905, r: 'Galar' },
  { n: 9, a: 906, b: 1025, r: 'Paldea' },
];
const genOf = id => GENS.find(g => id >= g.a && id <= g.b) || GENS[0];

const TYPES = {
  normal: ['Normal', '#9fa19f'], fire: ['Fogo', '#e62829'], water: ['Água', '#2980ef'],
  electric: ['Elétrico', '#e8b900'], grass: ['Planta', '#3fa129'], ice: ['Gelo', '#3dcef3'],
  fighting: ['Lutador', '#ff8000'], poison: ['Venenoso', '#9141cb'], ground: ['Terrestre', '#915121'],
  flying: ['Voador', '#81b9ef'], psychic: ['Psíquico', '#ef4179'], bug: ['Inseto', '#91a119'],
  rock: ['Pedra', '#afa981'], ghost: ['Fantasma', '#704170'], dragon: ['Dragão', '#5060e1'],
  dark: ['Sombrio', '#624d4e'], steel: ['Aço', '#60a1b8'], fairy: ['Fada', '#ef70ef'],
};
// Tabela defensiva: [fraco a (2x), resiste (0.5x), imune (0x)]
const DEF = {
  normal: [['fighting'], [], ['ghost']],
  fire: [['water', 'ground', 'rock'], ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'], []],
  water: [['electric', 'grass'], ['fire', 'water', 'ice', 'steel'], []],
  electric: [['ground'], ['electric', 'flying', 'steel'], []],
  grass: [['fire', 'ice', 'poison', 'flying', 'bug'], ['water', 'electric', 'grass', 'ground'], []],
  ice: [['fire', 'fighting', 'rock', 'steel'], ['ice'], []],
  fighting: [['flying', 'psychic', 'fairy'], ['bug', 'rock', 'dark'], []],
  poison: [['ground', 'psychic'], ['grass', 'fighting', 'poison', 'bug', 'fairy'], []],
  ground: [['water', 'grass', 'ice'], ['poison', 'rock'], ['electric']],
  flying: [['electric', 'ice', 'rock'], ['grass', 'fighting', 'bug'], ['ground']],
  psychic: [['bug', 'ghost', 'dark'], ['fighting', 'psychic'], []],
  bug: [['fire', 'flying', 'rock'], ['grass', 'fighting', 'ground'], []],
  rock: [['water', 'grass', 'fighting', 'ground', 'steel'], ['normal', 'fire', 'poison', 'flying'], []],
  ghost: [['ghost', 'dark'], ['poison', 'bug'], ['normal', 'fighting']],
  dragon: [['ice', 'dragon', 'fairy'], ['fire', 'water', 'electric', 'grass'], []],
  dark: [['fighting', 'bug', 'fairy'], ['ghost', 'dark'], ['psychic']],
  steel: [['fire', 'fighting', 'ground'], ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'], ['poison']],
  fairy: [['poison', 'steel'], ['fighting', 'bug', 'dark'], ['dragon']],
};
const STATS = {
  hp: ['PS', '#ff5959'], attack: ['Ataque', '#f5ac78'], defense: ['Defesa', '#fae078'],
  'special-attack': ['Atq. Esp.', '#9db7f5'], 'special-defense': ['Def. Esp.', '#a7db8d'], speed: ['Velocidade', '#fa92b2'],
};

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(3, '0');
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
};
const prettyName = n => n.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
  .replace(/^Nidoran F$/, 'Nidoran♀').replace(/^Nidoran M$/, 'Nidoran♂')
  .replace(/^Mr Mime$/, 'Mr. Mime').replace(/^Mime Jr$/, 'Mime Jr.').replace(/^Mr Rime$/, 'Mr. Rime')
  .replace(/^Farfetchd$/, "Farfetch'd").replace(/^Sirfetchd$/, "Sirfetch'd").replace(/^Ho Oh$/, 'Ho-Oh')
  .replace(/^Porygon Z$/, 'Porygon-Z').replace(/^Type Null$/, 'Type: Null').replace(/^Flabebe$/, 'Flabébé');
const clean = t => t.replace(/[\f\n\r­]+/g, ' ').replace(/\s+/g, ' ').replace(/POKéMON/g, 'Pokémon').trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));

const memo = new Map();
async function getJSON(url) {
  if (memo.has(url)) return memo.get(url);
  const p = fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  memo.set(url, p);
  p.catch(() => memo.delete(url));
  return p;
}

/* ---------- Sons (sintetizados) ---------- */
let muted = store.get('muted', false);
let actx;
function ac() {
  if (!actx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; actx = new C(); }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, dur, { type = 'square', vol = 0.06, when = 0, to } = {}) {
  if (muted) return;
  const c = ac(); if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
const SFX = {
  click() { tone(1320, 0.04, { vol: 0.04 }); },
  move() { tone(990, 0.03, { vol: 0.035 }); },
  back() { tone(660, 0.05, { vol: 0.045 }); tone(440, 0.06, { vol: 0.045, when: 0.05 }); },
  boot() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.11, { vol: 0.06, when: i * 0.1 })); tone(1568, 0.35, { vol: 0.05, when: 0.5, type: 'triangle' }); },
  scan() { tone(400, 0.5, { type: 'sawtooth', vol: 0.025, to: 1800 }); tone(1800, 0.07, { vol: 0.04, when: 0.52 }); tone(2200, 0.09, { vol: 0.04, when: 0.6 }); },
  ok() { [784, 988, 1319].forEach((f, i) => tone(f, 0.12, { vol: 0.06, when: i * 0.09 })); },
  bad() { tone(220, 0.25, { type: 'sawtooth', vol: 0.05 }); tone(160, 0.3, { type: 'sawtooth', vol: 0.05, when: 0.18 }); },
  catch() { [0, 0.25, 0.5].forEach(w => tone(300, 0.06, { vol: 0.05, when: w })); [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.1, { vol: 0.05, when: 0.85 + i * 0.08 })); },
};
function buzz(ms = 12) { try { navigator.vibrate && navigator.vibrate(ms); } catch { } }

/* ---------- Voz da Pokédex ---------- */
let voices = [];
function loadVoices() { try { voices = speechSynthesis.getVoices(); } catch { } }
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function ptVoice() {
  const pt = voices.filter(v => /^pt/i.test(v.lang));
  return pt.find(v => /pt[-_]BR/i.test(v.lang) && /google|luciana|felipe|daniel|natural/i.test(v.name))
    || pt.find(v => /pt[-_]BR/i.test(v.lang)) || pt[0] || null;
}
let speakToken = 0;
function speak(text, onEnd) {
  if (!('speechSynthesis' in window) || muted) { onEnd && onEnd(); return; }
  const my = ++speakToken;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'pt-BR';
  const v = ptVoice(); if (v) u.voice = v;
  u.rate = 1.02; u.pitch = 0.8;
  let blink;
  u.onstart = () => { blink = setInterval(() => $('#lens').classList.toggle('on'), 140); };
  u.onend = u.onerror = () => { clearInterval(blink); $('#lens').classList.remove('on'); if (my === speakToken) onEnd && onEnd(); };
  speechSynthesis.speak(u);
}
function stopSpeak() { speakToken++; try { speechSynthesis.cancel(); } catch { } $('#lens').classList.remove('on'); }

/* ---------- Grito do Pokémon ---------- */
const canOgg = (() => { try { return !!document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"'); } catch { return false; } })();
let cryAudio;
function playCry(p, speciesName) {
  return new Promise(resolve => {
    if (muted) return resolve();
    const mp3 = `https://play.pokemonshowdown.com/audio/cries/${speciesName.replace(/[^a-z0-9]/g, '')}.mp3`;
    const urls = [];
    if (canOgg && p.cries) { if (p.cries.latest) urls.push(p.cries.latest); if (p.cries.legacy) urls.push(p.cries.legacy); }
    urls.push(mp3);
    if (cryAudio) { cryAudio.pause(); cryAudio = null; }
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    const tryNext = () => {
      const url = urls.shift();
      if (!url) return finish();
      const a = new Audio(url);
      cryAudio = a; a.volume = 0.55;
      a.onended = finish;
      a.onerror = tryNext;
      a.play().catch(() => (urls.length ? tryNext() : finish()));
    };
    tryNext();
    setTimeout(finish, 4000);
  });
}

/* ---------- Tradução da descrição para português ---------- */
async function translate(text) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(text)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('tr');
  const j = await r.json();
  return j[0].map(x => x[0]).join('').trim();
}
const fixGenus = g => g.replace(/^Pokémon\s+(.+)$/i, 'Pokémon $1').replace(/^(.+?)\s+Pokémon$/i, 'Pokémon $1');
async function ptTexts(id, species) {
  const key = 'pt2:' + id;
  const cached = store.get(key);
  if (cached) return cached;
  const en = species.flavor_text_entries.filter(f => f.language.name === 'en');
  const es = species.flavor_text_entries.filter(f => f.language.name === 'es');
  const enTxt = en.length ? clean(en[en.length - 1].flavor_text) : '';
  const genusEn = (species.genera.find(g => g.language.name === 'en') || {}).genus || '';
  try {
    const [g, f] = await Promise.all([
      genusEn ? translate(genusEn) : '',
      enTxt ? translate(enTxt) : '',
    ]);
    const out = { g: fixGenus(g), f: f.replace(/Pokémon/gi, 'Pokémon') };
    store.set(key, out);
    return out;
  } catch {
    const esTxt = es.length ? clean(es[es.length - 1].flavor_text) : enTxt;
    const genusEs = (species.genera.find(g => g.language.name === 'es') || {}).genus || genusEn;
    return { g: genusEs, f: esTxt, fallback: true };
  }
}

/* ---------- Estado ---------- */
const state = {
  all: [], list: [], sel: 0, view: 'boot',
  gen: store.get('gen', 0), type: '', query: '', onlyCaught: false,
  cur: null, shiny: false, typeCache: {},
  caught: new Set(store.get('caught', [])), seen: new Set(store.get('seen', [])),
  quiz: null, quizScore: store.get('quizScore', { ok: 0, total: 0 }),
};
const saveSets = () => { store.set('caught', [...state.caught]); store.set('seen', [...state.seen]); };

function lcd(text) { $('#lcd').textContent = text; }
function flashLed(id, ms = 160) { const el = $(id); el.classList.add('on'); setTimeout(() => el.classList.remove('on'), ms); }
function lcdDefault() { lcd(`VISTOS ${state.seen.size} · PEGOS ${state.caught.size}`); }

function show(view) {
  state.view = view;
  for (const v of ['Boot', 'List', 'Detail', 'Quiz']) $('#view' + v).classList.toggle('hidden', v.toLowerCase() !== view);
}

/* ---------- Lista ---------- */
async function loadIndex() {
  let names = store.get('index-v1');
  if (!names) {
    const d = await getJSON(`${API}/pokemon-species?limit=${TOTAL}`);
    names = [];
    for (const s of d.results) {
      const id = +s.url.split('/').filter(Boolean).pop();
      if (id <= TOTAL) names[id - 1] = s.name;
    }
    store.set('index-v1', names);
  }
  state.all = names.map((n, i) => ({ id: i + 1, name: n, label: prettyName(n) }));
}

function buildChips() {
  const gc = $('#genChips');
  const opts = [{ v: 0, t: 'Todos' }, { v: -1, t: '★ Pegos' }, ...GENS.map(g => ({ v: g.n, t: `G${g.n} ${g.r}` }))];
  gc.innerHTML = opts.map(o => `<button class="chip" data-gen="${o.v}">${o.t}</button>`).join('');
  gc.onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    SFX.click(); buzz();
    state.gen = +b.dataset.gen; store.set('gen', state.gen); applyFilter();
  };
  const tc = $('#typeChips');
  tc.innerHTML = Object.entries(TYPES).map(([k, [n, c]]) => `<button class="chip" data-type="${k}" style="background:${c}">${n}</button>`).join('');
  tc.onclick = async e => {
    const b = e.target.closest('.chip'); if (!b) return;
    SFX.click(); buzz();
    const t = b.dataset.type;
    state.type = state.type === t ? '' : t;
    if (state.type && !state.typeCache[state.type]) {
      lcd('CARREGANDO...');
      try {
        const d = await getJSON(`${API}/type/${state.type}`);
        state.typeCache[state.type] = new Set(d.pokemon.map(p => +p.pokemon.url.split('/').filter(Boolean).pop()).filter(id => id <= TOTAL));
      } catch { state.type = ''; lcd('SEM INTERNET'); }
    }
    applyFilter();
  };
}

function applyFilter() {
  const q = state.query.trim().toLowerCase().replace(/^#|^n[ºo°]?\s*/i, '');
  let list = state.all;
  if (state.gen > 0) { const g = GENS[state.gen - 1]; list = list.filter(p => p.id >= g.a && p.id <= g.b); }
  if (state.gen === -1) list = list.filter(p => state.caught.has(p.id));
  if (state.type && state.typeCache[state.type]) list = list.filter(p => state.typeCache[state.type].has(p.id));
  if (q) {
    const num = /^\d+$/.test(q) ? +q : null;
    list = list.filter(p => num != null ? String(p.id).includes(q) : p.name.includes(q) || p.label.toLowerCase().includes(q));
    if (num != null) list.sort((a, b) => (b.id === num) - (a.id === num));
  }
  state.list = list;
  state.sel = Math.min(state.sel, Math.max(0, list.length - 1));
  document.querySelectorAll('#genChips .chip').forEach(c => c.classList.toggle('active', +c.dataset.gen === state.gen));
  document.querySelectorAll('#typeChips .chip').forEach(c => c.classList.toggle('active', c.dataset.type === state.type));
  renderGrid();
  lcd(`${list.length} POKéMON`);
}

function renderGrid() {
  const grid = $('#grid');
  $('#empty').classList.toggle('hidden', state.list.length > 0);
  grid.innerHTML = state.list.map((p, i) => `
    <button class="card${i === state.sel ? ' sel' : ''}" data-i="${i}">
      ${state.caught.has(p.id) ? `<img class="ball" src="${BALL}" alt="">` : ''}
      <img loading="lazy" src="${sprite(p.id)}" alt="" onerror="this.style.visibility='hidden'">
      <div class="n">${pad(p.id)}</div>
      <div class="nm">${p.label}</div>
    </button>`).join('');
}
function moveSel(delta) {
  if (!state.list.length) return;
  const cards = $('#grid').children;
  cards[state.sel] && cards[state.sel].classList.remove('sel');
  state.sel = (state.sel + delta + state.list.length) % state.list.length;
  const c = cards[state.sel];
  if (c) { c.classList.add('sel'); c.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  const p = state.list[state.sel];
  lcd(`Nº${pad(p.id)} ${p.label.toUpperCase()}`);
}
function gridCols() { return getComputedStyle($('#grid')).gridTemplateColumns.split(' ').length || 3; }

/* ---------- Detalhe ---------- */
let openToken = 0;
async function openPokemon(id, { push = true, announce = true } = {}) {
  const my = ++openToken;
  stopSpeak();
  state.cur = id; state.shiny = false;
  const idx = state.list.findIndex(p => p.id === id);
  if (idx >= 0) state.sel = idx;
  const base = state.all[id - 1];
  if (push) history.pushState({ id }, '', `#${id}`);
  show('detail');
  const v = $('#viewDetail');
  v.scrollTop = 0;
  v.innerHTML = `
    <div class="hero" style="--tbg:#ccc"><div class="scanbar"></div>
      <img class="art loading" src="${art(id)}" alt="${base.label}" onload="this.classList.remove('loading')"></div>
    <div class="dex-head"><span class="num">Nº ${pad(id)}</span><h2>${base.label}</h2></div>
    <div class="box"><p class="desc wait">Analisando...</p></div>`;
  lcd(`Nº${pad(id)} ${base.label.toUpperCase()}`);
  if (announce) { SFX.scan(); flashLed('#ledG', 700); }

  let p, s;
  try {
    [p, s] = await Promise.all([getJSON(`${API}/pokemon/${id}`), getJSON(`${API}/pokemon-species/${id}`)]);
  } catch {
    if (my === openToken) v.querySelector('.desc').textContent = 'Sem conexão com a internet. Tente de novo!';
    lcd('SEM INTERNET'); flashLed('#ledR', 800);
    return;
  }
  if (my !== openToken) return;

  state.seen.add(id); saveSets();
  const types = p.types.map(t => t.type.name);
  const c1 = TYPES[types[0]][1], c2 = TYPES[types[1] || types[0]][1];
  const g = genOf(id);
  const weak = weaknesses(types);
  v.innerHTML = `
    <div class="hero" style="--tbg:linear-gradient(135deg, ${c1}, ${c2})"><div class="scanbar"></div>
      <div class="hero-btns">
        <button class="icon-btn" id="shinyBtn">✨ Brilhante</button>
        <button class="icon-btn${state.caught.has(id) ? ' on' : ''}" id="catchBtn"><img src="${BALL}" alt=""> ${state.caught.has(id) ? 'Pego!' : 'Pegar'}</button>
      </div>
      <img class="art" id="artImg" src="${art(id)}" alt="${base.label}" onerror="this.src='${sprite(id)}'">
    </div>
    <div class="dex-head"><span class="num">Nº ${pad(id)}</span><h2>${base.label}</h2></div>
    <div class="genus" id="genus">...</div>
    <div class="types-row">${types.map(t => typeBadge(t)).join('')}</div>
    <div class="actions">
      <button class="act" id="cryBtn">🔊 Grito</button>
      <button class="act" id="talkBtn">🗣️ Falar</button>
    </div>
    <div class="box"><h3>DESCRIÇÃO</h3><p class="desc wait" id="desc">Traduzindo...</p></div>
    <div class="box facts">
      <div><b>${(p.height / 10).toLocaleString('pt-BR')} m</b><span>Altura</span></div>
      <div><b>${(p.weight / 10).toLocaleString('pt-BR')} kg</b><span>Peso</span></div>
      <div><b>${g.r}</b><span>${g.n}ª Geração</span></div>
    </div>
    ${weak.length ? `<div class="box"><h3>FRACO CONTRA</h3><div class="types-row" style="padding:0">${weak.map(([t, m]) => typeBadge(t, 'sm', m === 4 ? ' 4x' : '')).join('')}</div></div>` : ''}
    <div class="box"><h3>STATUS BASE</h3>${p.stats.map(st => {
      const [n, col] = STATS[st.stat.name] || [st.stat.name, '#999'];
      return `<div class="stat"><span>${n}</span><span class="v">${st.base_stat}</span><div class="bar"><i style="background:${col}" data-w="${Math.min(100, st.base_stat / 1.8)}"></i></div></div>`;
    }).join('')}</div>
    <div class="box" id="evoBox"><h3>EVOLUÇÕES</h3><div class="evo" id="evo">...</div></div>
    <div class="navrow"><button id="prevBtn">◀ Anterior</button><button id="nextBtn">Próximo ▶</button></div>`;

  requestAnimationFrame(() => requestAnimationFrame(() => v.querySelectorAll('.bar i').forEach(i => { i.style.width = i.dataset.w + '%'; })));

  $('#shinyBtn').onclick = () => {
    SFX.ok(); buzz();
    state.shiny = !state.shiny;
    $('#shinyBtn').classList.toggle('on', state.shiny);
    const img = $('#artImg'); img.src = art(id, state.shiny);
    img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
  };
  $('#catchBtn').onclick = () => {
    buzz(30);
    const b = $('#catchBtn');
    if (state.caught.has(id)) { state.caught.delete(id); SFX.back(); }
    else { state.caught.add(id); SFX.catch(); setTimeout(() => speak(`${base.label} foi pego!`), 1300); }
    saveSets();
    b.classList.toggle('on', state.caught.has(id));
    b.innerHTML = `<img src="${BALL}" alt=""> ${state.caught.has(id) ? 'Pego!' : 'Pegar'}`;
  };
  $('#cryBtn').onclick = () => { buzz(); flashLed('#ledY', 500); playCry(p, s.name); };
  $('#prevBtn').onclick = () => step(-1);
  $('#nextBtn').onclick = () => step(1);

  const texts = await ptTexts(id, s);
  if (my !== openToken) return;
  $('#genus').textContent = texts.g;
  const d = $('#desc'); d.textContent = texts.f || 'Sem descrição.'; d.classList.remove('wait');
  const typeNames = types.map(t => TYPES[t][0]).join(' e ');
  const sentence = `${base.label}. ${texts.g}. Tipo ${typeNames}. ${texts.f}`;
  $('#talkBtn').onclick = () => {
    buzz();
    const b = $('#talkBtn');
    if (b.classList.contains('speaking')) { stopSpeak(); b.classList.remove('speaking'); return; }
    b.classList.add('speaking');
    speak(sentence, () => b.classList.remove('speaking'));
  };

  if (announce) {
    await sleep(500);
    if (my !== openToken) return;
    flashLed('#ledY', 500);
    await playCry(p, s.name);
    if (my !== openToken) return;
    $('#talkBtn').classList.add('speaking');
    speak(sentence, () => { const b = $('#talkBtn'); b && b.classList.remove('speaking'); });
  }

  renderEvo(s, id, my);
}

function typeBadge(t, cls = '', extra = '') {
  const [n, c] = TYPES[t] || [t, '#999'];
  return `<span class="type ${cls}" style="background:${c}">${n}${extra}</span>`;
}
function weaknesses(types) {
  const out = [];
  for (const atk of Object.keys(TYPES)) {
    let m = 1;
    for (const d of types) {
      const [w, r, im] = DEF[d];
      if (im.includes(atk)) m *= 0; else if (w.includes(atk)) m *= 2; else if (r.includes(atk)) m *= 0.5;
    }
    if (m > 1) out.push([atk, m]);
  }
  return out.sort((a, b) => b[1] - a[1]);
}

async function renderEvo(species, curId, my) {
  const box = $('#evo');
  try {
    const chain = await getJSON(species.evolution_chain.url);
    if (my !== openToken) return;
    const stages = [];
    (function walk(node, depth) {
      const id = +node.species.url.split('/').filter(Boolean).pop();
      (stages[depth] = stages[depth] || []).push({ id, name: node.species.name });
      node.evolves_to.forEach(n => walk(n, depth + 1));
    })(chain.chain, 0);
    if (stages.length === 1) { $('#evoBox').querySelector('h3').textContent = 'EVOLUÇÕES'; box.innerHTML = '<span style="font-weight:800;color:#789">Este Pokémon não evolui.</span>'; return; }
    box.innerHTML = stages.map(st => `<div class="evo-stage">${st.filter(m => m.id <= TOTAL).map(m => `
      <button class="evo-mon${m.id === curId ? ' cur' : ''}" data-id="${m.id}">
        <img loading="lazy" src="${sprite(m.id)}" alt=""><span>${prettyName(m.name)}</span></button>`).join('')}</div>`)
      .join('<span class="evo-arrow">➜</span>');
    box.onclick = e => {
      const b = e.target.closest('.evo-mon'); if (!b) return;
      const id = +b.dataset.id; if (id === curId) return;
      SFX.click(); openPokemon(id);
    };
  } catch { box.textContent = '—'; }
}

function step(delta) {
  SFX.move(); buzz();
  let list = state.list.length ? state.list : state.all;
  let i = list.findIndex(p => p.id === state.cur);
  if (i < 0) { list = state.all; i = state.cur - 1; }
  const next = list[(i + delta + list.length) % list.length];
  openPokemon(next.id, { push: false });
  history.replaceState({ id: next.id }, '', `#${next.id}`);
}

function backToList() {
  stopSpeak();
  if (cryAudio) cryAudio.pause();
  show('list');
  renderGrid();
  const c = $('#grid').children[state.sel];
  if (c) c.scrollIntoView({ block: 'center' });
  lcdDefault();
}

/* ---------- Quiz "Quem é esse Pokémon?" ---------- */
function quizPool() {
  if (state.gen > 0) { const g = GENS[state.gen - 1]; return state.all.slice(g.a - 1, g.b); }
  return state.all;
}
function newQuiz() {
  stopSpeak();
  const pool = quizPool();
  const pick = () => pool[Math.floor(Math.random() * pool.length)];
  const ans = pick();
  const opts = new Set([ans.id]);
  while (opts.size < 4) opts.add(pick().id);
  const options = [...opts].map(id => state.all[id - 1]).sort(() => Math.random() - 0.5);
  state.quiz = { ans, options, done: false, sel: 0 };
  show('quiz');
  const sc = state.quizScore;
  $('#viewQuiz').innerHTML = `
    <h2>QUEM É ESSE<br>POKéMON?</h2>
    <div class="score">Acertos: ${sc.ok} de ${sc.total}</div>
    <img class="sil" id="sil" src="${art(ans.id)}" alt="?">
    <div class="opts">${options.map((o, i) => `<button class="opt${i === 0 ? ' sel' : ''}" data-id="${o.id}">${o.label}</button>`).join('')}</div>
    <button class="next hidden" id="quizNext">Próximo ▶</button>`;
  $('#viewQuiz').querySelector('.opts').onclick = e => { const b = e.target.closest('.opt'); if (b) answerQuiz(+b.dataset.id); };
  $('#quizNext').onclick = () => { SFX.click(); newQuiz(); };
  lcd('QUEM É?');
  tone(523, 0.12, { vol: 0.05 }); tone(392, 0.12, { vol: 0.05, when: 0.14 }); tone(659, 0.25, { vol: 0.05, when: 0.28 });
  setTimeout(() => state.view === 'quiz' && !state.quiz.done && speak('Quem é esse Pokémon?'), 300);
}
async function answerQuiz(id) {
  const q = state.quiz; if (!q || q.done) return;
  q.done = true; buzz(25);
  const right = id === q.ans.id;
  state.quizScore.total++; if (right) state.quizScore.ok++;
  store.set('quizScore', state.quizScore);
  document.querySelectorAll('#viewQuiz .opt').forEach(b => {
    const bid = +b.dataset.id;
    if (bid === q.ans.id) b.classList.add('right'); else if (bid === id) b.classList.add('wrong');
  });
  $('#sil').classList.add('reveal');
  $('#viewQuiz .score').textContent = `Acertos: ${state.quizScore.ok} de ${state.quizScore.total}`;
  $('#quizNext').classList.remove('hidden');
  lcd(right ? 'ACERTOU!' : 'QUASE!');
  flashLed(right ? '#ledG' : '#ledR', 900);
  right ? SFX.ok() : SFX.bad();
  state.seen.add(q.ans.id); saveSets();
  await sleep(600);
  try {
    const p = await getJSON(`${API}/pokemon/${q.ans.id}`);
    await playCry(p, q.ans.name);
  } catch { }
  if (state.quiz === q) speak(right ? `Isso aí! É o ${q.ans.label}!` : `É o ${q.ans.label}!`);
}

/* ---------- Controles físicos ---------- */
function press(el) { el.classList.add('press'); setTimeout(() => el.classList.remove('press'), 120); }
function onDir(dir) {
  buzz(8);
  if (state.view === 'list') {
    SFX.move();
    const cols = gridCols();
    moveSel({ up: -cols, down: cols, left: -1, right: 1 }[dir]);
  } else if (state.view === 'detail') {
    if (dir === 'left') step(-1);
    else if (dir === 'right') step(1);
    else { SFX.move(); $('#viewDetail').scrollBy({ top: dir === 'up' ? -180 : 180, behavior: 'smooth' }); }
  } else if (state.view === 'quiz') {
    SFX.move();
    const q = state.quiz; if (!q || q.done) return;
    q.sel = (q.sel + ({ up: -2, down: 2, left: -1, right: 1 }[dir]) + 4) % 4;
    document.querySelectorAll('#viewQuiz .opt').forEach((b, i) => b.classList.toggle('sel', i === q.sel));
  }
}
function onA() {
  buzz();
  if (state.view === 'boot') return powerOn();
  if (state.view === 'list') { const p = state.list[state.sel]; if (p) openPokemon(p.id); }
  else if (state.view === 'detail') { const t = $('#talkBtn'); t && t.click(); }
  else if (state.view === 'quiz') {
    if (state.quiz.done) { SFX.click(); newQuiz(); }
    else answerQuiz(state.quiz.options[state.quiz.sel].id);
  }
}
function onB() {
  buzz();
  if (state.view === 'detail') { SFX.back(); history.state && history.state.id ? history.back() : backToList(); }
  else if (state.view === 'quiz') { SFX.back(); backToList(); }
  else if (state.view === 'list') { SFX.back(); state.query = ''; $('#search').value = ''; state.type = ''; applyFilter(); $('#viewList').scrollTo({ top: 0, behavior: 'smooth' }); }
}

function bindControls() {
  // Repetição ao segurar o direcional
  let rep, repT;
  const stopRep = () => { clearTimeout(repT); clearInterval(rep); };
  document.querySelectorAll('.d[data-dir]').forEach(b => {
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); const dir = b.dataset.dir; onDir(dir);
      stopRep(); repT = setTimeout(() => { rep = setInterval(() => onDir(dir), 110); }, 380);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stopRep));
  });
  $('#btnA').onclick = () => onA();
  $('#btnB').onclick = () => onB();
  $('#btnList').onclick = () => { SFX.click(); buzz(); if (state.view === 'boot') return; if (state.view === 'detail' && history.state && history.state.id) history.back(); else backToList(); };
  $('#btnQuiz').onclick = () => { if (state.view === 'boot') return; buzz(); newQuiz(); };
  $('#muteBtn').onclick = () => {
    muted = !muted; store.set('muted', muted);
    $('#muteBtn').textContent = muted ? '🔇' : '🔊';
    if (muted) { stopSpeak(); if (cryAudio) cryAudio.pause(); } else SFX.click();
  };
  $('#muteBtn').textContent = muted ? '🔇' : '🔊';

  $('#grid').addEventListener('click', e => {
    const c = e.target.closest('.card'); if (!c) return;
    buzz(); state.sel = +c.dataset.i; openPokemon(state.list[state.sel].id);
  });
  let t;
  $('#search').addEventListener('input', e => {
    clearTimeout(t);
    t = setTimeout(() => { state.query = e.target.value; state.sel = 0; applyFilter(); $('#viewList').scrollTop = 0; }, 120);
  });
  $('#search').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.target.blur(); if (state.list.length) openPokemon(state.list[0].id); }
  });

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    if (map[e.key]) { e.preventDefault(); onDir(map[e.key]); }
    else if (e.key === 'Enter' || e.key === 'a' || e.key === ' ') { e.preventDefault(); onA(); }
    else if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'b') { e.preventDefault(); onB(); }
  });

  window.addEventListener('popstate', e => {
    if (state.view === 'boot') return;
    if (e.state && e.state.id) openPokemon(e.state.id, { push: false });
    else backToList();
  });
}

/* ---------- Ligar ---------- */
async function powerOn() {
  if (state.view !== 'boot') return;
  state.view = 'booting';
  ac();
  // Desbloqueia a voz no iPhone (precisa ser dentro do toque)
  try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch { }
  $('#viewBoot').classList.add('booting');
  $('#powerBtn').classList.add('hidden');
  $('.boot-hint').textContent = 'Iniciando...';
  SFX.boot();
  ['#ledR', '#ledY', '#ledG'].forEach((l, i) => setTimeout(() => flashLed(l, 300), i * 150));
  $('#lens').classList.add('on'); setTimeout(() => $('#lens').classList.remove('on'), 900);
  $('#ledScreen').classList.add('on');
  try { await Promise.all([loadIndex(), sleep(1000)]); }
  catch { $('.boot-hint').textContent = 'Sem internet. Conecte e toque de novo.'; $('#powerBtn').classList.remove('hidden'); state.view = 'boot'; return; }
  buildChips();
  show('list');
  applyFilter();
  lcdDefault();
  speak('Pokédex ativada. Olá, Henrique!');
  const h = +location.hash.slice(1);
  if (h >= 1 && h <= TOTAL) { history.replaceState(null, '', location.pathname); openPokemon(h); }
}

bindControls();
$('#powerBtn').onclick = () => { buzz(20); powerOn(); };
lcd('POKéDEX');

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}

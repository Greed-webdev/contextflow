/* UI-логи: головless-прогон ВСЕГО проекта. DOM-шим + драйвер по каждому уровню
   каждого этапа: рендер, диалоги (best / мусор / «Не знаю»), сбор исключений.
   Запуск: node qa/ui-log.js   → отчёт в qa/ui-log-report.md + консоль. */
const fs = require('fs'), vm = require('vm');
const ROOT = '/home/user/';

/* ---------- автозапись действий ----------
   Каждый клик/ввод/рендер пишется САМ на уровне DOM-шима. Драйвер ничего
   не «докладывает» — лог есть побочный продукт исполнения. */
const ACT = [];
const act = (s) => ACT.push(s);

/* ---------- DOM-шим ---------- */
let REG = [];
function makeEl(tag) {
  const e = {
    tag, children: [], style: {}, dataset: {}, attributes: {},
    _cls: new Set(), _h: {}, onclick: null, _value: '', disabled: false,
    _html: '', textContent: '',
    get value() { return e._value; },
    set value(v) {
      e._value = String(v ?? '');
      if (e.tag === 'textarea' || e.tag === 'input') act(`ввод ${e.tag} «${String(v).slice(0, 40)}»`);
    },
    get className() { return [...e._cls].join(' '); },
    set className(v) { e._cls = new Set(String(v).split(/\s+/).filter(Boolean)); },
    get innerHTML() { return e._html; },
    set innerHTML(v) {
      e._html = String(v); e.children = [];
      if (e.tag !== '#text' && String(v).trim()) act(`рендер ${e.tag} (${String(v).length} симв.)`);
    },
    classList: {
      add: (...c) => c.forEach(x => e._cls.add(x)),
      remove: (...c) => c.forEach(x => e._cls.delete(x)),
      toggle: (c, on) => { on ? e._cls.add(c) : e._cls.delete(c); },
      contains: c => e._cls.has(c),
    },
    appendChild(c) { e.children.push(c); return c; },
    removeChild(c) { e.children = e.children.filter(x => x !== c); return c; },
    remove() { REG = REG.filter(x => x !== e); },
    insertBefore(c) { e.children.unshift(c); return c; },
    addEventListener(t, f) { (e._h[t] = e._h[t] || []).push(f); },
    removeEventListener() {},
    setAttribute(k, v) { e.attributes[k] = v; },
    getAttribute(k) { return e.attributes[k] ?? null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    focus() {}, blur() {}, scrollIntoView() {}, setSelectionRange() {},
    click() {
      act(`клик ${e.tag} «${String((e._html || e.textContent || '')).replace(/<[^>]*>/g, '').slice(0, 40)}»`);
      if (e.onclick) e.onclick({ target: e });
      (e._h.click || []).forEach(f => f({ target: e }));
      drainTimers();                      /* отложенные переходы приложения */
    },
    contains(x) { return e.children.includes(x); },
    getBoundingClientRect: () => ({ top: 0, bottom: 0, height: 20, width: 100 }),
  };
  REG.push(e);
  return e;
}
const byId = {};
const documentStub = {
  _els: byId,
  getElementById: id => (byId[id] = byId[id] || makeEl('div#' + id)),
  createElement: t => makeEl(t),
  createTextNode: t => makeEl('#text'),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {},
  body: makeEl('body'), documentElement: makeEl('html'),
  visibilityState: 'visible', hidden: false,
};

/* ---------- окно ---------- */
/* очередь таймеров: реальные, но управляемые. Драйвер сам их сливает. */
const TIMERS = [];
function drainTimers(cap = 500) {
  let n = 0;
  while (TIMERS.length && n++ < cap) {
    const fn = TIMERS.shift();
    try { fn(); } catch (e) { if (typeof reportCrash === 'function') reportCrash('таймер: ' + e.message); else throw e; }
  }
  if (TIMERS.length) TIMERS.length = 0;   /* защита от бесконечного саморасписания */
}
const timers = [];
const windowStub = {
  localStorage: { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } },
  sessionStorage: { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } },
  navigator: { language: 'ru-RU', userAgent: 'headless', mediaDevices: { getUserMedia: () => Promise.reject(new Error('no mic')) } },
  speechSynthesis: { speak() {}, cancel() {}, pending: false },
  AudioContext: function () {
    const anyFn = () => new Proxy(function () { return anyFn(); }, {
      get(t, p) { if (p in t) return t[p];
        if (p === Symbol.toPrimitive) return () => 0;
        if (p === 'getChannelData') return () => new Float32Array(8);
        if (p === 'then') return undefined; /* не thenable */
        return anyFn(); },
      set(t, p, v) { t[p] = v; return true; },
    });
    const node = () => new Proxy({}, {
      get(t, p) { if (p in t) return t[p];
        if (p === Symbol.toPrimitive) return () => 0;
        return (t[p] = anyFn()); },
      set(t, p, v) { t[p] = v; return true; },
    });
    return { state: 'running', currentTime: 0, sampleRate: 44100, destination: node(), listener: node(),
      createOscillator: node, createGain: node, createBufferSource: node, createBiquadFilter: node, createPanner: node, createAnalyser: node, createDynamicsCompressor: node,
      createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len), length: len }),
      decodeAudioData: () => Promise.resolve({ getChannelData: () => new Float32Array(8), length: 8, duration: 0.1 }),
      resume: () => Promise.resolve(), suspend: () => Promise.resolve(), close: () => Promise.resolve() }; },
  webkitAudioContext: function () { return new windowStub.AudioContext(); },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  visualViewport: { addEventListener() {}, removeEventListener() {}, height: 800 },
  fetch: () => Promise.resolve({ ok: true, json: () => ({}), arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }),
  addEventListener() {}, removeEventListener() {},
  location: { hash: '', href: 'http://headless/' },
  history: { replaceState() {}, pushState() {} },
  innerWidth: 390, innerHeight: 800, devicePixelRatio: 2,
  SpeechSynthesisUtterance: function (t) { this.text = t; },
  requestAnimationFrame: f => 0, cancelAnimationFrame() {},
  Image: function () { return makeEl('img'); },
  Audio: function () { return { play: () => Promise.resolve(), pause() {}, addEventListener() {}, removeEventListener() {}, currentTime: 0 }; },
  Option: function (t, v) { return makeEl('option'); },
  DOMParser: function () { return { parseFromString: () => documentStub }; },
  CustomEvent: function (t, o) { this.type = t; Object.assign(this, o); },
  Event: function (t) { this.type = t; },
};
windowStub.window = windowStub;
windowStub.SpeechRecognition = undefined;

const ctx = { console, document: documentStub, ...windowStub,
  setTimeout: (fn) => { if (typeof fn === 'function') TIMERS.push(fn); return TIMERS.length; },
  clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, queueMicrotask: f => f() };
ctx.globalThis = ctx;
vm.createContext(ctx);

/* ---------- загрузка приложения ---------- */
const appSrc = fs.readFileSync(ROOT + 'js/app.js', 'utf8');
const lessSrc = fs.readFileSync(ROOT + 'js/lessons.js', 'utf8');
const sndSrc = fs.readFileSync(ROOT + 'js/sound.js', 'utf8');
const sttSrc = fs.readFileSync(ROOT + 'js/stt.js', 'utf8');
const boot = sndSrc + '\n' + lessSrc + '\n' + sttSrc + '\n' + appSrc + '\n;globalThis.__APP={Lesson, COURSE, getCourse, S:()=>S, go};';

const LOG = [];
const line = (s) => LOG.push(s);
try {
  vm.runInContext(boot, ctx, { timeout: 20000 });
} catch (e) {
  console.error('БУТ УПАЛ:', e.message);
  process.exit(1);
}
const APP = ctx.__APP;
{ const S = APP.S(); S.lang = 'en'; S.progress = S.progress || {}; S.stats = S.stats || { total: 0, right: 0 }; }

/* ---------- сбор кнопок из реестра ---------- */
const btns = (pred) => REG.filter(e => e.tag === 'button' && (!pred || pred(e)));
const findBtn = (txt) => btns().reverse().find(b => (b._html + b.textContent).includes(txt));
const lastTa = () => REG.filter(e => e.tag === 'textarea' || e.tag === 'input').reverse()[0];

let crashes = 0, oks = 0;
const DET = [];
const TRACE = [];   /* полный машинный лог действий: пишется самим симом */
const guard = (name, fn) => {
  try { fn(); oks++; return true; }
  catch (e) { crashes++; line(`✗ ${name}: ${e.message}`); DET.push(`✗ ${name}: ${e.message}`); return false; }
};

/* действия, случившиеся при загрузке приложения (до драйвера) */
if (ACT.length) {
  TRACE.push(`\n# загрузка приложения · действий: ${ACT.length}`);
  for (const l of ACT) TRACE.push('  ' + l);
}

/* ---------- драйвер ---------- */
const stages = [1, 2, 3, 4, 5];
for (const st of stages) {
  let arr;
  try { arr = APP.getCourse('en', st); } catch (e) { line(`✗ этап ${st}: нет курса (${e.message})`); continue; }
  if (!arr || !arr.length) { line(`— этап ${st}: пустой, пропускаю`); continue; }
  line(`\n== этап ${st} · ${arr.length} уровней ==`);
  for (let idx = 0; idx < arr.length; idx++) {
    const lv = arr[idx];
    REG = [];
    const tag = `[${st}.${idx + 1}] ${lv.type}${lv.variant ? ':' + lv.variant : ''} «${lv.title}»`;
    const a0 = ACT.length;                 /* срез действий до уровня */
    const flushActs = () => {              /* машинный лог уровня → трейс */
      const slice = ACT.slice(a0);
      TRACE.push(`\n# ${tag} · действий: ${slice.length}`);
      for (const l of slice) TRACE.push('  ' + l);
      return slice.length;
    };
    if (!guard(tag + ' · start', () => APP.Lesson.start(st, idx))) { flushActs(); continue; }

    if (lv.type === 'dialog' && lv.variant === 'flow') {
      /* покрытие: каждый узел сцены посещается через UI — рендер вопроса,
         отправка образца, появление «Дальше/Завершить» (судья принял) */
      const ids = Object.keys(lv.flow.nodes);
      const want = ids.length; let visited = 0; const bad = [];
      for (const id of ids) {
        REG = [];
        if (!guard(tag + ` · старт для узла ${id}`, () => APP.Lesson.start(st, idx))) { bad.push(id); continue; }
        APP.Lesson.at = id;
        if (!guard(tag + ` · рендер узла ${id}`, () => APP.Lesson.flowNode())) { bad.push(id); continue; }
        const node = lv.flow.nodes[id];
        const ta = lastTa();
        const send = btns().reverse().find(b => (b.textContent || '').includes('Ответить') || (b._html || '').includes('Ответить'));
        if (!ta || !send) { line(`⚠ ${tag}: нет поля/кнопки на узле ${id}`); bad.push(id); continue; }
        ta.value = node.best;
        const mark = REG.length;
        let goB = null;
        if (!guard(tag + ` · best «${node.best}» на ${id}`, () => send.click())) { bad.push(id); continue; }
        goB = REG.slice(mark).reverse().find(b => b.tag === 'button' && /Дальше|Завершить/.test(b._html + b.textContent));
        if (!goB) { line(`⚠ ${tag}: судья не принял best на узле ${id}`); bad.push(id); continue; }
        visited++;
      }
      if (visited < want) line(`⚠ ${tag}: покрыто узлов ${visited} из ${want} (провал: ${bad.join(',') || '—'})`);
      /* мусор дважды → путь ошибки */
      REG = [];
      let junk = 'ок';
      if (!guard(tag + ' · перезапуск для мусора', () => APP.Lesson.start(st, idx))) junk = 'сбой';
      else for (let k = 0; k < 2; k++) {
        const ta2 = lastTa(); const send2 = btns().reverse().find(b => (b.textContent || b._html || '').includes('Ответить'));
        if (!ta2 || !send2) { junk = 'нет UI'; break; }
        ta2.value = 'xyzzy qqq';
        if (!guard(tag + ` · мусор ${k + 1}`, () => send2.click())) { junk = 'падение'; break; }
        const fix = findBtn('Исправить'); if (fix) guard(tag + ' · исправить', () => fix.click());
      }
      /* «Не знаю» */
      REG = [];
      let dunnoRes = 'нет кнопки';
      if (guard(tag + ' · перезапуск для «Не знаю»', () => APP.Lesson.start(st, idx))) {
        const dunno = btns().reverse().find(b => (b._html || '').includes('Не знаю') || (b.textContent || '').includes('Не знаю'));
        dunnoRes = dunno ? (guard(tag + ' · «Не знаю»', () => dunno.click()) ? 'ок' : 'падение') : 'нет кнопки';
      } else dunnoRes = 'сбой';
      const nActs = flushActs();
      DET.push(`${tag} · узлов ${visited}/${want}${bad.length ? ' · провал: ' + bad.join(',') : ''} · мусор:${junk} · незнаю:${dunnoRes} · действий:${nActs}`);
      if (visited < want || junk !== 'ок' || dunnoRes !== 'ок') line(`⚠ ${tag}: visited=${visited}/${want} junk=${junk} dunno=${dunnoRes}`);
    } else if (lv.type === 'dialog') {
      /* репликовые (turns) и lost: играем лучшими ответами из данных до
         экрана «уровень пройден» (у finish() — onclick на done-next) */
      if (byId['done-next']) { byId['done-next'].onclick = null; byId['done-next'].textContent = ''; }
      let steps = 0; const seq = []; let broke = null;
      const seen = new Set();                    /* защита от топтания на одной кнопке */
      while (steps < 80) {
        steps++;
        drainTimers();
        if (byId['done-next'] && byId['done-next'].onclick) break;      /* финал */
        const fin = btns().reverse().find(b => /Завершить/.test(b._html + b.textContent) && !seen.has(b));
        if (fin) { seen.add(fin); seq.push('fin'); if (!guard(tag + ' · завершить', () => fin.click())) { broke = 'падение'; break; } continue; }
        const opt = btns().reverse().find(b => b._cls.has('opt') && !seen.has(b));
        if (opt) { seen.add(opt); seq.push('opt'); if (!guard(tag + ' · вариант', () => opt.click())) { broke = 'падение'; break; } continue; }
        const next = btns().reverse().find(b => /Дальше/.test(b._html + b.textContent) && !seen.has(b));
        if (next) { seen.add(next); seq.push('next'); if (!guard(tag + ' · дальше', () => next.click())) { broke = 'падение'; break; } continue; }
        const ta = lastTa();
        const send = btns().reverse().find(b => /Ответить/.test(b._html + b.textContent) && !b.disabled);
        if (ta && send) {
          /* ответ берём из данных уровня: репликовые — options[best] текущего хода,
             lost — best текущего узла. Мусор сюда не пишем. */
          let ans = 'I do not know';
          const t = lv.turns && lv.turns[APP.Lesson.turnIdx];
          if (t && t.options) ans = t.options[t.best];
          else if (lv.lost && lv.lost.nodes) {
            const node = lv.lost.nodes.find(n => n.id === APP.Lesson.at);
            if (node) ans = node.best;
          }
          ta.value = ans; seq.push('say');
          if (!guard(tag + ` · ответ «${ans}»`, () => send.click())) { broke = 'падение'; break; }
          continue;
        }
        broke = 'тупик: нечего жать, а финал не показан'; break;
      }
      const done = !!(byId['done-next'] && byId['done-next'].onclick);
      if (!done) line(`⚠ ${tag}: не доигран (${broke || 'лимит 80 шагов'}, шагов ${steps})`);
      const nActs = flushActs();
      DET.push(`${tag} · ${done ? 'доигран' : 'НЕ ДОИГРАН'} · шагов ${steps} (${seq.join(',')||'—'}) · действий:${nActs}`);
    } else {
      /* words / build: рендер прошёл в start; прощёлкаем проверку, если есть */
      const n = lv.type === 'words' ? (lv.words || []).length : (lv.tasks || []).length;
      const check = findBtn('Проверить') || findBtn('Готово');
      if (check) guard(tag + ' · проверить', () => check.click());
      const nActs = flushActs();
      DET.push(`${tag} · карточек/заданий ${n} · рендер ок · действий:${nActs}`);
    }
  }
}

/* ---------- отчёт ---------- */
const totalActs = ACT.length;
const summary = `UI-ЛОГ · ${new Date().toISOString()}\nэтапов: ${stages.length}, уровней: ${DET.length}, действий записано: ${totalActs}, ok-операций: ${oks}, падений: ${crashes}\n`;
const warns = LOG.filter(l => l.startsWith('⚠') || l.startsWith('✗'));
const rep = '# Отчёт UI-логов (головless-прогон всего проекта)\n\n' + summary +
  '\nЛог действий пишется автоматически на уровне DOM-шима (клик/ввод/рендер) — не вручную.\n' +
  'Полный поточный трейс: `qa/ui-log-trace.log`.\n\n' +
  (warns.length ? '## Предупреждения/падения\n' + warns.join('\n') + '\n' : 'Падений и обрывов нет.\n') +
  '\n## По уровням\n```\n' + DET.join('\n') + '\n```\n';
fs.writeFileSync(ROOT + 'qa/ui-log-report.md', rep);
fs.writeFileSync(ROOT + 'qa/ui-log-trace.log',
  `UI-ТРЕЙС ДЕЙСТВИЙ · ${new Date().toISOString()} · всего: ${totalActs}\n` + TRACE.join('\n') + '\n');
console.log(summary);
if (crashes || warns.length) { console.log(warns.join('\n')); process.exit(2); }
console.log('Весь проект прошёл без падений и обрывов.');

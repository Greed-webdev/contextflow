#!/usr/bin/env node
/* ==========================================================
   ContextFlow · qa/проверить.js — автопроверка демо-диалогов
   Запуск:  node qa/проверить.js <файл.html>
   Работает с любым демо, где сцены заданы как S1/S2/S3 с nodes/judge/tr.
   Ничего не чинит — только показывает, что сломано.
   ========================================================== */
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) { console.error('Укажи файл:  node qa/проверить.js <файл.html>'); process.exit(2); }
if (!fs.existsSync(file)) { console.error('Файл не найден: ' + file); process.exit(2); }

/* ---------- вытаскиваем логику из html ---------- */
const html = fs.readFileSync(file, 'utf8');
const m = html.match(/const norm[\s\S]*?(?=const SCENES\s*=)/);
if (!m) { console.error('Не нашёл блок логики (от «const norm» до «const SCENES»).'); process.exit(2); }

let SCENES, api = {};
try {
  /* сцен может быть сколько угодно: S1 в одиночку, S1..S3, S1..S6 */
  const сцены = [];
  for (let i = 1; i <= 12; i++) сцены.push(`if(typeof S${i}!=="undefined") _s.s${i}=S${i};`);
  const src = m[0] + '\n; const _s={}; ' + сцены.join(' ') +
    '\n; module.exports = { SCENES: _s,' +
    ' norm, expand, has, ' +
    ' numOf: (typeof numOf!=="undefined")?numOf:null,' +
    ' chose: (typeof chose!=="undefined")?chose:null,' +
    ' negatedAt: (typeof negatedAt!=="undefined")?negatedAt:null };';
  const tmp = path.join(require('os').tmpdir(), 'cfqa_' + Date.now() + '.js');
  fs.writeFileSync(tmp, src);
  api = require(tmp);
  SCENES = api.SCENES;
  fs.unlinkSync(tmp);
} catch (e) {
  console.error('Логика не загрузилась: ' + e.message);
  process.exit(2);
}

const { norm, expand } = api;
const cap = x => x.charAt(0).toUpperCase() + x.slice(1);
const prep = said => ({ w: expand(norm(said)), mem: { _digits: (said.match(/\d+/g) || []), _raw: said } });

/* ---------- судим один узел ---------- */
function judge(sid, nid, said, memIn) {
  const n = SCENES[sid].nodes[nid];
  const p = prep(said);
  const mem = Object.assign(p.mem, memIn || {});
  try { const r = n.judge(p.w, mem) || {}; return { br: r.huh ? 'huh' : String(r.br), mem }; }
  catch (e) { return { br: 'CRASH:' + e.message, mem }; }
}

/* ---------- проигрываем диалог целиком ---------- */
function play(sid, inputs) {
  const sc = SCENES[sid]; const mem = {}; let at = sc.start, tries = 0, i = 0, guard = 0;
  const log = [];
  const fmt = s => (s || '').replace(/\{(\w+)\}/g, (_, k) => mem[k] ? cap(String(mem[k])) : '…');
  while (at && guard++ < 60) {
    const n = sc.nodes[at];
    if (!n) return { log, mem, at, done: false, broken: 'нет узла ' + at };
    if (i >= inputs.length) return { log, mem, at, done: false };
    const said = String(inputs[i++]);
    const p = prep(said);
    Object.assign(mem, p.mem);
    let r;
    if (!p.w.length && !mem._digits.length) r = { huh: 1 };
    else { try { r = n.judge(p.w, mem) || {}; } catch (e) { return { log, mem, at, crash: e.message }; } }
    if (r.huh) {
      tries++;
      log.push({ who: 'huh', en: said, node: at });
      if (tries >= 2) {
        const p2 = prep(n.best); const r2 = n.judge(p2.w, mem) || {};
        const tr2 = n.tr[r2.br];
        if (!tr2) return { log, mem, at, done: true, bestBroken: at };
        log.push({ who: 'them', en: fmt(tr2.them), br: r2.br });
        if (!tr2.next) return { log, mem, at, done: true };
        at = tr2.next; tries = 0;
      }
      continue;
    }
    tries = 0;
    const tr = n.tr[r.br];
    if (!tr) return { log, mem, at, done: true, ghost: at + ' -> ' + r.br };
    log.push({ who: 'them', en: fmt(tr.them), br: r.br });
    if (!tr.next) return { log, mem, at, done: true };
    at = tr.next;
  }
  return { log, mem, at, done: false, loop: true };
}

/* ---------- батареи ---------- */
const МУСОР = ['banana', 'asdfgh', 'pizza', 'xyz', 'lorem ipsum dolor', 'fuck', 'shit', '!!!', '.', 'a',
  'the the the', 'cat dog fish', 'qwerty', 'blah blah', 'zzzz', '777', 'hmm', 'uh'];

const ИМЕНА_МУСОР = ['banana', 'pizza', 'asdfgh', 'xyz', 'lorem', 'fuck', 'shit', 'qwerty', 'blah'];
const ИМЕНА_RU = ['Masha', 'Ekaterina', 'Lev', 'Nadezhda', 'Olga', 'Igor', 'Vyacheslav', 'Artyom',
  'Svetlana', 'Dmitry', 'Yulia', 'Ruslan', 'Zhanna', 'Timur', 'Ksenia', 'Egor'];
const ИМЕНА_EN = ['Anna', 'Kate', 'John', 'Hope', 'Will', 'May', 'Grace', 'Rose', 'Frank', 'Daisy'];

const ОТРИЦАНИЯ = w => [`no ${w}`, `not ${w}`, `I do not want ${w}`, `I do not need ${w}`];

let проблемы = [], проверок = 0;
const бьём = (ок, текст) => { проверок++; if (!ок) проблемы.push(текст); };

/* 1. структура */
for (const sid of Object.keys(SCENES)) {
  const sc = SCENES[sid];
  const цели = new Set();
  for (const n of Object.values(sc.nodes))
    for (const tr of Object.values(n.tr || {})) if (tr.next) цели.add(tr.next);
  for (const nid of Object.keys(sc.nodes))
    бьём(nid === sc.start || цели.has(nid), `СТРУКТУРА · ${sid}/${nid} — недостижим`);
  for (const t of цели)
    бьём(!!sc.nodes[t], `СТРУКТУРА · ${sid} — переход в несуществующий узел «${t}»`);
  бьём(!!sc.nodes[sc.start], `СТРУКТУРА · ${sid} — стартовый узел «${sc.start}» не найден`);
}

/* 2. best каждого узла проходит собственный judge */
for (const sid of Object.keys(SCENES))
  for (const [nid, n] of Object.entries(SCENES[sid].nodes)) {
    if (!n.best) { бьём(false, `BEST · ${sid}/${nid} — нет поля best`); continue; }
    const r = judge(sid, nid, n.best);
    бьём(r.br !== 'huh' && !!n.tr[r.br],
      `BEST · ${sid}/${nid} — «${n.best}» не принимается (${r.br}). Кнопка «Дальше» заклинит.`);
  }

/* 3. мусор нигде не проходит */
for (const sid of Object.keys(SCENES))
  for (const nid of Object.keys(SCENES[sid].nodes))
    for (const j of МУСОР) {
      const r = judge(sid, nid, j);
      бьём(r.br === 'huh', `МУСОР · ${sid}/${nid} — «${j}» принят как ветка «${r.br}»`);
    }

/* 4. имена: мусор не становится именем, живые имена распознаются */
const узлыИмён = [];
for (const sid of Object.keys(SCENES))
  for (const nid of Object.keys(SCENES[sid].nodes)) {
    const r = judge(sid, nid, 'Anna');
    if (r.mem && r.mem.name) узлыИмён.push([sid, nid]);
  }
for (const [sid, nid] of узлыИмён) {
  for (const j of ИМЕНА_МУСОР) {
    const r = judge(sid, nid, j);
    бьём(!r.mem.name, `ИМЯ · ${sid}/${nid} — «${j}» стало именем «${r.mem.name}»`);
  }
  for (const n of [...ИМЕНА_RU, ...ИМЕНА_EN])
    for (const форма of [`My name is ${n}`, `I am ${n}`, n]) {
      const r = judge(sid, nid, форма);
      бьём(r.mem.name === n, `ИМЯ · ${sid}/${nid} — «${форма}» дало «${r.mem.name || 'ничего'}» вместо «${n}»`);
    }
}

/* 5. отрицание: слово с «no/not» не должно выбирать это же слово.
   Ключевые слова берём ИЗ САМОГО УЗЛА — так работает на любой теме,
   хоть про врача, хоть про аренду, хоть про аэропорт.
   Узлы, которые ловят имя, пропускаем: там «red» — законное имя, а не выбор. */
/* Слова, для которых отрицание НЕ означает отказ от выбора:
   вопросы, намерения, вежливость, служебное. «not much» — это тот же вопрос о цене. */
const СЛУЖЕБНЫЕ = new Set(['not', 'nothing', 'never', 'yes', 'yeah', 'sure', 'okay', 'please',
  'thanks', 'thank', 'sorry', 'pardon', 'what', 'when', 'where', 'which', 'who', 'why', 'how',
  'again', 'repeat', 'and', 'the', 'for', 'you', 'your', 'that', 'this', 'here', 'there',
  'huh', 'ask', 'done', 'all', 'more', 'also', 'too', 'just', 'now', 'then', 'give', 'giveup',
  // намерения и вопросы — отрицание при них законно
  'much', 'cost', 'price', 'expensive', 'cheap', 'want', 'need', 'know', 'think', 'like',
  'help', 'tell', 'say', 'mean', 'understand', 'speak', 'talk', 'look', 'looking', 'find',
  'bye', 'goodbye', 'hello', 'later', 'day', 'today', 'good', 'fine', 'great', 'nice',
  'leave', 'leaving', 'wait', 'waiting', 'come', 'coming', 'right', 'correct', 'wrong',
  'sometimes', 'always', 'often', 'every', 'busy', 'free', 'ready', 'sure', 'maybe',
  // служебные внутри judge
  'includes', 'length', 'some', 'return', 'const', 'true', 'false', 'null', 'push', 'slice',
  'indexOf', 'digits', 'raw', 'loop', 'mem', 'both', 'other', 'order', 'many', 'recheck']);

const ключиУзла = n => {
  const s = n.judge.toString();
  const слова = [...s.matchAll(/'([a-z]{3,})'/g)].map(x => x[1]);
  return [...new Set(слова)].filter(x => !СЛУЖЕБНЫЕ.has(x));
};

const именной = new Set(узлыИмён.map(([s, n]) => s + '/' + n));
for (const sid of Object.keys(SCENES))
  for (const [nid, n] of Object.entries(SCENES[sid].nodes)) {
    if (именной.has(sid + '/' + nid)) continue;
    for (const k of ключиУзла(n)) {
      const прямо = judge(sid, nid, k);
      if (прямо.br === 'huh' || прямо.br.startsWith('CRASH')) continue;
      /* достаточно одной формы: если «no X» = «X», проблема есть.
         Четыре формы на слово раздували отчёт в четыре раза. */
      const отр = judge(sid, nid, 'no ' + k);
      бьём(отр.br !== прямо.br,
        `ОТРИЦАНИЕ · ${sid}/${nid} — «no ${k}» даёт ту же ветку «${прямо.br}», что и просто «${k}»`);
    }
  }

/* 6. петли: узел, который возвращает сам в себя, обязан иметь выход */
for (const sid of Object.keys(SCENES))
  for (const [nid, n] of Object.entries(SCENES[sid].nodes))
    for (const [br, tr] of Object.entries(n.tr || {}))
      if (tr.next === nid) {
        const обр = Object.entries(n.tr).find(([b, t]) => t.next && t.next !== nid);
        бьём(!!обр, `ПЕТЛЯ · ${sid}/${nid} — ветка «${br}» возвращает в себя, других выходов нет`);
      }

/* 7. подстановка {…}: заглушка не должна доезжать до игрока */
for (const sid of Object.keys(SCENES))
  for (const [nid, n] of Object.entries(SCENES[sid].nodes))
    for (const [br, tr] of Object.entries(n.tr || {})) {
      const дыры = String(tr.them || '').match(/\{(\w+)\}/g);
      if (!дыры) continue;
      const r = judge(sid, nid, n.best);
      if (r.br === br) for (const д of дыры) {
        const ключ = д.slice(1, -1);
        бьём(r.mem[ключ] != null,
          `ПОДСТАНОВКА · ${sid}/${nid}/${br} — «${д}» останется пустым: judge не заполняет mem.${ключ}`);
      }
    }

/* 8. эталонный проход каждой сцены целиком */
for (const sid of Object.keys(SCENES)) {
  const sc = SCENES[sid];
  const путь = []; let at = sc.start, g = 0;
  while (at && g++ < 30) {
    const n = sc.nodes[at]; if (!n || !n.best) break;
    путь.push(n.best);
    const r = judge(sid, at, n.best);
    const tr = n.tr[r.br]; if (!tr) break;
    at = tr.next;
  }
  const итог = play(sid, путь);
  бьём(итог.done && !итог.log.some(l => l.who === 'huh'),
    `ЭТАЛОН · ${sid} — проход по best не доходит до конца (застрял в «${итог.at}»)`);
}

/* ---------- отчёт ---------- */
const узлов = Object.values(SCENES).reduce((s, x) => s + Object.keys(x.nodes).length, 0);
console.log('');
console.log('  ФАЙЛ: ' + path.basename(file));
console.log('  сцен: ' + Object.keys(SCENES).length + ',  узлов: ' + узлов + ',  проверок: ' + проверок);
console.log('  ' + '─'.repeat(66));

if (!проблемы.length) {
  console.log('  ЧИСТО. Провалов нет.');
  console.log('');
  console.log('  Стенд не видит: кнопки, отрисовку, «Не знаю», микрофон.');
  console.log('  Это проверяется только руками в браузере.');
  console.log('');
  process.exit(0);
}

const группы = {};
for (const p of проблемы) { const k = p.split(' · ')[0]; (группы[k] = группы[k] || []).push(p); }
console.log('  ПРОВАЛОВ: ' + проблемы.length);
console.log('');
for (const [k, список] of Object.entries(группы)) {
  console.log('  ' + k + '  (' + список.length + ')');
  for (const s of список.slice(0, 12)) console.log('    · ' + s.split(' · ').slice(1).join(' · '));
  if (список.length > 12) console.log('    … и ещё ' + (список.length - 12));
  console.log('');
}
console.log('  Стенд не видит: кнопки, отрисовку, «Не знаю», микрофон.');
console.log('');
process.exit(1);

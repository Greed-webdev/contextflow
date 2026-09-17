// Точный аудит A1: исполняет lessons.js в vm и проверяет структуру как объекты.
// Запуск: node qa/audit2.js
const fs = require('fs');
const vm = require('vm');
let src = fs.readFileSync(__dirname + '/../js/lessons.js', 'utf8');
src += '\n;globalThis.__COURSE = COURSE; globalThis.__LANG = LANGUAGES; globalThis.__ST = STAGES; globalThis.__SC = SCENES;';
const ctx = { console, globalThis: null };
ctx.globalThis = ctx;
vm.createContext(ctx);
try { vm.runInContext(src, ctx, { timeout: 10000 }); }
catch (e) { console.error('VM error:', e.message); process.exit(1); }
const COURSE = ctx.__COURSE;
const stage1 = COURSE.en && COURSE.en[1];
if (!stage1) { console.error('нет COURSE.en[1]'); process.exit(1); }

const issues = [];
const add = (kind, level, msg) => issues.push({ kind, level, msg });

let wordsN = 0, buildN = 0, dialogN = 0;
const dupTitles = new Map();

for (const lv of stage1) {
  if (dupTitles.has(lv.title)) dupTitles.set(lv.title, dupTitles.get(lv.title) + 1);
  else dupTitles.set(lv.title, 1);

  if (lv.type === 'words') {
    wordsN++;
    if (typeof lv.newCount !== 'number') add('words', lv.title, 'нет newCount');
    if (!Array.isArray(lv.words) || !lv.words.length) { add('words', lv.title, 'пустой words'); continue; }
    const seen = new Set();
    for (const w of lv.words) {
      if (!w.t || !w.r) add('words', lv.title, 'слово без t/r: ' + JSON.stringify(w).slice(0, 60));
      const k = String(w.t || '').toLowerCase();
      if (seen.has(k)) add('words', lv.title, 'дубль слова: ' + w.t);
      seen.add(k);
      if (w.t && /[а-яё]/i.test(w.t)) add('words', lv.title, 'кириллица в английском слове: ' + w.t);
      if (w.r && /[a-z]/i.test(w.r) && !/[а-яё]/i.test(w.r)) add('words', lv.title, 'перевод без кириллицы: ' + w.t + ' → ' + w.r);
    }
    const newN = lv.words.filter(w => !w.rev).length;
    const revN = lv.words.length - newN;
    if (typeof lv.newCount === 'number' && lv.newCount !== newN)
      add('words', lv.title, `newCount ${lv.newCount} != новых слов ${newN} (rev=${revN})`);
    if (!lv.scene) add('words', lv.title, 'нет scene');
  }
  else if (lv.type === 'build') {
    buildN++;
    if (!Array.isArray(lv.tasks) || !lv.tasks.length) { add('build', lv.title, 'нет tasks'); continue; }
    for (const t of lv.tasks) {
      if (!t.ru || !t.parts || !t.answer || !t.full) { add('build', lv.title, 'задача неполная: ' + JSON.stringify(t).slice(0, 80)); continue; }
      const partsS = t.parts.join(' ');
      if (partsS !== t.answer) add('build', lv.title, `answer != parts.join: «${t.ru}» (${partsS} != ${t.answer})`);
      const fullL = ' ' + t.full.toLowerCase().replace(/[^a-z ]/g, '') + ' ';
      const miss = t.parts.filter(p => !fullL.includes(' ' + p.toLowerCase() + ' '));
      if (miss.length > 1) add('build', lv.title, `full не содержит части [${miss.slice(0,3)}]: «${t.ru}»`);
    }
    if (!lv.scene) add('build', lv.title, 'нет scene');
  }
  else if (lv.type === 'dialog') {
    dialogN++;
    if (lv.variant === 'flow'){
      const f = lv.flow;
      if (!f || typeof f !== 'object'){ add('dialog', lv.title, 'flow: нет объекта flow'); continue; }
      if (typeof f.start !== 'string' || !f.nodes[f.start]) add('dialog', lv.title, 'flow: start указывает в никуда');
      if (!f.nodes || typeof f.nodes !== 'object' || !Object.keys(f.nodes).length){ add('dialog', lv.title, 'flow: нет узлов'); continue; }
      if (!f.opener || !f.opener.them || !f.opener.ru) add('dialog', lv.title, 'flow: нет opener (them/ru)');
      for (const [id, n] of Object.entries(f.nodes)){
        if (!n.task || !n.task.trim()) add('dialog', lv.title, `flow: узел ${id} без task`);
        if (!n.best || !n.best.trim()) add('dialog', lv.title, `flow: узел ${id} без best`);
        if (/[а-яё]/i.test(n.best || '')) add('dialog', lv.title, `flow: узел ${id}: кириллица в best «${n.best}»`);
        if (typeof n.judge !== 'function') add('dialog', lv.title, `flow: узел ${id} без judge`);
        if (!n.tr || !Object.keys(n.tr).length){ add('dialog', lv.title, `flow: узел ${id} без tr`); continue; }
        for (const [br, t] of Object.entries(n.tr)){
          if (!t.them || !t.them.trim()) add('dialog', lv.title, `flow: ${id}.${br} без them`);
          if (/[а-яё]/i.test(t.them || '')) add('dialog', lv.title, `flow: ${id}.${br}: кириллица в them`);
          if (!t.ruThem) add('dialog', lv.title, `flow: ${id}.${br} без перевода ruThem`);
          if (t.next !== null && t.next !== undefined && !f.nodes[t.next])
            add('dialog', lv.title, `flow: ${id}.${br} -> next «${t.next}» не существует`);
        }
      }
      continue;
    }
    if (lv.variant === 'lost'){
      const f = lv.lost;
      if (!f || !Array.isArray(f.nodes) || !f.nodes.length) add('dialog', lv.title, 'lost: нет массива nodes');
      continue;
    }
    if (!Array.isArray(lv.turns) || !lv.turns.length) { add('dialog', lv.title, 'нет turns'); continue; }
    const turns = lv.turns;
    if (turns[0].who !== 'them') add('dialog', lv.title, 'начинается не с собеседника');
    for (let i = 0; i < turns.length; i++) {
      const t = turns[i];
      if (t.who === 'them') {
        if (!t.text || !t.text.trim()) add('dialog', lv.title, `ход ${i + 1}: them без text`);
        if (/[а-яё]/i.test(t.text || '')) add('dialog', lv.title, `ход ${i + 1}: кириллица в text: «${t.text.slice(0, 40)}»`);
        if (!t.ru) add('dialog', lv.title, `ход ${i + 1}: them без перевода ru`);
      } else {
        if (!t.ru) add('dialog', lv.title, `ход ${i + 1}: you без задания`);
        if (!Array.isArray(t.options) || !t.options.length) add('dialog', lv.title, `ход ${i + 1}: you без вариантов`);
        else {
          if (typeof t.best !== 'number' || t.best < 0 || t.best >= t.options.length)
            add('dialog', lv.title, `ход ${i + 1}: best ${t.best} вне диапазона (${t.options.length})`);
          const seenOpt = new Set();
          for (const o of t.options) {
            const k = String(o).toLowerCase();
            if (seenOpt.has(k)) add('dialog', lv.title, `ход ${i + 1}: дубль варианта «${o}»`);
            seenOpt.add(k);
            if (/[а-яё]/i.test(o)) add('dialog', lv.title, `ход ${i + 1}: кириллица в варианте «${o}»`);
          }
          // «лучший» вариант подозрительно похож на неправильный (одинаковые первые слова?)
          const bestOpt = String(t.options[t.best] || '').toLowerCase();
          const sameAs = t.options.filter(o => o !== t.options[t.best] && String(o).toLowerCase().split(' ').slice(0, 3).join(' ') === bestOpt.split(' ').slice(0, 3).join(' '));
          if (sameAs.length) add('dialog', lv.title, `ход ${i + 1}: лучший и др. начинаются одинаково: «${bestOpt}»`);
        }
        if (t.text) add('dialog', lv.title, `ход ${i + 1}: у you-хода есть text (должен быть у them)`);
      }
    }
    if (!lv.scene) add('dialog', lv.title, 'нет scene');
  }
  else add('unknown', String(lv.type), 'неизвестный type: ' + lv.type + ' — ' + lv.title);
}

// дубли названий (разные уровни с одним названием)
const realDup = [...dupTitles.entries()].filter(([t, n]) => n > 1);
realDup.forEach(([t, n]) => add('title', t, `название повторяется ${n} раз`));

console.log('=== Аудит A1 (по объектам, точно) ===');
console.log(`Уровней: words=${wordsN}, build=${buildN}, dialog=${dialogN}`);
console.log(`Проблем: ${issues.length}`);
const byKind = {};
issues.forEach(i => byKind[i.kind] = (byKind[i.kind] || 0) + 1);
console.log('Категории:', Object.entries(byKind).map(([k, v]) => `${k}:${v}`).join('  '));
console.log('\nСписок (до 60):');
issues.slice(0, 60).forEach(i => console.log(`  [${i.kind}] ${i.level}: ${i.msg}`));
fs.writeFileSync('/tmp/a1_audit2.json', JSON.stringify(issues, null, 1));

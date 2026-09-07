// Стенд демо-6 (партия 2) по QA-промпту владельца: отрицания, составные числа,
// петли, ветка more/medium, плюс регресс эталонов, {day}, мусор.
// Запуск: node qa/flow6-test.js
const fs = require('fs');
const html = fs.readFileSync('/home/user/демо-6.html', 'utf8');
const m0 = html.indexOf('/* ================= ЯДРО');
const m1 = html.indexOf('/* ================= UI ================= */');
if (m0 < 0 || m1 < 0) { console.error('маркеры ядра не найдены'); process.exit(1); }
const core = html.slice(m0, m1) + '\nmodule.exports={SCENES, norm, expand};';
fs.writeFileSync('/tmp/d6-core.js', core);
const { SCENES, norm, expand } = require('/tmp/d6-core.js');

let pass = 0, fail = 0;
const fails = [];
function T(name, ok, detail) {
  if (ok) pass++; else { fail++; fails.push(`${name}${detail ? ' — ' + detail : ''}`); }
}
const fmt = (s, mem) => (s || '')
  .replace(/\{name\}/g, (mem && mem.name) || '…')
  .replace(/\{day\}/g, (mem && mem.day) ? String(mem.day).charAt(0).toUpperCase() + String(mem.day).slice(1) : '…');

function step(scene, at, said, mem) {
  const n = scene.nodes[at];
  if (!n) return { err: `нет узла ${at}` };
  mem._digits = said.match(/\d+/g) || [];
  const w = expand(norm(said));
  const r = n.judge ? n.judge(w, mem) : null;
  if (!r || r.huh) return { err: `huh на «${said}» (узел ${at})` };
  const t = n.tr[r.br];
  if (!t) return { err: `нет ветки "${r.br}" для «${said}» (узел ${at})` };
  return { br: r.br, them: fmt(t.them, mem), next: t.next };
}
function run(scene, phrases, mem) {
  mem = mem || {};
  let at = scene.start;
  const log = [];
  for (const ph of phrases) {
    const s = step(scene, at, ph, mem);
    if (s.err) return { ok: false, log, err: s.err, at };
    log.push({ at, ph, br: s.br, them: s.them });
    if (s.next === null || s.next === undefined) return { ok: true, end: at, log, mem };
    if (!scene.nodes[s.next]) return { ok: false, log, err: `next «${s.next}» нет (из ${at})` };
    at = s.next;
  }
  return { ok: false, log, err: `фразы кончились на ${at}`, at };
}

// ---------- структурные проверки всех сцен ----------
for (const [id, sc] of Object.entries(SCENES)) {
  const bad = Object.keys(sc.nodes).filter(k => {
    const n = sc.nodes[k];
    return !n.task || !n.best || typeof n.judge !== 'function' || !n.tr || !Object.keys(n.tr).length;
  });
  T(`[${id}] все узлы имеют task/best/judge/tr`, !bad.length, bad.join(','));
  const missing = [];
  for (const k of Object.keys(sc.nodes)) for (const [br, t] of Object.entries(sc.nodes[k].tr || {}))
    if (t.next !== null && t.next !== undefined && !sc.nodes[t.next]) missing.push(`${k}.${br}->${t.next}`);
  T(`[${id}] все next-узлы существуют`, !missing.length, missing.join(','));
  const noThem = [];
  for (const k of Object.keys(sc.nodes)) for (const [br, t] of Object.entries(sc.nodes[k].tr || {}))
    if (!t.them || !t.them.trim()) noThem.push(`${k}.${br}`);
  T(`[${id}] все ветки имеют them`, !noThem.length, noThem.join(','));
  const bestBad = [];
  for (const k of Object.keys(sc.nodes)) {
    const s = step(sc, k, sc.nodes[k].best, {});
    if (s.err) bestBad.push(`${k}: ${s.err}`);
  }
  T(`[${id}] best каждого узла проходит`, !bestBad.length, bestBad.join(' | '));
  T(`[${id}] есть intro и opener`, !!(sc.intro && sc.opener && sc.opener.them && sc.opener.ru));
}

const s1 = SCENES.s1, s2 = SCENES.s2, s3 = SCENES.s3;

// ---------- Д1: отрицание цвета ----------
for (const [ph, want] of [['not black, red', 'red'], ['black', 'black'], ['black and red', 'both']]) {
  const s = step(s2, 'pick', ph, {});
  T(`pick «${ph}» -> ${want}`, !s.err && s.br === want, s.err || s.br);
}
for (const ph of ['no red', 'I do not want red', 'I do not like red']) {
  const s = step(s2, 'pick', ph, {});
  T(`pick «${ph}» -> НЕ red`, !s.err && s.br !== 'red', s.err || s.br);
}

// ---------- Д2: сдача ----------
for (const [ph, want] of [['no thanks', 'recheck'], ['no, thank you', 'recheck'], ['no', 'recheck']]) {
  const s = step(s1, 'change', ph, {});
  T(`change «${ph}» -> ${want}`, !s.err && s.br === want, s.err || s.br);
}
{ const s = step(s1, 'change', 'thank you that is right', {});
  T('change «thank you that is right» -> ok', !s.err && s.br === 'ok', s.err || s.br); }
{ const s = step(s1, 'change', 'wrong, thanks', {});
  T('change «wrong, thanks» -> recheck', !s.err && s.br === 'recheck', s.err || s.br); }
{ const s = step(s1, 'change', 'this is not right', {});
  T('change «this is not right» -> recheck', !s.err && s.br === 'recheck', s.err || s.br); }

// ---------- Д3: размер ----------
for (const ph of ['not small', 'extra small']) {
  const s = step(s2, 'size', ph, {});
  T(`size «${ph}» -> НЕ s`, !s.err && s.br !== 's', s.err || s.br);
}
{ const s = step(s2, 'size', 'medium', {});
  T('size «medium» -> своя ветка (не l)', !s.err && s.br === 'm', s.err || s.br);
  T('size medium: реплика с размером', s.br === 'm' && /medium/i.test(s.them), s.them || ''); }
{ const s = step(s2, 'size', 'small', {});
  T('size «small» -> s (не сломалось)', !s.err && s.br === 's', s.err || s.br); }
{ const s = step(s2, 'size', 'large', {});
  T('size «large» -> l', !s.err && s.br === 'l', s.err || s.br); }

// ---------- Д4: составные числа и ноль ----------
for (const ph of ['five hundred', 'two and three']) {
  const s = step(s1, 'count', ph, {});
  T(`count «${ph}» -> НЕ five`, !s.err && s.br !== 'five', s.err || s.br);
}
{ const s = step(s1, 'count', '0', {});
  T('count «0» -> huh', /huh/.test(s.err || ''), s.err || s.br); }
for (const ph of ['five', '5']) {
  const s = step(s1, 'count', ph, {});
  T(`count «${ph}» -> five (не сломалось)`, !s.err && s.br === 'five', s.err || s.br);
}
{ const s = step(s1, 'count', 'twenty five', {});
  T('count «twenty five» -> five? нет, othernum (25)', !s.err && s.br === 'othernum', s.err || s.br); }
{ const s = step(s1, 'extra', 'two loaves of bread', {});
  T('extra «two loaves of bread» -> two (не сломалось)', !s.err && s.br === 'two', s.err || s.br); }
{ const s = step(s1, 'twelve', 'twelve', {});
  T('twelve «twelve» -> ok (не сломалось)', !s.err && s.br === 'ok', s.err || s.br); }

// ---------- Д5: rest умеет «ещё» ----------
for (const [ph, want] of [['I want another one', 'more'], ['yes I need more', 'more'], ['no I need more', 'more'], ['no that is all thank you', 'all']]) {
  const s = step(s2, 'rest', ph, {});
  T(`rest «${ph}» -> ${want}`, !s.err && s.br === want, s.err || s.br);
}
// и путь с докупкой: more -> pick -> black -> ...
r = run(s2, ['I prefer the black one.', 'small', 'thanks', 'I want another one', 'black', 'small', 'thanks', 'no that is all', 'by card', 'you too']);
T('S2 докупка через more: путь до конца', r.ok, r.err);

// ---------- Д6: петли уступают ----------
{ const mem = {};
  const a = step(s1, 'count', 'fifty', mem), b = step(s1, 'count', 'fifty', mem), c = step(s1, 'count', 'fifty', mem);
  T('count fifty x2 -> othernum (петля)', a.br === 'othernum' && b.br === 'othernum', (a.br + '/' + b.br));
  T('count fifty x3 -> диалог сдвигается', c.next === 'twelve', c.br + ' next:' + c.next); }
{ const mem = {};
  step(s2, 'pick', 'blue', mem); step(s2, 'pick', 'blue', mem);
  const c = step(s2, 'pick', 'blue', mem);
  T('pick blue x3 -> заказ (сдвиг)', c.br === 'order', c.br + ' next:' + c.next); }
{ const mem = {};
  step(s1, 'twelve', 'twenty', mem); step(s1, 'twelve', 'twenty', mem);
  const c = step(s1, 'twelve', 'twenty', mem);
  T('twelve twenty x3 -> уступка (сдвиг)', c.br === 'giveup', c.br + ' next:' + c.next); }

// ---------- регресс: три эталона целиком без единого huh ----------
r = run(s1, ['Five, please.', 'Twelve? Not twenty?', 'Right, here you are. Thank you.',
  'Two loaves of bread, please.', 'I will pay in cash.', 'Thank you. That is right.']);
T('S1 эталон: путь до конца', r.ok, r.err);
r = run(s2, ['I prefer the black one.', 'A small one, please.', 'Thank you very much.',
  'No, that is all, thank you.', 'By card, please.', 'Thanks, you too!']);
T('S2 эталон: путь до конца', r.ok, r.err);
r = run(s3, ['Sure. Which day?', 'Wednesday is busy for me. Can we do Thursday?',
  'Great, see you on Thursday.', 'When will I know?', 'Thank you, I will wait for your call.',
  'Thank you. Have a good day.']);
T('S3 эталон: путь до конца', r.ok, r.err);
// S1 отказ-путь
r = run(s1, ['No, thanks. I am just looking.', 'Thank you. Goodbye!']);
T('S1 отказ: путь до конца', r.ok, r.err);
// S3: No -> уточнение дня
r = run(s3, ['No.', 'Thursday, please.', 'Great, see you on Thursday.',
  'When will I know?', 'Thank you, I will wait for your call.', 'Thank you. Have a good day.']);
T('S3 «No» -> день: путь до конца', r.ok, r.err);

// ---------- {day} ----------
r = run(s3, ['Monday works for me.', 'Great, see you on Monday.',
  'When will I know?', 'I will wait for your call.', 'Thank you. Goodbye!']);
T('S3 {day} «Monday» первой репликой', r.ok && /Monday then/.test(r.log[0].them), r.log[0] && r.log[0].them);
r = run(s3, ['Monday works for me.', 'Great, see you on Tuesday.', 'Great, see you on Monday.',
  'When will I know?', 'I will wait for your call.', 'Bye!']);
T('S3 {day} другой день в conf -> «agreed on Monday»', r.ok && /agreed on Monday/i.test(r.log[1].them), (r.log[1] && r.log[1].them) || r.err);

// ---------- мусор нигде не пролезает ----------
for (const id of ['s1', 's2', 's3']) {
  for (const at of Object.keys(SCENES[id].nodes)) {
    for (const junk of ['banana', 'asdfgh', 'fuck', 'lorem ipsum']) {
      const s = step(SCENES[id], at, junk, {});
      T(`[${id}.${at}] мусор «${junk}» -> huh`, /huh/.test(s.err || ''), s.err || s.br);
    }
  }
}

console.log(`\nИТОГ: ${pass} pass, ${fail} fail\n`);
if (fails.length) { console.log('ПРОВАЛЫ:'); fails.forEach(f => console.log(' ✗ ' + f)); process.exitCode = 1; }

// Регресс ветвящихся диалогов ПРИЛОЖЕНИЯ (variant:'flow') — эталон демо-5.
// Данные: flow-записи js/lessons.js; судьи видят хелперы js/app.js (как в браузере).
// Дополнительно: данные трёх сцен обязаны совпадать с демо-эталоном демо-5.html.
// Запуск: node qa/flow-test.js
const fs = require('fs');
const vm = require('vm');
const APP = '/home/user/js/app.js';
const LESS = '/home/user/js/lessons.js';
const DEMO = '/home/user/демо-5.html';
const appSrc = fs.readFileSync(APP, 'utf8');
const h0 = appSrc.indexOf('/* ---------- помощники ветвящихся диалогов');
if (h0 < 0) { console.error('маркер помощников flow в app.js не найден'); process.exit(1); }
const helpers = appSrc.slice(h0, appSrc.indexOf('const Lesson = {', h0));

function runBoth(code) {
  const ctx = { console, setTimeout, clearTimeout };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { timeout: 10000 });
  return ctx;
}

// --- приложение: helpers + курс ---
const ctxApp = runBoth(helpers + '\n' + fs.readFileSync(LESS, 'utf8') +
  '\n;globalThis.__C = COURSE; globalThis.__H = { norm, expand };');
const stage1 = ctxApp.__C.en[1];
const flowBy = {};
const FLOW_TITLES = ['Первое приветствие', 'Заполнить анкету', 'Разговор о семье',
  'Назвать количество', 'Выбрать цвет', 'Назначить день',
  'Узнать время', 'Разговор о погоде', 'У врача',
  'Купить куртку', 'Заказать обед', 'У барной стойки',
  'Показать квартиру', 'Что-то сломалось', 'Найти банк',
  'Купить билет', 'Объяснить дорогу', 'Рассказать о работе', 'На языковых курсах'];
for (const t of FLOW_TITLES) {
  const lv = stage1.find(x => x.type === 'dialog' && x.variant === 'flow' && x.title === t);
  if (!lv) { console.error('нет flow-записи «' + t + '» в курсе'); process.exit(1); }
  flowBy[t] = lv.flow;
}
const SCENES = { s1: flowBy['Первое приветствие'], s2: flowBy['Заполнить анкету'], s3: flowBy['Разговор о семье'],
  s4: flowBy['Назвать количество'], s5: flowBy['Выбрать цвет'], s6: flowBy['Назначить день'],
  s7: flowBy['Узнать время'], s8: flowBy['Разговор о погоде'], s9: flowBy['У врача'],
  s10: flowBy['Купить куртку'], s11: flowBy['Заказать обед'], s12: flowBy['У барной стойки'],
  s13: flowBy['Показать квартиру'], s14: flowBy['Что-то сломалось'], s15: flowBy['Найти банк'],
  s16: flowBy['Купить билет'], s17: flowBy['Объяснить дорогу'], s18: flowBy['Рассказать о работе'],
  s19: flowBy['На языковых курсах'] };
const norm = ctxApp.__H.norm, expand = ctxApp.__H.expand;
const SPEC = JSON.parse(fs.readFileSync('/home/user/сцена-1-живая-логика.json', 'utf8'));

let pass = 0, fail = 0;
const fails = [];
function T(name, ok, detail) {
  if (ok) pass++; else { fail++; fails.push(name + (detail ? ' — ' + detail : '')); }
}

// --- идентичность: данные приложения == демо-эталон ---
function sig(f) {
  const o = { start: f.start, intro: f.intro, opener: f.opener, nodes: {} };
  for (const [id, n] of Object.entries(f.nodes)) {
    o.nodes[id] = { task: n.task, best: n.best, judge: n.judge ? String(n.judge) : null, tr: n.tr };
  }
  const flat = (s) => String(s).split('\n').map(l => l.trim()).join('\n');
  return JSON.stringify(o, (k, v) => typeof v === 'string' ? flat(v) : v);
}
{
  const html = fs.readFileSync(DEMO, 'utf8');
  const demoSrc = [];
  for (const v of ['S1', 'S2', 'S3']) {
    const a = html.indexOf('const ' + v + ' = {');
    const b = html.indexOf('\n}};\n', a) + 4;
    demoSrc.push(html.slice(a, b));
  }
  const ctxD = runBoth(helpers + '\n' + demoSrc.join('\n') + '\n;globalThis.__D={s1:S1,s2:S2,s3:S3};');
  const pairs = [['s1', 'Первое приветствие'], ['s2', 'Заполнить анкету'], ['s3', 'Разговор о семье']];
  for (const [k, t] of pairs) {
    const same = sig(ctxD.__D[k]) === sig(flowBy[t]);
    T('идентичность демо-эталону: ' + t, same);
  }
}
// --- идентичность: демо-6 (партия 2, одобрено) == данные приложения ---
{
  const html6 = fs.readFileSync('/home/user/демо-6.html', 'utf8');
  const src6 = [];
  for (const v of ['S1', 'S2', 'S3']) {
    const a = html6.indexOf('const ' + v + ' = {');
    let d = 0, i = html6.indexOf('{', a);
    while (i < html6.length) {
      const c = html6[i];
      if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; }
      i++;
    }
    src6.push(html6.slice(a, i + 1));
  }
  const ctx6 = runBoth(helpers + '\n' + src6.join('\n') + '\n;globalThis.__D={s1:S1,s2:S2,s3:S3};');
  const pairs6 = [['s1', 'Назвать количество'], ['s2', 'Выбрать цвет'], ['s3', 'Назначить день']];
  for (const [k, t] of pairs6) {
    const same = sig(ctx6.__D[k]) === sig(flowBy[t]);
    T('идентичность демо-6 (одобрено): ' + t, same);
  }
}// --- идентичность: демо-7 и демо-8 (партии 3-4, одобрены) == данные приложения ---
function сценыИзФайла(path) {
  const html = fs.readFileSync(path, 'utf8');
  const src = [];
  for (const v of ['S1', 'S2', 'S3']) {
    const a = html.indexOf('const ' + v + ' = {');
    let d = 0, i = html.indexOf('{', a);
    while (i < html.length) {
      const c = html[i];
      if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; }
      i++;
    }
    src.push(html.slice(a, i + 1));
  }
  return src;
}
{
  const src7 = сценыИзФайла('/home/user/демо-7.html');
  const ctx7 = runBoth(helpers + '\n' + src7.join('\n') + '\n;globalThis.__D={s1:S1,s2:S2,s3:S3};');
  const pairs7 = [['s1', 'Узнать время'], ['s2', 'Разговор о погоде'], ['s3', 'У врача']];
  for (const [k, t] of pairs7) {
    const same = sig(ctx7.__D[k]) === sig(flowBy[t]);
    T('идентичность демо-7 (одобрено): ' + t, same);
  }
}
{
  const src8 = сценыИзФайла('/home/user/демо-8.html');
  const ctx8 = runBoth(helpers + '\n' + src8.join('\n') + '\n;globalThis.__D={s1:S1,s2:S2,s3:S3};');
  const pairs8 = [['s1', 'Купить куртку'], ['s2', 'Заказать обед'], ['s3', 'У барной стойки']];
  for (const [k, t] of pairs8) {
    const same = sig(ctx8.__D[k]) === sig(flowBy[t]);
    T('идентичность демо-8 (одобрено): ' + t, same);
  }
}
// --- идентичность: демо-9 и демо-10 (партии 5-6, вторая рецензия закрыта) == приложение ---
{
  const src9 = сценыИзФайла('/home/user/демо-9.html');
  const ctx9 = runBoth(helpers + '\n' + src9.join('\n') + '\n;globalThis.__D={s1:S1,s2:S2,s3:S3};');
  const pairs9 = [['s1', 'Показать квартиру'], ['s2', 'Что-то сломалось'], ['s3', 'Найти банк']];
  for (const [k, t] of pairs9) {
    const same = sig(ctx9.__D[k]) === sig(flowBy[t]);
    T('идентичность демо-9: ' + t, same);
  }
}
{
  const src10 = сценыИзФайла('/home/user/демо-10.html');
  const ctx10 = runBoth(helpers + '\n' + src10.join('\n') + '\n;globalThis.__D={s1:S1,s2:S2,s3:S3};');
  const pairs10 = [['s1', 'Купить билет'], ['s2', 'Объяснить дорогу'], ['s3', 'Рассказать о работе']];
  for (const [k, t] of pairs10) {
    const same = sig(ctx10.__D[k]) === sig(flowBy[t]);
    T('идентичность демо-10: ' + t, same);
  }
}

// ---------- симулятор (та же механика, что в app.js flowJudge/flowTr) ----------
const fmt = (s, mem) => (s || '')
  .replace(/\{name\}/g, (mem && mem.name) || '…')
  .replace(/\{day\}/g, (mem && mem.day) ? String(mem.day).charAt(0).toUpperCase() + String(mem.day).slice(1) : '…');
function step(scene, at, said, mem) {
  const n = scene.nodes[at];
  if (!n) return { err: 'нет узла ' + at };
  mem._digits = said.match(/\d+/g) || [];
  const w = expand(norm(said));
  const r = n.judge ? n.judge(w, mem) : null;
  if (!r || r.huh) return { err: 'huh на «' + said + '» (узел ' + at + ')' + (r && r.note ? ': ' + r.note : '') };
  const t = n.tr[r.br];
  if (!t) return { err: 'нет ветки "' + r.br + '" для «' + said + '» (узел ' + at + ')' };
  return { br: r.br, them: fmt(t.them, mem), ru: fmt(t.ruThem, mem), note: t.note || null, next: t.next };
}
function run(scene, phrases, mem) {
  mem = mem || {};
  let at = scene.start;
  const log = [];
  for (const ph of phrases) {
    const s = step(scene, at, ph, mem);
    if (s.err) return { ok: false, log, err: s.err, at };
    log.push({ at, ph, br: s.br, them: s.them, note: s.note });
    if (s.next === null || s.next === undefined) return { ok: true, end: at, log, mem };
    if (!scene.nodes[s.next]) return { ok: false, log, err: 'next «' + s.next + '» не существует (из ' + at + ')' };
    at = s.next;
  }
  return { ok: false, log, err: 'фразы кончились на узле ' + at, at };
}

// ---------- структурные проверки всех сцен ----------
for (const [id, sc] of Object.entries(SCENES)) {
  const names = Object.keys(sc.nodes);
  const bad = names.filter(k => {
    const n = sc.nodes[k];
    return !n.task || !n.best || typeof n.judge !== 'function' || !n.tr || !Object.keys(n.tr).length;
  });
  T(`[${id}] все узлы имеют task/best/judge/tr`, !bad.length, bad.join(','));
  const missing = [];
  for (const k of names) for (const [br, t] of Object.entries(sc.nodes[k].tr || {})) {
    if (t.next !== null && t.next !== undefined && !sc.nodes[t.next]) missing.push(`${k}.${br}->${t.next}`);
  }
  T(`[${id}] все next-узлы существуют`, !missing.length, missing.join(','));
  const nothem = [];
  for (const k of names) for (const [br, t] of Object.entries(sc.nodes[k].tr || {}))
    if (!t.them || !t.them.trim()) nothem.push(`${k}.${br}`);
  T(`[${id}] все ветки имеют them`, !nothem.length, nothem.join(','));
  const stuck = [];
  for (const k of names) {
    let found = false;
    const seen = new Set([k]);
    const q = [[k, 0]];
    while (q.length) {
      const [u, d] = q.shift();
      if (d > 20) break;
      const outs = Object.values(sc.nodes[u].tr).map(t => t.next).filter(x => x !== null && x !== undefined);
      if (outs.length < Object.keys(sc.nodes[u].tr).length) { found = true; break; }
      for (const nx of outs) if (!seen.has(nx)) { seen.add(nx); q.push([nx, d + 1]); }
    }
    if (!found) stuck.push(k);
  }
  T(`[${id}] из всех узлов достижим конец`, !stuck.length, stuck.join(','));
  const bestBad = [];
  for (const k of names) {
    const s = step(sc, k, sc.nodes[k].best, {});
    if (s.err) bestBad.push(`${k}: ${s.err}`);
  }
  T(`[${id}] best каждого узла проходит`, !bestBad.length, bestBad.join(' | '));
  const branching = names.some(k => {
    const outs = [...new Set(Object.values(sc.nodes[k].tr).map(t => t.next))];
    return outs.length >= 2;
  });
  T(`[${id}] есть узел с >=2 разными next (ветвление)`, branching);
  T(`[${id}] есть intro и стартовая реплика собеседника (opener)`,
    !!(sc.intro && sc.opener && sc.opener.them && sc.opener.ru),
    JSON.stringify(sc.opener || 'нет'));
}

// ---------- спека: кейсы первого хода сцены 1 ----------
const s1 = SCENES.s1;
for (const tc of SPEC.tests) {
  const mem = {};
  const s = step(s1, 'n0', tc.say, mem);
  if (s.err) { T(`спека «${tc.say}» -> ${tc.expect}`, false, s.err); continue; }
  T(`спека «${tc.say}» -> ветка ${tc.expect}`, s.br === tc.expect, `получили ${s.br}`);
  const lower = (s.them + ' ' + (s.ru || '')).toLowerCase();
  const forb = (tc.notInReply || []).filter(word => lower.includes(word.toLowerCase()));
  T(`спека «${tc.say}»: в ответе нет запрещённых [${(tc.notInReply||[]).join(',')}]`, !forb.length,
    'найдено: ' + forb.join(',') + ' | реплика: ' + s.them);
  if (tc.correction) {
    T(`спека «${tc.say}»: показана поправка «${tc.correction}»`, s.note === tc.correction,
      s.note ? 'поправка: ' + s.note : 'поправки нет');
  }
}
// ответ бота на отказ не должен выпытывать имя (главный баг) — на всём пути отказа
let r = run(s1, ['No, thanks. I am fine.', 'Thank you. Goodbye!']);
T('S1 отказ: полный путь до конца', r.ok, r.err);
T('S1 отказ: нигде не спрашивает имя и не тащит на встречу',
  r.ok && !r.log.some(l => /name/i.test(l.them) || /meeting/i.test(l.them) || /204/.test(l.them)),
  r.log.map(l => l.them).join(' | '));

// ---------- S1: живые пути ----------
// идеал: приветствие+имя+цель -> сразу кабинет
r = run(s1, ['Hi, my name is Anna. I have a meeting.', 'Room 204, second floor?', 'Thanks a lot. Have a good day!']);
T('S1 идеал: путь до конца', r.ok, r.err);
T('S1 идеал: сразу про 204 и по имени', r.ok && r.log[0].them.includes('204') && r.log[0].them.includes('Anna'), r.log[0] && r.log[0].them);
// отказ коротким «Goodbye!»
r = run(s1, ['Goodbye!', 'Thank you. Goodbye!']);
T('S1 «Goodbye!» -> ветка прощания, путь до конца', r.ok && r.end === 'bye', r.err || r.end);
// ошибка новичка -> поправка -> встреча
r = run(s1, ['Me name Anna.', 'Yes, I am here for the meeting.', 'Room 204, second floor?', 'Thanks a lot. Goodbye!']);
T('S1 ошибка новичка: путь до конца', r.ok, r.err);
T('S1 ошибка: назвал по имени и спросил про встречу', r.ok && r.log[0].them.includes('Anna') && /are you here for the meeting/i.test(r.log[0].them), r.log[0] && r.log[0].them);
// без имени (только привет) -> спросит имя -> потом цель
r = run(s1, ['Hello!', 'My name is Anna.', 'Yes, I am here for the meeting.', 'Room 204, second floor?', 'Thanks a lot. Goodbye!']);
T('S1 «Hello!» без имени: путь до конца', r.ok, r.err);
T('S1 «Hello!»: спрашивает имя', r.ok && /what is your name/i.test(r.log[0].them), r.log[0] && r.log[0].them);
// сказал про встречу, но без имени -> спросит имя -> сразу кабинет
r = run(s1, ['I have a meeting.', 'My name is Anna.', 'Room 204, second floor?', 'Thanks, goodbye!']);
T('S1 встреча без имени: путь до конца', r.ok, r.err);
T('S1 встреча без имени: спросил имя', r.ok && /what is your name/i.test(r.log[0].them), r.log[0] && r.log[0].them);
// «жду друга» на входе -> присядьте
r = run(s1, ['I am waiting for a friend.', 'Thank you very much.']);
T('S1 «жду друга» на входе: путь до конца', r.ok, r.err);
T('S1 «жду друга»: НЕ про кабинет/имя', r.ok && !r.log[0].them.includes('204') && !/name/i.test(r.log[0].them), r.log[0] && r.log[0].them);
// имя без цели -> спросит про встречу; «иду домой» -> провожают (старый баг не вернулся)
r = run(s1, ['Hi, my name is Anna.', 'Sorry, I am going home.', 'Bye, have a nice day!']);
T('S1 имя->«иду домой»: путь до конца', r.ok, r.err);
T('S1 «иду домой»: НЕ «take a seat»', r.ok && !r.log[1].them.toLowerCase().includes('seat'), r.log[1] && r.log[1].them);
T('S1 «иду домой»: «take care»', r.ok && /take care/i.test(r.log[1].them), r.log[1] && r.log[1].them);
// «No» на вопросе про встречу -> уточнение «чем помочь?» -> помощь/просто зашёл
r = run(s1, ['Hi, my name is Anna.', 'No.', 'I need some help, please.', 'Thank you.']);
T('S1 «No»->уточнение->помощь: путь до конца', r.ok, r.err);
T('S1 «No» на встречу -> ask (уточнение)', r.ok && r.log[1].br === 'ask' && /what can i do/i.test(r.log[1].them), r.log[1] && (r.log[1].br + ' / ' + r.log[1].them));
r = run(s1, ['Hi, my name is Anna.', 'No.', 'Just looking around.', 'Bye!']);
T('S1 «No»->уточнение->«просто зашёл»: путь до конца', r.ok, r.err);
T('S1 «просто зашёл» в reason -> «nice day»', r.ok && r.log[2].br==='home' && /nice day/i.test(r.log[2].them), r.log[2] && r.log[2].them);
// meet: мусор -> честный huh (не свалка в ask)
for (const ph of ['banana','!!!','777','the the the']) {
  const s = step(s1,'meet',ph,{});
  T(`meet «${ph}» -> huh`, /huh/.test(s.err||''), s.err||s.br);
}
{ const s = step(s1,'meet','yes',{}); T('meet «yes» -> meet', !s.err&&s.br==='meet', s.err||s.br); }
{ const s = step(s1,'meet','I am waiting for a friend',{}); T('meet «жду друга» -> other', !s.err&&s.br==='other', s.err||s.br); }
// «не расслышал» -> уточнение (ask) -> помощь/просто зашёл
r = run(s1, ['Hi, my name is Anna.', 'Sorry?', 'I need some help, please.', 'Thank you.']);
T('S1 «Sorry?»->уточнение->помощь: путь до конца', r.ok, r.err);
T('S1 «Sorry?» -> ask', r.ok && r.log[1].br === 'ask' && /what can i do/i.test(r.log[1].them), r.log[1] && r.log[1].br);
r = run(s1, ['Hi, my name is Anna.', 'Sorry?', 'Just looking around.', 'Bye!']);
T('S1 «Sorry?»->«просто зашёл»: путь до конца', r.ok, r.err);
T('S1 «просто зашёл» в reason -> «nice day»', r.ok && r.log[2].br==='home' && /nice day/i.test(r.log[2].them), r.log[2] && r.log[2].them);

// ---------- S2 и S3 (без изменений, регрессия) ----------
const s2 = SCENES.s2;
r = run(s2, ['My name is Anna Petrova.', 'I live at 12 Park Street.', 'I am twenty-five.',
  'Can I write it here?', 'It is on the paper too.', 'When will it be ready?', 'Thank you very much.']);
T('S2 полный путь: до конца', r.ok, r.err);
r = run(s2, ['My name is Anna Petrova.', 'I live on Park Street.', 'Park Street, twelve.',
  'I am twenty-five.', 'Can I write it here?', 'It is on the paper too.', 'When will it be ready?', 'Thank you.']);
T('S2 адрес без номера: путь до конца', r.ok, r.err);
r = run(s2, ['My name is Anna Petrova.', 'I live at 12 Park Street.', 'I am twenty.', 'Twenty-five.', 'Can I write it here?',
  'It is on the paper too.', 'When will it be ready?', 'Thank you.']);
T('S2 возраст 20 -> переспрос -> 25', r.ok && r.log[2].br === 'again', r.err || (r.log[2] && r.log[2].br));

const s3 = SCENES.s3;
r = run(s3, ['I have a brother and a sister.', 'My parents live in Russia.', 'Yes, very much.',
  'They came in the summer.', 'Two weeks.', 'I will go and see them soon.']);
T('S3 полный путь: до конца', r.ok, r.err);
r = run(s3, ['I have a brother and a sister.', 'They live here too.', 'Yes, every weekend.',
  'I will go and see them soon.']);
T('S3 родители здесь: путь до конца', r.ok, r.err);
r = run(s3, ['I have a brother and a sister.', 'My parents live in Russia.', 'No, not really.',
  'I will go and see them soon.']);
T('S3 не скучает: минует visit/stay', r.ok && !r.log.some(l => l.at === 'visit' || l.at === 'stay'), r.log.map(l => l.at).join('>'));

// ---------- правки по промпту (дефекты 1–5) ----------
// Д1: «Sorry I am late for the meeting» — имя не назначается, ветка про встречу
{ const m1 = {}; const s1x = step(s1, 'n0', 'Sorry I am late for the meeting.', m1);
  T('QA1 late: ветка про встречу, имя НЕ «Late»', !s1x.err && s1x.br === 'meet_noname' && !m1.name,
    s1x.err || (s1x.br + ' / имя: ' + (m1.name || '(пусто)')));
  T('QA1 late: ответ без «Nice to meet you, Late»', s1x.err || !s1x.them.includes('Late'), s1x.them || '');
}
r = run(s1, ['Sorry I am late for the meeting.', 'My name is Anna.', 'Room 204, second floor?', 'Thanks a lot. Goodbye!']);
T('QA1 late: путь до конца', r.ok, r.err);
// Д1: «No thank you, I am just leaving» — leave, без «Nice to meet you», имя не назначено
r = run(s1, ['No thank you, I am just leaving.', 'Thank you. Goodbye!']);
T('QA2 leaving: путь до конца', r.ok, r.err);
T('QA2 leaving: ветка leave', r.ok && r.log[0].br === 'leave', r.log[0] && r.log[0].br);
T('QA2 leaving: без «Nice to meet you»', r.ok && !/nice to meet you/i.test(r.log[0].them), r.log[0] && r.log[0].them);
T('QA2 leaving: имя НЕ назначено (не «Leaving»)', !r.mem.name, 'имя: ' + (r.mem.name || '(пусто)'));
// Д3: «I do not have a meeting» — отказ, не ask
r = run(s1, ['I do not have a meeting.', 'Thank you. Goodbye!']);
T('QA3 not-have-meeting: путь до конца', r.ok, r.err);
T('QA3 not-have-meeting: ветка leave (не ask)', r.ok && r.log[0].br === 'leave', r.log[0] && r.log[0].br);
// Д2: «I have a meeting with Anna» — чужое имя не записывается
{ const m4 = {}; const s4 = step(s1, 'n0', 'I have a meeting with Anna.', m4);
  T('QA4 with-Anna: ветка meet_noname, имя не записано', !s4.err && s4.br === 'meet_noname' && !m4.name,
    s4.err || (s4.br + ' / имя: ' + (m4.name || '(пусто)')));
}
r = run(s1, ['I have a meeting with Anna.', 'My name is Anna.', 'Room 204, second floor?', 'Thanks, goodbye!']);
T('QA4 with-Anna: путь до конца', r.ok, r.err);
// Д4: stay принимает любую единицу времени
for (const phr of ['One month.', 'A couple of weeks.', 'Ten days.', 'Two weeks.']) {
  r = run(s3, ['I have a brother and a sister.', 'My parents live in Russia.', 'Yes, very much.',
    'They came in the summer.', phr, 'I will go and see them soon.']);
  T(`QA5 stay «${phr}»: путь до конца`, r.ok, r.err);
}
// Д5: who — ответ «у меня нет семьи» не упирается в стену
r = run(s3, ['No, I do not have a big family.', 'I am alone.', 'Yes, I have friends here.']);
T('QA6 alone: путь до конца (новая ветка fr)', r.ok, r.err);
T('QA6 alone: ветка alone, а не отбой', r.ok && r.log[1].br === 'alone', r.log[1] && (r.log[1].br + ' / ' + r.log[1].them));
r = run(s3, ['No, I do not have a big family.', 'I have no family.', 'No, I do not have friends here.']);
T('QA6 no-family: путь до конца', r.ok, r.err);
T('QA6 no-family: мягкий ответ без родственников', r.ok && r.log[1].br === 'alone', r.log[1] && r.log[1].br);
T('QA6 no-friends: дружелюбный ответ', r.ok && r.log[2].br === 'no' && /friend/i.test(r.log[2].them), r.log[2] && r.log[2].them);

// ---------- правки по промпту-2 (регрессия отрицания + захват имён) ----------
// 1. Безобидные обороты с no/not НЕ считаются отказом
{ const m = {}; const s = step(s1, 'n0', 'No problem, my name is Anna and I have a meeting.', m);
  T('QA2-1 no-problem: ветка встречи + имя Anna', !s.err && s.br === 'meet_full' && m.name === 'Anna',
    s.err || (s.br + ' / имя: ' + (m.name || '(пусто)')));
}
{ const s = step(s1, 'n0', 'Yes, no worries, I have a meeting.', {});
  T('QA2-2 no-worries: ветка встречи', !s.err && (s.br === 'meet_full' || s.br === 'meet_noname'), s.err || s.br);
}
{ const s = step(s1, 'n0', 'My name is Anna, I am not late I hope, I have a meeting.', {});
  T('QA2-3 not-late: ветка встречи (не leave)', !s.err && (s.br === 'meet_full' || s.br === 'meet_noname'), s.err || s.br);
}
{ const s = step(s1, 'n0', 'I am Anna. I do not know the room but I have a meeting.', {});
  T('QA2-4 do-not-know: ветка встречи (не leave)', !s.err && (s.br === 'meet_full' || s.br === 'meet_noname'), s.err || s.br);
}
// 2. Настоящие отказы обязаны продолжать работать
for (const [ph, want] of [['I am not here for the meeting','leave'], ['I do not have a meeting','leave'],
                          ['No, I am going home','leave'], ['no','leave']]) {
  const s = step(s1, 'n0', ph, {});
  T(`QA2-5 «${ph}» -> ${want}`, !s.err && s.br === want, s.err || s.br);
}
// 3. name0/name1: уход на вопрос об имени -> переспрос, имя не назначено
for (const nodeId of ['name0','name1']) {
  const m = {}; const s = step(s1, nodeId, 'No thank you, I am just leaving.', m);
  T(`QA2-6 ${nodeId} «No thank you…» -> huh, имя пусто`, /huh/.test(s.err||'') && !m.name,
    (s.err||'?') + ' имя: ' + (m.name || '(пусто)'));
  const m2 = {}; const s2 = step(s1, nodeId, 'Anna', m2);
  T(`QA2-7 ${nodeId} «Anna» -> имя Anna`, !s2.err && m2.name === 'Anna', s2.err || (m2.name || '(пусто)'));
}
// 4. S2 n0: «Sorry I am late» -> huh; полное имя -> full+Anna
{ const m = {}; const s = step(s2, 'n0', 'Sorry I am late.', m);
  T('QA2-8 S2 «Sorry I am late» -> huh, имя пусто', /huh/.test(s.err||'') && !m.name, (s.err||'?') + ' имя: ' + (m.name || '(пусто)'));
  const m2 = {}; const s2b = step(s2, 'n0', 'My name is Anna Petrova.', m2);
  T('QA2-9 S2 полное имя -> full + Anna', !s2b.err && s2b.br === 'full' && m2.name === 'Anna', s2b.err || (s2b.br + ' / ' + (m2.name || '')));
}
// S2 n1: мусор не становится фамилией
{ const m = {}; const s = step(s2, 'n1', 'No thank you, I am just leaving.', m);
  T('QA2-10 S2 n1 «just leaving» -> huh', /huh/.test(s.err||''), s.err || 'не huh');
}

// ---------- правки по промпту-3 (num разведён, miss/visit, call me) ----------
// 1. numS «ждём улицу»
T('QA3-1 numS «999» -> huh', /huh/.test((step(s2,'numS','999',{}).err)||''), step(s2,'numS','999',{}).err||'?');
{ const s=step(s2,'numS','Park Street',{}); T('QA3-2 numS «Park Street» -> ok', !s.err&&s.br==='ok', s.err||s.br); }
// 2. numH «ждём номер»
T('QA3-3 numH «Park Street» -> huh', /huh/.test((step(s2,'numH','Park Street',{}).err)||''), step(s2,'numH','Park Street',{}).err||'?');
{ const s=step(s2,'numH','twelve',{}); T('QA3-4 numH «twelve» -> ok', !s.err&&s.br==='ok', s.err||s.br); }
// 3. visit
for (const [ph,want] of [['yes','yes'],['every year','yes'],['no not yet','no'],['not yet','no'],['last month','yes']]) {
  const s=step(s3,'visit',ph,{}); T(`QA3-5 visit «${ph}» -> ${want}`, !s.err&&s.br===want, s.err||s.br);
}
// 4. miss
for (const [ph,want] of [['of course','yes'],['a little','yes'],['sometimes','yes'],['no not really','no']]) {
  const s=step(s3,'miss',ph,{}); T(`QA3-6 miss «${ph}» -> ${want}`, !s.err&&s.br===want, s.err||s.br);
}
// 4. miss/wait — правки промпта-4
{ const s=step(s3,'miss','no I really miss them',{}); T('QA4-1 miss «no I really miss them» -> yes', !s.err&&s.br==='yes', s.err||s.br); }
{ const s=step(s3,'miss','yes I do not miss them',{}); T('QA4-2 miss «yes I do not miss them» -> no', !s.err&&s.br==='no', s.err||s.br); }
{ const s=step(s3,'miss','no not really',{}); T('QA4-3 miss «no not really» -> no', !s.err&&s.br==='no', s.err||s.br); }
{ const s=step(s3,'miss','of course',{}); T('QA4-4 miss «of course» -> yes', !s.err&&s.br==='yes', s.err||s.br); }
{ const s=step(s1,'wait','no',{}); T('QA4-5 wait «no» -> ok (не застревает)', !s.err&&s.br==='ok', s.err||s.br); }
{ const s=step(s1,'wait','thanks',{}); T('QA4-6 wait «thanks» -> ok', !s.err&&s.br==='ok', s.err||s.br); }
// 5. call me Anna -> fix + имя Anna
{ const m={}; const s=step(s1,'n0','call me Anna',m);
  T('QA3-7 n0 «call me Anna» -> fix + имя Anna', !s.err&&s.br==='fix'&&m.name==='Anna', s.err||(s.br+' / '+(m.name||'')));
}
// 6. маршрут addr: улица без номера -> спрашивает номер (numH), голый номер -> улицу (numS)
r = run(s2, ['My name is Anna Petrova.','I live on Park Street.','twelve.','I am twenty-five.','Can I write it here?','It is on the paper too.','When will it be ready?','Thank you.']);
T('QA3-8 улица -> номер: путь до конца', r.ok, r.err);
r = run(s2, ['My name is Anna Petrova.','Number twelve.','Park Street.','I am twenty-five.','Can I write it here?','It is on the paper too.','When will it be ready?','Thank you.']);
T('QA3-9 номер -> улица: путь до конца', r.ok, r.err);

// ---------- слой имён (перенесён из v3) ----------
// 1. мусор не становится именем (n0, name0/name1)
for (const [sc, at] of [[s1,'n0'],[s1,'name0'],[s1,'name1'],[s2,'n0'],[s2,'n1']]) {
  const bad = ['banana','pizza','asdfgh','lorem','xyz','hmm','because'];
  let okAll = true, det = '';
  for (const ph of bad) {
    const m = {}; const s = step(sc, at, ph, m);
    if (m.name && /^(Banana|Pizza|Asdfgh|Lorem|Xyz|Hmm|Because)$/i.test(m.name)) { okAll = false; det += ph + '→' + m.name + ' '; }
  }
  T(`слой: мусор не имя в ${sc===s1?('s1.'+at):('s2.'+at)}`, okAll, det);
}
// 2. русские имена в 3 формах (в т.ч. вне белого списка) в name0 — голое
for (const nm of ['Aliya','Rustam','Elmir','Aigul','Zarina']) {
  const m = {}; const s = step(s1, 'name0', nm, m);
  T(`слой: голое «${nm}» в name0 -> имя`, !s.err && m.name === nm, s.err || m.name || '(пусто)');
}
// 3. омонимы: ловушки и явная форма
for (const ph of ['I hope I am not late','I will be there','May I come in?']) {
  const m = {}; step(s1, 'n0', ph, m);
  T(`слой: ловушка «${ph.slice(0,16)}…» не даёт имя`, !m.name, m.name || '(пусто)');
}
for (const ph of ['My name is Hope','My name is Will','call me May']) {
  const m = {}; step(s1, 'n0', ph, m);
  const exp = /(?:name is|call me) ([A-Z][a-z]+)/i.exec(ph)[1];
  T(`слой: «${ph}» -> имя ${exp}`, m.name === exp, m.name || '(пусто)');
}
// 4. возраст: два числа / дробное -> переспрос
{ const s = step(s2,'age','I am 25 and my friend is 30',{}); T('age: два числа -> again/huh', s.err!==undefined || s.br==='again', s.br||s.err||''); }
{ const s = step(s2,'age','I am 25.5',{}); T('age: 25.5 -> again/huh', s.err!==undefined || s.br==='again', s.br||s.err||''); }

// ---------- ПАРТИЯ 2: «Назвать количество» (s4) ----------
const s4 = SCENES.s4;
// полный путь (эталон)
r = run(s4, ['Five, please.', 'Twelve? Not twenty?', 'Right, here you are. Thank you.',
  'Two loaves of bread, please.', 'I will pay in cash.', 'Thank you. That is right.']);
T('S4 полный путь: до конца', r.ok, r.err);
// цифра 5 вместо слова
{ const m = {}; const s = step(s4, 'count', '5.', m);
  T('S4 «5.» -> five', !s.err && s.br === 'five', s.err || s.br); }
// другое число -> переспрос (петля на count)
{ const s = step(s4, 'count', 'Three.', {});
  T('S4 «Three.» -> othernum (переспрос)', !s.err && s.br === 'othernum', s.err || s.br); }
// цена -> price, возврат на count
{ const s = step(s4, 'count', 'How much is it?', {});
  T('S4 «How much is it?» -> price', !s.err && s.br === 'price' && /two euros/.test(s.them), s.err || s.br); }
// уход: No thanks -> bye-ветка, короткий путь до конца
r = run(s4, ['No, thanks. I am just looking.', 'Thank you. Goodbye!']);
T('S4 «No thanks» -> bye: путь до конца', r.ok, r.err);
// twenty-переспрос на twelve
{ const s = step(s4, 'twelve', 'Twenty?', {});
  T('S4 «Twenty?» -> ветка twenty (не конец)', !s.err && s.br === 'twenty' && s.next === 'twelve', s.err || s.br); }
// карта в pay -> отказ, потом наличные -> конец
r = run(s4, ['Five, please.', 'Twelve?', 'Right, here you are. Thank you.',
  'Two loaves of bread, please.', 'By card, please.', 'I will pay in cash.', 'Thank you. That is right.']);
T('S4 карта->наличные: путь до конца', r.ok, r.err);
// сдача неправильная -> пересчёт, потом ok
r = run(s4, ['Five, please.', 'Twelve?', 'Right, here you are. Thank you.',
  'Two loaves of bread, please.', 'I will pay in cash.', 'This is not right.', 'Thank you. That is right.']);
T('S4 «не та сдача» -> пересчёт -> конец', r.ok, r.err);
// мусор во всех узлах s4 -> честный huh
for (const at of Object.keys(s4.nodes)) {
  const s = step(s4, at, 'banana', {});
  T('S4 мусор в узле ' + at + ' -> huh', /huh/.test(s.err || ''), s.err || s.br);
}

// ---------- «Выбрать цвет» (s5) ----------
const s5 = SCENES.s5;
r = run(s5, ['I prefer the black one.', 'A small one, please.', 'Thank you very much.',
  'No, that is all, thank you.', 'By card, please.', 'Thanks, you too!']);
T('S5 полный путь: до конца', r.ok, r.err);
// красный вместо чёрного — тоже выбор, путь идёт дальше
r = run(s5, ['I prefer the red one.', 'A small one, please.', 'Thank you very much.',
  'No, that is all, thank you.', 'By card, please.', 'Thanks, you too!']);
T('S5 красный: путь до конца', r.ok, r.err);
{ const s = step(s5, 'pick', 'How much does it cost?', {});
  T('S5 цена -> price (возврат)', !s.err && s.br === 'price', s.err || s.br); }
r = run(s5, ['No, thanks. Just looking.', 'Thank you. Goodbye!']);
T('S5 уход -> bye: путь до конца', r.ok, r.err);
// наличные в paym -> cash-ветка
r = run(s5, ['I prefer the black one.', 'A small one, please.', 'Thank you very much.',
  'No, that is all, thank you.', 'In cash, please.', 'Thanks, you too!']);
T('S5 наличные: путь до конца', r.ok, r.err);
{ const s = step(s5, 'rest', 'No.', {});
  T('S5 rest «No.» -> all', !s.err && s.br === 'all', s.err || s.br); }
for (const at of Object.keys(s5.nodes)) {
  const s = step(s5, at, 'qqqqq', {});
  T('S5 мусор в узле ' + at + ' -> huh', /huh/.test(s.err || ''), s.err || s.br);
}

// ---------- «Назначить день» (s6) ----------
const s6 = SCENES.s6;
r = run(s6, ['Sure. Which day?', 'Wednesday is busy for me. Can we do Thursday?',
  'Great, see you on Thursday.', 'When will I know?', 'Thank you, I will wait for your call.',
  'Thank you. Have a good day.']);
T('S6 полный путь (четверг): до конца', r.ok, r.err);
// согласие на среду
r = run(s6, ['Sure. Which day?', 'Wednesday is fine.', 'Great, see you on Wednesday.',
  'When will I know?', 'I will wait for your call.', 'Bye!']);
T('S6 согласие на среду: путь до конца', r.ok, r.err);
// «No» на предложение -> вопрос «какой день» (не выпроваживание)
r = run(s6, ['No.', 'Thursday, please.', 'Great, see you on Thursday.',
  'When will I know?', 'Thank you, I will wait for your call.', 'Thank you. Have a good day.']);
T('S6 «No» -> уточнение дня: путь до конца', r.ok, r.err);
T('S6 «No»: спросил день, а не выпроводил', r.ok && /good day for you/i.test(r.log[0].them), r.log[0] && r.log[0].them);
// сразу назвал день в ответ на «можем встретиться?»
r = run(s6, ['Monday works for me.', 'Great, see you on Monday.',
  'When will I know?', 'Thank you, I will wait for your call.', 'Thank you. Have a good day.']);
T('S6 прямой день: путь до конца', r.ok, r.err);
// назвал не тот день в подтверждении -> честная поправка -> исправился
r = run(s6, ['Sure. Which day?', 'Wednesday is busy for me. Can we do Thursday?',
  'Great, see you on Monday.', 'Great, see you on Thursday.',
  'When will I know?', 'Thank you, I will wait for your call.', 'Thank you. Have a good day.']);
T('S6 не тот день -> поправка -> путь до конца', r.ok, r.err);
T('S6 поправка назвала договорённый день', r.ok && /agreed on Thursday/i.test(r.log[2].them), r.log[2] && r.log[2].them);
// «не расслышал» в любой момент -> повтор вопроса, выход есть
r = run(s6, ['Sure. Which day?', 'Wednesday is busy for me. Can we do Thursday?',
  'Sorry?', 'Great, see you on Thursday.', 'When will I know?',
  'Thank you, I will wait for your call.', 'Thank you. Have a good day.']);
T('S6 «Sorry?» в conf -> повтор: путь до конца', r.ok, r.err);
for (const at of Object.keys(s6.nodes)) {
  const s = step(s6, at, 'the the the', {});
  T('S6 мусор в узле ' + at + ' -> huh', /huh/.test(s.err || ''), s.err || s.br);
}

// ---------- партии 3-4 (s7-s12): живые пути ----------
const s7 = SCENES.s7, s8 = SCENES.s8, s9 = SCENES.s9;
const s10 = SCENES.s10, s11 = SCENES.s11, s12 = SCENES.s12;
r = run(s7, ['Excuse me, what time is it?', 'Oh, I am late for work.', 'Thank you very much.',
  'Yes, everything else is fine.', 'Thank you, I will.', 'You too, good night!']);
T('S7 эталон: путь до конца', r.ok, r.err);
r = run(s8, ['Yes, very cold. And windy.', "Really? I don't like snow.", 'True. Have a good day!',
  'Is there a cafe near here?', 'Left or right?', 'Thank you, that is very helpful.']);
T('S8 эталон: путь до конца', r.ok, r.err);
{ const m = {}; const st = step(s8, 'cold', 'I do not know', m);
  T('S8 cold «I do not know» -> neu (не dis)', !st.err && st.br === 'neu', st.err || st.br);
  const st2 = step(s8, 'cold', 'No, I think it is warm today', m);
  T('S8 cold «No, I think it is warm» -> dis', !st2.err && st2.br === 'dis', st2.err || st2.br);
  const st3 = step(s8, 'cold', 'it is ok', m);
  T('S8 cold «it is ok» -> neu', !st3.err && st3.br === 'neu', st3.err || st3.br);
}
r = run(s9, ['My head hurts.', 'Since yesterday.', 'Thank you, doctor.', 'When should I come again?',
  'One week. I understand.', 'Thank you, doctor. Goodbye.']);
T('S9 эталон: путь до конца', r.ok, r.err);
r = run(s9, ['My head hurts.', 'Since yesterday.', 'Thank you, doctor.', 'Yes, I have a question.',
  'When should I come again?', 'One week. I understand.', 'Thank you, doctor. Goodbye.']);
T('S9 вопрос врачу (yes -> qask): путь до конца', r.ok, r.err);
{ const st = step(s9, 'quest', 'no questions', {});
  T('S9 quest «no questions» -> no', !st.err && st.br === 'no', st.err || st.br);
  const st2 = step(s9, 'qask', 'What medicine should I take?', {});
  T('S9 qask про лекарство -> med', !st2.err && st2.br === 'med', st2.err || st2.br);
}
r = run(s10, ['Yes, I am looking for a jacket.', 'Medium, please.', 'Thank you. I will take it.',
  'No, that is all, thank you.', 'By card, please.', 'Thanks, you too!']);
T('S10 эталон: путь до конца', r.ok, r.err);
{ const st = step(s10, 'ask', 'I am not browsing', {});
  T('S10 ask «I am not browsing» -> notb', !st.err && st.br === 'notb', st.err || st.br);
  const st2 = step(s10, 'ask', 'No, just looking.', {});
  T('S10 ask «No, just looking» -> browse', !st2.err && st2.br === 'browse', st2.err || st2.br);
}
for (const at of ['try', 'try2', 'last']) {
  const st = step(s10, at, 'I will not take it', {});
  T('S10 ' + at + ' «I will not take it» != take', !st.err && st.br !== 'take', st.err || st.br);
  const st2 = step(s10, at, 'I will take it.', {});
  T('S10 ' + at + ' «I will take it» -> take', !st2.err && st2.br === 'take', st2.err || st2.br);
}
r = run(s11, ['Not yet. Could I see the menu, please?', 'I will have the soup and some bread.',
  'Just water, please.', 'No, thank you. That is all.', 'Thank you very much.',
  'Thank you, it looks delicious.']);
T('S11 эталон: путь до конца', r.ok, r.err);
{ const st = step(s11, 'ready', 'Not yet. Could I see the menu, please?', {});
  T('S11 ready best -> menu (не bye)', !st.err && st.br === 'menu', st.err || st.br);
  const st2 = step(s11, 'ready', 'soup and bread', {});
  T('S11 ready «soup and bread» -> не huh', !st2.err, st2.err || st2.br);
  const st3 = step(s11, 'ready', 'I have no time', {});
  T('S11 ready «I have no time» -> hurry', !st3.err && st3.br === 'hurry', st3.err || st3.br);
  const st4 = step(s11, 'order', 'cat dog fish', {});
  T('S11 order «cat dog fish» -> huh', /huh/.test(st4.err || ''), st4.err || st4.br);
}
r = run(s12, ['A coffee, please.', 'No milk, but with sugar, please.', 'I will pay by card.',
  'No, thank you. That is all.', 'Thank you very much.', 'Thank you, it looks delicious.']);
T('S12 эталон: путь до конца', r.ok, r.err);
{ const st = step(s12, 'milk', 'No milk, but with sugar, please.', {});
  T('S12 milk «No milk, but sugar» -> dm', !st.err && st.br === 'dm', st.err || st.br);
}
// «Не знаю» в UI: две ошибки подряд -> подставляется best узла (кнопка «Не знаю»).
// Проверяем на старте S11: best обязан вести в order, а не в bye (исторический баг).
{
  const m = {};
  const e1 = step(s11, 'ready', 'xx', m), e2 = step(s11, 'ready', 'yy', m);
  const best = s11.nodes['ready'].best;
  const b = step(s11, 'ready', best, m);
  T('S11 две ошибки в ready -> huh', /huh/.test(e1.err || '') && /huh/.test(e2.err || ''), e1.err || e2.err);
  T('S11 подстановка best -> menu -> order (не bye)', !b.err && b.br === 'menu' && b.next === 'order',
    b.err || (b.br + ' -> ' + b.next));
}
r = run(s11, ['Not yet. Could I see the menu, please?', 'I will have the soup and some bread.',
  'Just water, please.', 'No, thank you. That is all.', 'Thank you very much.',
  'Thank you, it looks delicious.']);
T('S11 путь после подстановки best: до конца', r.ok, r.err);

// ---------- партии 5-6: живые пути s13-s18 (эталон + кейсы второй рецензии) ----------
const s13 = SCENES.s13, s14 = SCENES.s14, s15 = SCENES.s15,
      s16 = SCENES.s16, s17 = SCENES.s17, s18 = SCENES.s18;
// s13 Показать квартиру: разные тона первого хода ведут в продолжение
for (const first of ['Yes, it is a small flat.', 'I love it!', 'It is big.',
                     'No, not really.', 'I do not know.', 'It is cozy.']) {
  r = run(s13, [first, 'The kitchen is next to the door.', 'It is upstairs.',
    'Yes, there is a small balcony.', 'Yes, everything else is fine.',
    'Thank you, I will.', 'You too, good night!']);
  T(`S13 ход «${first}»: путь до конца`, r.ok, r.err);
}
// s14 Что-то сломалось: любой неисправный свет ведёт через since
for (const first of ['The light does not work.', 'The light is broken.',
                     'The light is not working.', 'The light in the kitchen does not work.',
                     'Nothing works.', 'There is no water.']) {
  r = run(s14, ['Hello. ' + first, 'Since yesterday evening.', 'Thank you very much.',
    'Yes, everything else is fine.', 'Thank you, I will.', 'You too, good night!']);
  T(`S14 «${first}»: путь через since до конца`, r.ok && r.log.some(l => l.at === 'since'), r.err || r.log.map(l => l.at + '>' + l.br).join(' '));
}
{ const s = step(s14, 'call', 'The light works', {});
  T('S14 «the light works» -> переспрос, не поломка', !s.err && s.br === 'poslight', s.err || s.br); }
{ const s = step(s14, 'call', 'no light', {}); const t = step(s14, 'call', 'light', {});
  T('S14 «no light» != «light» (переспрос голого light)', s.br !== t.br, s.br + ' vs ' + t.br); }
// s15 Найти банк: кафе и банк ведут разными путями, оба до конца
r = run(s15, ['Is there a cafe near here?', 'Left or right?', 'Thank you, that is very helpful.']);
T('S15 кафе: путь до конца', r.ok, r.err);
r = run(s15, ['Excuse me, where is the bank?', 'Is it far from here?',
  'Thank you very much.', 'Is there a cafe near here?', 'Left or right?', 'Thank you, that is very helpful.']);
T('S15 банк: путь до конца', r.ok, r.err);
r = run(s15, ['Where can I find a shop?', 'Is it far from here?', 'Thank you very much.',
  'No, that is all, thank you. Goodbye!']);
T('S15 «другое место» не обрывает (other -> far)', r.ok && r.log[0].br === 'other', r.err || r.log.map(l => l.br).join(' '));
// s16 Купить билет: типы билетов + отрицания (вторая рецензия)
for (const first of ['To the centre, please.', 'To the airport, please.']) {
  r = run(s16, [first, 'Return, please.', 'Thank you. What time does the train leave?',
    'Thank you very much. Goodbye!']);
  T(`S16 «${first}» -> return: путь до конца`, r.ok, r.err);
}
r = run(s16, ['To the centre, please.', 'Single, please.', 'Thank you. What time does the train leave?',
  'Thank you very much. Goodbye!']);
T('S16 single: путь до конца', r.ok, r.err);
{ const s = step(s16, 'sr', 'No single', {});
  T('S16 «no single» -> ret', !s.err && s.br === 'ret', s.err || s.br); }
{ const s = step(s16, 'sr', 'No return', {});
  T('S16 «no return» -> sing', !s.err && s.br === 'sing', s.err || s.br); }
{ const s = step(s16, 'sr', 'No', {});
  T('S16 голое «no» -> уточнение (clar)', !s.err && s.br === 'clar' && /single or return/i.test(s.them), s.err || (s.br + ' / ' + s.them)); }
// s17 Объяснить дорогу: пять минут принимаются, «ten minutes» переспрашивается
r = run(s17, ['Go straight, then turn right.', 'About five minutes on foot.',
  'You are welcome.', 'Is there a cafe near here?', 'Thank you very much.']);
T('S17 полный путь: до конца', r.ok, r.err);
{ const s = step(s17, 'walk', 'Five minutes', {});
  T('S17 «five minutes» -> ok5', !s.err && s.br === 'ok5', s.err || s.br); }
{ const s = step(s17, 'walk', 'Ten minutes', {});
  T('S17 «ten minutes» -> other5 (переспрос числа)', !s.err && s.br === 'other5', s.err || s.br); }
// s18 Рассказать о работе: hard и difficult в одной ветке
r = run(s18, ['I work in a small company.', 'Yes, but there is a lot of work.',
  'And what about you?', 'Would you like something to drink?', 'Nice to meet you. Goodbye!']);
T('S18 полный путь: до конца', r.ok, r.err);
{ const a = step(s18, 'like', 'It is hard', {}); const b = step(s18, 'like', 'It is difficult', {});
  T('S18 «hard» == «difficult» (ветка no)', !a.err && !b.err && a.br === b.br && a.br === 'no', (a.err || a.br) + ' vs ' + (b.err || b.br)); }
{ const s = step(s18, 'like', 'Yes but there is a lot of work', {});
  T('S18 «lot of work» -> yes (не busy)', !s.err && s.br === 'yes', s.err || s.br); }
// ---------- партия 7: живые пути s19 «На языковых курсах» ----------
const s19 = SCENES.s19;
// эталонный путь: два года → сложно говорить → спасибо → когда начало → жду звонка → прощание
r = run(s19, ['For two years.', 'Speaking is difficult for me.', 'Good, thank you.',
  'When does the course start?', 'Thank you, I will wait for your call.', 'Thank you. Have a good day.']);
T('S19 полный путь: до конца', r.ok, r.err);
// «только начал» — ветка new, а не dur
{ const s = step(s19, 'dur', 'I just started, today is my first day', {});
  T('S19 «только начал» -> ветка new', !s.err && s.br === 'new', s.err || s.br); }
// цифры засчитываются как срок: «5 months»
{ const s = step(s19, 'dur', 'About 5 months', {});
  T('S19 «5 months» -> ветка dur', !s.err && s.br === 'dur', s.err || s.br); }
// «not long» — это недавно (ветка new), а не «долго»
{ const s = step(s19, 'dur', 'Not long, only a few days', {});
  T('S19 «not long» -> ветка new (отрицание)', !s.err && s.br === 'new', s.err || s.br); }
// вежливое «no problem» не должно ломать узел ожидания
{ const s = step(s19, 'wait', 'Ok, no problem', {});
  T('S19 «no problem» принимается на узле ожидания', !s.err && s.br === 'ok', s.err || s.br); }
// вопрос про цену — отдельная ветка
{ const s = step(s19, 'ask', 'How much does it cost?', {});
  T('S19 вопрос про цену -> ветка cost', !s.err && s.br === 'cost', s.err || s.br); }
// вопрос про группу — отдельная ветка
{ const s = step(s19, 'ask', 'Which group will I be in?', {});
  T('S19 вопрос про группу -> ветка group', !s.err && s.br === 'group', s.err || s.br); }
// «вопросов нет» — короткий путь сразу к прощанию (настоящее ветвление)
{ const s = step(s19, 'ask', 'No, that is all', {});
  T('S19 «вопросов нет» -> ветка none (короткий путь)', !s.err && s.br === 'none' && s.next === 'bye', s.err || s.br); }
r = run(s19, ['About a year.', 'Grammar, I think.', 'Sounds good, thanks.', 'No questions.', 'Thank you. Bye!']);
T('S19 короткий путь: без вопроса и без ожидания', r.ok, r.err);
// «мне всё даётся легко» — ветка none
{ const s = step(s19, 'hard', 'Nothing, everything is easy', {});
  T('S19 «всё легко» -> ветка none', !s.err && s.br === 'none', s.err || s.br); }

// «Не знаю»-механика для новых сцен: best каждого узла обязан проходить (кнопка «Дальше»)
for (const [id, sc] of Object.entries(SCENES)) {
  if (!['s13','s14','s15','s16','s17','s18','s19'].includes(id)) continue;
  const mem = {}; let at = sc.start, ended = false;
  for (let k = 0; k < 300; k++) {
    const n = sc.nodes[at];
    const r2 = step(sc, at, n.best, mem);
    if (r2.err) break;
    if (r2.next === null || r2.next === undefined) { ended = true; break; }
    at = r2.next;
  }
  T(`${id} «Не знаю»-проход (best каждого узла) до конца`, ended);
}

// ---------- итог ----------
console.log(`\nИТОГ: ${pass} pass, ${fail} fail\n`);
if (fails.length) { console.log('ПРОВАЛЫ:'); fails.forEach(f => console.log(' ✗ ' + f)); process.exitCode = 1; }

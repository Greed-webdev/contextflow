// Тест-харнесс демо-5.html: вырезает ядро (SCENES) из живого html, гоняет
// структурные проверки + пути диалогов + кейсы из сцена-1-живая-логика.json.
// Запуск: node демо-5-тест.js
const fs = require('fs');
const html = fs.readFileSync('/home/user/демо-5.html', 'utf8');
const m0 = html.indexOf('/* ================= ЯДРО');
const m1 = html.indexOf('/* ================= UI ================= */');
if (m0 < 0 || m1 < 0) { console.error('маркеры ядра не найдены'); process.exit(1); }
const core = html.slice(m0, m1) + '\nmodule.exports={SCENES, norm, expand};';
fs.writeFileSync('/tmp/d5-core.js', core);
const { SCENES, norm, expand } = require('/tmp/d5-core.js');
const SPEC = JSON.parse(fs.readFileSync('/home/user/сцена-1-живая-логика.json', 'utf8'));

let pass = 0, fail = 0;
const fails = [];
function T(name, ok, detail) {
  if (ok) pass++; else { fail++; fails.push(`${name}${detail ? ' — ' + detail : ''}`); }
}
const fmt = (s, mem) => (s || '').replace(/\{name\}/g, (mem && mem.name) || '…');

// ---------- симулятор ----------
function step(scene, at, said, mem) {
  const n = scene.nodes[at];
  if (!n) return { err: `нет узла ${at}` };
  mem._digits = said.match(/\d+/g) || [];
  mem._raw = said;
  const w = expand(norm(said));
  const r = n.judge ? n.judge(w, mem) : null;
  if (!r || r.huh) return { err: `huh на «${said}» (узел ${at})` };
  const t = n.tr[r.br];
  if (!t) return { err: `нет ветки "${r.br}" для «${said}» (узел ${at})` };
  return { br: r.br, them: fmt(t.them, mem), ru: fmt(t.ruThem, mem), note: t.note || null, next: t.next };
}
/* Фикс QA-021 (рецензия 2026-09-13): раньше любой «next === null» считался
   успехом, и ранний обрыв (отказ/тупик) маскировался под «путь до конца».
   Теперь для сцен с явным финалом обрыв в узле не из белого списка = ошибка. */
const FINALS = {
  'Первое приветствие': ['bye', 'byehome', 'lift', 'wait'],
  'Заполнить анкету':   ['thx'],
  'Разговор о семье':    ['plan', 'fr'],
};
function finalsOf(scene) {
  for (const [k, v] of Object.entries(FINALS)) if (scene.title && scene.title.startsWith(k)) return v;
  return null;
}
function run(scene, phrases, mem) {
  mem = mem || {};
  let at = scene.start;
  const log = [];
  const finals = finalsOf(scene);
  for (const ph of phrases) {
    const s = step(scene, at, ph, mem);
    if (s.err) return { ok: false, log, err: s.err, at };
    log.push({ at, ph, br: s.br, them: s.them, note: s.note });
    if (s.next === null || s.next === undefined) {
      if (finals && !finals.includes(at)) return { ok: false, log, err: `ранний END в узле «${at}» на «${ph}»`, at };
      return { ok: true, end: at, log, mem };
    }
    if (!scene.nodes[s.next]) return { ok: false, log, err: `next «${s.next}» не существует (из ${at})` };
    at = s.next;
  }
  return { ok: false, log, err: `фразы кончились на узле ${at}`, at };
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
r = run(s1, ['Me name Anna.', 'Yes, I am here for the meeting.', 'Okay, thank you.', 'Room 204, second floor?', 'Thanks a lot. Goodbye!']);
T('S1 ошибка новичка: путь до конца', r.ok, r.err);
T('S1 ошибка: назвал по имени и спросил про встречу', r.ok && r.log[0].them.includes('Anna') && /are you here for the meeting/i.test(r.log[0].them), r.log[0] && r.log[0].them);
// без имени (только привет) -> спросит имя -> потом цель
r = run(s1, ['Hello!', 'My name is Anna.', 'Yes, I am here for the meeting.', 'Okay, thank you.', 'Room 204, second floor?', 'Thanks a lot. Goodbye!']);
T('S1 «Hello!» без имени: путь до конца', r.ok, r.err);
T('S1 «Hello!»: спрашивает имя', r.ok && /what is your name/i.test(r.log[0].them), r.log[0] && r.log[0].them);
// сказал про встречу, но без имени -> спросит имя -> сразу кабинет
r = run(s1, ['I have a meeting.', 'My name is Anna.', 'Room 204, second floor?', 'Thanks, goodbye!']);
T('S1 встреча без имени: путь до конца', r.ok, r.err);
T('S1 встреча без имени: спросил имя', r.ok && /what is your name/i.test(r.log[0].them), r.log[0] && r.log[0].them);
// «жду друга» на входе -> присядьте
r = run(s1, ['I am waiting for a friend.', 'Thank you very much.', 'Goodbye!']);
T('S1 «жду друга» на входе: путь до конца', r.ok, r.err);
T('S1 «жду друга»: НЕ про кабинет/имя', r.ok && !r.log[0].them.includes('204') && !/name/i.test(r.log[0].them), r.log[0] && r.log[0].them);
// имя без цели -> спросит про встречу; «иду домой» -> провожают (старый баг не вернулся)
r = run(s1, ['Hi, my name is Anna.', 'Sorry, I am going home.', 'Bye, have a nice day!']);
T('S1 имя->«иду домой»: путь до конца', r.ok, r.err);
T('S1 «иду домой»: НЕ «take a seat»', r.ok && !r.log[1].them.toLowerCase().includes('seat'), r.log[1] && r.log[1].them);
T('S1 «иду домой»: «take care»', r.ok && /take care/i.test(r.log[1].them), r.log[1] && r.log[1].them);
// «No» на вопросе про встречу -> уточнение «чем помочь?» -> помощь/просто зашёл
r = run(s1, ['Hi, my name is Anna.', 'No.', 'I need some help, please.', 'Thank you.', 'Goodbye!']);
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
r = run(s1, ['Hi, my name is Anna.', 'Sorry?', 'I need some help, please.', 'Thank you.', 'Goodbye!']);
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
{ const s=step(s1,'wait','no',{}); T('QA4-5 wait «no» -> отказ, диалог продолжается (рецензия 002)', !s.err&&s.br==='refuse'&&s.next==='bye', s.err||s.br); }
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

// ---------- итог ----------
console.log(`\nИТОГ: ${pass} pass, ${fail} fail\n`);
if (fails.length) { console.log('ПРОВАЛЫ:'); fails.forEach(f => console.log(' ✗ ' + f)); process.exitCode = 1; }

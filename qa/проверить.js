// Автопроверка демо-диалогов (по методичке КАК-ПРОВЕРЯТЬ.md).
// Запуск: node qa/проверить.js демо-N.html
// Код возврата: 0 — чисто, 1 — есть провалы, 2 — файл не разобрался.
// Ничего не чинит — только показывает, что сломано. Отчёт читать осознанно.
const fs = require('fs');
const path = process.argv[2];
if (!path) { console.error('Укажи файл: node qa/проверить.js демо-N.html'); process.exit(2); }
const html = fs.readFileSync(path, 'utf8');

const m0 = html.indexOf('/* ================= ЯДРО');
const m1 = html.indexOf('/* ================= UI ================= */');
if (m0 < 0 || m1 < 0) { console.error('маркеры ядра не найдены'); process.exit(2); }
const core = html.slice(m0, m1) + '\nmodule.exports={SCENES, norm, expand};';
const tmp = '/tmp/prov-core.js';
fs.writeFileSync(tmp, core);
let SCENES, norm, expand;
try { ({ SCENES, norm, expand } = require(tmp)); }
catch (e) { console.error('ядро не собралось:', e.message); process.exit(2); }

// ---------- слова-исключения для проверки отрицания ----------
const СЛУЖЕБНЫЕ = new Set(['what','when','why','how','who','where','which','sorry','pardon',
  'please','know','understand','help','need','want','think','say','tell','repeat','again',
  'question','questions','everything','anything','excuse','sure','maybe','perhaps','would',
  'should','could','can','will','am','is','are','be','do','does','did','have','has','not','no',
  'ok','okay','all','nothing','thanks','thank','fine','really','actually']);

// ---------- мусор: 18 злых строк ----------
const МУСОР = ['banana','asdfgh','fuck','!!!','lorem ipsum','zzzz','проверка','12345',
  '$$$','qwerty','blah','hmm','whatever','test','xyz','абракадабра','ёпрст','###'];

let pass = 0, fail = 0;
const fails = [];
function T(name, ok, detail) {
  if (ok) pass++; else { fail++; fails.push(name + (detail ? ' — ' + detail : '')); }
}

function judgeNode(sc, at, said, mem) {
  const n = sc.nodes[at];
  mem._digits = said.match(/\d+/g) || [];
  const w = expand(norm(said));
  const r = n.judge ? n.judge(w, mem) : null;
  return { r, w, n, at };
}
const okBranch = res => res && res.r && !res.r.huh && res.n.tr[res.r.br];
const fmt = s => (s || '').replace(/\{name\}/g, 'N').replace(/\{day\}/g, 'D');

for (const [id, sc] of Object.entries(SCENES)) {
  const name = sc.title || id;
  // ---------- СТРУКТУРА ----------
  const starts = Object.keys(sc.nodes).filter(k => !Object.values(sc.nodes).some(n =>
    Object.values(n.tr || {}).some(t => t.next === k)));
  T(`[${name}] ровно один стартовый узел`, starts.length === 1 && sc.nodes[starts[0]] != null,
    'стартовые: ' + starts.join(','));
  const startNode = starts.length ? starts[0] : null;
  const missingNext = [];
  for (const [k, n] of Object.entries(sc.nodes))
    for (const [br, t] of Object.entries(n.tr || {}))
      if (t.next !== null && t.next !== undefined && !sc.nodes[t.next]) missingNext.push(`${k}.${br}->${t.next}`);
  T(`[${name}] все next существуют`, !missingNext.length, missingNext.join(','));
  // достижимость из старта
  if (startNode) {
    const seen = new Set([startNode]); const q = [startNode];
    while (q.length) {
      const u = q.shift();
      for (const t of Object.values(sc.nodes[u].tr || {}))
        if (t.next && !seen.has(t.next)) { seen.add(t.next); q.push(t.next); }
    }
    const unreach = Object.keys(sc.nodes).filter(k => !seen.has(k));
    T(`[${name}] все узлы достижимы из старта`, !unreach.length, 'недостижимы: ' + unreach.join(','));
  }

  for (const [at, n] of Object.entries(sc.nodes)) {
    const ctx = `[${name}.${at}]`;
    // ---------- BEST ----------
    const b = judgeNode(sc, at, n.best, {});
    if (!okBranch(b)) T(`${ctx} best проходит`, false, 'best «' + n.best + '» не принят своим judge');
    // ---------- МУСОР ----------
    const junkHit = [];
    for (const m of МУСОР) {
      const r = judgeNode(sc, at, m, {});
      if (okBranch(r)) junkHit.push(m);
    }
    T(`${ctx} мусор даёт huh`, !junkHit.length, 'принято: ' + junkHit.slice(0, 6).join(', '));
  }

  // ---------- ОТРИЦАНИЕ: слова берём из кода судей ----------
  const judgeSrc = Object.values(sc.nodes).map(n => n.judge ? String(n.judge) : '').join('\n');
  const words = new Set();
  for (const m of judgeSrc.matchAll(/(?:chose|has)\(w,\s*'([a-z]+)'/g)) {
    const wd = m[1];
    if (wd.length > 1 && !СЛУЖЕБНЫЕ.has(wd)) words.add(wd);
  }
  for (const at of Object.keys(sc.nodes)) {
    const plain = judgeNode(sc, at, 'X', {});
    const base = judgeNode(sc, at, 'X', {});
    // для каждого слова: ветка от «X» vs ветка от «no X»
    for (const wd of words) {
      const a = judgeNode(sc, at, wd, {});
      const b = judgeNode(sc, at, 'no ' + wd, {});
      if (okBranch(a) && okBranch(b) && a.r.br === b.r.br && a.r.br !== 'none') {
        // «no X» и «X» ведут в одну ветку — прочитай реплику вслух
        const them = fmt(sc.nodes[at].tr[a.r.br].them || '');
        T(`[${name}.${at}] «no ${wd}» != «${wd}»`, false, `обе -> ${a.r.br}: «${them.slice(0, 60)}»`);
      }
    }
    void plain; void base;
  }

  // ---------- ИМЯ ----------
  for (const [at, n] of Object.entries(sc.nodes)) {
    if (!String(n.judge || '').includes('pickName')) continue;
    const ctx = `[${name}.${at}]`;
    const junkName = [];
    for (const m of ['banana', 'asdfgh', 'fuck', 'lorem', 'zzzz']) {
      const mem = {}; const r = judgeNode(sc, at, m, mem);
      if (mem.name) junkName.push(m + '→' + mem.name);
    }
    T(`${ctx} мусор не становится именем`, !junkName.length, junkName.join(', '));
    const goodNames = [];
    for (const nm of ['Masha', 'Ekaterina', 'Nadezhda', 'Vyacheslav', 'Artyom', 'Anna', 'Hope', 'Will', 'May', 'Grace']) {
      const mem = {}; const r = judgeNode(sc, at, nm, mem);
      if (r.r && !r.r.huh && mem.name) goodNames.push(nm + '→' + mem.name);
    }
    T(`${ctx} живые имена распознаются`, goodNames.length >= 8, 'ok: ' + goodNames.join(', ') + ' (из 10)');
  }

  // ---------- ПЕТЛЯ ----------
  for (const [at, n] of Object.entries(sc.nodes)) {
    const loops = Object.entries(n.tr || {}).filter(([, t]) => t.next === at);
    if (loops.length) {
      const outs = new Set(Object.values(n.tr || {}).map(t => t.next).filter(x => x !== null && x !== undefined && x !== at));
      T(`[${name}.${at}] петля имеет другой выход`, outs.size > 0,
        'ветки в себя: ' + loops.map(([br]) => br).join(',') + ' | других выходов нет');
    }
  }

  // ---------- ПОДСТАНОВКА ----------
  for (const [at, n] of Object.entries(sc.nodes)) {
    for (const [br, t] of Object.entries(n.tr || {})) {
      if (!t.them) continue;
      const ph = t.them;
      if (ph.includes('{name}')) {
        const mem = {}; judgeNode(sc, at, n.best, mem);
        T(`[${name}.${at}.${br}] {name} заполняется`, !!mem.name, 'в реплике {name}, а mem.name пуст');
      }
      if (ph.includes('{day}')) {
        const mem = {}; judgeNode(sc, at, n.best, mem);
        T(`[${name}.${at}.${br}] {day} заполняется`, !!mem.day, 'в реплике {day}, а mem.day пуст');
      }
    }
  }

  // ---------- ЭТАЛОН: проход best подряд до конца ----------
  if (startNode) {
    let at = startNode, steps = 0, broken = null;
    const seen = new Set();
    while (steps < 200) {
      if (!sc.nodes[at]) { broken = `нет узла ${at}`; break; }
      if (seen.has(at)) { broken = `петля на ${at}`; break; }
      seen.add(at);
      const r = judgeNode(sc, at, sc.nodes[at].best, {});
      if (!okBranch(r)) { broken = `best на ${at} не принят`; break; }
      const t = sc.nodes[at].tr[r.r.br];
      if (t.next === null || t.next === undefined) break;
      at = t.next; steps++;
    }
    T(`[${name}] эталон: проход best до конца`, broken === null && steps < 200,
      broken || `за ${steps} шагов не кончился`);
  }
}

console.log(`\nИТОГ: ${pass} pass, ${fail} fail  (${path})\n`);
if (fails.length) {
  console.log('ПРОВАЛЫ:');
  fails.forEach(f => console.log(' ✗ ' + f));
  process.exit(1);
}
process.exit(0);

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
  'should','could','can','will','am','is','are','be','do','does','did','have','has','not','no','never',
  'ok','okay','all','nothing','none','thanks','thank','fine','really','actually','just']);

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
  for (const m of judgeSrc.matchAll(/'([a-z]{2,})'/g)) {
    const wd = m[1];
    if (!СЛУЖЕБНЫЕ.has(wd)) words.add(wd);
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

// ---------- ПАРТИИ 3-4: точечные проверки по рецензии ----------
// Работают только если нужные узлы есть в файле (для других демо молча пропускаются).
const br = (res) => (res && res.r && !res.r.huh) ? res.r.br : null;
const сцена = (node) => { const h = Object.entries(SCENES).filter(([, sc]) => sc.nodes[node]); return h.length === 1 ? h[0][1] : null; };
{
  const sc = сцена('cold');
  if (sc) {
    T('[погода.cold] «I do not know» не спорит', br(judgeNode(sc, 'cold', 'I do not know', {})) !== 'dis');
    T('[погода.cold] «I do not know» понимается', !!br(judgeNode(sc, 'cold', 'I do not know', {})));
    T('[погода.cold] «I am not sure» понимается', !!br(judgeNode(sc, 'cold', 'I am not sure.', {})));
    T('[погода.cold] «it is ok» понимается', !!br(judgeNode(sc, 'cold', 'it is ok', {})));
    T('[погода.cold] «No, it is warm.» -> dis', br(judgeNode(sc, 'cold', 'No, it is warm.', {})) === 'dis');
    T('[погода.cold] «Yes, very cold» -> agree', br(judgeNode(sc, 'cold', 'Yes, very cold.', {})) === 'agree');
  }
}
{
  const sc = сцена('quest');
  if (sc) {
    const has = k => !!sc.nodes['quest'].tr[k];
    if (has('yes')) T('[врач.quest] «yes I have a question» -> yes', br(judgeNode(sc, 'quest', 'yes I have a question', {})) === 'yes');
    if (has('no'))  T('[врач.quest] «no questions» -> no', br(judgeNode(sc, 'quest', 'no questions', {})) === 'no');
    if (sc.nodes['qask']) {
      T('[врач.qask] «when should I come again» понимается', !!br(judgeNode(sc, 'qask', 'When should I come again?', {})));
      T('[врач.qask] «no questions» -> no', br(judgeNode(sc, 'qask', 'no questions', {})) === 'no');
    }
  }
}
{
  const sc = сцена('try');
  if (sc) {
    for (const at of ['try', 'try2', 'last']) {
      if (!sc.nodes[at]) continue;
      T(`[магазин.${at}] «I will not take it» != take`, br(judgeNode(sc, at, 'I will not take it', {})) !== 'take');
      T(`[магазин.${at}] «I do not want to take it» != take`, br(judgeNode(sc, at, 'I do not want to take it', {})) !== 'take');
      T(`[магазин.${at}] «I will not buy it» != take`, br(judgeNode(sc, at, 'I will not buy it', {})) !== 'take');
      T(`[магазин.${at}] «I will take it» -> take`, br(judgeNode(sc, at, 'I will take it.', {})) === 'take');
    }
    T('[магазин.try] «No, I will take it!» -> take', br(judgeNode(sc, 'try', 'No, I will take it!', {})) === 'take');
    T('[магазин.try] «too small» -> bad', br(judgeNode(sc, 'try', 'It is too small.', {})) === 'bad');
    if (sc.nodes['ask']) {
      T('[магазин.ask] «I am not browsing» != browse', br(judgeNode(sc, 'ask', 'I am not browsing', {})) !== 'browse');
      T('[магазин.ask] «No, just looking» -> browse', br(judgeNode(sc, 'ask', 'No, just looking.', {})) === 'browse');
      T('[магазин.ask] «No, nothing.» -> browse', br(judgeNode(sc, 'ask', 'No, nothing.', {})) === 'browse');
    }
  }
}
{
  const sc = сцена('order');
  if (sc) {
    T('[обед.order] «cat dog fish» -> huh', br(judgeNode(sc, 'order', 'cat dog fish', {})) === null);
    T('[обед.order] «pizza» -> huh', br(judgeNode(sc, 'order', 'pizza', {})) === null);
    T('[обед.order] «banana» -> huh', br(judgeNode(sc, 'order', 'a banana, please', {})) === null);
    T('[обед.order] «soup and bread» принято', !!br(judgeNode(sc, 'order', 'soup and bread', {})));
    T('[обед.order] «soup and salad» принято', !!br(judgeNode(sc, 'order', 'soup and salad', {})));
    if (sc.nodes['ready']) {
      T('[обед.ready] «I have no time» != wait', br(judgeNode(sc, 'ready', 'I have no time', {})) !== 'wait');
      T('[обед.ready] «no time» != wait', br(judgeNode(sc, 'ready', 'no time', {})) !== 'wait');
      T('[обед.ready] «I can not wait» != wait', br(judgeNode(sc, 'ready', 'I can not wait', {})) !== 'wait');
      T('[обед.ready] «one moment please» -> wait', br(judgeNode(sc, 'ready', 'one moment please', {})) === 'wait');
      T('[обед.ready] «Not yet» -> wait', br(judgeNode(sc, 'ready', 'Not yet, thanks.', {})) === 'wait');
    }
  }
}

console.log(`\nИТОГ: ${pass} pass, ${fail} fail  (${path})\n`);
if (fails.length) {
  console.log('ПРОВАЛЫ:');
  fails.forEach(f => console.log(' ✗ ' + f));
  process.exit(1);
}
process.exit(0);

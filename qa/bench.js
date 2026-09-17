// Бенчмарк «мозга» (judge в js/app.js) на всех диалогах A1:
// 1) эталонная фраза каждого хода игрока ОБЯЗАНА проходить (регрессия);
// 2) живые вариации смысла (синонимы, перестановки, вежливые вставки,
//    представление «i am / call me», этикет-варианты, вопросы с it/there)
//    — мерим, сколько мозг принимает.
// Запуск: node qa/bench.js [этап=1]
const fs = require('fs');
const app = fs.readFileSync(__dirname + '/../js/app.js', 'utf8');
const m = app.indexOf('const judge = (said, best)=>{');
let i = app.indexOf('{', m), depth = 0;
for (; i < app.length; i++) { const c = app[i]; if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) { i++; break; } } }
const body = app.slice(m, i).replace('const judge = (said, best)=>{', 'const judge = function(said,best){');
fs.writeFileSync('/tmp/judgefn.js', body + '\nmodule.exports=judge;\n');
const J = require('/tmp/judgefn.js');

const raw = fs.readFileSync(__dirname + '/../js/lessons.js', 'utf8');
const enStart = raw.indexOf('\n  en:{');
const enObj = raw.slice(enStart, raw.indexOf('\n};', enStart));
const stage = Number(process.argv[2] || 1);
const stRe = new RegExp('^\\s{4}' + stage + ':\\[', 'm');
const stM = stRe.exec(enObj);
const stEnd = enObj.indexOf('\n  ' + (stage + 1) + ':[', stM.index);
const chunk = enObj.slice(stM.index, stEnd > stM.index ? stEnd : enObj.length);

// все диалоги этапа: режем по уровням ("      { type:'...") и берём dialog
const dialogs = [];
const units = chunk.split("\n      { type:'");
for (const u of units) {
  if (!u.startsWith('dialog')) continue;
  const titleM = /title:'((?:[^'\\\\]|\\\\.)*)'/.exec(u);
  const ti = u.indexOf('turns:[');
  if (!titleM || ti < 0) continue;
  // собираем turns построчно, следя за балансом [ ] и { }
  const lines = u.slice(ti + 7).split('\n');
  const turns = [];
  let cur = null, buf = '', sq = 0, br = 0, started = false;
  const flush = () => {
    if (!cur) return;
    const b = buf;
    const who = /who:'(them|you)'/.exec(b);
    if (!who) { cur = null; buf = ''; return; }
    cur.who = who[1];
    const tx = /text:'((?:[^'\\\\]|\\\\.)*)'/.exec(b); if (tx) cur.text = tx[1];
    const ru = /ru:'((?:[^'\\\\]|\\\\.)*)'/.exec(b); if (ru) cur.ru = ru[1];
    const bs = /best:(\d+)/.exec(b); if (bs) cur.best = +bs[1];
    const oi = b.indexOf('options:[');
    if (oi >= 0) { const tail = b.slice(oi + 9); cur.opts = [...tail.matchAll(/'((?:[^'\\\\]|\\\\.)*)'/g)].map(x => x[1]); }
    turns.push(cur);
    cur = null; buf = '';
  };
  for (const ln of lines) {
    const wm = /who:'(them|you)'/.exec(ln);
    const isTurnStart = wm && buf.trim() === '';
    if (wm) {
      if (cur) { // предыдущий ход мог не закрыться — закроем принудительно
        cur = null; buf = '';
      }
      cur = {};
    }
    if (cur) {
      buf += ln;
      // баланс внутри buf (упрощённо: закрыт, если есть '},' на конце и квадратные скобки сбалансированы)
      const sqOpen = (buf.match(/\[/g) || []).length, sqClose = (buf.match(/\]/g) || []).length;
      if (sqOpen === sqClose && /\},$/.test(buf.trim()) || /\}\]?\},?$/.test(buf.trim()) || /^\s*\},\s*$/.test(buf)) {
        // ждём настоящего конца хода: строка с '},'
        if (/\},$/.test(buf.trim())) flush();
      }
    }
  }
  if (cur) flush();
  dialogs.push({ title: titleM[1], turns });
}

// генератор живых вариаций смысла
function variants(bestPhrase) {
  const ph = bestPhrase.trim();
  const out = new Set([ph]);
  const low = ph.toLowerCase();
  const word = t => t.replace(/[^a-z']/gi, '');
  // синонимичные группы (общие; конкретика добирается из judge-движка)
  const SYN = [
    ['hi', 'hello', 'hey'], ['thanks', 'thank'], ['goodbye', 'bye', 'see you'],
    ['yes', 'yeah', 'sure'], ['very', 'really'], ['want', 'need', 'would like', 'like'],
    ['big', 'large'], ['small', 'little'], ['nice', 'good', 'great'],
    ['happy', 'glad'], ['tired', 'sleepy'], ['begin', 'start'], ['help', 'assist'],
  ];
  const words = ph.replace(/'/g, "'").split(/\s+/).filter(Boolean);
  for (let k = 0; k < words.length; k++) {
    const w = word(words[k]).toLowerCase();
    for (const g of SYN) {
      if (g.includes(w)) {
        for (const rep of g) {
          if (rep === w) continue;
          const v = words.slice(); v[k] = v[k].replace(new RegExp(w, 'i'), m => rep === 'see you' ? rep : rep + (m && m[0] === m[0].toUpperCase() && rep[0] === rep[0].toLowerCase() ? '' : ''));
          if (rep.includes(' ')) { const a = v.slice(0, k).concat(rep.split(' '), v.slice(k + 1)); out.add(a.join(' ')); }
          else out.add(v.join(' '));
        }
      }
    }
  }
  // представление: «i am / call me / голое имя» — только когда эталон про имя
  let nm = null;
  const nmm = /my name is ([a-z]+)/i.exec(ph);
  if (nmm) nm = nmm[1];
  if (nm) { out.add(`i am ${nm}`); out.add(`${nm}`); out.add(`call me ${nm}`); out.add(`name is ${nm}`); }
  // вежливые вставки
  if (!/^(please|sorry|well|actually|yes|no)/i.test(ph) && ph.length > 6)
    ['please ', 'sorry, ', 'well, ', 'actually, '].forEach(p => out.add(p + ph.toLowerCase().replace(/^[a-z]/, c => c)));
  // этикет — только если задание чисто этикетное (иначе «thanks» не замена смыслу «повтори адрес»)
  const ETQ = new Set(['thanks','thank','bye','goodbye','please','see','later','good','day','night','yes','yeah','no','ok','okay','sure','right','welcome','you','have','a','an','the','and','lot','very','much','so','course','all','cheers']);
  const etqOk = ph.toLowerCase().split(/\s+/).every(x => ETQ.has(x.replace(/[^a-z']/g, '')));
  if (etqOk) {
    if (/\bthank/.test(low)) { out.add('thanks a lot'); out.add('thank you very much'); out.add('thanks so much'); }
    if (/\bbye|goodbye/.test(low)) { out.add('see you'); out.add('see you later'); out.add('bye bye'); }
  }
  // вопрос с it/there
  if (low.includes('?')) {
    if (/where is the [a-z ]+/.test(low)) out.add('where is it?');
    if (/when (will|is) the/.test(low)) out.add('when is it?');
    if (/what is the [a-z ]+/.test(low)) out.add('what is it?');
  }
  // короткая форма: 2-3 главных слова без служебных
  const STOP = new Set(['a','an','the','is','am','are','to','of','and','my','i','you','it','in','on','at','for','with','please','me','we','they','have','has','can','will','would','do','does','did','be','this','that','but','so','very','really','just','please','thanks','thank']);
  const core = words.filter(x => !STOP.has(word(x).toLowerCase()) && word(x).length > 1);
  if (core.length > 2 && words.length > core.length) { out.add(core.join(' ')); out.add(core.slice(0, 3).join(' ')); }
  return [...out].filter(v => v && v !== ph).slice(0, 24);
}

// прогон
let total = 0, okCnt = 0, badRef = 0, refTotal = 0;
let distTotal = 0, distBad = 0;   // дистракторы: чужие эталоны и мусор — НЕ должны приниматься
const distractorPool = ['dog cat', 'I like pizza', 'close the door', 'blue car fast', 'good night see you tomorrow', 'my name is not important', 'please help me find it'];
const fails = [];
const DISTR = dialogs.flatMap(d => d.turns.filter(t => t.who === 'you' && t.opts && t.opts[t.best] !== undefined).map(t => t.opts[t.best]));
let _di = 0;
for (const d of dialogs) {
  for (let k = 0; k < d.turns.length; k++) {
    const t = d.turns[k];
    if (t.who !== 'you' || t.best === undefined || !t.opts || !t.opts[t.best]) continue;
    const best = t.opts[t.best];
    refTotal++;
    if (!J(best, best).ok) { badRef++; fails.push({ d: d.title, task: t.ru, best, why: 'ЭТАЛОН НЕ ПРОШЁЛ' }); continue; }
    for (const v of variants(best)) {
      total++;
      const r = J(v, best);
      if (r.ok) okCnt++;
      else if (fails.length < 60) fails.push({ d: d.title, task: t.ru, best, v, why: (r.notes || []).slice(0, 2).join(' | ') });
    }
    // дистрактор: эталон чужого хода (другого диалога) и мусор — обязаны НЕ пройти
    for (const dd of distractorPool) { distTotal++; if (J(dd, best).ok) distBad++; }
    for (let n = 0; n < 2; n++) { distTotal++; const o = DISTR[(_di = (_di + 37) % DISTR.length)]; if (o && o !== best && J(o, best).ok) distBad++; }
  }
}
const pct = total ? (100 * okCnt / total).toFixed(0) : 0;
const dpct = distTotal ? (100 * distBad / distTotal).toFixed(1) : 0;
console.log(`Этап ${stage}: диалогов ${dialogs.length}, ходов игрока ${refTotal}`);
console.log(`Эталон: ${refTotal - badRef}/${refTotal} проходят`);
console.log(`Живые вариации: ${okCnt}/${total} (${pct}%) приняты`);
console.log(`Дистракторы (чужие фразы/мусор): ${distBad}/${distTotal} (${dpct}%) ошибочно приняты — цель < 5%`);
console.log('\nПровалы (до 60):');
fails.slice(0, 40).forEach(f => console.log(`  ✗ [${f.d}] «${f.task}»\n      эталон: ${f.best}\n      сказал: ${f.v}\n      мозг: ${f.why}`));

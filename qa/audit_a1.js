// Аудит контента A1: все 267 уровней этапа 1 (words/build/dialog).
// Проверяет структуру, целостность, проходимость, подозрительные места.
// Запуск: node qa/audit_a1.js
const fs = require('fs');
const raw = fs.readFileSync(__dirname + '/../js/lessons.js', 'utf8');
const enStart = raw.indexOf('\n  en:{');
const enObj = raw.slice(enStart, raw.indexOf('\n};', enStart));
const stM = /^\s{4}1:\[/m.exec(enObj);
const stEnd = enObj.indexOf('\n  2:[', stM.index);
const chunk = enObj.slice(stM.index, stEnd > stM.index ? stEnd : enObj.length);

const issues = [];
const add = (kind, level, msg) => issues.push({ kind, level, msg });

// делим на уровни: "      { type:'..."
const units = chunk.split("\n      { type:'").slice(1);
let wordsN = 0, buildN = 0, dialogN = 0, titles = new Set(), dupTitles = [];
const scenesSet = new Set();
{
  const scM = [...raw.matchAll(/scene:\s*'([a-z0-9]+)'/g)].map(m => m[1]);
  scM.forEach(s => scenesSet.add(s));
}

for (const u of units) {
  const type = u.slice(0, u.indexOf("',"));
  const titleM = /title:'((?:[^'\\]|\\.)*)'/.exec(u);
  const title = titleM ? titleM[1] : '(без названия)';
  if (titles.has(title)) dupTitles.push(title); titles.add(title);
  const sceneM = /scene:'([a-z0-9]+)'/.exec(u);

  if (type === 'words') {
    wordsN++;
    if (!sceneM) add('words', title, 'нет scene');
    else if (!scenesSet.has(sceneM[1])) add('words', title, 'scene "' + sceneM[1] + '" не существует');
    const wm = [...u.matchAll(/^\s*\{t:'((?:[^'\\]|\\.)*)',\s*r:'((?:[^'\\]|\\.)*)'/gm)];
    const ws = [...u.matchAll(/\{t:'((?:[^'\\]|\\.)*)'/g)].map(x => x[1]);
    if (!ws.length) add('words', title, 'нет слов');
    const seen = new Set();
    for (const w of ws) { const k = w.toLowerCase(); if (seen.has(k)) add('words', title, 'дубль слова: ' + w); seen.add(k); }
    const nm = /newCount:(\d+)/.exec(u);
    if (nm && +nm[1] !== ws.length) add('words', title, `newCount ${nm[1]} != слов ${ws.length}`);
  }
  else if (type === 'build') {
    buildN++;
    const tm = [...u.matchAll(/^\s*\{ru:'((?:[^'\\]|\\.)*)'[\s\S]*?parts:\[([^\]]*)\][\s\S]*?answer:'((?:[^'\\]|\\.)*)'[\s\S]*?full:'((?:[^'\\]|\\.)*)'/gm)];
    if (!tm.length) { add('build', title, 'нет задач tasks'); continue; }
    for (const t of tm) {
      const ru = t[1], partsRaw = t[2], ans = t[3], full = t[4];
      const parts = [...partsRaw.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(x => x[1]);
      const ansWords = ans.split(' ');
      if (parts.join(' ') !== ans) add('build', title, `answer != parts: «${ru}»`);
      if (parts.length < 2) add('build', title, `задача из 1 части: «${ru}»`);
      const fullL = full.toLowerCase();
      if (parts.length && parts.every(p => p.length > 1) && parts.filter(p => !fullL.includes(p.toLowerCase())).length > 1)
        add('build', title, `full не содержит части: «${ru}» (full: ${full})`);
    }
  }
  else if (type === 'dialog') {
    dialogN++;
    if (!sceneM) add('dialog', title, 'нет scene');
    else if (!scenesSet.has(sceneM[1])) add('dialog', title, 'scene "' + sceneM[1] + '" не существует');
    const ti = u.indexOf('turns:[');
    if (ti < 0) { add('dialog', title, 'нет turns'); continue; }
    // разбор ходов
    const body = u.slice(ti);
    const turnStarts = [...body.matchAll(/who:'(them|you)'/g)].map(m => m.index);
    if (!turnStarts.length) { add('dialog', title, 'пустые turns'); continue; }
    const ends = turnStarts.slice(1).concat([body.length]);
    for (let i = 0; i < turnStarts.length; i++) {
      const seg = body.slice(turnStarts[i], ends[i]);
      const who = /who:'(them|you)'/.exec(seg)[1];
      const isLast = i === turnStarts.length - 1;
      if (who === 'them') {
        const tx = /text:'((?:[^'\\]|\\.)*)'/.exec(seg);
        if (!tx || !tx[1].trim()) add('dialog', title, `ход ${i + 1}: them без text`);
      } else {
        const ruM = /ru:'((?:[^'\\]|\\.)*)'/.exec(seg);
        const bsM = /best:(\d+)/.exec(seg);
        const opts = [...seg.matchAll(/options:\[([\s\S]*?)\]/g)];
        const optArr = opts.length ? [...opts[0][1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(x => x[1]) : [];
        if (!ruM || !ruM[1].trim()) add('dialog', title, `ход ${i + 1}: you без задания ru`);
        if (!optArr.length) add('dialog', title, `ход ${i + 1}: you без вариантов`);
        if (bsM && optArr.length && +bsM[1] >= optArr.length) add('dialog', title, `ход ${i + 1}: best ${bsM[1]} вне диапазона (${optArr.length})`);
        // last you-ход без them после — допустимо? в диалогах обычно конец them
      }
    }
    // первый ход диалога должен быть them (реплика собеседника)
    if (!/who:'them'/.test(body.slice(0, 120))) add('dialog', title, 'диалог начинается не с реплики собеседника');
  }
  else add('unknown', title, 'неизвестный type: ' + type);
}

// глобальные проверки текста
const ALL = chunk;
// не-ASCII в английских строках text:'...' и full:'...'
const enBad = [...ALL.matchAll(/(?:text|full):'([^']*[\u0400-\u04FF][^']*)'/g)];
enBad.forEach(m => add('text', '(диалог/задание)', 'кириллица в английской строке: «' + m[1].slice(0, 60) + '»'));
// двойные пробелы
const dbl = [...ALL.matchAll(/(?:text|full|ru):'([^']* {2,}[^']*)'/g)];
dbl.slice(0, 10).forEach(m => add('text', '(строка)', 'двойной пробел: «' + m[1].slice(0, 50) + '»'));

// сводка
console.log('=== Аудит A1 ===');
console.log(`Уровней: words=${wordsN}, build=${buildN}, dialog=${dialogN} | дублей названий: ${dupTitles.length ? dupTitles.join(', ') : 'нет'}`);
console.log(`Проблем найдено: ${issues.length}`);
const byKind = {};
issues.forEach(i => byKind[i.kind] = (byKind[i.kind] || 0) + 1);
console.log('По категориям:', Object.entries(byKind).map(([k, v]) => `${k}:${v}`).join('  '));
console.log('\nПримеры (до 40):');
issues.slice(0, 40).forEach(i => console.log(`  [${i.kind}] ${i.level}: ${i.msg}`));
fs.writeFileSync('/tmp/a1_audit.json', JSON.stringify(issues, null, 1));

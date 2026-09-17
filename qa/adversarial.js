// Враждебный прогон: каждому узлу-судье — фразы, которыми реально говорит новичок.
// Не ломает, а показывает слепые зоны. Запуск: node qa/adversarial.js
const E = require('./engine.js');
const { SCENES, norm, expand } = E;

function judge(node, phrase, mem) {
  mem = mem || {};
  mem._digits = phrase.match(/\d+/g) || [];
  try { return node.judge(expand(norm(phrase)), mem); }
  catch (e) { return { __crash: e.message }; }
}
function looksAcceptable(r) { return r && r.br && !r.huh; }

const probes = [
  // — общие ловушки —
  ['hi', {}], ['hello', {}], ['yes', {}], ['no', {}], ['ok', {}], ['thanks', {}],
  ['goodbye', {}], ['please', {}], ['sorry', {}], ['nothing', {}], ['i am fine', {}],
  ['i am just looking', {}], ['no thanks', {}], ['no thank you', {}],
  ['no problem', {}], ['no worries', {}], ['not really', {}], ['maybe', {}],
  ['what', {}], ['what is your name', {}], ['i do not know', {}], ['help', {}],
  // — имя-ловушки —
  ['call me Anna', {}], ['my name is Anna', {}], ['name is Anna', {}], ['Anna name', {}],
  ['me Anna', {}], ['Anna me', {}], ['i am Anna', {}], ['Anna', {}],
  ['sorry i am late', {}], ['excuse me', {}], ['good afternoon sir', {}],
  ['i am waiting for a friend', {}], ['i am just leaving', {}],
  ['i have a meeting with Anna', {}], ['i am here to see mr brown', {}],
  ['my name is Masha', {}], ['i am Ekaterina', {}], ['Lev', {}],
  // — встреча/отказ —
  ['i have a meeting', {}], ['i am here for the meeting', {}],
  ['no problem, my name is Anna and i have a meeting', {}],
  ['yes, no worries, i have a meeting', {}],
  ['my name is Anna, i am not late i hope, i have a meeting', {}],
  ['i am anna, i do not know the room but i have a meeting', {}],
  ['i am not here for the meeting', {}], ['i do not have a meeting', {}],
  ['no i am going home', {}], ['i am going home', {}], ['just looking around', {}],
  // — да/нет —
  ['of course', {}], ['a little', {}], ['very much', {}], ['sometimes', {}],
  ['every year', {}], ['every weekend', {}], ['last month', {}], ['two weeks', {}],
  ['one month', {}], ['a couple of weeks', {}], ['ten days', {}], ['twice a year', {}],
  ['no not yet', {}], ['no not really', {}], ['i am alone', {}], ['i have no family', {}],
  ['nobody', {}], ['only me', {}], ['we are small', {}],
  // — адрес/цифры —
  ['park street', {}], ['number twelve', {}], ['twelve', {}], ['12', {}], ['999', {}],
  ['i live on park street', {}], ['i live at 12 park street', {}], ['25', {}],
  ['i am twenty five', {}], ['twenty', {}],
];

// какие узлы чем «умеют» (множество допустимых веток — для оценки)
const report = [];
for (const [sid, sc] of Object.entries(SCENES)) {
  for (const [nid, node] of Object.entries(sc.nodes)) {
    if (typeof node.judge !== 'function') continue;
    const branchKeys = Object.keys(node.tr || {});
    const hits = [];
    for (const [phrase] of probes) {
      const r = judge(node, phrase, {});
      if (r && r.__crash) hits.push({ phrase, crash: r.__crash });
    }
    // узкие места: много huh на живых фразах
    let huhCount = 0, accCount = 0;
    for (const [phrase] of probes) {
      const r = judge(node, phrase, {});
      if (r && r.huh) huhCount++; else if (looksAcceptable(r)) accCount++;
    }
    if (huhCount >= 25 || hits.length) {
      report.push({ sid, nid, branchKeys, huhCount, accCount, crashes: hits.slice(0, 3) });
    }
  }
}

console.log('== Узлы с большим числом «не понял» на живых фразах (порог 25 из ' + probes.length + ') ==');
if (!report.length) console.log('  (таких нет)');
for (const r of report) {
  console.log(`  [${r.sid}.${r.nid}] ветки=${JSON.stringify(r.branchKeys)} huh=${r.huhCount} принято=${r.accCount}`);
  for (const c of r.crashes) console.log('    CRASH:', c.phrase, c.crash);
}

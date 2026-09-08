// Орфографический прогон всех английских строк A1 (them.text, options, build.full, words.t).
// Ищет подозрительные слова — кандидатов на вычитку человеком.
// Запуск: node qa/spell_a1.js
const fs = require('fs');
const vm = require('vm');
let src = fs.readFileSync(__dirname + '/../js/lessons.js', 'utf8');
src += '\n;globalThis.__COURSE = COURSE;';
const ctx = { console, globalThis: null }; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx, { timeout: 10000 });
const stage1 = ctx.__COURSE.en[1];

// собрать все английские строки с контекстом
const rows = [];   // {ctx, text}
for (const lv of stage1) {
  if (lv.type === 'words') for (const w of lv.words) rows.push({ ctx: `words:${lv.title}`, text: w.t });
  else if (lv.type === 'build') for (const t of lv.tasks || []) rows.push({ ctx: `build:${lv.title}`, text: t.full });
  else if (lv.type === 'dialog') for (const t of lv.turns || []) {
    if (t.who === 'them') rows.push({ ctx: `dialog:${lv.title}`, text: t.text });
    else for (const o of t.options || []) rows.push({ ctx: `dialog:${lv.title} (option)`, text: o });
  }
}

const words = [];
for (const r of rows) {
  const toks = r.text.replace(/[^a-zA-Z' -]/g, ' ').split(/[\s-]+/).filter(Boolean);
  for (const t of toks) words.push(t);
}
const uniq = [...new Set(words.map(w => w.toLowerCase()))];
console.log('строк:', rows.length, '| уникальных слов:', uniq.length);
fs.writeFileSync('/tmp/a1_words.json', JSON.stringify(uniq));
fs.writeFileSync('/tmp/a1_rows.json', JSON.stringify(rows));

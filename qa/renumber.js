/* Пересчёт меток «ур. N» в flow-заголовках lessons.js по живому порядку COURSE.
   Запуск: node qa/renumber.js   (правит js/lessons.js на месте) */
const fs = require('fs'), vm = require('vm');
const P = '/home/user/js/lessons.js';
let src = fs.readFileSync(P, 'utf8');
const sb = {}; vm.createContext(sb);
vm.runInContext(src, sb, { timeout: 5000 });
let changed = 0;
for (const s of [1, 2, 3, 4, 5]) {
  const arr = sb.getCourse('en', s) || [];
  arr.forEach((lv, i) => {
    if (lv && lv.flow && typeof lv.flow.title === 'string' && /· ур\. \d+/.test(lv.flow.title)) {
      const want = lv.title + ' · ур. ' + (i + 1);
      if (lv.flow.title !== want) {
        const old = "title:'" + lv.flow.title + "'";
        const idx = src.indexOf(old);
        if (idx === -1) { console.error('не нашёл в файле: ' + old); process.exit(1); }
        src = src.slice(0, idx) + "title:'" + want + "'" + src.slice(idx + old.length);
        changed++;
      }
    }
  });
}
fs.writeFileSync(P, src);
console.log('пересчитано меток: ' + changed);

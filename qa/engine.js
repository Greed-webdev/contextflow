// Стенд QA: вырезает ядро (SCENES + хелперы) из демо-5.html и отдаёт сцены,
// чтобы судейство можно было гонять без браузера.
//   const E = require('/home/user/qa/engine.js');
//   const n = E.SCENES.s1.nodes.name0;
//   n.judge(E.expand(E.norm('Anna')), {});
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'демо-5.html'), 'utf8');
const m0 = html.indexOf('/* ================= ЯДРО');
const m1 = html.indexOf('/* ================= UI ================= */');
if (m0 < 0 || m1 < 0) { console.error('маркеры ядра демо-5.html не найдены'); process.exit(1); }
const core = html.slice(m0, m1) + '\nmodule.exports={SCENES, norm, expand, numOf, has};';
const tmp = '/tmp/d5-engine.js';
fs.writeFileSync(tmp, core);
module.exports = require(tmp);

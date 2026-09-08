// QA-харнесс: точная копия логики D.go — прогоняет диалог фразами без браузера.
//   const {play, show} = require('/home/user/qa/harness.js');
//   show(play('s1', ['Hi, my name is Anna. I have a meeting.', 'Room 204, second floor?', 'Thanks, bye!']));
const E = require('./engine.js');
const { SCENES } = E;

function step(scene, at, said, mem) {
  const n = scene.nodes[at];
  if (!n) return { err: `нет узла ${at}` };
  mem._digits = said.match(/\d+/g) || [];
  const w = E.expand(E.norm(said));
  const r = n.judge ? n.judge(w, mem) : null;
  if (!r || r.huh) return { err: `huh на «${said}» (узел ${at})`, huh: true };
  const t = n.tr[r.br];
  if (!t) return { err: `нет ветки "${r.br}" для «${said}» (узел ${at})` };
  const fmt = s => (s || '').replace(/\{name\}/g, (mem && mem.name) || '…');
  return { br: r.br, them: fmt(t.them), ru: fmt(t.ruThem), next: t.next };
}

function play(sceneId, phrases, mem) {
  const scene = SCENES[sceneId];
  if (!scene) return { ok: false, err: `нет сцены ${sceneId}` };
  mem = mem || {};
  let at = scene.start;
  const log = [];
  for (const ph of phrases) {
    const s = step(scene, at, ph, mem);
    if (s.err) return { ok: false, log, err: s.err, at };
    log.push({ at, you: ph, br: s.br, them: s.them });
    if (s.next === null || s.next === undefined) return { ok: true, end: at, log, mem };
    if (!scene.nodes[s.next]) return { ok: false, log, err: `next «${s.next}» не существует (из ${at})` };
    at = s.next;
  }
  return { ok: false, log, err: `фразы кончились на узле ${at}`, at };
}

function show(r) {
  if (!r.ok) console.log('✗ ' + r.err);
  (r.log || []).forEach(l => console.log(`[${l.at}] вы: ${l.you}  →(${l.br}) ${l.them || ''}`));
  if (r.ok) console.log(`✓ диалог завершён (конец: ${r.end || 'null'})`);
  return r;
}

module.exports = { play, show, step };

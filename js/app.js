/* ==========================================================
   ContextFlow · app.js — ЗОНА: экраны, навигация, сохранение.
   Контент — в lessons.js. Стили — в css/. Звук — в sound.js.
   ========================================================== */

const KEY = 'contextflow_state_v10';
const DEFAULT = {
  seenIntro:false,
  lang:null,           // код языка
  stage:1,             // последний открытый этап
  progress:{},         // "en:1:0" -> {done:true, acc:0.83}
  stats:{levels:0, words:0, right:0, total:0},
  allOpen:true,        // режим проверки: все уровни открыты (выключается в профиле)
  sound:{amb:true, fx:true, tts:true}
};
let S = load();
function load(){
  try{ return Object.assign({}, DEFAULT, JSON.parse(localStorage.getItem(KEY)) || {}); }
  catch(e){ return Object.assign({}, DEFAULT); }
}
function save(){ localStorage.setItem(KEY, JSON.stringify(S)); }

const $  = id => document.getElementById(id);
const el = (tag, cls, html) => { const n=document.createElement(tag); if(cls)n.className=cls; if(html!=null)n.innerHTML=html; return n; };
const dunnoIco = '<span class="dunno-ico">?</span>';
const mkDunno = () => { const b = el('button','btn dunno wide'); b.innerHTML = dunnoIco + '<span>Не знаю</span>'; return b; };
const lang = () => LANGUAGES.find(l => l.code === S.lang) || null;
const flagUrl = c => `assets/flags/${c}.png`;
const EMOJI = 'assets/emoji';
const APP_VERSION = 'v24';   // видно в профиле: свежая ли версия открыта
const pkey = (st, idx) => `${S.lang}:${st}:${idx}`;

/* ---------------- навигация ---------------- */
let navStack = [];
let current = 'sc-welcome';
const TABBED = ['sc-hub','sc-map','sc-profile'];

function go(id, opts={}){
  if (id === current) return;
  if (!opts.noHistory && current) navStack.push(current);
  document.querySelectorAll('.screen').forEach(s=>{ s.classList.remove('on','enter'); });
  const t = $(id); t.classList.add('on','enter');
  current = id;
  $('tabbar').classList.toggle('hidden', !TABBED.includes(id) || !S.lang);
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.go === id));
  Ambience.forScreen(id);
  if (id === 'sc-welcome') HelloScreen.start(); else HelloScreen.stop();
  if (id === 'sc-hub') Hub.render();
  if (id === 'sc-lang') Lang.render();
  if (id === 'sc-profile') Profile.render();
}
function back(){
  const prev = navStack.pop();
  if (window.Voice) Voice.stop();
  if (window.STT){ STT.stop(); Sound.duck(false); }
  Sound.fx('back');
  go(prev || (S.lang ? 'sc-hub' : 'sc-welcome'), {noHistory:true});
}
document.querySelectorAll('.tab').forEach(b => b.onclick = () => { Sound.fx('tap'); go(b.dataset.go); });

/* ---------------- атмосфера по экранам ---------------- */
const Ambience = {
  forScreen(id){
    if (!S.sound.amb) return;
    const m = {
      'sc-welcome':'ridge','sc-hub':'quiet',
      'sc-lang':'quiet','sc-map':null,'sc-levels':null,'sc-profile':'quiet','sc-done':'summit'
    };
    if (id === 'sc-map' || id === 'sc-levels'){ Sound.ambience(STAGES[Trail.stage||1].amb); return; }
    if (id === 'sc-lesson') return;
    Sound.ambience(m[id] || 'quiet');
  }
};

/* ---------------- тост ---------------- */
let toastT;
function toast(msg){
  const t = $('toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(()=>t.classList.remove('on'), 2100);
}

/* ---------------- нижний лист ---------------- */
const Sheet = {
  open(html){ $('sheet').innerHTML = `<div class="grip"></div>${html}`; $('sheet-wrap').classList.add('on'); Sound.fx('open'); },
  close(){ $('sheet-wrap').classList.remove('on'); }
};


/* ---------------- экран «hello»: перебор языков ---------------- */
const HelloScreen = {
  // латиница идёт тонким Sacramento, остальные письменности — Caveat (класс thick)
  words:[
    {t:'hello'},              {t:'привет', thick:true},
    {t:'hola'},               {t:'bonjour'},
    {t:'ciao'},               {t:'hallo'},
    {t:'olá'},                {t:'cześć'},
    {t:'γεια', thick:true},   {t:'merhaba'},
    {t:'salve'},              {t:'вітаю', thick:true}
  ],
  i:0, timer:null,
  start(){
    const el = $('ios-hello'); if (!el) return;
    this.stop();
    this.i = 0;
    this.paint(el);
    this.timer = setInterval(()=>{
      el.classList.add('out');
      setTimeout(()=>{
        this.i = (this.i+1) % this.words.length;
        el.classList.remove('out');
        this.paint(el);
      }, 560);
    }, 2900);
  },
  paint(el){
    const w = this.words[this.i];
    el.textContent = w.t;
    el.classList.toggle('thick', !!w.thick);
    // перезапуск анимации появления
    el.style.animation='none'; void el.offsetWidth; el.style.animation='';
  },
  stop(){ if (this.timer){ clearInterval(this.timer); this.timer=null; } }
};

/* ---------------- онбординг ---------------- */
const Onb = {
  start(){
    S.seenIntro = true; save();
    Sound.boot(); Sound.fx('unlock');
    navStack = [];
    go(S.lang ? 'sc-hub' : 'sc-lang', {noHistory:true});
    if (!S.lang) navStack = ["sc-hub"];
  }
};

/* ---------------- хаб ---------------- */
/* ---------------- копилка ошибок ----------------
   Каждый промах записывается. Слово возвращается в «Разбор ошибок»,
   пока человек не ответит верно два раза подряд — тогда уходит.       */
const Miss = {
  all(){ S.miss = S.miss || {}; return S.miss; },
  key(en){ return (S.lang||'en') + ':' + en.toLowerCase(); },
  add(en, ru, kind){
    if (!en) return;
    const m = this.all(), k = this.key(en);
    m[k] = m[k] || { en, ru: ru||'', kind: kind||'word', bad:0, good:0, at:0 };
    m[k].bad++; m[k].good = 0; m[k].at = Date.now();
    save();
  },
  ok(en){
    const m = this.all(), k = this.key(en);
    if (!m[k]) return;
    m[k].good++;
    if (m[k].good >= 2) delete m[k];   // исправлено — уходит из копилки
    save();
  },
  list(){
    return Object.values(this.all()).sort((a,b)=> b.bad - a.bad || b.at - a.at);
  },
  count(){ return this.list().length; }
};

const Hub = {
  render(){
    const now = new Date(), h = now.getHours();
    $('hub-greet').textContent = h<5?'Доброй ночи':h<12?'Доброе утро':h<18?'Добрый день':'Добрый вечер';
    $('hub-date').textContent = now.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});

    const L = lang();
    const initials = L ? L.native.slice(0,2).toUpperCase() : '—';
    $('avatar').textContent = initials;

    const slot = $('hub-tile-slot');
    slot.innerHTML = '';
    if (!L){
      $('hub-h1').textContent = 'Твой язык';
      $('hub-caption').textContent = 'Сначала выбери язык — дальше всё откроется.';
      $('hub-lang-btn').textContent = 'Выбрать язык';
      const empty = el('div','hub-empty',`
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#767f85" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18"/></svg>
        <h3 class="sm">Язык ещё не выбран</h3>
        <p class="small">Нажми, чтобы открыть список</p>`);
      empty.onclick = ()=>Lang.open();
      slot.appendChild(empty);
      return;
    }

    const {done, total} = Progress.overall();
    const st = S.stage || 1;
    const stStat = Progress.stageStat(st);
    $('hub-h1').textContent = stStat.done ? 'Продолжай' : 'В путь';
    $('hub-caption').textContent = stStat.done ? 'Ты уже прошёл часть этапа — иди дальше.' : 'Курс идёт этапами. Сейчас — первый: дальше пойдёт само.';
    $('hub-lang-btn').textContent = 'Сменить язык';

    const tile = el('div','lang-tile');
    tile.innerHTML = `
      <img src="${STAGES[st].art}" alt="">
      <div class="veil"></div>
      <div class="inner">
        <div class="tile-badge"><img class="flag" src="${flagUrl(L.flag)}"> ${L.native} · ${STAGES[st].cefr}</div>
        <div>
          <span class="kicker amber">${stStat.done ? 'Продолжить' : 'Начать'}</span>
          <h2 class="mid" style="margin-top:4px">${STAGES[st].name}</h2>
          <p class="small" style="margin-top:4px">${STAGES[st].sub}</p>
          <div class="tile-progress">
            <div class="bar" style="flex:1"><i style="width:${total?Math.round(done/total*100):0}%"></i></div>
            <span class="small">${done}/${total}</span>
          </div>
        </div>
      </div>`;
    tile.onclick = ()=>{
      Sound.fx('whoosh');
      if (stStat.done > 0){ Trail.open(); return; }
      S.stage = st; save();
      Levels.open(st);          // новичок сразу к урокам, минуя карту
    };
    slot.appendChild(tile);

    // карточка «Разбор ошибок» — только если есть что разбирать
    const n = Miss.count();
    if (n){
      const card = el('div','miss-card');
      card.innerHTML = `
        <div class="miss-n">${n}</div>
        <div class="miss-txt">
          <h3 class="sm">Разбор ошибок</h3>
          <p class="small">${n === 1 ? 'Одна фраза ждёт' : n < 5 ? n + ' фразы ждут' : n + ' фраз ждут'} второго захода</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#767f85" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>`;
      card.onclick = ()=>{ Sound.fx('tap'); Review.open(); };
      slot.appendChild(card);
    }
  }
};

/* ---------------- разбор ошибок ----------------
   Отдельный проход по тому, что не получилось. Без жизней и без счёта:
   задача не наказать, а закрепить.                                    */
const Review = {
  open(){
    const list = Miss.list();
    if (!list.length){ Sheet.open('<h3 class="sm">Ошибок нет</h3><p class="small" style="margin-top:6px">Разбирать пока нечего.</p>'); return; }
    this.list = list.slice(0, 10);
    this.i = 0; this.right = 0;
    go('sc-lesson');
    const L0 = lang(), sc0 = SCENES['office'];
    if (L0 && sc0) $('scene-img').src = `assets/scenes/${L0.scenes}/${sc0.img}`;
    $('l-scene').textContent = 'Разбор ошибок';
    $('l-kind').textContent  = 'Без жизней и без счёта — просто закрепить';
    $('hearts').innerHTML = '';
    $('l-prog').style.width = '0';
    $('l-action').style.display = 'none';   // свои кнопки внутри
    this.step();
  },
  step(){
    if (this.i >= this.list.length) return this.done();
    const it = this.list[this.i];
    $('l-prog').style.width = Math.round(this.i / this.list.length * 100) + '%';
    const body = $('l-body'); body.innerHTML = '';
    $('l-feedback').textContent = '';
    const wrap = el('div','pad');
    wrap.innerHTML = `
      <span class="kicker">Было с ошибкой · ${this.i+1} из ${this.list.length}</span>
      <h2 class="mid" style="margin-top:8px">${it.ru || 'Скажи это по-английски'}</h2>
      <p class="small" style="margin-top:6px">Промахов: ${it.bad}. Ответь верно дважды — уйдёт из списка.</p>`;
    body.appendChild(wrap);
    const ta = el('textarea','free-input'); ta.rows = 2; ta.placeholder = 'Напиши ответ…';
    wrap.appendChild(ta);
    const row = el('div','ans-row');
    const go1 = el('button','btn moss','Ответить');
    const skip = el('button','btn ghost','Показать');
    row.appendChild(go1); row.appendChild(skip); wrap.appendChild(row);

    const show = (ok)=>{
      const v = el('div','verdict');
      v.innerHTML = (ok ? '<b class="g">Верно.</b>' : '<b class="r">Ещё не то.</b>')
        + `<div style="margin-top:8px">Правильно: <b>${it.en}</b></div>`;
      wrap.appendChild(v);
      this.say ? this.say(it.en) : Lesson.say(it.en, {now:true});
      if (ok){ this.right++; Miss.ok(it.en); Sound.fx('right'); }
      else Miss.add(it.en, it.ru, it.kind);
      go1.remove(); skip.remove();
      const nx = el('button','btn moss wide','Дальше');
      nx.onclick = ()=>{ Lesson.sayStop(); this.i++; this.step(); };
      wrap.appendChild(nx);
    };
    go1.onclick = ()=>{
      const said = ta.value.trim().toLowerCase().replace(/[^a-z' ]/g,' ').replace(/\s+/g,' ').trim();
      const want = it.en.toLowerCase().replace(/[^a-z' ]/g,' ').replace(/\s+/g,' ').trim();
      show(said === want);
    };
    skip.onclick = ()=> show(false);
  },
  done(){
    const body = $('l-body'); body.innerHTML = '';
    const wrap = el('div','pad');
    wrap.innerHTML = `
      <span class="kicker">Разбор окончен</span>
      <h2 class="mid" style="margin-top:8px">${this.right} из ${this.list.length} верно</h2>
      <p class="small" style="margin-top:8px">Осталось в копилке: ${Miss.count()}.</p>`;
    body.appendChild(wrap);
    const b = el('button','btn moss wide','На главную');
    b.onclick = ()=>{ Lesson.sayStop(); $('l-action').style.display=''; go('sc-hub'); Hub.render(); };
    wrap.appendChild(b);
  }
};

/* ---------------- выбор языка ---------------- */
const Lang = {
  open(){ this.render(); Sound.fx('tap'); go('sc-lang'); },
  render(){
    const list = $('lang-list'); list.innerHTML = '';
    LANGUAGES.forEach(L=>{
      const row = el('div','lang-row' + (L.code===S.lang?' cur':''));
      row.innerHTML = `
        <img class="flag" style="width:34px;height:23px;border-radius:5px" src="${flagUrl(L.flag)}">
        <div style="flex:1">
          <h3 class="sm">${L.name}</h3>
          <p class="small">${L.native} · ${L.place}</p>
        </div>
        <span class="small">${L.code===S.lang?'сейчас':'›'}</span>`;
      row.onclick = ()=>this.pick(L.code);
      list.appendChild(row);
    });
  },
  pick(code){
    const changed = S.lang !== code;
    S.lang = code;
    if (changed) S.stage = S.stage || 1;
    save();
    Sound.fx('unlock');
    toast(`${LANGUAGES.find(l=>l.code===code).native} — маршрут открыт`);
    navStack = ["sc-hub"];
    Trail.open();                       // сразу в обучение, без анкет
  }
};

/* ---------------- прогресс ---------------- */
const Progress = {
  levelDone(st, idx){ return !!(S.progress[pkey(st,idx)] || {}).done; },
  stageStat(st){
    const arr = getCourse(S.lang, st);
    const done = arr.filter((_,i)=>this.levelDone(st,i)).length;
    return {done, total:arr.length};
  },
  overall(){
    let done=0,total=0;
    for (let st=1; st<=5; st++){ const s=this.stageStat(st); done+=s.done; total+=s.total; }
    return {done,total};
  },
  unlocked(st, idx){
    if (S.allOpen) return true;          // режим проверки: открыто всё
    if (idx === 0) return true;
    return this.levelDone(st, idx-1);
  },
  mark(st, idx, acc){
    const k = pkey(st,idx);
    const first = !(S.progress[k]||{}).done;
    S.progress[k] = {done:true, acc};
    if (first) S.stats.levels++;
    save();
  }
};

/* ---------------- карта горы (поведение перенесено как есть) ---------------- */
const MAP_OVERVIEW = 'assets/map/mountain-map.png';
const Trail = {
  stage:0,
  open(){ this.overview(true); go('sc-map'); this.header(); },
  header(){
    const L = lang();
    $('map-lang').innerHTML = L ? `<img class="flag" src="${flagUrl(L.flag)}"> ${L.native}` : '—';
  },
  whoosh(src, after){
    const img = $('map-photo');
    Sound.fx('whoosh');
    img.classList.remove('whoosh-in'); img.classList.add('whoosh-out');
    setTimeout(()=>{
      img.src = src;
      const bl = $('map-blur'); if (bl) bl.src = src;
      img.classList.remove('whoosh-out'); img.classList.add('whoosh-in');
      requestAnimationFrame(()=>requestAnimationFrame(()=>img.classList.remove('whoosh-in')));
      if (after) after();
    }, 280);
  },
  zoom(n){
    if (this.stage === n) { this.enterStage(); return; }
    this.stage = n;
    $('hotspots').classList.add('hidden');
    $('map-frame').classList.add('zoomed');
    $('sc-back').classList.remove('hidden');
    this.card(n);
    if (S.sound.amb) Sound.ambience(STAGES[n].amb);
    this.whoosh(STAGES[n].art);
    S.stage = n; save();
  },
  overview(silent){
    this.stage = 0;
    $('hotspots').classList.remove('hidden');
    $('map-frame').classList.remove('zoomed');
    $('sc-back').classList.add('hidden');
    this.card(0);
    if (silent){ $('map-photo').src = MAP_OVERVIEW; const bl=$('map-blur'); if(bl) bl.src=MAP_OVERVIEW; }
    else this.whoosh(MAP_OVERVIEW);
    if (S.sound.amb) Sound.ambience('ridge');
  },
  card(n){
    if (n === 0){
      $('sc-tag').textContent = 'Обзор маршрута';
      $('sc-status').textContent = 'Карта';
      $('sc-title').textContent = 'Выбери этап на горе';
      $('sc-desc').textContent = 'Нажми на табличку Stage 1–5. Каждый этап — свой уровень: A1, A2, B1, B2, C1.';
      $('sc-prog-row').style.display = 'none';
      $('sc-go').textContent = 'Продолжить с этапа ' + (S.stage||1);
      return;
    }
    const st = STAGES[n], p = Progress.stageStat(n);
    $('sc-tag').textContent = `${st.cefr} · Этап ${n}`;
    $('sc-status').textContent = p.done === p.total && p.total ? 'Пройден' : `${p.done}/${p.total}`;
    $('sc-title').textContent = st.name;
    $('sc-desc').textContent = st.desc;
    $('sc-prog-row').style.display = 'flex';
    $('sc-prog').style.width = (p.total? p.done/p.total*100:0) + '%';
    $('sc-prog-txt').textContent = `${p.done} / ${p.total}`;
    $('sc-go').textContent = p.done ? 'Продолжить этап' : 'Начать этап';
  },
  exit(){ Sound.fx('back'); go('sc-hub'); },
  enterStage(){
    const n = this.stage || S.stage || 1;
    this.stage = n; S.stage = n; save();
    Sound.fx('step');
    Levels.open(n);
  }
};

/* ---------------- уровни этапа ---------------- */
const Levels = {
  open(st){
    const stage = STAGES[st], arr = getCourse(S.lang, st);
    $('lv-cefr').textContent = `${stage.cefr} · Этап ${st}`;
    $('lv-title').textContent = stage.name;
    $('lv-sub').textContent = stage.desc;
    const p = Progress.stageStat(st);
    $('lv-prog').style.width = (p.total? p.done/p.total*100:0)+'%';
    $('lv-prog-txt').textContent = `${p.done} / ${p.total}`;

    const list = $('lv-list'); list.innerHTML = '';
    arr.forEach((lv,i)=>{
      const done = Progress.levelDone(st,i);
      const open = Progress.unlocked(st,i);
      const row = el('div','level-row' + (done?' done':'') + (open?'':' locked'));
      const ic = {words:'A', build:'¶', dialog:'“”'}[lv.type];
      row.innerHTML = `
        <div class="lvl-dot ${done?'done':lv.type}">${done?'✓':ic}</div>
        <div style="flex:1">
          <div class="row gap8"><span class="kicker">${levelKind(lv.type)}</span>
            <span class="kicker" style="color:var(--text-3)">· ${SCENES[lv.scene].label}</span></div>
          <h3 class="sm" style="margin-top:3px">${lv.title}</h3>
        </div>
        <span class="small">${open?'›':'🔒'}</span>`;
      if (open) row.onclick = ()=>{ Sound.fx('step'); Lesson.start(st,i); };
      list.appendChild(row);
    });
    go('sc-levels');
  }
};

/* ---------------- голос: реальная проверка произнесённого ----------------
   Web Speech API. Есть в Chrome/Edge/Safari 14.1+ и в Telegram на Android/iOS.
   Если API нет — кнопка «Сказать» не рисуется, урок работает как раньше. */
const Voice = {
  ok(){ return !!(window.SpeechRecognition || window.webkitSpeechRecognition); },
  rec:null, busy:false,

  /* нормализация: регистр, пунктуация, артикли-мелочи, лишние пробелы */
  norm(s){
    return (s||'').toLowerCase()
      .replace(/[.,!?;:¡¿"'`´’“”()\-—–]/g,' ')
      .replace(/\s+/g,' ').trim();
  },
  /* расстояние Левенштейна → похожесть 0..1 */
  sim(a,b){
    a=this.norm(a); b=this.norm(b);
    if (!a || !b) return 0;
    if (a===b) return 1;
    const m=a.length, n=b.length;
    let prev=Array.from({length:n+1},(_,j)=>j), cur=new Array(n+1);
    for(let i=1;i<=m;i++){
      cur[0]=i;
      for(let j=1;j<=n;j++){
        cur[j]=Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1));
      }
      [prev,cur]=[cur,prev];
    }
    return 1 - prev[n]/Math.max(m,n);
  },

  /* Спросить микрофон ЯВНО. Именно этот вызов показывает системное окно
     «Разрешить доступ к микрофону?». Без него распознавание в Telegram
     часто просто молчит и человек не понимает, что случилось. */
  granted:false,

  /* КЛЮЧЕВОЕ ЗНАНИЕ:
     SpeechRecognition сам по себе НЕ закрепляет доступ — Android спрашивает
     разрешение при каждом запуске. А getUserMedia закрепляет его за сайтом
     навсегда. Поэтому один раз в жизни приложения дёргаем getUserMedia,
     сразу отпускаем железо — и дальше распознавание работает молча.
     Флаг храним в localStorage, чтобы после перезапуска НЕ ждать промис
     (промис рвёт жест нажатия и блокирует старт). */
  KEY:'cf_mic_ok',
  get granted(){
    try { return localStorage.getItem(this.KEY) === '1'; } catch(e){ return false; }
  },
  set granted(v){
    try { v ? localStorage.setItem(this.KEY,'1') : localStorage.removeItem(this.KEY); } catch(e){}
  },

  /* Закрепить доступ. Вызывать ТОЛЬКО когда granted === false. */
  prime(){
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      return Promise.resolve('no-api');
    }
    return navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
      // железо отпускаем немедленно: оно нужно распознаванию, не нам
      stream.getTracks().forEach(t=>t.stop());
      this.granted = true;
      return 'ok';
    }).catch(err=>{
      const n = err && err.name;
      if (n==='NotAllowedError' || n==='PermissionDeniedError') return 'denied';
      if (n==='NotFoundError' || n==='DevicesNotFoundError') return 'no-mic';
      return 'error';
    });
  },
  release(){},
  releaseHardware(){},
  /* уже разрешено раньше? спрашиваем тихо, без окна */
  check(){
    if (!navigator.permissions || !navigator.permissions.query) return Promise.resolve('unknown');
    return navigator.permissions.query({name:'microphone'})
      .then(p=>{ if (p.state==='granted') this.granted = true; return p.state; })
      .catch(()=>'unknown');
  },

  /* listen(target, {onresult(res), onstate(state)}) */
  listen(target, cb){
    if (this.busy) { this.stop(); return; }
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) { cb.onstate && cb.onstate('unsupported'); return; }

    // КРИТИЧНО: наш собственный поток занимает микрофон, и распознаванию
    // достаётся тишина. Отпускаем железо, оставляя выданное разрешение.
    this.releaseHardware();

    let r;
    try { r = new Ctor(); } catch(e){ cb.onstate && cb.onstate('error'); return; }
    this.rec = r; this.busy = true;

    r.lang = lang().tts;
    // промежуточные результаты обязательны: на телефоне распознавание нередко
    // закрывается раньше, чем отдаст финальный ответ — иначе слышим «тишину»
    r.interimResults = true;
    r.maxAlternatives = 4;
    r.continuous = false;

    let done = false;
    let bestHeard = '', bestScore = 0;   // копим лучшее за всю попытку
    let heardAnything = false;

    const consider = (txt)=>{
      if (!txt) return;
      heardAnything = true;
      const s = this.sim(txt, target);
      if (s > bestScore || !bestHeard){ bestScore = s; bestHeard = txt; }
    };

    const finish = (payload)=>{
      if (done) return; done = true;
      this.busy = false; this.rec = null;
      clearTimeout(guard); clearTimeout(softStop);
      cb.onresult && cb.onresult(payload);
    };
    const done_ok = ()=> finish({ heard: bestHeard, score: bestScore, target });

    // мягкая остановка: даём договорить, затем просим результат
    let softStop = null;
    const armSoftStop = ()=>{
      clearTimeout(softStop);
      softStop = setTimeout(()=>{ try{ r.stop(); }catch(e){} }, 1400);
    };
    // жёсткий предел на всю попытку
    const guard = setTimeout(()=>{ try{ r.stop(); }catch(e){} }, 12000);

    r.onstart      = ()=> cb.onstate && cb.onstate('listening');
    r.onaudiostart = ()=> cb.onstate && cb.onstate('listening');
    r.onspeechstart= ()=>{ cb.onstate && cb.onstate('speaking'); clearTimeout(softStop); };
    // НЕ останавливаем сразу — человек может делать паузу между словами
    r.onspeechend  = ()=> armSoftStop();

    r.onresult = (ev)=>{
      let finalSeen = false;
      for (let i = ev.resultIndex; i < ev.results.length; i++){
        const res = ev.results[i];
        for (let j = 0; j < res.length; j++) consider(res[j].transcript);
        if (res.isFinal) finalSeen = true;
      }
      cb.onstate && cb.onstate('speaking');
      if (finalSeen){ try{ r.stop(); }catch(e){} done_ok(); }
      else armSoftStop();
    };

    r.onerror = (ev)=>{
      const code = ev && ev.error;
      if (code === 'no-speech' && heardAnything){ done_ok(); return; }
      // доступ отозвали снаружи (шторка/настройки) — забываем отметку,
      // при следующем нажатии закрепим заново
      if (code === 'not-allowed' || code === 'service-not-allowed') this.granted = false;
      finish({ heard: bestHeard, score: bestScore, target,
               err: code==='not-allowed'||code==='service-not-allowed' ? 'denied'
                  : code==='no-speech' ? 'silent'
                  : code==='aborted' ? 'aborted' : 'error' });
    };

    // распознавание закрылось само — отдаём то, что успели услышать
    r.onend = ()=>{
      if (heardAnything) done_ok();
      else finish({ heard:'', score:0, target, err:'silent' });
    };

    try { r.start(); } catch(e){ finish({ heard:'', score:0, target, err:'error' }); }
  },
  stop(){
    this.busy = false;
    if (this.rec){ try{ this.rec.abort(); }catch(e){} this.rec = null; }
  },

  /* какое устройство — чтобы дать точную инструкцию, а не общие слова */
  device(){
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'desktop';
  },
  /* приложение открыто внутри Telegram? там микрофон часто режется */
  inTelegram(){
    const W = window.Telegram && window.Telegram.WebApp;
    // пустой initData = скрипт просто подключён, но запуска из Telegram не было
    return !!(W && typeof W.initData === 'string' && W.initData.length > 0);
  },
  /* страница во фрейме (превью) — микрофон блокируется браузером */
  inFrame(){ try { return window.self !== window.top; } catch(e){ return true; } },

  /* окно «как включить микрофон» — с шагами под конкретное устройство */
  help(){
    const d = this.device();
    const insecure = location.protocol !== 'https:' && location.hostname !== 'localhost'
                     && location.protocol !== 'file:';
    let steps, title = 'Как разрешить микрофон';

    if (this.inTelegram()){
      title = 'Разреши микрофон Telegram';
      steps = d === 'ios'
        ? ['Открой «Настройки» на iPhone.',
           'Пролистай до «Telegram» и нажми.',
           'Включи переключатель «Микрофон».',
           'Вернись сюда, закрой и снова открой приложение.']
        : ['Зажми иконку Telegram на экране телефона.',
           'Нажми «О приложении» → «Разрешения».',
           'Выбери «Микрофон» → «Разрешить».',
           'Вернись сюда, закрой и снова открой приложение.'];
    } else if (this.inFrame()){
      title = 'Открой в отдельной вкладке';
      steps = ['Сейчас приложение показано в маленьком окне.',
               'Браузер намеренно не пускает микрофон внутрь такого окна.',
               'Открой ту же ссылку в обычной вкладке браузера — и всё заработает.'];
    } else if (location.protocol === 'file:'){
      title = 'Нужен адрес, а не файл';
      steps = ['Файл открыт с диска — браузеры запрещают микрофон в таком режиме.',
               'Открой приложение по ссылке (http или https), тогда микрофон будет доступен.'];
    } else if (insecure){
      title = 'Нужен защищённый адрес';
      steps = ['Микрофон работает только на https или на localhost.',
               'Открой приложение по https-ссылке.'];
    } else if (d === 'ios'){
      steps = ['Открой «Настройки» на телефоне.',
               'Пролистай вниз до Safari (или Chrome, если пользуешься им).',
               'Нажми «Микрофон» и выбери «Спросить» или «Разрешить».',
               'Вернись сюда и обнови страницу, потом нажми «Сказать» ещё раз.'];
    } else if (d === 'android'){
      steps = ['В браузере нажми на замок слева от адреса страницы.',
               'Выбери «Разрешения» или «Настройки сайта».',
               'Найди «Микрофон» и переключи на «Разрешить».',
               'Обнови страницу и нажми «Сказать» ещё раз.',
               'Если пункта нет: Настройки телефона → Приложения → твой браузер → Разрешения → Микрофон.'];
    } else {
      steps = ['Нажми на замок слева от адреса страницы.',
               'Найди «Микрофон» и поставь «Разрешить».',
               'Обнови страницу и нажми «Сказать» ещё раз.'];
    }

    if (this.inTelegram() && title !== 'Разреши микрофон Telegram'){
      steps.push('Если не помогло — открой приложение во внешнем браузере через меню «…».');
    }

    Sheet.open(`
      <span class="kicker amber">Микрофон</span>
      <h2 class="sm" style="margin:6px 0 4px">${title}</h2>
      <ol class="mic-steps">${steps.map(s=>`<li>${s}</li>`).join('')}</ol>
      <button class="btn moss" style="margin-top:16px" onclick="Sheet.close()">Понятно</button>
      <button class="btn quiet" style="margin-top:9px" onclick="location.reload()">Обновить страницу</button>
    `);
  },

  /* готовая кнопка «Сказать» + строка результата.
     onScore(score, heard) — вызывается после попытки */
  mount(host, target, onScore){
    if (!this.ok()) return null;
    const wrap = el('div','say-block');
    const btn  = el('button','say-btn');
    btn.innerHTML = `<span class="say-ring"></span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
        <rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>
      </svg><span class="say-label">Сказать</span>`;
    const out = el('div','say-out','Нажми и скажи слово вслух · ' + APP_VERSION);
    const bar = el('div','say-bar on');
    const fill = el('i','say-fill');
    bar.appendChild(fill);
    wrap.appendChild(btn); wrap.appendChild(bar); wrap.appendChild(out);
    host.appendChild(wrap);
    let vuTimer = null;

    const setState = (cls, txt)=>{
      btn.className = 'say-btn' + (cls?' '+cls:'');
      if (txt !== undefined) out.textContent = txt;
    };

    // заранее видно, что микрофон не дадут — объясняем сразу, не мучая человека
    if (this.inFrame() || location.protocol === 'file:'){
      const warn = el('button','say-why','Микрофон тут не работает — почему?');
      warn.onclick = ()=>this.help();
      wrap.appendChild(warn);
    }

    const run = ()=>{
      out.className = 'say-out';
      setState('rec', 'Говори — я слушаю.');
      clearInterval(vuTimer);
      Sound.duck(true);          // ветер и шум сцены глушим: лезут в микрофон
      // полоска показывает НАСТОЯЩУЮ громкость, а не рисованную волну
      STT.onLevel = (v)=>{ fill.style.transform = `scaleX(${Math.max(.03, v)})`; };

      STT.listen(target, {
        onstate:(s)=>{
          if (s==='listening') setState('rec','Говори — я слушаю.');
          if (s==='speaking') setState('rec','Слышу тебя…');
        },
        onresult:(res)=>{
          clearInterval(vuTimer);
          Sound.duck(false);     // запись кончилась — возвращаем сцену
          STT.onLevel = null;
          fill.style.transform = 'scaleX(.03)';
          if (res.err === 'denied'){
            setState('', 'Микрофон не разрешён.');
            out.className='say-out no';
            this.help();
            return;
          }
          if (res.err === 'aborted'){ setState('', ''); return; }
          if (res.err === 'error'){
            setState('', 'Сбой распознавания. Нажми ещё раз.');
            out.className='say-out'; return;
          }
          if (res.err === 'silent' || !res.heard){
            setState('', 'Тишина. Говори громче и ближе к телефону.');
            out.className='say-out'; return;
          }
          const pct = Math.round(res.score*100);
          const good = res.score >= .72;
          const soso = res.score >= .5;
          setState(good?'done':'', `«${res.heard}» · ${pct}%`);
          out.className = 'say-out ' + (good?'ok':soso?'mid':'no');
          Sound.fx(good?'right':'wrong');
          onScore && onScore(res.score, res.heard);
        }
      });
    };

    btn.onclick = ()=>{
      if (STT.active){ STT.stop(); Sound.duck(false); setState('', 'Отменено.'); return; }
      Sound.fx('tap');

      // Всё готово — слушаем сразу. Микрофон уже наш, разрешение не трогаем.
      if (STT.ready && STT.stream){ run(); return; }

      // Первый раз: скачать движок (~40 МБ, потом из памяти телефона)
      // и один раз взять микрофон. Дальше окно больше не появится.
      if (!STT.supported()){
        setState('', 'Голосовой движок не поддерживается этим телефоном.');
        out.className = 'say-out no';
        return;
      }
      setState('rec', STT.cached ? 'Готовлю голос…' : 'Скачиваю голосовой движок, ~40 МБ. Только один раз.');
      btn.disabled = true;

      STT.load().then(ok=>{
        if (!ok){
          btn.disabled = false;
          setState('', 'Не смог загрузить голосовой движок. Проверь интернет.');
          out.className = 'say-out no';
          return;
        }
        setState('rec', 'Разреши доступ к микрофону…');
        return STT.openMic().then(res=>{
          btn.disabled = false;
          if (res === true){ run(); return; }
          setState('', res === 'no-mic' ? 'Микрофон не найден.' : 'Микрофон не разрешён.');
          out.className = 'say-out no';
          if (res === 'denied') this.help();
        });
      });
    };
    return wrap;
  }
};

// МИКРОФОН НЕ ОТПУСКАЕМ НИКОГДА, пока приложение открыто.
// Telegram не запоминает разрешение: как только поток закрыт, при
// следующем захвате он спрашивает заново. Поэтому и при сворачивании,
// и при выходе из урока поток остаётся живым — просто перестаём слушать.
document.addEventListener('visibilitychange', ()=>{
  if (document.hidden){ Voice.stop(); STT.stop(); Lesson.sayStop(); }
});
window.addEventListener('pagehide', ()=>{ Voice.stop(); STT.stop(); Lesson.sayStop(); });

/* ---------------- урок ---------------- */
/* ---------- помощники ветвящихся диалогов (variant:'flow') ----------
   Перенесены из эталона демо-5: единый стоп-лист имён, белый список,
   правдоподобие, числа. Судьи узлов в lessons.js зовут их по имени —
   поэтому они объявлены глобально, как в демо. */
const norm = t => (t||'').toLowerCase().replace(/[\u2019']/g,"'").replace(/[^a-z' ]/g,' ').split(/\s+/).filter(Boolean);
const EXP={"i'm":['i','am'],"it's":['it','is'],"don't":['do','not'],"can't":['can','not'],"i've":['i','have'],
"what's":['what','is'],"i'll":['i','will'],"there's":['there','is'],"we're":['we','are'],"you're":['you','are'],
"that's":['that','is'],"doesn't":['does','not'],"isn't":['is','not'],"won't":['will','not']};
const expand = a => { const o=[]; a.forEach(x=>{ if(EXP[x]) o.push(...EXP[x]); else o.push(x.replace(/'/g,'')); }); return o; };
const NUM={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,
thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,
fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,hundred:100};
const numOf = a => { let tot=0,cur=0,any=false; a.forEach(x=>{ if(/^\d+$/.test(x)){tot+=parseInt(x,10);any=true;return;}
  if(x in NUM){any=true;cur+=NUM[x];} }); return any?tot+cur:null; };
const has = (w,...xs)=> xs.some(x=>w.includes(x));
const SVC=['a','an','the','to','of','and','my','i','you','it','in','on','at','for','with','this','that','have',
'has','can','will','would','please','me','we','they','is','am','are','be','do','does','did','not','no','yes',
'thanks','thank','goodbye','bye','see','very','much','really','sorry','right','ok','okay','sure','here',
'there','now','then','good','fine','great','nice','just','about','all','too','also','up','down','left',
'day','night','back','soon','later','again','more','some','any','lot','so','but','or','if','from','out'];
const NAME_STOP=['hi','hello','hey','good','morning','afternoon','evening','late','sorry','excuse','waiting','wait',
'leaving','looking','sir','madam','maam','mr','mrs','ms','miss','there','from','with','about','name','my','me','i',
'am','im','please','nice','to','meet','meeting','appointment','help','need','friend','lost','person','someone','just','call',
'no','not','thanks','thank','fine','nothing','bye','goodbye','see','later','today','sure','yes','yeah','have','has',
'an','a','the','for','here','what','your','can','you','may','of','course','going','home','go','it','problem','worries',
'worry','know','yet','hope','matter','room','floor','lift','ok','okay','come','coming','visit','back','now','then',
'right','left','after','before','so','but','or','and','too','also','only','very','much','really','again','soon','day',
'do','does','did','is','are','be','we','they','this','that','these','those','all','any','some','more','out','if','at',
'on','in','up','down','an','a'];
const NAME_OK=new Set(['anna','anne','ann','maria','marie','mary','kate','katie','john','jane','tom','tim','sam',
'alex','max','nick','mike','peter','paul','david','daniel','james','robert','george','helen','laura','julia',
'olivia','emma','sophie','sofia','clara','lucy','sarah','rachel','ruth','grace','faith','hope','may','june',
'rose','lily','iris','ruby','pearl','olive','daisy','amber','joy','dawn','summer','wren','eve','ivy','ada',
'mark','frank','miles','ray','will','jack','ben','matt','rob','bill','joe','leo','hugo','oscar','felix',
'masha','maria','ekaterina','katya','sasha','dasha','nastya','olga','svetlana','sveta','natasha','natalia',
'irina','ira','tatiana','tanya','lyudmila','oksana','yulia','julia','alyona','ksenia','vera','nadezhda',
'nadya','lyubov','galina','zinaida','zhanna','elizaveta','liza','margarita','rita','polina','arina','sonya',
'dmitry','dima','sergey','seryozha','andrey','alexey','lyosha','nikolay','kolya','vladimir','vova','mikhail',
'misha','evgeny','zhenya','igor','oleg','boris','artyom','timur','ruslan','vadim','lev','ivan','vanya',
'pavel','pasha','denis','egor','yaroslav','stanislav','vyacheslav','anatoly','gennady','valery','arkady',
'roman','roma','kirill','nikita','anton','maxim','stepan','fyodor','grigory','konstantin','viktor','yuri',
'petrova','ivanova','sokolova','smirnov','popov','kuznetsov','brown','smith','jones','wilson','taylor']);
const NOT_NAME=new Set(['banana','pizza','apple','orange','potato','tomato','burger','coffee','water','bread',
'cat','dog','fish','bird','horse','mouse','table','chair','door','window','book','phone','car','house','tree',
'lorem','ipsum','dolor','test','testing','asdf','asdfgh','qwerty','xyz','abc','blah','hmm','uh','um','eh',
'why','who','when','where','which','because','maybe','nothing','something','anything','everything','nobody',
'fuck','fucking','shit','damn','bitch','ass','crap','hell','idiot','stupid']);
const looksLikeName = x =>
  x.length>=2 && x.length<=15 &&
  /^[a-z']+$/.test(x) &&
  /[aeiouy]/.test(x) &&
  !/(.)\1\1/.test(x) &&
  !/[bcdfghjklmnpqrstvwxz]{4}/.test(x) &&
  !/(ing|ed|ly|tion|ness|ment)$/.test(x);
const cap = x => x.charAt(0).toUpperCase()+x.slice(1);
const pickName = (w, skip, strict)=>{
  for(let i=0;i<w.length-1;i++){
    const pair=(w[i]==='name'&&w[i+1]==='is')||(w[i]==='i'&&w[i+1]==='am')||
               (w[i]==='call'&&w[i+1]==='me')||(w[i]==='this'&&w[i+1]==='is');
    if(pair){ const x=w[i+2];
      if(x&&!NOT_NAME.has(x)&&!NUM.hasOwnProperty(x)&&
         (NAME_OK.has(x)||(!SVC.includes(x)&&!NAME_STOP.includes(x)&&looksLikeName(x)))) return cap(x); }
  }
  const s=new Set([...SVC,...skip]);
  const c=w.find(x=>{
    if(s.has(x)||NUM.hasOwnProperty(x)||NOT_NAME.has(x)) return false;
    if(NAME_OK.has(x)) return true;
    return strict ? false : looksLikeName(x);
  });
  return c ? cap(c) : null;
};
const introduced = w => {
  for(let i=0;i<w.length-1;i++){
    if(w[i]==='name'&&w[i+1]==='is') return true;
    if(w[i]==='i'&&w[i+1]==='am') return true;
    if(w[i]==='call'&&w[i+1]==='me') return true;
    if(w[i]==='this'&&w[i+1]==='is') return true;
  }
  return false;
};
const sigWords = (w, extra)=>{
  const ex = extra || [];
  return w.filter(x=> x.length>1 && !SVC.includes(x) && !ex.includes(x));
};

const Lesson = {
  st:1, idx:0, lv:null, step:0, lives:5, right:0, total:0, mode:'', picked:null, built:[],
  start(st, idx, from){
    this.st=st; this.idx=idx; this.lv = getCourse(S.lang, st)[idx];
    this.step=from|0; this.lives=5; this.right=0; this.picked=null; this.failStep=0;
    const sc = SCENES[this.lv.scene], L = lang();
    $('scene-img').src = `assets/scenes/${L.scenes}/${sc.img}`;
    $('l-scene').textContent = sc.label;
    $('l-kind').textContent = `${levelKind(this.lv.type)} · ${this.lv.title}`;
    if (S.sound.amb) Sound.ambience(sc.amb);
    this.total = this.lv.type==='words' ? this.lv.words.length
               : this.lv.type==='build' ? this.lv.tasks.length
               : this.lv.variant==='lost' ? 6
               : this.lv.variant==='flow' ? Object.keys(this.lv.flow.nodes).length
               : this.lv.turns.filter(t=>t.who==='you').length;
    this.hearts();
    go('sc-lesson');
    if (this.lv.type==='dialog') this.dialogInit(); else this.render();
  },
  hearts(animateLoss){
    const h=$('hearts'); h.innerHTML='';
    for(let i=0;i<5;i++){
      // Apple-эмодзи — тот же набор, что и ракета в графитовой версии
      const d=document.createElement('img');
      d.src=`${EMOJI}/2764-fe0f.png`;
      d.alt='';
      const gone = i>=this.lives;
      d.className='heart'+(gone?' gone':'');
      if (gone && animateLoss && i===this.lives) d.classList.add('losing');
      h.appendChild(d);
    }
  },
  loseLife(){
    this.lives--;
    this.hearts(true);
    Sound.fx('wrong');
    if (this.lives <= 0){
      // сердца кончились — запоминаем место, чтобы не терять пройденное
      this.failStep = this.step;
      setTimeout(()=>this.finish(true), 900);
      return true;
    }
    return false;
  },
  prog(){
    const pct = this.total ? Math.max(6, this.step/this.total*100) : 6;
    $('l-prog').style.width = pct+'%';
  },
  voices:[],
  _pickVoice(code){
    const all = this.voices.length ? this.voices : (speechSynthesis.getVoices() || []);
    if (!all.length) return null;
    const base = (code||'en').split('-')[0].toLowerCase();
    return all.find(v => (v.lang||'').toLowerCase() === code.toLowerCase())
        || all.find(v => (v.lang||'').toLowerCase().replace('_','-').startsWith(base))
        || null;
  },
  /* ОЗВУЧКА.
     Во встроенном браузере Telegram НЕТ speechSynthesis — синтезировать
     текст на лету нечем. Поэтому все фразы курса начитаны заранее
     в assets/voice/<язык>/*.m4a (см. tools-voice.py), а системный синтез
     остаётся запасным вариантом для обычных браузеров. */
  vmap:null, vmapTried:false, audio:null,
  loadVoiceMap(){
    if (this.vmapTried) return;
    this.vmapTried = true;
    fetch('assets/voice/index.json')
      .then(r=>r.ok ? r.json() : null)
      .then(j=>{ this.vmap = j || null; })
      .catch(()=>{ this.vmap = null; });
  },
  /* Очередь озвучки: реплики звучат по очереди, а не хором.
     say()  — встать в очередь (несколько реплик подряд не наложатся)
     say(t,{now:true}) — оборвать текущее и сказать немедленно */
  say(text, opts){
    const o = opts || {};
    if (!o.force && !S.sound.tts) return;
    if (!text) return;
    if (o.now) this.sayStop();
    this.q = this.q || [];
    this.q.push({ text, force: o.force });
    if (!this.qBusy) this.sayNext();
  },
  sayStop(){
    this.q = [];
    this.qBusy = false;
    if (this.audio){ try{ this.audio.pause(); }catch(e){} this.audio = null; }
    if ('speechSynthesis' in window){ try{ speechSynthesis.cancel(); }catch(e){} }
  },
  sayNext(){
    if (!this.q || !this.q.length){ this.qBusy = false; return; }
    this.qBusy = true;
    const item = this.q.shift();
    const text = item.text;
    const code = (S.lang || 'en');
    const done = ()=>{ this.qBusy = false; setTimeout(()=>this.sayNext(), 260); };

    // 1) заранее начитанный файл — работает везде, в том числе в Telegram
    const m = this.vmap && this.vmap[code] && this.vmap[code][text];
    if (m){
      try{
        if (this.audio){ try{ this.audio.pause(); }catch(e){} this.audio = null; }
        const a = new Audio('assets/voice/' + code + '/' + m + '.m4a');
        a.volume = 1;
        this.audio = a;
        a.onended = done;
        a.onerror = ()=>{ this.sayNative(text, done); };
        const pr = a.play();
        if (pr && pr.catch) pr.catch(()=>this.sayNative(text, done));
        return;
      }catch(e){ /* ниже запасной путь */ }
    }
    this.sayNative(text, done);
  },
  /* запасной путь: системный синтез (обычные браузеры) */
  sayNative(text, done){
    const fin = done || function(){};
    if (!('speechSynthesis' in window)){ fin(); return; }
    const code = lang().tts;
    try{
      speechSynthesis.cancel();
      if (speechSynthesis.paused) speechSynthesis.resume();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = code; u.rate = .92; u.volume = 1;
      const list = this.voices.length ? this.voices : (speechSynthesis.getVoices() || []);
      if (list.length){
        this.voices = list;
        const base = code.split('-')[0].toLowerCase();
        const v = list.find(x => (x.lang||'').toLowerCase() === code.toLowerCase())
               || list.find(x => (x.lang||'').toLowerCase().replace('_','-').startsWith(base));
        if (v) u.voice = v;
      } else {
        speechSynthesis.onvoiceschanged = ()=>{
          this.voices = speechSynthesis.getVoices() || [];
          speechSynthesis.onvoiceschanged = null;
        };
      }
      u.onend = fin; u.onerror = fin;
      speechSynthesis.speak(u);
      setTimeout(fin, Math.min(9000, 1200 + text.length * 75));   // страховка
    }catch(e){ fin(); }
  },
  fb(txt, ok){
    const f=$('l-feedback');
    f.textContent = txt;
    f.style.color = ok===true?'var(--moss)':ok===false?'var(--clay)':'var(--text-3)';
  },

  /* ---- 1. СЛОВА: узнавание + произнесение ---- */
  render(){
    this.prog();
    if (this.lv.type==='words') this.wordStep();
    else this.buildStep();
  },
  wordStep(){
    const w = this.lv.words[this.step];
    const body = $('l-body');
    body.innerHTML = '';
    const wrap = el('div','pad');
    const card = el('div','word-card');
    card.innerHTML = `
      <span class="kicker">${this.step+1} / ${this.total}</span>
      <div class="word-main" style="margin-top:10px">${w.t}</div>
      <div class="word-ru reveal" id="w-ru">${w.r}</div>
      ${w.u ? `<div class="word-use">${w.u}</div>` : ''}
      <button class="pill" style="margin:16px auto 0" id="w-say">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 010 7"/></svg>
        Послушать
      </button>`;
    wrap.appendChild(card);

    const hint = el('div','small');
    hint.style.cssText='text-align:center;margin-top:14px';
    hint.textContent = Voice.ok() ? 'Произнеси слово вслух — я послушаю.'
                                  : 'Скажи вслух, потом открой перевод.';
    wrap.appendChild(hint);
    body.appendChild(wrap);

    $('w-say').onclick = ()=>{ Sound.fx('tap'); this.say(w.t, {force:true}); };

    this.spoke = false;
    Voice.mount(wrap, w.t, (score)=>{ if (score >= .72) this.spoke = true; });

    let shown = false;
    this.fb('');
    const btn = $('l-action');
    btn.style.display = '';
    btn.textContent = 'Показать перевод';
    btn.className = 'btn ghost';
    btn.onclick = ()=>{
      if (!shown){
        shown = true; $('w-ru').classList.add('on'); Sound.fx('tap');
        btn.textContent = 'Знаю, дальше';
        btn.className = 'btn moss';
      } else {
        Voice.stop();
        Sound.fx('step'); S.stats.words++;
        if (this.spoke) S.stats.spoken = (S.stats.spoken||0) + 1;
        this.right++; this.next();
      }
    };
  },

  /* ---- 2. ПОСТРОЕНИЕ ПРЕДЛОЖЕНИЯ ---- */
  buildStep(){
    const t = this.lv.tasks[this.step];
    this.built = [];
    const body = $('l-body'); body.innerHTML='';
    const wrap = el('div','pad');
    wrap.innerHTML = `
      <div class="prompt-card" style="margin:0 0 14px">
        <span class="kicker">${this.step+1} / ${this.total} · собери фразу</span>
        <h3 class="sm" style="margin-top:6px;font-size:18px">${t.ru}</h3>
      </div>
      <div class="build-line" id="line"></div>
      <div class="bank" id="bank" style="margin-top:14px"></div>`;
    body.appendChild(wrap);

    const bank = $('bank'), line = $('line');
    const parts = [...t.parts].sort(()=>Math.random()-.5);
    parts.forEach((p,i)=>{
      const c = el('button','chip', p);
      c.onclick = ()=>{
        if (c.classList.contains('used')) return;
        c.classList.add('used'); this.built.push({w:p, chip:c});
        Sound.fx('type'); this.redrawLine();
      };
      bank.appendChild(c);
    });
    this.redrawLine = ()=>{
      line.innerHTML='';
      this.built.forEach((b,i)=>{
        const c = el('button','chip', b.w);
        c.onclick = ()=>{ b.chip.classList.remove('used'); this.built.splice(i,1); Sound.fx('back'); this.redrawLine(); };
        line.appendChild(c);
      });
      $('l-action').disabled = this.built.length === 0;
    };
    this.redrawLine();

    this.fb('');
    const btn = $('l-action');
    btn.style.display = '';
    btn.className='btn moss'; btn.textContent='Проверить';
    btn.onclick = ()=>{
      const said = this.built.map(b=>b.w).join(' ');
      const ok = said.replace(/\s+/g,' ').trim().toLowerCase() === t.answer.toLowerCase();
      S.stats.total++;
      let dead = false;
      if (ok){
        S.stats.right++; this.right++;
        Miss.ok(t.answer);
        Sound.fx('right'); this.fb(Voice.ok()?'Верно. Теперь произнеси.':'Верно. Скажи вслух ещё раз.', true);
        this.say(t.full || t.answer);
      } else {
        Miss.add(t.answer, t.ru, 'build');
        dead = this.loseLife();
        this.fb(dead ? 'Сердца кончились. Начнём уровень заново.' : ('Правильно: ' + (t.full || t.answer)), false);
        this.say(t.full || t.answer);
        // кнопка «Почему?» — правило именно для этой фразы
        if (!dead && t.why && !$('why-box')){
          const box = el('div',''); box.id = 'why-box'; box.style.marginTop = '10px';
          const b = el('button','pill','Почему?');
          b.style.margin = '0 auto';
          b.onclick = ()=>{
            Sound.fx('tap');
            if (box.querySelector('.why-text')) { box.querySelector('.why-text').remove(); return; }
            const w = el('div','why-text');
            w.innerHTML = `<b>${t.whyT || 'Правило'}</b><span>${t.why}</span>`;
            box.appendChild(w);
          };
          box.appendChild(b); wrap.appendChild(box);
        }
      }
      if (!dead && !$('say-here')){
        const slot = el('div',''); slot.id='say-here'; slot.style.marginTop='4px';
        wrap.appendChild(slot);
        Voice.mount(slot, t.full || t.answer, (score)=>{ if (score>=.72) S.stats.spoken=(S.stats.spoken||0)+1; });
      }
      btn.textContent = this.step < this.total-1 ? 'Дальше' : 'Завершить';
      btn.onclick = ()=>{ Voice.stop(); Sound.fx('step'); this.next(); };
    };
  },

  /* ---- 3. ДИАЛОГ: готовые реплики или свой ответ ---- */
  dialogInit(){
    if (this.lv.variant === 'lost'){ this.lostInit(); return; }
    if (this.lv.variant === 'flow'){ this.flowInit(); return; }
    this.turnIdx = 0;
    const body = $('l-body'); body.innerHTML = `
      <div class="pad" style="padding-bottom:2px">
        <div class="prompt-card" style="margin:0">
          <span class="kicker amber">Обстановка</span>
          <p class="small" style="margin-top:5px;color:var(--text-2)">${this.lv.intro}</p>
        </div>
      </div>
      <div class="chat" id="chat"></div>
      <div class="pad" id="answers" style="display:flex;flex-direction:column;gap:9px;padding-bottom:10px"></div>`;
        $('l-action').style.display='none';     // слушать можно у самой реплики (🔊)
    this.dialogAdvance();
  },
  bubble(who, text, tr){
    const b = el('div','bub '+who, `${text}${tr?`<span class="tr">${tr}</span>`:''}`);
    if (who === 'them'){
      const line = el('div','bub-line');
      line.appendChild(b);
      const rep = el('button','bub-say','🔊');
      rep.type = 'button';
      rep.setAttribute('aria-label','Слушать реплику');
      rep.onclick = ()=>{ Sound.fx('tap'); this.say(text, {now:true}); };
      line.appendChild(rep);
      $('chat').appendChild(line);
    } else {
      $('chat').appendChild(b);
    }
    const sc = $('l-body');
    if (sc.scrollHeight - sc.scrollTop - sc.clientHeight < 260)
      sc.scrollTop = sc.scrollHeight;
    return b;
  },
  dialogAdvance(){
    const turns = this.lv.turns;
    while (this.turnIdx < turns.length && turns[this.turnIdx].who === 'them'){
      const t = turns[this.turnIdx];
      this.bubble('them', t.text, t.ru);
      this.lastThem = t.text;
      this.say(t.text);
      this.turnIdx++;
    }
    if (this.turnIdx >= turns.length){ this.finish(); return; }
    this.askTurn(turns[this.turnIdx]);
  },
  askTurn(turn){
    const box = $('answers'); box.innerHTML='';
    this.fb('');                      // стираем отклик прошлого хода
    const hint = el('div','small', `Твой ход: ${turn.ru}`);
    hint.style.marginBottom='8px';
    box.appendChild(hint);

    const goNext = (delay)=>{
      setTimeout(()=>{ this.turnIdx++; box.innerHTML=''; this.dialogAdvance(); }, delay);
    };

    /* ---- разбор свободного ответа ----
       Задача: понять СМЫСЛ, а не сверить буквы. Разные верные способы
       сказать одно и то же обязаны засчитываться.                        */
    const judge = (said, best)=>{
      const norm = t => (t||'').toLowerCase().replace(/[\u2019']/g,"'").replace(/[^a-z' ]/g,' ')
                        .split(/\s+/).filter(Boolean);
      // "i'm" -> "i am", "it's" -> "it is" и т.п.
      const expand = arr => {
        const out=[];
        arr.forEach(x=>{
          const M={"i'm":['i','am'],"it's":['it','is'],"that's":['that','is'],"don't":['do','not'],
                   "doesn't":['does','not'],"can't":['can','not'],"i've":['i','have'],
                   "isn't":['is','not'],"what's":['what','is'],"let's":['let','us'],
                   "i'll":['i','will'],"we're":['we','are'],"you're":['you','are'],"he's":['he','is'],
                   "she's":['she','is'],"there's":['there','is'],"haven't":['have','not'],"won't":['will','not']};
          if (M[x]) out.push(...M[x]); else out.push(x.replace(/'/g,''));
        });
        return out;
      };
      // числа: "25" и "twenty five" — одно и то же
      const NUM = {zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,
                   ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,
                   seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,
                   sixty:60,seventy:70,eighty:80,ninety:90,hundred:100};
      const numOf = arr => {                 // сумма чисел во фразе: twenty five -> 25
        let tot=0, cur=0, any=false;
        arr.forEach(x=>{
          if (/^\d+$/.test(x)){ tot+=parseInt(x,10); any=true; return; }
          if (x in NUM){ any=true; cur += NUM[x]; }
        });
        return any ? tot+cur : null;
      };
      const rawSaid = (said||'').toLowerCase();
      const digits = (rawSaid.match(/\d+/g)||[]).map(Number);
      const w = expand(norm(said)), b = expand(norm(best));

      // группы взаимозаменяемых слов: сказал любое из группы — засчитано
      const SAME = [
        ['name','call','called'],                         // «my name is» / «call me»
        ['hi','hello','hey','morning','afternoon','evening'],
        ['bye','goodbye','see','later'],
        ['thanks','thank','cheers'],
        ['sorry','excuse','apologies'],
        ['want','like','need','would'],
        ['big','large'], ['small','little'],
        ['bag','suitcase','luggage','case'],
        ['lost','lose','missing','gone'],
        ['buy','get','take','purchase'],
        ['speak','talk','say','tell'],
        ['help','assist'],
        ['toilet','bathroom','restroom','wc'],
        ['shop','store'], ['flat','apartment'],
        ['ill','sick','unwell'],
        ['begin','start'], ['finish','end'],
        ['cheap','inexpensive'], ['expensive','dear','costly'],
        ['fast','quick','quickly'], ['slow','slowly'],
        ['near','close','nearby'], ['far','away'],
        ['money','cash'], ['bill','check'],
        ['doctor','gp'], ['medicine','medication','pills'],
        ['job','work'], ['home','house'],
        ['car','vehicle'], ['bus','coach'],
        ['food','meal'], ['drink','beverage'],
        ['happy','glad','pleased'], ['tired','sleepy'],
        ['nice','good','great','lovely','fine'],
        ['much','many','lot'],
        ['very','really','so'],
        ['maybe','perhaps'],
        ['yes','yeah','sure','ok','okay','course'],
        ['no','not','nope']
      ];
      const groupOf = x => { for (const g of SAME) if (g.includes(x)) return g; return null; };
      const saidRaw = ' ' + w.join(' ') + ' ';
      const covers = (x, arr)=>{
        if (arr.includes(x)) return true;
        // представиться можно двумя способами: «my name is X» и «I am X»
        if (x === 'name' && /\b(i am|my name|name is|call me)\b/.test(saidRaw)) return true;
        // однокоренное: work/works/working
        if (arr.some(y=> y.length>3 && x.length>3 &&
            (y.startsWith(x.slice(0,Math.max(4,x.length-2))) || x.startsWith(y.slice(0,Math.max(4,y.length-2)))))) return true;
        const g = groupOf(x);
        return !!(g && arr.some(y=>g.includes(y)));
      };

      // служебное и имена собственные из требований исключаем
      const stop = new Set(['a','an','the','is','am','are','was','were','be','do','does','did',
                            'to','of','and','my','i','you','it','in','on','at','for','with',
                            'this','that','have','has','can','will','would','please','me','we','they',
                            'well','actually']);
      const NAMES = new Set(['anna','petrova','maria','john','tom','peter','ivan','lev','park','street','russia']);
      const key = b.filter(x=>!stop.has(x) && !NAMES.has(x) && x.length>2);
      const bNum = numOf(b), sNum = numOf(w.concat(digits.map(String)));
      const numOk = bNum !== null && sNum !== null && bNum === sNum;
      const hit = key.filter(x=> covers(x, w) || (numOk && (x in NUM)));

      const notes = [];
      let ok;

      // ЭТИКЕТ-ФОРМУЛЫ. Чистый этикет — это не предмет, а смысловые части:
      // поблагодарить / попрощаться / извиниться / согласиться / отказаться.
      // «bye have a good day» на «Поблагодари и попрощайся» — это прощание:
      // принимаем, а про thanks мягко подсказываем, а не режем.
      const POLITE = new Set(['thank','thanks','please','sorry','yes','yeah','no','not','all',
                              'right','sure','okay','ok','too','also','goodbye','bye','welcome',
                              'good','fine','great','nice','course','will','would','here','there',
                              'you','me','have','got','same','see','later','day','night','back',
                              'soon','take','care','very','much','really','many','lot','all']);
      const CATS = [
        {id:'thank', ru:'поблагодарить', w:['thank','thanks','cheers','appreciate','grateful']},
        {id:'bye',   ru:'попрощаться',   w:['bye','goodbye','see','later','farewell','day','night','good']},
        {id:'sorry', ru:'извиниться',    w:['sorry','apologise','apologize','excuse','forgive']},
        {id:'yes',   ru:'согласиться',   w:['yes','yeah','sure','ok','okay','course','do','right']},
        {id:'no',    ru:'отказаться',    w:['no','not','nope','never']}
      ];
      const inCat = (cat, arr) => cat.w.some(x => covers(x, arr));
      const etcWords = b.filter(x => POLITE.has(x));
      const pureEtiquette = etcWords.length >= 1 && key.length > 0 &&
                            key.every(k => POLITE.has(k));
      if (pureEtiquette){
        const need = CATS.filter(c => inCat(c, b));
        const got  = CATS.filter(c => inCat(c, w));
        const extra = w.filter(x => !stop.has(x) && !POLITE.has(x) && x.length>3 && !covers(x, b));
        if (need.length === 0){
          // «Of course.», «That is right.» — просто вежливая мелочь: годится любой
          // вежливый отклик без постороннего.
          ok = extra.length === 0 && (got.length >= 1 || b.some(x => w.includes(x)));
        } else {
          ok = extra.length === 0 && got.length >= 1;
          if (ok){
            const miss = need.filter(c => got.indexOf(c) < 0);
            if (miss.length) notes.push('Не хватает: ' + miss.map(c=>c.ru).join(', ') + '.');
          } else {
            notes.push(extra.length
              ? 'Похоже, ты про другое — а нужно ' + need.map(c=>c.ru).join(' и ') + '.'
              : 'Нужно: ' + need.map(c=>c.ru).join(' и ') + '.');
          }
        }
      }
      else if (!key.length){
        const core2 = b.filter(x => !['a','an','the','to','of'].includes(x));
        const hit2  = core2.filter(x => covers(x, w));
        ok = core2.length ? hit2.length / core2.length >= .6 : w.length >= 1;
        const extra = w.filter(x => !stop.has(x) && x.length>3 && !covers(x, b));
        if (extra.length >= 2) ok = false;
      }
      else {
        ok = hit.length / key.length >= .5;
        // много лишнего про другое — это не ответ
        const extra = w.filter(x => !stop.has(x) && !POLITE.has(x) && x.length>3 &&
                       !covers(x, b) && !NAMES.has(x));
        if (extra.length >= 2) ok = false;
      }

      if (w.length < 1){
        return { ok:false, notes:[ /[а-яё]/i.test(said||'')
          ? 'Похоже на русский — попробуй по-английски.'
          : 'Пусто — напиши хоть слово.'] };
      }

      // грубая ошибка формы: «lose» вместо «lost» и т.п. — режем всегда
      const FORM = {lose:'lost', go:'went', buy:'bought', leave:'left', see:'saw',
                    take:'took', get:'got', tell:'told', find:'found', pay:'paid',
                    forget:'forgot', come:'came', give:'gave', make:'made', say:'said',
                    eat:'ate', drink:'drank', write:'wrote', speak:'spoke', break:'broke'};
      let formErr = null;
      for (const base in FORM){
        if (w.includes(base) && b.includes(FORM[base])){
          ok = false; formErr = `Форма глагола: прошедшее от ${base} — ${FORM[base]}, не ${base}.`;
          break;
        }
      }

      // ПРЕДМЕТ РЕЧИ: длинный ответ, где заменено главное слово, — отклоняем.
      // (Короткий «одно слово» с главным словом не режем — см. ниже.)
      const VERBS = new Set(['want','like','need','have','get','take','buy','go','come','say',
                             'tell','see','know','think','make','give','pay','speak','help',
                             'lost','lose','live','work','look','meet','prefer','would','will',
                             'too','also','very','really','well','good','nice','great','fine',
                             'please','thanks','thank','sorry','yes','yeah','sure','okay','ok',
                             'now','then','here','there','much','many','lot','more','some','any',
                             'about','just','only','still','again','soon','later','all','right']);
      const core = key.filter(x => !VERBS.has(x));
      const coreWord = core.length ? core[core.length - 1] : null;
      if (!pureEtiquette && coreWord && !covers(coreWord, w) && !(numOk && (coreWord in NUM))){
        // «Where is it?» вместо «Where is the room?» — предмет заменён местоимением,
        // вопрос тот же: не режем.
        const proRef = b.includes('where') && w.includes('where') &&
                       (w.includes('it') || w.includes('there') || w.includes('this') || w.includes('that'));
        const otherSubject = !proRef && (w.length > 3 || !core.some(x => covers(x, w)));
        if (otherSubject){
          ok = false;
          notes.push('Речь про другое: нужно сказать про ' + coreWord + '.');
        }
      }

      // КОРОТКИЙ ОТВЕТ НЕ БЛОКИРУЕТ: сказал главное слово — принято,
      // полная фраза показывается рядом как образец.
      if (!ok && !formErr && !pureEtiquette && key.length > 0 && w.length <= 3){
        const hitCore = core.filter(x => covers(x, w));
        const extra2 = w.filter(x => !stop.has(x) && !POLITE.has(x) && x.length>3 &&
                        !covers(x, b) && !NAMES.has(x));
        if (hitCore.length >= 1 && extra2.length === 0){
          ok = true;
          if (w.length < 3) notes.push('Одного слова тут хватает.');
        }
      }

      // «Ответь тем же»: The same to you / Me too == Nice to meet you too
      if (!ok && !formErr && key.includes('meet') &&
          (w.includes('same') || w.includes('likewise') || (w.includes('me') && w.includes('too')))){
        ok = true;
        notes.push('«The same to you» — обычный ответ на «Nice to meet you».');
      }

      // НАЗВАТЬ СЕБЯ ИМЕНЕМ: задание «my name is X» — одно-два слова и есть имя.
      // («Anna», «Masha Petrova» — естественный ответ на «Назови имя», без «my name is».)
      if (!ok && !formErr && key.includes('name') && b.some(x => x === 'name') &&
          w.length >= 1 && w.length <= 2 &&
          w.every(x => x.length > 1 && !stop.has(x) && !POLITE.has(x) && !VERBS.has(x))){
        ok = true;
        notes.push('Имя само по себе — ответ. В образце полная форма.');
      }
      /* --- замечания. При «поняли» — только полезное, без придирок --- */
      if (ok){
        const other = w.filter(x=>!stop.has(x) && !b.includes(x) && x.length>2);
        if (other.length && b.some(x=>NAMES.has(x)))
          notes.push('Своё имя — так и надо. В образце просто пример.');
        const said_s = w.join(' '), best_s = b.join(' ');
        if (said_s !== best_s) notes.push('Можно и так, и так — смысл донесён.');
      } else {
        if (w.length < 2) notes.push('Слишком коротко — ответь целой фразой.');
        if (formErr) notes.push(formErr);
        const missed = key.filter(x=>!hit.includes(x)).slice(0,3);
        if (missed.length) notes.push('Не хватает по смыслу: ' + missed.join(', ') + '.');
        if (hit.length) notes.push('Есть главное: ' + hit.slice(0,4).join(', ') + '.');
      }
      return { ok, notes };
    };

    const verdict = (said, best)=>{
      const r = judge(said, best);
      const v = el('div','verdict');
      v.innerHTML =
        (r.ok ? '<b class="g">Тебя поняли.</b>' : '<b class="r">Так не поймут.</b>') +
        (r.notes.length ? '<ul>' + r.notes.map(n=>`<li>${n}</li>`).join('') + '</ul>' : '') +
        `<ul><li>${r.ok ? 'Ещё вариант' : 'Носитель сказал бы'}: <b>${best}</b></li></ul>`;
      box.appendChild(v);
      setTimeout(()=>v.scrollIntoView({behavior:'smooth', block:'nearest'}), 60);
      return r.ok;
    };

    /* ---- главный путь: сказать своими словами ---- */
    const ta = el('textarea','free-input'); ta.rows = 2;
    ta.placeholder = Voice.ok() ? 'Напиши или надиктуй свой ответ…' : 'Напиши свой ответ…';
    box.appendChild(ta);

    const rowA = el('div','ans-row');
    const send = el('button','btn moss','Ответить');
    rowA.appendChild(send);

    if (Voice.ok()){
      const dict = el('button','btn ghost','Надиктовать');
      dict.onclick = ()=>{
        if (Voice.busy){ Voice.stop(); dict.textContent='Надиктовать'; return; }
        dict.textContent='Слушаю…'; dict.classList.add('rec');
        Voice.listen(turn.options[turn.best], {
          onresult:(res)=>{
            dict.classList.remove('rec'); dict.textContent='Надиктовать';
            if (res.heard) ta.value = res.heard;
            else if (res.err==='denied'){ this.fb('Микрофон не разрешён.', false); Voice.help(); }
            else this.fb('Не расслышал.', false);
          }
        });
      };
      rowA.appendChild(dict);
    }
    box.appendChild(rowA);

    const dunno = mkDunno();
    box.appendChild(dunno);

    let tries = 0;                     // сколько раз уже отвечал на этот ход
    send.onclick = ()=>{
      const v = ta.value.trim(); if (!v) return;
      const best = turn.options[turn.best];
      const myBub = this.bubble('you', v);
      S.stats.total++;
      const ok = verdict(v, best);
      tries++;

      if (ok){
        ta.disabled = true; send.disabled = true; dunno.remove();
        this.right++; S.stats.right++; Sound.fx('right');
        Miss.ok(best);
        this.say(best, {now:true});
        this.step++; this.prog();
        const go = el('button','btn moss wide', 'Дальше');
        go.onclick = ()=>{ this.sayStop(); Sound.fx('step'); goNext(0); };
        box.appendChild(go);
        return;
      }

      // ОШИБКА. Первый промах — даём переписать, жизнь не снимаем.
      Sound.fx('wrong');
      if (tries === 1){
        const fix = el('button','btn moss wide', 'Исправить ответ');
        fix.onclick = ()=>{
          this.sayStop();
          if (myBub) myBub.remove();                    // убираем неудачную реплику
          box.querySelectorAll('.verdict').forEach(x=>x.remove());
          fix.remove();
          ta.disabled = false; send.disabled = false;
          ta.scrollIntoView({behavior:'smooth', block:'nearest'});
          ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
        };
        box.appendChild(fix);
        ta.disabled = true; send.disabled = true;
        const tip = el('div','small'); tip.style.marginTop='6px';
        tip.textContent = 'Можно поправить свой ответ — это ещё не ошибка.';
        box.appendChild(tip);
        setTimeout(()=>fix.scrollIntoView({behavior:'smooth', block:'nearest'}), 260);
        return;
      }

      // Второй промах подряд — вот теперь считается.
      ta.disabled = true; send.disabled = true; dunno.remove();
      Miss.add(best, turn.ru, 'dialog');
      const dead = this.loseLife();
      if (dead) return;
      this.say(best, {now:true});
      this.step++; this.prog();
      const go = el('button','btn moss wide', 'Дальше');
      go.onclick = ()=>{ this.sayStop(); Sound.fx('step'); goNext(0); };
      box.appendChild(go);
      setTimeout(()=>go.scrollIntoView({behavior:'smooth', block:'nearest'}), 260);
    };

    /* ---- страховка: варианты по запросу ---- */
    dunno.onclick = ()=>{
      dunno.remove(); ta.remove(); rowA.remove();
      const opts = turn.options.map((o,i)=>({o,i})).sort(()=>Math.random()-.5);
      opts.forEach(({o,i})=>{
        const b = el('button','opt', o);
        b.onclick = ()=>{
          [...box.querySelectorAll('.opt')].forEach(x=>x.style.pointerEvents='none');
          const ok = i === turn.best;
          b.classList.add(ok?'ok':'no');
          S.stats.total++;
          if (ok){ S.stats.right += .5; this.right += .5; Sound.fx('right'); }
          else {
            const dead = this.loseLife();
            const good = [...box.querySelectorAll('.opt')].find(x=>x.textContent===turn.options[turn.best]);
            if (good) good.classList.add('ok');
            const bad = el('div','why-text');
            bad.innerHTML = '<b>Так не говорят</b><span>' +
              (turn.whyBad || 'Слова стоят не в том порядке. По-английски порядок жёсткий: сначала кто, потом что делает.') +
              '</span>';
            box.appendChild(bad);
            if (dead) return;
          }
          this.bubble('you', ok?o:turn.options[turn.best]);
          this.say(ok?o:turn.options[turn.best], {now:true});
          this.step++; this.prog();
          const go = el('button','btn moss wide', 'Дальше');
          go.onclick = ()=>{ this.sayStop(); Sound.fx('step'); goNext(0); };
          box.appendChild(go);
        };
        box.appendChild(b);
      });
    };
  },


  /* ================================================================
     ВЕТВЯЩИЙСЯ ДИАЛОГ (variant:'lost') — «разговор идёт за тобой».
     Сценарий не навязывает предмет: что потерял — решает игрок.
     Одно слово не блокирует, а рядом показывается полная фраза.
     Незнакомое слово НЕ подменяется молча сумкой.
     ================================================================ */
  lostInit(){
    this.lMem = {}; this.at = 'greet';
    const body = $('l-body'); body.innerHTML = `
      <div class="pad" style="padding-bottom:2px">
        <div class="prompt-card" style="margin:0">
          <span class="kicker amber">Обстановка</span>
          <p class="small" style="margin-top:5px;color:var(--text-2)">${this.lv.intro}</p>
        </div>
      </div>
      <div class="chat" id="chat"></div>
      <div class="pad" id="answers" style="display:flex;flex-direction:column;gap:9px;padding-bottom:10px"></div>`;
        $('l-action').style.display='none';     // слушать можно у самой реплики (🔊)
    this.lostNode();
  },
  lostFind(id){ return (this.lv.lost.nodes||[]).find(n=>n.id===id); },
  lostNext(){
    switch(this.at){
      case 'greet':     return 'what';
      case 'what':      return this.lMem.thing ? 'where' : 'whatthing';
      case 'whatthing': return 'where';
      case 'where':     return (this.lMem.place && this.lMem.place !== 'here') ? 'callplace' : 'search';
      case 'callplace':
      case 'search':    return 'end';
      case 'end':       return null;
    }
    return null;
  },
  lostNode(){
    const node = this.lostFind(this.at);
    if (!node){ this.finish(); return; }
    if (node.them){
      this.bubble('them', node.them, node.ruThem);
      this.lMem.lastThem = node.them;
      this.say(node.them);
    }
    this.lostAsk(node);
  },
  lostAsk(node){
    const cfg = this.lv.lost, box = $('answers');
    box.innerHTML = ''; this.fb('');
    const norm = t => (t||'').toLowerCase().replace(/[\u2019']/g,"'").replace(/[^a-z' ]/g,' ')
                      .split(/\s+/).filter(Boolean);
    const expand = arr => { const out=[]; arr.forEach(x=>{
      if (x==="i'm") out.push('i','am'); else if (x==="it's") out.push('it','is');
      else if (x==="i've") out.push('i','have'); else if (x==="don't") out.push('do','not');
      else if (x==="what's") out.push('what','is'); else if (x==="can't") out.push('can','not');
      else out.push(x.replace(/'/g,'')); }); return out; };
    const has = (w, arr) => arr.some(x=>w.includes(x));
    const findThing = w => { for (const x of w){ if (cfg.ruThings[x]) return x;
      if (cfg.alias[x] && cfg.ruThings[cfg.alias[x]]) return cfg.alias[x]; } return null; };
    const ruThing = id => (cfg.ruThings[id] ? cfg.ruThings[id] : id);

    /* разбор свободного ответа: ok / short (принято) / no (блок) */
    const judgeNode = said => {
      const rawS = (said||'').toLowerCase();
      const w = expand(norm(said));
      if (!w.length) return {lvl:'no', notes:[
        /[а-яё]/i.test(rawS) ? 'Похоже на русский — попробуй по-английски.' : 'Пусто — напиши хоть слово.'
      ]};
      if (node.kind==='greet'){
        const g = has(w, cfg.greet);
        const skip = cfg.greet.concat(['my','name','is','i','am','im','call','me','please',
          'help','can','you','the','a','an','good','nice','to','meet','lost','need','sir']);
        const nameWord = w.find(x=> x.length>1 && skip.indexOf(x) < 0);
        if (nameWord) this.lMem.name = nameWord.charAt(0).toUpperCase() + nameWord.slice(1);
        if (g && nameWord) return {lvl:'ok', notes:['Поздоровался и назвал себя.']};
        if (nameWord)     return {lvl:'short', notes:['Имя есть. С «Hi» звучит теплее.']};
        return {lvl:'short', notes:['Имя не расслышал — но идём дальше.']};
      }
      if (node.kind==='what'){
        const thing = findThing(w), verb = has(w, cfg.lose);
        if (thing) this.lMem.thing = thing;
        if (thing && verb) return {lvl:'ok', notes:['Понятно: потерял '+ruThing(thing)+'.']};
        if (thing)         return {lvl:'short', notes:['Понял: '+ruThing(thing)+'. Целой фразой яснее.']};
        if (verb){ this.lMem.thing = null; return {lvl:'short', notes:['Понял, что-то пропало. Сейчас уточню что.']}; }
        return {lvl:'no', notes:['Скажи, что случилось: потерял, украли, забыл.']};
      }
      if (node.kind==='whatthing'){
        const thing = findThing(w);
        if (thing){ this.lMem.thing = thing; return {lvl:'ok', notes:['Записал: '+ruThing(thing)+'.']}; }
        return {lvl:'no', notes:['Такого слова не знаю. Скажи проще: phone, bag, wallet, keys, passport.']};
      }
      if (node.kind==='where'){
        const p = cfg.places.find(x=>w.includes(x));
        if (p){ this.lMem.place = p;
          return {lvl:'ok', notes:[w.length < 3 ? 'Одного слова тут хватает.' : 'Место понятно.']}; }
        this.lMem.place = null;
        return {lvl:'short', notes:['Место не разобрал — будем искать рядом.']};
      }
      if (node.kind==='desc'){
        const c = cfg.colors.find(x=>w.includes(x)), z = cfg.sizes.find(x=>w.includes(x));
        if (c && z) return {lvl:'ok', notes:['Цвет и размер — этого достаточно.']};
        if (c || z) return {lvl:'ok', notes:['Понятно: '+(c||z)+'.']};
        return {lvl:'short', notes:['Цвет или размер не разобрал — запишу как есть.']};
      }
      if (node.kind==='agree') return {lvl:'ok', notes:['Идём искать.']};
      /* end */
      const t = has(w, cfg.thanks), b = has(w, cfg.bye);
      if (t && b) return {lvl:'ok', notes:['Поблагодарил и попрощался — как надо.']};
      if (b)       return {lvl:'ok', notes:['Прощание принято. С «thanks» было бы теплее.']};
      if (t)       return {lvl:'ok', notes:['Благодарность принята. С прощанием было бы теплее.']};
      return {lvl:'short', notes:['Похоже на прощание — засчитано.']};
    };

    const hint = el('div','small', 'Твой ход: '+node.task);
    hint.style.marginBottom='8px';
    box.appendChild(hint);

    const ta = el('textarea','free-input'); ta.rows = 2;
    ta.placeholder = Voice.ok() ? 'Напиши или надиктуй свой ответ…' : 'Напиши свой ответ…';
    box.appendChild(ta);

    const rowA = el('div','ans-row');
    const send = el('button','btn moss','Ответить');
    rowA.appendChild(send);
    if (Voice.ok()){
      const dict = el('button','btn ghost','Надиктовать');
      dict.onclick = ()=>{
        if (Voice.busy){ Voice.stop(); dict.textContent='Надиктовать'; return; }
        dict.textContent='Слушаю…'; dict.classList.add('rec');
        Voice.listen(node.best, {
          onresult:(res)=>{
            dict.classList.remove('rec'); dict.textContent='Надиктовать';
            if (res.heard) ta.value = res.heard;
            else if (res.err==='denied'){ this.fb('Микрофон не разрешён.', false); Voice.help(); }
            else this.fb('Не расслышал.', false);
          }
        });
      };
      rowA.appendChild(dict);
    }
    box.appendChild(rowA);

    const dunno = mkDunno();
    box.appendChild(dunno);
    let tries = 0;

    /* ход принят: показываем отклик и кнопку дальше */
    const accept = (r, sample)=>{
      const head = r.lvl==='ok' ? 'Тебя поняли.' : 'Поняли. Идём дальше.';
      const v = el('div','verdict');
      v.innerHTML = `<b class="${r.lvl==='ok'?'g':'a'}">${head}</b>` +
        (r.notes.length ? '<ul>'+r.notes.map(n=>`<li>${n}</li>`).join('')+'</ul>' : '') +
        (r.lvl==='ok' ? '' : `<ul><li>Целиком это звучит так: <b>${sample}</b></li></ul>`);
      box.appendChild(v);
      S.stats.total++; S.stats.right++;
      this.right++; this.step++; this.prog();
      Sound.fx('right'); Miss.ok(sample);
      this.say(sample, {now:true});
      const nextId = this.lostNext();
      const go = el('button','btn moss wide', nextId ? 'Дальше' : 'Завершить');
      go.onclick = ()=>{
        this.sayStop(); Sound.fx('step');
        if (!nextId){ this.total = Math.max(this.step, 1); this.finish(); return; }
        this.at = nextId; box.innerHTML=''; this.lostNode();
      };
      box.appendChild(go);
      setTimeout(()=>go.scrollIntoView({behavior:'smooth', block:'nearest'}), 260);
    };

    send.onclick = ()=>{
      const v = ta.value.trim(); if (!v) return;
      const myBub = this.bubble('you', v);
      const r = judgeNode(v);
      tries++;
      if (r.lvl !== 'no'){
        ta.disabled = true; send.disabled = true; dunno.remove();
        this.sayStop();
        accept(r, node.best);
        return;
      }
      Sound.fx('wrong');
      if (tries === 1){
        const tip = el('div','small');
        tip.textContent = 'Можно поправить свой ответ — это ещё не ошибка.';
        tip.style.marginTop='6px';
        const fix = el('button','btn moss wide','Исправить ответ');
        fix.onclick = ()=>{
          this.sayStop();
          if (myBub) myBub.remove();
          box.querySelectorAll('.verdict').forEach(x=>x.remove());
          fix.remove(); tip.remove();
          ta.disabled = false; send.disabled = false;
          ta.scrollIntoView({behavior:'smooth', block:'nearest'});
          ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
        };
        ta.disabled = true; send.disabled = true;
        box.appendChild(fix); box.appendChild(tip);
        setTimeout(()=>fix.scrollIntoView({behavior:'smooth', block:'nearest'}), 260);
        return;
      }
      /* второй промах подряд — ошибка, показываем образец и идём дальше */
      ta.disabled = true; send.disabled = true; dunno.remove();
      Miss.add(node.best, node.task, 'dialog');
      const dead = this.loseLife();
      if (dead) return;
      if (node.kind==='whatthing' && !this.lMem.thing) this.lMem.thing = 'phone';
      const v2 = el('div','verdict');
      v2.innerHTML = `<b class="r">Так не поймут.</b><ul>` +
        (r.notes||[]).map(n=>`<li>${n}</li>`).join('') +
        `<li>Например: <b>${node.best}</b></li></ul>`;
      box.appendChild(v2);
      this.say(node.best, {now:true});
      this.step++; this.prog();
      const nextId = this.lostNext();
      const go = el('button','btn moss wide','Дальше');
      go.onclick = ()=>{
        this.sayStop(); Sound.fx('step');
        if (!nextId){ this.total = Math.max(this.step, 1); this.finish(); return; }
        this.at = nextId; box.innerHTML=''; this.lostNode();
      };
      box.appendChild(go);
      setTimeout(()=>go.scrollIntoView({behavior:'smooth', block:'nearest'}), 260);
    };

    /* страховка: готовые фразы. Любая из них — правильный пример,
       и она сама выбирает ветку (сказал wallet — дальше про кошелёк). */
    dunno.onclick = ()=>{
      dunno.remove(); ta.remove(); rowA.remove();
      (node.opts && node.opts.length ? node.opts : [node.best]).forEach(o=>{
        const b = el('button','opt', o);
        b.onclick = ()=>{
          [...box.querySelectorAll('.opt')].forEach(x=>x.style.pointerEvents='none');
          const r = judgeNode(o);
          this.bubble('you', o);
          b.classList.add('ok');
          accept(r, o);
        };
        box.appendChild(b);
      });
    };
  },
  next(){
    this.step++;
    if (this.lives <= 0){ this.finish(true); return; }
    if (this.step >= this.total){ this.finish(); return; }
    this.render();
  },

  finish(failed){
    Voice.stop(); STT.stop(); Sound.duck(false); this.sayStop();
    const acc = this.total ? Math.round(this.right/this.total*100) : 100;
    if (!failed) Progress.mark(this.st, this.idx, acc/100);
    save();
    Sound.fx(failed?'wrong':'done');
    if (S.sound.amb) Sound.ambience(STAGES[this.st].amb);

    $('done-bg').style.backgroundImage = `url('${STAGES[this.st].art}')`;
    $('done-kicker').textContent = failed ? 'Срыв' : `${STAGES[this.st].cefr} · уровень пройден`;
    $('done-title').textContent = failed ? 'Сердца кончились' : ['Хорошо','Чисто сделано','Ты выше, чем был'][Math.floor(Math.random()*3)];
    const backTo = failed ? Math.max(0, (this.failStep|0) - 1) : 0;   // на шаг назад
    $('done-text').textContent = failed
      ? (backTo > 0
          ? `Пять ошибок — сердца кончились. Пройденное осталось при тебе: продолжишь с задания ${backTo+1}, а не с начала.`
          : 'Пять ошибок — сердца кончились. Отдышись и пройди уровень ещё раз.')
      : `${levelKind(this.lv.type)}: ${this.lv.title}. Следующий кусок тропы открыт.`;
    $('done-acc').textContent = acc + '%';
    $('done-stage').textContent = `${this.st} · ${STAGES[this.st].name}`;

    const arr = getCourse(S.lang, this.st);
    const nextIdx = this.idx + 1;
    const btn = $('done-next');
    if (failed){
      btn.textContent = backTo > 0 ? 'Продолжить с этого места' : 'Начать уровень заново';
      btn.onclick = ()=>{ Sound.fx('step'); Lesson.start(this.st, this.idx, backTo); };
    } else if (nextIdx < arr.length){
      btn.textContent = `Дальше: ${levelKind(arr[nextIdx].type)}`;
      btn.onclick = ()=>{ Sound.fx('step'); Lesson.start(this.st, nextIdx); };
    } else if (this.st < 5){
      btn.textContent = `Этап ${this.st+1} · ${STAGES[this.st+1].cefr}`;
      btn.onclick = ()=>{ S.stage=this.st+1; save(); Sound.fx('unlock'); Trail.open(); Trail.zoom(this.st+1); };
    } else {
      btn.textContent = failed ? 'Начать уровень заново' : 'Повторить уровень';
      btn.onclick = ()=>{ Sound.fx('step'); Lesson.start(this.st, this.idx); };
    }
    go('sc-done');
  },

  /* ---------- ветвящийся диалог (variant:'flow') — узлы с судьями из lessons.js ----------
     Механика демо-5: ответ игрока судит judge узла; понятый ответ выбирает ветку tr,
     «не понял» (huh) — переспрос; пусто/русский — подсказка. */
  flowInit(){
    this.lMem = {};
    const flow = this.lv.flow;
    this.at = (flow.start && flow.nodes[flow.start]) ? flow.start : Object.keys(flow.nodes)[0];
    const body = $('l-body'); body.innerHTML = `
      <div class="pad" style="padding-bottom:2px">
        <div class="prompt-card" style="margin:0">
          <span class="kicker amber">Обстановка</span>
          <p class="small" style="margin-top:5px;color:var(--text-2)">${this.lv.intro}</p>
        </div>
      </div>
      <div class="chat" id="chat"></div>
      <div class="pad" id="answers" style="display:flex;flex-direction:column;gap:9px;padding-bottom:10px"></div>`;
        $('l-action').style.display='none';     // слушать можно у самой реплики (🔊)
    if (flow.opener && flow.opener.them){
      this.bubble('them', flow.opener.them, flow.opener.ru || '');
      this.lMem.lastThem = flow.opener.them;
      this.say(flow.opener.them);
    }
    this.flowNode();
  },
  flowNode(){
    const node = this.lv.flow.nodes[this.at];
    if (!node){ this.finish(); return; }
    if (node.them){
      this.bubble('them', node.them, node.ruThem || '');
      this.lMem.lastThem = node.them;
      this.say(node.them);
    }
    this.flowAsk(node);
  },
  flowJudge(node, said){
    /* нормализация + числа + вызов судьи узла — как в демо-5 */
    const raw = said || '';
    this.lMem._digits = (raw.match(/\d+/g) || []);
    this.lMem._raw = raw;
    const w = expand(norm(raw));
    if (!w.length && !this.lMem._digits.length){
      return { huh:1, note: /[а-яё]/i.test(raw)
        ? 'Похоже на русский — попробуй по-английски.'
        : 'Пусто — напиши хоть слово.' };
    }
    try { return node.judge(w, this.lMem); }
    catch(e){ return { huh:1, note:'Не разобрал. Скажи иначе.' }; }
  },
  flowTr(node, res){
    /* ветка ответа; страховка: эталон или первая ветка, если судья вернул huh */
    if (res && !res.huh && node.tr && node.tr[res.br]) return node.tr[res.br];
    const keys = Object.keys(node.tr || {});
    return keys.length ? node.tr[keys[0]] : null;
  },
  flowReact(node, tr, sample, count){
    /* понятый ответ: реплика собеседника по ветке + статистика + «Дальше» */
    if (count){
      this.right++; this.step++; this.prog();
      S.stats.total++; S.stats.right++;
      Sound.fx('right');
      Miss.ok(sample);
    }
    const nm = this.lMem.name || '…';
    const dm = this.lMem.day ? cap(this.lMem.day) : '…';
    const fill = s => s.replace(/\{name\}/g, nm).replace(/\{day\}/g, dm);
    const txt = tr.them ? fill(tr.them) : '';
    const rut = tr.ruThem ? fill(tr.ruThem) : '';
    if (txt){
      this.bubble('them', txt, rut);
      this.lMem.lastThem = txt;
      this.say(txt, {now:true});
    } else {
      this.say(sample, {now:true});
    }
    const nextId = tr.next && this.lv.flow.nodes[tr.next] ? tr.next : null;
    const go = el('button','btn moss wide', nextId ? 'Дальше' : 'Завершить');
    go.onclick = ()=>{
      this.sayStop(); Sound.fx('step');
      if (!nextId){ this.total = Math.max(this.step, 1); this.finish(); return; }
      this.at = nextId; $('answers').innerHTML=''; this.flowNode();
    };
    $('answers').appendChild(go);
    setTimeout(()=>go.scrollIntoView({behavior:'smooth', block:'nearest'}), 260);
  },
  flowAsk(node){
    const box = $('answers');
    box.innerHTML = ''; this.fb('');
    const hint = el('div','small', 'Твой ход: '+node.task);
    hint.style.marginBottom='8px';
    box.appendChild(hint);

    const ta = el('textarea','free-input'); ta.rows = 2;
    ta.placeholder = Voice.ok() ? 'Напиши или надиктуй свой ответ…' : 'Напиши свой ответ…';
    box.appendChild(ta);

    const rowA = el('div','ans-row');
    const send = el('button','btn moss','Ответить');
    rowA.appendChild(send);
    if (Voice.ok()){
      const dict = el('button','btn ghost','Надиктовать');
      dict.onclick = ()=>{
        if (Voice.busy){ Voice.stop(); dict.textContent='Надиктовать'; return; }
        dict.textContent='Слушаю…'; dict.classList.add('rec');
        Voice.listen(node.best, {
          onresult:(res)=>{
            dict.classList.remove('rec'); dict.textContent='Надиктовать';
            if (res.heard) ta.value = res.heard;
            else if (res.err==='denied'){ this.fb('Микрофон не разрешён.', false); Voice.help(); }
            else this.fb('Не расслышал.', false);
          }
        });
      };
      rowA.appendChild(dict);
    }
    box.appendChild(rowA);

    const dunno = mkDunno();
    box.appendChild(dunno);
    let tries = 0;

    /* ответ принят: ветка, реплика собеседника, кнопка дальше */
    const accept = (said, res)=>{
      const tr = this.flowTr(node, res);
      const w1 = expand(norm(said)), w2 = expand(norm(node.best));
      if (w1.join(' ') !== w2.join(' ')){
        const v = el('div','verdict');
        v.innerHTML = '<b class="g">Тебя поняли.</b>' +
          `<ul><li>Ещё вариант: <b>${node.best}</b></li></ul>`;
        box.appendChild(v);
      }
      this.flowReact(node, tr, node.best, true);
    };

    send.onclick = ()=>{
      const v = ta.value.trim(); if (!v) return;
      const myBub = this.bubble('you', v);
      const res = this.flowJudge(node, v);
      tries++;
      if (!res.huh){
        ta.disabled = true; send.disabled = true; dunno.remove();
        this.sayStop();
        accept(v, res);
        return;
      }
      Sound.fx('wrong');
      if (tries === 1){
        const tip = el('div','small');
        tip.textContent = 'Можно поправить свой ответ — это ещё не ошибка.';
        tip.style.marginTop='6px';
        const fix = el('button','btn moss wide','Исправить ответ');
        fix.onclick = ()=>{
          this.sayStop();
          if (myBub) myBub.remove();
          box.querySelectorAll('.verdict').forEach(x=>x.remove());
          fix.remove(); tip.remove();
          ta.disabled = false; send.disabled = false;
          ta.scrollIntoView({behavior:'smooth', block:'nearest'});
          ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
        };
        ta.disabled = true; send.disabled = true;
        box.appendChild(fix); box.appendChild(tip);
        setTimeout(()=>fix.scrollIntoView({behavior:'smooth', block:'center'}), 260);
        return;
      }
      /* второй промах подряд — ошибка: показываем образец, дальше по его ветке */
      ta.disabled = true; send.disabled = true; dunno.remove();
      Miss.add(node.best, node.task, 'dialog');
      const dead = this.loseLife();
      if (dead) return;
      this.step++; this.prog();
      const v2 = el('div','verdict');
      v2.innerHTML = `<b class="r">Так не поймут.</b><ul>` +
        (res.note ? `<li>${res.note}</li>` : '') +
        `<li>Скажи, например: <b>${node.best}</b></li></ul>`;
      box.appendChild(v2);
      this.say(node.best, {now:true});
      const wBest = expand(norm(node.best));
      this.lMem._digits = (node.best.match(/\d+/g) || []);
      const resB = node.judge(wBest, this.lMem);
      const go = el('button','btn moss wide','Сказать, как в примере');
      go.onclick = ()=>{
        this.sayStop();
        this.bubble('you', node.best);
        this.flowReact(node, this.flowTr(node, resB), node.best, false);
      };
      box.appendChild(go);
      setTimeout(()=>go.scrollIntoView({behavior:'smooth', block:'center'}), 260);
    };

    /* страховка: готовая фраза. Она сама выбирает свою ветку. */
    dunno.onclick = ()=>{
      dunno.remove(); ta.remove(); rowA.remove();
      const b = el('button','opt', node.best);
      b.onclick = ()=>{
        [...box.querySelectorAll('.opt')].forEach(x=>x.style.pointerEvents='none');
        const res = this.flowJudge(node, node.best);
        this.bubble('you', node.best);
        b.classList.add('ok');
        accept(node.best, res);
      };
      box.appendChild(b);
    };
  },

  quit(){
    STT.stop(); Sound.duck(false);   // поток микрофона остаётся живым
    Sound.fx('back');
    Levels.open(this.st);
  }
};

/* ---------------- профиль и настройки ---------------- */
const Profile = {
  render(){
    const L = lang();
    $('avatar-big').textContent = L ? L.native.slice(0,2).toUpperCase() : '—';
    $('pf-name').textContent = 'Путник';
    $('pf-lang').textContent = L ? `${L.name} · этап ${S.stage} (${STAGES[S.stage].cefr})` : 'Язык не выбран';
    $('pf-lang-2').innerHTML = L ? `<img class="flag" src="${flagUrl(L.flag)}"> ${L.native}` : '—';
    $('pf-levels').textContent = S.stats.levels;
    $('pf-words').textContent = S.stats.words;
    $('pf-acc').textContent = S.stats.total ? Math.round(S.stats.right/S.stats.total*100)+'%' : '—';
    const {done,total} = Progress.overall();
    $('pf-alt').textContent = Math.round((total? done/total:0) * 3400) + ' м';
    $('sw-amb').classList.toggle('on', S.sound.amb);
    $('sw-fx').classList.toggle('on', S.sound.fx);
    $('sw-tts').classList.toggle('on', S.sound.tts);
    if ($('sw-all')) $('sw-all').classList.toggle('on', !!S.allOpen);
  }
};

const Settings = {
  toggleAmb(){ S.sound.amb=!S.sound.amb; save(); if(!S.sound.amb) Sound.stopAmbience(); else Ambience.forScreen(current); Profile.render(); Sound.fx('tap'); },
  toggleFx(){ S.sound.fx=!S.sound.fx; save(); Sound.set(S.sound.fx||S.sound.amb); Profile.render(); },
  toggleTts(){ S.sound.tts=!S.sound.tts; save(); Profile.render(); Sound.fx('tap'); },
  toggleAll(){ S.allOpen=!S.allOpen; save(); Profile.render(); Sound.fx(S.allOpen?'unlock':'tap'); },
  reset(){
    Sheet.open(`
      <h3 class="sm">Сбросить прогресс?</h3>
      <p class="small" style="margin-top:6px">Маршрут, статистика и выбранный язык будут очищены.</p>
      <div class="btn-row" style="margin-top:18px">
        <button class="btn ghost" onclick="Sheet.close()">Отмена</button>
        <button class="btn" style="background:var(--clay);color:#fff" onclick="Settings.doReset()">Сбросить</button>
      </div>`);
  },
  doReset(){ localStorage.removeItem(KEY); location.reload(); }
};

/* ---------------- старт ---------------- */
(function boot(){
  try{ if (window.Telegram && Telegram.WebApp){ Telegram.WebApp.ready(); Telegram.WebApp.expand(); } }catch(e){}

  ['assets/map/mountain-map.png', ...Object.values(STAGES).map(s=>s.art)]
    .forEach(src=>{ const i=new Image(); i.src=src; });

  // карта заранее начитанных фраз: без неё «Послушать» молчит в Telegram
  Lesson.loadVoiceMap();

  const wake = ()=>{ Sound.boot(); Sound.resume(); if(S.sound.amb) Ambience.forScreen(current);
                     document.removeEventListener('pointerdown', wake); };
  document.addEventListener('pointerdown', wake);

  /* клавиатура: экран не сжимаем и не двигаем. Если клавиатура реально
     перекрывает низ (visualViewport меньше окна) — внутри урока добавляем
     место для прокрутки и подводим поле ответа. Закрылась — всё вернулось. */
  const kbdFit = ()=>{
    const vv = window.visualViewport;
    const docH = document.documentElement.clientHeight || window.innerHeight || 0;
    const kb = vv ? Math.max(0, docH - Math.round(vv.height)) : 0;
    const body = $('l-body');
    if (body && current === 'sc-lesson')
      body.style.paddingBottom = kb ? (kb + 14) + 'px' : '';
    const act = document.activeElement;
    if (kb > 0 && act && act.classList && act.classList.contains('free-input')){
      setTimeout(()=>{
        const sc = $('l-body'); if (!sc) return;
        const r = act.getBoundingClientRect(), sr = sc.getBoundingClientRect();
        const under = r.bottom - sr.bottom;
        const over  = r.top   - sr.top;
        if (under > 0) sc.scrollTop += under + 12;
        else if (over < 0) sc.scrollTop += over - 12;
      }, 200);
    }
  };
  const kbdTick = ()=>setTimeout(kbdFit, 30);
  if (window.visualViewport){
    window.visualViewport.addEventListener('resize', kbdTick);
    window.visualViewport.addEventListener('scroll', kbdTick);
  }
  document.addEventListener('focusin', kbdTick);
  document.addEventListener('focusout', ()=>setTimeout(kbdFit, 260));
  kbdFit();

  const pv = $('pf-ver'); if (pv) pv.textContent = APP_VERSION;
  if (S.lang){ go('sc-hub', {noHistory:true}); }
  else if (S.seenIntro){ go('sc-lang', {noHistory:true}); navStack=['sc-hub']; }
  else { current='sc-welcome'; HelloScreen.start(); }
})();

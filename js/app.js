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
const lang = () => LANGUAGES.find(l => l.code === S.lang) || null;
const flagUrl = c => `assets/flags/${c}.png`;
const EMOJI = 'assets/emoji';
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
  Sound.fx('back');
  go(prev || (S.lang ? 'sc-hub' : 'sc-welcome'), {noHistory:true});
}
document.querySelectorAll('.tab').forEach(b => b.onclick = () => { Sound.fx('tap'); go(b.dataset.go); });

/* ---------------- атмосфера по экранам ---------------- */
const Ambience = {
  forScreen(id){
    if (!S.sound.amb) return;
    const m = {
      'sc-welcome':'ridge','sc-intro':'valley','sc-hub':'quiet',
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
  i:0,
  start(){ Sound.boot(); Sound.fx('open'); go('sc-intro'); this.show(0); },
  show(i){
    this.i = i;
    const slides = document.querySelectorAll('#slides .slide');
    slides.forEach((s,k)=>s.classList.toggle('on', k===i));
    document.querySelectorAll('#dots i').forEach((d,k)=>d.classList.toggle('on', k===i));
    const s = slides[i];
    $('intro-bg').style.backgroundImage = `url('${s.dataset.bg}')`;
    if (S.sound.amb) Sound.ambience(s.dataset.amb);
    $('intro-next').textContent = (i === slides.length-1) ? 'Поехали' : 'Далее';
  },
  next(){
    Sound.fx('step');
    const n = document.querySelectorAll('#slides .slide').length;
    if (this.i < n-1) this.show(this.i+1); else this.skip();
  },
  skip(){
    S.seenIntro = true; save();
    Sound.boot(); Sound.fx('unlock');
    navStack = [];
    go(S.lang ? 'sc-hub' : 'sc-lang', {noHistory:true});
    if (!S.lang) navStack = ["sc-hub"];
  },
  replay(){ this.start(); }
};

/* ---------------- хаб ---------------- */
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
      $('hub-caption').textContent = 'Выбери язык — и сразу в путь. Без анкет и вопросов.';
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
    $('hub-caption').textContent = `${L.place}. Этап ${st} · ${STAGES[st].cefr} — ${STAGES[st].name.toLowerCase()}.`;
    $('hub-lang-btn').textContent = 'Сменить язык';

    const tile = el('div','lang-tile');
    tile.innerHTML = `
      <img src="${STAGES[st].art}" alt="">
      <div class="veil"></div>
      <div class="inner">
        <div class="tile-badge"><img class="flag" src="${flagUrl(L.flag)}"> ${L.native} · ${STAGES[st].cefr}</div>
        <div>
          <span class="kicker amber">Продолжить</span>
          <h2 class="mid" style="margin-top:4px">${STAGES[st].name}</h2>
          <p class="small" style="margin-top:4px">${STAGES[st].sub}</p>
          <div class="tile-progress">
            <div class="bar" style="flex:1"><i style="width:${total?Math.round(done/total*100):0}%"></i></div>
            <span class="small">${done}/${total}</span>
          </div>
        </div>
      </div>`;
    tile.onclick = ()=>{ Sound.fx('whoosh'); Trail.open(); };
    slot.appendChild(tile);
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
  ask(){
    if (this.granted) return Promise.resolve('ok');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      return Promise.resolve('no-api');
    }
    return navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
      // разрешение получено — поток сразу отпускаем, писать будет распознавание
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

    let r;
    try { r = new Ctor(); } catch(e){ cb.onstate && cb.onstate('error'); return; }
    this.rec = r; this.busy = true;

    r.lang = lang().tts;
    r.interimResults = false;
    r.maxAlternatives = 4;
    r.continuous = false;

    let done = false;
    const finish = (payload)=>{
      if (done) return; done = true;
      this.busy = false; this.rec = null;
      clearTimeout(guard);
      cb.onresult && cb.onresult(payload);
    };
    const guard = setTimeout(()=>{ try{ r.stop(); }catch(e){} }, 7000);

    r.onstart  = ()=> cb.onstate && cb.onstate('listening');
    r.onaudiostart = ()=> cb.onstate && cb.onstate('listening');
    r.onspeechend  = ()=>{ try{ r.stop(); }catch(e){} };

    r.onresult = (ev)=>{
      const alts = [];
      for (const res of ev.results){
        for (let i=0;i<res.length;i++) alts.push(res[i].transcript);
      }
      let best = { text: alts[0]||'', score: 0 };
      alts.forEach(t=>{ const s=this.sim(t,target); if (s>best.score) best={text:t,score:s}; });
      finish({ heard: best.text, score: best.score, target });
    };
    r.onerror = (ev)=>{
      const code = ev && ev.error;
      finish({ heard:'', score:0, target,
               err: code==='not-allowed'||code==='service-not-allowed' ? 'denied'
                  : code==='no-speech' ? 'silent' : 'error' });
    };
    r.onend = ()=> finish({ heard:'', score:0, target, err:'silent' });

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
    const out = el('div','say-out','');
    wrap.appendChild(btn); wrap.appendChild(out);
    host.appendChild(wrap);

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
      setState('rec', 'Слушаю…');
      this.listen(target, {
        onstate:(s)=>{ if (s==='listening') setState('rec','Говори.'); },
        onresult:(res)=>{
          if (res.err === 'denied'){
            setState('', 'Микрофон не разрешён.');
            out.className='say-out no';
            this.help();
            return;
          }
          if (res.err === 'silent' || !res.heard){
            setState('', 'Не расслышал. Попробуй ещё раз.');
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
      if (this.busy){ this.stop(); setState('', 'Отменено.'); return; }
      Sound.fx('tap');

      if (this.granted){ run(); return; }

      // первый раз: явно просим доступ — появится системное окно телефона
      setState('rec', 'Разреши доступ к микрофону…');
      this.ask().then(res=>{
        if (res === 'ok'){ run(); return; }
        setState('', res === 'no-mic' ? 'Микрофон не найден.' : 'Микрофон не разрешён.');
        out.className = 'say-out no';
        if (res === 'denied' || res === 'no-api') this.help();
      });
    };
    return wrap;
  }
};

/* ---------------- урок ---------------- */
const Lesson = {
  st:1, idx:0, lv:null, step:0, lives:5, right:0, total:0, mode:'', picked:null, built:[],
  start(st, idx){
    this.st=st; this.idx=idx; this.lv = getCourse(S.lang, st)[idx];
    this.step=0; this.lives=5; this.right=0; this.picked=null;
    const sc = SCENES[this.lv.scene], L = lang();
    $('scene-img').src = `assets/scenes/${L.scenes}/${sc.img}`;
    $('l-scene').textContent = sc.label;
    $('l-kind').textContent = `${levelKind(this.lv.type)} · ${this.lv.title}`;
    if (S.sound.amb) Sound.ambience(sc.amb);
    this.total = this.lv.type==='words' ? this.lv.words.length
               : this.lv.type==='build' ? this.lv.tasks.length
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
      // сердца кончились — уровень начинается заново
      setTimeout(()=>this.finish(true), 900);
      return true;
    }
    return false;
  },
  prog(){
    const pct = this.total ? Math.max(6, this.step/this.total*100) : 6;
    $('l-prog').style.width = pct+'%';
  },
  say(text){
    if (!S.sound.tts) return;
    try{
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang().tts; u.rate = .92;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    }catch(e){}
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

    $('w-say').onclick = ()=>this.say(w.t);
    this.say(w.t);

    this.spoke = false;
    Voice.mount(wrap, w.t, (score)=>{ if (score >= .72) this.spoke = true; });

    let shown = false;
    this.fb('');
    const btn = $('l-action');
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
    btn.className='btn moss'; btn.textContent='Проверить';
    btn.onclick = ()=>{
      const said = this.built.map(b=>b.w).join(' ');
      const ok = said.replace(/\s+/g,' ').trim().toLowerCase() === t.answer.toLowerCase();
      S.stats.total++;
      let dead = false;
      if (ok){
        S.stats.right++; this.right++;
        Sound.fx('right'); this.fb(Voice.ok()?'Верно. Теперь произнеси.':'Верно. Скажи вслух ещё раз.', true);
        this.say(t.answer);
      } else {
        dead = this.loseLife();
        this.fb(dead ? 'Сердца кончились. Начнём уровень заново.' : ('Правильно: ' + t.answer), false);
        this.say(t.answer);
      }
      if (!dead && !$('say-here')){
        const slot = el('div',''); slot.id='say-here'; slot.style.marginTop='4px';
        wrap.appendChild(slot);
        Voice.mount(slot, t.answer, (score)=>{ if (score>=.72) S.stats.spoken=(S.stats.spoken||0)+1; });
      }
      btn.textContent = this.step < this.total-1 ? 'Дальше' : 'Завершить';
      btn.onclick = ()=>{ Voice.stop(); Sound.fx('step'); this.next(); };
    };
  },

  /* ---- 3. ДИАЛОГ: готовые реплики или свой ответ ---- */
  dialogInit(){
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
    $('l-action').className='btn ghost'; $('l-action').textContent='Слушать реплику';
    $('l-action').onclick = ()=>{ const last=this.lastThem; if(last) this.say(last); };
    this.dialogAdvance();
  },
  bubble(who, text, tr){
    const b = el('div','bub '+who, `${text}${tr?`<span class="tr">${tr}</span>`:''}`);
    $('chat').appendChild(b);
    b.scrollIntoView({behavior:'smooth', block:'end'});
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
    const hint = el('div','small', `Твой ход: ${turn.ru}`);
    hint.style.marginBottom='2px';
    box.appendChild(hint);

    const opts = turn.options.map((o,i)=>({o,i})).sort(()=>Math.random()-.5);
    opts.forEach(({o,i})=>{
      const b = el('button','opt', o);
      b.onclick = ()=>{
        [...box.querySelectorAll('.opt')].forEach(x=>x.style.pointerEvents='none');
        const ok = i === turn.best;
        b.classList.add(ok?'ok':'no');
        S.stats.total++;
        if (ok){ S.stats.right++; this.right++; Sound.fx('right'); }
        else { const dead = this.loseLife();
               const good=[...box.querySelectorAll('.opt')].find(x=>x.textContent===turn.options[turn.best]);
               if (good) good.classList.add('ok');
               if (dead) return; }
        this.bubble('you', ok?o:turn.options[turn.best]);
        this.say(ok?o:turn.options[turn.best]);
        this.step++; this.prog();
        setTimeout(()=>{ this.turnIdx++; box.innerHTML=''; this.dialogAdvance(); }, ok?750:1500);
      };
      box.appendChild(b);
    });

    const own = el('button','btn quiet','Ответить своими словами');
    own.onclick = ()=>{
      box.innerHTML='';
      const ta = el('textarea','free-input'); ta.rows=2;
        ta.placeholder = Voice.ok() ? 'Напиши или надиктуй свой ответ…' : 'Напиши свой ответ…';
        const send = el('button','btn moss','Отправить');
      send.style.marginTop='9px';
      send.onclick = ()=>{
        const v = ta.value.trim(); if(!v) return;
        this.bubble('you', v);
        this.say(v);
        this.bubble('them', `Вариант носителя: ${turn.options[turn.best]}`, 'сравни со своим');
        this.right += .5; S.stats.total++; S.stats.right += .5;
        this.step++; this.prog();
        setTimeout(()=>{ this.turnIdx++; box.innerHTML=''; this.dialogAdvance(); }, 1400);
      };
      box.appendChild(ta);
      if (Voice.ok()){
        const dict = el('button','btn quiet','Надиктовать');
        dict.style.marginTop='9px';
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
        box.appendChild(dict);
      }
      box.appendChild(send); ta.focus();
    };
    box.appendChild(own);
  },

  next(){
    this.step++;
    if (this.lives <= 0){ this.finish(true); return; }
    if (this.step >= this.total){ this.finish(); return; }
    this.render();
  },

  finish(failed){
    Voice.stop();
    const acc = this.total ? Math.round(this.right/this.total*100) : 100;
    if (!failed) Progress.mark(this.st, this.idx, acc/100);
    save();
    Sound.fx(failed?'wrong':'done');
    if (S.sound.amb) Sound.ambience(STAGES[this.st].amb);

    $('done-bg').style.backgroundImage = `url('${STAGES[this.st].art}')`;
    $('done-kicker').textContent = failed ? 'Срыв' : `${STAGES[this.st].cefr} · уровень пройден`;
    $('done-title').textContent = failed ? 'Сердца кончились' : ['Хорошо','Чисто сделано','Ты выше, чем был'][Math.floor(Math.random()*3)];
    $('done-text').textContent = failed
      ? 'Пять ошибок — соскользнул. Этот уровень нужно пройти заново, с самого начала.'
      : `${levelKind(this.lv.type)}: ${this.lv.title}. Следующий кусок тропы открыт.`;
    $('done-acc').textContent = acc + '%';
    $('done-stage').textContent = `${this.st} · ${STAGES[this.st].name}`;

    const arr = getCourse(S.lang, this.st);
    const nextIdx = this.idx + 1;
    const btn = $('done-next');
    if (failed){
      btn.textContent = 'Начать уровень заново';
      btn.onclick = ()=>{ Sound.fx('step'); Lesson.start(this.st, this.idx); };
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

  quit(){
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
  }
};

const Settings = {
  toggleAmb(){ S.sound.amb=!S.sound.amb; save(); if(!S.sound.amb) Sound.stopAmbience(); else Ambience.forScreen(current); Profile.render(); Sound.fx('tap'); },
  toggleFx(){ S.sound.fx=!S.sound.fx; save(); Sound.set(S.sound.fx||S.sound.amb); Profile.render(); },
  toggleTts(){ S.sound.tts=!S.sound.tts; save(); Profile.render(); Sound.fx('tap'); },
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

  const wake = ()=>{ Sound.boot(); Sound.resume(); if(S.sound.amb) Ambience.forScreen(current);
                     document.removeEventListener('pointerdown', wake); };
  document.addEventListener('pointerdown', wake);

  if (S.lang){ go('sc-hub', {noHistory:true}); }
  else if (S.seenIntro){ go('sc-lang', {noHistory:true}); navStack=['sc-hub']; }
  else { current='sc-welcome'; HelloScreen.start(); }
})();

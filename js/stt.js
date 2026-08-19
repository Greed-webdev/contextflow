/* ================================================================
   СВОЁ РАСПОЗНАВАНИЕ РЕЧИ (Vosk, работает прямо в приложении)

   Зачем это вообще:
   Встроенный браузер Telegram не запоминает разрешение на микрофон
   («доступен, пока открыт этот сайт»), а системное распознавание речи
   дёргает микрофон заново на каждом слове — телефон каждый раз
   переспрашивает. У Telegram нет команды «запомни разрешение»:
   такого API просто не существует.

   Что делаем:
   один раз за открытие приложения берём микрофон и НЕ отпускаем его.
   Разрешение спрашивают один раз, дальше слушаем сколько угодно.
   Речь распознаётся тут же, на телефоне, без интернета и без сервера.
   ================================================================ */
const STT = {
  model:null, rec:null, ctx:null, node:null, stream:null, src:null,
  loading:false, ready:false, active:false,
  onPartial:null, onFinal:null, onLevel:null,
  MODEL_URL:'assets/stt/model-en.tar.gz',
  KEY:'cf_stt_ok',

  supported(){
    return !!(window.WebAssembly && navigator.mediaDevices &&
              navigator.mediaDevices.getUserMedia && window.Vosk);
  },
  /* движок уже скачан в кэш браузера? */
  get cached(){
    try { return localStorage.getItem(this.KEY) === '1'; } catch(e){ return false; }
  },
  set cached(v){
    try { v ? localStorage.setItem(this.KEY,'1') : localStorage.removeItem(this.KEY); } catch(e){}
  },

  /* Скачать и поднять голосовой движок. Долгое дело — с отчётом о ходе. */
  load(onProgress){
    if (this.ready) return Promise.resolve(true);
    if (this.loading) return this.loading;
    if (!window.Vosk) return Promise.resolve(false);

    // Движок работает в отдельном потоке (blob-worker) и считает относительные
    // адреса от КОРНЯ сайта, а приложение лежит в подпапке /contextflow/.
    // Поэтому отдаём ему полный адрес — иначе 404.
    let url = this.MODEL_URL;
    try { url = new URL(this.MODEL_URL, location.href).href; } catch(e){}

    this.loading = Vosk.createModel(url)
      .then(m=>{
        this.model = m;
        this.ready = true;
        this.cached = true;
        this.loading = null;
        return true;
      })
      .catch(e=>{ this.loading = null; return false; });
    return this.loading;
  },

  /* Взять микрофон ОДИН РАЗ за открытие приложения и держать. */
  openMic(){
    if (this.stream) return Promise.resolve(true);
    return navigator.mediaDevices.getUserMedia({
      audio:{ echoCancellation:true, noiseSuppression:true, channelCount:1 }
    }).then(st=>{
      this.stream = st;
      this.buildGraph();
      // контекст рождается «спящим» — будим сразу, пока мы внутри жеста
      return this.ctx.state === 'suspended'
        ? this.ctx.resume().then(()=>true).catch(()=>true)
        : true;
    }).catch(e=>{
      const n = e && e.name;
      return n==='NotAllowedError' || n==='PermissionDeniedError' ? 'denied'
           : n==='NotFoundError' ? 'no-mic' : 'error';
    });
  },

  /* Звуковой тракт строим один раз: микрофон -> обработчик -> распознавание.
     Частота 16 кГц — именно её ждёт голосовой движок. */
  buildGraph(){
    if (this.ctx || !this.stream) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    try { this.ctx = new AC({sampleRate:16000}); }
    catch(e){ this.ctx = new AC(); }
    this.src  = this.ctx.createMediaStreamSource(this.stream);
    this.node = this.ctx.createScriptProcessor(4096, 1, 1);
    this.node.onaudioprocess = (ev)=>{
      if (!this.active || !this.rec) return;
      try { this.rec.acceptWaveform(ev.inputBuffer); } catch(e){}
      if (this.onLevel){
        const d = ev.inputBuffer.getChannelData(0);
        let s = 0; for (let i=0;i<d.length;i+=16) s += d[i]*d[i];
        this.onLevel(Math.min(1, Math.sqrt(s/(d.length/16)) * 6));
      }
    };
    this.src.connect(this.node);
    this.node.connect(this.ctx.destination);
  },

  /* Слушать фразу. target — что человек должен сказать. */
  listen(target, cb){
    if (this.active) { this.stop(); return; }
    if (!this.ready || !this.stream) { cb.onstate && cb.onstate('error'); return; }

    let done = false, heard = '', heardAny = false, soft = null;
    const finish = (payload)=>{
      if (done) return; done = true;
      clearTimeout(soft); clearTimeout(guard);
      this.pause();
      cb.onresult && cb.onresult(payload);
    };

    try {
      this.rec = new this.model.KaldiRecognizer(this.ctx ? this.ctx.sampleRate : 16000);
    } catch(e){ cb.onstate && cb.onstate('error'); return; }

    this.rec.on('partialresult', m=>{
      const t = m.result && m.result.partial;
      if (!t || t === heard) return;
      heardAny = true; heard = t;
      cb.onstate && cb.onstate('speaking');

      // сказал правильно — засчитываем сразу, не заставляем ждать
      if (this.sim(t, target) >= 0.9){
        clearTimeout(soft);
        finish({ heard:t, score:this.sim(t,target), target });
        return;
      }
      clearTimeout(soft);
      // человек может делать паузу между словами — ждём 1.4 с тишины
      soft = setTimeout(()=>{ try{ this.rec.retrieveFinalResult(); }catch(e){} }, 1400);
    });
    this.rec.on('result', m=>{
      const t = (m.result && m.result.text) || heard;
      finish({ heard:t, score:this.sim(t,target), target });
    });

    // страховка: не слушаем дольше 12 секунд
    const guard = setTimeout(()=>{
      try{ this.rec.retrieveFinalResult(); }catch(e){}
      setTimeout(()=>{
        if (!done) finish(heardAny ? { heard, score:this.sim(heard,target), target }
                                   : { heard:'', score:0, target, err:'silent' });
      }, 600);
    }, 12000);

    this.resume();
    cb.onstate && cb.onstate('listening');
  },

  /* Поток звука в распознаватель. Создаём один раз, дальше только вкл/выкл. */
  resume(){
    this.active = true;
    this.buildGraph();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  pause(){
    this.active = false;
    this.rec = null;
  },
  stop(){ this.pause(); },

  /* насколько сказанное похоже на нужное (0..1) */
  norm(s){
    return (s||'').toLowerCase()
      .replace(/[.,!?;:¡¿"'`´’“”()\-—–]/g,' ')
      .replace(/\s+/g,' ').trim();
  },
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
  }
};

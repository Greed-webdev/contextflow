/* ==========================================================
   ContextFlow · sound.js — ЗОНА: звук
   Всё синтезируется в браузере (WebAudio), внешних файлов нет.
   Громкость — чуть ниже средней (мастер 0.34).
   ========================================================== */

const Sound = (() => {
  let ctx = null, master = null, ambBus = null, uiBus = null;
  let currentAmb = null, ambName = null;
  let enabled = true;

  function boot(){
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.34; master.connect(ctx.destination);
    ambBus = ctx.createGain(); ambBus.gain.value = 0.0; ambBus.connect(master);
    uiBus  = ctx.createGain(); uiBus.gain.value = 0.85;  uiBus.connect(master);
    return ctx;
  }
  function resume(){ if (!ctx) boot(); if (ctx && ctx.state === 'suspended') ctx.resume(); }

  /* ---------- шумовой буфер ---------- */
  let noiseBuf = null;
  function noise(){
    if (noiseBuf) return noiseBuf;
    const len = ctx.sampleRate * 4;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i=0;i<len;i++) d[i] = Math.random()*2-1;
    return noiseBuf;
  }

  /* ---------- атмосферы ---------- */
  function windLayer(out, {cut=520, q=0.7, gain=0.5, lfo=0.06, depth=0.5}){
    const src = ctx.createBufferSource(); src.buffer = noise(); src.loop = true;
    const f = ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=cut; f.Q.value=q;
    const g = ctx.createGain(); g.gain.value = gain;
    const l = ctx.createOscillator(); l.frequency.value = lfo;
    const lg = ctx.createGain(); lg.gain.value = gain*depth;
    l.connect(lg); lg.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(); l.start();
    return {stop(){ try{src.stop();l.stop();}catch(e){} }};
  }

  function birds(out, rate=0.55){
    let alive = true;
    const chirp = () => {
      if (!alive) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type='sine';
      const g = ctx.createGain();
      const base = 1800 + Math.random()*1500;
      o.frequency.setValueAtTime(base, t);
      o.frequency.exponentialRampToValueAtTime(base*(1.25+Math.random()*0.5), t+0.055);
      o.frequency.exponentialRampToValueAtTime(base*0.85, t+0.13);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05+Math.random()*0.05, t+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t+0.16);
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan){ pan.pan.value = Math.random()*1.6-0.8; o.connect(g); g.connect(pan); pan.connect(out); }
      else { o.connect(g); g.connect(out); }
      o.start(t); o.stop(t+0.2);
      setTimeout(chirp, (400 + Math.random()*3600)/rate);
    };
    setTimeout(chirp, 500);
    return {stop(){ alive=false; }};
  }

  function room(out, {hum=110, gain=0.22}){
    const o = ctx.createOscillator(); o.type='sine'; o.frequency.value = hum;
    const g = ctx.createGain(); g.gain.value = gain*0.12;
    o.connect(g); g.connect(out);
    const src = ctx.createBufferSource(); src.buffer = noise(); src.loop = true;
    const f = ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=700; f.Q.value=0.4;
    const g2 = ctx.createGain(); g2.gain.value = gain;
    src.connect(f); f.connect(g2); g2.connect(out);
    o.start(); src.start();
    return {stop(){ try{o.stop();src.stop();}catch(e){} }};
  }

  function rain(out, gain=0.4){
    const src = ctx.createBufferSource(); src.buffer = noise(); src.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=900;
    const lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=5200;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out);
    src.start();
    return {stop(){ try{src.stop();}catch(e){} }};
  }

  const SCENES = {
    valley:  o => [windLayer(o,{cut:420,gain:0.35,lfo:0.05}), birds(o,0.9)],
    ridge:   o => [windLayer(o,{cut:640,gain:0.5,lfo:0.09,depth:0.7}), birds(o,0.25)],
    pass:    o => [windLayer(o,{cut:800,gain:0.6,lfo:0.13,depth:0.8})],
    alpine:  o => [windLayer(o,{cut:1100,gain:0.72,lfo:0.17,depth:0.9})],
    summit:  o => [windLayer(o,{cut:1500,gain:0.85,lfo:0.22,depth:1})],
    terminal:o => [room(o,{hum:96,gain:0.3}), windLayer(o,{cut:300,gain:0.16,lfo:0.04})],
    cafe:    o => [room(o,{hum:120,gain:0.26})],
    street:  o => [rain(o,0.3), room(o,{hum:70,gain:0.22})],
    indoor:  o => [room(o,{hum:104,gain:0.2})],
    quiet:   o => [room(o,{hum:88,gain:0.12})]
  };

  function ambience(name){
    if (!enabled) return;
    resume(); if (!ctx) return;
    if (ambName === name) return;
    stopAmbience(true);
    const make = SCENES[name] || SCENES.quiet;
    const bus = ctx.createGain(); bus.gain.value = 0; bus.connect(ambBus);
    const parts = make(bus);
    ambBus.gain.cancelScheduledValues(ctx.currentTime);
    ambBus.gain.setTargetAtTime(1, ctx.currentTime, 1.2);
    bus.gain.setTargetAtTime(1, ctx.currentTime, 1.6);
    currentAmb = {parts, bus}; ambName = name;
  }

  function stopAmbience(instantSwap){
    if (!currentAmb) { ambName = null; return; }
    const {parts, bus} = currentAmb;
    currentAmb = null; ambName = null;
    try{ bus.gain.setTargetAtTime(0, ctx.currentTime, 0.35); }catch(e){}
    setTimeout(()=>{ parts.forEach(p=>p.stop()); try{bus.disconnect();}catch(e){} }, instantSwap?900:1400);
  }

  /* ---------- UI-звуки ---------- */
  function tone(freq, dur, type='sine', vol=0.2, slide=null){
    if (!enabled) return; resume(); if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq,t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t+dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(vol, t+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g); g.connect(uiBus); o.start(t); o.stop(t+dur+0.05);
  }

  function thud(vol=0.3, cut=1200){
    if (!enabled) return; resume(); if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noise();
    const f = ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(cut,t);
    f.frequency.exponentialRampToValueAtTime(220, t+0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.19);
    src.connect(f); f.connect(g); g.connect(uiBus); src.start(t); src.stop(t+0.25);
  }

  const FX = {
    tap:      ()=> tone(430, .05, 'sine', .1),
    step:     ()=> thud(.22, 900),               // шаг по тропе
    open:     ()=> { tone(320,.09,'sine',.12); setTimeout(()=>tone(520,.12,'sine',.1),60); },
    back:     ()=> { tone(420,.09,'sine',.1,300); },
    whoosh:   ()=> { if(!enabled) return; resume(); if(!ctx) return;
                     const t=ctx.currentTime, src=ctx.createBufferSource(); src.buffer=noise();
                     const f=ctx.createBiquadFilter(); f.type='bandpass'; f.Q.value=1.1;
                     f.frequency.setValueAtTime(300,t); f.frequency.exponentialRampToValueAtTime(2600,t+.34);
                     const g=ctx.createGain(); g.gain.setValueAtTime(0.0001,t);
                     g.gain.exponentialRampToValueAtTime(.3,t+.12); g.gain.exponentialRampToValueAtTime(.0001,t+.5);
                     src.connect(f); f.connect(g); g.connect(uiBus); src.start(t); src.stop(t+.55); },
    right:    ()=> { tone(660,.1,'sine',.16); setTimeout(()=>tone(990,.16,'sine',.13),70); },
    wrong:    ()=> { tone(200,.2,'triangle',.16,140); },
    done:     ()=> { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.28,'sine',.13),i*95)); },
    unlock:   ()=> { tone(392,.14,'sine',.12); setTimeout(()=>tone(587,.3,'sine',.12),110); },
    type:     ()=> tone(1200+Math.random()*300,.02,'square',.03)
  };

  return {
    boot, resume, ambience, stopAmbience,
    fx(n){ (FX[n]||FX.tap)(); },
    set(on){ enabled = on; if (!on) stopAmbience(); if (master) master.gain.value = on?0.34:0; },
    get on(){ return enabled; },
    volume(v){ if (master) master.gain.value = v; }
  };
})();

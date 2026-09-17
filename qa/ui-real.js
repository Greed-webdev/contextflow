/* UI-прогон в НАСТОЯЩЕМ Chromium (puppeteer), а не в DOM-шиме.
   Ловит то, чего шим не видит: реальные исключения, отрисовку,
   localStorage, блокировку микрофона, обрывы сети.
   Запуск: node qa/ui-real.js [url]                                  */
const puppeteer = require('puppeteer');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';

const ошибки = [], предупреждения = [];
const bug = (t, d) => { ошибки.push(`${t} · ${d}`); console.log(`  ✗ ${t} · ${d}`); };
const warn = (t, d) => { предупреждения.push(`${t} · ${d}`); console.log(`  ⚠ ${t} · ${d}`); };
const ok = (t) => console.log(`  · ${t}`);

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  /* ---------- утилита: свежая страница со сбором ошибок ---------- */
  const newPage = async (label) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    page.on('pageerror', e => bug(label, 'JS-исключение: ' + String(e.message).slice(0, 130)));
    page.on('console', m => { if (m.type() === 'error') {
      const t = m.text(); if (!/favicon|404|net::ERR/i.test(t)) warn(label, 'console.error: ' + t.slice(0, 110)); } });
    page.on('requestfailed', r => { const u = r.url();
      if (!/favicon|\.m4a|vosk|stt|woff2|\.png|index\.json/i.test(u)) warn(label, 'запрос упал: ' + u.split('/').pop()); });
    return page;
  };

  /* =============== 1. ХОЛОДНЫЙ СТАРТ =============== */
  console.log('\n1. ХОЛОДНЫЙ СТАРТ');
  let page = await newPage('старт');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 1200));

  const вид = await page.evaluate(() => {
    const on = [...document.querySelectorAll('.screen.on')].map(s => s.id);
    return { on, экранов: document.querySelectorAll('.screen').length,
             текст: (document.body.innerText || '').trim().length,
             версия: typeof APP_VERSION !== 'undefined' ? APP_VERSION : null };
  });
  if (!вид.on.length) bug('старт', 'ни один экран не активен — белый экран');
  else ok(`активен ${вид.on.join(',')} · экранов ${вид.экранов} · текста ${вид.текст} симв · ${вид.версия}`);
  if (вид.текст < 20) bug('старт', `на экране ${вид.текст} символов`);

  /* =============== 2. ПОРЧА localStorage =============== */
  console.log('\n2. ПОРЧА localStorage');
  const порча = [
    ['битый JSON',        '{сломано'],
    ['null вместо объекта', 'null'],
    ['массив',            '[1,2,3]'],
    ['sound=null',        '{"sound":null}'],
    ['stats=строка',      '{"stats":"нет"}'],
    ['progress=число',    '{"progress":42}'],
    ['lang=мусор',        '{"lang":"zz","seenIntro":true}'],
    ['stage=строка',      '{"stage":"пять","lang":"en"}'],
    ['глубокий null',     '{"sound":{"amb":null},"stats":null,"progress":null}'],
  ];
  for (const [имя, знач] of порча) {
    const p = await newPage('LS:' + имя);
    await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.evaluate(v => localStorage.setItem('contextflow_state_v10', v), знач);
    await p.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 700));
    const r = await p.evaluate(() => ({
      on: [...document.querySelectorAll('.screen.on')].map(s => s.id),
      текст: (document.body.innerText || '').trim().length }));
    if (!r.on.length || r.текст < 20) bug('LS:' + имя, `приложение не поднялось (текста ${r.текст})`);
    else ok(`${имя} → ${r.on.join(',')}`);
    await p.close();
  }

  /* =============== 3. localStorage НЕДОСТУПЕН =============== */
  console.log('\n3. localStorage ЗАБЛОКИРОВАН (приватный режим)');
  {
    const p = await newPage('LS-заблокирован');
    await p.evaluateOnNewDocument(() => {
      const err = () => { const e = new Error('SecurityError'); e.name = 'SecurityError'; throw e; };
      Object.defineProperty(window, 'localStorage', { get() { return { getItem: err, setItem: err, removeItem: err }; } });
    });
    await p.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 900));
    const r = await p.evaluate(() => ({ on: [...document.querySelectorAll('.screen.on')].map(s => s.id),
                                        текст: (document.body.innerText || '').trim().length }));
    if (!r.on.length || r.текст < 20) bug('LS-заблокирован', 'приложение не стартует без хранилища');
    else ok('стартует, экран ' + r.on.join(','));
    await p.close();
  }

  /* =============== 4. КВОТА ПЕРЕПОЛНЕНА при save() =============== */
  console.log('\n4. КВОТА ПЕРЕПОЛНЕНА (save)');
  {
    const p = await newPage('квота');
    await p.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    const r = await p.evaluate(() => {
      const ls = window.localStorage;
      const orig = ls.setItem.bind(ls);
      ls.setItem = () => { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; };
      let упало = null;
      try { if (typeof save === 'function') save(); else упало = 'save() не найдена'; }
      catch (e) { упало = e.name + ': ' + e.message; }
      ls.setItem = orig;
      return упало;
    });
    if (r && r !== 'save() не найдена') bug('квота', `save() бросает наружу → ${r}`);
    else ok(r || 'save() пережил переполнение');
    await p.close();
  }

  /* =============== 5. МИКРОФОН ЗАБЛОКИРОВАН =============== */
  console.log('\n5. МИКРОФОН ЗАБЛОКИРОВАН');
  {
    const p = await newPage('микрофон');
    await p.evaluateOnNewDocument(() => {
      navigator.mediaDevices = navigator.mediaDevices || {};
      navigator.mediaDevices.getUserMedia = () => Promise.reject(
        Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' }));
      delete window.webkitSpeechRecognition; delete window.SpeechRecognition;
    });
    await p.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 900));
    const r = await p.evaluate(() => ({ on: [...document.querySelectorAll('.screen.on')].map(s => s.id),
                                        текст: (document.body.innerText || '').trim().length }));
    if (!r.on.length) bug('микрофон', 'без микрофона приложение не стартует');
    else ok('стартует без микрофона, экран ' + r.on.join(','));
    await p.close();
  }

  /* =============== 6. ОБРЫВ СЕТИ (offline) =============== */
  console.log('\n6. ОБРЫВ СЕТИ');
  {
    const p = await newPage('offline');
    await p.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await p.setOfflineMode(true);
    const r = await p.evaluate(async () => {
      try { if (typeof Lesson !== 'undefined' && Lesson.loadVoiceMap) { Lesson.vmapTried = false; Lesson.loadVoiceMap(); } }
      catch (e) { return 'исключение: ' + e.message; }
      await new Promise(r2 => setTimeout(r2, 800));
      return null;
    });
    if (r) bug('offline', r); else ok('загрузка озвучки без сети не роняет приложение');
    await p.setOfflineMode(false);
    await p.close();
  }

  /* =============== 7. НАВИГАЦИЯ И ГОНКА ТАЙМЕРОВ =============== */
  console.log('\n7. НАВИГАЦИЯ · быстрые переключения');
  {
    const p = await newPage('навигация');
    await p.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await p.evaluate(() => { try { S.lang = 'en'; S.seenIntro = true; save(); } catch (e) {} });
    await p.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    const r = await p.evaluate(async () => {
      const лог = [];
      const экраны = ['sc-hub', 'sc-map', 'sc-profile', 'sc-hub', 'sc-map'];
      for (const id of экраны) {
        try { go(id); лог.push(id + ':' + (document.querySelector('.screen.on') || {}).id); }
        catch (e) { return { crash: id + ' → ' + e.message }; }
        await new Promise(r2 => setTimeout(r2, 40));
      }
      return { лог, активных: document.querySelectorAll('.screen.on').length };
    });
    if (r.crash) bug('навигация', r.crash);
    else if (r.активных !== 1) bug('навигация', `активных экранов ${r.активных}, ожидался 1`);
    else ok('5 переключений подряд · активен 1 экран');
    await p.close();
  }

  /* =============== 8. ЖИВОЙ УРОК: мусор, спам, «Не знаю» =============== */
  console.log('\n8. ЖИВОЙ УРОК · грязный ввод');
  {
    const p = await newPage('урок');
    await p.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await p.evaluate(() => { try { S.lang = 'en'; S.seenIntro = true; S.allOpen = true; save(); } catch (e) {} });
    await p.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    const старт = await p.evaluate(() => {
      try {
        const c = getCourse('en', 1) || [];
        const i = c.findIndex(l => l.type === 'dialog');
        if (i < 0) return { нет: 'диалогов в этапе 1 нет' };
        Lesson.start(1, i, 0);
        return { узлов: c.length, заголовок: (document.getElementById('l-kind') || {}).textContent };
      } catch (e) { return { crash: e.message }; }
    });
    if (старт.crash) bug('урок', 'Lesson.start упал: ' + старт.crash);
    else if (старт.нет) warn('урок', старт.нет);
    else {
      ok('открыт: ' + старт.заголовок);
      const грязь = ['!@#$%^&*()', 'ПРИВЕТ КАК ДЕЛА', '',
                     'a'.repeat(3000), '<script>alert(1)</script>',
                     '{"json":true}', '\u0000\u0001', '😀😀😀', 'null', 'undefined'];
      for (const g of грязь) {
        const r = await p.evaluate(async (текст) => {
          const ta = document.querySelector('#answers textarea');
          if (!ta) return { нет: 'поля ввода нет' };
          ta.value = текст;
          const btn = [...document.querySelectorAll('#answers button')]
            .find(b => /ответить|проверить/i.test(b.textContent));
          if (!btn) return { нет: 'кнопки нет' };
          try { btn.click(); } catch (e) { return { crash: e.message }; }
          await new Promise(r2 => setTimeout(r2, 120));
          return { html: document.body.innerHTML.length };
        }, g);
        const имя = g.length > 24 ? g.slice(0, 18) + `…(${g.length})` : (g || '<пусто>');
        if (r.crash) bug('урок', `«${имя}» → ${r.crash}`);
        else if (r.нет) { warn('урок', r.нет); break; }
      }
      ok('10 грязных вводов обработаны');

      /* XSS: попал ли скрипт в DOM как тег */
      const xss = await p.evaluate(() => {
        const s = [...document.querySelectorAll('.chat script, .bub script')].length;
        return { скриптов: s, естьТег: /<script>alert\(1\)<\/script>/.test(document.querySelector('.chat')?.innerHTML || '') };
      });
      if (xss.скриптов || xss.естьТег) bug('урок', 'XSS: реплика игрока вставлена как HTML');
      else ok('XSS: ввод экранирован');

      /* спам по кнопке «Не знаю» */
      const спам = await p.evaluate(async () => {
        for (let i = 0; i < 12; i++) {
          const b = [...document.querySelectorAll('#answers button')]
            .find(x => /не знаю|дальше|завершить|исправить/i.test(x.textContent));
          if (!b) break;
          try { b.click(); } catch (e) { return 'исключение: ' + e.message; }
          await new Promise(r => setTimeout(r, 90));
        }
        return null;
      });
      if (спам) bug('урок', 'спам по кнопкам → ' + спам);
      else ok('12 быстрых кликов по кнопкам — без исключений');
    }
    await p.close();
  }

  /* =============== 9. УХОД С ЭКРАНА ВО ВРЕМЯ УРОКА =============== */
  console.log('\n9. УХОД С ЭКРАНА во время урока (гонка таймеров)');
  {
    const p = await newPage('гонка');
    await p.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await p.evaluate(() => { try { S.lang = 'en'; S.seenIntro = true; S.allOpen = true; save(); } catch (e) {} });
    await p.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 700));
    const r = await p.evaluate(async () => {
      try {
        const c = getCourse('en', 1) || [];
        const i = c.findIndex(l => l.type === 'dialog');
        if (i < 0) return { нет: 1 };
        Lesson.start(1, i, 0);
        const ta = document.querySelector('#answers textarea');
        if (ta) { ta.value = 'hello'; const b = [...document.querySelectorAll('#answers button')]
          .find(x => /ответить/i.test(x.textContent)); if (b) b.click(); }
        go('sc-hub');                        // уходим сразу
        await new Promise(r2 => setTimeout(r2, 1500));   // ждём, не сработает ли таймер урока
        return { экран: (document.querySelector('.screen.on') || {}).id,
                 активных: document.querySelectorAll('.screen.on').length };
      } catch (e) { return { crash: e.message }; }
    });
    if (r.crash) bug('гонка', r.crash);
    else if (r.нет) warn('гонка', 'диалог не найден');
    else if (r.экран !== 'sc-hub') bug('гонка', `таймер урока перетащил на «${r.экран}» после ухода`);
    else if (r.активных !== 1) bug('гонка', `активных экранов ${r.активных}`);
    else ok('уход во время урока — экран не перехватывается');
    await p.close();
  }

  await browser.close();

  /* =============== ИТОГ =============== */
  console.log('\n' + '─'.repeat(64));
  console.log(`  ✗ ${ошибки.length}   ⚠ ${предупреждения.length}`);
  if (ошибки.length) { console.log('\nПАДЕНИЯ:'); ошибки.forEach(e => console.log('  · ' + e)); }
  if (предупреждения.length) { console.log('\nПРЕДУПРЕЖДЕНИЯ:'); предупреждения.forEach(e => console.log('  · ' + e)); }
  if (!ошибки.length && !предупреждения.length) console.log('  UI-слой чист.');
  process.exit(ошибки.length ? 1 : 0);
})().catch(e => { console.error('СТЕНД УПАЛ: ' + e.message); process.exit(2); });

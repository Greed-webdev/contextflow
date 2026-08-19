#!/usr/bin/env python3
"""
САБАГЕНТ-ЛОМАТЕЛЬ · полный прогон по всему ContextFlow.
Задача — доказать, что приложение сломано. Никаких поблажек.

  python3 tests/ломай-всё.py [адрес]
"""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'https://greed-webdev.github.io/contextflow/'

fails, passed = [], 0

def check(name, ok, detail=''):
    global passed
    print(('  ok    ' if ok else '  СЛОМ ') + name + (f'   → {detail}' if detail else ''))
    if ok: passed += 1
    else: fails.append(f'{name} ({detail})' if detail else name)

# следим за жестом, синтезом речи и захватом микрофона
SPY = """
window.__L__=[]; window.__GUM__=0; window.__SPEAK__=0; window.__BLOCKED__=0;
window.__GEST__=false; window.__SPEAK_NOGEST__=0; window.__ERR__=[];
window.addEventListener('error', e=>window.__ERR__.push(String(e.message)));

document.addEventListener('pointerdown', ()=>{ window.__GEST__=true;
  setTimeout(()=>{window.__GEST__=false;},0); }, true);

if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
  const _g=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia=function(c){
    window.__GUM__++; window.__L__.push('getUserMedia');
    return _g(c);
  };
}
// синтез речи: считаем вызовы и ловим запуск вне жеста
const _speak = speechSynthesis.speak.bind(speechSynthesis);
speechSynthesis.speak = function(u){
  window.__SPEAK__++;
  if (!window.__GEST__) window.__SPEAK_NOGEST__++;
  window.__L__.push('speak:'+String(u.text).slice(0,18)+' lang='+u.lang);
  return _speak(u);
};
class Rec {
  constructor(){ this.lang=''; this.interimResults=false; }
  start(){
    if (!window.__GEST__){ window.__BLOCKED__++; window.__L__.push('ОТКАЗ вне жеста');
      const s=this; setTimeout(()=>s.onerror&&s.onerror({error:'not-allowed'}),10); return; }
    window.__L__.push('rec:ok');
    const s=this;
    setTimeout(()=>s.onstart&&s.onstart(),10);
    setTimeout(()=>{
      if (window.__MODE__==='silence'){ s.onerror&&s.onerror({error:'no-speech'}); return; }
      s.onspeechstart&&s.onspeechstart();
      const fin = window.__MODE__!=='interim';
      const r=[{0:{transcript: window.__SAY__||'Hello'},length:1,isFinal:fin}];
      r[Symbol.iterator]=Array.prototype[Symbol.iterator];
      s.onresult&&s.onresult({results:r,resultIndex:0});
      if (!fin) setTimeout(()=>s.onend&&s.onend(),100);
    },140);
  }
  stop(){ if(this.onend) this.onend(); }
  abort(){ if(this.onend) this.onend(); }
}
window.SpeechRecognition=Rec; window.webkitSpeechRecognition=Rec;
"""

FRESH = ("localStorage.clear();localStorage.setItem('contextflow_state_v10',JSON.stringify("
         "{seenIntro:true,lang:'en',stage:1,progress:{},stats:{},"
         "sound:{amb:false,fx:false,tts:true}}))")

UA = 'Mozilla/5.0 (Linux; Android 13; Redmi Note 12) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'

def new_page(b, perms=('microphone',)):
    ctx = b.new_context(viewport={'width':390,'height':820}, user_agent=UA,
                        permissions=list(perms))
    pg = ctx.new_page(); pg.add_init_script(SPY)
    return ctx, pg

def boot(pg, lesson=None):
    pg.goto(URL, wait_until='domcontentloaded')
    pg.evaluate(FRESH)
    pg.reload(wait_until='domcontentloaded'); pg.wait_for_timeout(900)
    if lesson is not None:
        pg.evaluate(f"Lesson.start({lesson[0]},{lesson[1]})"); pg.wait_for_timeout(700)

with sync_playwright() as b_:
    b = b_.chromium.launch(args=['--use-fake-device-for-media-stream',
                                 '--use-fake-ui-for-media-stream'])
    print(f'\nПОЛНЫЙ ПРОГОН: {URL}\n' + '='*64)

    # ── 1. МИКРОФОН: первый раз ──────────────────────────────────
    print('\n[1] Микрофон · первое нажатие в жизни')
    ctx, pg = new_page(b); boot(pg, (1,0))
    pg.locator('.say-btn').click(); pg.wait_for_timeout(1800)
    check('getUserMedia НЕ вызывается (второе окно в Telegram)',
          pg.evaluate("window.__GUM__")==0,
          f'вызовов: {pg.evaluate("window.__GUM__")}')
    check('распознал с ПЕРВОГО тапа', '100%' in pg.locator('.say-out').inner_text(),
          pg.locator('.say-out').inner_text())
    check('стартов вне жеста нет', pg.evaluate("window.__BLOCKED__")==0,
          f'отказов: {pg.evaluate("window.__BLOCKED__")}')

    # ── 2. МИКРОФОН: повторные нажатия ───────────────────────────
    print('\n[2] Микрофон · ещё 5 нажатий')
    for _ in range(5):
        pg.locator('.say-btn').click(); pg.wait_for_timeout(800)
    check('getUserMedia так и не звали', pg.evaluate("window.__GUM__")==0,
          f'всего: {pg.evaluate("window.__GUM__")}')
    check('стартов вне жеста нет', pg.evaluate("window.__BLOCKED__")==0,
          f'отказов: {pg.evaluate("window.__BLOCKED__")}')

    # ── 3. МИКРОФОН: перезагрузка страницы ───────────────────────
    print('\n[3] Микрофон · после перезагрузки (главное!)')
    pg.reload(wait_until='domcontentloaded'); pg.wait_for_timeout(900)
    pg.evaluate("Lesson.start(1,0)"); pg.wait_for_timeout(700)
    pg.locator('.say-btn').click(); pg.wait_for_timeout(1500)
    check('окно разрешения не звали', pg.evaluate("window.__GUM__")==0,
          f'вызовов: {pg.evaluate("window.__GUM__")}')
    check('распознал сразу, с первого тапа', '100%' in pg.locator('.say-out').inner_text(),
          pg.locator('.say-out').inner_text())
    ctx.close()

    # ── 4. ПОСЛУШАТЬ ─────────────────────────────────────────────
    print('\n[4] Кнопка «Послушать»')
    ctx, pg = new_page(b); boot(pg, (1,0))
    check('автоозвучки при показе слова нет', pg.evaluate("window.__SPEAK__")==0,
          f'сработало {pg.evaluate("window.__SPEAK__")} раз')
    pg.locator('#w-say').click(); pg.wait_for_timeout(1200)
    check('по нажатию озвучивает', pg.evaluate("window.__SPEAK__")>=1,
          f'вызовов speak: {pg.evaluate("window.__SPEAK__")}')
    check('синтез запущен внутри жеста', pg.evaluate("window.__SPEAK_NOGEST__")==0,
          f'вне жеста: {pg.evaluate("window.__SPEAK_NOGEST__")}')
    check('язык озвучки английский',
          any('lang=en' in x for x in pg.evaluate("window.__L__")),
          str([x for x in pg.evaluate("window.__L__") if 'speak' in x][:2]))
    pg.locator('#w-say').click(); pg.wait_for_timeout(900)
    check('работает повторно', pg.evaluate("window.__SPEAK__")>=2,
          f'вызовов: {pg.evaluate("window.__SPEAK__")}')
    ctx.close()

    # ── 5. ЗВУК ВЫКЛЮЧЕН ─────────────────────────────────────────
    print('\n[5] «Послушать» при выключенном звуке в настройках')
    ctx, pg = new_page(b)
    pg.goto(URL, wait_until='domcontentloaded')
    pg.evaluate("localStorage.clear();localStorage.setItem('contextflow_state_v10',JSON.stringify({seenIntro:true,lang:'en',stage:1,progress:{},stats:{},sound:{amb:false,fx:false,tts:false}}))")
    pg.reload(wait_until='domcontentloaded'); pg.wait_for_timeout(900)
    pg.evaluate("Lesson.start(1,0)"); pg.wait_for_timeout(600)
    pg.locator('#w-say').click(); pg.wait_for_timeout(1000)
    check('кнопка всё равно озвучивает', pg.evaluate("window.__SPEAK__")>=1,
          'иначе кнопка выглядит сломанной')
    ctx.close()

    # ── 6. НАВИГАЦИЯ ─────────────────────────────────────────────
    print('\n[6] Экраны и переходы')
    ctx, pg = new_page(b); boot(pg)
    pg.evaluate("Trail.open()"); pg.wait_for_timeout(1500)
    check('карта загрузилась',
          pg.evaluate("(()=>{const i=document.getElementById('map-photo');return i&&i.naturalWidth>0})()"))
    for st in (1,3,5):
        pg.evaluate(f"Trail.zoom({st})"); pg.wait_for_timeout(900)
        check(f'этап {st} открывается', pg.evaluate("Trail.stage")==st)
        pg.evaluate("Trail.overview()"); pg.wait_for_timeout(800)
    pg.evaluate("go('sc-profile')"); pg.wait_for_timeout(600)
    check('профиль открывается', pg.evaluate("document.getElementById('sc-profile').classList.contains('on')"))
    pg.evaluate("go('sc-hub')"); pg.wait_for_timeout(600)
    check('главная открывается', pg.evaluate("document.getElementById('sc-hub').classList.contains('on')"))
    ctx.close()

    # ── 7. УРОКИ ─────────────────────────────────────────────────
    print('\n[7] Все типы уровней')
    ctx, pg = new_page(b); boot(pg)
    for idx, kind in ((0,'слова'), (1,'фразы'), (2,'диалог')):
        pg.evaluate(f"Lesson.start(1,{idx})"); pg.wait_for_timeout(900)
        t = pg.evaluate("Lesson.lv.type")
        check(f'уровень {idx} ({kind}) запускается', t in ('words','build','dialog'), t)
        check(f'  фон сцены загружен',
              pg.evaluate("document.getElementById('scene-img').naturalWidth>0"))
        check(f'  сердца отрисованы',
              pg.evaluate("[...document.querySelectorAll('#hearts img')].every(i=>i.naturalWidth>0)"))
    ctx.close()

    # ── 8. ЖИЗНИ ─────────────────────────────────────────────────
    print('\n[8] Сердца заканчиваются → уровень заново')
    ctx, pg = new_page(b); boot(pg)
    pg.evaluate("Lesson.start(1,1)"); pg.wait_for_timeout(800)
    for _ in range(5):
        pg.evaluate("Lesson.loseLife()"); pg.wait_for_timeout(150)
    pg.wait_for_timeout(1400)
    check('жизни ушли в 0', pg.evaluate("Lesson.lives")<=0)
    check('показан экран срыва',
          'ердц' in (pg.evaluate("document.getElementById('done-title').textContent") or ''),
          pg.evaluate("document.getElementById('done-title').textContent"))
    ctx.close()

    # ── 9. СМЕНА ЯЗЫКА ───────────────────────────────────────────
    print('\n[9] Смена языка')
    ctx, pg = new_page(b); boot(pg)
    for code in ('es','de','fr'):
        pg.evaluate(f"Lang.pick('{code}')"); pg.wait_for_timeout(700)
        check(f'язык {code} выбирается', pg.evaluate("S.lang")==code)
    pg.evaluate("Lesson.start(1,0)"); pg.wait_for_timeout(700)
    check('урок открывается на другом языке', pg.evaluate("!!Lesson.lv"))
    ctx.close()

    # ── 10. СОХРАНЕНИЕ ───────────────────────────────────────────
    print('\n[10] Прогресс сохраняется')
    ctx, pg = new_page(b); boot(pg)
    pg.evaluate("Progress.mark(1,0,0.9); save()"); pg.wait_for_timeout(400)
    pg.reload(wait_until='domcontentloaded'); pg.wait_for_timeout(900)
    check('прогресс пережил перезагрузку',
          pg.evaluate("!!(S.progress && Object.keys(S.progress).length)"),
          str(pg.evaluate("Object.keys(S.progress||{})")))
    ctx.close()

    # ── 11. ОШИБКИ И РЕСУРСЫ ─────────────────────────────────────
    print('\n[11] Ошибки в консоли и битые файлы')
    bad = []
    ctx, pg = new_page(b)
    pg.on('response', lambda r: bad.append(f'{r.status} {r.url.split("/")[-1]}') if r.status>=400 else None)
    boot(pg)
    pg.evaluate("Trail.open()"); pg.wait_for_timeout(1200)
    pg.evaluate("Lesson.start(1,0)"); pg.wait_for_timeout(1000)
    pg.evaluate("go('sc-profile')"); pg.wait_for_timeout(800)
    errs = pg.evaluate("window.__ERR__")
    check('нет ошибок JS', len(errs)==0, str(errs[:2]))
    check('нет битых файлов', len(bad)==0, str(bad[:3]))
    ctx.close()

    b.close()

print('\n' + '='*64)
print(f'Проверок пройдено: {passed}')
if fails:
    print(f'СЛОМАНО: {len(fails)}')
    for f in fails: print('  ·', f)
    sys.exit(1)
print('Сломать не удалось.')

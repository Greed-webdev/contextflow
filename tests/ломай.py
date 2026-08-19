#!/usr/bin/env python3
"""
САБАГЕНТ-ЛОМАТЕЛЬ. Его работа — доказать, что микрофон НЕ работает.
Он моделирует реальные пакости телефона, а не удобный идеальный случай.

Запуск:  python3 tests/ломай.py [адрес]
По умолчанию проверяет живой сайт.
"""
import sys, json
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'https://greed-webdev.github.io/contextflow/'

STATE = ("localStorage.setItem('contextflow_state_v10',JSON.stringify("
         "{seenIntro:true,lang:'en',stage:1,progress:{},stats:{},"
         "sound:{amb:false,fx:false,tts:false}}))")

# ── Подделка распознавания, которая ЖЁСТКО следит за правилами браузера ──
SPY = """
window.__LOG__=[]; window.__GUM__=0; window.__STARTS__=0; window.__MIC_BUSY__=false;
window.__GESTURE__=false; window.__BLOCKED__=0;

// любой чужой захват микрофона фиксируем
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
  const _g = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = function(c){
    window.__GUM__++; window.__LOG__.push('getUserMedia #'+window.__GUM__);
    return _g(c).then(s=>{
      window.__MIC_BUSY__=true;
      s.getTracks().forEach(t=>{const _s=t.stop.bind(t);t.stop=()=>{window.__MIC_BUSY__=false;_s();}});
      return s;
    });
  };
}

// отмечаем окно «живого жеста»: браузер даёт ~1 тик после клика
document.addEventListener('pointerdown', ()=>{
  window.__GESTURE__=true;
  setTimeout(()=>{ window.__GESTURE__=false; }, 0);
}, true);

class StrictRec {
  constructor(){ this.lang=''; this.interimResults=false; this.maxAlternatives=1; }
  start(){
    window.__STARTS__++;
    // ПРАВИЛО 1: старт вне жеста пользователя — мобильный браузер откажет
    if (!window.__GESTURE__){
      window.__BLOCKED__++;
      window.__LOG__.push('ОТКАЗ: start() вне жеста пользователя');
      const s=this; setTimeout(()=>s.onerror&&s.onerror({error:'not-allowed'}),10);
      return;
    }
    // ПРАВИЛО 2: микрофон занят чужим потоком — слышим тишину
    if (window.__MIC_BUSY__){
      window.__LOG__.push('ОТКАЗ: микрофон занят другим потоком');
      const s=this; setTimeout(()=>s.onerror&&s.onerror({error:'no-speech'}),10);
      return;
    }
    window.__LOG__.push('OK: слушаю');
    const s=this;
    setTimeout(()=>s.onstart&&s.onstart(), 10);
    setTimeout(()=>{
      s.onspeechstart&&s.onspeechstart();
      const mode = window.__MODE__ || 'final';
      if (mode==='interim_only'){          // телефон отдал только черновик и оборвался
        const r=[{0:{transcript:'Hello'},length:1,isFinal:false}];
        r[Symbol.iterator]=Array.prototype[Symbol.iterator];
        s.onresult&&s.onresult({results:r,resultIndex:0});
        setTimeout(()=>s.onend&&s.onend(), 120);
      } else if (mode==='silence'){         // человек молчал
        s.onerror&&s.onerror({error:'no-speech'});
      } else {
        const r=[{0:{transcript:'Hello'},length:1,isFinal:true}];
        r[Symbol.iterator]=Array.prototype[Symbol.iterator];
        s.onresult&&s.onresult({results:r,resultIndex:0});
      }
    }, 150);
  }
  stop(){ if(this.onend) this.onend(); }
  abort(){ if(this.onend) this.onend(); }
}
window.SpeechRecognition = StrictRec;
window.webkitSpeechRecognition = StrictRec;
"""

fails = []

def check(name, ok, detail=''):
    print(('  ПРОШЁЛ  ' if ok else '  ПРОВАЛ  ') + name + (f'   → {detail}' if detail else ''))
    if not ok:
        fails.append(name)

def lesson(pg):
    pg.goto(URL, wait_until='domcontentloaded')
    pg.evaluate(STATE)
    pg.reload(wait_until='domcontentloaded')
    pg.wait_for_timeout(900)
    pg.evaluate("Lesson.start(1,0)")
    pg.wait_for_timeout(700)

with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-fake-device-for-media-stream',
                                '--use-fake-ui-for-media-stream'])

    print(f'\nЛОМАЮ: {URL}\n' + '─'*62)

    # ТЕСТ 1 — настоящее нажатие пальцем, а не программный вызов
    print('\n1. Нажатие пальцем (жест пользователя)')
    ctx = b.new_context(viewport={'width':390,'height':820}, permissions=['microphone'],
        user_agent='Mozilla/5.0 (Linux; Android 13; Redmi Note 12) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36')
    pg = ctx.new_page(); pg.add_init_script(SPY); lesson(pg)
    pg.locator('.say-btn').tap() if False else pg.locator('.say-btn').click()
    pg.wait_for_timeout(1500)
    log = pg.evaluate("window.__LOG__")
    check('start() вызван внутри жеста', pg.evaluate("window.__BLOCKED__")==0,
          f'заблокировано: {pg.evaluate("window.__BLOCKED__")}')
    check('распознал слово', '100%' in pg.locator('.say-out').inner_text(),
          pg.locator('.say-out').inner_text())
    check('чужих захватов микрофона нет', pg.evaluate("window.__GUM__")==0,
          f'getUserMedia вызван {pg.evaluate("window.__GUM__")} раз')
    print('     журнал:', log)

    # ТЕСТ 2 — пять нажатий подряд: ни одного лишнего окна
    print('\n2. Пять попыток подряд')
    for i in range(4):
        pg.locator('.say-btn').click(); pg.wait_for_timeout(900)
    check('окно разрешения не повторяется', pg.evaluate("window.__GUM__")==0,
          f'getUserMedia всего: {pg.evaluate("window.__GUM__")}')
    check('все попытки распознаны', pg.evaluate("window.__BLOCKED__")==0,
          f'отказов: {pg.evaluate("window.__BLOCKED__")}')
    ctx.close()

    # ТЕСТ 3 — телефон отдал только черновик и оборвал связь
    print('\n3. Обрыв: только промежуточный результат')
    ctx = b.new_context(viewport={'width':390,'height':820}, permissions=['microphone'])
    pg = ctx.new_page(); pg.add_init_script(SPY); lesson(pg)
    pg.evaluate("window.__MODE__='interim_only'")
    pg.locator('.say-btn').click(); pg.wait_for_timeout(2000)
    txt = pg.locator('.say-out').inner_text()
    check('черновик не потерян', 'Hello' in txt, txt)
    ctx.close()

    # ТЕСТ 4 — человек промолчал
    print('\n4. Тишина')
    ctx = b.new_context(viewport={'width':390,'height':820}, permissions=['microphone'])
    pg = ctx.new_page(); pg.add_init_script(SPY); lesson(pg)
    pg.evaluate("window.__MODE__='silence'")
    pg.locator('.say-btn').click(); pg.wait_for_timeout(2000)
    txt = pg.locator('.say-out').inner_text()
    check('внятное сообщение о тишине', 'ишин' in txt or 'громче' in txt, txt)
    check('кнопка снова активна', pg.evaluate("!Voice.busy"))
    ctx.close()

    # ТЕСТ 5 — второй заход, разрешение должно помниться
    print('\n5. Повторный визит (память разрешения)')
    ctx = b.new_context(viewport={'width':390,'height':820}, permissions=['microphone'])
    pg = ctx.new_page(); pg.add_init_script(SPY); lesson(pg)
    pg.locator('.say-btn').click(); pg.wait_for_timeout(1200)
    pg.reload(wait_until='domcontentloaded'); pg.wait_for_timeout(900)
    pg.evaluate("Lesson.start(1,0)"); pg.wait_for_timeout(700)
    pg.locator('.say-btn').click(); pg.wait_for_timeout(1500)
    check('после перезагрузки работает сразу', '100%' in pg.locator('.say-out').inner_text(),
          pg.locator('.say-out').inner_text())
    check('окон разрешения по-прежнему нет', pg.evaluate("window.__GUM__")==0)
    ctx.close()

    # ТЕСТ 6 — на другом уровне (сборка фразы)
    print('\n6. Уровень «собери фразу»')
    ctx = b.new_context(viewport={'width':390,'height':820}, permissions=['microphone'])
    pg = ctx.new_page(); pg.add_init_script(SPY)
    pg.goto(URL, wait_until='domcontentloaded'); pg.evaluate(STATE)
    pg.reload(wait_until='domcontentloaded'); pg.wait_for_timeout(900)
    pg.evaluate("Lesson.start(1,1)"); pg.wait_for_timeout(700)
    pg.evaluate("""(()=>{const t=Lesson.lv.tasks[0];t.parts.forEach(p=>{
      const c=[...document.querySelectorAll('#bank .chip')].find(x=>x.textContent===p&&!x.classList.contains('used'));
      c&&c.click();});})()""")
    pg.wait_for_timeout(200); pg.click('#l-action'); pg.wait_for_timeout(800)
    has = pg.locator('.say-btn').count()
    check('кнопка появилась после проверки', has==1)
    if has:
        pg.locator('.say-btn').click(); pg.wait_for_timeout(1500)
        check('распознаёт и здесь', pg.evaluate("window.__BLOCKED__")==0)
    ctx.close()

    b.close()

print('\n' + '─'*62)
if fails:
    print(f'СЛОМАНО: {len(fails)}')
    for f in fails: print('  ·', f)
    sys.exit(1)
print('Сломать не удалось — всё держится.')

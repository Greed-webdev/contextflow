# БАГ-РЕПОРТ · UI-слой · настоящий браузер

**Репозиторий:** `Greed-webdev/contextflow-task-1-1-112` · **Коммит:** `e6044f7` · **APP_VERSION** `v34`
**SHA `js/app.js`:** `27ceb7d0de9552656ccd9e0299c3165d88cad43c`
**Инструмент:** `qa/ui-real.js` — puppeteer + Chromium 148, реальный DOM.

**Вердикт: FAIL — `✗ 3` корневых дефекта (11 срабатываний)**

---

## Почему ваш гейт зелёный, а приложение падает

`qa/ui-log.js` — это **DOM-шим**, эмуляция на объектах, а не браузер. На том же коммите:

```
ui-log.js (шим):     293 уровня, 9487 действий, падений: 0
ui-real.js (Chrome): 11 падений
```

Шим не воспроизводит порядок выполнения таймеров, реальный `localStorage` и всплытие исключений. Гейт «0 падений» не означает, что приложение работает.

---

## Негативные сценарии прогона

| # | Сценарий | Итог |
|---|---|---|
| 1 | Холодный старт | ✓ |
| 2 | Порча `localStorage`, 9 видов | ✗ 2 из 9 |
| 3 | `localStorage` заблокирован (приватный режим) | ✓ |
| 4 | Квота переполнена при `save()` | ✗ |
| 5 | Микрофон заблокирован | ✓ |
| 6 | Обрыв сети | ✓ |
| 7 | Быстрая навигация по вкладкам | ✗ |
| 8 | Грязный ввод (10 видов), XSS, спам 12 кликами | ✓ |
| 9 | Уход с экрана во время урока | ✗ |

---

## BUG-U1 · `S.progress` становится `null` — падает весь хаб

**1. Путь:** `js/app.js:17–19` (`load`), проявляется в `js/app.js:341` (`levelDone`)
**2. SHA:** `27ceb7d0de9552656ccd9e0299c3165d88cad43c`
**3. Лог браузера:**

```
навигация · JS-исключение: Cannot read properties of null (reading 'en:1:0')
            Object.levelDone (js/app.js:341:43)
навигация · sc-profile → Cannot read properties of null (reading 'levels')
урок      · то же, дважды
гонка     · то же, трижды
```

Код:

```js
function load(){
  try{ return Object.assign({}, DEFAULT, JSON.parse(localStorage.getItem(KEY)) || {}); }
  catch(e){ return Object.assign({}, DEFAULT); }
}
```

```js
levelDone(st, idx){ return !!(S.progress[pkey(st,idx)] || {}).done; }
```

`Object.assign` — поверхностное слияние. Значение `null` во вложенном поле валидно для `JSON.parse`, `try` не срабатывает, `DEFAULT.progress` затирается.

Дальше `S.progress[...]` бросает на каждом рендере хаба, карты и профиля. То же с `S.stats` → `reading 'levels'`.

**Фикс:**

```js
function load(){
  let raw = {};
  try{ raw = JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){}
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) raw = {};
  const s = Object.assign({}, DEFAULT, raw);
  const obj = (v, d) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : d;
  s.progress = obj(raw.progress, {});
  s.stats    = Object.assign({}, DEFAULT.stats, obj(raw.stats, {}));
  s.sound    = Object.assign({}, DEFAULT.sound, obj(raw.sound, {}));
  return s;
}
```

---

## BUG-U2 · `save()` бросает исключение наружу

**1. Путь:** `js/app.js:21`
**3. Лог:**

```
квота · save() бросает наружу → QuotaExceededError: QuotaExceededError
```

```js
function save(){ localStorage.setItem(KEY, JSON.stringify(S)); }
```

`load()` защищён `try`, `save()` — нет. Квота, приватный режим iOS, отключённое хранилище в WebView → исключение всплывает в обработчик клика, остаток кода не выполняется. Кнопка «залипает» без объяснений.

**Фикс:**

```js
let _storageOK = true;
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(S)); _storageOK = true; }
  catch(e){
    if (_storageOK){ _storageOK = false; toast('Прогресс не сохраняется — нет места в памяти'); }
  }
}
```

---

## BUG-U3 · Таймеры урока живут после ухода с экрана

**1. Путь:** `js/app.js:1168` и ещё 14 `setTimeout` в объекте `Lesson`
**3. Лог:**

```
гонка · JS-исключение: Cannot read properties of null (reading 'total')
гонка · Cannot read properties of null (reading 'en:1:0')
```

Сценарий стенда: открыть урок → отправить ответ → немедленно `go('sc-hub')` → подождать 1.5 с. Таймеры продолжают работать на выгруженном экране, `box.innerHTML=''` затирает чужой DOM, обращения к `this.lv` падают на `null`.

В `Lesson` **15 `setTimeout` против 4 `clearTimeout`**. `go()` (строка 36) экраны переключает, но таймеры не гасит.

**Фикс:**

```js
// в объекте Lesson
_timers: [],
later(fn, ms){
  const id = setTimeout(()=>{ this._timers = this._timers.filter(x=>x!==id); fn(); }, ms);
  this._timers.push(id); return id;
},
clearTimers(){ this._timers.forEach(clearTimeout); this._timers = []; },
```

```js
// в go(), до переключения экранов
if (current === 'sc-lesson' && id !== 'sc-lesson') Lesson.clearTimers();
```

Затем заменить `setTimeout(` на `this.later(` во всех методах `Lesson`.

---

## BUG-U4 · `STAGES[st].art` — undefined на несуществующем этапе

**1. Путь:** `js/app.js:198`, `395`, `1953`, `2236`
**3. Лог:**

```
LS:stage=строка   · JS-исключение: Cannot read properties of undefined (reading 'art')
LS:глубокий null  · JS-исключение: Cannot read properties of undefined (reading 'art')
```

`Progress.overall()` жёстко перебирает `st=1..5`, обращения к `STAGES[st].art` без проверки. При `S.stage` вне диапазона или строкой — исключение.

Приложение при этом поднимается (`sc-hub` рендерится), но в консоли ошибка и часть карты не отрисовывается.

**Фикс:** `const art = (STAGES[st]||{}).art || 'assets/map/mountain-map.png';`

---

## Что выдержало

**XSS — экранирование работает.** `<script>alert(1)</script>` в реплику игрока: тегов в `.chat` нет, скрипт не исполнен. Фикс `6e2937f` подтверждаю в реальном браузере.

**Грязный ввод — 10 из 10 без падений:** `!@#$%^&*()`, кириллица, пустая строка, 3000 символов, `<script>`, JSON, `\u0000\u0001`, эмодзи, `null`, `undefined`.

**Спам 12 быстрыми кликами** по «Не знаю» / «Дальше» / «Исправить» — без исключений.

**Микрофон заблокирован** (`getUserMedia` → `NotAllowedError`, `SpeechRecognition` удалён) — стартует.

**Offline** — `loadVoiceMap()` не роняет приложение.

**`localStorage` полностью заблокирован** — приложение поднимается. `load()` защищён верно.

**Порча `localStorage`, 7 из 9 видов** — `{сломано`, `null`, `[1,2,3]`, `{"sound":null}`, `{"stats":"нет"}`, `{"progress":42}`, `{"lang":"zz"}` — приложение стартует.

---

## Приоритет

1. **BUG-U1** — 8 срабатываний из 11, роняет хаб/карту/профиль
2. **BUG-U3** — порча данных при быстрой навигации, незаметна пользователю
3. **BUG-U2** — молчаливая потеря прогресса
4. **BUG-U4** — косметика, но ошибка в консоли

---

## Приёмка

```
node qa/ui-real.js http://127.0.0.1:8099/index.html   → ✗ 0
```

Стенд: `qa/ui-real.js`, требует `npm i puppeteer` и системные библиотеки Chromium (`libnspr4`, `libnss3`, `libatk1.0-0`, `libgbm1`, `libasound2`).

Рекомендую заменить им `ui-log.js` в гейте либо гонять оба: шим быстрый, браузер честный.

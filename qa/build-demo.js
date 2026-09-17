// Сборка демо-страницы из сцен приложения (демо-10 = шаблон оболочки).
// Запуск: node qa/build-demo.js <имя-файла> <партия-заголовок> <сцена1> <сцена2> <сцена3>
// Пример: node qa/build-demo.js демо-11.html 7 "На языковых курсах" "Оплата на кассе" "Открыть счёт"
const fs = require('fs');
const LESS = '/home/user/js/lessons.js';
const TEMPLATE = '/home/user/демо-10.html';

const [outFile, party, ...titles] = process.argv.slice(2);
if (!outFile || !party || titles.length !== 3) {
  console.error('Использование: node qa/build-demo.js <файл> <№ партии> <сцена1> <сцена2> <сцена3>');
  process.exit(1);
}

const src = fs.readFileSync(LESS, 'utf8');

/* номер уровня — из самой COURSE: прогоняем lessons.js в vm и ищем сцену */
const vm = require('vm');
const sb = {}; vm.createContext(sb);
vm.runInContext(src, sb, { timeout: 5000 });
function levelNo(title) {
  for (const s of [1, 2, 3, 4, 5]) {
    let arr = [];
    try { arr = sb.getCourse('en', s) || []; } catch (e) { continue; }
    const idx = arr.findIndex(l => l.title === title);
    if (idx > -1) return idx + 1;
  }
  return '?';
}

function flowSlice(title) {
  const i = src.indexOf("title:'" + title + "'", src.indexOf('COURSE'));
  if (i < 0) { console.error('сцена не найдена: ' + title); process.exit(1); }
  const f = src.indexOf('flow:', i);
  if (f < 0 || src.indexOf("type:'words'", i) < f) { console.error('нет потока у сцены: ' + title); process.exit(1); }
  let j = src.indexOf('{', f);
  let depth = 0, inStr = false, q = '';
  for (; j < src.length; j++) {
    const c = src[j];
    if (inStr) {
      if (c === '\\') { j++; continue; }
      if (c === q) inStr = false;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { inStr = true; q = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (!depth) { j++; break; } }
  }
  let slice = src.slice(src.indexOf('{', f), j);
  /* старый формат мог нести title внутри flow — убираем дубль перед инъекцией */
  slice = slice.replace(/^\{\s*title:\s*('[^']*'|"[^"]*")\s*,/, '{');
  /* сцена в демо обязана нести имя и номер — кнопки выбора и шапка берут их отсюда */
  return '{ title:' + JSON.stringify(title + ' · ур. ' + levelNo(title)) + ',' + slice.slice(1);
}

const scenes = titles.map((t, k) => 'const S' + (k + 1) + ' = ' + flowSlice(t) + ';');

let html = fs.readFileSync(TEMPLATE, 'utf8');
const a = html.indexOf('const S1 = {');
const b = html.indexOf('const SCENES=', a);
if (a < 0 || b < 0) { console.error('шаблон демо-10: не найдены сцены'); process.exit(1); }
html = html.slice(0, a) + scenes.join('\n') + '\n' + html.slice(b);

/* шапка: номер партии и уровни из самих сцен */
const lvls = scenes.map(s => { const m = s.match(/ур\. (\d+)/); return m ? m[1] : '?'; }).join(', ');
html = html.replace(/<title>[^<]*<\/title>/, '<title>Партия ' + party + ' ветвей · ур. ' + lvls + '</title>');
html = html.replace(/(<h1>)[^<]*(<\/h1>)/, '$1Партия ' + party + ': разговор идёт за тобой$2');
html = html.replace(/(<p class="sub">)[^<]*/, '$1Три сцены с ветвями (ур. ' + lvls + '). Ответь иначе — и собеседник ответит иначе. Сначала проверь тут — потом в приложение.');

fs.writeFileSync('/home/user/' + outFile, html);
console.log('Собрано: ' + outFile + ' (партия ' + party + ', уровни ' + lvls + ')');

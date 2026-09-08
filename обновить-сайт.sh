#!/bin/bash
# Отправить свежую версию на сайт.
#   ./обновить-сайт.sh            — обновить
#   GH_TOKEN=ghp_xxx ./обновить-сайт.sh   — если токен слетел, передать заново
cd "$(dirname "$0")" || exit 1

REPO="Greed-webdev/contextflow"
SITE="https://greed-webdev.github.io/contextflow/"

if [ -z "$GH_TOKEN" ]; then
  echo "Нужен токен GitHub. Запусти так:"
  echo "  GH_TOKEN=ghp_твой_токен ./обновить-сайт.sh"
  echo
  echo "Новый токен: https://github.com/settings/tokens/new  (галочка repo)"
  exit 1
fi

echo "Собираю свежую версию…"
rm -rf /tmp/pages && mkdir -p /tmp/pages
cp index.html /tmp/pages/
cp -r css js /tmp/pages/
# Тяжёлое (assets, ~32 МБ) локально не храним — берём из GitHub main.
# Если assets есть локально (разработка) — используем его.
ASSETS_SRC="assets"
if [ ! -d "$ASSETS_SRC" ]; then
  echo "  assets: локально нет — беру из GitHub main"
  rm -rf /tmp/cf-assets
  git clone --depth 1 -q -b main "https://github.com/$REPO.git" /tmp/cf-assets || { echo "  ✘ не смог получить assets с GitHub"; exit 1; }
  ASSETS_SRC="/tmp/cf-assets/assets"
fi
cp -r "$ASSETS_SRC" /tmp/pages/assets

# ── ТЯЖЁЛЫЕ ФАЙЛЫ ХРАНЯТСЯ ТОЛЬКО НА САЙТЕ ───────────────────────
# Голосовой движок весит 40 МБ. В рабочей папке его держать незачем:
# он никогда не редактируется. Поэтому если локально его нет —
# берём готовый прямо с сайта и кладём обратно. Рабочая папка чистая.
STT_DIR="/tmp/pages/assets/stt"
mkdir -p "$STT_DIR"
if [ -f "$ASSETS_SRC/stt/model-en.tar.gz" ]; then
  echo "  голосовой движок: есть в assets"
  cp "$ASSETS_SRC/stt/model-en.tar.gz" "$STT_DIR/"
else
  echo "  голосовой движок: качаю с сайта (в рабочей папке не храним)"
  if ! curl -sfL -o "$STT_DIR/model-en.tar.gz" "${SITE}assets/stt/model-en.tar.gz"; then
    echo "  ! не смог забрать с сайта — собираю заново из первоисточника"
    ./поставить-голос.sh >/dev/null 2>&1 && cp assets/stt/model-en.tar.gz "$STT_DIR/"
  fi
fi
SZ=$(du -h "$STT_DIR/model-en.tar.gz" 2>/dev/null | cut -f1)
echo "  голосовой движок готов: ${SZ:-НЕТ}"
rm -f /tmp/pages/assets/map/mountain-with-signs.png /tmp/pages/assets/scenes/hero-dusk.jpg 2>/dev/null
cp _headers /tmp/pages/ 2>/dev/null
touch /tmp/pages/.nojekyll

# GitHub Pages кэширует файлы на 10 минут и игнорирует _headers.
# Поэтому дописываем к адресам css/js метку версии — браузер обязан скачать заново.
V=$(date +%s)
python3 - "$V" <<'PYEOF'
import re, sys
v = sys.argv[1]
p = '/tmp/pages/index.html'
s = open(p, encoding='utf-8').read()
s = re.sub(r'(href="css/[^"]*\.css)(\?v=[0-9]+)?"', r'\1?v=' + v + '"', s)
s = re.sub(r'(src="js/[^"]*\.js)(\?v=[0-9]+)?"',   r'\1?v=' + v + '"', s)
open(p, 'w', encoding='utf-8').write(s)
print('  метка версии:', v)
PYEOF

cd /tmp/pages || exit 1
git init -q
git config user.email "dev@contextflow.local"
git config user.name  "ContextFlow"
git add -A
git commit -q -m "обновление $(date '+%d.%m %H:%M')"
git branch -M main
git remote add origin "https://Greed-webdev:$GH_TOKEN@github.com/$REPO.git"

rm -rf /tmp/cf-assets 2>/dev/null

echo "Отправляю на GitHub…"
if git push -qf origin main 2>&1 | tail -2; then
  echo "✔ Отправлено. Сайт обновится за 1-2 минуты:"
  echo "  $SITE"
  echo
  echo "В Telegram: закрой мини-приложение полностью и открой заново."
else
  echo "✘ Не получилось. Скорее всего истёк токен — сделай новый."
fi

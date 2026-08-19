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
cp -r css js assets /tmp/pages/
rm -f /tmp/pages/assets/map/mountain-with-signs.png /tmp/pages/assets/scenes/hero-dusk.jpg 2>/dev/null
cp _headers /tmp/pages/ 2>/dev/null
touch /tmp/pages/.nojekyll

cd /tmp/pages || exit 1
git init -q
git config user.email "dev@contextflow.local"
git config user.name  "ContextFlow"
git add -A
git commit -q -m "обновление $(date '+%d.%m %H:%M')"
git branch -M main
git remote add origin "https://Greed-webdev:$GH_TOKEN@github.com/$REPO.git"

echo "Отправляю на GitHub…"
if git push -qf origin main 2>&1 | tail -2; then
  echo "✔ Отправлено. Сайт обновится за 1-2 минуты:"
  echo "  $SITE"
  echo
  echo "В Telegram: закрой мини-приложение полностью и открой заново."
else
  echo "✘ Не получилось. Скорее всего истёк токен — сделай новый."
fi

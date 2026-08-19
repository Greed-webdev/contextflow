#!/bin/bash
# ContextFlow · сохранение точки отката.
# Использование:  ./save.sh "что сделали"
#                 ./save.sh            (сообщение подставится автоматически)
#                 ./save.sh --zip      (ещё и собрать contextflow.zip для скачивания)
cd "$(dirname "$0")" || exit 1

ZIP=0
[ "$1" = "--zip" ] && { ZIP=1; shift; }

MSG="${1:-снимок $(date '+%d.%m %H:%M')}"

git add -A
if git diff --cached --quiet; then
  echo "Изменений нет — сохранять нечего."
else
  git commit -q -m "$MSG"
  echo "✔ Сохранено: $MSG"
fi

# живая копия последней рабочей версии — на случай если git не под рукой
mkdir -p backup
cp index.html      backup/index-last.html   2>/dev/null
cp css/map.css     backup/map-last.css      2>/dev/null
cp css/theme.css   backup/theme-last.css    2>/dev/null
cp js/app.js       backup/app-last.js       2>/dev/null
cp js/lessons.js   backup/lessons-last.js   2>/dev/null

if [ "$ZIP" = "1" ]; then
  rm -f contextflow.zip
  zip -qr contextflow.zip index.html css js assets original RULES.md
  echo "✔ Архив: contextflow.zip ($(du -h contextflow.zip | cut -f1)) — можно скачать"
fi

echo "История:"
git log --oneline | head -5

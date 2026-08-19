#!/bin/bash
# ContextFlow · сохранение точки отката.
# Использование:  ./save.sh "что сделали"
#                 ./save.sh            (сообщение подставится автоматически)
#                 ./save.sh --zip      (ещё и собрать contextflow.zip для скачивания)
cd "$(dirname "$0")" || exit 1

# настройки git не переживают перезапуск воркспейса — задаём каждый раз
git config user.email "dev@contextflow.local" 2>/dev/null
git config user.name  "ContextFlow" 2>/dev/null

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
  # понятное имя: дата + номер версии, чтобы в папке "Загрузки" было видно что новее
  N=$(git rev-list --count HEAD)
  NAME="ContextFlow-$(date '+%Y-%m-%d')-v$N.zip"

  # шпаргалка внутрь архива — что это и на чём остановились
  {
    echo "ContextFlow — приложение для изучения языков"
    echo "Архив собран: $(date '+%d.%m.%Y %H:%M')"
    echo "Версия: v$N"
    echo ""
    echo "Последнее, что делали:"
    git log --pretty='  %ad · %s' --date=format:'%d.%m' | head -8
    echo ""
    echo "Как продолжить: открыть новый чат, загрузить этот архив"
    echo "и написать «вот архив проекта, распакуй и продолжаем»."
    echo "Запуск локально: открыть index.html в браузере."
  } > ЧТО-ЭТО.txt

  rm -f ContextFlow-*.zip contextflow.zip
  zip -qr "$NAME" index.html index-graphite-rocket.html css js assets original uploads \
      RULES.md save.sh ЧТО-ЭТО.txt КАК-НЕ-ПОТЕРЯТЬ-ПРОЕКТ.md .git
  echo "✔ Архив: $NAME ($(du -h "$NAME" | cut -f1))"
  echo "  В «Загрузках» он будет с датой — старые можно смело удалять."
fi

echo "История:"
git log --oneline | head -5

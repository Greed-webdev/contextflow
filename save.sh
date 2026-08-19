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

# копии рабочих файлов — храним только 3 последние папки
mkdir -p backup
SNAP="backup/$(date '+%Y-%m-%d_%H%M')"
mkdir -p "$SNAP"
cp index.html css/map.css css/theme.css js/app.js js/lessons.js "$SNAP/" 2>/dev/null
echo "$MSG" > "$SNAP/что-меняли.txt"

# ротация: всё кроме трёх свежих папок удаляем
ls -1dt backup/*/ 2>/dev/null | tail -n +4 | xargs -r rm -rf

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

  # версия одним файлом — для телефона, работает без интернета
  python3 tools-bundle.py >/dev/null 2>&1 && echo "✔ Один файл для телефона: ContextFlow-offline.html"

  rm -f ContextFlow-*.zip contextflow.zip
  zip -qr "$NAME" index.html graphite-rocket-СТАРАЯ.html css js assets original uploads \
      RULES.md save.sh tools-bundle.py ЧТО-ЭТО.txt КАК-НЕ-ПОТЕРЯТЬ-ПРОЕКТ.md .git \
      ContextFlow-offline.html
  echo "✔ Архив: $NAME ($(du -h "$NAME" | cut -f1))"
  echo "  В «Загрузках» он будет с датой — старые можно смело удалять."
fi

echo "История:"
git log --oneline | head -5

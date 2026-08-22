#!/bin/bash
# Скачивает голосовой движок (модель распознавания речи, ~40 МБ).
#
# Зачем отдельно: модель весит 40 МБ и не хранится в истории проекта,
# иначе папка .git раздувается. Файл нужен для работы кнопки «Сказать».
#
# Запуск:  ./поставить-голос.sh

set -e
cd "$(dirname "$0")"

DST="assets/stt/model-en.tar.gz"
URL="https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"

if [ -f "$DST" ]; then
  echo "✔ Голосовой движок уже на месте: $DST"
  du -h "$DST"
  exit 0
fi

echo "Качаю модель распознавания речи (~40 МБ)…"
mkdir -p assets/stt
TMP=$(mktemp -d)
curl -sL -o "$TMP/m.zip" "$URL"

echo "Распаковываю…"
unzip -q "$TMP/m.zip" -d "$TMP/x"
mv "$TMP/x/vosk-model-small-en-us-0.15" "$TMP/x/model"

echo "Собираю в нужный формат…"
tar czf "$DST" -C "$TMP/x" model
rm -rf "$TMP"

echo "✔ Готово: $DST"
du -h "$DST"

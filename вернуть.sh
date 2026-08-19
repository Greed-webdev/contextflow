#!/bin/bash
# Достать файл, который был удалён из папки, но остался в истории.
#
#   ./вернуть.sh              — показать, что вообще можно вернуть
#   ./вернуть.sh карта        — вернуть по куску имени
#   ./вернуть.sh все          — вернуть всё удалённое разом
cd "$(dirname "$0")" || exit 1
git config user.email "dev@contextflow.local" 2>/dev/null
git config user.name  "ContextFlow" 2>/dev/null
git config core.quotepath false 2>/dev/null   # чтобы русские имена не превращались в кракозябры

# все файлы, которые когда-либо были, но сейчас отсутствуют
deleted() {
  git log --pretty=format: --name-only --diff-filter=A | sort -u | grep -v '^$' | while read -r f; do
    [ -f "$f" ] || echo "$f"
  done
}

if [ -z "$1" ]; then
  echo "Можно вернуть:"
  echo
  deleted | while read -r f; do
    printf "  %-46s %s\n" "$f" "$(git log -1 --pretty='%ad' --date=format:'%d.%m' -- "$f")"
  done
  echo
  echo "Как: ./вернуть.sh часть-имени     например  ./вернуть.sh signs"
  echo "     ./вернуть.sh все"
  exit 0
fi

restore_one() {
  f="$1"
  # берём коммит ПЕРЕД удалением: там файл ещё существует.
  # rev-list -n1 вернул бы сам коммит удаления, где файла уже нет -> пустышка.
  c=$(git rev-list -n 1 HEAD -- "$f")
  [ -z "$c" ] && { echo "не нашёл в истории: $f"; return; }
  if git cat-file -e "$c:$f" 2>/dev/null; then
    src="$c"
  else
    src="$c^"   # родитель коммита удаления
  fi
  if ! git cat-file -e "$src:$f" 2>/dev/null; then
    echo "не смог достать: $f"; return
  fi
  mkdir -p "$(dirname "$f")"
  git show "$src:$f" > "$f" 2>/dev/null
  if [ -s "$f" ]; then
    echo "✔ вернул: $f ($(du -h "$f" | cut -f1))"
  else
    rm -f "$f"; echo "не смог достать: $f"
  fi
}

if [ "$1" = "все" ] || [ "$1" = "all" ]; then
  deleted | while read -r f; do restore_one "$f"; done
  exit 0
fi

FOUND=0
while read -r f; do
  case "$f" in *"$1"*) restore_one "$f"; FOUND=1;; esac
done < <(deleted)

[ "$FOUND" = "0" ] && { echo "Ничего не нашёл по слову «$1». Список: ./вернуть.sh"; exit 1; }
exit 0

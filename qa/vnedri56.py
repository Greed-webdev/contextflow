#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Внедрение партий 5-6 в js/lessons.js: линейные диалоги «Показать квартиру»,
# «Что-то сломалось», «Найти банк» (демо-9) и «Купить билет», «Объяснить дорогу»,
# «Рассказать о работе» (демо-10) переводятся в variant:'flow' 1-в-1 с демо.
# Механика — как в vnedri34.py (партии 3-4).
import re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf8')

def read(f): return open(f, encoding='utf8').read()
def write(f, s): open(f, 'w', encoding='utf8').write(s)

def сцены(html):
    out = {}
    for i in (1, 2, 3):
        m = re.search(r'const S%d = (\{.*?\n\});' % i, html, re.S)
        assert m, 'S%d не найдена' % i
        out['S%d' % i] = m.group(1)
    return out

demo9 = сцены(read('демо-9.html'))
demo10 = сцены(read('демо-10.html'))

план = [
    (demo9['S1'], 'Показать квартиру'),
    (demo9['S2'], 'Что-то сломалось'),
    (demo9['S3'], 'Найти банк'),
    (demo10['S1'], 'Купить билет'),
    (demo10['S2'], 'Объяснить дорогу'),
    (demo10['S3'], 'Рассказать о работе'),
]

lessons = read('js/lessons.js')

def границы(title):
    pat = "{ type:'dialog', title:'%s'" % title
    i = lessons.find(pat)
    assert i > 0, 'нет урока ' + title
    a = lessons.rfind('\n', 0, i) + 1
    nxt = lessons.find('\n      { type:', i)
    assert nxt > 0, 'нет следующего элемента после ' + title
    return a, nxt + 1

def parse_head(block):
    m = re.search(r"scene:'([^']*)',\s*cefr:'([^']*)'", block)
    return m.group(1), m.group(2)

def flow_body(сцена):
    lines = сцена.split('\n')
    first = lines[0]
    assert first.strip().startswith('{ title:'), first[:80]
    body = lines[1:]
    if body and body[-1].strip() == '}':
        body.pop()
    intro_line = body[0].strip() if body else ''
    m = re.match(r"intro:'(.*)',$", intro_line)
    assert m, 'intro не найден: ' + intro_line[:100]
    intro = m.group(1)
    out = []
    for ln in body:
        out.append('      ' + ln if ln.strip() else ln)
    return intro, '\n'.join(out)

for сцена, title in план:
    a, b = границы(title)
    old = lessons[a:b]
    scene_, cefr_ = parse_head(old)
    intro, body = flow_body(сцена)
    lines = body.split('\n')
    assert lines[0].strip().startswith('intro:'), lines[0][:80]
    lines = lines[1:]
    new = (
        "      { type:'dialog', variant:'flow', title:'%s', scene:'%s', cefr:'%s',\n"
        "        intro:'%s',\n"
        "        flow: {\n"
        "        intro:'%s',\n" % (title, scene_, cefr_, intro, intro)
        + '\n'.join(lines)
        + "\n      }\n      },\n"
    )
    lessons = lessons[:a] + new + lessons[b:]
    print('заменён урок:', title)

write('js/lessons.js', lessons)
print('готово, размер:', len(lessons))

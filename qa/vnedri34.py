#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Внедрение партий 3-4 в js/lessons.js: линейные диалоги «Узнать время»,
# «Разговор о погоде», «У врача» (демо-7) и «Купить куртку», «Заказать обед»,
# «У барной стойки» (демо-8) переводятся в variant:'flow' 1-в-1 с одобренными
# демо (сцены S1-S3: intro/start/opener/nodes/judge/tr).
import re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf8')

def read(f): return open(f, encoding='utf8').read()
def write(f, s): open(f, 'w', encoding='utf8').write(s)

def сцены(html):
    """Вырезает объявления S1,S2,S3 из html: {name: text}"""
    out = {}
    for i in (1, 2, 3):
        m = re.search(r'const S%d = (\{.*?\n\});' % i, html, re.S)
        assert m, 'S%d не найдена' % i
        out['S%d' % i] = m.group(1)
    return out

demo7 = сцены(read('демо-7.html'))
demo8 = сцены(read('демо-8.html'))

# соответствие: сцена демо -> урок lessons.js
план = [
    (demo7['S1'], 'Узнать время'),
    (demo7['S2'], 'Разговор о погоде'),
    (demo7['S3'], 'У врача'),
    (demo8['S1'], 'Купить куртку'),
    (demo8['S2'], 'Заказать обед'),
    (demo8['S3'], 'У барной стойки'),
]

lessons = read('js/lessons.js')

def границы(title):
    """start..end существующего элемента-диалога в lessons.js"""
    pat = "{ type:'dialog', title:'%s'" % title
    i = lessons.find(pat)
    assert i > 0, 'нет урока ' + title
    a = lessons.rfind('\n', 0, i) + 1
    # следующий элемент: '\n      { type:' после i
    nxt = lessons.find('\n      { type:', i)
    assert nxt > 0, 'нет следующего элемента после ' + title
    return a, nxt + 1

def parse_head(block):
    m = re.search(r"scene:'([^']*)',\s*cefr:'([^']*)'", block)
    return m.group(1), m.group(2)

def flow_body(сцена):
    """Сцена -> тело flow: убрать '{ title:...' и '};', сдвиг +6."""
    # первая строка содержит '{ title:...' — удаляем её целиком
    lines = сцена.split('\n')
    first = lines[0]
    assert first.strip().startswith("{ title:"), first[:80]
    body = lines[1:]
    # последняя строка '};' — закрытие объекта; удаляем
    if body and body[-1].strip() == '}':   # закрывающая сцены (regex сцены() захватил её)
        body.pop()
    # intro-строка (первая в body) нужна отдельно, чтобы продублировать вне flow
    intro_line = body[0].strip() if body else ''
    m = re.match(r"intro:'(.*)',$", intro_line)
    assert m, 'intro не найден: ' + intro_line[:100]
    intro = m.group(1)
    # сдвиг каждой строки на +6 (узлы 4->10, судьи 4->10, tr-ветки 6->12, intro 2->8)
    out = []
    for ln in body:
        out.append('      ' + ln if ln.strip() else ln)
    return intro, '\n'.join(out)

# собираем новые блоки
import copy
for сцена, title in план:
    a, b = границы(title)
    old = lessons[a:b]
    scene_, cefr_ = parse_head(old)
    intro, body = flow_body(сцена)
    # подстраховка: в демо-сцене могут быть свои переносы с intro — у нас intro уже вынут
    # (в body первая строка intro осталась — убираем её, чтобы не дублировать внутри)
    lines = body.split('\n')
    # первая непустая строка — intro (2sp+6=8sp 'intro:...'), убираем
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

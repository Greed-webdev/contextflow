#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Пересборка демо-7: оболочка демо-6.html + сцены из текущего демо-7.html.
# Единственный источник правок по демо-7 — сам демо-7.html (судьи правятся в файле,
# как и в прошлых итерациях); этот генератор воспроизводит его 1-в-1 после правок.
# Запуск: python3 qa/gen7b.py

import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf8')

shell = open('демо-6.html', encoding='utf8').read()
demo7 = open('демо-7.html', encoding='utf8').read()

# блок сцен демо-7: от маркера партии до строки SCENES включительно
s0 = demo7.index('/* ============ ПАРТИЯ 3 · ур. 27, 31, 37 ============ */')
s1 = demo7.index('const SCENES={ s1:S1, s2:S2, s3:S3 };') + len('const SCENES={ s1:S1, s2:S2, s3:S3 };')
block = demo7[s0:s1]

# в оболочке заменить старый блок сцен (от маркера партии 2 до SCENES включительно)
a = shell.index('/* ============ S1 · «Назвать количество» (партия 2) ============ */')
b = shell.index('const SCENES={ s1:S1, s2:S2, s3:S3 };') + len('const SCENES={ s1:S1, s2:S2, s3:S3 };')
out = shell[:a] + block + shell[b:]

# титулы партии 2 -> партии 3
out = out.replace('<title>Партия 2 ветвей · ур. 13, 19, 23</title>',
                  '<title>Партия 3 ветвей · ур. 27, 31, 37</title>')
out = out.replace('<h1>Партия 2: разговор идёт за тобой</h1>',
                  '<h1>Партия 3: разговор идёт за тобой</h1>')
out = out.replace('Три сцены с ветвями (ур. 13, 19, 23).',
                  'Три сцены с ветвями (ур. 27, 31, 37).')
out = out.replace("'want','like','need','take','have','get','choose','prefer','buy','think','do','does','did',",
                  "'want','need','take','have','get','choose','prefer','buy','think','do','does','did',")  # like вне NEGPASS (фикс партии 3)
out = out.replace('    while(k<w.length && NEGPASS.includes(w[k])) k++;   // сквозь «want/to/do…» к мишени',
                  '    while(k<i && NEGPASS.includes(w[k])) k++;   // сквозь «want/to/do…» к мишени, но не мимо неё')  # фикс отрицания (как в демо-8)

open('демо-7.html', 'w', encoding='utf8').write(out)
print('демо-7.html:', len(out), 'байт (оболочка демо-6 + сцены демо-7)')

# -*- coding: utf-8 -*-
"""Интервальное повторение: в каждый words-уровень подмешиваем слова из прошлых тем.
Слова уже озвучены — новая озвучка не нужна.
График: из темы N-1 → 2 слова, N-2 → 2, N-4 → 1, N-8 → 1, N-16 → 1.
"""
import sys, json, re, random
sys.path.insert(0,'build')
from topics_1 import TOPICS as T1
from topics_2 import TOPICS as T2
from topics_3 import TOPICS as T3
from topics_4 import TOPICS as T4
ALL = T1+T2+T3+T4
random.seed(7)

GAPS = [(1,3),(2,3),(3,2),(5,2),(8,2),(13,2),(21,2)]   # (сколько тем назад, сколько слов)

# счётчик: сколько раз слово уже показано, чтобы брать самые «забытые»
shown = {}
for t in ALL:
    for w,_ in t['w']: shown.setdefault(w, 0)

review = []          # review[i] = список (слово, перевод) для темы i
for i, t in enumerate(ALL):
    for w,_ in t['w']: shown[w] = shown.get(w,0)+1
    picks, seen_here = [], {w for w,_ in t['w']}
    for gap, n in GAPS:
        j = i - gap
        if j < 0: continue
        pool = [(w,r) for w,r in ALL[j]['w'] if w not in seen_here]
        pool.sort(key=lambda x: shown.get(x[0], 0))     # реже показанные — вперёд
        for w,r in pool[:n*3][:n]:
            picks.append((w,r)); seen_here.add(w); shown[w] = shown.get(w,0)+1
    review.append(picks)

# добор: слова, показанные один раз, досыпаем в поздние темы
first = {}
for i,t in enumerate(ALL):
    for w,r in t['w']: first.setdefault(w,(i,r))
cnt0 = {}
for t in ALL:
    for w,_ in t['w']: cnt0[w]=cnt0.get(w,0)+1
for picks in review:
    for w,_ in picks: cnt0[w]=cnt0.get(w,0)+1
lonely = [w for w,v in cnt0.items() if v==1]
lonely.sort(key=lambda w: first[w][0])
slot = 0
for w in lonely:
    src = first[w][0]
    # ищем тему хотя бы через 3 после появления, где слова ещё нет
    for k in range(max(src+3, slot), len(ALL)):
        here = {x for x,_ in ALL[k]['w']} | {x for x,_ in review[k]}
        if w not in here:
            review[k].append((w, first[w][1])); slot = k; break
    else:
        placed=False
        for k in range(len(ALL)-1, src, -1):
            here = {x for x,_ in ALL[k]['w']} | {x for x,_ in review[k]}
            if w not in here:
                review[k].append((w, first[w][1])); placed=True; break
        if not placed:
            # последняя тема — «Проверка A1»: кладём туда в любом случае
            here = {x for x,_ in ALL[-1]['w']} | {x for x,_ in review[-1]}
            if w not in here: review[-1].append((w, first[w][1]))

# ограничение: выравниваем повторы по темам (не больше CAP на уровень)
CAP=8
for _ in range(6):
    for i in range(len(review)):
        while len(review[i])>CAP:
            w,r = review[i].pop()
            cands=[k for k in range(len(review))
                   if k!=i and len(review[k])<CAP
                   and w not in ({x for x,_ in ALL[k]['w']}|{x for x,_ in review[k]})]
            if not cands:
                review[i].insert(0,(w,r)); break
            # ставим в самую свободную тему, желательно позже по курсу
            later=[k for k in cands if k>i]
            pool = later or cands
            k=min(pool,key=lambda k:len(review[k]))
            review[k].append((w,r))

json.dump(review, open('/tmp/a1/review.json','w'), ensure_ascii=False)
tot = sum(len(x) for x in review)
print('тем:', len(ALL), '| добавлено повторов:', tot)
cnt = {}
for t in ALL:
    for w,_ in t['w']: cnt[w] = cnt.get(w,0)+1
for picks in review:
    for w,_ in picks: cnt[w] = cnt.get(w,0)+1
once = sum(1 for v in cnt.values() if v == 1)
print('слов всего:', len(cnt), '| показываются ровно 1 раз:', once)
print('в среднем показов на слово:', round(sum(cnt.values())/len(cnt), 2))

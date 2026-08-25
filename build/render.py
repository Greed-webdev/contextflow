# -*- coding: utf-8 -*-
import sys, json
sys.path.insert(0,'build')
from topics_1 import TOPICS as T1
from topics_2 import TOPICS as T2
from topics_3 import TOPICS as T3
from topics_4 import TOPICS as T4
from extend_dialogs import EXT, GENERIC
from longer import LONGER
from usage import USAGE
from why import why
ALL = T1+T2+T3+T4
REVIEW = json.load(open('/tmp/a1/review.json'))

def esc(x): return str(x).replace('\\','\\\\').replace("'","\\'")
def cap(x): return x[0].upper()+x[1:] if x and x[0].isalpha() else x
def wrow(a,b,rev=False):
    u = USAGE.get(a.lower())
    return "        {t:'%s', r:'%s'%s%s}" % (
        esc(cap(a)), esc(cap(b)),
        ", u:'%s'" % esc(u) if u else "",
        ", rev:true" if rev else "")


import re as _re
def task_row(ru, ans):
    """Фишки без знаков препинания: думать надо над порядком, а не над точкой."""
    full  = ans
    clean = _re.sub(r"[^\w'’\- ]", '', ans).strip()
    clean = _re.sub(r'\s+', ' ', clean)
    parts = clean.split(' ')
    t, x  = why(full)
    return ("        {ru:'%s', parts:[%s], answer:'%s', full:'%s',\n"
            "         whyT:'%s', why:'%s'}") % (
        esc(ru), ','.join("'%s'" % esc(p) for p in parts), esc(clean), esc(full),
        esc(t), esc(x))

out=[]
BLOCK=4                      # каждые 4 темы — уровень-повторение
shown_total = {}

for idx, t in enumerate(ALL):
    title, sc, cd = t['t'], t['sc'], t['cd']
    for w,_ in t['w']: shown_total[w]=shown_total.get(w,0)+1

    # 1) СЛОВА: новые + короткий повтор
    for a,b in REVIEW[idx]: shown_total[a]=shown_total.get(a,0)+1
    own = list(t['w']); rev = list(REVIEW[idx])
    MAX = 22
    if len(own)+len(rev) <= MAX:
        chunks = [(own, rev, title)]
    else:                                   # делим большую тему на две части
        h = (len(own)+1)//2
        chunks = [(own[:h], rev[:len(rev)//2], title+' · 1'),
                  (own[h:], rev[len(rev)//2:], title+' · 2')]
    for own_p, rev_p, ttl in chunks:
        rows  = [wrow(a,b) for a,b in own_p]
        rows += [wrow(a,b,True) for a,b in rev_p]
        out.append("      { type:'words', title:'%s', scene:'%s', cefr:'%s', newCount:%d, words:[\n%s\n      ]}"
                   % (esc(ttl), sc, esc(cd), len(own_p), ',\n'.join(rows)))

    # 2) СБОРКА: только свои задания. Повторение живёт в уровнях «Повтори фразы».
    pairs = [LONGER.get(ans, (ru, ans)) for ru, ans in t['b']]
    tk=[task_row(ru, ans) for ru, ans in pairs]
    out.append("      { type:'build', title:'Собери: %s', scene:'%s', cefr:'%s', tasks:[\n%s\n      ]}"
               % (esc(title), sc, esc(cd), ',\n'.join(tk)))

    # 3) ДИАЛОГ: 6 твоих реплик
    dtitle, intro, turns = t['d']
    turns = list(turns) + list(EXT.get(dtitle) or GENERIC[sc])
    tl=[]
    for x in turns:
        if x[0]=='them':
            tl.append("          {who:'them', text:'%s', ru:'%s'}" % (esc(x[1]), esc(x[2])))
        else:
            tl.append("          {who:'you', ru:'%s', best:%d,\n            options:[%s]}"
                      % (esc(x[1]), x[2], ','.join("'%s'"%esc(o) for o in x[3])))
    out.append("      { type:'dialog', title:'%s', scene:'%s', cefr:'%s',\n        intro:'%s',\n        turns:[\n%s\n        ]}"
               % (esc(dtitle), sc, esc(cd), esc(intro), ',\n'.join(tl)))

    # 4) КОНТРОЛЬ каждые 4 темы — слова блока, которые показывались реже всего
    if (idx+1) % BLOCK == 0:
        lo, hi = idx-BLOCK+1, idx
        pool=[]
        for k in range(lo, hi+1):
            pool += [(w,r) for w,r in ALL[k]['w']]
        pool.sort(key=lambda x: shown_total.get(x[0],0))
        pick = pool[:20]
        for w,_ in pick: shown_total[w]=shown_total.get(w,0)+1
        rows=[wrow(a,b,True) for a,b in pick]
        out.append("      { type:'words', title:'Контроль: темы %d–%d', scene:'%s', cefr:'A1: Can recall vocabulary from previous topics.', newCount:0, words:[\n%s\n      ]}"
                   % (lo+1, hi+1, ALL[hi]['sc'], ',\n'.join(rows)))

        bp=[]
        for k in range(lo, hi+1):
            bp += [LONGER.get(a, (r, a)) for r, a in ALL[k]['b']]
        bp = bp[:6]
        btk=[task_row(ru, ans) for ru, ans in bp]
        out.append("      { type:'build', title:'Повтори фразы: темы %d–%d', scene:'%s', cefr:'A1: Can recall and reproduce phrases from previous topics.', tasks:[\n%s\n      ]}"
                   % (lo+1, hi+1, ALL[hi]['sc'], ',\n'.join(btk)))

block = '    1:[\n' + ',\n'.join(out) + '\n    ]'
open('/tmp/a1/block3.txt','w',encoding='utf-8').write(block)
print('уровней:', len(out))
once=sum(1 for v in shown_total.values() if v==1)
print('слов:',len(shown_total),'| показываются 1 раз:',once,'| средне показов:',round(sum(shown_total.values())/len(shown_total),2))

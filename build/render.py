# -*- coding: utf-8 -*-
import sys, json
sys.path.insert(0,'build')
from topics_1 import TOPICS as T1
from topics_2 import TOPICS as T2
from topics_3 import TOPICS as T3
from topics_4 import TOPICS as T4
ALL = T1+T2+T3+T4

def esc(x): return str(x).replace('\\','\\\\').replace("'","\\'")

out=[]
for t in ALL:
    title, sc, cd = t['t'], t['sc'], t['cd']
    # 1) слова
    def cap(x):
        return x[0].upper()+x[1:] if x and x[0].isalpha() else x
    w = ',\n'.join("        {t:'%s', r:'%s'}" % (esc(cap(a)), esc(cap(b))) for a,b in t['w'])
    out.append("      { type:'words', title:'%s', scene:'%s', cefr:'%s', words:[\n%s\n      ]}"
               % (esc(title), sc, esc(cd), w))
    # 2) сборка фразы
    tk=[]
    for ru, ans in t['b']:
        parts = ans.split(' ')
        tk.append("        {ru:'%s', parts:[%s], answer:'%s'}"
                  % (esc(ru), ','.join("'%s'"%esc(p) for p in parts), esc(ans)))
    out.append("      { type:'build', title:'Собери: %s', scene:'%s', cefr:'%s', tasks:[\n%s\n      ]}"
               % (esc(title), sc, esc(cd), ',\n'.join(tk)))
    # 3) диалог
    dtitle, intro, turns = t['d']
    tl=[]
    for x in turns:
        if x[0]=='them':
            tl.append("          {who:'them', text:'%s', ru:'%s'}" % (esc(x[1]), esc(x[2])))
        else:
            opts=','.join("'%s'"%esc(o) for o in x[3])
            tl.append("          {who:'you', ru:'%s', best:%d,\n            options:[%s]}" % (esc(x[1]), x[2], opts))
    out.append("      { type:'dialog', title:'%s', scene:'%s', cefr:'%s',\n        intro:'%s',\n        turns:[\n%s\n        ]}"
               % (esc(dtitle), sc, esc(cd), esc(intro), ',\n'.join(tl)))

block = '    1:[\n' + ',\n'.join(out) + '\n    ]'
open('/tmp/a1/block2.txt','w',encoding='utf-8').write(block)
print('уровней:', len(out), '| символов:', len(block))

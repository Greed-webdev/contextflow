#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Пересборка демо-7 с исправленными судьями (negation-safe, цифры по смыслу)
import re

demo6 = open('демо-6 (1).html', encoding='utf8').read()

def node(ident, task, best, judge, tr):
    lines = ["    %s:{ task:'%s', best:'%s'," % (ident, task, best)]
    for x in judge.strip().split('\n'):
        lines.append("    " + x)
    lines.append("    tr:{")
    for br, them, ru, nxt in tr:
        nxts = ("'%s'" % nxt) if nxt else 'null'
        lines.append("      %s:{them:'%s',ruThem:'%s',next:%s}," % (br, them, ru, nxts))
    lines.append("    } },")
    return '\n'.join(lines)

# ================= S1 «Узнать время» =================
S1n = '\n'.join([
node('ask', 'Спроси, который час.', 'Excuse me, what time is it?',
"""    judge(w){
      if(chose(w,'time','clock','watch')) return {br:'time'};
      if(chose(w,'bus','wait','waiting')) return {br:'bus'};
      if(chose(w,'bye','goodbye','see','later','go','leave','leaving')) return {br:'bye'};
      return {huh:1}; },""",
[('time','It is half past eight.','Половина девятого.','late'),
 ('bus','The bus comes at nine. It is half past eight now.','Автобус в девять. Сейчас половина девятого.','late'),
 ('bye','Ok. Have a good day!','Хорошо. Хорошего дня!',None)]),
node('late', 'Скажи, что опаздываешь на работу.', 'Oh, I am late for work.',
"""    judge(w){
      if(chose(w,'late','work','job','office')) return {br:'work'};
      if(chose(w,'bus','wait','waiting')) return {br:'wait'};
      if(has(w,'no','not','never')||chose(w,'nothing','fine','ok','okay','alright')) return {br:'wait'};
      if(chose(w,'bye','goodbye','see','later','go')) return {br:'bye'};
      return {huh:1}; },""",
[('work','Oh no. The next bus comes soon.','Ой. Следующий автобус скоро.','thanks'),
 ('wait','Ok. The bus should be here in five minutes.','Хорошо. Автобус будет минут через пять.','thanks'),
 ('bye','Ok. Have a good day!','Хорошо. Хорошего дня!',None)]),
node('thanks', 'Поблагодари.', 'Thank you very much.',
"""    judge(w){
      if(chose(w,'thanks','thank')) return {br:'ok'};
      if(chose(w,'bye','goodbye','see','later','go')) return {br:'bye'};
      return {huh:1}; },""",
[('ok','You are welcome. Is everything else alright?','Пожалуйста. В остальном всё нормально?','ok2'),
 ('bye','Bye! Have a nice day!','Пока! Хорошего дня!',None)]),
node('ok2', 'Скажи, что да, всё хорошо.', 'Yes, everything else is fine.',
"""    judge(w){
      if(chose(w,'yes','yeah','fine','ok','okay','alright','good','all','right','sure')) return {br:'fine'};
      if(has(w,'no','not','never')||chose(w,'bad','problem','wrong','trouble')) return {br:'no'};
      if(chose(w,'bye','goodbye','see','later')) return {br:'bye'};
      return {huh:1}; },""",
[('fine','Good. Call me if you need anything.','Хорошо. Звоните, если что-то понадобится.','thanks2'),
 ('no','Oh, I am sorry to hear that. I hope it gets better. Call me if you need anything.','Жаль слышать. Надеюсь, всё наладится. Звоните, если что.','thanks2'),
 ('bye','Take care!','Берегите себя!',None)]),
node('thanks2', 'Поблагодари.', 'Thank you, I will.',
"""    judge(w){
      if(chose(w,'thanks','thank')) return {br:'ok'};
      if(chose(w,'bye','goodbye','see','later')) return {br:'bye'};
      return {huh:1}; },""",
[('ok','Have a good evening.','Хорошего вечера.','wish'),
 ('bye','Goodbye!','До свидания!',None)]),
node('wish', 'Пожелай того же.', 'You too, good night!',
"""    judge(w){
      if(chose(w,'too','likewise','same','night')) return {br:'ok'};
      if(chose(w,'bye','goodbye','see','later')) return {br:'bye'};
      return {huh:1}; },""",
[('ok','Goodbye! Take care!','До свидания! Берегите себя!',None),
 ('bye','Goodbye!','До свидания!',None)]),
])

# ================= S2 «Разговор о погоде» =================
S2n = '\n'.join([
node('cold', 'Согласись, что холодно.', 'Yes, very cold. And windy.',
"""    judge(w){
      if(chose(w,'cold','windy','freezing','chilly')||chose(w,'yes','yeah','true','right','agree','sure','is')) return {br:'agree'};
      if(has(w,'no','not','never')||chose(w,'warm','hot','summer','sun','like','love','enjoy','hate')) return {br:'dis'};
      if(chose(w,'bye','goodbye','see','later')) return {br:'bye'};
      return {huh:1}; },""",
[('agree','And windy, too. They say it will snow tonight.','И ветрено. Говорят, ночью пойдёт снег.','snow'),
 ('dis','Oh, I see. Do you like winter? They say it will snow tonight.','Понятно. А вы любите зиму? Говорят, ночью пойдёт снег.','snow'),
 ('bye','Have a nice day!','Хорошего дня!',None)]),
node('snow', 'Скажи, что не любишь снег.', 'Really? I don’t like snow.',
"""    judge(w){
      if(chose(w,'like','love','enjoy')) return {br:'like'};
      if(has(w,'hate')||(has(w,'no','not','never')&&chose(w,'snow'))) return {br:'hate'};
      if(chose(w,'bye','goodbye','see','later')) return {br:'bye'};
      return {huh:1}; },""",
[('like','Lucky you! I love snow too.','Повезло! Я тоже люблю снег.','winter'),
 ('hate','Well, it is winter.','Ну, зима же.','winter'),
 ('bye','Have a nice day!','Хорошего дня!',None)]),
node('winter', 'Согласись и попрощайся.', 'True. Have a good day!',
"""    judge(w){
      if(chose(w,'bye','goodbye','see','later','day')) return {br:'bye'};
      if(chose(w,'true','yes','right','sure','agree','ok','okay','is','winter')) return {br:'agree'};
      return {huh:1}; },""",
[('bye','You too. By the way, do you need anything else?','И вам. Кстати, вам что-нибудь ещё нужно?','cafe'),
 ('agree','Yes, winter days are short. Anything else I can do?','Да, зимой дни короткие. Могу ещё чем-то помочь?','cafe')]),
node('cafe', 'Спроси, есть ли рядом кафе.', 'Is there a cafe near here?',
"""    judge(w){
      if(chose(w,'cafe','coffee','restaurant','place','eat','tea')) return {br:'cafe'};
      if(has(w,'no','not','nothing')||chose(w,'all','that','fine','ok','okay','thanks','thank')) return {br:'no'};
      if(chose(w,'bye','goodbye','see','later')) return {br:'bye'};
      return {huh:1}; },""",
[('cafe','Yes, just around the corner.','Да, прямо за углом.','side'),
 ('no','Ok. Have a nice day!','Хорошо. Хорошего дня!',None),
 ('bye','Have a nice day!','Хорошего дня!',None)]),
node('side', 'Уточни: налево или направо?', 'Left or right?',
"""    judge(w){
      if(chose(w,'left')) return {br:'left'};
      if(chose(w,'right')) return {br:'right'};
      if(chose(w,'corner','next','where','shop','which','side')) return {br:'which'};
      return {huh:1}; },""",
[('left','On your left, next to the shop.','Слева, рядом с магазином.','thx'),
 ('right','On your right, next to the shop.','Справа, рядом с магазином.','thx'),
 ('which','Which side — left or right?','С какой стороны — слева или справа?','side')]),
node('thx', 'Поблагодари.', 'Thank you, that is very helpful.',
"""    judge(w){
      if(chose(w,'thanks','thank')) return {br:'ok'};
      if(chose(w,'bye','goodbye','see','later')) return {br:'bye'};
      return {huh:1}; },""",
[('ok','You are welcome. Have a good day!','Пожалуйста. Хорошего дня!',None),
 ('bye','Have a good day!','Хорошего дня!',None)]),
])

# ================= S3 «У врача» =================
S3n = '\n'.join([
node('prob', 'Скажи, что болит.', 'My head hurts.',
"""    judge(w){
      if(chose(w,'head','headache','migraine')) return {br:'head'};
      if(chose(w,'throat','stomach','back','tooth','ear','leg','arm','cough','flu','fever','temperature','sore','hurt','aches','pain')) return {br:'other'};
      if(has(w,'no','not','never')||chose(w,'nothing','fine','good','ok','okay','all')) return {br:'none'};
      if(chose(w,'bye','goodbye','see','later','thanks','thank')) return {br:'bye'};
      return {huh:1}; },""",
[('head','I see. Since when?','Понятно. С какого времени?','since'),
 ('other','I see. Since when did it start?','Понятно. Когда это началось?','since'),
 ('none','Glad to hear that. Do you have any questions?','Рад это слышать. У вас есть вопросы?','quest'),
 ('bye','Take care!','Берегите себя!',None)]),
node('since', 'Скажи, с какого времени.', 'Since yesterday.',
"""    judge(w,mem){ const d=(mem._digits||[]).map(Number);
      const span=has(w,'day','days','week','weeks','month','months','hour','hours','year','years','ago','morning','night');
      if(chose(w,'yesterday')) return {br:'yest'};
      if(chose(w,'today','morning')) return {br:'today'};
      if(d.length && span) return {br:'days'};
      if(chose(w,'day','days','week','weeks','month','months','long','time')) return {br:'days'};
      return {huh:1}; },""",
[('yest','I see. Take this medicine and rest today.','Понятно. Примите лекарство и отдохните сегодня.','rest'),
 ('today','Ok, it started today. Take this and rest.','Хорошо, началось сегодня. Примите это и отдыхайте.','rest'),
 ('days','Ok. Take this medicine and rest.','Хорошо. Примите лекарство и отдыхайте.','rest')]),
node('rest', 'Поблагодари врача.', 'Thank you, doctor.',
"""    judge(w){
      if(chose(w,'thanks','thank')) return {br:'ok'};
      if(chose(w,'bye','goodbye','see','later')) return {br:'bye'};
      return {huh:1}; },""",
[('ok','Do you have any questions?','У вас есть вопросы?','quest'),
 ('bye','Take care! Goodbye!','Берегите себя! До свидания!',None)]),
node('quest', 'Спроси, когда прийти снова.', 'When should I come again?',
"""    judge(w){
      if(chose(w,'when')) return {br:'ask'};
      if(chose(w,'again','come','back','next','visit','appointment','week','weeks')) return {br:'ask'};
      if(has(w,'no','not','none')||chose(w,'nothing','ok','okay','all','fine')) return {br:'no'};
      if(chose(w,'bye','goodbye','see','later','thanks','thank')) return {br:'bye'};
      return {huh:1}; },""",
[('ask','In one week, if it does not get better.','Через неделю, если не станет лучше.','week'),
 ('no','Ok. Then take care of yourself.','Хорошо. Тогда берегите себя.','care'),
 ('bye','Take care! Goodbye!','Берегите себя! До свидания!',None)]),
node('week', 'Подтверди.', 'One week. I understand.',
"""    judge(w,mem){ const d=(mem._digits||[]).map(Number);
      if(d.length&&(has(w,'week','weeks')||w.includes('7'))) return {br:'ok'};
      if(chose(w,'week','weeks','understand','clear','ok','okay','yes','right','fine','sure')) return {br:'ok'};
      if(has(w,'no','not','what','again','repeat','sorry','pardon')||chose(w,'why')) return {br:'again'};
      return {huh:1}; },""",
[('ok','Take care of yourself.','Берегите себя.','care'),
 ('again','In one week. If it does not get better, come back.','Через неделю. Если не станет лучше — приходите снова.','week')]),
node('care', 'Поблагодари и попрощайся.', 'Thank you, doctor. Goodbye.',
"""    judge(w){ const th=chose(w,'thanks','thank'), by=chose(w,'bye','goodbye','see','later','day');
      if(th&&by) return {br:'ok'};
      if(by) return {br:'bye'};
      if(th) return {br:'th'};
      return {huh:1}; },""",
[('ok','Goodbye! Get well soon!','До свидания! Выздоравливайте!',None),
 ('bye','Get well soon!','Выздоравливайте!',None),
 ('th','You are welcome. Take care!','Пожалуйста. Берегите себя!',None)]),
])

# ============ сборка ============
a = demo6.index('/* ============ S1 · «Назвать количество»')
b = demo6.index('const SCENES={ s1:S1, s2:S2, s3:S3 };') + len('const SCENES={ s1:S1, s2:S2, s3:S3 };')
block = ("/* ============ ПАРТИЯ 3 · ур. 27, 31, 37 ============ */\n\n"
         + "const S1 = { title:'Узнать время · ур. 27',\n  intro:'Ты стоишь на остановке и ждёшь автобус. Прохожий рядом спрашивает.',\n  start:'ask',\n"
         + "  opener:{them:'Are you waiting for the bus?', ru:'Автобус ждёте?'},\n  nodes:{\n" + S1n + "  }\n};\n\n"
         + "const S2 = { title:'Разговор о погоде · ур. 31',\n  intro:'Сосед у подъезда смотрит на небо.',\n  start:'cold',\n"
         + "  opener:{them:'Cold today, isn’t it?', ru:'Холодно сегодня, правда?'},\n  nodes:{\n" + S2n + "  }\n};\n\n"
         + "const S3 = { title:'У врача · ур. 37',\n  intro:'Врач приглашает тебя сесть.',\n  start:'prob',\n"
         + "  opener:{them:'What is the problem?', ru:'Что случилось?'},\n  nodes:{\n" + S3n + "  }\n};\n\n"
         + "const SCENES={ s1:S1, s2:S2, s3:S3 };")

out = demo6[:a] + block + demo6[b:]
out = out.replace('<title>Партия 2 ветвей · ур. 13, 19, 23</title>', '<title>Партия 3 ветвей · ур. 27, 31, 37</title>')
out = out.replace('<h1>Партия 2: разговор идёт за тобой</h1>', '<h1>Партия 3: разговор идёт за тобой</h1>')
out = out.replace('Три сцены с ветвями (ур. 13, 19, 23). Ответь иначе — и собеседник ответит иначе. Сначала проверь тут — потом в приложение.',
                  'Три сцены с ветвями (ур. 27, 31, 37). Ответь иначе — и собеседник ответит иначе. Сначала проверь тут — потом в приложение.')
open('демо-7.html', 'w', encoding='utf8').write(out)
print('демо-7.html:', len(out), 'байт')
for var in ['S1','S2','S3']:
    x = re.search(r'const %s = \{.*?\n\};' % var, out, re.S).group(0)
    print(var, 'баланс:', x.count('{') - x.count('}'), '| title:', re.search(r"title:'([^']*)'", x).group(1))

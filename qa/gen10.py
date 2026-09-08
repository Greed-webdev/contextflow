#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Демо-10 (партия 6): «Купить билет» ур.67 · «Объяснить дорогу» ур.73 · «Рассказать о работе» ур.77
# Оболочка/ядро — от демо-8. Сборка: python3 qa/gen10.py

SRC = '/home/user/демо-8.html'
DST = '/home/user/демо-10.html'

SCENES = r'''/* ============ ПАРТИЯ 6 · ур. 67, 73, 77 ============ */

const S1 = { title:'Купить билет · ур. 67',
  intro:'Ты в кассе на вокзале.',
  start:'go',
  opener:{them:'Where are you going?', ru:'Куда едете?'},
  nodes:{
    go:{ task:'Скажи, что в центр.', best:'To the centre, please.',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'centre','center','town','city')) return {br:'centr'};
          if(chose(w,'airport','station','park','museum','hotel')) return {br:'other'};
          if(has(w,'no','not','never')&&chose(w,'know','idea')) return {br:'dk'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Have a nice day!',ruThem:'Хорошо. Хорошего дня!',next:null},
      centr:{them:'To the centre. Single or return?',ruThem:'В центр. В одну сторону или туда-обратно?',next:'sr'},
      other:{them:'Ok. Single or return?',ruThem:'Хорошо. В одну сторону или туда-обратно?',next:'sr'},
      dk:{them:'No problem. Where do you usually go? The centre?',ruThem:'Ничего страшного. Куда вы обычно ездите? В центр?',next:'sr'},
    } },
    sr:{ task:'Скажи: туда-обратно.', best:'Return, please.',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'return','back','both','ways')) return {br:'ret'};
          if(has(w,'no','not','never')&&(w.includes('return')||w.includes('back'))) return {br:'sing'};
          if(chose(w,'single','one')) return {br:'sing'};
          if(chose(w,'again','repeat','sorry','pardon')) return {br:'again'};
          if(has(w,'no','not','never')) return {br:'again'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Have a nice day!',ruThem:'Хорошо. Хорошего дня!',next:null},
      ret:{them:'Return. That is six euros.',ruThem:'Туда-обратно. Шесть евро.',next:'pay'},
      sing:{them:'Single. That is three euros fifty.',ruThem:'В одну сторону. Три евро пятьдесят.',next:'pay'},
      again:{them:'Sorry, single or return?',ruThem:'Простите, в одну сторону или туда-обратно?',next:'sr'},
    } },
    pay:{ task:'Спроси, во сколько отходит поезд.', best:'Thank you. What time does the train leave?',
    judge(w){
          if(chose(w,'bye','goodbye','later')) return {br:'bye'};
          if(chose(w,'when','time','leave','leaves','depart')) return {br:'when'};
          if(chose(w,'expensive','cheap','price','cost')) return {br:'price'};
          if(chose(w,'cash','card','pay','here','euro','euros','money')) return {br:'cash'};
          if(chose(w,'thanks','thank','ok','okay','yes','sure')) return {br:'th'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Have a nice day!',ruThem:'Хорошо. Хорошего дня!',next:null},
      when:{them:'The train leaves at half past three, platform two.',ruThem:'Поезд отходит в половине четвёртого, вторая платформа.',next:'th2'},
      price:{them:'It is the standard price for this route.',ruThem:'Это стандартная цена на этом маршруте.',next:'pay'},
      cash:{them:'Here is your ticket. The train leaves at half past three.',ruThem:'Вот ваш билет. Поезд отходит в половине четвёртого.',next:'th2'},
      th:{them:'Here is your ticket. Have a good trip!',ruThem:'Вот ваш билет. Хорошей поездки!',next:'th2'},
    } },
    th2:{ task:'Поблагодари и попрощайся.', best:'Thank you very much. Goodbye!',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'thanks','thank')) return {br:'th'};
          if(chose(w,'ok','okay','yes','yeah','sure','fine','good')) return {br:'th'};
          return {huh:1}; },
    tr:{
      bye:{them:'Goodbye! Have a nice trip!',ruThem:'До свидания! Хорошей поездки!',next:null},
      th:{them:'You are welcome. Goodbye!',ruThem:'Пожалуйста. До свидания!',next:null},
    } },
  }
};

const S2 = { title:'Объяснить дорогу · ур. 73',
  intro:'Турист останавливает тебя на улице.',
  start:'st',
  opener:{them:'Excuse me, where is the station?', ru:'Простите, где вокзал?'},
  nodes:{
    st:{ task:'Скажи: прямо, потом направо.', best:'Go straight, then turn right.',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'sorry','pardon','what','again','repeat')) return {br:'again'};
          if(chose(w,'far','near','close','walk','minute','minutes')) return {br:'far'};
          if(chose(w,'bus','car','taxi','metro','train')) return {br:'bus'};
          if(chose(w,'straight','right','left','turn','then','ahead','station')) return {br:'dir'};
          return {huh:1}; },
    tr:{
      bye:{them:'Bye! Have a nice day!',ruThem:'Пока! Хорошего дня!',next:null},
      again:{them:'Go straight, then turn right. It is very simple.',ruThem:'Прямо, потом направо. Всё очень просто.',next:'walk'},
      far:{them:'It is not far. About five minutes on foot.',ruThem:'Недалеко. Около пяти минут пешком.',next:'walk'},
      bus:{them:'You can walk, it is five minutes. Or take the bus, two stops.',ruThem:'Можно пешком, пять минут. Или на автобусе, две остановки.',next:'walk'},
      dir:{them:'Great, thank you! And is it far?',ruThem:'Отлично, спасибо! А это далеко?',next:'walk'},
    } },
    walk:{ task:'Скажи: около пяти минут пешком.', best:'About five minutes on foot.',
    judge(w,mem){
          const d=(mem._digits||[]).map(Number); const n=FLOWNUM(w,d);
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(has(w,'no','not','never')&&has(w,'bus','taxi','car','metro')&&!has(w,'take','will','i','by')) return {huh:1};
          if(has(w,'bus','taxi','car','metro')) return {br:'bus5'};
          if(has(w,'minute','minutes','foot','walk')&&!has(w,'no','not','never')){
            if(n===5) return {br:'ok5'};
            if(n!==null) return {br:'other5'};
            if(w.includes('few')||w.includes('little')) return {br:'other5'};
            return {br:'ok5'}; }
          if(has(w,'no','not','never')) return {br:'not5'};
          return {huh:1}; },
    tr:{
      bye:{them:'Bye! Have a nice day!',ruThem:'Пока! Хорошего дня!',next:null},
      ok5:{them:'That is very close. Thank you so much!',ruThem:'Это совсем рядом. Большое спасибо!',next:'thx'},
      bus5:{them:'Oh, by bus it is even shorter. Two stops. Thank you!',ruThem:'На автобусе ещё короче. Две остановки. Спасибо!',next:'thx'},
      not5:{them:'I see. Well, thank you for your help!',ruThem:'Понятно. Ну, спасибо за помощь!',next:'thx'},
      other5:{them:'Well, I would say about five minutes on foot.',ruThem:'Ну, я бы сказал, около пяти минут пешком.',next:'thx'},
    } },
    thx:{ task:'Скажи «не за что».', best:'You are welcome.',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'welcome','problem','nothing','ok','okay','fine','sure','yes','yeah','thanks','thank')) return {br:'wc'};
          return {huh:1}; },
    tr:{
      bye:{them:'Bye! Have a nice day!',ruThem:'Пока! Хорошего дня!',next:null},
      wc:{them:'Do you need anything else?',ruThem:'Вам ещё что-нибудь нужно?',next:'any'},
    } },
    any:{ task:'Спроси, есть ли рядом кафе.', best:'Is there a cafe near here?',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(has(w,'no','not','never')&&(w.includes('thanks')||w.includes('thank')||w.includes('nothing')||w.includes('all'))) return {br:'bye'};
          if(chose(w,'cafe','coffee')) return {br:'cafe'};
          return {huh:1}; },
    tr:{
      bye:{them:'Bye!',ruThem:'Пока!',next:null},
      cafe:{them:'Yes, there is a good cafe on the left, next to the shop.',ruThem:'Да, хорошее кафе слева, рядом с магазином.',next:'th2'},
    } },
    th2:{ task:'Поблагодари.', best:'Thank you very much.',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'thanks','thank')) return {br:'th'};
          if(chose(w,'ok','okay','yes','yeah','great','good')) return {br:'th'};
          return {huh:1}; },
    tr:{
      bye:{them:'Bye!',ruThem:'Пока!',next:null},
      th:{them:'You are welcome. Enjoy your day!',ruThem:'Пожалуйста. Хорошего дня!',next:null},
    } },
  }
};

const S3 = { title:'Рассказать о работе · ур. 77',
  intro:'На вечеринке кто-то спрашивает о работе.',
  start:'job',
  opener:{them:'So, what do you do?', ru:'Чем занимаешься?'},
  nodes:{
    job:{ task:'Скажи, что работаешь в небольшой компании.', best:'I work in a small company.',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'work','company','office','job')) return {br:'work'};
          if(chose(w,'student','school','study','studies')) return {br:'student'};
          if(has(w,'no','not','never')&&(w.includes('work')||w.includes('job'))) return {br:'nowork'};
          if(chose(w,'doctor','teacher','engineer','driver','shop','bank')) return {br:'spec'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. See you later!',ruThem:'Ладно. До встречи!',next:null},
      work:{them:'Interesting. Do you like it?',ruThem:'Интересно. Нравится?',next:'like'},
      student:{them:'Oh, are you a student? And what do you study?',ruThem:'О, вы студент? И что вы изучаете?',next:'like'},
      nowork:{them:'I see. Are you looking for a job?',ruThem:'Понятно. Ищете работу?',next:'like'},
      spec:{them:'That sounds interesting. Do you like it?',ruThem:'Звучит интересно. Нравится?',next:'like'},
    } },
    like:{ task:'Скажи «да, но много работы».', best:'Yes, but there is a lot of work.',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'yes','yeah','like','love','enjoy')) return {br:'yes'};
          if(chose(w,'lot','much','many','hard','busy')) return {br:'busy'};
          if(has(w,'no','not','never')&&(w.includes('boring')||w.includes('bored')||w.includes('hate')||w.includes('hates')||w.includes('tired')||w.includes('difficult')||w.includes('stress')||w.includes('stressful')||w.includes('bad')||w.includes('awful')||w.includes('terrible'))) return {huh:1};
          if(has(w,'no','not','never')) return {br:'no'};
          if(chose(w,'boring','bored','hate','hates','tired','difficult','stress','stressful','bad','awful','terrible')) return {br:'no'};
          if(chose(w,'ok','okay','fine','sure','so')) return {br:'yes'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. See you later!',ruThem:'Ладно. До встречи!',next:null},
      yes:{them:'A lot of work, I know that feeling.',ruThem:'Много работы, я знаю это чувство.',next:'you'},
      no:{them:'That is a pity. But it is good that you have a job.',ruThem:'Жаль. Но хорошо, что работа есть.',next:'you'},
      busy:{them:'A lot of work, I know that feeling.',ruThem:'Много работы, я знаю это чувство.',next:'you'},
    } },
    you:{ task:'Спроси, кем работает собеседник.', best:'And what about you?',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'you','your','and')) return {br:'ask'};
          if(chose(w,'work','job','doctor','teacher','engineer')) return {br:'ask'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. See you later!',ruThem:'Ладно. До встречи!',next:null},
      ask:{them:'I work in a bank. It is fine, but I am busy too.',ruThem:'Я работаю в банке. Нормально, но я тоже занят.',next:'drink'},
    } },
    drink:{ task:'Предложи что-нибудь выпить.', best:'Would you like something to drink?',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'drink','coffee','tea','water','juice','would','like','something')) return {br:'offer'};
          if(chose(w,'thanks','thank')) return {br:'th'};
          return {huh:1}; },
    tr:{
      bye:{them:'Bye! Nice to meet you!',ruThem:'Пока! Приятно было познакомиться!',next:null},
      offer:{them:'Yes, coffee would be great, thank you!',ruThem:'Да, кофе было бы отлично, спасибо!',next:'wish'},
      th:{them:'It was nice talking to you!',ruThem:'Было приятно поболтать!',next:'wish'},
    } },
    wish:{ task:'Попрощайся вежливо.', best:'Nice to meet you. Goodbye!',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'nice','meet','see','too','likewise','thanks','thank')) return {br:'ok'};
          return {huh:1}; },
    tr:{
      bye:{them:'Goodbye!',ruThem:'До свидания!',next:null},
      ok:{them:'Goodbye! Take care!',ruThem:'До свидания! Берегите себя!',next:null},
    } },
  }
};

const SCENES={ s1:S1, s2:S2, s3:S3 };'''

# ---------- сборка ----------
s = open(SRC, encoding='utf8').read()
a = s.index('/* ============ ПАРТИЯ')
b = s.index('const SCENES={ s1:S1, s2:S2, s3:S3 };') + len('const SCENES={ s1:S1, s2:S2, s3:S3 };')
out = s[:a] + SCENES + s[b:]
out = out.replace('<title>Партия 4 ветвей · ур. 41, 45, 49</title>', '<title>Партия 6 ветвей · ур. 67, 73, 77</title>')
out = out.replace('<h1>Партия 4: разговор идёт за тобой</h1>', '<h1>Партия 6: разговор идёт за тобой</h1>')
out = out.replace('Три сцены с ветвями (ур. 41, 45, 49).', 'Три сцены с ветвями (ур. 67, 73, 77).')
open(DST, 'w', encoding='utf8').write(out)
print('демо-10.html:', len(out), 'байт')

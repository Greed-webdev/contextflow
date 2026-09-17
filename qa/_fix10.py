#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Временная правка: переписывает S2 в qa/gen10.py (роли «турист спрашивает — ты отвечаешь»).
s = open('/home/user/qa/gen10.py', encoding='utf8').read()

A = "const S2 = { title:'Объяснить дорогу"
B = "const S3 = { title:'Рассказать о работе"
a = s.index(A)
b = s.index(B)

newS2 = r'''const S2 = { title:'Объяснить дорогу · ур. 73',
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
      again:{them:'Go straight, then turn right. It is very simple.',ruThem:'Прямо, потом направо. Всё очень просто.',next:'st'},
      far:{them:'It is not far. About five minutes on foot.',ruThem:'Недалеко. Около пяти минут пешком.',next:'walk'},
      bus:{them:'You can walk, it is five minutes. Or take the bus, two stops.',ruThem:'Можно пешком, пять минут. Или на автобусе, две остановки.',next:'walk'},
      dir:{them:'Great, thank you! And is it far?',ruThem:'Отлично, спасибо! А это далеко?',next:'walk'},
    } },
    walk:{ task:'Скажи: около пяти минут пешком.', best:'About five minutes on foot.',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'five','minute','minutes','foot','walk')) return {br:'ok5'};
          if(chose(w,'bus','taxi','car','metro')) return {br:'bus5'};
          if(has(w,'no','not','never')) return {br:'not5'};
          return {huh:1}; },
    tr:{
      bye:{them:'Bye! Have a nice day!',ruThem:'Пока! Хорошего дня!',next:null},
      ok5:{them:'That is very close. Thank you so much!',ruThem:'Это совсем рядом. Большое спасибо!',next:'thx'},
      bus5:{them:'Oh, by bus it is even shorter. Two stops. Thank you!',ruThem:'На автобусе ещё короче. Две остановки. Спасибо!',next:'thx'},
      not5:{them:'I see. Well, thank you for your help!',ruThem:'Понятно. Ну, спасибо за помощь!',next:'thx'},
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

'''

s = s[:a] + newS2 + s[b:]
open('/home/user/qa/gen10.py', 'w', encoding='utf8').write(s)
print('gen10.py: S2 переписан (новый сюжет «турист спрашивает»)')

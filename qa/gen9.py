#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Демо-9 (партия 5): «Показать квартиру» ур.55 · «Что-то сломалось» ур.59 · «Найти банк» ур.63
# Оболочка/ядро — от демо-8 (negatedAt k<i, NEGPASS без like). Сборка: python3 qa/gen9.py

SRC = '/home/user/демо-8.html'
DST = '/home/user/демо-9.html'

SCENES = r'''/* ============ ПАРТИЯ 5 · ур. 55, 59, 63 ============ */

const S1 = { title:'Показать квартиру · ур. 55',
  intro:'Ты показываешь новую квартиру другу.',
  start:'place',
  opener:{them:'So this is your new place?', ru:'Так вот твоё новое жильё?'},
  nodes:{
    place:{ task:'Ответь про квартиру: какая она? (например: маленькая)', best:'Yes, it is a small flat.',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'like','love','nice','cosy','cozy','great','beautiful')) return {br:'like'};
          if(has(w,'no','not','never')&&(w.includes('know')||w.includes('idea'))) return {br:'dk'};
          if(chose(w,'big','large','huge')) return {br:'big'};
          if(has(w,'no','not','never')) return {br:'not'};
          if(chose(w,'small','little','tiny','flat','apartment','new','place','yes','yeah','ok','okay','fine','good','alright','so')) return {br:'ok'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. See you later!',ruThem:'Ладно. До встречи!',next:null},
      like:{them:'Thanks! I love it too. Come in, I will show you everything.',ruThem:'Спасибо! Мне она тоже нравится. Заходи, я всё покажу.',next:'kitchen'},
      dk:{them:'Come in and see it for yourself. I will show you everything.',ruThem:'Заходи и сам увидишь. Я всё покажу.',next:'kitchen'},
      big:{them:'Big? Well, there is enough space for sure. Come in!',ruThem:'Большая? Ну, места точно хватает. Заходи!',next:'kitchen'},
      not:{them:'Oh, I see. Well, come in anyway — let me show you around.',ruThem:'А, понятно. Ну, всё равно заходи — покажу квартиру.',next:'kitchen'},
      ok:{them:'Great! Come in, I will show you everything.',ruThem:'Отлично! Заходи, я всё покажу.',next:'kitchen'},
    } },
    kitchen:{ task:'Скажи, что кухня рядом с дверью.', best:'The kitchen is next to the door.',
    judge(w){
          if(chose(w,'bye','goodbye','later')) return {br:'bye'};
          if(chose(w,'bathroom','bath','toilet')) return {br:'bath'};
          if(chose(w,'living')) return {br:'living'};
          if(chose(w,'kitchen')) return {br:'kitchen'};
          if(chose(w,'door','next','left','right')) return {br:'kitchen'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Have a nice day!',ruThem:'Хорошо. Хорошего дня!',next:null},
      bath:{them:'The bathroom is next to the kitchen. And the bedroom is upstairs.',ruThem:'Ванная рядом с кухней. А спальня наверху.',next:'bedroom'},
      living:{them:'The living room is here, next to the kitchen. And the bedroom is upstairs.',ruThem:'Гостиная вот здесь, рядом с кухней. А спальня наверху.',next:'bedroom'},
      kitchen:{them:'Right. And the bedroom?',ruThem:'Верно. А спальня?',next:'bedroom'},
    } },
    bedroom:{ task:'Скажи, что спальня наверху.', best:'It is upstairs.',
    judge(w){
          if(chose(w,'bye','goodbye','later')) return {br:'bye'};
          if(chose(w,'upstairs','up')) return {br:'up'};
          if(has(w,'no','not','never')) return {br:'nodown'};
          if(chose(w,'down','downstairs','here')) return {br:'down'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. See you!',ruThem:'Ладно. До встречи!',next:null},
      up:{them:'Nice. And is there a balcony?',ruThem:'Отлично. А балкон есть?',next:'balcony'},
      down:{them:'Oh, really? Ok. And is there a balcony?',ruThem:'Правда? Ладно. А балкон есть?',next:'balcony'},
      nodown:{them:'Ok, so the bedroom is upstairs. And is there a balcony?',ruThem:'Хорошо, значит спальня наверху. А балкон есть?',next:'balcony'},
    } },
    balcony:{ task:'Скажи «да, есть балкон».', best:'Yes, there is a small balcony.',
    judge(w){
          if(chose(w,'bye','goodbye','later')) return {br:'bye'};
          if(chose(w,'yes','yeah','balcony')) return {br:'yes'};
          if(has(w,'no','not','never')) return {br:'no'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Have a good day!',ruThem:'Хорошо. Хорошего дня!',next:null},
      yes:{them:'That is great. The flat is really nice.',ruThem:'Здорово. Квартира правда отличная.',next:'ok2'},
      no:{them:'No problem. The flat is still nice.',ruThem:'Ничего страшного. Квартира всё равно хорошая.',next:'ok2'},
    } },
    ok2:{ task:'Скажи, что да, всё хорошо.', best:'Yes, everything else is fine.',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'yes','yeah','fine','ok','okay','good','all','everything','right','sure')) return {br:'ok'};
          if(has(w,'no','not','never')) return {br:'any'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok, thanks for coming! Bye!',ruThem:'Ладно, спасибо, что зашёл! Пока!',next:null},
      ok:{them:'Good. Call me if you need anything.',ruThem:'Хорошо. Звони, если что-то понадобится.',next:'thanks'},
      any:{them:'Ok, tell me if something comes up.',ruThem:'Хорошо, скажи, если что-то возникнет.',next:'thanks'},
    } },
    thanks:{ task:'Поблагодари.', best:'Thank you, I will.',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'thanks','thank')) return {br:'th'};
          if(chose(w,'yes','yeah','ok','okay','sure','will','call')) return {br:'th'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Have a good evening!',ruThem:'Ладно. Хорошего вечера!',next:null},
      th:{them:'Have a good evening.',ruThem:'Хорошего вечера.',next:'wish'},
    } },
    wish:{ task:'Пожелай того же.', best:'You too, good night!',
    judge(w){
          if(chose(w,'too','likewise','same','night')) return {br:'ok'};
          if(chose(w,'bye','goodbye','later')) return {br:'bye'};
          return {huh:1}; },
    tr:{
      ok:{them:'Goodbye! Take care!',ruThem:'До свидания! Береги себя!',next:null},
      bye:{them:'Goodbye!',ruThem:'До свидания!',next:null},
    } },
  }
};

const S2 = { title:'Что-то сломалось · ур. 59',
  intro:'Ты звонишь хозяину квартиры.',
  start:'call',
  opener:{them:'Hello, is everything alright?', ru:'Здравствуйте, всё в порядке?'},
  nodes:{
    call:{ task:'Скажи, что свет в кухне не работает.', best:'Hello. The light in the kitchen does not work.',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'water')) return {br:'water'};
          if(chose(w,'heat','heater','heating')) return {br:'heat'};
          if(chose(w,'door')) return {br:'door'};
          if(chose(w,'light','lamp')&&chose(w,'kitchen')) return {br:'light'};
          if(chose(w,'light','lamp')) return {br:'light2'};
          if(chose(w,'tv','television','fridge','freezer','internet','wifi','window','roof','wall','toilet')) return {br:'otherp'};
          if(has(w,'no','not','never')&&has(w,'water')) return {br:'nwater'};
          if(has(w,'no','not','never')&&has(w,'heat','heater','heating')) return {br:'nheat'};
          if(has(w,'no','not','never')&&has(w,'door')) return {br:'ndoor'};
          if(has(w,'no','not','never')&&has(w,'light','lamp')) return {br:'nlight'};
          if(has(w,'no','not','never')&&has(w,'tv','television','fridge','freezer','internet','wifi','window','roof','wall','toilet')) return {br:'notherp'};
          if(has(w,'no','not','never')&&has(w,'broken','break','works','working','work')&&!has(w,'is','are','was','were','does','do','it','they','just')) return {huh:1};
          if(has(w,'no','not','never')&&(w.includes('problem')||w.includes('trouble'))&&!has(w,'is','are','there')) return {huh:1};
          if(has(w,'broken','break','nothing','works','working','work')||(has(w,'problem','trouble')&&!has(w,'fine','ok','okay','good','everything'))) return {br:'otherp'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Call me if you need anything.',ruThem:'Хорошо. Звоните, если что.',next:null},
      water:{them:'The water? I see. Since when?',ruThem:'Вода? Понятно. С какого времени?',next:'since'},
      heat:{them:'The heating? I see. Since when?',ruThem:'Отопление? Понятно. С какого времени?',next:'since'},
      door:{them:'The door? I see. Since when?',ruThem:'Дверь? Понятно. С какого времени?',next:'since'},
      light:{them:'The light in the kitchen? I see. Since when?',ruThem:'Свет на кухне? Понятно. С какого времени?',next:'since'},
      light2:{them:'The light? I see. I will come and look at it.',ruThem:'Свет? Понятно. Я приду и посмотрю.',next:'thanks'},
      nwater:{them:'The water? I see. Since when?',ruThem:'Вода? Понятно. С какого времени?',next:'since'},
      nheat:{them:'The heating? I see. Since when?',ruThem:'Отопление? Понятно. С какого времени?',next:'since'},
      ndoor:{them:'The door? I see. Since when?',ruThem:'Дверь? Понятно. С какого времени?',next:'since'},
      nlight:{them:'The light? I see. Since when?',ruThem:'Свет? Понятно. С какого времени?',next:'since'},
      notherp:{them:'I see there is a problem. Since when?',ruThem:'Понимаю, есть проблема. С какого времени?',next:'since'},
      otherp:{them:'I see there is a problem. Since when?',ruThem:'Понимаю, есть проблема. С какого времени?',next:'since'},
    } },
    since:{ task:'Скажи: со вчерашнего вечера.', best:'Since yesterday evening.',
    judge(w,mem){
          const d=(mem._digits||[]).map(Number);
          if(chose(w,'bye','goodbye','later')) return {br:'bye'};
          if(chose(w,'yesterday')) return {br:'yest'};
          if(has(w,'no','not','never')&&(w.includes('know')||w.includes('idea'))) return {br:'dk'};
          if(chose(w,'today','now')) return {br:'today'};
          if(chose(w,'week','weeks','month','months')) return {br:'long'};
          if((d.length||w.some(x=>x in NUM))&&(w.includes('day')||w.includes('days'))) return {br:'days'};
          if(chose(w,'morning','evening','night','afternoon','monday','tuesday','wednesday','thursday','friday','saturday','sunday')) return {br:'yest'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Goodbye!',ruThem:'Хорошо. До свидания!',next:null},
      yest:{them:'I see. I will come tomorrow morning.',ruThem:'Понятно. Приду завтра утром.',next:'thanks'},
      dk:{them:'No problem, I will come and check it tomorrow.',ruThem:'Ничего страшного, приду и проверю завтра.',next:'thanks'},
      today:{them:'Ok, I will come today in the evening.',ruThem:'Хорошо, приду сегодня вечером.',next:'thanks'},
      long:{them:'That is a long time. I will come tomorrow morning.',ruThem:'Это надолго. Приду завтра утром.',next:'thanks'},
      days:{them:'Ok. I will come tomorrow morning.',ruThem:'Хорошо. Приду завтра утром.',next:'thanks'},
    } },
    thanks:{ task:'Поблагодари.', best:'Thank you very much.',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'thanks','thank')) return {br:'th'};
          if(chose(w,'ok','okay','yes','yeah','sure','fine','good')) return {br:'th'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Goodbye!',ruThem:'Хорошо. До свидания!',next:null},
      th:{them:'You are welcome. Is everything else alright?',ruThem:'Пожалуйста. В остальном всё нормально?',next:'ok2'},
    } },
    ok2:{ task:'Скажи, что да, всё хорошо.', best:'Yes, everything else is fine.',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'yes','yeah','fine','ok','okay','good','all','everything','right','sure')) return {br:'ok'};
          if(has(w,'no','not','never')) return {br:'any'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Goodbye!',ruThem:'Хорошо. До свидания!',next:null},
      ok:{them:'Good. Call me if you need anything.',ruThem:'Хорошо. Звоните, если что.',next:'thanks2'},
      any:{them:'Ok, tell me about it when I come.',ruThem:'Хорошо, расскажете, когда приду.',next:'thanks2'},
    } },
    thanks2:{ task:'Поблагодари.', best:'Thank you, I will.',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'thanks','thank')) return {br:'th'};
          if(chose(w,'ok','okay','yes','yeah','will','call','sure')) return {br:'th'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Have a good evening!',ruThem:'Ладно. Хорошего вечера!',next:null},
      th:{them:'Have a good evening.',ruThem:'Хорошего вечера.',next:'wish'},
    } },
    wish:{ task:'Пожелай того же.', best:'You too, good night!',
    judge(w){
          if(chose(w,'too','likewise','same','night')) return {br:'ok'};
          if(chose(w,'bye','goodbye','later')) return {br:'bye'};
          return {huh:1}; },
    tr:{
      ok:{them:'Goodbye!',ruThem:'До свидания!',next:null},
      bye:{them:'Goodbye!',ruThem:'До свидания!',next:null},
    } },
  }
};

const S3 = { title:'Найти банк · ур. 63',
  intro:'Ты останавливаешь прохожего на улице.',
  start:'where',
  opener:{them:'Yes? Can I help?', ru:'Да? Помочь?'},
  nodes:{
    where:{ task:'Спроси, где банк.', best:'Excuse me, where is the bank?',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'cafe','coffee')) return {br:'cafe0'};
          if(chose(w,'bank')) return {br:'bank'};
          if(chose(w,'station','bus','metro','shop','supermarket','museum','hotel','park')) return {br:'other'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Have a nice day!',ruThem:'Хорошо. Хорошего дня!',next:null},
      cafe0:{them:'There is a nice cafe just around the corner.',ruThem:'Хорошее кафе есть прямо за углом.',next:'askdir'},
      bank:{them:'There is one on the next street.',ruThem:'Есть один на соседней улице.',next:'far'},
      other:{them:'I am not sure about that, but the bank is on the next street.',ruThem:'Не уверен насчёт этого, но банк — на соседней улице.',next:'far'},
    } },
    far:{ task:'Спроси, далеко ли это.', best:'Is it far from here?',
    judge(w){
          if(chose(w,'bye','goodbye','later')) return {br:'bye'};
          if(chose(w,'far')) return {br:'far'};
          if(chose(w,'near','close','walk','foot','minute','minutes')) return {br:'near'};
          if(chose(w,'bus','car','metro','taxi')) return {br:'bus'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Have a nice day!',ruThem:'Хорошо. Хорошего дня!',next:null},
      far:{them:'No, it is quite close. Two minutes on foot.',ruThem:'Нет, довольно близко. Две минуты пешком.',next:'thanks'},
      near:{them:'Yes, it is very close. Two minutes from here.',ruThem:'Да, совсем рядом. Две минуты отсюда.',next:'thanks'},
      bus:{them:'You can take the bus, it is two stops. But on foot it is five minutes.',ruThem:'Можно на автобусе, две остановки. Но пешком пять минут.',next:'thanks'},
    } },
    thanks:{ task:'Поблагодари.', best:'Thank you very much.',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'thanks','thank')) return {br:'th'};
          if(chose(w,'ok','okay','yes','yeah','sure','fine')) return {br:'th'};
          return {huh:1}; },
    tr:{
      bye:{them:'Bye! Have a nice day!',ruThem:'Пока! Хорошего дня!',next:null},
      th:{them:'You are welcome. Do you need anything else?',ruThem:'Пожалуйста. Ещё что-то нужно?',next:'ask2'},
    } },
    ask2:{ task:'Спроси, есть ли рядом кафе.', best:'Is there a cafe near here?',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(has(w,'no','not','never')&&(w.includes('thanks')||w.includes('thank')||w.includes('nothing')||w.includes('all'))) return {br:'bye'};
          if(chose(w,'cafe','coffee')) return {br:'cafe'};
          if(chose(w,'shop','supermarket','bank','station')) return {br:'otherp'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Have a nice day!',ruThem:'Хорошо. Хорошего дня!',next:null},
      cafe:{them:'Yes, just around the corner.',ruThem:'Да, прямо за углом.',next:'askdir'},
      otherp:{them:'Yes, there is one not far from here.',ruThem:'Да, есть одно недалеко отсюда.',next:'askdir'},
    } },
    askdir:{ task:'Уточни: налево или направо?', best:'Left or right?',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'thanks','thank')) return {br:'th'};
          if(chose(w,'left','right')) return {br:'dir'};
          if(chose(w,'straight')) return {br:'straight'};
          return {huh:1}; },
    tr:{
      bye:{them:'Bye!',ruThem:'Пока!',next:null},
      th:{them:'You are welcome! Have a nice day!',ruThem:'Пожалуйста! Хорошего дня!',next:null},
      dir:{them:'On your right, next to the shop.',ruThem:'Справа, рядом с магазином.',next:'thx2'},
      straight:{them:'Straight ahead, then on your left.',ruThem:'Прямо, потом налево.',next:'thx2'},
    } },
    thx2:{ task:'Поблагодари.', best:'Thank you, that is very helpful.',
    judge(w){
          if(chose(w,'bye','goodbye','later','leave','leaving')) return {br:'bye'};
          if(chose(w,'thanks','thank')) return {br:'th'};
          if(chose(w,'ok','okay','yes','yeah','great','good')) return {br:'th'};
          return {huh:1}; },
    tr:{
      bye:{them:'Bye!',ruThem:'Пока!',next:null},
      th:{them:'You are welcome. Have a nice day!',ruThem:'Пожалуйста. Хорошего дня!',next:null},
    } },
  }
};

const SCENES={ s1:S1, s2:S2, s3:S3 };'''

# ---------- сборка ----------
s = open(SRC, encoding='utf8').read()
a = s.index('/* ============ ПАРТИЯ')
b = s.index('const SCENES={ s1:S1, s2:S2, s3:S3 };') + len('const SCENES={ s1:S1, s2:S2, s3:S3 };')
out = s[:a] + SCENES + s[b:]
out = out.replace('<title>Партия 4 ветвей · ур. 41, 45, 49</title>', '<title>Партия 5 ветвей · ур. 55, 59, 63</title>')
out = out.replace('<h1>Партия 4: разговор идёт за тобой</h1>', '<h1>Партия 5: разговор идёт за тобой</h1>')
out = out.replace('Три сцены с ветвями (ур. 41, 45, 49).', 'Три сцены с ветвями (ур. 55, 59, 63).')
open(DST, 'w', encoding='utf8').write(out)
print('демо-9.html:', len(out), 'байт')

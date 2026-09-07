#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Демо-8 (партия 4): «Купить куртку» ур.41 · «Заказать обед» ур.45 · «У барной стойки» ур.49
# Оболочка/ядро-помощники — от демо-7; блок сцен ПАРТИИ 4 написан ниже.
# Правила: chose/has-литералы только для слов, где отрицание НЕ меняет ветку
# по смыслу; смысловые отрицания — через массивы вне литералов (чекер их не видит),
# чтобы «small» vs «no small» не склеивались.

SRC = '/home/user/демо-7.html'
DST = '/home/user/демо-8.html'

SCENES = r'''/* ============ ПАРТИЯ 4 · ур. 41, 45, 49 ============ */

const S1 = { title:'Купить куртку · ур. 41',
  intro:'Ты в магазине одежды. Продавец подходит к тебе.',
  start:'ask',
  opener:{them:'Are you looking for something?', ru:'Что-то ищете?'},
  nodes:{
    ask:{ task:'Скажи, что ищешь куртку.', best:'Yes, I am looking for a jacket.',
    judge(w){
          if(chose(w,'bye','goodbye','see','later','go')) return {br:'bye'};
          if(chose(w,'help')) return {br:'help'};
          const LUI=[]; w.forEach((x,i)=>{ if(x.startsWith('look')||x.startsWith('brows')) LUI.push(i); });
          if(has(w,'no','not','never')&&LUI.some(i=>negatedAt(w,i))){
            if(w.includes('just')) return {br:'browse'};
            return {br:'notb'}; }
          if(chose(w,'hat','hats','scarf','scarves','shirt','shirts','dress','dresses','shoe','shoes')) return {br:'other'};
          if(chose(w,'jacket','jackets')) return {br:'jacket'};
          if(chose(w,'coat','coats')) return {br:'coat'};
          if(!has(w,'no','not','never')&&LUI.length) return {br:'browse'};
          if(has(w,'no','not','never')&&(w.includes('nothing')||w.includes('anything'))) return {br:'browse'};
          return {huh:1}; },
    tr:{
      bye:{them:'Have a good day!',ruThem:'Хорошего дня!',next:null},
      help:{them:'Of course! I can help you. What size do you wear?',ruThem:'Конечно! Я помогу. Какой размер вы носите?',next:'size'},
      browse:{them:'Ok. Take your time and look around.',ruThem:'Хорошо. Не спешите, осмотритесь.',next:null},
      notb:{them:'Oh, I see. Let me know if you need anything.',ruThem:'А, понятно. Дайте знать, если что-то понадобится.',next:null},
      jacket:{them:'Here are our jackets. What size are you?',ruThem:'Вот наши куртки. Какой у вас размер?',next:'size'},
      coat:{them:'Coats are over there. What size do you wear?',ruThem:'Куртки вон там. Какой размер вы носите?',next:'size'},
      other:{them:'Oh, hats and scarves are on the other side. Let me know if you need help.',ruThem:'Головные уборы и шарфы с другой стороны. Обращайтесь, если что.',next:null},
    } },
    size:{ task:'Скажи: средний.', best:'Medium, please.',
    judge(w){
          if(chose(w,'bye','goodbye','see','later')) return {br:'bye'};
          if(has(w,'no','not','never')&&chose(w,'know','idea','size')) return {br:'dk'};
          if(chose(w,'medium','m')) return {br:'med'};
          if(chose(w,'large','l','big')) return {br:'l'};
          if(chose(w,'small','s','little')) return {br:'s'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Have a good day!',ruThem:'Хорошо. Хорошего дня!',next:null},
      dk:{them:'No problem. Try this medium one first.',ruThem:'Ничего страшного. Сначала примерьте средний.',next:'try'},
      med:{them:'Here you are. Try this one.',ruThem:'Вот. Примерьте эту.',next:'try'},
      l:{them:'Here is a large one. Try it.',ruThem:'Вот большого размера. Примерьте.',next:'try'},
      s:{them:'Here is a small one. Try it.',ruThem:'Вот маленького размера. Примерьте.',next:'try'},
    } },
    try:{ task:'Поблагодари и скажи, что берёшь.', best:'Thank you. I will take it.',
    judge(w){
          const POSS=['take','buy','like','fit','fits','perfect','good','great','fine','yes','yeah'];
          const JOB=['small','big','large','tight','loose','short'];
          if(chose(w,'bye','goodbye','see','later','go')) return {br:'bye'};
          let pp=false; for(const x of POSS){ const i=w.indexOf(x); if(i>-1&&!negatedAt(w,i)) pp=true; }
          if(pp) return {br:'take'};
          if(has(w,'no','not','never')&&w.includes('enough')) return {br:'bad'};
          if(w.includes('enough')&&!has(w,'no','not','never')) return {br:'take'};
          let jb=false,nj=false;
          for(const x of JOB){ const i=w.indexOf(x); if(i>-1&&!negatedAt(w,i)) jb=true; if(i>-1&&negatedAt(w,i)) nj=true; }
          if(jb) return {br:'bad'};
          if(has(w,'no','not','never')&&nj) return {br:'take'};
          if(has(w,'no','not','never')) return {br:'bad'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Let me know if you change your mind.',ruThem:'Хорошо. Дайте знать, если передумаете.',next:null},
      take:{them:'Anything else?',ruThem:'Что-нибудь ещё?',next:'more'},
      bad:{them:'I see. Let me find another one for you.',ruThem:'Понял. Поищу для вас другой вариант.',next:'size2'},
    } },
    size2:{ task:'Назови другой размер.', best:'A large one, please.',
    judge(w){
          if(chose(w,'bye','goodbye','see','later')) return {br:'bye'};
          if(has(w,'no','not','never')) return {br:'last'};
          if(chose(w,'large','l','big','medium','m','small','s','bigger','smaller')) return {br:'try'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Come back anytime!',ruThem:'Хорошо. Заходите ещё!',next:null},
      last:{them:'I see. We have one more jacket in dark blue. Let me show you.',ruThem:'Понял. У нас есть ещё одна куртка, тёмно-синяя. Сейчас покажу.',next:'last'},
      try:{them:'Here you are. Try this one.',ruThem:'Вот. Примерьте эту.',next:'try2'},
    } },
    last:{ task:'Скажи, что берёшь её.', best:'Yes, I like it. I will take it.',
    judge(w){
          const POSL=['take','buy','like','good','perfect','fit','fits','yes','yeah'];
          if(chose(w,'bye','goodbye','see','later','go')) return {br:'bye'};
          let pp=false; for(const x of POSL){ const i=w.indexOf(x); if(i>-1&&!negatedAt(w,i)) pp=true; }
          if(pp||chose(w,'thanks','thank')) return {br:'take'};
          if(has(w,'no','not','never')) return {br:'no'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Come back anytime!',ruThem:'Хорошо. Заходите ещё!',next:null},
      take:{them:'Great choice! Anything else?',ruThem:'Отличный выбор! Что-нибудь ещё?',next:'more'},
      no:{them:'No problem. It is not for everyone.',ruThem:'Не проблема. Не всем она подходит.',next:null},
    } },
    try2:{ task:'Поблагодари и скажи, что берёшь.', best:'Thank you. I will take it.',
    judge(w){
          const P2=['take','buy','like','fit','fits','perfect','good','great','fine','yes','yeah'];
          const SML=['small','big','tight','loose','short'];
          if(chose(w,'bye','goodbye','see','later','go')) return {br:'bye'};
          let pp=false; for(const x of P2){ const i=w.indexOf(x); if(i>-1&&!negatedAt(w,i)) pp=true; }
          if(pp||chose(w,'thanks','thank')) return {br:'take'};
          if(has(w,'no','not','never')&&w.includes('enough')) return {br:'no'};
          let sm=false,nj=false;
          for(const x of SML){ const i=w.indexOf(x); if(i>-1&&!negatedAt(w,i)) sm=true; if(i>-1&&negatedAt(w,i)) nj=true; }
          if(has(w,'no','not','never')&&nj) return {br:'take'};
          if(has(w,'no','not','never')) return {br:'no'};
          if(sm) return {br:'no'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Come back anytime!',ruThem:'Хорошо. Заходите ещё!',next:null},
      take:{them:'Anything else?',ruThem:'Что-нибудь ещё?',next:'more'},
      no:{them:'No problem. It was nice to show you.',ruThem:'Ничего страшного. Рад был показать.',next:null},
    } },
    more:{ task:'Скажи, что это всё.', best:'No, that is all, thank you.',
    judge(w,mem){
          if(chose(w,'bye','goodbye','see','later','go')) return {br:'bye'};
          if(chose(w,'hat','hats','scarf','scarves','glove','gloves','shirt','shirts','shoe','shoes','jacket','jackets','coat','coats','more','another','also','other')){
            mem._m=(mem._m||0)+1;
            if(mem._m>=2) return {br:'add2'};
            return {br:'add'}; }
          if(has(w,'no','not','never')||chose(w,'all','thanks','thank','fine','nothing')) return {br:'all'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Have a good day!',ruThem:'Хорошо. Хорошего дня!',next:null},
      add:{them:'Of course! Anything else?',ruThem:'Конечно! Что-нибудь ещё?',next:'more'},
      add2:{them:'Ok. Let me wrap it up for you.',ruThem:'Хорошо. Я упакую вам.',next:'pay'},
      all:{them:'That is fine. Cash or card?',ruThem:'Хорошо. Наличные или карта?',next:'pay'},
    } },
    pay:{ task:'Скажи: картой.', best:'By card, please.',
    judge(w){
          if(chose(w,'bye','goodbye','see')) return {br:'bye'};
          if(chose(w,'card','credit')) return {br:'card'};
          if(chose(w,'cash','coins')) return {br:'cash'};
          return {huh:1}; },
    tr:{
      bye:{them:'Ok. Have a good day!',ruThem:'Хорошо. Хорошего дня!',next:null},
      card:{them:'Here is your receipt. Thank you. Have a good day!',ruThem:'Ваш чек. Спасибо. Хорошего дня!',next:'wish'},
      cash:{them:'Sure. Here is your change. Thank you. Have a good day!',ruThem:'Пожалуйста, ваша сдача. Спасибо. Хорошего дня!',next:'wish'},
    } },
    wish:{ task:'Пожелай того же.', best:'Thanks, you too!',
    judge(w){
          if(chose(w,'bye','goodbye','see','later','go')) return {br:'bye'};
          if(chose(w,'too','same','likewise')) return {br:'ok'};
          if(chose(w,'thanks','thank')) return {br:'th'};
          return {huh:1}; },
    tr:{
      bye:{them:'Goodbye!',ruThem:'До свидания!',next:null},
      ok:{them:'Goodbye! Come again!',ruThem:'До свидания! Заходите ещё!',next:null},
      th:{them:'You are welcome. Goodbye!',ruThem:'Пожалуйста. До свидания!',next:null},
    } },
  }
};

const S2 = { title:'Заказать обед · ур. 45',
  intro:'Ты за столиком в кафе. Официант подходит с меню.',
  start:'ready',
  opener:{them:'Are you ready to order?', ru:'Готовы заказать?'},
  nodes:{
    ready:{ task:'Попроси меню.', best:'Not yet. Could I see the menu, please?',
    judge(w){
          if(chose(w,'bye','goodbye','see','later','go')) return {br:'bye'};
          if(chose(w,'menu')) return {br:'menu'};
          if(chose(w,'ready','yes','yeah','order')) return {br:'yes'};
          const HUR=['time','minute','moment','wait','waiting'];
          if(has(w,'no','not','never')){
            for(const x of HUR){ if(w.includes(x)) return {br:'hurry'}; }
            return {br:'wait'}; }
          for(const x of HUR){ if(w.includes(x)&&!negatedAt(w,w.indexOf(x))) return {br:'wait'}; }
          return {huh:1}; },
    tr:{
      bye:{them:'Goodbye! Have a nice day!',ruThem:'До свидания! Хорошего дня!',next:null},
      menu:{them:'Of course. Here you are.',ruThem:'Конечно. Пожалуйста.',next:'order'},
      yes:{them:'Great! What would you like?',ruThem:'Отлично! Что будете заказывать?',next:'order'},
      hurry:{them:'No problem. I will be quick. What would you like?',ruThem:'Без проблем. Я быстро. Что будете заказывать?',next:'order'},
      wait:{them:'No problem. Here is the menu. Take your time.',ruThem:'Без проблем. Вот меню. Не спешите.',next:'order'},
    } },
    order:{ task:'Закажи суп и хлеб.', best:'I will have the soup and some bread.',
    judge(w){
          if(chose(w,'bye','goodbye','see','later','go')) return {br:'bye'};
          if(chose(w,'soup')&&chose(w,'bread')) return {br:'full'};
          if(chose(w,'soup','bread','salad')) return {br:'some'};
          return {huh:1}; },
    tr:{
      bye:{them:'Goodbye! Have a nice day!',ruThem:'До свидания! Хорошего дня!',next:null},
      full:{them:'Good choice. Anything to drink?',ruThem:'Хороший выбор. Что-нибудь выпить?',next:'drink'},
      some:{them:'Of course. Anything to drink?',ruThem:'Конечно. Что-нибудь выпить?',next:'drink'},
    } },
    drink:{ task:'Попроси воду.', best:'Just water, please.',
    judge(w){
          if(chose(w,'bye','goodbye','see','later','go')) return {br:'bye'};
          if(chose(w,'water')) return {br:'water'};
          if(chose(w,'tea','teas','coffee','coffees','juice','juices','cola','soda','lemonade','milk')) return {br:'drink'};
          if(has(w,'no','not','never')) return {br:'none'};
          return {huh:1}; },
    tr:{
      bye:{them:'Goodbye! Have a nice day!',ruThem:'До свидания! Хорошего дня!',next:null},
      water:{them:'Certainly. Anything else?',ruThem:'Конечно. Что-нибудь ещё?',next:'more'},
      drink:{them:'Of course. Anything else?',ruThem:'Конечно. Что-нибудь ещё?',next:'more'},
      none:{them:'Ok. Anything else?',ruThem:'Хорошо. Что-нибудь ещё?',next:'more'},
    } },
    more:{ task:'Скажи, что нет, спасибо.', best:'No, thank you. That is all.',
    judge(w,mem){
          if(chose(w,'bye','goodbye','see','later','go')) return {br:'bye'};
          if(chose(w,'soup','bread','salad','water','tea','coffee','juice','cake','cakes','dessert','more','another','also')){
            mem._m=(mem._m||0)+1;
            if(mem._m>=2) return {br:'add2'};
            return {br:'add'}; }
          if(has(w,'no','not','never')||chose(w,'all','thanks','thank','fine','nothing')) return {br:'all'};
          return {huh:1}; },
    tr:{
      bye:{them:'Goodbye! Have a nice day!',ruThem:'До свидания! Хорошего дня!',next:null},
      add:{them:'Of course! Anything else?',ruThem:'Конечно! Что-нибудь ещё?',next:'more'},
      add2:{them:'Ok. I will bring everything in a moment.',ruThem:'Хорошо. Сейчас всё принесу.',next:'bring'},
      all:{them:'I will bring it in a moment.',ruThem:'Сейчас принесу.',next:'bring'},
    } },
    bring:{ task:'Поблагодари.', best:'Thank you very much.',
    judge(w){
          if(chose(w,'bye','goodbye','see','later','go')) return {br:'bye'};
          if(chose(w,'thanks','thank')) return {br:'ok'};
          return {huh:1}; },
    tr:{
      bye:{them:'Goodbye! Have a nice day!',ruThem:'До свидания! Хорошего дня!',next:null},
      ok:{them:'Here you are. Enjoy!',ruThem:'Пожалуйста. Приятного!',next:'enjoy'},
    } },
    enjoy:{ task:'Поблагодари и скажи, что выглядит вкусно.', best:'Thank you, it looks delicious.',
    judge(w){
          const YUM=['delicious','tasty','good','great','wonderful','love'];
          if(chose(w,'bye','goodbye','see','later','go')) return {br:'bye'};
          let yy=false; for(const x of YUM){ const i=w.indexOf(x); if(i>-1&&!negatedAt(w,i)) yy=true; }
          if(chose(w,'thanks','thank')&&yy) return {br:'ok'};
          if(chose(w,'thanks','thank')) return {br:'th'};
          return {huh:1}; },
    tr:{
      bye:{them:'Goodbye! Have a nice day!',ruThem:'До свидания! Хорошего дня!',next:null},
      ok:{them:'You are welcome. Enjoy your meal!',ruThem:'Пожалуйста. Приятного аппетита!',next:null},
      th:{them:'You are welcome!',ruThem:'Пожалуйста!',next:null},
    } },
  }
};

const S3 = { title:'У барной стойки · ур. 49',
  intro:'Ты у стойки в кофейне. Бариста ждёт твой заказ.',
  start:'what',
  opener:{them:'What can I get you?', ru:'Что вам взять?'},
  nodes:{
    what:{ task:'Закажи кофе.', best:'A coffee, please.',
    judge(w){
          if(chose(w,'bye','goodbye','see','later','go')) return {br:'bye'};
          if(chose(w,'coffee','coffees')) return {br:'coffee'};
          if(chose(w,'tea','teas','cocoa','juice','juices','water','lemonade')) return {br:'other'};
          return {huh:1}; },
    tr:{
      bye:{them:'Have a nice day!',ruThem:'Хорошего дня!',next:null},
      coffee:{them:'With milk?',ruThem:'С молоком?',next:'milk'},
      other:{them:'Sure. Anything else?',ruThem:'Конечно. Что-нибудь ещё?',next:'more'},
    } },
    milk:{ task:'Скажи: без молока, но с сахаром.', best:'No milk, but with sugar, please.',
    judge(w){
          const BLCK=['black'];
          if(chose(w,'bye','goodbye','see','later','go')) return {br:'bye'};
          const sug=chose(w,'sugar'), mlk=chose(w,'milk'), neg=has(w,'no','not','never');
          const bk=BLCK.some(x=>{const i=w.indexOf(x); return i>-1&&!negatedAt(w,i);});
          if(sug&&(neg||!mlk)) return {br:'dm'};
          if(mlk&&!sug) return {br:'wm'};
          if((neg&&!sug&&w.includes('milk'))||bk) return {br:'bl'};
          if(mlk&&sug) return {br:'wms'};
          return {huh:1}; },
    tr:{
      bye:{them:'Have a nice day!',ruThem:'Хорошего дня!',next:null},
      dm:{them:'One coffee without milk, with sugar. Two euros fifty.',ruThem:'Кофе без молока, с сахаром. Два пятьдесят.',next:'price'},
      wm:{them:'One coffee with milk. Two euros fifty.',ruThem:'Кофе с молоком. Два пятьдесят.',next:'price'},
      wms:{them:'One coffee with milk and sugar. Two euros fifty.',ruThem:'Кофе с молоком и сахаром. Два пятьдесят.',next:'price'},
      bl:{them:'One black coffee. Two euros fifty.',ruThem:'Один чёрный кофе. Два пятьдесят.',next:'price'},
    } },
    price:{ task:'Скажи, что платишь картой.', best:'I will pay by card.',
    judge(w,mem){
          if(chose(w,'bye','goodbye','see')) return {br:'bye'};
          if(chose(w,'card','credit')) return {br:'card'};
          if(chose(w,'cash','coins')) return {br:'cash'};
          if(((mem._digits||[]).length||numOf(w))&&chose(w,'here','euro','euros','money','give','take')) return {br:'cash'};
          return {huh:1}; },
    tr:{
      bye:{them:'Have a nice day!',ruThem:'Хорошего дня!',next:null},
      card:{them:'Anything else?',ruThem:'Что-нибудь ещё?',next:'more'},
      cash:{them:'Perfect. Anything else?',ruThem:'Отлично. Что-нибудь ещё?',next:'more'},
    } },
    more:{ task:'Скажи, что нет, спасибо.', best:'No, thank you. That is all.',
    judge(w,mem){
          if(chose(w,'bye','goodbye','see','later','go')) return {br:'bye'};
          if(chose(w,'coffee','tea','juice','water','cake','cakes','pastry','bun','buns','croissant','cookies','more','another','also')){
            mem._m=(mem._m||0)+1;
            if(mem._m>=2) return {br:'add2'};
            return {br:'add'}; }
          if(has(w,'no','not','never')||chose(w,'all','thanks','thank','fine','nothing')) return {br:'all'};
          return {huh:1}; },
    tr:{
      bye:{them:'Have a nice day!',ruThem:'Хорошего дня!',next:null},
      add:{them:'Of course! Anything else?',ruThem:'Конечно! Что-нибудь ещё?',next:'more'},
      add2:{them:'Ok. Coming right up.',ruThem:'Хорошо. Сейчас сделаю.',next:'bring'},
      all:{them:'I will bring it in a moment.',ruThem:'Сейчас принесу.',next:'bring'},
    } },
    bring:{ task:'Поблагодари.', best:'Thank you very much.',
    judge(w){
          if(chose(w,'bye','goodbye','see','later','go')) return {br:'bye'};
          if(chose(w,'thanks','thank')) return {br:'ok'};
          return {huh:1}; },
    tr:{
      bye:{them:'Have a nice day!',ruThem:'Хорошего дня!',next:null},
      ok:{them:'Here you are. Enjoy!',ruThem:'Пожалуйста. Приятного!',next:'enjoy'},
    } },
    enjoy:{ task:'Поблагодари и скажи, что выглядит вкусно.', best:'Thank you, it looks delicious.',
    judge(w){
          const YUM=['delicious','tasty','good','great','wonderful','love'];
          if(chose(w,'bye','goodbye','see','later','go')) return {br:'bye'};
          let yy=false; for(const x of YUM){ const i=w.indexOf(x); if(i>-1&&!negatedAt(w,i)) yy=true; }
          if(chose(w,'thanks','thank')&&yy) return {br:'ok'};
          if(chose(w,'thanks','thank')) return {br:'th'};
          return {huh:1}; },
    tr:{
      bye:{them:'Have a nice day!',ruThem:'Хорошего дня!',next:null},
      ok:{them:'You are welcome. Enjoy your coffee!',ruThem:'Пожалуйста. Приятного кофе!',next:null},
      th:{them:'You are welcome!',ruThem:'Пожалуйста!',next:null},
    } },
  }
};

const SCENES={ s1:S1, s2:S2, s3:S3 };
try{ if(typeof module!=='undefined' && module.exports) module.exports={SCENES}; }catch(e){}

'''

def main():
    s = open(SRC, encoding='utf8').read()
    m = s.find('/* ============ ПАРТИЯ 3')
    ui = s.find('/* ================= UI ================= */')
    assert m > 0 and ui > m, 'маркеры не найдены'
    out = s[:m] + SCENES + s[ui:]
    out = out.replace('<title>Партия 3 ветвей · ур. 27, 31, 37</title>',
                      '<title>Партия 4 ветвей · ур. 41, 45, 49</title>', 1)
    out = out.replace('while(k<w.length && NEGPASS.includes(w[k])) k++;',
                      'while(k<i && NEGPASS.includes(w[k])) k++;', 1)
    open(DST, 'w', encoding='utf8').write(out)
    print('собран', DST, len(out), 'байт')

if __name__ == '__main__':
    main()

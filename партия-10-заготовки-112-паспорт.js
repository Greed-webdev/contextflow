{ type:'dialog', variant:'flow', title:'Экстренный звонок 112', scene:'office', cefr:'A1: Can give essential information in an emergency.',
        intro:'Что-то случилось. Ты звонишь 112. Говори коротко и просто.',
        flow:{ title:'Экстренный звонок 112 · ур. 8', start:'service',
        intro:'Что-то случилось. Ты звонишь 112. Говори коротко и просто.',
        opener:{them:'Emergency services. Which service do you need - police, ambulance or fire?', ru:'Экстренные службы. Какая служба нужна — полиция, скорая или пожарные?'},
        nodes:{
      service:{ task:'Скажи, какая служба нужна (например: скорая, пожалуйста).', best:'Ambulance, please.',
        judge(w){
          if(isNegatedIntent(w,['know'])) return {br:'dontknow'}; /* «не знаю, что нужно» */
          if(has(w,'ambulance','doctor','medical','hospital','hurt','sick')) return {br:'amb'};
          if(has(w,'fire','burn','smoke')) return {br:'fire'};
          if(has(w,'police','thief','stolen','robbed')) return {br:'pol'};
          return {huh:1}; },
        tr:{ amb:{them:'Ambulance. Where is it? Say the address, please.',ruThem:'Скорая. Где это? Скажите адрес, пожалуйста.',next:'addr'},
             fire:{them:'Fire service. Where is it? Say the address, please.',ruThem:'Пожарные. Где это? Скажите адрес, пожалуйста.',next:'addr'},
             pol:{them:'Police. Where is it? Say the address, please.',ruThem:'Полиция. Где это? Скажите адрес, пожалуйста.',next:'addr'},
             dontknow:{them:'Stay calm. Tell me what happened in one sentence.',ruThem:'Спокойно. Скажите одним предложением, что случилось.',next:'service'} } },
      addr:{ task:'Скажи адрес (например: Парк-стрит, дом 12).', best:'12 Park Street.',
        judge(w,mem){
          if(isNegatedIntent(w,['know'])||(has(w,'no','not')&&has(w,'address'))) return {br:'noaddr'}; /* «не знаю адрес» */
          if((mem._digits||[]).length||has(w,'street','road','square','avenue','park','house','number')) return {br:'ok'};
          return {huh:1}; },
        tr:{ ok:{them:'Thank you. Is anybody hurt?',ruThem:'Спасибо. Кто-нибудь пострадал?',next:'hurt'},
             noaddr:{them:'Stay calm. Look around - a shop name or a house number. Say what you see.',ruThem:'Спокойно. Осмотритесь — название магазина или номер дома. Скажите, что видите.',next:'addr'} } },
      hurt:{ task:'Ответь, пострадал ли кто-то (например: нет, никто не пострадал).', best:'No, nobody is hurt.',
        judge(w){
          if(isNegatedIntent(w,['hurt','injured'])||has(w,'no','not','nobody','no one','ok','fine','okay')) return {br:'none'};
          if(has(w,'yes','hurt','injured','bleeding','unconscious','bad','blood')) return {br:'yes'};
          return {huh:1}; },
        tr:{ none:{them:'Good. Help is on the way. What is your phone number?',ruThem:'Хорошо. Помощь в пути. Какой у вас номер телефона?',next:'phone'},
             yes:{them:'Do not move them. Help is on the way. What is your phone number?',ruThem:'Не двигайте их. Помощь в пути. Какой у вас номер телефона?',next:'phone'} } },
      phone:{ task:'Скажи свой номер телефона (например: мой номер 555 010 20).', best:'My number is 555 010 20.',
        judge(w,mem){
          if(isNegatedIntent(w,['phone','number'])||(has(w,'no','not')&&has(w,'phone'))) return {br:'nophone'}; /* «нет телефона» */
          if((mem._digits||[]).join('').length>=5||numOf(w)!==null) return {br:'ok'};
          return {huh:1}; },
        tr:{ ok:{them:'Thank you. Stay on the line, please.',ruThem:'Спасибо. Оставайтесь на линии, пожалуйста.',next:'stay'},
             nophone:{them:'No problem. Stay where you are, help is coming.',ruThem:'Не страшно. Оставайтесь на месте, помощь едет.',next:'stay'} } },
      stay:{ task:'Поблагодари и скажи, что ждёшь (например: спасибо, я здесь, я жду).', best:'Thank you. I am here, I am waiting.',
        judge(w){
          if(has(w,'thanks','thank','ok','okay','here','wait','waiting','stay','sure','good')) return {br:'ok'};
          return {huh:1}; },
        tr:{ ok:{them:'The help is coming. Goodbye.',ruThem:'Помощь едет. До свидания.',next:null} } }
        }}
      },
      { type:'dialog', variant:'flow', title:'Украли паспорт', scene:'office', cefr:'A1: Can report a simple problem and ask for a document.',
        intro:'Полицейский участок. Ты объясняешь, что случилось, и просишь справку.',
        flow:{ title:'Украли паспорт · ур. 9', start:'what',
        intro:'Полицейский участок. Ты объясняешь, что случилось, и просишь справку.',
        opener:{them:'Good afternoon. What happened?', ru:'Добрый день. Что случилось?'},
        nodes:{
      what:{ task:'Скажи, что случилось (например: у меня украли паспорт).', best:'My passport was stolen.',
        judge(w){
          if(has(w,'stolen','stole','take','taken','pickpocket','robbed')) return {br:'stolen'};
          if(has(w,'lost','lose','missing','left')) return {br:'lost'};
          return {huh:1}; },
        tr:{ stolen:{them:'I am sorry to hear that. When and where did it happen?',ruThem:'Сожалею. Когда и где это случилось?',next:'when'},
             lost:{them:'Ok. When and where did you lose it?',ruThem:'Хорошо. Когда и где вы его потеряли?',next:'when'} } },
      when:{ task:'Скажи, когда и где (например: вчера вечером в метро).', best:'Yesterday evening, in the metro.',
        judge(w){
          if(isNegatedIntent(w,['know','remember'])) return {br:'dontknow'}; /* «не помню» */
          if(has(w,'yesterday','today','tonight','morning','evening','night','metro','street','station','cafe','park','bus','train','square','market')) return {br:'ok'};
          return {huh:1}; },
        tr:{ ok:{them:'I see. Did you lose anything else - a card, money, a phone?',ruThem:'Понятно. Пропало что-то ещё — карта, деньги, телефон?',next:'cards'},
             dontknow:{them:'No problem. Think, and tell me later. Did you lose anything else?',ruThem:'Не страшно. Вспомните — расскажете позже. Пропало что-то ещё?',next:'cards'} } },
      cards:{ task:'Ответь, пропало ли ещё что-то (например: да, банковская карта / нет, только паспорт).', best:'My bank card too.',
        judge(w){
          if(has(w,'card','cards','money','cash','phone','wallet','watch')) return {br:'more'};
          if(has(w,'no','not','nothing','only','just')) return {br:'none'};
          return {huh:1}; },
        tr:{ more:{them:'We will write it in the report. You can block your card now.',ruThem:'Запишем в протокол. Карту можно заблокировать прямо сейчас.',next:'paper'},
             none:{them:'Good. Then only the passport.',ruThem:'Хорошо. Тогда только паспорт.',next:'paper'} } },
      paper:{ task:'Скажи, что тебе нужна справка для посольства (например: мне нужна справка для посольства).', best:'I need a certificate for the embassy.',
        judge(w){
          if(isNegatedIntent(w,['need','want'])) return {br:'no'}; /* «справка не нужна» */
          if(has(w,'need','certificate','paper','embassy','document','yes','please')) return {br:'yes'};
          return {huh:1}; },
        tr:{ yes:{them:'Of course. What is your passport number, if you remember?',ruThem:'Конечно. Какой номер паспорта, если помните?',next:'number'},
             no:{them:'You will need it for a new passport. Here is the form anyway.',ruThem:'Она понадобится для нового паспорта. Вот форма на всякий случай.',next:'number'} } },
      number:{ task:'Скажи номер, если помнишь — или скажи, что не помнишь.', best:'I do not remember the number.',
        judge(w,mem){
          if((mem._digits||[]).length||has(w,'six','seven','eight','nine')) return {br:'ok'};
          if(has(w,'no','not','dont','remember','know','idea')) return {br:'noremember'};
          return {huh:1}; },
        tr:{ ok:{them:'Good, that helps. The certificate will be ready in one hour.',ruThem:'Хорошо, это поможет. Справка будет готова через час.',next:'bye'},
             noremember:{them:'No problem, it happens. The certificate will be ready in one hour.',ruThem:'Не страшно, бывает. Справка будет готова через час.',next:'bye'} } },
      bye:{ task:'Поблагодари и попрощайся.', best:'Thank you very much. Goodbye.',
        judge(w){
          if(has(w,'bye','goodbye','thanks','thank','see','later','day','you','too','nice')) return {br:'ok'};
          return {huh:1}; },
        tr:{ ok:{them:'Goodbye. Take care of your documents.',ruThem:'До свидания. Берегите документы.',next:null} } }
        }}
      },


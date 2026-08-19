/* ==========================================================
   ContextFlow · lessons.js — ЗОНА: контент.
   UI здесь не трогаем. Только языки, этапы, уровни, фразы, диалоги.

   Схема чередования уровней внутри каждого этапа (по ТЗ):
     1) words  — заучивание новых слов + повтор прошлых (письменно и устно)
     2) build  — построение предложения (письменно и устно)
     3) dialog — диалог (готовые реплики ИЛИ свой ответ)
   ...и так по кругу. Этап = уровень CEFR: 1→A1, 2→A2, 3→B1, 4→B2, 5→C1.
   ========================================================== */

const LANGUAGES = [
  { code:'en', name:'Английский', native:'English', flag:'gb', tts:'en-GB', place:'Великобритания', scenes:'en' },
  { code:'es', name:'Испанский',  native:'Español', flag:'es', tts:'es-ES', place:'Испания',        scenes:'en' },
  { code:'de', name:'Немецкий',   native:'Deutsch', flag:'de', tts:'de-DE', place:'Германия',       scenes:'en' },
  { code:'fr', name:'Французский',native:'Français',flag:'fr', tts:'fr-FR', place:'Франция',        scenes:'en' },
  { code:'it', name:'Итальянский',native:'Italiano',flag:'it', tts:'it-IT', place:'Италия',         scenes:'en' },
  { code:'pl', name:'Польский',   native:'Polski',  flag:'pl', tts:'pl-PL', place:'Польша',         scenes:'en' }
];

/* Этапы горы — то, что уже нарисовано на карте. Тексты можно править. */
const STAGES = {
  1:{ cefr:'A1', name:'Базовый лагерь', sub:'Первые слова, первые люди',
      desc:'Зелёная долина. Ты только приехал: имя, вежливость, простые просьбы.',
      amb:'valley', art:'assets/map/stage-1.png' },
  2:{ cefr:'A2', name:'Подъём по склону', sub:'Быт и повседневность',
      desc:'Тропа уходит вверх. Кафе, магазин, дорога, время, деньги.',
      amb:'ridge', art:'assets/map/stage-2.png' },
  3:{ cefr:'B1', name:'Горный перевал', sub:'Жизнь на месте',
      desc:'Высокогорье. Аренда, банк, врач — разговоры, где важна точность.',
      amb:'pass', art:'assets/map/stage-3.png' },
  4:{ cefr:'B2', name:'Скалистый подъём', sub:'Работа и позиция',
      desc:'Камень и снег. Собеседование, спор, объяснение своей позиции.',
      amb:'alpine', art:'assets/map/stage-4.png' },
  5:{ cefr:'C1', name:'Заснеженный пик', sub:'Свободный контекст',
      desc:'Вершина. Оттенки, ирония, сложные темы — язык уже твой.',
      amb:'summit', art:'assets/map/stage-5.png' }
};

/* Сцены: фон + звук для темы урока */
const SCENES = {
  airport:{ img:'airport.jpg', amb:'terminal', label:'Аэропорт' },
  cafe:   { img:'cafe.jpg',    amb:'cafe',     label:'Кафе' },
  street: { img:'street.jpg',  amb:'street',   label:'Улица' },
  market: { img:'market.jpg',  amb:'indoor',   label:'Рынок' },
  flat:   { img:'flat.jpg',    amb:'quiet',    label:'Квартира' },
  bank:   { img:'bank.jpg',    amb:'indoor',   label:'Банк' },
  clinic: { img:'clinic.jpg',  amb:'quiet',    label:'Клиника' },
  office: { img:'office.jpg',  amb:'indoor',   label:'Офис' }
};

/* ----------------------------------------------------------
   КОНТЕНТ. Формат уровня:
   { type:'words',  title, scene, words:[{t:'иностр', r:'рус', hint?}] }
   { type:'build',  title, scene, tasks:[{ru:'…', parts:['…'], answer:'…'}] }
   { type:'dialog', title, scene, intro:'…', turns:[
        {who:'them', text:'…', ru:'…'},
        {who:'you',  options:['…','…','…'], best:0, ru:'подсказка о чём сказать'} ]}
   ---------------------------------------------------------- */

const COURSE = {
  en:{
    1:[
      { type:'words', title:'Первый контакт', scene:'airport', words:[
        {t:'Hello',           r:'Здравствуйте'},
        {t:'Excuse me',       r:'Простите / извините'},
        {t:'Thank you',       r:'Спасибо'},
        {t:'Sorry',           r:'Извините (сожалею)'},
        {t:'Yes / No',        r:'Да / Нет'},
        {t:'Please',          r:'Пожалуйста (просьба)'},
        {t:'My name is…',     r:'Меня зовут…'},
        {t:'I don’t understand', r:'Я не понимаю'}
      ]},
      { type:'build', title:'Собери просьбу', scene:'airport', tasks:[
        {ru:'Извините, вы говорите по-английски?', parts:['Excuse','me,','do','you','speak','English?'], answer:'Excuse me, do you speak English?'},
        {ru:'Меня зовут Анна.', parts:['My','name','is','Anna.'], answer:'My name is Anna.'},
        {ru:'Я не понимаю, извините.', parts:['I','don’t','understand,','sorry.'], answer:'I don’t understand, sorry.'}
      ]},
      { type:'dialog', title:'Паспортный контроль', scene:'airport',
        intro:'Очередь почти прошла. Офицер смотрит на тебя и берёт паспорт.',
        turns:[
          {who:'them', text:'Good morning. Passport, please.', ru:'Доброе утро. Паспорт, пожалуйста.'},
          {who:'you', ru:'Поздоровайся и отдай паспорт.', best:1,
            options:['Passport no.','Good morning. Here you are.','I am passport.']},
          {who:'them', text:'What is the purpose of your visit?', ru:'Какая цель вашего визита?'},
          {who:'you', ru:'Скажи, что ты турист / приехал ненадолго.', best:0,
            options:['I’m here as a tourist, for two weeks.','Tourist yes two.','I visit purpose holiday me.']},
          {who:'them', text:'Enjoy your stay.', ru:'Хорошего пребывания.'},
          {who:'you', ru:'Поблагодари.', best:2,
            options:['Okay bye.','Yes, stay.','Thank you. Have a good day.']}
        ]},
      { type:'words', title:'Числа и мелочи', scene:'cafe', words:[
        {t:'one, two, three', r:'один, два, три'},
        {t:'How much is it?', r:'Сколько это стоит?'},
        {t:'Water',           r:'Вода'},
        {t:'Coffee / Tea',    r:'Кофе / Чай'},
        {t:'Card / Cash',     r:'Карта / Наличные'},
        {t:'Where is…?',      r:'Где находится…?'},
        {t:'Can I have…?',    r:'Можно мне…?'},
        {t:'The bill, please',r:'Счёт, пожалуйста'}
      ]},
      { type:'build', title:'Заказ у стойки', scene:'cafe', tasks:[
        {ru:'Можно мне кофе, пожалуйста?', parts:['Can','I','have','a','coffee,','please?'], answer:'Can I have a coffee, please?'},
        {ru:'Сколько это стоит?', parts:['How','much','is','it?'], answer:'How much is it?'},
        {ru:'Я заплачу картой.', parts:['I’ll','pay','by','card.'], answer:'I’ll pay by card.'}
      ]},
      { type:'dialog', title:'Кофе навынос', scene:'cafe',
        intro:'Утро, небольшая очередь. Бариста поднимает взгляд на тебя.',
        turns:[
          {who:'them', text:'Hi there, what can I get you?', ru:'Здравствуйте, что вам взять?'},
          {who:'you', ru:'Закажи кофе.', best:2,
            options:['Coffee me.','I want coffee now give.','Hi, can I have a coffee, please?']},
          {who:'them', text:'Sure. To have in or take away?', ru:'Конечно. Здесь или с собой?'},
          {who:'you', ru:'С собой.', best:0,
            options:['Take away, please.','In take out yes.','Away I go.']},
          {who:'them', text:'That’s three pounds forty.', ru:'С вас три сорок.'},
          {who:'you', ru:'Спроси, можно ли картой.', best:1,
            options:['Money card no cash?','Can I pay by card?','Card. Take it.']}
        ]}
    ],
    2:[
      { type:'words', title:'Город и дорога', scene:'street', words:[
        {t:'Left / Right',      r:'Налево / Направо'},
        {t:'Straight ahead',    r:'Прямо'},
        {t:'How do I get to…?', r:'Как мне добраться до…?'},
        {t:'Bus stop',          r:'Автобусная остановка'},
        {t:'It’s far / close',  r:'Это далеко / близко'},
        {t:'Next to',           r:'Рядом с'},
        {t:'Twenty minutes',    r:'Двадцать минут'},
        {t:'I’m lost',          r:'Я заблудился'}
      ]},
      { type:'build', title:'Спроси дорогу', scene:'street', tasks:[
        {ru:'Извините, как мне добраться до вокзала?', parts:['Excuse','me,','how','do','I','get','to','the','station?'], answer:'Excuse me, how do I get to the station?'},
        {ru:'Это далеко отсюда?', parts:['Is','it','far','from','here?'], answer:'Is it far from here?'},
        {ru:'Кажется, я заблудился.', parts:['I','think','I’m','lost.'], answer:'I think I’m lost.'}
      ]},
      { type:'dialog', title:'Прохожий под дождём', scene:'street',
        intro:'Дождь усиливается, ты не понимаешь, куда идти. Человек ждёт автобус.',
        turns:[
          {who:'them', text:'You alright? You look a bit lost.', ru:'Всё нормально? Вы, кажется, потерялись.'},
          {who:'you', ru:'Признай это и спроси дорогу к метро.', best:1,
            options:['Yes lost. Metro where.','Yeah, a bit. How do I get to the tube station?','I am lost person help.']},
          {who:'them', text:'Straight ahead, then left at the lights. Five minutes.', ru:'Прямо, потом налево на светофоре. Пять минут.'},
          {who:'you', ru:'Переспроси: налево на светофоре?', best:0,
            options:['Left at the lights, yeah?','Light left yes what?','Repeat again slow please now.']},
          {who:'them', text:'That’s it. Can’t miss it.', ru:'Именно. Не пропустите.'},
          {who:'you', ru:'Поблагодари по-человечески.', best:2,
            options:['Okay.','Thank you very much for the help I appreciate it a lot sir.','Brilliant, thanks a lot.']}
        ]},
      { type:'words', title:'Продукты и цены', scene:'market', words:[
        {t:'Bread / Milk / Eggs', r:'Хлеб / Молоко / Яйца'},
        {t:'A bag, please',       r:'Пакет, пожалуйста'},
        {t:'Half a kilo',         r:'Полкило'},
        {t:'Is this fresh?',      r:'Это свежее?'},
        {t:'Too expensive',       r:'Слишком дорого'},
        {t:'Do you have…?',       r:'У вас есть…?'},
        {t:'That’s all',          r:'Это всё'},
        {t:'Receipt',             r:'Чек'}
      ]},
      { type:'build', title:'На рынке', scene:'market', tasks:[
        {ru:'У вас есть свежий хлеб?', parts:['Do','you','have','any','fresh','bread?'], answer:'Do you have any fresh bread?'},
        {ru:'Полкило, пожалуйста.', parts:['Half','a','kilo,','please.'], answer:'Half a kilo, please.'},
        {ru:'Это всё, спасибо.', parts:['That’s','all,','thanks.'], answer:'That’s all, thanks.'}
      ]},
      { type:'dialog', title:'Прилавок', scene:'market',
        intro:'Продавец быстро складывает овощи и мельком смотрит на тебя.',
        turns:[
          {who:'them', text:'Morning! What are you after?', ru:'Доброе утро! Что вам нужно?'},
          {who:'you', ru:'Спроси, есть ли помидоры.', best:0,
            options:['Morning. Do you have any tomatoes?','Tomato you give me.','I after tomato please yes.']},
          {who:'them', text:'Fresh in this morning. How many?', ru:'Свежие, с утра. Сколько?'},
          {who:'you', ru:'Попроси полкило.', best:2,
            options:['Many six.','Kilo half of it me.','Half a kilo, please.']},
          {who:'them', text:'Two pounds. Anything else?', ru:'Два фунта. Что-нибудь ещё?'},
          {who:'you', ru:'Скажи, что это всё, и попроси чек.', best:1,
            options:['No more. Paper give.','That’s all. Could I have a receipt?','All finish thank you bye.']}
        ]}
    ],
    3:[
      { type:'words', title:'Аренда и жильё', scene:'flat', words:[
        {t:'Lease / Contract',   r:'Договор аренды'},
        {t:'Deposit',            r:'Залог'},
        {t:'Bills included',     r:'Коммунальные включены'},
        {t:'Landlord',           r:'Арендодатель'},
        {t:'Viewing',            r:'Просмотр квартиры'},
        {t:'Notice period',      r:'Срок предупреждения о выезде'},
        {t:'Damp / Mould',       r:'Сырость / Плесень'},
        {t:'Is it negotiable?',  r:'Цена обсуждается?'}
      ]},
      { type:'build', title:'Вопросы к договору', scene:'flat', tasks:[
        {ru:'Коммунальные включены в стоимость?', parts:['Are','the','bills','included','in','the','rent?'], answer:'Are the bills included in the rent?'},
        {ru:'Сколько составляет залог?', parts:['How','much','is','the','deposit?'], answer:'How much is the deposit?'},
        {ru:'Могу я взглянуть на договор до подписания?', parts:['Could','I','see','the','contract','before','I','sign?'], answer:'Could I see the contract before I sign?'}
      ]},
      { type:'dialog', title:'Просмотр квартиры', scene:'flat',
        intro:'Пустая квартира, пахнет краской. Агент открывает шторы и ждёт вопросов.',
        turns:[
          {who:'them', text:'So, this is the flat. Any questions?', ru:'Итак, вот квартира. Есть вопросы?'},
          {who:'you', ru:'Спроси про коммунальные.', best:1,
            options:['Money all how?','Yes — are the bills included in the rent?','Bills inside price or no inside?']},
          {who:'them', text:'Water is, electricity isn’t. Council tax is on you.', ru:'Вода — да, электричество — нет. Налог платите вы.'},
          {who:'you', ru:'Уточни размер залога.', best:0,
            options:['Right. And how much is the deposit?','Deposit number say me.','Money before I give how much be?']},
          {who:'them', text:'Five weeks’ rent, returned at the end.', ru:'Пять недель аренды, возвращается в конце.'},
          {who:'you', ru:'Попроси прислать договор на почту.', best:2,
            options:['Send paper email now fast.','Contract I want see it must.','Could you email me the contract to look over?']}
        ]},
      { type:'words', title:'Банк и документы', scene:'bank', words:[
        {t:'Open an account',   r:'Открыть счёт'},
        {t:'Proof of address',  r:'Подтверждение адреса'},
        {t:'Sort code',         r:'Код отделения банка'},
        {t:'Transfer',          r:'Перевод'},
        {t:'Fee',               r:'Комиссия'},
        {t:'Statement',         r:'Выписка'},
        {t:'It was declined',   r:'Платёж отклонён'},
        {t:'Appointment',       r:'Приём / запись'}
      ]},
      { type:'build', title:'В отделении', scene:'bank', tasks:[
        {ru:'Я хотел бы открыть счёт.', parts:['I’d','like','to','open','an','account.'], answer:'I’d like to open an account.'},
        {ru:'Какие документы вам нужны?', parts:['What','documents','do','you','need?'], answer:'What documents do you need?'},
        {ru:'Есть ли комиссия за перевод?', parts:['Is','there','a','fee','for','the','transfer?'], answer:'Is there a fee for the transfer?'}
      ]},
      { type:'dialog', title:'Открыть счёт', scene:'bank',
        intro:'Тебя приглашают за стол. На экране у сотрудника — форма.',
        turns:[
          {who:'them', text:'How can I help you today?', ru:'Чем могу помочь?'},
          {who:'you', ru:'Скажи, зачем пришёл.', best:0,
            options:['I’d like to open a current account.','Account open me want today.','Bank account give please.']},
          {who:'them', text:'Of course. Do you have proof of address?', ru:'Конечно. Есть подтверждение адреса?'},
          {who:'you', ru:'Спроси, подойдёт ли договор аренды.', best:2,
            options:['Paper address no have me.','Address proof what is that thing?','I have a tenancy agreement — would that work?']},
          {who:'them', text:'That’s fine. It takes about ten minutes.', ru:'Подойдёт. Займёт минут десять.'},
          {who:'you', ru:'Уточни, когда придёт карта.', best:1,
            options:['Card when fast?','Great. When would the card arrive?','I wait card here now?']}
        ]}
    ],
    4:[
      { type:'words', title:'Работа и найм', scene:'office', words:[
        {t:'Notice period',       r:'Срок отработки'},
        {t:'To be responsible for',r:'Отвечать за'},
        {t:'Track record',        r:'Опыт с результатами'},
        {t:'Take ownership',      r:'Брать ответственность на себя'},
        {t:'Trade-off',           r:'Компромисс, выбор из двух'},
        {t:'Deadline slipped',    r:'Срок сдвинулся'},
        {t:'Salary expectations', r:'Ожидания по зарплате'},
        {t:'Probation',           r:'Испытательный срок'}
      ]},
      { type:'build', title:'Формулируй позицию', scene:'office', tasks:[
        {ru:'Я отвечал за команду из шести человек.', parts:['I','was','responsible','for','a','team','of','six.'], answer:'I was responsible for a team of six.'},
        {ru:'Мы сдвинули срок, но сохранили качество.', parts:['We','pushed','the','deadline','but','kept','the','quality.'], answer:'We pushed the deadline but kept the quality.'},
        {ru:'Я бы хотел уточнить ожидания по роли.', parts:['I’d','like','to','clarify','the','expectations','for','the','role.'], answer:'I’d like to clarify the expectations for the role.'}
      ]},
      { type:'dialog', title:'Собеседование', scene:'office',
        intro:'Двое напротив. Ноутбук закрыт — значит, слушают, а не читают резюме.',
        turns:[
          {who:'them', text:'Tell us about a project that didn’t go to plan.', ru:'Расскажите о проекте, который пошёл не по плану.'},
          {who:'you', ru:'Назови проблему спокойно, без оправданий.', best:1,
            options:['All projects fine for me always.','We missed a deadline by two weeks — I’ll explain why and what we changed.','It was not my fault, the team was bad.']},
          {who:'them', text:'And what would you do differently now?', ru:'Что бы вы сделали иначе сейчас?'},
          {who:'you', ru:'Дай конкретный вывод.', best:0,
            options:['I’d cut the scope earlier instead of adding people.','I don’t know, maybe work harder.','Nothing, it was fine in the end.']},
          {who:'them', text:'What are your salary expectations?', ru:'Какие у вас ожидания по зарплате?'},
          {who:'you', ru:'Ответь вилкой и оставь пространство.', best:2,
            options:['Whatever you give me is okay.','Maximum money you have please.','I’m looking in the range we discussed, but I’m open depending on the scope.']}
        ]},
      { type:'words', title:'У врача', scene:'clinic', words:[
        {t:'Symptoms',        r:'Симптомы'},
        {t:'It hurts here',   r:'Болит здесь'},
        {t:'For three days',  r:'Уже три дня'},
        {t:'Prescription',    r:'Рецепт'},
        {t:'Side effects',    r:'Побочные эффекты'},
        {t:'Referral',        r:'Направление к специалисту'},
        {t:'Allergic to',     r:'Аллергия на'},
        {t:'Sick note',       r:'Больничный'}
      ]},
      { type:'build', title:'Объясни, что болит', scene:'clinic', tasks:[
        {ru:'Болит уже три дня, особенно по утрам.', parts:['It’s','been','hurting','for','three','days,','mostly','in','the','mornings.'], answer:'It’s been hurting for three days, mostly in the mornings.'},
        {ru:'У меня аллергия на пенициллин.', parts:['I’m','allergic','to','penicillin.'], answer:'I’m allergic to penicillin.'},
        {ru:'Есть ли у этого побочные эффекты?', parts:['Does','this','have','any','side','effects?'], answer:'Does this have any side effects?'}
      ]},
      { type:'dialog', title:'Приём', scene:'clinic',
        intro:'Кабинет, врач разворачивает стул к тебе и откладывает экран.',
        turns:[
          {who:'them', text:'What brings you in today?', ru:'С чем вы пришли?'},
          {who:'you', ru:'Опиши симптом и срок.', best:0,
            options:['I’ve had a sharp pain in my lower back for three days.','Pain back much bad long time.','I am sick you fix me.']},
          {who:'them', text:'Any numbness in your legs?', ru:'Есть онемение в ногах?'},
          {who:'you', ru:'Ответь точно, не преувеличивая.', best:2,
            options:['Everything is numb, I think.','Maybe yes maybe no I not sure sorry.','No numbness, just stiffness in the morning.']},
          {who:'them', text:'I’ll prescribe something mild and see you in a week.', ru:'Выпишу мягкое средство и жду вас через неделю.'},
          {who:'you', ru:'Спроси про больничный.', best:1,
            options:['Paper for work give me now.','Could I also get a sick note for work?','I need document yes for boss man.']}
        ]}
    ],
    5:[
      { type:'words', title:'Оттенки и тон', scene:'cafe', words:[
        {t:'To be fair…',        r:'Справедливости ради…'},
        {t:'I take your point, but…', r:'Понимаю вашу мысль, но…'},
        {t:'It’s a bit of a stretch', r:'Это натяжка'},
        {t:'Off the top of my head', r:'Навскидку'},
        {t:'Let’s park that',    r:'Отложим это'},
        {t:'A grey area',        r:'Спорная зона'},
        {t:'Reading between the lines', r:'Читая между строк'},
        {t:'That aged well',     r:'ирон.: и как оно теперь выглядит'}
      ]},
      { type:'build', title:'Смягчай и уточняй', scene:'office', tasks:[
        {ru:'Я понимаю вашу мысль, но данные говорят об обратном.', parts:['I','take','your','point,','but','the','data','says','otherwise.'], answer:'I take your point, but the data says otherwise.'},
        {ru:'Навскидку я бы сказал, что около трети.', parts:['Off','the','top','of','my','head,','I’d','say','about','a','third.'], answer:'Off the top of my head, I’d say about a third.'},
        {ru:'Давайте отложим это и вернёмся в пятницу.', parts:['Let’s','park','that','and','come','back','to','it','on','Friday.'], answer:'Let’s park that and come back to it on Friday.'}
      ]},
      { type:'dialog', title:'Несогласие без ссоры', scene:'office',
        intro:'Совещание затянулось. Коллега настаивает на своём — тебе есть что возразить.',
        turns:[
          {who:'them', text:'Honestly, I think we should just ship it and fix it later.', ru:'Честно, давайте выкатим, а починим потом.'},
          {who:'you', ru:'Возрази мягко, но по существу.', best:1,
            options:['No. Bad idea. We do my way.','I see the appeal, but last time “later” cost us a month.','Whatever you think is best, I guess.']},
          {who:'them', text:'That was a different situation though.', ru:'Тогда была другая ситуация.'},
          {who:'you', ru:'Признай часть правоты и удержи позицию.', best:0,
            options:['Fair — it was. Still, the same dependency is in play here.','You are wrong again like before always.','Okay okay you win, ship it.']},
          {who:'them', text:'So what do you suggest?', ru:'И что ты предлагаешь?'},
          {who:'you', ru:'Предложи конкретный компромисс.', best:2,
            options:['Something better than this.','I suggest we think more about it deeply somehow.','Ship the core on Friday, hold the billing part for one sprint.']}
        ]}
    ]
  }
};

/* Для языков, где контента ещё нет, берём английский каркас,
   чтобы приложение не ломалось. Заполняется отдельно, не UI-задача. */
function getCourse(langCode, stage){
  const c = (COURSE[langCode] && COURSE[langCode][stage]) || COURSE.en[stage] || [];
  return c;
}
function levelKind(type){
  return {words:'Слова', build:'Предложения', dialog:'Диалог'}[type] || 'Практика';
}

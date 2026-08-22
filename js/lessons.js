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
        {t:'Hello', r:'Здравствуйте'},
        {t:'Good morning', r:'Доброе утро'},
        {t:'Excuse me', r:'Простите / извините'},
        {t:'Thank you', r:'Спасибо'},
        {t:'Sorry', r:'Извините (сожалею)'},
        {t:'Yes / No', r:'Да / Нет'},
        {t:'Please', r:'Пожалуйста (просьба)'},
        {t:'My name is…', r:'Меня зовут…'},
        {t:'I don’t understand', r:'Я не понимаю'},
        {t:'Goodbye', r:'До свидания'}
      ]},
      { type:'build', title:'Собери: Первый контакт', scene:'airport', tasks:[
        {ru:'Извините, вы говорите по-английски?', parts:['Excuse','me,','do','you','speak','English?'], answer:'Excuse me, do you speak English?'},
        {ru:'Меня зовут Анна.', parts:['My','name','is','Anna.'], answer:'My name is Anna.'},
        {ru:'Я не понимаю, извините.', parts:['I','don’t','understand,','sorry.'], answer:'I don’t understand, sorry.'},
        {ru:'Доброе утро! Как дела?', parts:['Good','morning!','How','are','you?'], answer:'Good morning! How are you?'}
      ]},
      { type:'dialog', title:'Паспортный контроль', scene:'airport',
        intro:'Очередь почти прошла. Офицер смотрит на тебя и берёт паспорт.',
        turns:[
          {who:'them', text:'Good morning. Passport, please.', ru:'Доброе утро. Паспорт, пожалуйста.'},
          {who:'you', ru:'Поздоровайся и отдай паспорт.', best:1,
            options:['Passport no.','Good morning. Here you are.','I am passport.']},
          {who:'them', text:'What is the purpose of your visit?', ru:'Какая цель вашего визита?'},
          {who:'you', ru:'Скажи, что ты турист.', best:0,
            options:['I’m here as a tourist, for two weeks.','Tourist yes two.','I visit purpose holiday me.']},
          {who:'them', text:'Enjoy your stay.', ru:'Хорошего пребывания.'},
          {who:'you', ru:'Поблагодари.', best:2,
            options:['Okay bye.','Yes, stay.','Thank you. Have a good day.']}
        ]},
      { type:'words', title:'Числа и деньги', scene:'cafe', words:[
        {t:'one, two, three', r:'один, два, три'},
        {t:'four, five, six', r:'четыре, пять, шесть'},
        {t:'seven, eight, nine, ten', r:'семь, восемь, девять, десять'},
        {t:'How much is it?', r:'Сколько это стоит?'},
        {t:'Card / Cash', r:'Карта / Наличные'},
        {t:'The bill, please', r:'Счёт, пожалуйста'},
        {t:'It’s too expensive', r:'Это слишком дорого'},
        {t:'Cheap', r:'Дёшево'},
        {t:'Change', r:'Сдача'},
        {t:'Receipt', r:'Чек'}
      ]},
      { type:'build', title:'Собери: Числа и деньги', scene:'cafe', tasks:[
        {ru:'Сколько это стоит?', parts:['How','much','is','it?'], answer:'How much is it?'},
        {ru:'Я заплачу картой.', parts:['I’ll','pay','by','card.'], answer:'I’ll pay by card.'},
        {ru:'Счёт, пожалуйста.', parts:['The','bill,','please.'], answer:'The bill, please.'},
        {ru:'Это слишком дорого для меня.', parts:['It’s','too','expensive','for','me.'], answer:'It’s too expensive for me.'}
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
        ]},
      { type:'words', title:'Город и дорога', scene:'street', words:[
        {t:'Where is…?', r:'Где находится…?'},
        {t:'Left / Right', r:'Налево / Направо'},
        {t:'Straight ahead', r:'Прямо'},
        {t:'Near / Far', r:'Близко / Далеко'},
        {t:'Station', r:'Вокзал / станция'},
        {t:'Bus stop', r:'Автобусная остановка'},
        {t:'Ticket', r:'Билет'},
        {t:'Map', r:'Карта'},
        {t:'How do I get to…?', r:'Как мне добраться до…?'},
        {t:'Is it far?', r:'Это далеко?'}
      ]},
      { type:'build', title:'Собери: Город и дорога', scene:'street', tasks:[
        {ru:'Где находится вокзал?', parts:['Where','is','the','station?'], answer:'Where is the station?'},
        {ru:'Как мне добраться до центра?', parts:['How','do','I','get','to','the','centre?'], answer:'How do I get to the centre?'},
        {ru:'Идите прямо, потом налево.', parts:['Go','straight','ahead,','then','left.'], answer:'Go straight ahead, then left.'},
        {ru:'Один билет, пожалуйста.', parts:['One','ticket,','please.'], answer:'One ticket, please.'}
      ]},
      { type:'dialog', title:'Спросить дорогу', scene:'street',
        intro:'Ты вышел из метро и не понимаешь, куда идти. Рядом стоит женщина с собакой.',
        turns:[
          {who:'them', text:'You look lost. Can I help?', ru:'Вы, кажется, заблудились. Помочь?'},
          {who:'you', ru:'Спроси, где вокзал.', best:1,
            options:['Station where me?','Yes, please. Where is the station?','I no know station go.']},
          {who:'them', text:'It’s five minutes that way. Straight ahead, then right.', ru:'Пять минут в ту сторону. Прямо, потом направо.'},
          {who:'you', ru:'Уточни, далеко ли идти пешком.', best:0,
            options:['Is it far on foot?','Foot far is?','Walking many?']},
          {who:'them', text:'No, it’s quite close. You’ll see it.', ru:'Нет, довольно близко. Вы увидите.'},
          {who:'you', ru:'Поблагодари её.', best:2,
            options:['Ok good.','Thanks bye now.','Thank you very much. Have a nice day.']}
        ]},
      { type:'words', title:'В магазине', scene:'market', words:[
        {t:'I’m looking for…', r:'Я ищу…'},
        {t:'Do you have…?', r:'У вас есть…?'},
        {t:'Size', r:'Размер'},
        {t:'Colour', r:'Цвет'},
        {t:'Can I try it on?', r:'Можно примерить?'},
        {t:'Too big / Too small', r:'Слишком большой / маленький'},
        {t:'I’ll take it', r:'Я возьму это'},
        {t:'Just looking', r:'Просто смотрю'},
        {t:'Open / Closed', r:'Открыто / Закрыто'},
        {t:'Bag', r:'Пакет / сумка'}
      ]},
      { type:'build', title:'Собери: В магазине', scene:'market', tasks:[
        {ru:'У вас есть это в другом размере?', parts:['Do','you','have','this','in','another','size?'], answer:'Do you have this in another size?'},
        {ru:'Можно примерить?', parts:['Can','I','try','it','on?'], answer:'Can I try it on?'},
        {ru:'Я возьму это, спасибо.', parts:['I’ll','take','it,','thank','you.'], answer:'I’ll take it, thank you.'},
        {ru:'Спасибо, я просто смотрю.', parts:['Thanks,','I’m','just','looking.'], answer:'Thanks, I’m just looking.'}
      ]},
      { type:'dialog', title:'Купить футболку', scene:'market',
        intro:'Небольшой магазин. Продавец подходит к тебе.',
        turns:[
          {who:'them', text:'Hello! Are you looking for anything special?', ru:'Здравствуйте! Ищете что-то конкретное?'},
          {who:'you', ru:'Скажи, что ищешь футболку.', best:0,
            options:['I’m looking for a T-shirt.','T-shirt want me.','Shirt where is have?']},
          {who:'them', text:'Of course. What size are you?', ru:'Конечно. Какой у вас размер?'},
          {who:'you', ru:'Скажи «средний» и спроси про примерку.', best:2,
            options:['Medium try.','Size medium can on try me?','Medium, please. Can I try it on?']},
          {who:'them', text:'Sure, the fitting room is over there.', ru:'Конечно, примерочная вон там.'},
          {who:'you', ru:'Поблагодари.', best:1,
            options:['Ok good yes.','Great, thank you.','Thank you very good room.']}
        ]},
      { type:'words', title:'Дом и комната', scene:'flat', words:[
        {t:'House / Flat', r:'Дом / Квартира'},
        {t:'Room', r:'Комната'},
        {t:'Kitchen', r:'Кухня'},
        {t:'Bathroom', r:'Ванная'},
        {t:'Bed', r:'Кровать'},
        {t:'Door / Window', r:'Дверь / Окно'},
        {t:'Key', r:'Ключ'},
        {t:'It doesn’t work', r:'Это не работает'},
        {t:'Hot water', r:'Горячая вода'},
        {t:'Wi-Fi password', r:'Пароль от Wi-Fi'}
      ]},
      { type:'build', title:'Собери: Дом и комната', scene:'flat', tasks:[
        {ru:'Какой пароль от Wi-Fi?', parts:['What’s','the','Wi-Fi','password?'], answer:'What’s the Wi-Fi password?'},
        {ru:'Горячей воды нет.', parts:['There','is','no','hot','water.'], answer:'There is no hot water.'},
        {ru:'Ключ не работает.', parts:['The','key','doesn’t','work.'], answer:'The key doesn’t work.'},
        {ru:'Ванная вон там.', parts:['The','bathroom','is','over','there.'], answer:'The bathroom is over there.'}
      ]},
      { type:'dialog', title:'Заселение', scene:'flat',
        intro:'Ты приехал в квартиру. Хозяин показывает комнаты.',
        turns:[
          {who:'them', text:'Welcome! This is the kitchen, and your room is here.', ru:'Добро пожаловать! Это кухня, а ваша комната здесь.'},
          {who:'you', ru:'Спроси про пароль от Wi-Fi.', best:1,
            options:['Wi-Fi number what?','Thank you. What’s the Wi-Fi password?','Internet me give now.']},
          {who:'them', text:'It’s on the fridge. Anything else?', ru:'Он на холодильнике. Что-нибудь ещё?'},
          {who:'you', ru:'Скажи, что нет горячей воды.', best:0,
            options:['Sorry, there is no hot water.','Water hot no have.','No water hot is bad.']},
          {who:'them', text:'Oh, sorry! I’ll fix it today.', ru:'Ой, извините! Починю сегодня.'},
          {who:'you', ru:'Скажи, что это не срочно.', best:2,
            options:['Ok fix fast.','Today yes good fix.','No problem, it’s not urgent.']}
        ]},
      { type:'words', title:'Время и дни', scene:'office', words:[
        {t:'What time is it?', r:'Сколько времени?'},
        {t:'Today / Tomorrow', r:'Сегодня / Завтра'},
        {t:'Yesterday', r:'Вчера'},
        {t:'Monday, Tuesday', r:'Понедельник, вторник'},
        {t:'Morning / Evening', r:'Утро / Вечер'},
        {t:'Now / Later', r:'Сейчас / Позже'},
        {t:'Early / Late', r:'Рано / Поздно'},
        {t:'At nine o’clock', r:'В девять часов'},
        {t:'Half an hour', r:'Полчаса'},
        {t:'See you tomorrow', r:'До завтра'}
      ]},
      { type:'build', title:'Собери: Время и дни', scene:'office', tasks:[
        {ru:'Сколько сейчас времени?', parts:['What','time','is','it','now?'], answer:'What time is it now?'},
        {ru:'Встреча в девять часов.', parts:['The','meeting','is','at','nine','o’clock.'], answer:'The meeting is at nine o’clock.'},
        {ru:'Я буду там завтра утром.', parts:['I’ll','be','there','tomorrow','morning.'], answer:'I’ll be there tomorrow morning.'},
        {ru:'Извините, я опоздал.', parts:['Sorry,','I’m','late.'], answer:'Sorry, I’m late.'}
      ]},
      { type:'dialog', title:'Договориться о встрече', scene:'office',
        intro:'Коллега ловит тебя в коридоре.',
        turns:[
          {who:'them', text:'Do you have a minute tomorrow?', ru:'Найдётся минутка завтра?'},
          {who:'you', ru:'Спроси, во сколько.', best:2,
            options:['Time what tomorrow?','Tomorrow when is meet me?','Sure. What time?']},
          {who:'them', text:'How about nine in the morning?', ru:'Как насчёт девяти утра?'},
          {who:'you', ru:'Скажи, что девять — рано, предложи десять.', best:0,
            options:['Nine is a bit early for me. Can we say ten?','Nine no. Ten yes ok.','Early nine bad, ten good me.']},
          {who:'them', text:'Ten works. See you then.', ru:'Десять подходит. Тогда до встречи.'},
          {who:'you', ru:'Попрощайся.', best:1,
            options:['Ok bye go.','Great, see you tomorrow.','Tomorrow see yes bye.']}
        ]},
      { type:'words', title:'Еда и вкусы', scene:'cafe', words:[
        {t:'Breakfast', r:'Завтрак'},
        {t:'Lunch / Dinner', r:'Обед / Ужин'},
        {t:'Bread', r:'Хлеб'},
        {t:'Meat / Fish', r:'Мясо / Рыба'},
        {t:'Vegetables', r:'Овощи'},
        {t:'I’m hungry', r:'Я голоден'},
        {t:'Delicious', r:'Очень вкусно'},
        {t:'I’m allergic to…', r:'У меня аллергия на…'},
        {t:'Without sugar', r:'Без сахара'},
        {t:'A table for two', r:'Столик на двоих'}
      ]},
      { type:'build', title:'Собери: Еда и вкусы', scene:'cafe', tasks:[
        {ru:'Столик на двоих, пожалуйста.', parts:['A','table','for','two,','please.'], answer:'A table for two, please.'},
        {ru:'У меня аллергия на орехи.', parts:['I’m','allergic','to','nuts.'], answer:'I’m allergic to nuts.'},
        {ru:'Чай без сахара, пожалуйста.', parts:['Tea','without','sugar,','please.'], answer:'Tea without sugar, please.'},
        {ru:'Это было очень вкусно.', parts:['That','was','delicious.'], answer:'That was delicious.'}
      ]},
      { type:'dialog', title:'Ужин в кафе', scene:'cafe',
        intro:'Вечер. Официант подходит с меню.',
        turns:[
          {who:'them', text:'Good evening. A table for how many?', ru:'Добрый вечер. Столик на скольких?'},
          {who:'you', ru:'Скажи: на двоих.', best:1,
            options:['Two people me.','A table for two, please.','Two is we sit.']},
          {who:'them', text:'Here you are. Are you ready to order?', ru:'Прошу. Готовы заказать?'},
          {who:'you', ru:'Предупреди про аллергию на орехи.', best:0,
            options:['Yes, but I’m allergic to nuts.','Nuts no me bad.','Allergy have nuts no give.']},
          {who:'them', text:'Thank you for telling me. I’ll check with the kitchen.', ru:'Спасибо, что сказали. Уточню на кухне.'},
          {who:'you', ru:'Поблагодари.', best:2,
            options:['Ok fine good.','Kitchen yes thanks you.','Thanks, I appreciate it.']}
        ]},
      { type:'words', title:'Семья и люди', scene:'flat', words:[
        {t:'Mother / Father', r:'Мама / Папа'},
        {t:'Brother / Sister', r:'Брат / Сестра'},
        {t:'Wife / Husband', r:'Жена / Муж'},
        {t:'Son / Daughter', r:'Сын / Дочь'},
        {t:'Friend', r:'Друг'},
        {t:'Where are you from?', r:'Откуда вы?'},
        {t:'I’m from Russia', r:'Я из России'},
        {t:'How old are you?', r:'Сколько тебе лет?'},
        {t:'I live in…', r:'Я живу в…'},
        {t:'Nice to meet you', r:'Приятно познакомиться'}
      ]},
      { type:'build', title:'Собери: Семья и люди', scene:'flat', tasks:[
        {ru:'Приятно познакомиться.', parts:['Nice','to','meet','you.'], answer:'Nice to meet you.'},
        {ru:'Я из России, живу в Москве.', parts:['I’m','from','Russia,','I','live','in','Moscow.'], answer:'I’m from Russia, I live in Moscow.'},
        {ru:'У меня есть брат и сестра.', parts:['I','have','a','brother','and','a','sister.'], answer:'I have a brother and a sister.'},
        {ru:'Откуда вы?', parts:['Where','are','you','from?'], answer:'Where are you from?'}
      ]},
      { type:'dialog', title:'Знакомство у соседей', scene:'flat',
        intro:'Сосед по площадке заговорил с тобой у лифта.',
        turns:[
          {who:'them', text:'Hi! Are you new here?', ru:'Привет! Вы тут новенький?'},
          {who:'you', ru:'Поздоровайся и представься.', best:2,
            options:['New yes me here.','Hello me name is.','Hi! Yes, I just moved in. My name is Anna.']},
          {who:'them', text:'Nice to meet you, Anna. Where are you from?', ru:'Приятно познакомиться, Анна. Откуда вы?'},
          {who:'you', ru:'Скажи, что из России.', best:0,
            options:['I’m from Russia.','Russia me come.','From Russia is me yes.']},
          {who:'them', text:'Great. Let me know if you need anything.', ru:'Отлично. Обращайтесь, если что-то понадобится.'},
          {who:'you', ru:'Поблагодари.', best:1,
            options:['Ok need yes.','Thank you, that’s very kind.','Kind you thanks need me.']}
        ]},
      { type:'words', title:'Самочувствие', scene:'clinic', words:[
        {t:'I feel bad', r:'Мне плохо'},
        {t:'Headache', r:'Головная боль'},
        {t:'It hurts here', r:'Здесь болит'},
        {t:'Doctor', r:'Врач'},
        {t:'Pharmacy', r:'Аптека'},
        {t:'Medicine', r:'Лекарство'},
        {t:'Help!', r:'Помогите!'},
        {t:'I need a doctor', r:'Мне нужен врач'},
        {t:'Temperature', r:'Температура'},
        {t:'I’m fine now', r:'Сейчас мне лучше'}
      ]},
      { type:'build', title:'Собери: Самочувствие', scene:'clinic', tasks:[
        {ru:'Мне нужен врач, пожалуйста.', parts:['I','need','a','doctor,','please.'], answer:'I need a doctor, please.'},
        {ru:'У меня болит голова со вчера.', parts:['I’ve','had','a','headache','since','yesterday.'], answer:'I’ve had a headache since yesterday.'},
        {ru:'Где ближайшая аптека?', parts:['Where','is','the','nearest','pharmacy?'], answer:'Where is the nearest pharmacy?'},
        {ru:'Здесь болит.', parts:['It','hurts','here.'], answer:'It hurts here.'}
      ]},
      { type:'dialog', title:'На приёме', scene:'clinic',
        intro:'Кабинет врача. Он приглашает тебя сесть.',
        turns:[
          {who:'them', text:'Hello, take a seat. What’s the problem?', ru:'Здравствуйте, садитесь. Что случилось?'},
          {who:'you', ru:'Скажи, что болит голова.', best:1,
            options:['Head bad me have.','I have a headache.','Pain head is me.']},
          {who:'them', text:'Since when?', ru:'С какого времени?'},
          {who:'you', ru:'Скажи: со вчера.', best:0,
            options:['Since yesterday.','Yesterday from now.','Day before have.']},
          {who:'them', text:'Alright. Take this and rest today.', ru:'Хорошо. Возьмите это и отдохните сегодня.'},
          {who:'you', ru:'Поблагодари врача.', best:2,
            options:['Ok rest go.','Medicine take yes.','Thank you, doctor.']}
        ]},
      { type:'words', title:'Простой разговор', scene:'street', words:[
        {t:'How are you?', r:'Как дела?'},
        {t:'I’m fine, thanks', r:'Хорошо, спасибо'},
        {t:'Nice weather', r:'Хорошая погода'},
        {t:'It’s cold / hot', r:'Холодно / жарко'},
        {t:'Really?', r:'Правда?'},
        {t:'I think so', r:'Я так думаю'},
        {t:'Maybe', r:'Может быть'},
        {t:'Of course', r:'Конечно'},
        {t:'No problem', r:'Без проблем'},
        {t:'See you soon', r:'До скорого'}
      ]},
      { type:'build', title:'Собери: Простой разговор', scene:'street', tasks:[
        {ru:'Хорошо, спасибо. А вы?', parts:['I’m','fine,','thanks.','And','you?'], answer:'I’m fine, thanks. And you?'},
        {ru:'Сегодня очень холодно.', parts:['It’s','very','cold','today.'], answer:'It’s very cold today.'},
        {ru:'Конечно, без проблем.', parts:['Of','course,','no','problem.'], answer:'Of course, no problem.'},
        {ru:'Увидимся на следующей неделе.', parts:['See','you','next','week.'], answer:'See you next week.'}
      ]},
      { type:'dialog', title:'Разговор в очереди', scene:'street',
        intro:'Ты стоишь в очереди. Человек впереди оборачивается.',
        turns:[
          {who:'them', text:'Long queue today, isn’t it?', ru:'Длинная очередь сегодня, правда?'},
          {who:'you', ru:'Согласись.', best:0,
            options:['Yes, really long. And it’s cold.','Queue big yes cold have.','Long is, cold is, bad.']},
          {who:'them', text:'At least the weather is better than yesterday.', ru:'Зато погода лучше, чем вчера.'},
          {who:'you', ru:'Согласись и скажи, что вчера был дождь.', best:2,
            options:['Yesterday rain much bad.','Rain was yes better now.','True. It rained all day yesterday.']},
          {who:'them', text:'Anyway, good luck. Have a nice day.', ru:'Ладно, удачи. Хорошего дня.'},
          {who:'you', ru:'Пожелай того же.', best:1,
            options:['Ok you day.','Thanks, you too!','Same you have day nice.']}
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

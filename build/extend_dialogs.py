# -*- coding: utf-8 -*-
"""Диалоги: 3 твоих реплики -> 6. Добавляем вторую половину разговора.
Каждая тема получает продолжение под свою ситуацию."""
import sys
sys.path.insert(0,'build')

# ключ = название диалога; значение = ещё 3 пары (реплика собеседника, твой ход)
EXT = {
'Первое приветствие':[
 ('them','Are you here for the meeting?','Вы на встречу?'),
 ('you','Скажи «да» и спроси, где кабинет.',1,['Yes room where?','Yes, I am. Where is the room?','Meeting yes go where me?']),
 ('them','Second floor, on the left.','Второй этаж, налево.'),
 ('you','Повтори, чтобы проверить.',0,['Second floor, left. Thank you.','Two floor left yes ok.','Left floor two go me.']),
 ('them','That is right. Take the lift.','Верно. Лифт вон там.'),
 ('you','Поблагодари и попрощайся.',2,['Ok lift go now.','Lift yes take me bye.','Thanks a lot. Have a good day!'])],

'Заполнить анкету':[
 ('them','What is your phone number?','Ваш номер телефона?'),
 ('you','Скажи, что напишешь его сам.',0,['Can I write it here?','Number write me can?','Phone me write paper yes?']),
 ('them','Yes, please. And your email?','Да, пожалуйста. И почта?'),
 ('you','Скажи, что почта на бумаге.',2,['Email paper have write.','Mail is there look you.','It is on the paper too.']),
 ('them','Perfect. That is everything.','Отлично. Это всё.'),
 ('you','Спроси, когда будет готово.',1,['When ready is it?','When will it be ready?','Time ready what say me?'])],

'Разговор о семье':[
 ('them','Do they visit you here?','Они приезжают к тебе?'),
 ('you','Скажи, что приезжали летом.',1,['Summer come they here.','They came in the summer.','Come summer yes have they.']),
 ('them','That is nice. How long did they stay?','Здорово. Надолго?'),
 ('you','Скажи: две недели.',0,['Two weeks.','Week two stay have.','Time two week they.']),
 ('them','Not bad at all.','Совсем неплохо.'),
 ('you','Скажи, что скоро поедешь к ним.',2,['Me go them soon.','Go Russia me time next.','I will go and see them soon.'])],

'Назвать количество':[
 ('them','Anything else today?','Ещё что-нибудь?'),
 ('you','Попроси два хлеба.',2,['Bread two give.','Two bread want me.','Two loaves of bread, please.']),
 ('them','That is three more euros.','Ещё три евро.'),
 ('you','Скажи, что платишь наличными.',0,['I will pay in cash.','Money paper give you.','Cash me pay now yes.']),
 ('them','Here is your change.','Вот сдача.'),
 ('you','Проверь сдачу и поблагодари.',1,['Money look ok yes.','Thank you. That is right.','Change good have thanks.'])],
}

# Универсальные продолжения по типу сцены — для тем без своего варианта
GENERIC = {
'market':[
 ('them','Anything else?','Что-нибудь ещё?'),
 ('you','Скажи, что это всё.',1,['All finish me.','No, that is all, thank you.','Everything have me now.']),
 ('them','That is fine. Cash or card?','Хорошо. Наличные или карта?'),
 ('you','Скажи: картой.',0,['By card, please.','Card me pay yes.','Money card take you.']),
 ('them','Thank you. Have a good day.','Спасибо. Хорошего дня.'),
 ('you','Пожелай того же.',2,['You day good.','Ok bye go me.','Thanks, you too!'])],
'cafe':[
 ('them','Would you like anything else?','Хотите что-нибудь ещё?'),
 ('you','Скажи, что нет, спасибо.',2,['No more me.','Finish all yes.','No, thank you. That is all.']),
 ('them','I will bring it in a moment.','Сейчас принесу.'),
 ('you','Поблагодари.',0,['Thank you very much.','Ok bring fast.','Good wait me here.']),
 ('them','Here you are. Enjoy!','Пожалуйста. Приятного!'),
 ('you','Поблагодари и скажи, что выглядит вкусно.',1,['Look good yes food.','Thank you, it looks delicious.','Food nice have me eat.'])],
'street':[
 ('them','Do you need anything else?','Ещё что-то нужно?'),
 ('you','Спроси, есть ли рядом кафе.',1,['Cafe near have?','Is there a cafe near here?','Coffee place where is?']),
 ('them','Yes, just around the corner.','Да, прямо за углом.'),
 ('you','Уточни направление.',0,['Left or right?','Way what go me?','Which side is it?']),
 ('them','On your right, next to the shop.','Справа, рядом с магазином.'),
 ('you','Поблагодари.',2,['Ok right go now.','Shop right yes see.','Thank you, that is very helpful.'])],
'office':[
 ('them','Is there anything else?','Ещё что-нибудь?'),
 ('you','Спроси, когда будет ответ.',0,['When will I know?','Answer when have me?','Time answer what is?']),
 ('them','We will call you this week.','Позвоним на этой неделе.'),
 ('you','Скажи, что будешь ждать звонка.',2,['Ok wait phone me.','Call yes wait have.','Thank you, I will wait for your call.']),
 ('them','Thank you for coming.','Спасибо, что пришли.'),
 ('you','Попрощайся вежливо.',1,['Bye go me now.','Thank you. Have a good day.','Ok day good you.'])],
'flat':[
 ('them','Is everything else alright?','В остальном всё нормально?'),
 ('you','Скажи, что да, всё хорошо.',1,['All ok yes.','Yes, everything else is fine.','Good all have me.']),
 ('them','Good. Call me if you need anything.','Хорошо. Звоните, если что.'),
 ('you','Поблагодари.',0,['Thank you, I will.','Ok call you me.','Yes phone have me.']),
 ('them','Have a good evening.','Хорошего вечера.'),
 ('you','Пожелай того же.',2,['You also evening.','Ok bye night.','You too, good night!'])],
'clinic':[
 ('them','Do you have any questions?','Есть вопросы?'),
 ('you','Спроси, когда прийти снова.',2,['Come when again?','Next time when is?','When should I come again?']),
 ('them','In one week, if it does not get better.','Через неделю, если не станет лучше.'),
 ('you','Подтверди.',0,['One week. I understand.','Week one ok yes.','Understand me time week.']),
 ('them','Take care of yourself.','Берегите себя.'),
 ('you','Поблагодари врача.',1,['Ok me care.','Thank you, doctor. Goodbye.','Care yes bye go.'])],
'bank':[
 ('them','Do you have any other questions?','Ещё вопросы есть?'),
 ('you','Спроси, когда всё будет готово.',1,['Ready when is?','When will it be ready?','Time ready what say?']),
 ('them','In about five working days.','Примерно пять рабочих дней.'),
 ('you','Спроси, позвонят ли тебе.',0,['Will you call me?','Phone me you can?','Call have me yes no?']),
 ('them','Yes, we will send a message.','Да, отправим сообщение.'),
 ('you','Поблагодари.',2,['Ok message wait.','Good send yes me.','Thank you very much for your help.'])],
'airport':[
 ('them','Do you have any hand luggage?','Ручная кладь есть?'),
 ('you','Скажи: только маленькая сумка.',0,['Just a small bag.','Bag small one have.','One small bag me yes.']),
 ('them','That is fine. Here is your ticket.','Хорошо. Вот ваш билет.'),
 ('you','Спроси, где выход на посадку.',2,['Gate where is?','Where go me now?','Where is the gate, please?']),
 ('them','Straight ahead, then left.','Прямо, потом налево.'),
 ('you','Поблагодари.',1,['Ok go there.','Thank you very much.','Left yes see me go.'])],
}

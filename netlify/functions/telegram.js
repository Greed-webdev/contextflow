/** Relocue — дверь в Telegram. Касса не в вебку. Токен только из env Netlify. */
const TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL || 'https://greed-webdev.github.io/contextflow/';
const API = 'https://api.telegram.org/bot' + TOKEN;

const HOME_TEXT =
  'Relocue.\n\n' +
  'Разговоры после переезда: врач, банк, паспорт, жильё.\n' +
  'Открыл курс — пошёл в атлас, говоришь своими словами.';

const ACCESS_TEXT =
  'Мой доступ\n\n' +
  'Сейчас курс открыт, оплата ещё не стоит.\n' +
  'Когда будет касса — здесь тариф и срок, не отдельная кнопка «заплати».';

const INFO_TEXT =
  'Как это\n\n' +
  'Ситуации из жизни после переезда. Зашёл в урок — отвечаешь как человеку напротив, не выбираешь готовые фразы.';

const HELP_TEXT =
  'Поддержка\n\n' +
  'Напиши сюда, в этот чат. Это не автоответчик с десятью ветками.';

function kbHome() {
  return {
    inline_keyboard: [
      [{ text: 'Открыть курс', web_app: { url: APP_URL } }],
      [{ text: '🔒 Мой доступ', callback_data: 'access' }],
      [
        { text: 'Как это', callback_data: 'info' },
        { text: 'Поддержка', callback_data: 'help' },
      ],
    ],
  };
}

function kbBack() {
  return { inline_keyboard: [[{ text: '← Назад', callback_data: 'home' }]] };
}

async function tg(method, body) {
  const r = await fetch(API + '/' + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function paint(chatId, text, kb, messageId) {
  if (messageId) {
    const edited = await tg('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      reply_markup: kb,
    });
    if (edited && edited.ok) return;
  }
  await tg('sendMessage', { chat_id: chatId, text, reply_markup: kb });
}

function screenFor(data) {
  if (data === 'access') return { text: ACCESS_TEXT, kb: kbBack() };
  if (data === 'info') return { text: INFO_TEXT, kb: kbBack() };
  if (data === 'help') return { text: HELP_TEXT, kb: kbBack() };
  return { text: HOME_TEXT, kb: kbHome() };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') return { statusCode: 200, body: 'relocue' };
  if (event.httpMethod !== 'POST' || !TOKEN) return { statusCode: 200, body: 'ok' };

  let upd;
  try {
    upd = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 200, body: 'ok' };
  }

  const cq = upd.callback_query;
  if (cq) {
    await tg('answerCallbackQuery', { callback_query_id: cq.id });
    const chatId = cq.message && cq.message.chat && cq.message.chat.id;
    if (!chatId) return { statusCode: 200, body: 'ok' };
    const s = screenFor(cq.data);
    await paint(chatId, s.text, s.kb, cq.message.message_id);
    return { statusCode: 200, body: 'ok' };
  }

  const msg = upd.message;
  const chat = msg && msg.chat && msg.chat.id;
  if (!chat) return { statusCode: 200, body: 'ok' };

  const t = (msg.text || '').trim();
  const wantAccess = t === 'Мой доступ' || t === '🔒 Мой доступ';
  const s = wantAccess ? screenFor('access') : screenFor('home');
  await paint(chat, s.text, s.kb);
  return { statusCode: 200, body: 'ok' };
};

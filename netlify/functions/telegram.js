/** Relocue — дверь в Telegram. Кассы в вебку нет. Токен только из env Netlify. */
const TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL || 'https://greed-webdev.github.io/contextflow/';
const API = 'https://api.telegram.org/bot' + TOKEN;

const START_TEXT =
  'Relocue.\n\n' +
  'Разговоры после переезда: врач, банк, паспорт, жильё.\n' +
  'Своими словами — в уроке, не тремя кнопками.';

function kbStart() {
  return {
    inline_keyboard: [[{ text: 'Открыть курс', web_app: { url: APP_URL } }]],
  };
}

async function tg(method, body) {
  const r = await fetch(API + '/' + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') return { statusCode: 200, body: 'relocue' };
  if (event.httpMethod !== 'POST' || !TOKEN) return { statusCode: 200, body: 'ok' };

  let upd;
  try { upd = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 200, body: 'ok' }; }

  if (upd.callback_query) {
    await tg('answerCallbackQuery', { callback_query_id: upd.callback_query.id });
  }

  const msg = upd.message || (upd.callback_query && upd.callback_query.message);
  const chat = msg && msg.chat && msg.chat.id;
  if (!chat) return { statusCode: 200, body: 'ok' };

  await tg('sendMessage', {
    chat_id: chat,
    text: START_TEXT,
    reply_markup: kbStart(),
  });
  return { statusCode: 200, body: 'ok' };
};

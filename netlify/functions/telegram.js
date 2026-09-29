/** Relocue webhook. Курс в прод не открываем. Не bot.mjs. */
const TOKEN = process.env.BOT_TOKEN;
const API = TOKEN ? 'https://api.telegram.org/bot' + TOKEN : '';
const CHANNEL = 'https://t.me/Relocue';
const SUPPORT = 'https://t.me/L_webdev';
const COVER_FILE_ID = process.env.COVER_FILE_ID || 'AgACAgIAAxkDAAM6arvME9E-KEE1LipXRfuf3g0IO98AAlwiaxv65OFJJZW5g2Q_3LoBAAMCAAN4AAM9BA';
const TZ = 'Asia/Vladivostok';
const TRIAL_MS = 3 * 24 * 60 * 60 * 1000;

const INFO_TEXT =
  'информация о нашем сервисе:\n\n' +
  'как это работает? после оформления подписки нажми кнопку подключить и начинай учится с этого момента\n\n' +
  'если вам нужна помощь: @L_webdev';

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function startKb() {
  return {
    inline_keyboard: [
      [{ text: 'Мой доступ', callback_data: 'access', style: 'success' }],
      [{ text: 'Что это?', callback_data: 'info', style: 'primary' }],
      [
        { text: 'Канал', url: CHANNEL, style: 'primary' },
        { text: 'Тех поддержка', url: SUPPORT, style: 'primary' },
      ],
    ],
  };
}

function accessKb(active) {
  const rows = [];
  if (active) rows.push([{ text: 'Подключиться', callback_data: 'connect', style: 'success' }]);
  rows.push([{ text: 'Назад', callback_data: 'home' }]);
  return { inline_keyboard: rows };
}

function backKb() {
  return { inline_keyboard: [[{ text: 'Назад', callback_data: 'home', style: 'success' }]] };
}

async function tg(method, body) {
  if (!API) return { ok: false };
  try {
    const r = await fetch(API + '/' + method, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await r.json();
  } catch (_) {
    return { ok: false };
  }
}

function now() {
  return new Date();
}

function parseDt(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDay(d) {
  const local = new Date(d.toLocaleString('en-US', { timeZone: TZ }));
  return local.getDate() + ' ' + MONTHS[local.getMonth()];
}

function whoText(from, rec) {
  if (from && from.username) return '@' + from.username;
  if (from && from.id) return 'id ' + from.id;
  if (rec && rec.username) return '@' + rec.username;
  return '';
}

function activeUntil(rec) {
  const a = parseDt(rec && rec.trial_until);
  const b = parseDt(rec && rec.paid_until);
  if (a && b) return a > b ? a : b;
  return a || b || null;
}

function isActive(rec) {
  const u = activeUntil(rec);
  return !!(u && u > now());
}

const mem = new Map();

async function blobStore() {
  try {
    const { getStore } = require('@netlify/blobs');
    return getStore('relocue-subs');
  } catch (_) {
    return null;
  }
}

async function loadRec(id) {
  const key = String(id);
  const store = await blobStore();
  if (store) {
    try {
      const rec = await store.get(key, { type: 'json' });
      if (rec) return rec;
    } catch (_) {}
  }
  return mem.get(key) || null;
}

async function saveRec(id, rec) {
  const key = String(id);
  mem.set(key, rec);
  const store = await blobStore();
  if (store) {
    try {
      await store.setJSON(key, rec);
    } catch (_) {}
  }
}

async function ensureTrial(from) {
  const id = from && from.id;
  const username = (from && from.username) || null;
  if (!id) return { username, trial_until: null, paid_until: null };
  let rec = await loadRec(id);
  if (!rec) {
    rec = {
      username,
      trial_until: new Date(Date.now() + TRIAL_MS).toISOString(),
      paid_until: null,
    };
    await saveRec(id, rec);
    return rec;
  }
  if (username && rec.username !== username) {
    rec.username = username;
    await saveRec(id, rec);
  }
  return rec;
}

function accessText(from, rec) {
  const who = whoText(from, rec);
  if (isActive(rec)) return who + '\nстатус: активна\nсрок: ' + fmtDay(activeUntil(rec));
  return who + '\nстатус: не активна';
}

function isStart(text) {
  const t = (text || '').trim();
  return t === '/start' || t.startsWith('/start ') || t.startsWith('/start@');
}

async function editCaptionOrText(msg, text, markup) {
  const chat = msg.chat && msg.chat.id;
  const mid = msg.message_id;
  if (!chat) return;
  if (msg.photo) {
    return tg('editMessageCaption', {
      chat_id: chat,
      message_id: mid,
      caption: text,
      reply_markup: markup,
    });
  }
  return tg('editMessageText', {
    chat_id: chat,
    message_id: mid,
    text: text,
    reply_markup: markup,
  });
}

async function onStart(msg) {
  const from = msg.from || {};
  await ensureTrial(from);
  const chat = msg.chat.id;
  const markup = startKb();
  if (COVER_FILE_ID) {
    const j = await tg('sendPhoto', {
      chat_id: chat,
      photo: COVER_FILE_ID,
      caption: 'Relocue.',
      reply_markup: markup,
    });
    if (j && j.ok) return;
  }
  await tg('sendMessage', {
    chat_id: chat,
    text: 'Relocue.',
    reply_markup: markup,
  });
}

async function onCallback(cq) {
  await tg('answerCallbackQuery', { callback_query_id: cq.id });
  const msg = cq.message || {};
  const data = cq.data;
  const from = cq.from || {};
  if (data === 'access') {
    const rec = await ensureTrial(from);
    await editCaptionOrText(msg, accessText(from, rec), accessKb(isActive(rec)));
  } else if (data === 'info') {
    await editCaptionOrText(msg, INFO_TEXT, backKb());
  } else if (data === 'home') {
    await editCaptionOrText(msg, 'Relocue.', startKb());
  } else if (data === 'connect') {
    const rec = await ensureTrial(from);
    if (!isActive(rec)) return;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') return { statusCode: 200, body: 'relocue' };
  if (event.httpMethod !== 'POST' || !TOKEN) return { statusCode: 200, body: 'ok' };

  let upd;
  try {
    upd = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 200, body: 'ok' };
  }

  const msg = upd.message;
  const cq = upd.callback_query;
  if (msg && isStart(msg.text)) await onStart(msg);
  else if (cq) await onCallback(cq);

  return { statusCode: 200, body: 'ok' };
};

/** Relocue: HTTP-уведомления ЮMoney → paid_until. Секрет только в env. */
const crypto = require('crypto');

const TOKEN = process.env.BOT_TOKEN;
const API = TOKEN ? 'https://api.telegram.org/bot' + TOKEN : '';
const SECRET = process.env.YOOMONEY_SECRET || '';
const PRICE = 179;
const PAID_DAYS = Number(process.env.PAID_DAYS || '30');

function parseDt(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formParams(event) {
  let raw = event.body || '';
  if (event.isBase64Encoded) {
    try {
      raw = Buffer.from(raw, 'base64').toString('utf8');
    } catch (_) {
      raw = event.body || '';
    }
  }
  const out = {};
  const qs = new URLSearchParams(raw);
  for (const [k, v] of qs.entries()) out[k] = v;
  return out;
}

function rfc3986(v) {
  return encodeURIComponent(String(v)).replace(/[!'()*]/g, (c) => {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase();
  });
}

function verifySign(params, secret) {
  const received = String(params.sign || '').toLowerCase();
  if (!received || !secret) return false;
  const keys = Object.keys(params)
    .filter((k) => k !== 'sign')
    .sort();
  const str = keys.map((k) => k + '=' + rfc3986(params[k] == null ? '' : params[k])).join('&');
  const hex = crypto.createHmac('sha256', secret).update(str).digest('hex');
  try {
    const a = Buffer.from(hex, 'utf8');
    const b = Buffer.from(received, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (_) {
    return false;
  }
}

function truthy(v) {
  const s = String(v || '').toLowerCase();
  return s === 'true' || s === '1';
}

function paidMs() {
  const d = PAID_DAYS;
  if (!d || d <= 0 || !Number.isFinite(d)) return 0;
  return d * 24 * 60 * 60 * 1000;
}

async function blobStore() {
  try {
    const { getStore } = require('@netlify/blobs');
    return getStore('relocue-subs');
  } catch (_) {
    return null;
  }
}

async function loadRec(id) {
  const store = await blobStore();
  if (!store) return null;
  try {
    const rec = await store.get(String(id), { type: 'json' });
    return rec || null;
  } catch (_) {
    return null;
  }
}

async function saveRec(id, rec) {
  const store = await blobStore();
  if (!store) return false;
  try {
    await store.setJSON(String(id), rec);
    return true;
  } catch (_) {
    return false;
  }
}

async function tg(method, body) {
  if (!API) return;
  try {
    await fetch(API + '/' + method, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (_) {}
}

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') return { statusCode: 200, body: 'relocue-pay' };
  if (event.httpMethod !== 'POST') return { statusCode: 200, body: 'ok' };

  const p = formParams(event);
  if (!verifySign(p, SECRET)) return { statusCode: 200, body: 'ok' };
  if (truthy(p.test_notification)) return { statusCode: 200, body: 'ok' };
  if (truthy(p.codepro) || truthy(p.unaccepted)) return { statusCode: 200, body: 'ok' };

  const paid = Number(p.withdraw_amount || p.amount || 0);
  if (!(paid >= PRICE - 0.01)) return { statusCode: 200, body: 'ok' };

  const label = String(p.label || '').trim();
  if (!/^\d{5,15}$/.test(label)) return { statusCode: 200, body: 'ok' };

  const span = paidMs();
  if (!span) return { statusCode: 200, body: 'ok' };

  const op = String(p.operation_id || '');
  let rec = (await loadRec(label)) || {
    username: null,
    trial_until: null,
    paid_until: null,
    mark: null,
  };
  rec.ops = Array.isArray(rec.ops) ? rec.ops : [];
  if (op && rec.ops.indexOf(op) !== -1) return { statusCode: 200, body: 'ok' };

  const prev = parseDt(rec.paid_until);
  const from = Math.max(Date.now(), prev ? prev.getTime() : 0);
  rec.paid_until = new Date(from + span).toISOString();
  rec.mark = 'paid';
  if (op) {
    rec.ops.push(op);
    if (rec.ops.length > 40) rec.ops = rec.ops.slice(-40);
  }
  rec.last_pay = {
    at: new Date().toISOString(),
    amount: paid,
    op: op || null,
  };
  await saveRec(label, rec);

  await tg('sendMessage', {
    chat_id: Number(label),
    text: 'Relocue.\nстатус: активна',
  });

  return { statusCode: 200, body: 'ok' };
};

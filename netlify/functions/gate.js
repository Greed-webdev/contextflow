/** Relocue: пускает в курс только живой доступ. Не bot.mjs. */
const crypto = require('crypto');

const TOKEN = process.env.BOT_TOKEN || '';

function parseDt(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isActive(rec) {
  const a = parseDt(rec && rec.trial_until);
  const b = parseDt(rec && rec.paid_until);
  let u = null;
  if (a && b) u = a > b ? a : b;
  else u = a || b;
  return !!(u && u > new Date());
}

function checkInitData(initData) {
  if (!TOKEN || !initData || typeof initData !== 'string') return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => k + '=' + v)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  const hex = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  const a = Buffer.from(hex, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || Math.abs(Date.now() / 1000 - authDate) > 86400) return null;
  let user;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch {
    return null;
  }
  if (!user || !user.id) return null;
  return user;
}

async function loadRec(id) {
  try {
    const { getStore } = require('@netlify/blobs');
    const store = getStore('relocue-subs');
    const rec = await store.get(String(id), { type: 'json' });
    return rec || null;
  } catch (_) {
    return null;
  }
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: false }) };
  }
  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: false }) };
  }
  const user = checkInitData(body.initData);
  if (!user) return { statusCode: 200, headers, body: JSON.stringify({ ok: false }) };
  const rec = await loadRec(user.id);
  if (!isActive(rec)) return { statusCode: 200, headers, body: JSON.stringify({ ok: false }) };
  return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
};

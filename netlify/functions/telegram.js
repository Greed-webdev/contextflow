/** Relocue — дверь выключена: продукт пока без кассы, /start молчит. */
const TOKEN = process.env.BOT_TOKEN;

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') return { statusCode: 200, body: 'relocue' };
  if (event.httpMethod !== 'POST' || !TOKEN) return { statusCode: 200, body: 'ok' };
  return { statusCode: 200, body: 'ok' };
};

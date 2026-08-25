// Статический сервер для превью ContextFlow.
// Node вместо python: honest keep-alive, правильные Content-Type, никаких
// заголовков, мешающих показу внутри iframe панели предпросмотра.
const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = '/home/user';
const PORT = Number(process.argv[2] || 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js'  : 'application/javascript; charset=utf-8',
  '.css' : 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png' : 'image/png',
  '.jpg' : 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg' : 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.m4a' : 'audio/mp4',
  '.mp3' : 'audio/mpeg',
  '.wasm': 'application/wasm',
  '.zip' : 'application/zip',
};

const srv = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';

  const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, {
      'Content-Type'  : TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control' : 'no-store',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(file).pipe(res);
  });
});

srv.keepAliveTimeout = 65000;
srv.headersTimeout   = 70000;
srv.listen(PORT, '0.0.0.0', () => console.log(`ContextFlow на 0.0.0.0:${PORT}`));

/* NammaBus dev server: static files + BMTC API proxy (no dependencies).
   Run: node server.js   Then open http://localhost:8765/map.html */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const ROOT = __dirname;
const BMTC = 'https://bmtcmobileapi.karnataka.gov.in/WebAPI';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,lan,deviceType,Accept');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:' + PORT);

  // BMTC API proxy — same convention as Vercel: /api/bmtc?endpoint=<name>
  if (url.pathname === '/api/bmtc') {
    cors(res);
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const endpoint = url.searchParams.get('endpoint');
    if (!endpoint || !/^[A-Za-z0-9_]+$/.test(endpoint)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid endpoint' }));
    }
    let body = '';
    try { for await (const chunk of req) body += chunk; }
    catch (e) { return; } // client aborted request (ECONNRESET) — ignore
    try {
      const upstream = await fetch(BMTC + '/' + endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'lan': req.headers['lan'] || 'en',
          'deviceType': 'WEB',
          'Accept': 'text/plain'
        },
        body: body || '{}'
      });
      const text = await upstream.text();
      res.writeHead(upstream.status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(text);
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(e) }));
    }
    return;
  }

  // Static files
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

// Ignore aborted client connections instead of crashing the whole server
server.on('clientError', function (err, socket) {
  if (err.code === 'ECONNRESET' || !socket.writable) return;
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
process.on('uncaughtException', function (e) {
  if (e.code !== 'ECONNRESET') console.error('Server error:', e);
});
process.on('unhandledRejection', function (e) {
  if (e && e.code !== 'ECONNRESET') console.error('Server rejection:', e);
});

server.listen(PORT, () => console.log('NammaBus server on http://localhost:' + PORT));

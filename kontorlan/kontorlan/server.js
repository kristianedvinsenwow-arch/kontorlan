// KontorLAN server: serves the game and relays multiplayer traffic over WebSockets.
// Start with `node server.js` (or start.bat / start.command). Port: PORT env var, default 8080.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT) || 8080;
const PUB = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css', '.ico': 'image/x-icon' };

const server = http.createServer((req, res) => {
  let p = '/';
  try { p = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUB, p));
  if (!file.startsWith(PUB + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': p.startsWith('/tex/') || p.endsWith('.js') ? 'public, max-age=86400' : 'no-cache',
    });
    res.end(data);
  });
});

// rooms: name -> Map(peerId -> { ws, p: presence })
const rooms = new Map();
let counter = 0;
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });

function broadcast(room, msg, skipId) {
  const s = JSON.stringify(msg);
  for (const [id, v] of room) if (id !== skipId && v.ws.readyState === 1) v.ws.send(s);
}

wss.on('connection', (ws) => {
  const id = 'p' + (++counter).toString(36) + Math.random().toString(36).slice(2, 7);
  ws.joined = new Set();
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });
  ws.send(JSON.stringify({ t: 'hello', id }));

  // simple token bucket: about 60 messages a second, bursts up to 90
  let budget = 90, last = Date.now();
  ws.on('message', (raw) => {
    const now = Date.now();
    budget = Math.min(90, budget + (now - last) * 0.06); last = now;
    if (budget < 1) return;
    budget -= 1;
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.r !== 'string' || m.r.length > 48) return;

    if (m.t === 'join') {
      let room = rooms.get(m.r);
      if (!room) { room = new Map(); rooms.set(m.r, room); }
      if (!room.has(id)) room.set(id, { ws, p: {} });
      ws.joined.add(m.r);
      ws.send(JSON.stringify({ t: 'snap', r: m.r, peers: [...room].map(([k, v]) => ({ id: k, p: v.p })) }));
      return;
    }
    const room = rooms.get(m.r);
    if (!room || !room.has(id)) return;
    if (m.t === 'leave') { leave(m.r); return; }
    if (m.t === 'pres') {
      if (!m.p || typeof m.p !== 'object' || JSON.stringify(m.p).length > 4096) return;
      room.get(id).p = m.p;
      broadcast(room, { t: 'pres', r: m.r, id, p: m.p }, id);
      return;
    }
    if (m.t === 'ev') {
      if (typeof m.topic !== 'string' || m.topic.length > 48) return;
      broadcast(room, { t: 'ev', r: m.r, id, topic: m.topic, data: m.data });
    }
  });

  function leave(name) {
    const room = rooms.get(name);
    ws.joined.delete(name);
    if (!room) return;
    room.delete(id);
    broadcast(room, { t: 'left', r: name, id });
    if (!room.size) rooms.delete(name);
  }
  ws.on('close', () => { for (const name of [...ws.joined]) leave(name); });
});

// drop connections that stop answering
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false;
    try { ws.ping(); } catch (e) { /* ignore */ }
  }
}, 10000);

server.listen(PORT, () => {
  console.log('\n  KontorLAN kjører!  /  KontorLAN is running!\n');
  console.log('  På denne maskinen:   http://localhost:' + PORT);
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family === 'IPv4' && !a.internal) console.log('  For kollegaer:       http://' + a.address + ':' + PORT);
    }
  }
  console.log('\n  Lukk dette vinduet for å stoppe serveren.\n');
});

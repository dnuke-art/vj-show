#!/usr/bin/env node
// vj-show LAN server: static files + PeerServer (signaling) + save route, one process.
//
//   npm start            # http://0.0.0.0:8000, PeerServer at /peerjs
//   node server.js 9000
//
// Displays and controllers served from here use the PeerServer at this origin
// ("peerserver": "local"). The public copy on GitHub Pages uses 0.peerjs.com instead.
'use strict';
const express = require('express');
const { ExpressPeerServer } = require('peer');
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = +process.argv[2] || +process.env.PORT || 8000;
const app = express();

app.use((req, res, next) => {
  if (req.path.startsWith('/node_modules')) return res.sendStatus(404);
  res.set('Cache-Control', 'no-store');
  next();
});

// capability probe: the control page enables "save" only if this answers
app.get('/scenes', (req, res) => res.json({ save: true, relay: true }));

// control panel "save": write scenes.json atomically; displays hot-reload it
app.post('/scenes', express.json({ limit: '1mb' }), (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || !Array.isArray(body.scenes)) return res.status(400).send('expected {scenes: [...]}');
  const tmp = path.join(ROOT, 'scenes.json.tmp');
  fs.writeFileSync(tmp, JSON.stringify(body, null, 2) + '\n');
  fs.renameSync(tmp, path.join(ROOT, 'scenes.json'));
  res.json({ ok: true });
});

// Control relay. A control page that can't open WebRTC to the leader (a phone browser that
// hides its LAN address, a Mac whose default route is Wi-Fi) talks to it through here over a
// WebSocket at /relay?room=&id=[&role=leader]. Messages are opaque: a client sends
// {to, msg} with to = "leader" or a client id, and receives {from, msg}, {from, gone} when
// the other side's socket closes, or {missing: to} when nobody is there. The leader applies
// the same hello and key checks it does for WebRTC. Displays still sync peer-to-peer.
const relayRooms = new Map();   // room -> { leader: ws | null, clients: Map<id, ws> }
const relayWss = new WebSocketServer({ noServer: true });
relayWss.on('connection', (ws, req) => {
  const q = new URL(req.url, 'http://x').searchParams;
  const room = q.get('room') || '', id = q.get('id') || '', isLeader = q.get('role') === 'leader';
  if (!room || !id) return ws.close(1008, 'room and id required');
  if (!relayRooms.has(room)) relayRooms.set(room, { leader: null, clients: new Map() });
  const R = relayRooms.get(room), send = (to, obj) => { if (to && to.readyState === 1) to.send(JSON.stringify(obj)); };
  if (isLeader) R.leader = ws; else R.clients.set(id, ws);
  console.log(new Date().toISOString(), 'relay +', id, isLeader ? '(leader)' : '');
  ws.alive = true; ws.on('pong', () => { ws.alive = true; });
  ws.on('message', data => {
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    const target = m.to === 'leader' ? R.leader : R.clients.get(m.to);
    if (target) send(target, { from: id, msg: m.msg });
    else send(ws, { missing: m.to });
  });
  ws.on('close', () => {
    if (isLeader) {
      if (R.leader === ws) { R.leader = null; for (const c of R.clients.values()) send(c, { from: 'leader', gone: true }); }
    } else if (R.clients.get(id) === ws) {
      R.clients.delete(id); send(R.leader, { from: id, gone: true });
    }
    console.log(new Date().toISOString(), 'relay -', id);
  });
});
// drop sockets that stopped answering pings (a phone that went to sleep mid-show)
setInterval(() => relayWss.clients.forEach(ws => { if (!ws.alive) return ws.terminate(); ws.alive = false; ws.ping(); }), 15000);

app.use(express.static(ROOT, { etag: false, index: 'index.html' }));

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`vj-show: serving ${ROOT} on http://0.0.0.0:${PORT}  (PeerServer at /peerjs)`);
});
// One upgrade handler for both WebSocket servers: a ws server attached with `server:` rejects
// every path but its own, so PeerJS's would refuse /relay. Both run with noServer instead.
let peerWss = null, peerWsPath = null;
const peerServer = ExpressPeerServer(server, { path: '/', alive_timeout: 60000, expire_timeout: 5000,
  createWebSocketServer: options => { peerWsPath = options.path; return (peerWss = new WebSocketServer({ noServer: true })); } });
server.on('upgrade', (req, socket, head) => {
  const path = req.url.split('?')[0];
  const wss = path === '/relay' ? relayWss : peerWss && path === peerWsPath ? peerWss : null;
  if (!wss) return socket.destroy();
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
});
peerServer.on('connection', c => console.log(new Date().toISOString(), 'peer +', c.getId()));
peerServer.on('disconnect', c => console.log(new Date().toISOString(), 'peer -', c.getId()));
app.use('/peerjs', peerServer);

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
// hides its LAN address, a Mac whose default route is Wi-Fi) talks to it through here:
// server-sent events down, POST up. Messages are opaque; the leader applies the same hello
// and key checks it does for WebRTC. Displays still sync peer-to-peer.
const relayRooms = new Map();   // room -> { leader: { id, res } | null, clients: Map<id, res> }
function relayRoom(name){ if (!relayRooms.has(name)) relayRooms.set(name, { leader: null, clients: new Map() }); return relayRooms.get(name); }
function sse(res, obj){ res.write(`data: ${JSON.stringify(obj)}\n\n`); }
app.get('/relay/:room/listen', (req, res) => {
  const R = relayRoom(req.params.room), id = String(req.query.id || ''), isLeader = req.query.role === 'leader';
  if (!id) return res.sendStatus(400);
  res.set({ 'Content-Type': 'text/event-stream', Connection: 'keep-alive' });
  res.flushHeaders(); res.write(': ok\n\n');
  const keepAlive = setInterval(() => res.write(': ka\n\n'), 15000);
  if (isLeader) R.leader = { id, res }; else R.clients.set(id, res);
  console.log(new Date().toISOString(), 'relay +', id, isLeader ? '(leader)' : '');
  req.on('close', () => {
    clearInterval(keepAlive);
    if (isLeader) {
      if (R.leader && R.leader.res === res) { R.leader = null; for (const c of R.clients.values()) sse(c, { from: 'leader', gone: true }); }
    } else if (R.clients.get(id) === res) {
      R.clients.delete(id);
      if (R.leader) sse(R.leader.res, { from: id, gone: true });
    }
    console.log(new Date().toISOString(), 'relay -', id);
  });
});
app.post('/relay/:room/send', express.json({ limit: '256kb' }), (req, res) => {
  const R = relayRoom(req.params.room), { from, to, msg } = req.body || {};
  const target = to === 'leader' ? R.leader && R.leader.res : R.clients.get(to);
  if (!target || !from) return res.sendStatus(404);
  sse(target, { from, msg });
  res.sendStatus(204);
});

app.use(express.static(ROOT, { etag: false, index: 'index.html' }));

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`vj-show: serving ${ROOT} on http://0.0.0.0:${PORT}  (PeerServer at /peerjs)`);
});
const peerServer = ExpressPeerServer(server, { path: '/', alive_timeout: 60000, expire_timeout: 5000 });
peerServer.on('connection', c => console.log(new Date().toISOString(), 'peer +', c.getId()));
peerServer.on('disconnect', c => console.log(new Date().toISOString(), 'peer -', c.getId()));
app.use('/peerjs', peerServer);

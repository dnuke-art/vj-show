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
app.get('/scenes', (req, res) => res.json({ save: true }));

// control panel "save": write scenes.json atomically; displays hot-reload it
app.post('/scenes', express.json({ limit: '1mb' }), (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || !Array.isArray(body.scenes)) return res.status(400).send('expected {scenes: [...]}');
  const tmp = path.join(ROOT, 'scenes.json.tmp');
  fs.writeFileSync(tmp, JSON.stringify(body, null, 2) + '\n');
  fs.renameSync(tmp, path.join(ROOT, 'scenes.json'));
  res.json({ ok: true });
});

app.use(express.static(ROOT, { etag: false, index: 'index.html' }));

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`vj-show: serving ${ROOT} on http://0.0.0.0:${PORT}  (PeerServer at /peerjs)`);
});
app.use('/peerjs', ExpressPeerServer(server, { path: '/', alive_timeout: 60000, expire_timeout: 5000 }));

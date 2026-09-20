#!/bin/sh
# Serve the player, the PeerServer and the save route on http://<this host>:8000
cd "$(dirname "$0")" && [ -d node_modules ] || npm install --silent
exec node server.js "${1:-8000}"

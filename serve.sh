#!/bin/sh
# Serve the player on http://localhost:8000 (fetch() needs http, not file://)
cd "$(dirname "$0")" && exec python3 -m http.server "${1:-8000}" --bind "${BIND:-0.0.0.0}"

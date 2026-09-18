#!/bin/sh
# Serve the player + signaling on http://localhost:8000 (fetch() needs http, not file://)
cd "$(dirname "$0")" && exec python3 serve.py "${1:-8000}"

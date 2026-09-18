#!/bin/sh
# Launch the player fullscreen in Chromium kiosk mode. Assumes serve.sh is running.
URL="${1:-http://localhost:8000/}"
for b in chromium chromium-browser google-chrome google-chrome-stable; do
  command -v "$b" >/dev/null 2>&1 && BROWSER="$b" && break
done
[ -z "$BROWSER" ] && { echo "no chromium/chrome found" >&2; exit 1; }
exec "$BROWSER" --kiosk --noerrdialogs --disable-session-crashed-bubble --disable-infobars \
  --autoplay-policy=no-user-gesture-required --disable-features=TranslateUI \
  --ignore-gpu-blocklist --enable-gpu-rasterization "$URL"

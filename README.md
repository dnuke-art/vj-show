# vj-show

Lightweight unattended gallery player. WebGL2, no build step, no dependencies
beyond Python 3 for the server.

    ./serve.sh          # http://localhost:8000  (static files + WebRTC signaling)
    ./kiosk.sh          # fullscreen Chromium on the display machine

Keys: `s` stats overlay, `n` skip to next scene, `f` toggle fullscreen.
URL `?stats=1` shows the overlay from boot (useful in kiosk mode).

Edit `scenes.json` or any `scenes/*.glsl` while it runs; the player picks up
changes within `reloadInterval` seconds without restarting. Two entries can
point at the same shader with different params, which is how variations accrete.

## Scene shaders

Scene shaders get `u_time`, `u_resolution`, `u_seed` and any `params` keys from
their `scenes.json` entry as `uniform float` (or vec2/3/4 for arrays), and write
to `fragColor`. Use `vuv()` for a centred, aspect-correct coordinate; it is
computed on the full virtual canvas so tiled instances line up. `renderScale`
renders at a fraction of the display size and upscales, for old GPUs.

## Multi-display sync

Two or more instances can show tiles of one animation, frame-synced over WebRTC.
Point every display at the same server and give each its own id and tile:

    http://server:8000/?sync=show&id=left&grid=2,1&tile=0,0
    http://server:8000/?sync=show&id=right&grid=2,1&tile=1,0

- `sync` room name; `id` unique per instance; `grid` columns,rows; `tile`
  column,row with row 0 at the top. Tiles are assumed equal size.
- The lowest id is leader. It owns the schedule and the show clock. Followers
  ping it NTP-style over the data channel, keep the lowest-RTT sample, and slew
  their clock onto it. Every scene is a pure function of show time, so synced
  clocks plus a shared schedule give synced frames without moving any pixels.
- The HTTP server is only used for signaling (peers poll it every 500 ms). Once
  the data channel is up the show survives the server going away.
- On a LAN no STUN server is needed. If peers never connect (some networks
  block mDNS host candidates), add `"sync": {"stun": ["stun:stun.l.google.com:19302"]}`
  to `scenes.json`.
- Sync is bounded by the displays' own vsync phase, so expect the two halves to
  be within one frame of each other, not genlocked.

See BRIEF.md for scope.

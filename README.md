# vj-show

Lightweight unattended gallery player. WebGL2, no build step, no dependencies.

    ./serve.sh          # http://localhost:8000
    ./kiosk.sh          # fullscreen Chromium on the display machine

Keys: `s` stats overlay, `n` skip to next scene, `f` toggle fullscreen.

Edit `scenes.json` or any `scenes/*.glsl` while it runs; the player picks up
changes within `reloadInterval` seconds without restarting. Two entries can
point at the same shader with different params, which is how variations accrete.

Scene shaders get `u_time`, `u_resolution`, `u_seed` and any `params` keys from
their `scenes.json` entry as `uniform float` (or vec2/3/4 for arrays), and write
to `fragColor`. `renderScale` renders at a fraction of the display size and
upscales, for old GPUs.

See BRIEF.md for scope.

# vj-show

A lightweight player for running generative visuals unattended in a gallery, on whatever
hardware is already there. WebGL2 in a browser kiosk, no build step, no dependencies beyond
Python 3 for the little server. Two or more displays can show tiles of one animation,
frame-synced over WebRTC. Scenes are GLSL fragment shaders or small JS modules, and the
whole show is a JSON file you can edit while it runs.

## Why

I run a gallery show built in TiXL. It was hard to hand off. Nobody else could host the
show when I was away, because keeping it running meant keeping TiXL running on my Mac
laptop, which was the only machine with enough GPU to render the patch and push it out
over NDI to the displays. Falling back to pre-rendered video was the obvious fix and the
wrong one: the point of the work is that it is live.

Looking at TouchDesigner, TiXL, vvvv gamma and friends, a few things stood out:

- **The editor costs more than the output.** A lot of the GPU goes into rendering the node
  graph UI, not the visuals. In a gallery nobody is editing, so that cost is pure waste.
- **Full editability all the time is the wrong default for a show.** What I actually need
  in a gallery is guided modification: drop in occasionally, make a variation of what is
  playing, and have it join the rotation alongside everything that was already there.
- **Installing software on venue hardware is the bottleneck.** If the player runs in a
  browser, any laptop or mini PC with Chromium becomes a display node in a minute.
- **NDI needs a beefy sender.** Streaming pixels means one machine renders everything.
  If every display renders its own tile from a shared clock, no pixels move at all and an
  old laptop per display is enough.
- **Inputs go away.** Audio, OSC and MIDI are great in a performance and absent at 2pm on
  a Tuesday. The show has to have a graceful answer when a patch's inputs are missing.

So this is a player, not a TouchDesigner replacement. Authoring still happens elsewhere
(TiXL, a text editor, whatever). The player's job is to run all day, on weak hardware,
without me, and to accept new material without a restart.

## Design in one paragraph

Every scene is a pure function of show time and its parameters. That single constraint
buys almost everything else: two instances that agree on the clock and the schedule
render identical frames without exchanging pixels, so multi-display sync is a clock
problem instead of a video problem; a variation is just the same scene with different
parameters, so the library accretes instead of forking; and there is no state to corrupt
over a twelve-hour run.

## How it works

### The player (`index.html`)

- Loads `scenes.json`, compiles each scene, and autopilots through the list. Each scene
  plays for its `duration`, then crossfades to the next over `crossfade` seconds.
- Renders the current scene and, during a fade, the next one into two offscreen targets
  at `renderScale` × display resolution, then composites with a smoothstep mix and
  upscales. Half resolution is the baseline for old GPUs.
- Polls `scenes.json` and every scene source every `reloadInterval` seconds. If anything
  changed it recompiles just that scene and keeps playing. The scene on screen survives
  the reload if it still exists.
- Watchdog: reloads the page on WebGL context loss or an uncaught error, with backoff if
  it starts reload-looping.
- Stats overlay (`s` key or `?stats=1`): fps, resolution, scene, uptime, JS heap, sync
  state. The same line goes to the console once a minute for a long soak test.

### Scenes

Two kinds, mixed freely in the same list.

**Fragment shader scenes** (`"shader": "scenes/foo.glsl"`) are a `main()` writing to
`fragColor`. They get `u_time`, `u_resolution`, `u_seed`, and every key in the entry's
`params` as a uniform (`float`, or `vec2/3/4` for arrays). `vuv()` returns a centred,
aspect-correct coordinate on the full virtual canvas so tiled instances line up.

**Module scenes** (`"module": "scenes/foo.js"`) are ES modules for anything that needs
a real pipeline: meshes, depth, post-processing.

    export default function create(gl, api) { return { draw(ctx), dispose() } }

`draw` gets `{ target, time, params, seed, fullW, fullH, tileX, tileY }` and leaves its
result in `target.fbo`. `api` provides `compileProgram`, `makeTarget`, `freeTarget`,
`drawQuad`, `VERT` (fullscreen-triangle vertex shader) and `tileProjection`, which builds
the sub-frustum for this tile so 3D scenes span displays correctly.

**Variations.** Two entries can point at the same shader or module with different
`params`. That is the whole accretion model: a new tweak is a new entry, and nothing old
changes.

### The heart (`scenes/heart.js`)

The TiXL `HeartScatter` graph from `tixl-heart-project`, ported operator by operator.
The heart OBJ is embedded. SplitMeshVertices, SelectVertices (a noise volume whose centre
orbits on OscillateVec3) and ScatterMeshFaces (Shrink) run in one vertex shader: each
vertex carries its face's three source positions, so the per-face selection average and
the centroid shrink are computed exactly as TiXL's compute shader does. Camera, material,
point light, fog and glow follow the graph's values, every one overridable in `params`
(see the `P('name', default)` calls). SSAO is not ported and the environment cubemap is
approximated. `heart-scatter` uses the graph's own top-down camera; `heart-front` is the
same scene from the front.

### Multi-display sync

    http://server:8000/?sync=show&id=left&grid=2,1&tile=0,0
    http://server:8000/?sync=show&id=right&grid=2,1&tile=1,0

- Instances in the same `sync` room find each other through the server's signaling
  mailbox (`serve.py`, polled every 500 ms) and open a WebRTC data channel. Once the
  channel is up the server is no longer needed.
- The lowest `id` is leader. It owns the schedule (which scene, when the fade started)
  and the show clock, and broadcasts state once a second and on every transition.
- Followers ping the leader NTP-style, keep the lowest-RTT sample of the last sixteen,
  and slew their clock onto it (about 30 ms/s, with a hard jump for errors over 250 ms).
  If the leader disappears the survivors re-elect.
- `grid` is columns,rows and `tile` is this instance's column,row (row 0 at the top).
  Tiles are assumed equal size. Sync is bounded by each display's own vsync phase, so
  expect tiles within one frame of each other, not genlocked.
- No STUN is needed on a LAN. If peers never connect, add
  `"sync": {"stun": ["stun:stun.l.google.com:19302"]}` to `scenes.json`.

### Control mode

    http://server:8000/?sync=show&id=phone&mode=control

Open that on a phone or laptop in the same room and you get a slider for every numeric
param of the scene that is playing, plus a small live preview. Moving a slider sends the
value to the leader, which folds it into the state it already broadcasts, so every tile
and any late joiner converges on the same value within a frame or two.

- A control peer never becomes leader and never counts as a tile, whatever its id.
- The panel follows whichever scene is playing unless you tick *lock scene* or pick one
  from the dropdown. *next scene* skips. *reset overrides* drops the live tweaks for that
  scene and goes back to what `scenes.json` says.
- Tweaks live in the leader's memory until you press *save to scenes.json*, which merges
  them into the file through the server. Displays hot-reload it, so the tweak is now part
  of the show and survives restarts. That is the accretion loop: tweak, watch, save.
- Slider ranges default to 0 to twice the value in `scenes.json` (symmetric for
  negatives). Add `"controls": { "speed": { "min": 0, "max": 2, "step": 0.01 } }` to a
  scene entry to set them explicitly. Array params get one slider per component.
- Saved overrides stay in the leader's memory after a save. If you later hand-edit the
  same key in `scenes.json`, press *reset overrides* or restart the leader so the file
  value shows through.

## Running

    ./serve.sh          # http://localhost:8000 (static files + signaling)
    ./kiosk.sh          # fullscreen Chromium on the display machine

Keys: `s` stats, `n` skip to next scene (forwarded to the leader when synced), `f`
fullscreen. Edit `scenes.json` or anything in `scenes/` while it runs.

## Status and what's next

Working: autopilot, crossfade, hot reload, watchdog, tiled multi-display sync, shader and
module scenes, the heart port. Tested on a desktop GPU; the real test is an afternoon on
the old laptop at the projector's resolution (see `BRIEF.md`).

Not yet:

- **Snapshot mode.** Render a scene to a loop when its inputs (audio, OSC, MIDI) are
  missing, so input-dependent patches have a fallback instead of a dead frame.
- **Input fallbacks** in the scene contract: a scene declares what it listens to and what
  it does when that is absent.
- **SSAO** and a proper environment for the heart, once it can be compared side by side
  with the TiXL render.

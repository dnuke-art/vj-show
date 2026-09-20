# vj-show roadmap

Ideas, in rough order. Nothing here is committed to; the point is to have thought them
through once so they don't get rebuilt from scratch later. See `README.md` for what
exists and `BRIEF.md` for the original scope.

## Principles that constrain everything below

- **A scene is a pure function of show time.** This is what makes multi-display sync a
  clock problem and lets tiles agree without exchanging pixels. Anything that keeps
  per-frame state (feedback, trails, particles integrated per frame) breaks it and has to
  be marked single-display.
- **Control input is a synced value, never a local action.** Sliders, T-bar, cues: the
  leader owns it and broadcasts it; tiles evaluate it. The control page is just another
  peer with a screen.
- **The show runs unattended first.** Every live feature must degrade to the autopilot
  when the operator walks away.
- **Nothing in pixels.** Canvas aspect, tile rects, and fit modes stay resolution-free.

## 1. Program / preview switcher with a T-bar

**Model:** broadcast switcher, not A/B deck mixer. The audience only sees *program*;
*preview* is where the next thing is set up; the T-bar (or a cut, or a timed auto-take)
moves preview into program. This is what the player already does with `cur`, `nxt` and a
timed crossfade; autopilot is "auto-take after `duration`".

Why not A/B decks: two permanently live decks means every tile renders two scenes every
frame all day, and the bar can be left half way, which is an odd resting state for an
unattended show. OBS studio mode and every hardware switcher use program/preview for the
same reasons.

**Control page:** two monitors, PGM and PVW, side by side. PVW is today's preview (the
dropdown / lock scene). Add: **T-bar** (a vertical slider), **cut**, **auto** (timed take
with the show's crossfade). Today's *play now* becomes *auto*.

**Sync of the manual bar:** a bare slider value arriving on tiles at slightly different
times shows at the seam mid-fade. Send `(position, showTime)` samples at ~30 Hz; tiles
render the bar's motion interpolated with a fixed delay (~60 ms), so every tile evaluates
the same curve at the same show time. Same idea as netcode entity interpolation. When the
bar reaches the end, commit exactly as the timer does today. If the operator abandons the
bar mid-way, the leader finishes the take on a timer after a few seconds.

**State machine stays as is:** `{cur, nxt, fadeStart, mode: 'auto'|'manual', barSamples}`.

## 2. Transitions as composite shaders

The composite pass is one small shader with a `mixAmt`. Transitions are just other
composite shaders: cross-dissolve (today), cut, dip to black / colour, additive, luma
wipe, directional wipe, and any Shadertoy-style transition (the GL Transitions library is
MIT and maps one to one). `scenes.json` gets an optional `"in": {"type": "wipe",
"angle": 45}` per scene; the switcher gets a transition picker. Tiles need the same
transition params, which they get from the leader's state like everything else.

## 3. Program bus effects

A post chain on the program bus: colour grade, blur, pixelate, glow, kaleidoscope, edge.
All stateless, so tiles agree. Modelled as a list in `scenes.json` (`"fx": [...]`) with
params that the control page exposes like scene params. **Feedback / trails / persistence**
are stateful and per tile: allowed, but flagged `singleDisplay: true` and hidden on tiled
shows. This is the thing that was painful in GEM; here it is one more pass on a target
that already exists.

## 4. Inputs attach to the controller, not the displays

Audio (WebAudio, mic or line in), MIDI (WebMIDI), and later OSC arrive at whichever peer
has the hardware, usually the control laptop, get reduced to a small set of named values
(`audio.level`, `audio.bass`, `midi.cc1`) and are broadcast as params, exactly like
sliders. Displays never need the input device, and an old kiosk laptop needs no audio
interface. OSC needs a UDP listener; the stdlib server can gain one and forward into the
signaling channel, or a tiny sidecar bridge.

**Input contract:** a scene declares what it listens to (`"inputs": ["audio.level"]`) and a
fallback expression or value for when it is absent. The autopilot uses the fallback, so a
patch never shows a dead frame at 2 pm on a Tuesday.

## 5. Snapshot mode

For scenes that only look right with a live input, or that are too heavy for the venue
GPU: render the scene to a loop (MediaRecorder on the control machine, or offline) and
play the loop as a scene when the input is missing or the frame rate drops. A `video`
scene type is a few lines. The interesting part is the policy: when to fall back, and
keeping the loop's phase on show time so tiles agree (a loop is a pure function of time
too, `t mod length`).

## 6. Variations as a button

"Duplicate this scene with the current overrides as a new entry" on the control page.
That is the accretion loop with one fewer step: tweak, watch, keep as a variation, and the
original stays untouched in the rotation.

## 7. Cue list

Order, durations, transition per scene, and enable/disable, editable on the control page
and saved to `scenes.json`. Eventually time-of-day rules (calmer set after 6 pm) and a
"gallery day" schedule so the show can open and close itself.

## 7b. Serverless sync for the static copy — done

PeerJS is the only signaling path: the public PeerServer for the GitHub Pages copy, a
local PeerServer in `server.js` for installations. Rooms are well-known peer ids, the
first display to claim one leads, star topology, shared key, heartbeat failover in about
six seconds. Design: [docs/RFC-0001-serverless-sync.md](docs/RFC-0001-serverless-sync.md).
Test: `npm test`.

## 7c. Tile map overlay and identify

**What's missing on the wire:** a display's geometry. The hello and the leader's `peers`
list carry role, tag, browser and key, not where the display sits on the canvas. Add
`tile` (the rect asked for), `region` (the rect actually shown, which differs under
`cover`), `fit` and the window's pixel size to the hello, forward them in `state.peers`,
and re-send on resize or fit change.

**Tile map:** an SVG layer over the PGM monitor on the control page, one rectangle per
display in a colour keyed to its tag: solid for the shown region, dashed for the nominal
tile where they differ, tag in the corner, pixel size and fit in small type. Overlaps
hatched, uncovered canvas tinted, so gaps and double coverage are obvious. Toggle in
the panel. Not a GL pass, so it can't touch the show.

**Identify:** one broadcast from the control page makes every display flash its tag,
tile rect and fit for a few seconds, large, so you can tell which physical screen is
which tile from inside the room. The two features answer setup in both directions.

**Later:** with every display's rect known, dragging a rectangle on the PGM monitor
sends that display a new tile. URL parameters become the initial value, not the only
way, and unequal tiles and edge-blend overlaps get set from a phone.

## 7d. The show travels over the wire

Today every display fetches `scenes.json` and the scene sources from wherever its page
came from, so on a static host the edit loop is a git push and a deploy. Make the
leader the source of the show instead: it loads `scenes.json` and the sources and
pushes them to followers over the data channel, the same way it pushes the schedule.
Followers compile from the received text; module scenes load from a blob URL. Keep the
rule that a scene that fails to compile leaves the old one running, and have the leader
compile before it broadcasts so one bad shader can't black out a wall.

What falls out:

- **Where the show comes from is pluggable:** server files on the LAN, a git repo or gist
  the leader polls, a file or folder dropped on the control page.
- **Adding a scene is dropping a `.glsl` or `.js` on the control page,** in either
  deployment. Smallest first step: on the LAN, the control page posts the dropped file
  to `server.js` and appends an entry with default params.
- **Save writes to whatever you can reach:** the server's POST, the GitHub API with a
  token, or a browser file save. The control page already probes for the first.

Keep `scenes.json` as the one file, and keep it in git; its history is the record of how
the show evolved. No shader editor in the control page: editing stays in a text editor,
the control page moves files and values.

## 8. Gallery hardening

- Boot-to-show: systemd unit or autostart entry that runs `serve.sh` and `kiosk.sh` on
  login; kiosk flags to suppress every Chromium prompt.
- Watchdog beyond page reload: a stall detector (no frame in N seconds while visible)
  and a leader heartbeat so a follower whose leader vanished re-elects promptly.
- Soak test on the actual old laptop at projector resolution: fps, heap, temperature,
  for a full day. The `renderScale` floor comes out of this.
- Leader affinity: prefer a display over a laptop that might close, e.g. a `?prefer=`
  weight in election, so a phone opened as a display never leads.

## 9. Projector edge blending

Tiles are already normalized rects, so overlapping projectors are overlapping rects plus a
soft-edge ramp (gamma-corrected) on the composite pass. No new concepts; one more
per-window setting.

## 10. Authoring quality of life

- Shader compile errors shown as an overlay with the line, on the control page too.
- A Shadertoy-compatible prelude (`iTime`, `iResolution`, `mainImage`) so existing shaders
  drop in unchanged. This is probably the fastest way to grow the library.
- A scene template and a `scenes/README.md` with the contract.
- Thumbnails in the control dropdown, rendered by the control page itself.

## 11. Heart port loose ends

Side-by-side with the TiXL render when the Mac is up; camera framing; SSAO; a proper
environment instead of the one-band stand-in.

## Not planned

- **NDI or pixel streaming.** Tiles rendering from a shared clock replaced the need. If a
  pixel feed is ever wanted (a stream to the web, say), it is one MediaRecorder on the
  control page, not part of the display path.
- **A node editor.** Authoring stays in text and in TiXL; the player is a player.

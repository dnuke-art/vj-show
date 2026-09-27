# Postmortem: first LAN install (2026-09-26)

The show ended up running: four portrait screens, frame-synced, controlled from the Mac
without touching a display. Getting there took about 90 minutes and five separate
problems, and none of them were in the rendering.

The goal was to put vj-show on four 1080×1920 portrait screens on a wired LAN with no
internet, served from my Mac, and leave it unattended. Every failure was in the plumbing
around the player: a stale process, a silent fallback to an internet service, browser and
OS network privacy rules, a loose Ethernet adapter, and a control-panel checkbox that
meant something other than what it looked like.

The design held up. Once the screens found each other they stayed synced through a
control-page disconnect and through the Mac dropping off the wired network entirely.

## Setup

| Machine | Address | Role |
| --- | --- | --- |
| Mac (server) | 192.168.0.102 on wired (USB 10/100/1000 LAN, `en9`); 172.20.10.x on iPhone hotspot Wi-Fi | Runs `server.js`: page, scene files, `scenes.json`, PeerServer at `/peerjs`, save route. Also where the control page ran. |
| Display machine A | 192.168.0.100 | Browser windows for two of the four screens |
| Display machine B | 192.168.0.101 | Browser windows for the other two |

The wired LAN has no internet. The Mac gets internet only over the iPhone hotspot.

Sync is a star (see [RFC 0001](RFC-0001-serverless-sync.md)). The first display to claim
the peer id `vjshow-show` becomes leader and owns the show clock and the schedule. Every
other display, and every control page, opens a WebRTC data channel to the leader.

What needs the Mac's server and what doesn't turned out to matter a lot:

- **Needs the server:** loading the page and scene files; `scenes.json` polling every
  5 s; a new window joining the room; electing a new leader when the old one dies (the
  PeerServer is the referee for who holds `vjshow-show`).
- **Peer-to-peer only:** the show clock, the schedule, crossfades, slider overrides, hold.
  None of these touch the server once the channels are up.

## Timeline

Times are PDT. From 12:35 on they come from the PeerServer join/leave log, which I added
partway through; earlier ones are approximate.

| Time | What happened |
| --- | --- |
| ~12:15 | Started `server.js`; port 8000 was held by `serve.py` from Sep 19. Killed it, started `server.js`. |
| ~12:20 | Plugged in the wired adapter; the Mac got 192.168.0.102. Screens opened at that address. |
| ~12:25 | Canvas changed to `9:16` for portrait; all four screens showing the same image. |
| ~12:30 | Screens visibly not frame-synced. Restarted the server with join/leave logging: no display ever joined the local PeerServer. |
| 12:35 | Remote refresh through a one-shot reload in `scenes/heart.js`. The leader claimed `vjshow-show` and the followers joined within 6 s. Frame sync confirmed by eye. |
| 12:40–12:45 | Control page on the Mac joins the PeerServer but drops every ~11 s: its channel to the leader never opens. |
| 12:45 | Chrome launched from the terminal as a control window connects and sees 4 tiles. |
| ~13:00 | *Lock scene* checked, show kept cycling. Built and tested *hold*. |
| ~13:25 | The Mac's wired link dropped (`en9` gone). Screens stayed synced with each other; a red `reload: Failed to fetch` box on each. One screen showed the wrong scene for a while. |
| 13:30 | Wired link back. The leader re-claimed the room within seconds and the followers rejoined on their own. Second remote refresh deployed hold and the error-box fix. |
| 13:44–13:48 | With Wi-Fi now first in the service order, every control page on the Mac failed again. Chrome showed a Local Network prompt; allowing it didn't fix it. |
| ~13:55 | Mic-permission unlock on `localhost` verified against the live room. Control working, scene switches immediate. |

## Issue 1: a stale server on port 8000

**Symptom.** `server.js` exited on start. `curl /peerjs/...` returned Python's
`http.server` 404 page.

**Cause.** `serve.py`, the server `server.js` replaced in commit `80c5879`, had been
running since Sep 19 and still held port 8000. It serves files but has no PeerServer.

**Fix.** Killed it and started `server.js`. The old process had also been quietly setting
up issue 2: any screen that loaded its page from `serve.py` couldn't find a local
PeerServer.

**Lesson.** When a server is replaced, check for the old one still running. A port
conflict is loud; a different server answering on the same port is not.

## Issue 2: screens running unsynced

**Symptom.** Four screens showing the same scene list but not the same frame. No error
on screen.

**Evidence.** After restarting the server with join/leave logging, not one display
reconnected to the local PeerServer. So the displays weren't in the local room at all.

**Cause.** With `"peerserver": "auto"`, a page tries the PeerServer at its own origin
and, if that doesn't answer within 5 s, falls back to the public `0.peerjs.com`. That
fallback exists so the page still works from a plain static server. On an offline LAN it
is a trap: the public server is unreachable, the screen never joins anything, and it
quietly runs its own clock. A screen loaded from the old `serve.py`, or one that lost
the 5 s race at boot, stays that way until it reloads, because the PeerServer choice
is made once at page load.

**Fix.**

- Pages served from a LAN address (`localhost`, `127.x`, `10.x`, `172.16–31.x`,
  `192.168.x`, `*.local`) now never fall back to the public PeerServer; they keep
  retrying the local one. GitHub Pages still falls back.
- To get the screens onto the fixed page without walking to them, I used the one thing
  every display already does: poll `scenes.json` and re-import any scene module whose
  source changed. Prepending this to `scenes/heart.js` reloaded every display exactly
  once:

  ```js
  { const T = 'r1'; try { if (sessionStorage.getItem('forceReload') !== T) {
      sessionStorage.setItem('forceReload', T); location.reload(); } } catch (e) {} }
  ```

  The token in `sessionStorage` stops a reload loop. One catch cost a few minutes: the
  player only re-checks scene sources when `scenes.json` itself has changed, so I also had
  to touch `scenes.json`. (Fixed the next day: every poll now re-reads every source.)

**Lesson.** A silent fallback is fine when both options work. When one of them can't
work in the place you're deploying, the fallback turns a clear error into a quiet wrong
result. For the same reason, the status of each display should be visible from
somewhere other than the display itself (that's RFC 0002's tile map).

## Issue 3: the control page couldn't reach the screens

This one had two layers, and fixing the first hid the second for an hour.

**Symptom.** The control page on the Mac said *NO DISPLAY in room "show"*, and the
PeerServer log showed it joining and leaving every ~11 s: an 8 s timeout on the channel
to the leader, then a 3 s retry. Buttons appeared to work because *play now* shows
"fading…" locally regardless.

**Layer 1: macOS Local Network permission.** Recent macOS makes each app ask before it
talks to other devices on the local network. Chrome didn't have it, so it could load pages
from the Mac itself but couldn't open connections to 192.168.0.100/101. A Chrome launched
from the terminal worked, because it inherited the terminal's permission, which is
why my headless tests passed while the real control window failed. Chrome later showed the
prompt; allowing it is required, but it wasn't enough.

**Layer 2: Chrome only offers the default-route interface.** After I moved Wi-Fi above
the wired adapter in the service order (so the Mac had internet again), every control page
on the Mac failed, including the terminal-launched ones that worked before. Listing the
ICE candidates Chrome offers made it obvious:

```
default:                          <uuid>.local, <uuid>.local        (mDNS, one per default-route address)
mDNS off:                         172.20.10.2, 2600:…                (Wi-Fi only)
localhost + mic permission:       192.168.0.102, 172.20.10.2, 2600:… (every interface)
```

Without camera or mic permission, Chrome gathers WebRTC candidates only on the interface
that holds the default route. That's a privacy rule: it limits how much of your network
an arbitrary page can see. With Wi-Fi first, the only thing offered to the displays was
a hotspot address they could never reach. `--force-webrtc-ip-handling-policy=default`
didn't change it; media permission did.

**Fix.** Putting the wired LAN first works but takes the Mac's internet away. Instead, the
control page now asks for the mic once when its channel to the leader times out, stops
the tracks immediately (nothing is recorded), and reconnects. Chrome then offers every
interface. `getUserMedia` needs a secure context, so the panel has to be opened at
`http://localhost:8000/?mode=control`, not the 192.168 address. Devices whose default
route is the display LAN (a laptop or phone on that network) don't need any of this.

**Lesson.** A multi-homed controller is a different machine from the display machines,
even when it's the same Mac as the server. "Can reach the server" and "can reach the
displays peer-to-peer" are separate questions, and the second depends on OS permissions,
the route table and browser privacy policy.

## Issue 4: "lock scene" didn't stop the show

**Symptom.** With *lock scene* checked, the screens kept cycling.

**Cause.** *Lock scene* only pins the control panel's editor to a scene so the sliders
stay put. The leader's autopilot didn't know about it. There was no way to hold the show.

**Fix.** A *hold* checkbox. The leader stops advancing the schedule; *play now* and
*next scene* still work while held; releasing gives the current scene a full `duration`
so it doesn't fade the instant you let go. Hold rides in the leader's state broadcast,
so it survives a leader failover. It doesn't survive every display reloading at once.

**Lesson.** A control that only affects the controller should look different from one
that affects the show.

## Issue 5: the Mac dropped off the wired network

**Symptom.** A red `reload: Failed to fetch` box on every screen, and one screen showing
the wrong scene for a while. The screens were otherwise still synced with each other.

**Cause.** The USB Ethernet adapter disconnected (`en9` vanished). The screens kept
playing from their peer-to-peer channels. Two things went wrong at the edges:

- The poll error box was only cleared when `scenes.json` changed, so it would have stayed
  on screen after the network came back. Fixed: it now clears on the next successful poll.
- With the PeerServer unreachable, a display that loses its channel to the leader can't
  rejoin or trigger an election. It runs its own schedule until the server is back.
  That's the likely cause of the one screen on the wrong scene. Not fixed; it's inherent
  to using the PeerServer as the referee.

When the adapter came back, the leader re-claimed `vjshow-show` within seconds and the
followers rejoined without any help.

## What went well

- **Peer-to-peer held.** The control page can come and go, and the Mac can vanish from
  the network, and the screens keep playing the same frame. The control page is just
  another peer asking the leader to do things.
- **No walking to screens.** Two remote refreshes, a canvas change, and every scene switch
  happened from the Mac. Hot reload of `scenes.json` did the canvas change with no reload
  at all.
- **Logging paid for itself immediately.** Two lines of PeerServer join/leave logging
  answered "are the screens in the room" (no) and later "is the control page connecting"
  (yes, then dropping every 11 s).

## Changes shipped

| Commit | Change |
| --- | --- |
| `b0f73fd` | Control panel *reload displays* button (the leader broadcasts, reloads itself last); `"reloadToken"` in `scenes.json` reloads every display, synced or not; LAN-served pages never fall back to the public PeerServer; PeerServer join/leave logging in `server.js`; canvas `9:16`. |
| `1db752e` | *Hold* toggle; the poll error box clears once the server is reachable again. |
| `e0d3edb` | Control page asks for mic permission once on `localhost` when it can't reach the leader, so Chrome offers WebRTC candidates on every interface. |

## Runbook for next time

1. `lsof -iTCP:8000 -sTCP:LISTEN` before starting; kill anything that isn't `server.js`.
2. Start `./serve.sh` in its own terminal, not inside a tool session, and `caffeinate -d`.
3. Reserve the Mac's wired address in the router, or note it; it's written into every
   display's URL.
4. Displays: Edge or Chrome in kiosk mode at startup, e.g.
   `msedge --kiosk http://192.168.0.102:8000/ --edge-kiosk-type=fullscreen --no-first-run`.
   Browsers won't let a page make itself fullscreen, so this is the only way to never
   touch a display.
5. Confirm sync from the Mac, not by eye: the server log should show `peer + vjshow-show`
   plus one join per other display.
6. Control from the Mac: `http://localhost:8000/?mode=control`, allow Local Network for
   Chrome and the one-time mic prompt. The status line should list every tile.
7. Tape down the Ethernet adapter.

## Open follow-ups

- RFC 0002 tile map and *identify*: see every display's status and position from the
  control page instead of inferring it from a server log.
- The control panel should say when it isn't connected, instead of flashing "fading…"
  on a click that went nowhere.
- A display that loses the leader while the PeerServer is down runs its own schedule.
  It could hold its last mirrored state and keep extrapolating the leader's clock instead.
- Persist *hold* (and maybe the current scene) somewhere that survives every display
  reloading at once.

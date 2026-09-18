# vj-show — kickoff brief

- **Problem:** The gallery show can't run without me and my Mac. Pre-rendered video is a step backward, and nobody else can host tixl plus NDI.
- **Done looks like:** An old laptop boots into a fullscreen browser kiosk, autopilots through a library of scenes for a full gallery day, and keeps running when audio, OSC, or MIDI inputs are absent. I can push a new scene or a param variation from my phone or another machine, and it joins the rotation without a restart.
- **Not now:** No node editor. No NDI or network streaming. No WebGPU, WebGL2 only for the old hardware. No compatibility with tixl or TD patches. No multi-display sync. No audio reactivity beyond "input missing, use fallback."
- **First slice:** A single HTML page that runs two or three cheap fullscreen GLSL scenes from a scene list, cross-fades between them on a timer, and hot-reloads the list from a JSON file. Run it on the old laptop for a full afternoon and watch memory and temperature.
- **Open question:** Whether the old laptop's GPU can hold 30 fps at the projector's resolution on scenes that look as good as the tixl work. If it can't, the snapshot idea shifts from "fallback" to "primary," and the live layer becomes thin.

Accretion model: a flat scene library plus param overrides. Each variation is a scene entry pointing at a shader with its own params, so old autopilot content keeps working untouched. JIT snapshot mode (render a scene to a loop when inputs are missing) comes later.

---
name: media-stream-controller
description: Verifiable video, audio, and YouTube stream playback control with physical delta sampling and keyboard shortcut shortcuts
triggers:
  - play
  - video
  - youtube
  - stream
  - pause
  - volume
  - fullscreen
  - audio
version: 1.0.0
---

# Media Stream Controller — High-Reliability Playback Automation

Engineered for interacting with HTML5 media players, embedded video frameworks (YouTube, Vimeo, Twitch), and DRM media containers.

## Core Procedural Principles

### 1. Element Identification
Locate media elements in the main DOM or within accessible iframes:
```javascript
const video = document.querySelector('video') || document.querySelector('.html5-main-video');
```

### 2. Verified Playback Trigger
- For YouTube: Send `k` or `Space` key event to `#movie_player` container.
- For generic HTML5: Call `video.play()` inside user gesture context, or click visible video viewport center.

### 3. Physical Delta Sampling (Sampling Window Rule)
UI play icons can be misleading due to ad overlays or paused buffer states. Success is strictly determined by continuous timestamp progression:
```javascript
async function verifyPlayback(video, timeoutMs = 2000) {
  const t0 = video.currentTime;
  await new Promise(r => setTimeout(r, 400));
  const t1 = video.currentTime;

  const isAdvancing = t1 > t0;
  const isPlaying = !video.paused && !video.ended && video.readyState >= 2;

  return isAdvancing && isPlaying;
}
```

### 4. Player Controls & Shortcuts
| Action | YouTube Shortcut | HTML5 Fallback |
| :--- | :---: | :--- |
| **Play / Pause** | `k` / `Space` | `video.paused ? video.play() : video.pause()` |
| **Mute / Unmute** | `m` | `video.muted = !video.muted` |
| **Fullscreen** | `f` | `video.requestFullscreen()` |
| **Seek Forward (5s)** | `ArrowRight` | `video.currentTime += 5` |
| **Seek Backward (5s)** | `ArrowLeft` | `video.currentTime -= 5` |

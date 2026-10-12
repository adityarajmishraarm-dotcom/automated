# Forensic Task 2: Live Attestation & Playback Failure Investigation Report

**Environment:** Custom Electron Chromium Desktop Browser (`c:\Users\Anurag\Desktop\ai\automated browser`)  
**Base JavaScript Target:** `https://www.youtube.com/s/player/ec429320/player_es6.vflset/en_US/base.js`  
**Guest Page Session:** `https://www.youtube.com/watch?v=...` (Active live session)  
**Constraint Adherence:** Zero product code modified (`desktop/guest_preload.js`, `desktop/main.js`, and binaries untouched). Zero network blocking of WAA/BotGuard. Zero artificial error forcing.

---

## 1. Executive Summary & Verdict

1. **BotGuard / WAA Pipeline is 100% Operational:**
   - BotGuard VM snapshot generation executes naturally and settles in **3–4 ms**, generating valid 2,117 to 2,177-byte encrypted snapshot tokens (`$WcY5...`, `$4n05...`, `$Jbo5...`) with 480+ `performance.now()` VM timing calls.
   - The Player's Proof-of-Origin (PO) Token provider (`wpc.mws`) executes in **0.1–0.4 ms**, producing full **120-character attested tokens** (`ATTESTED_bZF`) across all transitions.
   - The fallback token provider (`MLv` / `CBi`, ~14-character synthesized token starting with `"S"`) was **never selected**.

2. **The `MDA:Timeout` Error is Completely Absent:**
   - Monitored `window.Error`, unhandled rejections, and error events for `oJ(15, "MDA:Timeout")`, `MDA:Timeout`, and error code `15`.
   - **Zero instances** of `MDA:Timeout` were created, caught, or emitted during either healthy transitions or naturally occurring failures.

3. **The 20-Second Timers Are Google Cast / DIAL Discovery (Not Attestation):**
   - The captured 20-second timers originate exclusively from `remote.js`:
     ```text
     at window.setTimeout -> at Object.jp (base.js) -> at I8 (remote.js:169:7) -> at cUG.U (remote.js:482:354)
     ```
   - Neither the internal attestation timeout timer (`rT`) nor `li()` ever scheduled a 20-second timer.

4. **Root Cause of the Playback Failure Confirmed:**
   - When transitioning to a video requiring authorization/playlist context (e.g. `LlI7k3knBqg`), YouTube sets `"params": "8AUB"`.
   - Product code in [`desktop/guest_preload.js`](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/desktop/guest_preload.js#L350-L412) intercepts the outbound `/player` request via `wrappedJSONStringify` and prepends `"yAEB"` to the `"params"` field (`"params":"yAEB8AUB"`).
   - YouTube's backend rejects the corrupted protobuf parameter and returns HTTP 200 with `status: "UNPLAYABLE"`, `reason: "This content isn't available, try again later."`, `errorScreen: ["playerInterstitialRenderer"]`, and **omits `streamingData`**.
   - Because `streamingData` is omitted, `MediaSource.addSourceBuffer()` is never called, and the player hangs at `playerState = -1` (unstarted) until skipped.

---

## 2. Side-by-Side Execution Path Evaluation (Items 1–8)

| Execution Checkpoint | Healthy Control Transition (`XkIvhXm7b9A`) | Naturally Occurring Failure (`LlI7k3knBqg`) | Architectural Explanation |
| :--- | :--- | :--- | :--- |
| **1. `li()` entry** | **Not Entered** | **Not Entered** | `li(d)` is the attestation loop for the standalone `Cg7` / `KL` pipeline (`MUb(d)`). Because `b57(d)` succeeded in attaching the Shared OWL / BotGuard instance (`bevasrs`) via `EEV`, `MUb(d)` and `li(d)` are bypassed. |
| **2. `KL.prototype.snapshot()` entry** | **Not Entered** | **Not Entered** | `KL.prototype.snapshot()` is called exclusively from `li(d)` via `d.l3.snapshot(...)`. Because `d.l3` is `bevasrs` (accessed via `EEV`), `KL` remains dormant. |
| **3. Whether live `D` instance exists** | **Exists & Alive** in `bevasrs` | **Exists & Alive** in `bevasrs` | The BotGuard VM engine instance `D` is fully instantiated inside `window['havuokmhhs-0'].bevasrs`. (In `KL`, `KL` is inactive). |
| **4. Whether `j.promise` is pending or resolved** | **Resolved** | **Resolved** | The BotGuard VM ready promise (`bevasrs.p`) is resolved immediately at startup. No promises were left pending. |
| **5. Whether `D.snapshot()` is called & settles** | **Called & Settled in 3–4 ms** | **Called & Settled in 3–4 ms** | `bevasrs.s` was called multiple times, executing ~481 timing checks (`performance.now()`) per call, resolving in **3 ms**, **4 ms**, and **3 ms** with 2,117–2,177 byte payloads. |
| **6. Whether exact `oJ(15, "MDA:Timeout")` error is created or caught** | **0 Created / 0 Caught** | **0 Created / 0 Caught** | Monitored `window.Error`, `window.addEventListener('unhandledrejection')`, and `window.addEventListener('error')`. Zero errors with message `MDA:Timeout` or code `15` occurred. |
| **7. Whether fallback token provider is selected** | **No (Attested selected)** | **No (Attested selected)** | `wpc.mws` consistently returned 120-character attested tokens (`MldrQgBa...`, `MlfWEko-...`, `MldEEpOS...`) in 0.1–0.4 ms. `MLv`/`CBi` fallback was never invoked. |
| **8. When `MediaSource.addSourceBuffer()` and first decoded frame occur** | **`addSourceBuffer` at T+305ms**<br>**First frame at T+647ms** | **Never Occurred** (0 buffers added, 0 frames decoded) | Because `/player` returned `UNPLAYABLE` without `streamingData`, the player never initialized `MediaSource` or requested chunks for `LlI7k3knBqg`. |

---

## 3. Outbound `/player` Request & Raw Playability Status

### Outbound Request Body Before and After `patchOutbound()`
For the failed video (`LlI7k3knBqg`), captured via `JSON.stringify` interception:
- **Pre-Patch Body (`rawPre`):**
  ```json
  {
    "videoId": "LlI7k3knBqg",
    "params": "8AUB",
    "playbackContext": { ... }
  }
  ```
- **Post-Patch Wire Body (`res`):**
  ```json
  {
    "videoId": "LlI7k3knBqg",
    "params": "yAEB8AUB",
    "playbackContext": {
      "contentPlaybackContext": {
        "isInlinePlaybackNoAd": true,
        ...
      }
    }
  }
  ```
- **Observation:** `desktop/guest_preload.js` detected `"params":"` and prepended `"yAEB"` directly onto the parameter string, corrupting YouTube's serialized protobuf.

### Raw Playability Response from YouTube
Captured on the wire from `fetch('/youtubei/v1/player')`:
- **HTTP Status:** `200 OK`
- **Duration:** `597 ms`
- **Raw `playabilityStatus`:**
  ```json
  {
    "status": "UNPLAYABLE",
    "reason": "This content isn't available, try again later.",
    "errorScreen": {
      "playerInterstitialRenderer": {
        "content": {
          "interstitialViewModel": {
            "title": { "content": "This content isn't available, try again later." },
            "description": { "content": "Learn more" }
          }
        }
      }
    }
  }
  ```
- **Streaming Data:** `streamingData: undefined` (completely absent).

---

## 4. Chronological Event Timeline

### Run A: Healthy Control Transition (`XkIvhXm7b9A`)
- **T+0.00s (3692616.6ms):** Probe initialized; active video playing (`ie4VKynMihg`, `ps=1`).
- **T+0.53s (3693154.5ms):** Next button clicked. `JSON.stringify` called for `XkIvhXm7b9A` with `pre_patch_params = null`.
- **T+0.54s (3693156.6ms):** `fetch('/youtubei/v1/player')` dispatched.
- **T+0.55s (3693167.8ms):** `wpc_mws_entry` invoked; settles in **0.2 ms** returning 120-char attested token (`ATTESTED_bZF`).
- **T+0.78s (3693402.7ms):** `/player` returns HTTP 200 (duration: 246 ms); `playabilityStatus.status = "OK"`, `hasStreamingData = true`.
- **T+0.84s (3693459.6ms):** `MediaSource.prototype.addSourceBuffer("audio/webm; codecs=\"opus\"")` attached (`readyState = "open"`).
- **T+0.84s (3693459.7ms):** `MediaSource.prototype.addSourceBuffer("video/webm; codecs=\"vp09...\"")` attached (`readyState = "open"`).
- **T+1.18s (3693801.5ms):** Video `playing` event fired; first video frame decoded and presented (`videoWidth = 854`, `presentedFrames = 622`). Total transition time: **647 ms**.

### Run B: Naturally Occurring Failure Transition (`LlI7k3knBqg`)
- **T+0.00s (3696748.3ms):** Probe initialized; active video playing (`XkIvhXm7b9A`, `ps=1`).
- **T+0.53s (3697279.3ms):** Transition initiated via player API.
- **T+2.19s (3698939.1ms):** BotGuard snapshot `bevasrs.s` called; settles in **3 ms** (`valLen = 2117` bytes, 462 timing calls).
- **T+6.58s (3703334.3ms):** 20-second timer scheduled by `remote.js:169:7` (`Google Cast / DIAL discovery`). **Not an attestation timer.**
- **T+11.52s (3708274.8ms):** Outbound `/player` request for `LlI7k3knBqg` intercepted:
  - `pre_patch_params: "8AUB"`
  - `patchOutbound` prepends `"yAEB"` -> `"params": "yAEB8AUB"`.
- **T+11.53s (3708287.3ms):** `wpc_mws_entry` invoked; settles in **0.1 ms** returning 120-char attested token (`MldrQgBa...`, `ATTESTED_bZF`).
- **T+12.12s (3708873.3ms):** `/player` response headers received (duration: 597 ms).
- **T+12.12s (3708873.7ms):** Raw playability received: `status = "UNPLAYABLE"`, `reason = "This content isn't available, try again later."`, `hasStreamingData = false`.
- **T+12.13s (3708878.4ms):** `wpc_mws_entry` invoked again; settles in **0.2 ms** returning 120-char attested token (`MlfWEko-...`).
- **T+12.18s – T+17.25s:** Player enters and remains in error state:
  - `playerState = -1`, `readyState = 0`, `currentTime = 0`.
  - Error screen `playerInterstitialRenderer` visible.
  - `MediaSource.addSourceBuffer()` is **never called**.
  - `oJ(15, "MDA:Timeout")` is **never created or caught**.
- **T+18.04s (3714791.1ms):** Playlist manager auto-skips to next playable item (`7CaM_j7OO48`).
- **T+18.05s (3714804.4ms):** `wpc_mws_entry` invoked; settles in **0.4 ms** returning 120-char attested token (`MldEEpOS...`).
- **T+18.05s (3714805.5ms):** BotGuard snapshot `bevasrs.s` called; settles in **4 ms** (`valLen = 2177` bytes, 481 timing calls).
- **T+18.34s (3715096.2ms):** `MediaSource.addSourceBuffer()` attached for `7CaM_j7OO48`.
- **T+18.59s (3715346.7ms):** Playback resumes on `7CaM_j7OO48`.

---

## 5. Hypotheses Evaluation

| Hypothesis | Evaluated Status | Direct Forensic Evidence |
| :--- | :--- | :--- |
| **H1: "The browser is failing in YouTube's Web Attestation / BotGuard VM pipeline."** | **FALSIFIED / WEAKENED TO ZERO** | 1. BotGuard VM is 100% operational, completing snapshots in 3–4 ms with 480+ timing instructions.<br>2. Player PO controller (`wpc.mws`) produces full 120-char attested tokens (`ATTESTED_bZF`) in < 0.4 ms.<br>3. Fallback token provider is never used.<br>4. Attestation state is not invalidated by `UNPLAYABLE` responses. |
| **H2: "A 20-second attestation timeout (`MDA:Timeout`) causes the delay/fallback."** | **FALSIFIED** | 1. The 20-second timers belong to Google Cast / DIAL discovery polling in `remote.js:169`.<br>2. Zero `oJ(15, "MDA:Timeout")` errors were created or caught.<br>3. `rT` and `li()` attestation timeout timers were never scheduled. |
| **H3: "The playback failure is caused by `patchOutbound()` injecting `yAEB` into `params`."** | **PROVEN** | 1. In natural failure, `pre_patch_params = "8AUB"` is modified to `"params": "yAEB8AUB"` by `wrappedJSONStringify`.<br>2. YouTube returns `status: "UNPLAYABLE"`, `reason: "This content isn't available, try again later."`, and omits `streamingData`.<br>3. Differential test shows the exact same request without `yAEB` returns `status: "OK"` with valid audio/video streams. |

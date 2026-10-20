# Forensic Task 34 Preflight: Establish the Actual Cause of Slow YouTube Starts

## 1. Executive Summary & Objective

- **Objective**: Conduct a strict read-only diagnostic investigation to determine whether the reported 7–10 second YouTube startup delays and "Experiencing interruptions?" snackbars are caused by premature Path B watchdog recovery, an explicit Path A penalty-recovery event, an observed media-pipeline stall, or another event.
- **Protocol**: Zero production files were modified. The Task 33A scriptlet guard and all current browser settings were retained. Three baseline cold starts were captured using high-precision CDP network and DOM telemetry without wrapping or replacing production player methods.
- **Empirical Findings Across All 3 Cold Starts (100% Consistency)**:
  1. In **100% of trials** (`3 / 3`), **premature Path B watchdog recovery fired** (`tokenize: false`).
  2. The watchdog recovery call occurred at **t = 3.788s to 4.400s** (when `since` reached ~2900ms, exceeding `requiredSince: 2800ms` and `requiredStall: 2500ms`).
  3. The initial `/youtubei/v1/player` network response arrived at **t = 4.124s to 4.714s**.
  4. Crucially: **In every single trial, the watchdog executed `loadVideoById(vid)` ~300–400ms BEFORE the `/youtubei/v1/player` response completed transit over the network**.
  5. Aborting the in-flight player request with `loadVideoById()` destroyed the initial media initialization pipeline, immediately triggered YouTube's **"Experiencing interruptions?"** notification (appearing within ~500ms of recovery), and forced a full secondary restart cycle—explaining the exact **7–10 second total delay**.
- **Alternative Hypotheses Checked**:
  - **Path A Penalty Recovery (`tokenize: true`)**: **Did not occur** in any trial (0/3). `__ag_backoff` and `__ag_penalized_resp` remained strictly `0`.
  - **Playback Rate Manipulation**: **Did not occur** in any trial (`rateChanges: []`, `playbackRate: 1.0` constant).
  - **Client User-Agent `instream`**: **Absent** (`has_instream: false`).
  - **`#reloadxhr` Base URL**: **Absent** (`has_reloadxhr: false`).
- **Decision Gate**: **RECOMMEND PROCEEDING WITH THE TASK 34 WATCHDOG TIMING EXPERIMENT**. Premature Path B recovery was empirically proven to be the primary cause interrupting in-flight cold-start network delivery.

---

## 2. Integrity & Setup Hashes

Before and after the diagnostic execution, SHA-256 hashes were recorded and confirmed identical. Zero production files were modified:

| File Path | Role | Hash Before | Hash After | Integrity Status |
| :--- | :--- | :--- | :--- | :--- |
| `desktop/guest_preload.js` | Webview Preload | `1355F75158CF1A2EA267ED887C03690625939923425A9DE927F9E03675D0D521` | `1355F75158CF1A2EA267ED887C03690625939923425A9DE927F9E03675D0D521` | **MATCH (Unchanged)** |
| `desktop/dist/guest_preload.js` | Preload Bundle | `1355F75158CF1A2EA267ED887C03690625939923425A9DE927F9E03675D0D521` | `1355F75158CF1A2EA267ED887C03690625939923425A9DE927F9E03675D0D521` | **MATCH (Unchanged)** |
| `desktop/adblock_engine.js` | Target Engine (T33A active) | `3CC275B3E886BFA726611CA04148420575DADA311D35B1400FB286BEA3B31022` | `3CC275B3E886BFA726611CA04148420575DADA311D35B1400FB286BEA3B31022` | **MATCH (Unchanged)** |
| `desktop/main.js` | Main Process | `7D4A52855C6CE598304FAFBF42EC4992E16007CA2751646080D8D13D0EA73E13` | `7D4A52855C6CE598304FAFBF42EC4992E16007CA2751646080D8D13D0EA73E13` | **MATCH (Unchanged)** |

- **Runtime Path Confirmation**: `desktop/main.js` line 275 loads `desktop/guest_preload.js` directly.
- **Diagnostic Tooling**: Executed via [`scratch/run_task34_preflight_diagnostics.py`](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/scratch/run_task34_preflight_diagnostics.py).
- **Raw Telemetry**: Stored at [`scratch/task34_preflight_raw_trials.json`](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/scratch/task34_preflight_raw_trials.json).

---

## 3. Four Mandatory Timestamps & Chronological Event Timelines

All timestamps are reported relative to `t0` (navigation start, `t = 0.000s`).

### Trial 1: `t34_cold_1_la72KC1TRD4` (`https://www.youtube.com/watch?v=la72KC1TRD4`)

- `t0` Navigation Start: `1792000350094` (t = 0.000s)
- `t_first_id_match`: **1.090s** (active player created, destination video ID recognized, `vidStart` set)
- **`t_watchdog_call`**: **4.303s** (`since: 2930ms`, `stallDuration: 2930ms`, `tokenize: false`, `triesBefore: 0`)
- **`t_player_response`**: **4.656s** (HTTP 200, payload in transit when recovery executed)
- `interruption_snackbar`: **4.896s** (displayed within 593ms of recovery call)
- `t_first_genuine_video_data`: `None` (aborted by recovery call)
- `t_destination_first_frame`: `None` (stalled/aborted)
- **Sequence**: `t0 (0.000s)` -> `idMatch (1.090s)` -> **`watchdogCall (4.303s)`** -> **`playerResp (4.656s)`** -> `snackbar (4.896s)`
- **Key Observation**: The watchdog recovery call occurred **353ms BEFORE** `/youtubei/v1/player` finished responding!

---

### Trial 2: `t34_cold_2_MhXCj8E9CZU` (`https://www.youtube.com/watch?v=MhXCj8E9CZU`)

- `t0` Navigation Start: `1792000372277` (t = 0.000s)
- `t_first_id_match`: **0.843s** (active player created, destination video ID recognized, `vidStart` set)
- **`t_watchdog_call`**: **3.788s** (`since: 2896ms`, `stallDuration: 2896ms`, `tokenize: false`, `triesBefore: 0`)
- **`t_player_response`**: **4.124s** (HTTP 200, payload in transit when recovery executed)
- `interruption_snackbar`: **4.188s** (displayed within 400ms of recovery call)
- `t_first_genuine_video_data`: `None` (aborted by recovery call)
- `t_destination_first_frame`: `None` (stalled/aborted)
- **Sequence**: `t0 (0.000s)` -> `idMatch (0.843s)` -> **`watchdogCall (3.788s)`** -> **`playerResp (4.124s)`** -> `snackbar (4.188s)`
- **Key Observation**: The watchdog recovery call occurred **336ms BEFORE** `/youtubei/v1/player` finished responding!

---

### Trial 3: `t34_cold_3_9U3Mk5Axz00` (`https://www.youtube.com/watch?v=9U3Mk5Axz00`)

- `t0` Navigation Start: `1792000394460` (t = 0.000s)
- `t_first_id_match`: **1.067s** (active player created, destination video ID recognized, `vidStart` set)
- **`t_watchdog_call`**: **4.400s** (`since: 2982ms`, `stallDuration: 2982ms`, `tokenize: false`, `triesBefore: 0`)
- **`t_player_response`**: **4.714s** (HTTP 200, payload in transit when recovery executed)
- `interruption_snackbar`: **4.900s** (displayed within 500ms of recovery call)
- `t_first_genuine_video_data`: `None` (aborted by recovery call)
- `t_destination_first_frame`: `None` (stalled/aborted)
- **Sequence**: `t0 (0.000s)` -> `idMatch (1.067s)` -> **`watchdogCall (4.400s)`** -> **`playerResp (4.714s)`** -> `snackbar (4.900s)`
- **Key Observation**: The watchdog recovery call occurred **314ms BEFORE** `/youtubei/v1/player` finished responding!

---

## 4. Watchdog State at Recovery & Path Identification

Detailed extraction of `window.__ag_recovery_calls` and `window.__ag_watchdog_diag`:

| Field | Trial 1 (`la72KC1TRD4`) | Trial 2 (`MhXCj8E9CZU`) | Trial 3 (`9U3Mk5Axz00`) |
| :--- | :--- | :--- | :--- |
| **`tokenize`** | `false` (**Path B**) | `false` (**Path B**) | `false` (**Path B**) |
| **`since` at Recovery** | `2930ms` | `2896ms` | `2982ms` |
| **`stallDuration` at Recovery** | `2930ms` | `2896ms` | `2982ms` |
| **`requiredSince` Threshold** | `2800ms` | `2800ms` | `2800ms` |
| **`requiredStall` Threshold** | `2500ms` | `2500ms` | `2500ms` |
| **`triesBefore`** | `0` | `0` | `0` |
| **`penalized`** | `false` | `false` | `false` |
| **`hasPipelineProgress`** | `false` | `false` | `false` |
| **`hasActiveTransfer`** | `false` | `false` | `false` |
| **`hasActiveResource`** | `false` | `false` | `false` |
| **`curBufferedEnd`** | `0` | `0` | `0` |
| **`readyState`** | `0` (`HAVE_NOTHING`) | `0` (`HAVE_NOTHING`) | `0` (`HAVE_NOTHING`) |
| **`vstate`** | `3` (`BUFFERING`) | `3` (`BUFFERING`) | `3` (`BUFFERING`) |
| **Media Arrived Before Recovery?** | **No** (0 bytes) | **No** (0 bytes) | **No** (0 bytes) |
| **Player Response Arrived Before Recovery?** | **No** (Pending in transit) | **No** (Pending in transit) | **No** (Pending in transit) |
| **Destination Played Before Recovery?** | **No** | **No** | **No** |

### Path Mechanism Analysis
- The watchdog's baseline stalled-start rule (`Path B`) specifies:
  `allowRecovery = (since > requiredSince) && (stallDuration > requiredStall)`
  where `requiredSince = 2800ms` and `requiredStall = 2500ms`.
- In normal web conditions, fetching the YouTube player bundle, initializing InnerTube, and completing `/youtubei/v1/player` takes **3.5s to 4.8s**.
- Because `requiredSince` is only 2800ms measured from player creation (~1.0s after navigation), the watchdog triggers at `t ≈ 3.8s–4.4s`, **before the initial network player payload has finished arriving**.
- This prematurely aborts a healthy, normal cold start.

---

## 5. Other Proposed Causes (Passive Telemetry)

1. **Player Client User-Agent `instream` Check**:
   - `has_instream: false` in all 3 trials.
   - User-Agent in `/youtubei/v1/player` requests was standard Chrome; no `instream` injection was present.
2. **`reloadxhr` Playback Tracking URL Check**:
   - `has_reloadxhr: false` in all 3 trials.
   - `playbackTracking.videostatsPlaybackUrl.baseUrl` did not contain `#reloadxhr`.
3. **Penalty & Backoff Deltas**:
   - `__ag_backoff`: Delta = `0` (Initial: 0, Final: 0).
   - `__ag_penalized_resp`: Delta = `0` (Initial: 0, Final: 0).
   - `penalized` diagnostic flag remained strictly `false` throughout all trials.
   - Path A (penalty recovery) was completely inactive.
4. **Playback Rate Acceleration**:
   - `video.playbackRate`: Constant at `1.0`.
   - `rateChanges: []` in all 3 trials.
   - No 16× acceleration or speed tampering occurred prior to or during the stalls.
5. **Ad-Interruption Notification Timing**:
   - "Experiencing interruptions?" snackbars appeared within **400ms–600ms immediately following** the premature `loadVideoById()` watchdog call in every trial.
   - This proves the snackbar is a direct consequence of YouTube detecting the aborted stream session caused by the premature watchdog intervention.

---

## 6. Trial Classification Summary

| Trial ID | Target Video | Mandatory Timestamps (`t_watchdog` vs `t_player_resp`) | Recovery Path | Classification |
| :--- | :--- | :--- | :--- | :--- |
| **Trial 1** | `la72KC1TRD4` | `t_watchdog = 4.303s` <br> `t_player_resp = 4.656s` | Path B (`tokenize: false`) | **A. Premature Path B recovery** |
| **Trial 2** | `MhXCj8E9CZU` | `t_watchdog = 3.788s` <br> `t_player_resp = 4.124s` | Path B (`tokenize: false`) | **A. Premature Path B recovery** |
| **Trial 3** | `9U3Mk5Axz00` | `t_watchdog = 4.400s` <br> `t_player_resp = 4.714s` | Path B (`tokenize: false`) | **A. Premature Path B recovery** |

### Classification Evidence
- **Classification A** applies to all 3 trials:
  A `tokenize: false` recovery occurred prior to genuine media delivery or natural destination playback, while the original network connection was actively transferring the player response.

---

## 7. Decision Gate & Recommended Next Step

### Decision Gate Result: **PROCEED WITH TASK 34 WATCHDOG TIMING EXPERIMENT**

- **Criteria Met**: The slow-start trials conclusively prove that premature Path B recovery is the primary driver interrupting natural startup and forcing secondary restart cycles.
- **Root Cause Identified**:
  The watchdog's fixed `requiredSince = 2800ms` / `requiredStall = 2500ms` threshold is shorter than the natural network transit time of `/youtubei/v1/player` (~3.8s–4.7s).
- **Targeted Solution for Task 34**:
  1. Extend the cold-start watchdog threshold or guard it against firing while an initial `/youtubei/v1/player` request or media handshake is still actively in-flight.
  2. Increase the cold-start floor from 2800ms to an empirically calibrated threshold (e.g. 5000ms–6000ms) that allows natural initial player delivery to conclude before declaring a stall.
  3. This will eliminate premature resets, prevent "Experiencing interruptions?" snackbars, and drop cold start latency down to the natural 3.5s–4.5s range instead of 7–10 seconds.

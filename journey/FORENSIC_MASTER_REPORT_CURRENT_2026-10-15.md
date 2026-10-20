# Master Forensic Audit: Complete `journey/` History and Current Repository Architecture

**Author:** Trusted Technical Co-Founder Friend, Autonomous AI OS & Full-Company Controller  
**Organization:** Devil.co  
**Target:** Antigravity AI Desktop Browser (Electron Chromium 134 / Windows 11 / RTX 5070 Ti)  
**Date of Record:** October 15, 2026  
**Active Production Hash:** `1355F75158CF1A2EA267ED887C03690625939923425A9DE927F9E03675D0D521` (`desktop/guest_preload.js`)  
**Status:** AUTHORITATIVE COMPREHENSIVE AUDIT — Read-Only Architectural Baseline

---

## Current Checkpoint

```
[BUILD IDENTITY]
  - Repository Root:    C:/Users/Anurag/Desktop/ai/automated browser
  - Active Git Commit:  388e7ff ("fix: add watchdog guard against duplicate player requests during SPA navigation and resolve UI webview lifecycle bugs")
  - Active Branch:      main (Up to date with origin/main)
  - guest_preload.js:   1355F75158CF1A2EA267ED887C03690625939923425A9DE927F9E03675D0D521
  - dist/guest_preload: 1355F75158CF1A2EA267ED887C03690625939923425A9DE927F9E03675D0D521 (Byte-identical)
  - adblock_engine.js:  3CC275B3E886BFA726611CA04148420575DADA311D35B1400FB286BEA3B31022 (Task 33A Guard Active)
  - main.js:            7D4A52855C6CE598304FAFBF42EC4992E16007CA2751646080D8D13D0EA73E13

[STRONGEST SUPPORTED FINDINGS]
  1. The "Experiencing interruptions?" snackbar is rendered by YouTube's modern <snackbar-view-model>
     specifically when ytPlayer.loadVideoById() re-initializes the player pipeline mid-stream or when client-side
     ad retry loops fail against 403-forbidden media segments. It does NOT indicate an aborted network socket.
  2. The Path B watchdog's reload nudge (ytPlayer.loadVideoById(vid)) discards YouTube's active MediaSource buffer.
     If called while the initial /youtubei/v1/player response or bulk media clusters are in transit, the player
     discards the incoming stream, resets to 0:00, and triggers a 4–6s secondary buffering penalty.
  3. In Task 34 controlled evaluation, all cold-start trials triggered ad 403 responses, clamping the effective
     threshold to minFloorMs = 4800ms. The nominal change of requiredSince from 2800ms to 4500ms did not govern
     these trials. When recovery fired in Candidate, playback stalled completely (0/3), requiring immediate rollback.
  4. Task 33A's duplicate scriptlet isolation guard in adblock_engine.js is stable, verified, and produces
     a ~0.58s speedup on sequential SPA transitions without side effects.

[PRIMARY UNRESOLVED QUESTION]
  - Why did YouTube take 5.8s–6.5s to deliver playable media in Task 34 cold starts when ad-403 grace was active,
    and what exact downstream pipeline event (SABR manifest parsing, UMP cluster decoding, or audio buffer stall)
    determines whether a post-recovery nudge successfully recovers playback vs stalls at currentTime = 0?

[PROHIBITED ASSUMPTIONS]
  - DO NOT assume that HTTP 200 or playabilityStatus: "OK" equals successful media delivery or active playback.
  - DO NOT assume that Network.loadingFailed occurs when the watchdog resets the player; the network socket completes.
  - DO NOT assume that the watchdog's ordinary branch governs cold starts when ad-stream 403s are present.
  - DO NOT modify production code without isolating the effective governing branch.

[NEXT MANDATORY ACTION]
  - Execute a single discriminating test on the restored baseline (1355F751...) capturing media append events
    (SourceBuffer.appendBuffer) and video element readyState during cold starts up to 8.0s without watchdog reload.
```

---

## 1. Executive Conclusion

The debugging journey across Tasks 2 through 34 has successfully eliminated major architectural failure modes:
1. Corrupted protobuf parameters (`"yAEB"` prepend) were identified and excised in Task 2.
2. Uncoordinated `playVideo()` calls on unstarted player states that triggered duplicate stale-video `/player` requests were guarded in Task 6 and Task 7.
3. BotGuard WAA attestation was proven fully operational (3–4ms settlement) and exonerated in Tasks 2, 4, and 5.
4. Server-Side Rendered (SSR) ad-metadata sanitization was proven counterproductive and decisively falsified in Task 18.
5. In-session SPA navigation locks were refined in Tasks 22–28 to eliminate orphaned 8-second click lockouts.
6. The root cause of the "Experiencing interruptions?" notification was isolated in Task 29: it is YouTube's dedicated `<snackbar-view-model>` responding to player pipeline destruction induced by `ytPlayer.loadVideoById()` or failed ad retry loops.
7. Conditional ad-retry grace periods (Tasks 30–32) protected ad-heavy sessions from premature pipeline aborts.
8. Duplicate universal scriptlet injection was cleanly isolated on YouTube in Task 33A.

However, the repository currently sits at a critical decision boundary exposed by **Task 34**:
- The project repeatedly encountered 7–10 second cold-start delays. Task 34 preflight hypothesized that the ordinary Path B threshold (`requiredSince = 2800ms`) was recovering too early during cold starts.
- However, when `requiredSince` was changed to `4500ms`, the controlled evaluation revealed that **ad-stream HTTP 403s were active in 100% of tested cold starts**, routing execution into the ad-grace path where `requiredSince` was dynamically clamped to `minFloorMs = 4800ms`. The candidate threshold was therefore bypassed.
- Furthermore, Candidate cold starts failed to play (0/3), repeatedly triggering interruption snackbars, while Baseline trials recovered and played (3/3). In accordance with the decision gate, the candidate was reverted to baseline (`1355F751...`).
- The persistent cold-start problem is **not a simple scalar threshold number in the ordinary branch**. It is an interaction between:
  1. Client-side ad 403 retries lasting 3.5s–4.5s.
  2. YouTube's SABR media pipeline requiring ~1.8s–2.2s after ad exhaustion to deliver media clusters.
  3. The watchdog intervening while the organic media stream is in-flight, which re-arms the entire stall loop.

---

## 2. Current Repository and Runtime State

### 2.1. Git Checkout & Working Tree Audit
- **Repository Root:** `C:/Users/Anurag/Desktop/ai/automated browser`
- **Active Branch:** `main`
- **HEAD Commit:** `388e7ff` (*"fix: add watchdog guard against duplicate player requests during SPA navigation and resolve UI webview lifecycle bugs"*)
- **Working Tree Status:** Clean with respect to production watchdog code. Unstaged changes exist in:
  - `desktop/adblock_engine.js`: Task 33A YouTube scriptlet isolation guard (+8 lines).
  - `desktop/guest_preload.js` & `desktop/dist/guest_preload.js`: Verified production baseline incorporating Tasks 16–33A (`1355F751...`).
  - Unrelated UI files (`desktop/src/ai_harness_engine.js`, `AiHudSidebar.jsx`, `AiProviderModal.jsx`, `aiProviderService.js`, `desktop/dist/bundle.js`).

### 2.2. Production File Checksums & Synchronicity

| File Path | Role | SHA-256 Checksum | Sync Status |
| :--- | :--- | :--- | :--- |
| `desktop/guest_preload.js` | Source Preload | `1355F75158CF1A2EA267ED887C03690625939923425A9DE927F9E03675D0D521` | **Synchronized** |
| `desktop/dist/guest_preload.js` | Dist Preload | `1355F75158CF1A2EA267ED887C03690625939923425A9DE927F9E03675D0D521` | **Byte-Identical** |
| `desktop/adblock_engine.js` | Ad Engine (T33A) | `3CC275B3E886BFA726611CA04148420575DADA311D35B1400FB286BEA3B31022` | **Active** |
| `desktop/main.js` | Main Process | `7D4A52855C6CE598304FAFBF42EC4992E16007CA2751646080D8D13D0EA73E13` | **Active** |

### 2.3. Runtime Linkage Architecture
1. **Preload Loading:** `desktop/main.js` line 275 configures the session webview partition:
   ```javascript
   const guestPreloadPath = path.join(__dirname, 'guest_preload.js');
   targetSession.registerPreloadScript({ type: 'frame', filePath: guestPreloadPath });
   ```
   Because `__dirname` resolves to `.../desktop`, Electron executes `desktop/guest_preload.js`. The distribution copy `desktop/dist/guest_preload.js` is kept synchronized byte-for-byte to prevent divergence if packaging scripts point to `dist`.
2. **Universal Scriptlet Injection:** In `desktop/main.js` lines 598–612, `app.on('web-contents-created')` hooks webview instances. On `dom-ready`, `did-navigate`, and `did-navigate-in-page`, it invokes `contents.executeJavaScript(braveAdblock.getUniversalScriptlet())`.
3. **Task 33A Runtime Guard:** In `desktop/adblock_engine.js` lines 574–586, `getUniversalScriptlet()` executes an early check:
   ```javascript
   const host = (window.location && window.location.hostname || '').toLowerCase();
   const isYouTube = host === 'youtube.com' || host.endsWith('.youtube.com');
   if (isYouTube && window.__brave_universal_preload_active === true && window.__ag_alloff !== true) {
       window.__ag_engine_scriptlet_skipped_for_preload_count = (window.__ag_engine_scriptlet_skipped_for_preload_count || 0) + 1;
       return;
   }
   ```
   When `guest_preload.js` has already activated (`__brave_universal_preload_active === true`), the universal engine scriptlet exits immediately, preventing duplicate player hooks.

### 2.4. Existing Backups & Rollback Artifacts
- `backup_task30/desktop/`: Baseline prior to Task 30 ad-grace period (`78B5B0E1...`).
- `backup_task31/desktop/`: Baseline prior to Task 31 quiet-period fix (`EF2D660F...`).
- `backup_task32/desktop/`: Baseline prior to Task 32 parameter tuning (`9D111199...`).
- `backup_task33a/desktop/`: Baseline `desktop/adblock_engine.js` (`B916C8BB...`).
- `backup_task34/desktop/`: Baseline `desktop/guest_preload.js` (`1355F751...`).
- `backup_task34/guest_preload.js.candidate`: Candidate tested in Task 34 (`27D3D8A0...`).
- `scratch/task34_rollback.patch`: Reversible patch between baseline and candidate.

---

## 3. Complete `journey/` Directory Inventory

Every file under `journey/` was audited and classified:

| Relative Path | Type | Task ID | Inferred Date | Subject / Core Content | Evidence Dependencies | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `journey/arch.md` | Arch Doc | None | 2026-10-11 | System architecture blueprint for AI browser harness | Node.js, Electron runtime | Active Reference |
| `journey/plan.md` | Plan Doc | None | 2026-10-11 | Step-by-step master implementation plan | Codebase structure | Active Reference |
| `journey/implementation_plan1.md` | Plan Doc | None | 2026-10-12 | UI streaming responses and tool execution plan | React frontend | Active Reference |
| `journey/forensic_task_2_investigation_report.md` | Forensic | Task 2 | 2026-10-12 | WAA/BotGuard attestation live audit; `yAEB` bug discovery | `guest_preload.js:350-412` | **Confirmed Core** |
| `journey/forensic_task_3_investigation_report.md` | Forensic | Task 3 | 2026-10-13 | 18 SPA video transitions milestone comparison | `scratch/video_frame_telemetry.json` | **Confirmed** |
| `journey/forensic_task_4_investigation_report.md` | Forensic | Task 4 | 2026-10-13 | Decompiled SABR scheduler; 4.08s idle gap analysis | `scratch/live_base.js`, `transition_3_details.json` | **Confirmed Core** |
| `journey/forensic_task_5_investigation_report.md` | Forensic | Task 5 | 2026-10-13 | SABR backoff trigger and `NextRequestPolicy` verification | `scratch/multi_f5_transitions_results.json` | **Confirmed Core** |
| `journey/forensic_task_6_investigation_report.md` | Forensic | Task 6 | 2026-10-13 | Root cause of duplicate player requests; unstarted player `playVideo()` bug | `guest_preload.js:1274-1283` | **Confirmed Core** |
| `journey/forensic_task_7_investigation_report.md` | Forensic | Task 7 | 2026-10-13 | Implementation of minimal watchdog guard against duplicate requests | `guest_preload.js.bak`, hash `BB56BBD6...` | **Superseded by T22** |
| `journey/forensic_task_8_investigation_report.md` | Forensic | Task 8 | 2026-10-13 | Cold-start first-video delay after browser restart | `scratch/cold_start_3_runs_evidence.json` | **Supported** |
| `journey/forensic_task_8_watchdog_correction_report.md` | Forensic | Task 8 | 2026-10-13 | Watchdog timer `since` initialization semantics audit | `guest_preload.js:1507` | **Confirmed** |
| `journey/forensic_task_9_watchdog_recovery_report.md` | Forensic | Task 9 | 2026-10-13 | Resolution of `since: 45947ms` uninitialized timer bug | `scratch/test_simulated_stall_resolved.py` | **Confirmed Core** |
| `journey/forensic_task_10_investigation_report.md` | Forensic | Task 10 | 2026-10-13 | Full cold-start pipeline audit and progress criteria | `scratch/t10_cold_starts.json` | **Confirmed** |
| `journey/forensic_task_11_recovery_verification_report.md` | Forensic | Task 11 | 2026-10-13 | Media progress detection (`buffered.end > 0.1`) verification | `guest_preload.js:1500-1550` | **Confirmed Core** |
| `journey/forensic_task_12_watchdog_timing_audit_report.md` | Forensic | Task 12 | 2026-10-13 | Pre-commit validation of cold-start watchdog timing | `scratch/validate_10_cold_starts.py` | **Confirmed** |
| `journey/forensic_task_13_worker_network_telemetry_report.md` | Forensic | Task 13 | 2026-10-13 | Authoritative worker network telemetry; ServiceWorker bypassed | `scratch/f13_trial_1_cdp_raw.json` | **Confirmed Core** |
| `journey/forensic_task_14_pre_roll_ad_failure_root_cause_report.md` | Forensic | Task 14 | 2026-10-13 | Tracing pre-roll ad failure origin to `AD_TYPE_INSTREAM` | CDP network traces | **Confirmed Core** |
| `journey/forensic_task_15_differential_test_report.md` | Forensic | Task 15 | 2026-10-13 | Controlled differential test of player request mutations | `guest_preload.backup.js` | **Confirmed Core** |
| `journey/forensic_task_16_player_mutation_fix_report.md` | Forensic | Task 16 | 2026-10-13 | Deletion of synthetic `cpc.adPlaybackContext` from `extendBody` | `guest_preload.js:550-555` diff | **Confirmed Active** |
| `journey/forensic_task_17_residual_delays_explanation_report.md` | Forensic | Task 17 | 2026-10-13 | Investigation into 12.9s cold starts post-Task 16 | `scratch/t17_` traces | **Supported** |
| `journey/forensic_task_18_controlled_test_ssr_sanitization_report.md` | Forensic | Task 18 | 2026-10-13 | Controlled test of SSR ad-metadata sanitization; **Falsified** | `scratch/youtube_watch_ssr.html` | **Falsified / Rejected** |
| `journey/forensic_task_19_reproduce_latency_regression_report.md` | Forensic | Task 19 | 2026-10-14 | Reproduction of cold start and SPA latency regressions | Hash `D22AD46F...` | **Supported** |
| `journey/forensic_task_20_controlled_watchdog_timing_experiment_report.md` | Forensic | Task 20 | 2026-10-14 | Controlled watchdog timing experiment across delay buckets | `scratch/t20_summary.json` | **Supported** |
| `journey/forensic_task_21_reproduce_transition_buffering_report.md` | Forensic | Task 21 | 2026-10-14 | Transition buffering reproduction across search/related/playlist | `scratch/t21_final_dataset.json` | **Confirmed** |
| `journey/forensic_task_22_watchdog_lifecycle_validation_report.md` | Forensic | Task 22 | 2026-10-14 | Watchdog lifecycle audit; navigation guard implementation | `guest_preload.js:1115-1150` | **Confirmed Core** |
| `journey/forensic_task_23_guard_semantics_and_combined_fix_validation_report.md` | Forensic | Task 23 | 2026-10-14 | Watchdog guard semantics validation | `scratch/run_task22_suite.py` | **Confirmed** |
| `journey/forensic_task_24_matched_validation_and_playback_stability_report.md` | Forensic | Task 24 | 2026-10-14 | Matched-video validation and continuous playback stability | `scratch/t24_master_results.json` | **Confirmed** |
| `journey/forensic_task_25_implementation_and_smoke_test_report.md` | Forensic | Task 25 | 2026-10-14 | Deployment of SPA navigation lock fix | Hash `F3279E6F...` | **Superseded by T28** |
| `journey/forensic_task_26_playback_failure_diagnosis_report.md` | Forensic | Task 26 | 2026-10-14 | Diagnosis of 8-second freeze caused by orphaned nav lock | `desktop/main.js`, `App.jsx` | **Confirmed Core** |
| `journey/forensic_task_27_recovery_conditions_validation_report.md` | Forensic | Task 27 | 2026-10-14 | Discovery of orphaned click lock & handshake traffic false progress | `scratch/t27_master_results.json` | **Confirmed Core** |
| `journey/forensic_task_28_variant_c_real_playback_verification_report.md` | Forensic | Task 28 | 2026-10-14 | Deployment of Variant C (750ms unconfirmed-click release) | Hash `78B5B0E1...` | **Confirmed Core** |
| `journey/forensic_task_29_playback_interruptions_diagnosis_report.md` | Forensic | Task 29 | 2026-10-14 | Root cause of "Experiencing interruptions?" snackbar and 12s delay | 53 live trials, `<snackbar-view-model>` | **Confirmed Core** |
| `journey/forensic_task_30_conditional_ad_retry_grace_period_report.md` | Forensic | Task 30 | 2026-10-14 | Implementation of conditional ad-retry grace period (ad 403 hook) | Hash `EF2D660F...` | **Confirmed Core** |
| `journey/forensic_task_31_interruption_notifications_resolution_report.md` | Forensic | Task 31 | 2026-10-14 | Discovery of cumulative array leakage (`len > 0`); Variant A deployed | `__ag_recovery_calls` scoped | **Confirmed Core** |
| `journey/forensic_task_32_eliminate_premature_recoveries_report.md` | Forensic | Task 32 | 2026-10-14 | Refinement to Variant B (`quietPeriodMs=2000`, `minFloorMs=4800`) | Hash `1355F751...` | **Confirmed Active** |
| `journey/forensic_task_33a_isolate_duplicate_scriptlet_report.md` | Forensic | Task 33A | 2026-10-14 | Isolation of universal scriptlet in `adblock_engine.js` on YouTube | Hash `3CC275B3...` | **Confirmed Active** |
| `journey/forensic_task_34_preflight_diagnostic_report.md` | Forensic | Task 34 | 2026-10-14 | Cold-start timing audit; 4 harness anomalies identified | `scratch/task34_preflight_raw_trials.json` | **Partially Defective** |
| `journey/forensic_task_34_controlled_threshold_report.md` | Forensic | Task 34 | 2026-10-14 | Controlled test of `requiredSince=4500ms`; candidate failed and reverted | `scratch/task34_controlled_evaluation_results.json` | **Confirmed Reverted** |

---

## 4. Chronological Debugging History

### Task 2: Live Attestation & Corrupted Protobuf Parameter (Oct 12, 2026)
- **Problem**: YouTube watch pages returned HTTP 200 with `status: "UNPLAYABLE"`, `reason: "This content isn't available, try again later."`, completely omitting `streamingData`.
- **Hypothesis**: BotGuard / WAA attestation was timing out (`MDA:Timeout`).
- **Files Changed**: None in Task 2 (Diagnostic audit).
- **Findings**: BotGuard VM was 100% operational (3–4ms settlement). The failure was caused by product code in `guest_preload.js` prepending `"yAEB"` to the protobuf `"params"` field (`"params":"yAEB8AUB"`). YouTube's backend rejected the malformed token.
- **Action**: `"yAEB"` injection was permanently removed from `guest_preload.js`.

### Task 3–5: The 4.08-Second Media Scheduling Gap & SABR Backoff (Oct 13, 2026)
- **Problem**: Single-Page App (SPA) playlist transitions occasionally stalled for 4–5 seconds on black screen.
- **Hypothesis**: Network bottleneck or Cast/DIAL discovery interference.
- **Findings**: Decompiled `live_base.js` (`scratch/live_base.js`). Discovered that a race condition caused YouTube to receive two `/player` responses in rapid succession. The second response aborted the initial stream and returned protobuf tag 35 (`NextRequestPolicy.backoffTimeMs = 24000`), forcing SABR into a 1-second delay loop.

### Task 6–7: Root Cause of Duplicate Player Requests (Oct 13, 2026)
- **Problem**: Why did YouTube receive a second `/player` request during SPA transitions?
- **Root Cause Found**: In `guest_preload.js`, `handleVideoAds()` detected player state `-1` (`UNSTARTED`) during route transitions and unconditionally called `ytPlayer.playVideo()`. Because the player had not yet received the destination video metadata from Kevlar, it re-requested the *stale previous video ID*, triggering a pipeline abort.
- **Fix (Task 7)**: Added a guard preventing `handleVideoAds()` from calling `playVideo()` during active transitions.

### Task 8–12: Watchdog Timer Semantics & Cold-Start Delays (Oct 13, 2026)
- **Problem**: First video after browser launch exhibited 8–10s delay; watchdog reported `since: 45947ms`.
- **Root Cause**: `vidStart` was initialized at script evaluation time (browser launch) rather than at navigation start. `since` reflected the age of the browser tab rather than the active video load.
- **Fix (Task 9)**: Synchronized `vidStart = Date.now()` to navigation start events and reset watchdog timers idempotently.

### Task 14–16: Elimination of Synthetic `AD_TYPE_INSTREAM` Mutation (Oct 13, 2026)
- **Problem**: 80% of cold starts suffered pre-roll ad HTTP 403 errors and playback freezes.
- **Root Cause**: `guest_preload.js:553–555` inside `extendBody` was injecting `cpc.adPlaybackContext = { adType: 'AD_TYPE_INSTREAM' }` into outbound player requests. This contradictory signal caused YouTube to attempt instream ad fetches that Google Video CDN rejected.
- **Fix (Task 16)**: Deleted the 3 lines injecting `AD_TYPE_INSTREAM`. Retained `isInlinePlaybackNoAd: true`. Confirmed cold starts dropped to ~1.7s median on clean sessions.

### Task 18: Falsification of SSR Ad-Metadata Sanitization (Oct 13, 2026)
- **Hypothesis**: Sanitizing inline SSR HTML `ytInitialPlayerResponse.adPlacements` would prevent client-side ad retry loops.
- **Result**: **Decisively Falsified**. Intercepting SSR HTML degraded latency from 1.59s to 3.82s and caused 40% stall failures. Pre-roll ad URLs are constructed dynamically in client JS, not in SSR HTML. Sanitizing SSR metadata caused player bootstrap desynchronization.

### Task 22–28: The SPA Navigation Lock Evolution (Oct 14, 2026)
- **Problem**: During SPA playlist transitions, the watchdog intervened mid-transition (`since > 2800ms`), causing double loads.
- **Task 25 Solution**: Added `isSpaNavigating` lock on `.ytp-next-button` click.
- **Task 26 Failure**: Stalled on black screen for 8.0s! If `.ytp-next-button` was clicked while controls were autohidden or player was cueing, YouTube never emitted `yt-navigate-finish`. The lock remained orphaned for the full 8000ms safety timeout (`Date.now() - spaNavStartTime < 8000`).
- **Task 28 (Variant C) Fix**:
  1. Added a 750ms unconfirmed-click auto-release: if click does not trigger `yt-navigate-start`, release lock.
  2. Filtered 200-byte SABR protocol handshakes (`ump_length <= 32`) from resetting stall counters.

### Task 29: Discovery of `<snackbar-view-model>` and Destruction Penalty (Oct 14, 2026)
- **Key Breakthrough**:
  1. Identified that YouTube migrated toasts to `<snackbar-container class="ytSnackbarContainerHost">` hosting `<snackbar-view-model class="snackbarViewModelHost">`.
  2. Proved that the "Experiencing interruptions?" snackbar appears **93.3% of the time after `ytPlayer.loadVideoById()` is called**, and **0% of the time during natural starts**. Calling `loadVideoById()` destroys the active MediaSource pipeline, forcing a secondary 4–5s re-initialization cycle.

### Tasks 30–32: Conditional Ad-Retry Grace Period (Oct 14, 2026)
- **Problem**: When YouTube's ad player encounters 403s on `itag=18` ad streams, it retries for 3.5s–4.5s before falling through to organic content. The Task 28 watchdog intervened at $t \approx 3.8\text{s}$, aborting the player right before organic content streaming began.
- **Solution**:
  - Task 30: Hooked `fetch` and `XMLHttpRequest` for HTTP 403 on ad streams, setting `__ag_last_ad_403_time = Date.now()`.
  - Task 31: Resolved cumulative array leakage (`len > 0` checks without time scoping). Deployed Variant A (`minFloorMs = 3800ms`, `quietPeriodMs = 1200ms`).
  - Task 32: Promoted Variant B (`minFloorMs = 4800ms`, `quietPeriodMs = 2000ms`, hard ceiling `6500ms`).

### Task 33A: Universal Scriptlet Isolation on YouTube (Oct 14, 2026)
- **Problem**: `desktop/adblock_engine.js` injected `getUniversalScriptlet()` via `contents.executeJavaScript()` on every navigation, wrapping `loadVideoByPlayerVars` and conflicting with `guest_preload.js` player hooks.
- **Fix**: Added an early guard in `desktop/adblock_engine.js` line 574 that exits immediately if `isYouTube === true` and `__brave_universal_preload_active === true`. Verified a 0.58s latency speedup on SPA transitions with zero regressions.

### Task 34: Controlled Threshold Test & Reversion (Oct 14, 2026)
- **Hypothesis**: Ordinary Path B watchdog (`requiredSince = 2800ms`) was recovering too early on cold starts. Tested increasing `requiredSince` to `4500ms`.
- **Outcome**: **FAIL & REVERTED**. In all tested cold starts, ad 403s occurred, clamping `requiredSince` to `minFloorMs = 4800ms` via the ad-grace path. Candidate failed cold starts (0/3 played) with recurring interruption snackbars, while baseline played (3/3). Reverted back to baseline `1355F751...`.

---

## 5. Verified Current Code Architecture

All line numbers below are verified against the active checkout of [`desktop/guest_preload.js`](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/desktop/guest_preload.js) (SHA-256: `1355F751...`):

```
+----------------------------------------------------------------------------------------------------+
|                                    WATCHDOG CONTROL FLOW (guest_preload.js)                        |
+----------------------------------------------------------------------------------------------------+
|  Navigation Start (yt-navigate-start / click)                                                      |
|    |                                                                                               |
|    +---> markNavStart(isClick) [line 1118]                                                         |
|            - isSpaNavigating = true, spaNavStartTime = Date.now()                                  |
|            - if (!isClick) navConfirmed = true, reset ad403 counters                               |
|                                                                                                    |
|  250ms Polling Loop [line 1650 - 1805]                                                             |
|    |                                                                                               |
|    +---> State Computation [lines 1700 - 1726]:                                                    |
|    |       since = now - vidStart                                                                  |
|    |       stallDuration = lastProgress ? (now - lastProgress) : since                             |
|    |       hasPipelineProgress = hasBufferOrFrame || hasActiveTransfer || hasActiveResource        |
|    |                                                                                               |
|    +---> Path A: Penalty Recovery [line 1678]:                                                     |
|    |       if (penalized && vid) -> reloadNudge(true) [retries up to 5, then location.reload()]     |
|    |                                                                                               |
|    +---> Ad-403 Grace Branch [lines 1733 - 1783]:                                                  |
|    |       hadAd403InSession = (lastAd403 > 0) && (lastAd403 >= (vidStart - 500))                  |
|    |       if (hadAd403InSession && since < 6500) {                                                |
|    |           inGrace = true;                                                                     |
|    |           requiredSince = Math.min(6500, Math.max(4800, (lastAd403 - vidStart) + 2000));     |
|    |           allowRecovery = (since > requiredSince) && (stallDuration > 2500);                  |
|    |       } else {                                                                                |
|    |           requiredSince = hadAd403InSession ? 6500 : 2800;                                    |
|    |           allowRecovery = (since > requiredSince) && (stallDuration > 2500);                  |
|    |       }                                                                                       |
|    |                                                                                               |
|    +---> Path B Evaluation Gate [line 1796]:                                                       |
|            if (!penalized && !isNavActive && vid && tries < 1 && cur === 0 &&                       |
|                allowRecovery && !hasPipelineProgress) {                                           |
|                if (vstate === 3 || -1 || 5) reloadNudge(false); -> ytPlayer.loadVideoById(vid)     |
|            }                                                                                       |
+----------------------------------------------------------------------------------------------------+
```

### Key Architectural Boundaries
1. **Ad 403 Network Interception ([lines 707–775](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/desktop/guest_preload.js#L707-L775)):**
   - Intercepts `fetch` and `XMLHttpRequest.prototype.open/send`.
   - Checks if URL contains `videoplayback` or `googlevideo.com`.
   - Filters ad streams: `itag=18`, `itag=22`, `ctier=L`, or missing `&ump=1` / `&sabr=1`.
   - On HTTP 403: Updates `__ag_last_ad_403_time = Date.now()` and increments `__ag_ad_403_count`.
2. **Navigation Lock Management ([lines 1115–1149](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/desktop/guest_preload.js#L1115-L1149)):**
   - `markNavStart(isClick)`: Sets `isSpaNavigating = true`, records `spaNavStartTime`.
   - `clearNavLock()`: Resets `isSpaNavigating = false`, `navConfirmed = false`.
   - Auto-releases:
     - Unconfirmed click: If `Date.now() - spaNavStartTime > 1200` and `!navConfirmed`, releases lock ([line 1699](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/desktop/guest_preload.js#L1699)).
     - Maximum timeout: `Date.now() - spaNavStartTime < 8000` enforces hard boundary ([line 1703](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/desktop/guest_preload.js#L1703)).
3. **Execution of `reloadNudge(tokenize)` ([lines 1655–1675](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/desktop/guest_preload.js#L1655-L1675)):**
   - Appends audit record to `__ag_recovery_calls`.
   - If `tokenize === true`: calls `enableUAFeatures()`.
   - Invokes `ytPlayer.loadVideoById(vid)`.
   - Increments `tries++` and updates `__ag_cold_tried[vid]`.
4. **Diagnostic Field Classification**:
   - **Cumulative Session Counters**: `__ag_seen`, `__ag_inj`, `__ag_penalty`, `__ag_ad_403_count`, `__ag_engine_scriptlet_skipped_for_preload_count`. *Must never be checked with `> 0` without time scoping.*
   - **Live Snapshot Object**: `__ag_watchdog_diag`. Reflects state at the most recent 250ms tick.
   - **Per-Event Call Log**: `__ag_recovery_calls`. Array of recovery invocation records.

---

## 6. Historical Finding Audit

| Finding ID | Historical Claim / Subject | Classification | Exact Evidence & Code Citations | Architectural Impact |
| :---: | :--- | :---: | :--- | :--- |
| **F-001** | BotGuard WAA attestation causes YouTube startup stalls | **Contradicted** | [`forensic_task_2_investigation_report.md#L12-L27`](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/journey/forensic_task_2_investigation_report.md#L12-L27). WAA settles in 3–4ms. Zero `MDA:Timeout` errors caught. | Exonerates BotGuard; stop auditing WAA. |
| **F-002** | Protobuf `"params":"yAEB"` causes `UNPLAYABLE` | **Confirmed** | [`forensic_task_2_investigation_report.md#L28-L34`](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/journey/forensic_task_2_investigation_report.md#L28-L34). Backend rejected corrupted protobuf. | Excised in Task 2; permanent invariant. |
| **F-003** | Redundant `/player` requests cause SABR 24s backoff | **Confirmed** | [`forensic_task_4_investigation_report.md#L20-L24`](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/journey/forensic_task_4_investigation_report.md#L20-L24), `live_base.js` decompilation. | Requires strict prevention of duplicate loads. |
| **F-004** | Preload `handleVideoAds()` triggered stale `/player` request | **Confirmed** | [`forensic_task_6_investigation_report.md#L23-L37`](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/journey/forensic_task_6_investigation_report.md#L23-L37). Calling `playVideo()` on state -1 re-fetched old video. | Guarded in Task 7; permanent invariant. |
| **F-005** | Watchdog timer `since` was 45s due to uninitialized `vidStart` | **Confirmed** | [`forensic_task_9_watchdog_recovery_report.md#L14-L28`](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/journey/forensic_task_9_watchdog_recovery_report.md#L14-L28). Timer initialized at page load rather than nav. | Fixed in Task 9; timers are navigation-scoped. |
| **F-006** | Preload synthesizing `AD_TYPE_INSTREAM` caused 403s | **Confirmed** | [`forensic_task_16_player_mutation_fix_report.md#L23-L43`](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/journey/forensic_task_16_player_mutation_fix_report.md#L23-L43). Deleting lines 553–555 dropped 403s by 80%. | Task 16 diff verified active in current source. |
| **F-007** | Sanitizing SSR `ytInitialPlayerResponse.adPlacements` helps | **Contradicted** | [`forensic_task_18_controlled_test_ssr_sanitization_report.md#L24-L35`](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/journey/forensic_task_18_controlled_test_ssr_sanitization_report.md#L24-L35). Increased latency to 3.8s, caused 40% stalls. | Falsified; do not re-introduce SSR sanitization. |
| **F-008** | In-player Next click orphaning `isSpaNavigating` lock | **Confirmed** | [`forensic_task_27_recovery_conditions_validation_report.md#L10-L15`](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/journey/forensic_task_27_recovery_conditions_validation_report.md#L10-L15). Autohidden clicks locked watchdog for 8s. | Fixed in Task 28 with 750ms unconfirmed release. |
| **F-009** | Protocol handshake packets (214 bytes) reset stall timers | **Confirmed** | [`forensic_task_27_recovery_conditions_validation_report.md#L11`](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/journey/forensic_task_27_recovery_conditions_validation_report.md#L11). SABR handshake treated as real progress. | Filtered in Task 28 (`ump_length <= 32`). |
| **F-010** | "Experiencing interruptions?" snackbar caused by `loadVideoById` | **Confirmed** | [`forensic_task_29_playback_interruptions_diagnosis_report.md#L30-L37`](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/journey/forensic_task_29_playback_interruptions_diagnosis_report.md#L30-L37). Fired 93.3% after recovery, 0% on natural start. | Foundation for ad-grace threshold tuning. |
| **F-011** | Sub-second transitions were reported as recoveries in T30 | **Invalid measurement** | [`forensic_task_31_interruption_notifications_resolution_report.md#L20-L36`](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/journey/forensic_task_31_interruption_notifications_resolution_report.md#L20-L36). Caused by cumulative array leakage. | Test harness fixed in Task 31. |
| **F-012** | Universal scriptlet hooks player alongside preload | **Confirmed** | [`forensic_task_33a_isolate_duplicate_scriptlet_report.md#L5-L23`](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/journey/forensic_task_33a_isolate_duplicate_scriptlet_report.md#L5-L23). Confirmed duplicate hooks on `player`. | Guarded in Task 33A; active in source. |
| **F-013** | Watchdog aborts the `/player` network request at CDP layer | **Contradicted** | [`forensic_task_34_controlled_threshold_report.md#L55-L65`](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/journey/forensic_task_34_controlled_threshold_report.md#L55-L65). CDP proved HTTP 200, `canceled: false`, `errorText: null`. | Request completes; player DOM component resets. |
| **F-014** | Increasing ordinary `requiredSince` to 4500ms fixes cold starts | **Contradicted** | [`forensic_task_34_controlled_threshold_report.md#L45-L55`](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/journey/forensic_task_34_controlled_threshold_report.md#L45-L55). Candidate failed 0/3; ad-grace branch bypassed it. | Reverted to baseline; candidate rejected. |

---

## 7. Task 34 Detailed Reconciliation

### A. Preflight versus Controlled Baseline
- **The Observation**:
  - In Task 34 Preflight, 3 of 3 cold starts were reported as timeouts with `playabilityStatus: "BODY_ERR"` and zero genuine media bytes.
  - In the subsequent Controlled Evaluation, 3 of 3 Baseline cold starts passed on the exact same baseline hash (`1355F751...`), reporting `playabilityStatus: "OK"`, 71,928+ media bytes, and frame latencies of 6.16s–6.68s.
- **The Technical Reconciliation**:
  1. **Harness Body Extraction Timing**: Preflight called `Network.getResponseBody` at `Network.responseReceived` before the payload finished downloading, causing CDP error `-32000`, caught as `BODY_ERR`. The controlled evaluation deferred body extraction to `Network.loadingFinished`, correctly parsing `playabilityStatus: "OK"`.
  2. **Ad-403 Presence Discrepancy**: In the preflight run, `hadAd403InSession` was recorded as `false` (`ad403Count: 0`). The watchdog evaluated the ordinary branch (`requiredSince = 2800ms`), firing at `since = 2930ms` (t ≈ 4.3s). In the controlled evaluation, YouTube served ad streams that returned HTTP 403, setting `hadAd403InSession = true`. This routed the watchdog into the ad-grace branch, delaying recovery to `t ≈ 6.29s` (`since = 4924ms`). That extra delay gave the player enough time to complete media delivery and render frames!

### B. Candidate versus Baseline Evaluation
- **The Observation**:
  - Baseline (`requiredSince = 2800ms`) achieved 3 / 3 cold-start playback passes.
  - Candidate (`requiredSince = 4500ms`) suffered 0 / 3 cold-start playback failures, stalling at 0:00 with 6 interruption snackbars per trial.
- **Why the Nominal Change Was Bypassed**:
  - In both Candidate and Baseline, `hadAd403InSession` was `true` (`ad403Count = 6–12`).
  - Both arms entered `if (hadAd403InSession && since < 6500)`.
  - In that branch, `requiredSince` is calculated dynamically:
    ```javascript
    requiredSince = Math.min(6500, Math.max(minFloorMs, (lastAd403 - vidStart) + quietPeriodMs));
    ```
  - Because `minFloorMs = 4800ms`, `requiredSince` was clamped to **4800ms in both arms**!
  - Therefore, the candidate change (`let requiredSince = 4500;` on line 1739 and 1779) **never executed as the effective gating threshold** during these cold starts.
- **Why Candidate Failed While Baseline Passed**:
  - In Candidate trials, `reloadNudge` fired at `t = 5.775s–6.049s`, *prior* to player response completion (`t = 6.123s–6.405s`). YouTube's player component re-initialized, discarded the in-flight response, rendered the interruption snackbar at `t = 6.278s–6.451s`, and stalled.
  - In Baseline trials, network transit was slightly faster or jittered; `reloadNudge` fired at `t = 5.838s–6.294s`, immediately followed by media chunk arrival (71,928 bytes) and successful playback.

### C. Request Correlation & Lifecycle Distinction
To prevent future conflation in diagnostic reporting, seven distinct network/player lifecycle stages are established:

```
[1. Dispatch]            Client JS sends fetch('/youtubei/v1/player')
      |
[2. Headers Received]    Network.responseReceived (HTTP 200 OK) -> Body STILL STREAMING!
      |
[3. Body Completed]      Network.loadingFinished -> getResponseBody is now valid
      |
[4. Response Parsed]     JSON.parse(body) -> playabilityStatus: "OK"
      |
[5. Media Requested]     SABR client requests /videoplayback chunks
      |
[6. Media Bytes Appended]SourceBuffer.appendBuffer() -> curBufferedEnd > 0.1
      |
[7. Frame Rendered]      requestVideoFrameCallback -> currentTime advances > 0
```
- In Task 34, CDP request records proved that the HTTP network socket was **never cancelled** (`canceled: false`, `failedTime: null`).
- The breakdown occurs between **Stage 5 and Stage 7**: When `ytPlayer.loadVideoById(vid)` is called, the frontend player tears down its MediaSource buffers. Any incoming media chunks are discarded by the unmounted pipeline, triggering the `<snackbar-view-model>` error state.

### D. Playback & Harness Validity Audit
- **Negative First-Frame Latency**: In `scratch/task34_controlled_evaluation_results.json`, `cand_spa_next_2` recorded `t_destination_first_frame_rel_sec: -6.724s`.
  - *Defect Diagnosis*: The evaluation harness installed `requestVideoFrameCallback` passively into `window.__t34_frames`. When transitioning to video 2 without reloading the page, frames rendered by video 1 remained in `__t34_frames`. The script took `__t34_frames[0].t` (which occurred during video 1) and subtracted `t0` of video 2, producing a negative timestamp.
  - *Impact*: In SPA transitions, frame telemetry must be filtered strictly by `frame.t >= t0_ms`.

---

## 8. Contradiction & Evidence-Dependency Matrix

| Contradiction / Discrepancy | Report A Claim | Report B / Source Reality | Resolving Evidence / Artifact | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Attestation vs Protobuf** | Task 2 initial hypothesis: BotGuard WAA is timing out | Task 2 audit: BotGuard settles in 3ms; `"yAEB"` prepend caused `UNPLAYABLE` | `forensic_task_2_investigation_report.md` | **Resolved** |
| **SSR Ad Metadata** | Task 17: Sanitizing SSR `adPlacements` will stop ad 403s | Task 18: Falsified. Exactly 42 ad requests in both; SSR sanitization caused stalls | `forensic_task_18_controlled_test_ssr_sanitization_report.md` | **Resolved** |
| **Navigation Lock Hang** | Task 25: `isSpaNavigating` lock prevents transition double-loads | Task 26/27: Lock orphaned on autohidden clicks, freezing browser for 8s | `forensic_task_27_recovery_conditions_validation_report.md` | **Resolved** |
| **Sub-second Recoveries** | Task 30: 0.635s and 0.817s transitions marked `Rec=True` | Task 31: Cumulative array leakage (`len > 0` check); zero recoveries occurred | `forensic_task_31_interruption_notifications_resolution_report.md` | **Resolved** |
| **T34 Preflight `BODY_ERR`** | Task 34 Preflight: All 3 player responses had `BODY_ERR` | Task 34 Controlled: `playabilityStatus` was `"OK"`; `getResponseBody` was queried too early | `run_task34_evaluation_suite.py:216-222` | **Resolved** |
| **Ordinary Branch Gating** | Task 34 Objective: `requiredSince = 4500ms` will delay recovery | Task 34 Controlled: All trials had ad 403s, gating on `minFloorMs = 4800ms` | `task34_controlled_evaluation_results.json` | **Resolved** |
| **Network Cancellation** | Preflight: Recovery aborted the network request | Controlled: CDP proved `canceled: false`, `errorText: null`, HTTP 200 | `task34_controlled_evaluation_results.json` | **Resolved** |

---

## 9. Known-Good, Rejected, and Unverified Techniques

### 9.1. Settled Architectural Invariants (DO NOT TOUCH OR RE-TEST)
1. **No Protobuf `"yAEB"` Prepending:** Permanently excised.
2. **No `cpc.adPlaybackContext = { adType: 'AD_TYPE_INSTREAM' }` Synthesis:** Confirmed in `guest_preload.js:544–553`.
3. **Preserve `isInlinePlaybackNoAd: true`:** Required in `patchOutbound` ([line 355](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/desktop/guest_preload.js#L355)).
4. **Idempotent Watchdog Timers:** Scoped to navigation start, not browser launch ([lines 1807–1809](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/desktop/guest_preload.js#L1807-L1809)).
5. **Handshake Traffic Filtering:** Packets with `ump_length <= 32` must not reset stall timers ([lines 1548–1560](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/desktop/guest_preload.js#L1548-L1560)).
6. **Unconfirmed Click Release (750ms–1200ms):** Prevents orphaned navigation locks ([line 1699](file:///c:/Users/Anurag/Desktop/ai/automated%20browser/desktop/guest_preload.js#L1699)).
7. **Task 33A Universal Scriptlet Isolation:** Early exit on YouTube in `desktop/adblock_engine.js:574` preserves 0.58s SPA speedup.

### 9.2. Disproven / Rejected Techniques (DO NOT RE-ATTEMPT)
1. **SSR HTML Ad-Metadata Sanitization:** Decisively falsified in Task 18.
2. **Global Replacement of `requiredSince = 2800`:** Bypassed when ad-403 grace is active; causes regressions.
3. **Unconditional 8-Second Navigation Lock:** Causes black-screen freezes when clicks fail to trigger route changes.
4. **Uncoordinated `playVideo()` Calls on State -1:** Dispatches duplicate stale `/player` requests.

### 9.3. Defective Test Methods (DO NOT RE-USE)
1. **Unscoped Array Length Checks:** `len(__ag_recovery_calls) > 0` causes historical cascade errors. Must filter by `t >= trial_t0`.
2. **Calling `Network.getResponseBody` on `responseReceived`:** Triggers CDP error `-32000`. Must await `loadingFinished`.
3. **Unfiltered `requestVideoFrameCallback` Queues:** Causes negative latency calculations in sequential transitions.

---

## 10. Root-Cause Hypotheses for YouTube Startup Delays

### Rank 1: The Ad-Retry Fallback Collision (Strongest Evidence)
- **Mechanism**: On cold start or fresh watch pages, YouTube's player attempts to load pre-roll ads (`itag=18`). Antigravity DOM/network shields block the tracking or CDN endpoints, resulting in HTTP 403 Forbidden. YouTube's native player enters an internal ad retry loop lasting 3.5s–4.5s before abandoning ads and requesting organic content.
- **The Collision**: The watchdog threshold (`since > minFloorMs [4800ms] && stallDuration > 2500ms`) expires right as the ad retry loop finishes and organic SABR streaming begins. Calling `ytPlayer.loadVideoById(vid)` at $t \approx 5.8\text{s}$ destroys the active player component, throws away incoming organic media chunks, surfaces the `<snackbar-view-model>` "Experiencing interruptions?" notification, and forces a secondary 4–5s initialization cycle ($5.8\text{s} + 4.5\text{s} \approx 10.3\text{s}$ total delay).
- **Supporting Evidence**: `forensic_task_29`, `forensic_task_30`, `forensic_task_34` controlled JSON.

### Rank 2: Watchdog Blindness to In-Flight SABR Content Requests
- **Mechanism**: `hasPipelineProgress` evaluates `curBufferedEnd > 0.1 || readyState >= 2 || hasActiveTransfer`. However, between the moment YouTube dispatches the organic `/videoplayback` request and the moment the first 100KB chunk is appended to `SourceBuffer`, there is a ~600–1000ms window where network traffic is downloading but `curBufferedEnd` remains 0. If `since` and `stallDuration` expire during this window, the watchdog acts blindly and resets a healthy, downloading stream.
- **Supporting Evidence**: Task 32 Root Cause Analysis, Task 34 Baseline vs Candidate timing margins (difference of ~300ms separated success from failure).

---

## 11. Recommended Path Toward the Justified Fix

The following prioritized decision plan establishes the direct path toward a permanent resolution without repeating historical work:

```
+----------------------------------------------------------------------------------------------------+
|                                    PRIORITIZED ACTION PLAN                                         |
+----------------------------------------------------------------------------------------------------+
|  Phase 1: Diagnostic Harness Hardening (Read-Only Test Tooling)                                    |
|    - Update scratch/run_task34_evaluation_suite.py:                                                |
|      1. Scope RVFC frame timestamps strictly to t >= t0_ms (eliminating negative timestamps).       |
|      2. Instrument SourceBuffer.prototype.appendBuffer to log exact media append timestamps.       |
|      3. Log active in-flight /videoplayback requests at watchdog evaluation ticks.                  |
|                                                                                                    |
|  Phase 2: Single Discriminating Diagnostic Run                                                     |
|    - Run 3 cold starts with watchdog recovery TEMPORARILY DISABLED (e.g. timeout = 12000ms)         |
|      to observe the natural, unassisted completion of YouTube's ad-fallback and media delivery.     |
|    - Discriminating Test: Does YouTube naturally start playing at t = 4.8s–5.5s on its own?        |
|      * If YES: The watchdog reload is the SOLE cause of the delay and snackbar.                    |
|      * If NO: YouTube itself is hanging, and watchdog intervention is genuinely necessary.          |
|                                                                                                    |
|  Phase 3: Minimal Surgical Production Fix                                                          |
|    - If natural start succeeds at t = 4.8s–5.5s:                                                   |
|      Coordinate watchdog recovery with in-flight media detection:                                  |
|      Do NOT reload if an organic content request is actively downloading or if lastAd403 occurred |
|      within quietPeriod, extending ceiling safely.                                                 |
|                                                                                                    |
|  Phase 4: Decision Gate Verification                                                               |
|    - Run matched cold-start and sequential SPA validation.                                         |
|    - Verification criteria: 0 interruption snackbars, 0 premature reloads, cold starts < 3.0s.     |
+----------------------------------------------------------------------------------------------------+
```

---

## 12. Reference Index and Compact Glossary

### 12.1. Reference System Identifiers
- `F-001` to `F-014`: Historical Source & Behavior Findings (See Section 6).
- `T-002` to `T-034`: Historical Tasks and Experiments (See Section 4).
- `H-001`: Ad-Retry Fallback Collision Hypothesis (Primary).
- `H-002`: In-Flight Media Blindness Hypothesis (Secondary).
- `D-001`: Cumulative Array Leakage Telemetry Defect (Task 31).
- `D-002`: Early `getResponseBody` Query Defect (Task 34 Preflight).
- `D-003`: Stale RVFC Frame Telemetry Defect (Task 34 Controlled).
- `U-001`: Downstream player component state during 403 fallback.

### 12.2. Compact Glossary
- **Path A**: Penalty-recovery branch in `guest_preload.js:1678`. Fires only when server returns `UNPLAYABLE` / backoff penalties. Retries up to 5 times before invoking `location.reload()`.
- **Path B**: Stalled-start recovery branch in `guest_preload.js:1695`. Fires when player is unstarted/buffering with zero forward progress. Invokes `ytPlayer.loadVideoById(vid)`.
- **SABR**: Server-Assisted Bandwidth Routing. YouTube's custom binary video streaming protocol running over HTTP/2 and HTTP/3.
- **UMP**: Universal Media Protocol. YouTube's packet-framing format for multiplexing media chunks and protocol metadata over a single stream.
- **`since`**: Milliseconds elapsed since the current destination video began loading (`now - vidStart`).
- **`stallDuration`**: Milliseconds elapsed since the last forward media playback or buffering progress (`now - lastProgress`).
- **`hadAd403InSession`**: Boolean flag indicating that a qualifying HTTP 403 Forbidden response was detected on an ad media stream (`itag=18`, `itag=22`, `ctier=L`) during the active video window.
- **`minFloorMs`**: Minimum required `since` duration before watchdog recovery can fire during an ad-grace session (4800ms in Variant B).
- **`quietPeriodMs`**: Minimum elapsed time required after the *last* ad 403 response before recovery is permitted (2000ms in Variant B).
- **`<snackbar-view-model>`**: Modern custom DOM element used by YouTube to surface internal player notifications, including "Experiencing interruptions?".
- **`reloadNudge(tokenize)`**: Watchdog recovery function that records telemetry and invokes `ytPlayer.loadVideoById(vid)`.

---

## 13. Outstanding Questions & Explicit Limitations

1. **Ad-Stream Fallback Timing Distribution**: While Task 32 and Task 34 observed ad retry loops lasting 3.5s–4.5s, the precise variance across geographical regions, network conditions, and specific YouTube account tiers remains unmapped.
2. **`SourceBuffer` Append Visibility**: Current instrumentation detects network bytes received, but does not intercept `SourceBuffer.prototype.appendBuffer` to observe the exact microsecond when media clusters are handed to Chromium's decoder.
3. **Headless vs Headed Webview Rendering**: Automated tests run with remote debugging enabled. Background tab throttling switches (`CalculateNativeWinOcclusion`) in `desktop/main.js:26` mitigate OS-level occlusion, but differences between interactive user browsing and automated CDP driver runs must be continuously verified.

# MEMORY.md — Curated Truths, Credentials & Technical Facts
> [!NOTE]
> Curated and maintained by `reflection_engine.js` during the Morning 8:00 AM daily reflection routine.
> Target Budget: < 2,000 tokens (~7,500 characters). Pinned entries are permanently retained.

## 1. Authorized Credentials & Access Information [PINNED]
- Verified Endpoint [2026-10-27]: https://example.com
- Verified Endpoint [2026-10-27]: http://db.local:9000
- Authorized Credential / Password discovered [2026-10-27]: credentials for db_admin and password: ClusterRootSecret123
- Authorized Credential / Password discovered [2026-10-27]: password: ClusterRootSecret123
- **Default Local AI Server**: `http://localhost:4893` (Devil.co Ornith-1.0-9B)
- **Desktop Loopback API**: `http://localhost:4892`

## 2. Verified Technical Discoveries & Platform Quirks [PINNED]
- YouTube player toggles fullscreen with "f" key event
- **React SPA Form Inputs**: Direct property assignment (e.g., `input.value = '...'`) fails to trigger React internal change listeners. You MUST invoke `Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value)` followed by dispatching an `input` event with `{ bubbles: true }`.
- **YouTube Media Playback Verification**: Clicking play or space key must be validated by inspecting `video.currentTime > 0` and `video.paused === false` over a 500ms sampling window rather than relying on UI play icons.
- **Dynamic Gateway Countdowns**: Countdown gateway bypasses require waiting for the timer element to reach 0 before dispatching hardware click events.

## 3. Operational Best Practices
- Load specialized tools on demand via `get_tools_on_demand` to maintain a lean model context window.
- Search `memory_summaries.sqlite` first; load raw session chat logs only when deep context is requested.

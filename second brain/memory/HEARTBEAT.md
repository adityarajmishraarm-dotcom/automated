# HEARTBEAT.md — Active Tasks, Checkpoints & Schedules
> [!NOTE]
> Checkpoint and status ledger for the browser session. Updated on task starts, milestones, and completions. Zero JSON checkpoint dependencies.

## 1. Scheduled Background Routines
- **Morning Reflection Cron**: Scheduled daily at `08:00:00` local time.
  - Next Run: Scheduled
  - Last Run: 2026-10-27T07:54:44.065Z (Processed: 10, Facts: 13, Archived: 0)

  - Last Run: 2026-10-27T07:50:57.919Z (Processed: 7, Facts: 9, Archived: 0)

  - Last Run: 2026-10-27T07:49:03.477Z (Processed: 5, Facts: 5, Archived: 0)

  - Target: Process unsummarized raw chat logs from past 24 hours
  - Output: Extract credentials/facts into `MEMORY.md` & index summaries into `memory_summaries.sqlite`
  - Retention Check: Archive raw sessions older than 90 days

## 2. Active Tasks & Checkpoints
- **Status**: Idle / Ready
- **Current Task**: None
- **Checkpoint Progress**: N/A
- **Last Clean Shutdown**: Clean (2026-10-27T10:06:48.548Z)

## 3. Pending Downloads & Async Jobs
- None

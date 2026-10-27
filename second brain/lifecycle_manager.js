/**
 * Lifecycle Manager (second brain/lifecycle_manager.js)
 * 
 * Coordinates the full Second Brain session lifecycle:
 * 1. onSessionStart(): Loads static KV prefix and detects interrupted tasks from HEARTBEAT.md.
 * 2. onPreCompact(): The PreCompact protocol - flushes uncompressed turns to daily/raw logs when context >= 75%.
 * 3. onSessionEnd(): Writes uncompressed interaction transcript to 90-day raw storage.
 * 4. onHeartbeatSchedule(): Schedules and triggers the Morning 8:00 AM reflection routine.
 * 5. Task Checkpointing: Saves and resumes active tasks in HEARTBEAT.md.
 */

const fs = require('fs');
const path = require('path');
const MemoryManager = require('./memory_manager');
const MemoryRetriever = require('./memory_retriever');
const SkillManager = require('./skill_manager');
const ContextManager = require('./context_manager');
const ReflectionEngine = require('./reflection_engine');

class LifecycleManager {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.memoryManager = options.memoryManager || new MemoryManager();
    this.memoryRetriever = options.memoryRetriever || new MemoryRetriever(this.memoryManager);
    this.skillManager = options.skillManager || new SkillManager();
    this.contextManager = options.contextManager || new ContextManager({ memoryManager: this.memoryManager });
    this.reflectionEngine = options.reflectionEngine || new ReflectionEngine({
      memoryManager: this.memoryManager,
      memoryRetriever: this.memoryRetriever,
      skillManager: this.skillManager
    });

    this.activeTask = null;
    this.cronTimer = null;
  }

  /**
   * Session Start Hook:
   * 1. Assembles static KV prefix (SOUL.md + USER.md + MEMORY.md).
   * 2. Checks HEARTBEAT.md for any interrupted tasks.
   * 3. Discovers available procedural skills with zero prompt bloat.
   * 
   * @returns {{ staticPrefix: string, interruptedTask: Object|null, skillsCount: number }}
   */
  onSessionStart() {
    const staticPrefix = this.contextManager.buildStaticPrefix();
    const interruptedTask = this.checkInterruptedTask();
    const skills = this.skillManager.listSkills();

    return {
      staticPrefix,
      interruptedTask,
      skillsCount: skills.length
    };
  }

  /**
   * Check HEARTBEAT.md for interrupted tasks from prior sessions.
   * @returns {{ taskId: string, task: string, checkpoint: string }|null}
   */
  checkInterruptedTask() {
    const hbPath = path.join(this.memoryManager.baseDir, 'HEARTBEAT.md');
    if (!fs.existsSync(hbPath)) return null;

    const content = fs.readFileSync(hbPath, 'utf8');
    const taskMatch = content.match(/- \*\*Current Task\*\*:\s*([^\n\r]+)/i);
    const statusMatch = content.match(/- \*\*Status\*\*:\s*([^\n\r]+)/i);
    const cpMatch = content.match(/- \*\*Checkpoint Progress\*\*:\s*([^\n\r]+)/i);

    if (taskMatch && statusMatch && !/none|idle|ready/i.test(taskMatch[1])) {
      const status = statusMatch[1].trim();
      if (/in progress|paused|interrupted/i.test(status)) {
        return {
          task: taskMatch[1].trim(),
          status,
          checkpoint: cpMatch ? cpMatch[1].trim() : 'Step 1'
        };
      }
    }
    return null;
  }

  /**
   * Checkpoint an active task to HEARTBEAT.md.
   * @param {string} taskName 
   * @param {string} checkpointDetails 
   * @param {string} [status='In Progress']
   */
  checkpointTask(taskName, checkpointDetails, status = 'In Progress') {
    const hbPath = path.join(this.memoryManager.baseDir, 'HEARTBEAT.md');
    let content = fs.existsSync(hbPath) ? fs.readFileSync(hbPath, 'utf8') : '# HEARTBEAT.md\n';

    this.activeTask = { task: taskName, checkpoint: checkpointDetails, status };

    // Update section 2 of HEARTBEAT.md
    const newSection = `## 2. Active Tasks & Checkpoints\n- **Status**: ${status}\n- **Current Task**: ${taskName}\n- **Checkpoint Progress**: ${checkpointDetails}\n- **Last Checkpoint**: ${new Date().toISOString()}`;
    
    if (content.includes('## 2. Active Tasks & Checkpoints')) {
      content = content.replace(/## 2\. Active Tasks & Checkpoints[\s\S]*?(?=## 3|$)/, `${newSection}\n\n`);
    } else {
      content += `\n\n${newSection}\n`;
    }

    this.memoryManager.atomicWriteFile(hbPath, content);
  }

  /**
   * Clear active task in HEARTBEAT.md upon task completion.
   */
  clearActiveTask() {
    this.activeTask = null;
    const hbPath = path.join(this.memoryManager.baseDir, 'HEARTBEAT.md');
    if (!fs.existsSync(hbPath)) return;

    let content = fs.readFileSync(hbPath, 'utf8');
    const newSection = `## 2. Active Tasks & Checkpoints\n- **Status**: Idle / Ready\n- **Current Task**: None\n- **Checkpoint Progress**: N/A\n- **Last Clean Shutdown**: Clean (${new Date().toISOString()})`;

    content = content.replace(/## 2\. Active Tasks & Checkpoints[\s\S]*?(?=## 3|$)/, `${newSection}\n\n`);
    this.memoryManager.atomicWriteFile(hbPath, content);
  }

  /**
   * PreCompact Hook:
   * Flushes interaction buffer to disk and compresses working context.
   * 
   * @param {Object} params
   * @param {string} params.sessionId
   * @param {string} params.goal
   * @param {Array<{ role: string, content: string }>} params.allTurns
   * @returns {{ compactedTurns: Array<Object>, flushedPath: string }}
   */
  onPreCompact(params) {
    return this.contextManager.onPreCompact(params);
  }

  /**
   * Session End Hook:
   * Flushes full uncompressed transcript to raw/YYYY-MM-DD/session_<id>.md (90-day retention).
   * 
   * @param {string} sessionId
   * @param {Array<{ role: string, content: string }>} turns
   * @param {string} [title]
   * @returns {string} Relative path to raw session file
   */
  onSessionEnd(sessionId, turns, title = 'Browser Automation Session') {
    this.clearActiveTask();
    return this.memoryManager.writeRawSession(sessionId, turns, title);
  }

  /**
   * Start the recurring 8:00 AM Morning Reflection schedule.
   * Computes ms until next 08:00:00 local time and arms a recurring timer.
   * 
   * @param {Function} [onComplete] Callback when reflection finishes
   */
  startMorningCron(onComplete) {
    if (this.cronTimer) return;

    const scheduleNext8AM = () => {
      const now = new Date();
      const next8AM = new Date();
      next8AM.setHours(8, 0, 0, 0);

      if (now.getTime() >= next8AM.getTime()) {
        // Today's 8:00 AM already passed, schedule for tomorrow
        next8AM.setDate(next8AM.getDate() + 1);
      }

      const msUntil8AM = next8AM.getTime() - now.getTime();
      console.log(`[LifecycleManager] Next Morning 8:00 AM Reflection scheduled in ${Math.round(msUntil8AM / 1000 / 60)} minutes.`);

      this.cronTimer = setTimeout(async () => {
        console.log('[LifecycleManager] Executing Morning 8:00 AM Reflection Routine...');
        try {
          const result = this.reflectionEngine.runMorningReflection();
          console.log('[LifecycleManager] Morning Reflection Complete:', result);
          if (typeof onComplete === 'function') onComplete(result);
        } catch (e) {
          console.error('[LifecycleManager] Morning Reflection Failed:', e);
        }
        // Reschedule for next day
        this.cronTimer = null;
        scheduleNext8AM();
      }, msUntil8AM);
    };

    scheduleNext8AM();
  }

  /**
   * Stop the recurring cron schedule.
   */
  stopMorningCron() {
    if (this.cronTimer) {
      clearTimeout(this.cronTimer);
      this.cronTimer = null;
    }
  }
}

module.exports = LifecycleManager;

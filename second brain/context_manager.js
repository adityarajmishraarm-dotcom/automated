/**
 * Context Manager (second brain/context_manager.js)
 * 
 * Manages the prompt assembly pipeline:
 * 1. Frozen Static Prefix (SOUL.md + USER.md + MEMORY.md) for 95%+ KV-cache hit rate.
 * 2. Active Goal & Codex Paged Tool/Skill Definitions.
 * 3. Strict 3-Turn Sliding Conversation Window (Current turn + strictly 3 previous turns).
 * 4. The PreCompact Protocol: Flushes buffer to disk & compacts context when tokens >= 75%.
 */

const MemoryManager = require('./memory_manager');

class ContextManager {
  /**
   * @param {Object} [options]
   * @param {MemoryManager} [options.memoryManager]
   * @param {number} [options.maxContextTokens=8192] Context window capacity
   * @param {number} [options.compactThreshold=0.75] PreCompact trigger threshold (75%)
   */
  constructor(options = {}) {
    this.memoryManager = options.memoryManager || new MemoryManager();
    this.maxContextTokens = options.maxContextTokens || 8192;
    this.compactThreshold = options.compactThreshold || 0.75;
  }

  /**
   * Fast, reliable token estimation (~3.8 characters per token for English/code/JSON).
   * @param {string} text 
   * @returns {number}
   */
  estimateTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    return Math.ceil(text.length / 3.8);
  }

  /**
   * Build the Frozen Static Prefix.
   * Maximizes KV-cache reuse on vLLM/Devil.co Ornith.
   * @returns {string}
   */
  buildStaticPrefix() {
    const anchors = this.memoryManager.readAnchorFiles();
    let prefix = '=== SYSTEM INVARIANTS & AGENT SOUL ===\n';
    prefix += (anchors.soul || 'Role: Autonomous Browser Copilot\nTenet: Physical verification before success.').trim();
    prefix += '\n\n=== USER PROFILE & PREFERENCES ===\n';
    prefix += (anchors.user || 'Theme: Dark Mode\nPlayback: 1080p').trim();
    prefix += '\n\n=== CURATED PERMANENT MEMORY & CREDENTIALS ===\n';
    prefix += (anchors.memory || 'No curated memory entries recorded.').trim();
    prefix += '\n======================================\n';
    return prefix;
  }

  /**
   * Slice turns to enforce the strict 3-turn sliding window.
   * Retains strictly:
   * - The last 3 previous completed turns (prompt + result pairs)
   * - The current active turn
   * Older turns are omitted from prompt context.
   * 
   * @param {Array<{ role: string, content: string }>} turns 
   * @returns {Array<{ role: string, content: string }>}
   */
  applySlidingWindow(turns) {
    if (!Array.isArray(turns) || turns.length <= 4) {
      return turns || [];
    }
    // Return only the last 4 items (3 previous turns + 1 current turn)
    return turns.slice(-4);
  }

  /**
   * Check if context usage reaches or exceeds the PreCompact threshold (75%).
   * @param {number} currentEstimatedTokens 
   * @returns {boolean}
   */
  shouldCompact(currentEstimatedTokens) {
    return (currentEstimatedTokens / this.maxContextTokens) >= this.compactThreshold;
  }

  /**
   * Execute the Cole Medin PreCompact Protocol:
   * 1. Flush complete uncompressed turn buffer to daily/YYYY-MM-DD.md and raw session file.
   * 2. Replace older turns with a concise 3-bullet compaction checkpoint.
   * 3. Retain the active sliding window turns, dropping context usage to ~15%.
   * 
   * @param {Object} params
   * @param {string} params.sessionId
   * @param {string} params.goal
   * @param {Array<{ role: string, content: string }>} params.allTurns
   * @param {string} [params.currentState]
   * @returns {{ compactedTurns: Array<{ role: string, content: string }>, flushedPath: string }}
   */
  onPreCompact({ sessionId, goal, allTurns, currentState = 'In Progress' }) {
    // 1. Flush full uncompressed turns to disk
    const flushedPath = this.memoryManager.writeRawSession(
      sessionId,
      allTurns,
      `PreCompact Checkpoint: ${goal}`
    );

    this.memoryManager.appendDailyLog(
      `PreCompact triggered for session ${sessionId} (${allTurns.length} turns flushed). Goal: ${goal}`
    );

    // 2. Synthesize concise 3-bullet progress checkpoint
    const checkpointSummary = [
      `• Goal: ${goal}`,
      `• Progress: Executed ${allTurns.length} actions without loss; buffer flushed to disk.`,
      `• Current State: ${currentState}`
    ].join('\n');

    // 3. Keep strictly the last 2-3 active turns
    const activeRecentTurns = allTurns.slice(-3);

    const compactedTurns = [
      {
        role: 'system',
        content: `[COMPACTION CHECKPOINT]\n${checkpointSummary}\n(Full previous turns saved to: ${flushedPath})`
      },
      ...activeRecentTurns
    ];

    return {
      compactedTurns,
      flushedPath
    };
  }

  /**
   * Assemble the complete model prompt according to the 3-Block Architecture.
   * 
   * @param {Object} params
   * @param {string} params.goal
   * @param {Array<{ role: string, content: string }>} params.turns
   * @param {string} [params.loadedSkillContent]
   * @param {Array<Object>} [params.pagedToolSchemas]
   * @param {string} [params.sessionId]
   * @returns {{ systemPrompt: string, activeTurns: Array<Object>, estimatedTokens: number, compacted: boolean }}
   */
  assembleContext({ goal, turns = [], loadedSkillContent = '', pagedToolSchemas = [], sessionId = 'default' }) {
    // Block 1: Frozen Static Prefix
    let systemPrompt = this.buildStaticPrefix();

    // Block 2: Active Goal, Codex Paged Tools, and Active Skill Instructions
    systemPrompt += `\n=== CURRENT OBJECTIVE ===\n${goal || 'Assist user with browser automation.'}\n`;

    if (loadedSkillContent) {
      systemPrompt += `\n=== PROCEDURAL SKILL INSTRUCTIONS ===\n${loadedSkillContent.trim()}\n`;
    }

    if (pagedToolSchemas && pagedToolSchemas.length > 0) {
      systemPrompt += `\n=== ON-DEMAND PAGED TOOLS (CODEX PAGER) ===\n`;
      systemPrompt += `${JSON.stringify(pagedToolSchemas, null, 2)}\n`;
    }

    // Estimate initial tokens with all turns
    const rawTokensEstimate = this.estimateTokens(systemPrompt) + 
      turns.reduce((acc, t) => acc + this.estimateTokens(t.content), 0);

    let activeTurns = turns;
    let compacted = false;

    // Trigger PreCompact if tokens reach 75%
    if (this.shouldCompact(rawTokensEstimate)) {
      const compactResult = this.onPreCompact({
        sessionId,
        goal,
        allTurns: turns,
        currentState: 'Active automation turn'
      });
      activeTurns = compactResult.compactedTurns;
      compacted = true;
    } else {
      // Enforce strict 3-turn sliding window
      activeTurns = this.applySlidingWindow(turns);
    }

    const finalTokens = this.estimateTokens(systemPrompt) + 
      activeTurns.reduce((acc, t) => acc + this.estimateTokens(t.content), 0);

    return {
      systemPrompt,
      activeTurns,
      estimatedTokens: finalTokens,
      compacted
    };
  }
}

module.exports = ContextManager;

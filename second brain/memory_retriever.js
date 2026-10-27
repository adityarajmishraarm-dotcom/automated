/**
 * Memory Retriever (second brain/memory_retriever.js)
 * 
 * Provides sub-millisecond SQLite session summary search,
 * Markdown anchor inspection with category weighting,
 * and secure on-demand retrieval of full 90-day uncompressed raw chat transcripts.
 */

const fs = require('fs');
const path = require('path');
const MemoryManager = require('./memory_manager');

class MemoryRetriever {
  /**
   * @param {MemoryManager} [memoryManager] 
   */
  constructor(memoryManager) {
    this.memoryManager = memoryManager || new MemoryManager();
    this.baseDir = this.memoryManager.baseDir;
    this.rawDir = this.memoryManager.rawDir;
  }

  /**
   * Fast SQLite search across session summaries.
   * @param {string} query 
   * @param {number} [limit=5] 
   * @returns {Array<Object>}
   */
  searchSummaries(query, limit = 5) {
    if (!query || !query.trim()) {
      const stmt = this.memoryManager.db.prepare(`
        SELECT session_id, date, timestamp, title, summary, key_entities, file_path
        FROM session_summaries
        ORDER BY date DESC, timestamp DESC
        LIMIT ?
      `);
      return stmt.all(limit);
    }

    const pattern = `%${query.trim()}%`;
    const stmt = this.memoryManager.db.prepare(`
      SELECT session_id, date, timestamp, title, summary, key_entities, file_path
      FROM session_summaries
      WHERE title LIKE ? OR summary LIKE ? OR key_entities LIKE ? OR session_id LIKE ?
      ORDER BY date DESC, timestamp DESC
      LIMIT ?
    `);
    return stmt.all(pattern, pattern, pattern, pattern, limit);
  }

  /**
   * Fetch complete, uncompressed raw chat transcript for a session on demand.
   * Ensures that "every ounce of memory that can't make it to MEMORY.md or summary will not be lost".
   * Includes path canonicalization to prevent directory traversal.
   * @param {string} sessionId 
   * @returns {{ sessionId: string, found: boolean, content?: string, filePath?: string, error?: string }}
   */
  readRawSession(sessionId) {
    if (!sessionId || typeof sessionId !== 'string') {
      return { sessionId, found: false, error: 'Invalid session ID' };
    }

    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');

    // 1. Check if SQLite has recorded file_path
    const stmt = this.memoryManager.db.prepare(`
      SELECT file_path FROM session_summaries WHERE session_id = ? LIMIT 1
    `);
    const record = stmt.get(safeSessionId);

    let targetFilePath = null;
    if (record && record.file_path) {
      targetFilePath = path.resolve(this.baseDir, record.file_path);
    } else {
      // 2. Search raw directory recursively for session_<id>.md
      const fileName = `session_${safeSessionId}.md`;
      const searchRaw = (dir) => {
        if (!fs.existsSync(dir)) return null;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const found = searchRaw(fullPath);
            if (found) return found;
          } else if (entry.name === fileName) {
            return fullPath;
          }
        }
        return null;
      };
      targetFilePath = searchRaw(this.rawDir);
    }

    if (!targetFilePath || !fs.existsSync(targetFilePath)) {
      return { sessionId, found: false, error: `Raw session transcript not found for ID: ${safeSessionId}` };
    }

    // Security check: ensure targetFilePath is within baseDir
    const canonicalBase = fs.realpathSync(this.baseDir);
    const canonicalTarget = fs.realpathSync(targetFilePath);
    if (!canonicalTarget.startsWith(canonicalBase)) {
      return { sessionId, found: false, error: 'Access denied: Directory traversal violation' };
    }

    const content = fs.readFileSync(canonicalTarget, 'utf8');
    return {
      sessionId: safeSessionId,
      found: true,
      filePath: path.relative(this.baseDir, canonicalTarget),
      content
    };
  }

  /**
   * Search within the curated Markdown anchor files (USER.md and MEMORY.md).
   * @param {string} query 
   * @returns {Array<{ source: string, category: string, snippet: string, score: number }>}
   */
  searchAnchorContent(query) {
    if (!query || !query.trim()) return [];
    const normalized = query.toLowerCase().trim();
    const tokens = normalized.split(/\s+/).filter(Boolean);
    const results = [];

    const anchors = this.memoryManager.readAnchorFiles();

    // 1. Search USER.md
    if (anchors.user) {
      const lines = anchors.user.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('-')) {
          const lower = trimmed.toLowerCase();
          const matchCount = tokens.filter(t => lower.includes(t)).length;
          if (matchCount > 0) {
            results.push({
              source: 'USER.md',
              category: '[USER_PREFERENCE]',
              snippet: trimmed.replace(/^-+\s*/, ''),
              score: matchCount * 1.5
            });
          }
        }
      }
    }

    // 2. Search MEMORY.md
    if (anchors.memory) {
      const lines = anchors.memory.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('-')) {
          const lower = trimmed.toLowerCase();
          const matchCount = tokens.filter(t => lower.includes(t)).length;
          if (matchCount > 0) {
            const isQuirk = lower.includes('react') || lower.includes('youtube') || lower.includes('countdown');
            results.push({
              source: 'MEMORY.md',
              category: isQuirk ? '[TECHNICAL_QUIRK]' : '[VERIFIED_FACT]',
              snippet: trimmed.replace(/^-+\s*/, ''),
              score: matchCount * 2.0
            });
          }
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Unified memory search interface.
   * Returns matching facts from anchors and structured summaries from SQLite.
   * @param {Object} options
   * @param {string} options.query Search terms
   * @param {boolean} [options.includeSummaries=true] Whether to search SQLite session summaries
   * @param {boolean} [options.includeAnchors=true] Whether to search USER.md and MEMORY.md
   * @param {number} [options.limit=5] Max summary results
   * @returns {{ facts: Array<Object>, summaries: Array<Object> }}
   */
  searchMemory({ query, includeSummaries = true, includeAnchors = true, limit = 5 }) {
    const facts = includeAnchors ? this.searchAnchorContent(query) : [];
    const summaries = includeSummaries ? this.searchSummaries(query, limit) : [];

    return {
      query,
      facts,
      summaries
    };
  }
}

module.exports = MemoryRetriever;

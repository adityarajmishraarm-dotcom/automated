/**
 * Memory Manager (second brain/memory_manager.js)
 * 
 * Core storage layer for the Antigravity AI Second Brain.
 * Provides safe atomic Markdown writes, SQLite summary indexing,
 * and automated 90-day raw transcript retention and archiving.
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

class MemoryManager {
  /**
   * @param {string} [customBaseDir] Optional custom base directory for memory storage
   */
  constructor(customBaseDir) {
    if (customBaseDir) {
      this.baseDir = path.resolve(customBaseDir);
    } else {
      // Default to the dedicated 'memory/' folder alongside this module
      this.baseDir = path.resolve(__dirname, 'memory');
    }

    this.rawDir = path.join(this.baseDir, 'raw');
    this.dailyDir = path.join(this.baseDir, 'daily');
    this.archiveDir = path.join(this.baseDir, 'archive');
    this.sqlitePath = path.join(this.baseDir, 'memory_summaries.sqlite');

    this.ensureDirectoryStructure();
    this.initDatabase();
  }

  /**
   * Ensure all required memory directories exist.
   */
  ensureDirectoryStructure() {
    const dirs = [this.baseDir, this.rawDir, this.dailyDir, this.archiveDir];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Initialize local SQLite database for fast session summary indexing.
   */
  initDatabase() {
    this.db = new DatabaseSync(this.sqlitePath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        date TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        key_entities TEXT,
        file_path TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_summaries_date ON session_summaries(date);
      CREATE INDEX IF NOT EXISTS idx_summaries_title ON session_summaries(title);
    `);
  }

  /**
   * Safely write content to a file atomically via a temporary file.
   * @param {string} filePath 
   * @param {string} content 
   */
  atomicWriteFile(filePath, content) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
    fs.writeFileSync(tmpPath, content, 'utf8');
    fs.renameSync(tmpPath, filePath);
  }

  /**
   * Get the absolute paths to the 4 permanent anchor Markdown files.
   */
  getAnchorPaths() {
    return {
      soul: path.join(this.baseDir, 'SOUL.md'),
      user: path.join(this.baseDir, 'USER.md'),
      memory: path.join(this.baseDir, 'MEMORY.md'),
      heartbeat: path.join(this.baseDir, 'HEARTBEAT.md'),
    };
  }

  /**
   * Read all anchor files. If a file doesn't exist, an empty string or default is returned.
   * @returns {{ soul: string, user: string, memory: string, heartbeat: string }}
   */
  readAnchorFiles() {
    const paths = this.getAnchorPaths();
    const result = { soul: '', user: '', memory: '', heartbeat: '' };
    for (const [key, filePath] of Object.entries(paths)) {
      if (fs.existsSync(filePath)) {
        result[key] = fs.readFileSync(filePath, 'utf8');
      }
    }
    return result;
  }

  /**
   * Append or update a user preference in USER.md.
   * @param {string} preference 
   */
  updateUserPreference(preference) {
    const userPath = path.join(this.baseDir, 'USER.md');
    let content = fs.existsSync(userPath) ? fs.readFileSync(userPath, 'utf8') : '# USER.md\n';
    
    // Check if preference already exists
    if (!content.includes(preference.trim())) {
      const sectionHeader = '## 3. Verified Behavioral Preferences';
      if (content.includes(sectionHeader)) {
        content = content.replace(sectionHeader, `${sectionHeader}\n- ${preference.trim()}`);
      } else {
        content += `\n${sectionHeader}\n- ${preference.trim()}\n`;
      }
      this.atomicWriteFile(userPath, content);
    }
  }

  /**
   * Remove a user preference matching a keyword from USER.md.
   * @param {string} query 
   * @returns {boolean} Whether a line was removed
   */
  removeUserPreference(query) {
    const userPath = path.join(this.baseDir, 'USER.md');
    if (!fs.existsSync(userPath)) return false;

    const content = fs.readFileSync(userPath, 'utf8');
    const lines = content.split('\n');
    const normalizedQuery = query.toLowerCase().trim();
    let removed = false;

    const filtered = lines.filter((line) => {
      if (line.trim().startsWith('-') && line.toLowerCase().includes(normalizedQuery)) {
        removed = true;
        return false;
      }
      return true;
    });

    if (removed) {
      this.atomicWriteFile(userPath, filtered.join('\n'));
    }
    return removed;
  }

  /**
   * Append a curated fact or credential to MEMORY.md.
   * @param {string} fact 
   * @param {string} [section] Section to append to
   */
  appendMemoryFact(fact, section = '## 2. Verified Technical Discoveries & Platform Quirks [PINNED]') {
    const memPath = path.join(this.baseDir, 'MEMORY.md');
    let content = fs.existsSync(memPath) ? fs.readFileSync(memPath, 'utf8') : '# MEMORY.md\n';

    if (!content.includes(fact.trim())) {
      if (content.includes(section)) {
        content = content.replace(section, `${section}\n- ${fact.trim()}`);
      } else {
        content += `\n${section}\n- ${fact.trim()}\n`;
      }
      this.atomicWriteFile(memPath, content);
      this.pruneMemoryBudget();
    }
  }

  /**
   * Prune MEMORY.md when token limit exceeds ~2,000 tokens (~7,500 characters).
   * Pinned sections are permanently retained; unpinned sections are trimmed.
   * @param {number} [maxChars]
   */
  pruneMemoryBudget(maxChars = 7500) {
    const memPath = path.join(this.baseDir, 'MEMORY.md');
    if (!fs.existsSync(memPath)) return;

    let content = fs.readFileSync(memPath, 'utf8');
    if (content.length <= maxChars) return;

    const sections = content.split(/^## /m);
    const retainedSections = [];
    let currentLength = 0;

    for (const sec of sections) {
      if (!sec.trim()) continue;
      const isPinned = sec.includes('[PINNED]');
      if (isPinned) {
        retainedSections.push(`## ${sec}`);
        currentLength += sec.length;
      } else if (currentLength + sec.length <= maxChars) {
        retainedSections.push(`## ${sec}`);
        currentLength += sec.length;
      }
    }

    this.atomicWriteFile(memPath, retainedSections.join('\n'));
  }

  /**
   * Append an activity block to daily/YYYY-MM-DD.md.
   * @param {string} content 
   * @param {string} [dateStr] YYYY-MM-DD
   */
  appendDailyLog(content, dateStr) {
    const today = dateStr || new Date().toISOString().split('T')[0];
    const dailyPath = path.join(this.dailyDir, `${today}.md`);
    let existing = fs.existsSync(dailyPath) ? fs.readFileSync(dailyPath, 'utf8') : `# Daily Log: ${today}\n\n`;
    existing += `\n### [${new Date().toLocaleTimeString()}]\n${content.trim()}\n`;
    this.atomicWriteFile(dailyPath, existing);
  }

  /**
   * Write a full uncompressed raw interaction transcript to raw/YYYY-MM-DD/session_<id>.md.
   * @param {string} sessionId 
   * @param {Array<{ role: string, content: string, timestamp?: string }>} turns 
   * @param {string} [title] 
   * @returns {string} Relative file path to the raw session file
   */
  writeRawSession(sessionId, turns, title = 'Browser Automation Session') {
    const today = new Date().toISOString().split('T')[0];
    const sessionDir = path.join(this.rawDir, today);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(sessionDir, `session_${safeSessionId}.md`);

    let md = `# Raw Session Transcript: ${safeSessionId}\n`;
    md += `- **Date**: ${today}\n`;
    md += `- **Timestamp**: ${new Date().toISOString()}\n`;
    md += `- **Title**: ${title}\n`;
    md += `\n---\n\n`;

    if (typeof turns === 'string') {
      md += turns;
    } else if (Array.isArray(turns)) {
      for (const [idx, turn] of turns.entries()) {
        if (typeof turn === 'string') {
          md += `### Turn ${idx + 1}\n${turn}\n\n`;
        } else {
          md += `### Turn ${idx + 1} [${turn.role || 'unknown'}]\n`;
          if (turn.timestamp) md += `*Time: ${turn.timestamp}*\n\n`;
          md += `${turn.content || JSON.stringify(turn)}\n\n`;
        }
      }
    }

    this.atomicWriteFile(filePath, md);
    return path.relative(this.baseDir, filePath);
  }

  /**
   * Insert or update a session summary record in SQLite.
   * @param {Object} summaryData 
   */
  insertOrUpdateSummary({ session_id, date, timestamp, title, summary, key_entities, file_path }) {
    const stmt = this.db.prepare(`
      INSERT INTO session_summaries (session_id, date, timestamp, title, summary, key_entities, file_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        title = excluded.title,
        summary = excluded.summary,
        key_entities = excluded.key_entities,
        file_path = excluded.file_path,
        timestamp = excluded.timestamp
    `);
    stmt.run(
      session_id,
      date || new Date().toISOString().split('T')[0],
      timestamp || new Date().toISOString(),
      title || 'Untitled Session',
      summary || '',
      Array.isArray(key_entities) ? key_entities.join(', ') : (key_entities || ''),
      file_path || ''
    );
  }

  /**
   * Archive raw session folders older than maxDays (default: 90 days).
   * Moves expired directories from raw/ to archive/.
   * @param {number} [maxDays] Default: 90
   * @returns {number} Count of archived folders
   */
  archiveExpiredRawSessions(maxDays = 90) {
    if (!fs.existsSync(this.rawDir)) return 0;
    const now = Date.now();
    const cutoffMs = maxDays * 24 * 60 * 60 * 1000;
    const dateFolders = fs.readdirSync(this.rawDir);
    let archivedCount = 0;

    for (const folder of dateFolders) {
      const folderPath = path.join(this.rawDir, folder);
      if (!fs.statSync(folderPath).isDirectory()) continue;

      // Expecting YYYY-MM-DD
      const folderDate = new Date(folder);
      if (isNaN(folderDate.getTime())) continue;

      const ageMs = now - folderDate.getTime();
      if (ageMs > cutoffMs) {
        const destPath = path.join(this.archiveDir, folder);
        if (fs.existsSync(destPath)) {
          // Merge files if archive folder already exists
          const files = fs.readdirSync(folderPath);
          for (const file of files) {
            fs.renameSync(path.join(folderPath, file), path.join(destPath, file));
          }
          fs.rmdirSync(folderPath);
        } else {
          fs.renameSync(folderPath, destPath);
        }
        archivedCount++;
      }
    }

    return archivedCount;
  }
}

module.exports = MemoryManager;

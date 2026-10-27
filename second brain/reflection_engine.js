/**
 * Reflection Engine (second brain/reflection_engine.js)
 * 
 * Implements:
 * 1. Morning 8:00 AM Daily Reflection Routine:
 *    - Scans unsummarized raw transcripts from the past 24 hours.
 *    - Extracts passwords, credentials, login endpoints, and preferences into MEMORY.md and USER.md.
 *    - Generates structured 3-5 line summaries and indexes them into memory_summaries.sqlite.
 *    - Archives raw chats older than 90 days.
 * 2. The Hermes /learn Subroutine:
 *    - Extracts successful trajectories from raw session logs.
 *    - Strips mistakes, dead ends, and retries.
 *    - Synthesizes clean reusable procedural recipes in `skills/<skill_name>/SKILL.md`.
 * 3. Fast-Path Slash Commands:
 *    - /remember, /forget, /learn, /memory
 */

const fs = require('fs');
const path = require('path');
const MemoryManager = require('./memory_manager');
const MemoryRetriever = require('./memory_retriever');
const SkillManager = require('./skill_manager');

class ReflectionEngine {
  /**
   * @param {Object} [options]
   * @param {MemoryManager} [options.memoryManager]
   * @param {MemoryRetriever} [options.memoryRetriever]
   * @param {SkillManager} [options.skillManager]
   */
  constructor(options = {}) {
    this.memoryManager = options.memoryManager || new MemoryManager();
    this.memoryRetriever = options.memoryRetriever || new MemoryRetriever(this.memoryManager);
    this.skillManager = options.skillManager || new SkillManager();
  }

  /**
   * Extract passwords, credentials, and important details from transcript text.
   * @param {string} content 
   * @returns {{ passwords: Array<string>, endpoints: Array<string>, preferences: Array<string> }}
   */
  extractImportantInfo(content) {
    const passwords = [];
    const endpoints = [];
    const preferences = [];

    // Pattern 1: Passwords / API keys / Credentials
    const credPatterns = [
      /(?:password|passwd|pwd|secret|auth_token|api_key)[\s:=]+([^\s,;]+)/gi,
      /(?:login credentials?|credentials for)\s+([^\n\r]+)/gi
    ];
    for (const pattern of credPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const item = match[0].trim();
        if (!passwords.includes(item)) passwords.push(item);
      }
    }

    // Pattern 2: Endpoints & Ports
    const urlPattern = /https?:\/\/[a-zA-Z0-9.-]+(?::[0-9]+)?(?:\/[^\s]*)?/gi;
    let urlMatch;
    while ((urlMatch = urlPattern.exec(content)) !== null) {
      const url = urlMatch[0].trim().replace(/[.,;:)]+$/, '');
      if (!endpoints.includes(url)) endpoints.push(url);
    }

    // Pattern 3: Explicit User Preferences
    const prefPattern = /(?:I prefer|always use|always set|set default to|set default|remember to)\s+([^\n\r.]+)/gi;
    let prefMatch;
    while ((prefMatch = prefPattern.exec(content)) !== null) {
      const pref = prefMatch[0].trim();
      if (!preferences.includes(pref)) preferences.push(pref);
    }

    return { passwords, endpoints, preferences };
  }

  /**
   * Synthesize a structured 3-5 line session summary.
   * @param {string} sessionId 
   * @param {string} rawContent 
   * @returns {{ title: string, summary: string, key_entities: Array<string> }}
   */
  synthesizeSessionSummary(sessionId, rawContent) {
    const lines = rawContent.split('\n');
    let title = `Automation Session ${sessionId}`;
    
    // Look for Title in header
    for (const line of lines) {
      if (line.startsWith('- **Title**:')) {
        title = line.replace('- **Title**:', '').trim();
        break;
      }
    }

    const turns = rawContent.split(/### Turn \d+/).slice(1);
    const turnCount = turns.length;
    const keyEntities = [];

    // Extract domains/URLs as key entities
    const urls = rawContent.match(/https?:\/\/[a-zA-Z0-9.-]+/gi) || [];
    for (const u of urls) {
      const domain = u.replace(/https?:\/\//, '');
      if (!keyEntities.includes(domain)) keyEntities.push(domain);
    }

    const summary = [
      `Executed ${turnCount} autonomous browser turns for: ${title}.`,
      `Key interactions: ${keyEntities.length > 0 ? keyEntities.join(', ') : 'Standard navigation & verification'}.`,
      `Session transcript preserved in full for 90 days.`
    ].join('\n');

    return {
      title,
      summary,
      key_entities: keyEntities
    };
  }

  /**
   * Run the Morning 8:00 AM Daily Reflection Routine.
   * 1. Finds all unsummarized raw session transcripts from the past 24 hours.
   * 2. Extracts passwords/credentials/preferences to MEMORY.md and USER.md.
   * 3. Inserts structured session summaries into SQLite.
   * 4. Archives sessions older than 90 days.
   * 
   * @param {Object} [options]
   * @param {boolean} [options.force=false]
   * @returns {{ processedCount: number, extractedFactsCount: number, archivedCount: number }}
   */
  runMorningReflection(options = {}) {
    const rawDir = this.memoryManager.rawDir;
    let processedCount = 0;
    let extractedFactsCount = 0;

    if (!fs.existsSync(rawDir)) {
      return { processedCount: 0, extractedFactsCount: 0, archivedCount: 0 };
    }

    // Scan date folders in raw/
    const dateFolders = fs.readdirSync(rawDir);
    for (const folder of dateFolders) {
      const folderPath = path.join(rawDir, folder);
      if (!fs.statSync(folderPath).isDirectory()) continue;

      const sessionFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.md'));
      for (const file of sessionFiles) {
        const filePath = path.join(folderPath, file);
        const sessionId = file.replace(/^session_|\.md$/g, '');

        // Check if SQLite already indexed this session
        const existing = this.memoryRetriever.searchSummaries(sessionId, 1);
        const alreadyIndexed = existing.some(e => e.session_id === sessionId);

        if (!alreadyIndexed || options.force) {
          const rawContent = fs.readFileSync(filePath, 'utf8');

          // 1. Extract important information (passwords, credentials, endpoints)
          const extracted = this.extractImportantInfo(rawContent);

          for (const pwd of extracted.passwords) {
            this.memoryManager.appendMemoryFact(
              `Authorized Credential / Password discovered [${folder}]: ${pwd}`,
              '## 1. Authorized Credentials & Access Information [PINNED]'
            );
            extractedFactsCount++;
          }

          for (const ep of extracted.endpoints) {
            this.memoryManager.appendMemoryFact(
              `Verified Endpoint [${folder}]: ${ep}`,
              '## 1. Authorized Credentials & Access Information [PINNED]'
            );
            extractedFactsCount++;
          }

          for (const pref of extracted.preferences) {
            this.memoryManager.updateUserPreference(pref);
            extractedFactsCount++;
          }

          // 2. Synthesize summary and insert into SQLite
          const summaryData = this.synthesizeSessionSummary(sessionId, rawContent);
          this.memoryManager.insertOrUpdateSummary({
            session_id: sessionId,
            date: folder,
            timestamp: new Date().toISOString(),
            title: summaryData.title,
            summary: summaryData.summary,
            key_entities: summaryData.key_entities,
            file_path: path.relative(this.memoryManager.baseDir, filePath)
          });

          processedCount++;
        }
      }
    }

    // 3. Archive raw transcripts older than 90 days
    const archivedCount = this.memoryManager.archiveExpiredRawSessions(90);

    // 4. Update HEARTBEAT.md status
    const heartbeatPath = path.join(this.memoryManager.baseDir, 'HEARTBEAT.md');
    if (fs.existsSync(heartbeatPath)) {
      let hb = fs.readFileSync(heartbeatPath, 'utf8');
      const nowStr = new Date().toISOString();
      const runLog = `- Last Run: ${nowStr} (Processed: ${processedCount}, Facts: ${extractedFactsCount}, Archived: ${archivedCount})\n`;
      if (hb.includes('- Next Run: Scheduled')) {
        hb = hb.replace('- Next Run: Scheduled', `- Next Run: Scheduled\n  ${runLog}`);
        this.memoryManager.atomicWriteFile(heartbeatPath, hb);
      }
    }

    return {
      processedCount,
      extractedFactsCount,
      archivedCount
    };
  }

  /**
   * The Hermes /learn Subroutine:
   * Reads raw session transcript, strips errors/retries, and saves a reusable SKILL.md.
   * 
   * @param {Object} params
   * @param {string} params.sessionId
   * @param {string} params.skillName
   * @param {string} [params.description]
   * @param {Array<string>} [params.triggers]
   * @returns {{ success: boolean, skillName: string, skillPath?: string, error?: string }}
   */
  learnFromSession({ sessionId, skillName, description, triggers = [] }) {
    const rawResult = this.memoryRetriever.readRawSession(sessionId);
    if (!rawResult.found) {
      return { success: false, skillName, error: `Session not found: ${sessionId}` };
    }

    const rawContent = rawResult.content;
    const turns = rawContent.split(/### Turn \d+/).slice(1);

    // Extract effective actions, filtering out failed attempts / dead ends
    const distilledSteps = [];
    let stepNum = 1;

    for (const turn of turns) {
      if (turn.toLowerCase().includes('error') && turn.toLowerCase().includes('retry')) {
        // Skip failed intermediate retries
        continue;
      }
      const lines = turn.trim().split('\n').filter(Boolean);
      const actionLine = lines.find(l => !l.startsWith('*') && !l.startsWith('#') && !/^\[(assistant|user|system|unknown)\]$/i.test(l.trim()));
      if (actionLine) {
        distilledSteps.push(`${stepNum++}. ${actionLine.trim()}`);
      }
    }

    const workflowSteps = distilledSteps.length > 0
      ? distilledSteps.join('\n')
      : '1. Ingest target page\n2. Locate action element\n3. Execute verified action';

    const cleanSkillName = (skillName || `learned-skill-${sessionId}`).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const skillDesc = description || `Procedurally learned skill from session ${sessionId}`;
    const skillTriggers = triggers.length > 0 ? triggers : [cleanSkillName.replace(/-/g, ' ')];

    const skillPath = this.skillManager.saveSkill({
      name: cleanSkillName,
      description: skillDesc,
      triggers: skillTriggers,
      workflowSteps
    });

    return {
      success: true,
      skillName: cleanSkillName,
      skillPath,
      triggers: skillTriggers
    };
  }

  /**
   * Execute fast-path slash commands.
   * @param {string} commandLine 
   * @returns {{ success: boolean, message: string }}
   */
  handleSlashCommand(commandLine) {
    const trimmed = (commandLine || '').trim();
    if (!trimmed.startsWith('/')) {
      return { success: false, message: 'Not a slash command.' };
    }

    const [cmd, ...args] = trimmed.split(/\s+/);
    const argument = args.join(' ');

    switch (cmd.toLowerCase()) {
      case '/remember':
        if (!argument) return { success: false, message: 'Usage: /remember <preference>' };
        this.memoryManager.updateUserPreference(argument);
        return { success: true, message: `Preference saved to USER.md: "${argument}"` };

      case '/forget':
        if (!argument) return { success: false, message: 'Usage: /forget <preference keyword>' };
        const removed = this.memoryManager.removeUserPreference(argument);
        return {
          success: removed,
          message: removed ? `Preference matching "${argument}" removed.` : `No preference matching "${argument}" found.`
        };

      case '/memory':
        const searchRes = this.memoryRetriever.searchMemory({ query: argument || '' });
        return {
          success: true,
          message: `Found ${searchRes.facts.length} facts, ${searchRes.summaries.length} session summaries.`,
          data: searchRes
        };

      case '/reflect':
        const reflRes = this.runMorningReflection({ force: true });
        return {
          success: true,
          message: `Reflection completed: ${reflRes.processedCount} sessions summarized, ${reflRes.extractedFactsCount} facts/passwords extracted, ${reflRes.archivedCount} archived.`
        };

      default:
        return { success: false, message: `Unknown slash command: ${cmd}` };
    }
  }
}

module.exports = ReflectionEngine;

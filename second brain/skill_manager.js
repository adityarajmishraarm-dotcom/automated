/**
 * Skill Manager (second brain/skill_manager.js)
 * 
 * Implements the Hermes Agent Procedural Skills Engine:
 * - Dynamic skill discovery in `second brain/skills/`
 * - Clean YAML frontmatter parsing (pure native, zero dependencies)
 * - Zero-token-bloat skill listing (~10 tokens per skill)
 * - On-demand procedural skill loading (`read_skill`)
 * - Trigger matching for automated skill recommendations
 * - Dynamic skill creation for the `/learn` self-improvement loop
 */

const fs = require('fs');
const path = require('path');

class SkillManager {
  /**
   * @param {string|Array<string>} [customSkillsDirs]
   */
  constructor(customSkillsDirs) {
    if (customSkillsDirs) {
      this.skillsDirs = Array.isArray(customSkillsDirs) 
        ? customSkillsDirs.map(d => path.resolve(d))
        : [path.resolve(customSkillsDirs)];
    } else {
      // Primary: second brain procedural skills. Secondary: Antigravity workspace skills
      this.skillsDirs = [
        path.resolve(__dirname, 'skills'),
        path.resolve(__dirname, '..', '.agents', 'skills')
      ];
    }

    this.primarySkillsDir = this.skillsDirs[0];
    this.ensureSkillsDirectory();
  }

  /**
   * Ensure primary skills directory exists.
   */
  ensureSkillsDirectory() {
    if (!fs.existsSync(this.primarySkillsDir)) {
      fs.mkdirSync(this.primarySkillsDir, { recursive: true });
    }
  }

  /**
   * Parse YAML frontmatter from Markdown file content.
   * Handles name, description, triggers: [...], and version without heavy external packages.
   * @param {string} content 
   * @returns {{ meta: Object, body: string }}
   */
  parseFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) {
      return { meta: {}, body: content };
    }

    const rawMeta = match[1];
    const body = match[2];
    const meta = {};

    const lines = rawMeta.split('\n');
    let currentListKey = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.startsWith('- ') && currentListKey) {
        const itemVal = trimmed.slice(2).trim().replace(/^['"]|['"]$/g, '');
        if (!Array.isArray(meta[currentListKey])) meta[currentListKey] = [];
        meta[currentListKey].push(itemVal);
        continue;
      }

      currentListKey = null;
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;

      const key = trimmed.slice(0, colonIdx).trim();
      let value = trimmed.slice(colonIdx + 1).trim();

      if (!value) {
        currentListKey = key;
        meta[key] = [];
        continue;
      }

      // Handle JSON-style arrays: triggers: ["a", "b"]
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          value = JSON.parse(value);
        } catch {
          value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
        }
      } else {
        // Strip quotes
        value = value.replace(/^['"]|['"]$/g, '');
      }

      meta[key] = value;
    }

    return { meta, body };
  }

  /**
   * Scan and list all available skills with zero prompt bloat.
   * Returns only names, descriptions, and trigger lists (~10 tokens per skill).
   * @returns {Array<{ name: string, description: string, triggers: Array<string>, version?: string, path: string }>}
   */
  /**
   * Scan and list all available skills with zero prompt bloat.
   * Discovers skills across second brain and Antigravity workspace skills.
   * Returns only names, descriptions, and trigger lists (~10 tokens per skill).
   * @returns {Array<{ name: string, description: string, triggers: Array<string>, version?: string, path: string }>}
   */
  listSkills() {
    const skillsMap = new Map();

    for (const dir of this.skillsDirs) {
      if (!fs.existsSync(dir)) continue;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillPath = path.join(dir, entry.name, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
          try {
            const content = fs.readFileSync(skillPath, 'utf8');
            const { meta } = this.parseFrontmatter(content);
            const skillName = meta.name || entry.name;
            // Only add if not already present (primary dir has precedence)
            if (!skillsMap.has(skillName)) {
              // Handle triggers from frontmatter or metadata.triggers
              let triggers = [];
              if (Array.isArray(meta.triggers)) {
                triggers = meta.triggers;
              } else if (meta.metadata && Array.isArray(meta.metadata.triggers)) {
                triggers = meta.metadata.triggers;
              }

              skillsMap.set(skillName, {
                name: skillName,
                description: meta.description || 'Procedural browser automation skill',
                triggers,
                version: meta.version || (meta.metadata && meta.metadata.version) || '1.0.0',
                path: skillPath
              });
            }
          } catch (err) {
            console.error(`Failed to parse skill at ${skillPath}:`, err.message);
          }
        }
      }
    }

    return Array.from(skillsMap.values());
  }

  /**
   * Formats a lightweight summary string suitable for the base prompt (~10 tokens per skill).
   * @returns {string}
   */
  formatPromptSummary() {
    const skills = this.listSkills();
    if (skills.length === 0) return 'No procedural skills loaded.';

    return skills
      .map(s => `• ${s.name}: ${s.description.replace(/\n+/g, ' ').trim()}`)
      .join('\n');
  }

  /**
   * Read full procedural instructions for a skill on demand (`read_skill`).
   * Searches across all registered skill roots.
   * @param {string} name 
   * @returns {{ found: boolean, name: string, meta?: Object, instructions?: string, path?: string, error?: string }}
   */
  readSkill(name) {
    if (!name || typeof name !== 'string') {
      return { found: false, name, error: 'Invalid skill name' };
    }

    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '');

    for (const dir of this.skillsDirs) {
      const skillPath = path.join(dir, safeName, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        const content = fs.readFileSync(skillPath, 'utf8');
        const { meta, body } = this.parseFrontmatter(content);
        return {
          found: true,
          name: safeName,
          meta,
          instructions: body.trim(),
          path: skillPath
        };
      }
    }

    return { found: false, name: safeName, error: `Skill "${safeName}" not found.` };
  }

  /**
   * Match an input text or URL against registered skill triggers.
   * @param {string} text 
   * @returns {Array<Object>} Matched skills
   */
  matchTriggers(text) {
    if (!text || typeof text !== 'string') return [];
    const lower = text.toLowerCase();
    const skills = this.listSkills();

    return skills.filter(skill => {
      if (!skill.triggers || skill.triggers.length === 0) return false;
      return skill.triggers.some(trig => {
        try {
          const rx = new RegExp(trig, 'i');
          return rx.test(lower);
        } catch {
          return lower.includes(String(trig).toLowerCase());
        }
      });
    });
  }

  /**
   * Save a newly discovered skill into `skills/<name>/SKILL.md` (Hermes /learn loop).
   * @param {Object} options
   * @param {string} options.name
   * @param {string} options.description
   * @param {Array<string>} options.triggers
   * @param {string} options.workflowSteps
   * @param {string} [options.version='1.0.0']
   * @returns {string} Path to saved SKILL.md
   */
  saveSkill({ name, description, triggers = [], workflowSteps, version = '1.0.0' }) {
    const safeName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const dir = path.join(this.primarySkillsDir, safeName);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const skillPath = path.join(dir, 'SKILL.md');
    const triggersJson = JSON.stringify(triggers);

    let md = `---\n`;
    md += `name: ${safeName}\n`;
    md += `description: ${description}\n`;
    md += `triggers: ${triggersJson}\n`;
    md += `version: ${version}\n`;
    md += `---\n\n`;
    md += `## Workflow Steps:\n${workflowSteps.trim()}\n`;

    fs.writeFileSync(skillPath, md, 'utf8');
    return skillPath;
  }
}

module.exports = SkillManager;

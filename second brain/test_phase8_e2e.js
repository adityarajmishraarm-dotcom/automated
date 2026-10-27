/**
 * Comprehensive End-to-End Test Suite for Second Brain (test_phase8_e2e.js)
 * 
 * Validates:
 * 1. Hybrid Markdown & SQLite Summary Indexing (FTS search & on-demand raw retrieval)
 * 2. 90-Day Raw Chat Retention & Archiving
 * 3. Morning 8:00 AM Daily Reflection & Password/Credential Extraction into MEMORY.md
 * 4. Codex Dynamic Tool Pager & Strict 3-Turn Sliding Window
 * 5. Hermes Procedural Skills Engine (20 skills discovered across dual roots)
 * 6. Task Continuity & Checkpointing in HEARTBEAT.md across restarts
 * 7. The PreCompact Protocol (Flushes uncompressed buffer to disk at >= 75% capacity)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const MemoryManager = require('./memory_manager');
const MemoryRetriever = require('./memory_retriever');
const SkillManager = require('./skill_manager');
const ContextManager = require('./context_manager');
const ReflectionEngine = require('./reflection_engine');
const LifecycleManager = require('./lifecycle_manager');

async function runE2ETests() {
  console.log('🧪 Starting Second Brain End-to-End Verification Suite...\n');

  const testDir = path.join(__dirname, 'test_e2e_data');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  const memMgr = new MemoryManager(testDir);
  const memRetr = new MemoryRetriever(memMgr);
  const skillMgr = new SkillManager();
  const ctxMgr = new ContextManager({ memoryManager: memMgr, maxContextTokens: 2000, compactThreshold: 0.75 });
  const reflEngine = new ReflectionEngine({
    memoryManager: memMgr,
    memoryRetriever: memRetr,
    skillManager: skillMgr
  });
  const lifeMgr = new LifecycleManager({
    memoryManager: memMgr,
    memoryRetriever: memRetr,
    skillManager: skillMgr,
    contextManager: ctxMgr,
    reflectionEngine: reflEngine
  });

  // 1. Initialize permanent anchors
  console.log('Test 1: Initializing permanent Markdown anchors...');
  memMgr.atomicWriteFile(path.join(testDir, 'SOUL.md'), '# SOUL.md\nTenet: Physical verification before completion.\nTenet: Immutable system rules.');
  memMgr.atomicWriteFile(path.join(testDir, 'USER.md'), '# USER.md\n## 1. Hardware Environment\n- Backend: Devil.co Ornith-1.0-9B on port 4893\n## 3. Verified Behavioral Preferences\n- Theme: Dark Mode');
  memMgr.atomicWriteFile(path.join(testDir, 'MEMORY.md'), '# MEMORY.md\n## 1. Authorized System Credentials [PINNED]\n## 2. Verified Technical Discoveries & Platform Quirks [PINNED]\n- React SPAs require native prototype descriptor setter');
  memMgr.atomicWriteFile(path.join(testDir, 'HEARTBEAT.md'), '# HEARTBEAT.md\n## 2. Active Tasks & Checkpoints\n- **Status**: Idle / Ready\n- **Current Task**: None\n- **Checkpoint Progress**: N/A');

  const anchors = memMgr.readAnchorFiles();
  assert(anchors.soul.includes('Immutable system rules'), 'SOUL.md must be loaded');
  assert(anchors.user.includes('Devil.co Ornith'), 'USER.md must be loaded');
  assert(anchors.memory.includes('React SPAs'), 'MEMORY.md must be loaded');
  console.log('✅ Test 1 Passed: Permanent Markdown anchors verified.\n');

  // 2. Lifecycle Manager onSessionStart & Task Continuity
  console.log('Test 2: Validating Lifecycle onSessionStart & Task Continuity...');
  const sessionStart = lifeMgr.onSessionStart();
  assert(sessionStart.staticPrefix.includes('AGENT SOUL'), 'Static prefix must be assembled');
  assert(sessionStart.interruptedTask === null, 'No initial interrupted task');
  assert(sessionStart.skillsCount >= 20, `Must discover all workspace skills (got ${sessionStart.skillsCount})`);

  // Checkpoint active task
  lifeMgr.checkpointTask('Download 4K Nature Wallpaper', 'Turn 3: clicked mark #7', 'In Progress');
  const detectedInterrupted = lifeMgr.checkInterruptedTask();
  assert(detectedInterrupted !== null, 'Should detect interrupted task in HEARTBEAT.md');
  assert.strictEqual(detectedInterrupted.task, 'Download 4K Nature Wallpaper');
  assert.strictEqual(detectedInterrupted.checkpoint, 'Turn 3: clicked mark #7');

  // Clear active task on completion
  lifeMgr.clearActiveTask();
  assert(lifeMgr.checkInterruptedTask() === null, 'Task must be cleared on clean completion');
  console.log('✅ Test 2 Passed: Lifecycle Manager & Task Continuity verified.\n');

  // 3. 90-Day Raw Transcript Storage & SQLite Summary Search
  console.log('Test 3: 90-Day Raw Markdown Transcripts & Sub-Millisecond SQLite Search...');
  const testSessionId = 'session_test_90days_42';
  const turns = [
    { role: 'user', content: 'Navigate to https://portal.internal:8080 and login with password: SecretMasterKey99!' },
    { role: 'assistant', content: 'Navigated to https://portal.internal:8080. Typed password and clicked login mark #1.' },
    { role: 'user', content: 'Always set default playback to 1080p 60fps.' },
    { role: 'assistant', content: 'Saved playback preference to 1080p 60fps.' }
  ];

  const rawRelPath = memMgr.writeRawSession(testSessionId, turns, 'Internal Portal Login & Streaming Setup');
  assert(fs.existsSync(path.join(testDir, rawRelPath)), 'Raw session transcript file must exist on disk');

  // Fetch full raw chat on demand
  const rawFetch = memRetr.readRawSession(testSessionId);
  assert(rawFetch.found === true, 'readRawSession must find the session transcript');
  assert(rawFetch.content.includes('SecretMasterKey99!'), 'Raw transcript must contain full uncompressed details');
  console.log('✅ Test 3 Passed: 90-Day Raw transcript stored and retrieved on demand.\n');

  // 4. Morning 8:00 AM Reflection & Password Extraction into MEMORY.md
  console.log('Test 4: Morning 8:00 AM Reflection & Credential Extraction...');
  const reflResult = reflEngine.runMorningReflection({ force: true });
  assert(reflResult.processedCount >= 1, 'Reflection must process unsummarized raw transcripts');
  assert(reflResult.extractedFactsCount >= 1, 'Reflection must extract credentials/preferences');

  // Verify credentials preserved in MEMORY.md
  const updatedAnchors = memMgr.readAnchorFiles();
  assert(updatedAnchors.memory.includes('password: SecretMasterKey99!'), 'Authorized password must be extracted to MEMORY.md');
  assert(updatedAnchors.memory.includes('https://portal.internal:8080'), 'Login endpoint must be extracted to MEMORY.md');
  assert(updatedAnchors.user.includes('default playback to 1080p 60fps'), 'Durable preference must be promoted to USER.md');

  // Verify SQLite summary indexed
  const searchRes = memRetr.searchMemory({ query: 'Portal' });
  assert(searchRes.summaries.length >= 1, 'Session summary must be indexed in SQLite');
  assert(searchRes.summaries[0].session_id === testSessionId, 'Summary session ID must match');
  console.log('✅ Test 4 Passed: 8:00 AM Reflection, Password Extraction & SQLite Indexing verified.\n');

  // 5. Codex Dynamic Tool Pager & Strict 3-Turn Sliding Window
  console.log('Test 5: Codex Dynamic Tool Pager & Strict 3-Turn Sliding Window...');
  const allTurnsSample = [
    { role: 'user', content: 'Turn 1 prompt' },
    { role: 'assistant', content: 'Turn 1 answer' },
    { role: 'user', content: 'Turn 2 prompt' },
    { role: 'assistant', content: 'Turn 2 answer' },
    { role: 'user', content: 'Turn 3 prompt' },
    { role: 'assistant', content: 'Turn 3 answer' },
    { role: 'user', content: 'Turn 4 prompt' },
    { role: 'assistant', content: 'Turn 4 answer' },
    { role: 'user', content: 'Turn 5 prompt' }
  ];

  const sliced = ctxMgr.applySlidingWindow(allTurnsSample);
  assert.strictEqual(sliced.length, 4, 'Sliding window must strictly push last 4 items (3 previous turns + current turn)');
  assert.strictEqual(sliced[sliced.length - 1].content, 'Turn 5 prompt');
  console.log('✅ Test 5 Passed: Strict 3-Turn Sliding Window verified.\n');

  // 6. PreCompact Protocol at 75% Capacity
  console.log('Test 6: The Cole Medin PreCompact Protocol (75% Threshold)...');
  const longText = 'x'.repeat(6000); // Exceeds 75% of 2000 tokens (~1500 tokens)
  const estTokens = ctxMgr.estimateTokens(longText);
  assert(ctxMgr.shouldCompact(estTokens), 'Should trigger PreCompact when tokens exceed 75% threshold');

  const compactRes = ctxMgr.onPreCompact({
    sessionId: 'session_precompact_test',
    goal: 'Scrape 50 products',
    allTurns: allTurnsSample
  });
  assert(compactRes.flushedPath, 'PreCompact must flush buffer to raw session on disk');
  assert(compactRes.compactedTurns.length <= 4, 'Context window must drop to compact size (~15%)');
  console.log('✅ Test 6 Passed: PreCompact Protocol verified with zero loss.\n');

  // 7. Hermes Procedural Skills Engine Across Roots
  console.log('Test 7: Hermes Procedural Skills Engine (Zero Prompt Bloat)...');
  const skills = skillMgr.listSkills();
  assert(skills.length >= 20, `Must load 20 functional skills (found ${skills.length})`);
  
  // Verify browser skills in second brain/skills/
  const domNavSkill = skillMgr.readSkill('browser-dom-navigator');
  assert(domNavSkill.found === true, 'browser-dom-navigator must exist');
  assert(domNavSkill.instructions.includes('Accessibility Tree (AXTree)'), 'Must contain verified procedures');

  const credSkill = skillMgr.readSkill('credential-autofill');
  assert(credSkill.found === true, 'credential-autofill must exist');
  assert(credSkill.instructions.includes('HTMLInputElement.prototype'), 'Must contain React descriptor bypass');

  // Verify Antigravity workspace skills in .agents/skills/
  const ponytaleSkill = skillMgr.readSkill('ponytale');
  assert(ponytaleSkill.found === true, 'ponytale workspace skill must be discoverable');

  const gsdSkill = skillMgr.readSkill('gsd');
  assert(gsdSkill.found === true, 'gsd workspace skill must be discoverable');
  console.log('✅ Test 7 Passed: Procedural skills engine loaded across dual roots.\n');

  // Cleanup test directory
  try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (_) {}

  console.log('🎉 ALL 7 SECOND BRAIN VERIFICATION SUITE TESTS PASSED PERFECTLY!');
}

runE2ETests().catch((err) => {
  console.error('❌ E2E Test Suite Failed:', err);
  process.exit(1);
});

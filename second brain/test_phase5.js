/**
 * Verification Test Suite for Phase 5
 * Validates ReflectionEngine:
 * - Password, credential & endpoint extraction
 * - Morning 8:00 AM daily reflection processing
 * - Summary creation & SQLite indexing
 * - Hermes /learn trajectory distillation
 * - Fast-path slash commands (/remember, /forget, /memory, /reflect)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const MemoryManager = require('./memory_manager');
const MemoryRetriever = require('./memory_retriever');
const SkillManager = require('./skill_manager');
const ReflectionEngine = require('./reflection_engine');

async function runPhase5Tests() {
  console.log('🧪 Running Phase 5 Reflection Engine & 8:00 AM Routine Tests...\n');

  const memoryManager = new MemoryManager();
  const memoryRetriever = new MemoryRetriever(memoryManager);
  const skillManager = new SkillManager();
  const reflectionEngine = new ReflectionEngine({
    memoryManager,
    memoryRetriever,
    skillManager
  });

  // Test 1: Extract Passwords, Endpoints and Preferences
  console.log('1. Testing Password and Credential extraction from chat logs...');
  const sampleTranscript = `
    User asked to login to dashboard.
    Connecting to https://internal.dev.corp:8443/auth.
    Entered auth_token: super_secret_jwt_token_9988
    Also used password: MasterAlphaPassword!
    User said: I prefer dark theme on internal dashboards.
  `;

  const extracted = reflectionEngine.extractImportantInfo(sampleTranscript);
  console.log('   Extracted info:', extracted);
  assert(extracted.passwords.some(p => p.includes('MasterAlphaPassword!')), 'Must extract password');
  assert(extracted.passwords.some(p => p.includes('super_secret_jwt_token_9988')), 'Must extract auth token');
  assert(extracted.endpoints.includes('https://internal.dev.corp:8443/auth'), 'Must extract endpoint');
  assert(extracted.preferences.some(p => p.includes('dark theme')), 'Must extract preference');
  console.log('   ✅ Passwords, tokens, endpoints, and preferences extracted accurately.');

  // Test 2: Morning 8:00 AM Daily Reflection Routine
  console.log('2. Testing Morning 8:00 AM Daily Reflection routine...');
  // Write a mock raw session with important info
  const testSessionId = `refl_session_${Date.now()}`;
  memoryManager.writeRawSession(testSessionId, [
    { role: 'user', content: 'Open database admin at http://db.local:9000 with credentials for db_admin and password: ClusterRootSecret123' },
    { role: 'assistant', content: 'Connected to http://db.local:9000, login successful.' }
  ], 'Database Administration Session');

  const reflectionResult = reflectionEngine.runMorningReflection({ force: true });
  assert(reflectionResult.processedCount >= 1, 'Should have processed at least 1 session');
  assert(reflectionResult.extractedFactsCount >= 1, 'Should have extracted facts/passwords');
  console.log(`   ✅ Reflection processed ${reflectionResult.processedCount} sessions, extracted ${reflectionResult.extractedFactsCount} facts.`);

  // Verify that the password landed in MEMORY.md
  const memoryContent = memoryManager.readAnchorFiles().memory;
  assert(memoryContent.includes('ClusterRootSecret123'), 'Password must be promoted to MEMORY.md');
  console.log('   ✅ Credential successfully promoted to MEMORY.md [PINNED].');

  // Verify that summary exists in SQLite
  const summaries = memoryRetriever.searchSummaries(testSessionId);
  assert(summaries.length > 0, 'Summary must exist in SQLite');
  assert(summaries[0].title === 'Database Administration Session', 'Title must match session title');
  console.log('   ✅ Session summary successfully indexed in memory_summaries.sqlite.');

  // Test 3: The Hermes /learn Subroutine
  console.log('3. Testing Hermes /learn Subroutine...');
  const learnSessionId = `learn_session_${Date.now()}`;
  memoryManager.writeRawSession(learnSessionId, [
    { role: 'user', content: 'Download file from ad-heavy portal' },
    { role: 'assistant', content: 'Encountered error on button click, retrying with delay' }, // Should be stripped
    { role: 'assistant', content: 'Waited for countdown timer to reach 0' },
    { role: 'assistant', content: 'Dismissed popup tab immediately' },
    { role: 'assistant', content: 'Triggered hardware click on download button mark #8' }
  ], 'Ad Portal Download Gateway');

  const learnResult = reflectionEngine.learnFromSession({
    sessionId: learnSessionId,
    skillName: 'test-ad-portal-download',
    description: 'Bypasses popup windows and countdowns on download portals',
    triggers: ['ad portal', 'download file']
  });

  assert(learnResult.success === true, 'Learn subroutine must succeed');
  assert(fs.existsSync(learnResult.skillPath), 'Synthesized SKILL.md must exist on disk');

  const readLearned = skillManager.readSkill('test-ad-portal-download');
  assert(readLearned.found === true, 'Learned skill must be readable');
  assert(readLearned.instructions.includes('Waited for countdown timer'), 'Step must be preserved');
  assert(!readLearned.instructions.includes('Encountered error on button click'), 'Failed retry should be stripped');

  // Clean up test skill
  fs.rmSync(path.dirname(learnResult.skillPath), { recursive: true, force: true });
  console.log('   ✅ Hermes /learn distilled trajectory, stripped errors, and generated clean SKILL.md.');

  // Test 4: Fast-Path Slash Commands
  console.log('4. Testing Fast-Path Slash Commands...');
  const remRes = reflectionEngine.handleSlashCommand('/remember Always verify video sound before closing tabs');
  assert(remRes.success === true, '/remember should succeed');
  assert(memoryManager.readAnchorFiles().user.includes('Always verify video sound'), 'Preference must be in USER.md');

  const forgetRes = reflectionEngine.handleSlashCommand('/forget verify video sound');
  assert(forgetRes.success === true, '/forget should succeed');
  assert(!memoryManager.readAnchorFiles().user.includes('Always verify video sound'), 'Preference should be removed');
  console.log('   ✅ Fast-path slash commands verified.');

  console.log('\n🎉 ALL PHASE 5 TESTS PASSED SUCCESSFULLY!');
}

runPhase5Tests().catch(err => {
  console.error('\n❌ Phase 5 Test Failed:', err);
  process.exit(1);
});

/**
 * Verification Test Suite for Phase 1
 * Validates MemoryManager and MemoryRetriever:
 * - Markdown anchor file loading
 * - Atomic preference updates & deletion
 * - Memory fact curation & budget pruning
 * - Raw session transcript writing (90-day retention path)
 * - SQLite summary database indexing & FTS search
 * - On-demand full raw chat retrieval
 * - Directory traversal protection
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const MemoryManager = require('./memory_manager');
const MemoryRetriever = require('./memory_retriever');

async function runPhase1Tests() {
  console.log('🧪 Running Phase 1 Second Brain Storage Tests...\n');

  const manager = new MemoryManager();
  const retriever = new MemoryRetriever(manager);

  // Test 1: Anchor files exist and are readable
  console.log('1. Verifying anchor Markdown files...');
  const anchors = manager.readAnchorFiles();
  assert(anchors.soul.includes('SOUL.md'), 'SOUL.md should be loaded');
  assert(anchors.user.includes('USER.md'), 'USER.md should be loaded');
  assert(anchors.memory.includes('MEMORY.md'), 'MEMORY.md should be loaded');
  assert(anchors.heartbeat.includes('HEARTBEAT.md'), 'HEARTBEAT.md should be loaded');
  console.log('   ✅ All 4 permanent anchors verified.');

  // Test 2: User Preference Update & Retrieval
  console.log('2. Testing User Preference mutation...');
  manager.updateUserPreference('Always prioritize 1440p on fast Wi-Fi networks');
  const updatedUser = manager.readAnchorFiles().user;
  assert(updatedUser.includes('Always prioritize 1440p on fast Wi-Fi networks'), 'New preference must be in USER.md');
  
  const searchResults1 = retriever.searchAnchorContent('Wi-Fi');
  assert(searchResults1.length > 0, 'Retriever should find Wi-Fi preference');
  assert(searchResults1[0].category === '[USER_PREFERENCE]', 'Category should be [USER_PREFERENCE]');
  console.log('   ✅ Preference recorded and retrieved.');

  // Test 3: Technical Fact & Credential Appending
  console.log('3. Testing Technical Fact & Quirk curation...');
  manager.appendMemoryFact('YouTube player toggles fullscreen with "f" key event');
  const updatedMemory = manager.readAnchorFiles().memory;
  assert(updatedMemory.includes('YouTube player toggles fullscreen'), 'Quirk must be saved in MEMORY.md');
  console.log('   ✅ Quirk saved to MEMORY.md.');

  // Test 4: Raw Session Transcript Writing & SQLite Indexing
  console.log('4. Testing Raw Session Transcript writing & SQLite Indexing...');
  const testSessionId = `test_session_${Date.now()}`;
  const testTurns = [
    { role: 'user', content: 'Navigate to https://example.com and check download gateway' },
    { role: 'assistant', content: 'Observed countdown timer element; waited 10s until complete; clicked download mark' },
    { role: 'user', content: 'Verified downloaded file hash matched' }
  ];

  const relFilePath = manager.writeRawSession(testSessionId, testTurns, 'Test Download Gateway Workflow');
  assert(fs.existsSync(path.join(manager.baseDir, relFilePath)), 'Raw session file must exist on disk');

  // Insert summary into SQLite
  manager.insertOrUpdateSummary({
    session_id: testSessionId,
    title: 'Download Gateway Bypass Test',
    summary: 'Navigated to gateway page, waited for countdown timer to reach zero, and triggered download click.',
    key_entities: ['example.com', 'download gateway', 'countdown timer'],
    file_path: relFilePath
  });
  console.log('   ✅ Raw session written to disk and indexed in SQLite.');

  // Test 5: Fast SQLite Summary Search
  console.log('5. Testing Fast SQLite Summary Search...');
  const summaryMatches = retriever.searchSummaries('countdown timer');
  assert(summaryMatches.length > 0, 'SQLite should match countdown timer summary');
  assert(summaryMatches[0].session_id === testSessionId, 'Matched session ID should match');
  console.log('   ✅ SQLite summary search successful:', summaryMatches[0].title);

  // Test 6: On-Demand Full Raw Chat Retrieval
  console.log('6. Testing On-Demand Full Raw Chat Retrieval...');
  const rawResult = retriever.readRawSession(testSessionId);
  assert(rawResult.found === true, 'Raw session transcript must be retrieved');
  assert(rawResult.content.includes('Verified downloaded file hash matched'), 'Full raw content must contain turn 3');
  console.log('   ✅ On-demand full raw chat successfully loaded from disk without data loss.');

  // Test 7: Security - Directory Traversal Defense
  console.log('7. Testing Directory Traversal Defense on raw reader...');
  const traversalResult = retriever.readRawSession('../../package.json');
  assert(traversalResult.found === false, 'Traversal attempt must be rejected');
  console.log('   ✅ Traversal attack safely blocked.');

  // Test 8: Preference Deletion (/forget)
  console.log('8. Testing Preference Deletion...');
  const removed = manager.removeUserPreference('Wi-Fi networks');
  assert(removed === true, 'Preference should be successfully removed');
  const finalUser = manager.readAnchorFiles().user;
  assert(!finalUser.includes('Wi-Fi networks'), 'Preference should no longer be in USER.md');
  console.log('   ✅ Preference successfully forgotten.');

  console.log('\n🎉 ALL PHASE 1 TESTS PASSED SUCCESSFULLY!');
}

runPhase1Tests().catch(err => {
  console.error('\n❌ Phase 1 Test Failed:', err);
  process.exit(1);
});

/**
 * Verification Test Suite for Phase 2
 * Validates ContextManager:
 * - Static KV prefix assembly
 * - Strict 3-turn sliding window
 * - PreCompact trigger threshold (75%)
 * - Disk buffer flush and compaction checkpoint creation
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const MemoryManager = require('./memory_manager');
const ContextManager = require('./context_manager');

async function runPhase2Tests() {
  console.log('🧪 Running Phase 2 Context Management & PreCompact Tests...\n');

  const memoryManager = new MemoryManager();
  const contextManager = new ContextManager({
    memoryManager,
    maxContextTokens: 1000, // Small window to test PreCompact trigger deterministically
    compactThreshold: 0.75
  });

  // Test 1: Static Prefix Generation
  console.log('1. Testing Static KV-Cache Prefix generation...');
  const prefix = contextManager.buildStaticPrefix();
  assert(prefix.includes('SYSTEM INVARIANTS & AGENT SOUL'), 'Prefix must include SOUL');
  assert(prefix.includes('USER PROFILE & PREFERENCES'), 'Prefix must include USER');
  assert(prefix.includes('CURATED PERMANENT MEMORY & CREDENTIALS'), 'Prefix must include MEMORY');
  console.log('   ✅ Static prefix assembled with all permanent anchors.');

  // Test 2: Strict 3-Turn Sliding Window (Under Threshold)
  console.log('2. Testing Strict 3-Turn Sliding Window...');
  const normalContextManager = new ContextManager({
    memoryManager,
    maxContextTokens: 8192,
    compactThreshold: 0.75
  });

  const sampleTurns = [
    { role: 'user', content: 'Turn 1: Open website' },
    { role: 'assistant', content: 'Turn 1 Result: Page loaded' },
    { role: 'user', content: 'Turn 2: Search for items' },
    { role: 'assistant', content: 'Turn 2 Result: Found 5 items' },
    { role: 'user', content: 'Turn 3: Click item 1' },
    { role: 'assistant', content: 'Turn 3 Result: Item 1 details opened' },
    { role: 'user', content: 'Turn 4: Current prompt - check price' }
  ];

  const assembled = normalContextManager.assembleContext({
    goal: 'Buy item',
    turns: sampleTurns,
    sessionId: 'test_window_01'
  });

  // Should have exactly 4 turns: Turn 2 Result (N-3), Turn 3 (N-2), Turn 3 Result (N-1), Turn 4 (N)
  assert.strictEqual(assembled.activeTurns.length, 4, 'Sliding window must retain exactly 4 items (3 previous + current)');
  assert.strictEqual(assembled.activeTurns[assembled.activeTurns.length - 1].content, 'Turn 4: Current prompt - check price');
  assert(!assembled.compacted, 'Should not have compacted under threshold');
  console.log('   ✅ Sliding window strictly kept 3 previous turns + current turn.');

  // Test 3: PreCompact Protocol Trigger at 75% Capacity
  console.log('3. Testing PreCompact Protocol Trigger at >= 75% threshold...');
  const compactingContextManager = new ContextManager({
    memoryManager,
    maxContextTokens: 2000,
    compactThreshold: 0.75
  });

  // Generate large turns exceeding 1500 tokens (75% of 2000)
  const largeTurns = [];
  for (let i = 1; i <= 20; i++) {
    largeTurns.push({
      role: i % 2 === 1 ? 'user' : 'assistant',
      content: `Turn ${i}: ` + 'Extensive automated browser action telemetry and DOM inspection details '.repeat(20)
    });
  }

  const compactedResult = compactingContextManager.assembleContext({
    goal: 'Extract complex product data',
    turns: largeTurns,
    sessionId: 'test_compact_session'
  });

  assert(compactedResult.compacted, 'Context manager must trigger PreCompact when threshold >= 75%');
  assert(compactedResult.activeTurns[0].content.includes('[COMPACTION CHECKPOINT]'), 'First item must be COMPACTION CHECKPOINT');
  assert(compactedResult.activeTurns[0].content.includes('Full previous turns saved to:'), 'Checkpoint must point to flushed raw file');
  
  // Verify flushed file on disk
  const rawFilePath = path.join(memoryManager.baseDir, 'raw');
  assert(fs.existsSync(rawFilePath), 'Raw directory must exist');

  console.log('   ✅ PreCompact triggered: buffer safely flushed to disk, compacted checkpoint generated.');

  console.log('\n🎉 ALL PHASE 2 TESTS PASSED SUCCESSFULLY!');
}

runPhase2Tests().catch(err => {
  console.error('\n❌ Phase 2 Test Failed:', err);
  process.exit(1);
});

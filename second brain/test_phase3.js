/**
 * Verification Test Suite for Phase 3
 * Validates SkillManager:
 * - Dynamic discovery of 4 core skills
 * - YAML frontmatter parsing (triggers, descriptions)
 * - Zero token bloat prompt formatting
 * - On-demand loading (readSkill)
 * - Keyword trigger matching
 * - Dynamic skill creation (Hermes /learn synthesis)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const SkillManager = require('./skill_manager');

async function runPhase3Tests() {
  console.log('🧪 Running Phase 3 Procedural Skills Engine Tests...\n');

  const skillManager = new SkillManager();

  // Test 1: Discover all 4 core skills
  console.log('1. Discovering installed procedural skills...');
  const skills = skillManager.listSkills();
  const skillNames = skills.map(s => s.name);
  console.log('   Installed skills:', skillNames);

  assert(skillNames.includes('browser-dom-navigator'), 'browser-dom-navigator must be present');
  assert(skillNames.includes('credential-autofill'), 'credential-autofill must be present');
  assert(skillNames.includes('media-stream-controller'), 'media-stream-controller must be present');
  assert(skillNames.includes('tab-management'), 'tab-management must be present');
  assert(skillNames.includes('adblock-gateway-bypass'), 'adblock-gateway-bypass must be present');
  console.log('   ✅ All core production skills discovered.');

  // Test 2: Lean prompt summary formatting (Zero prompt bloat)
  console.log('2. Testing lean prompt summary formatting...');
  const summary = skillManager.formatPromptSummary();
  assert(summary.includes('• browser-dom-navigator:'), 'Summary must list browser-dom-navigator');
  assert(summary.includes('• credential-autofill:'), 'Summary must list credential-autofill');
  console.log('   ✅ Lean summary generated (~10 tokens per skill):');
  console.log('   ' + summary.split('\n').join('\n   '));

  // Test 3: On-demand full skill loading (read_skill)
  console.log('\n3. Testing on-demand skill reading (read_skill)...');
  const readResult = skillManager.readSkill('credential-autofill');
  assert(readResult.found === true, 'credential-autofill must be found');
  assert(readResult.instructions.includes('HTMLInputElement.prototype'), 'Instructions must contain React descriptor advice');
  console.log('   ✅ On-demand loading retrieved full procedure instructions.');

  // Test 4: Trigger matching
  console.log('4. Testing keyword trigger matching...');
  const youtubeMatches = skillManager.matchTriggers('Please play this youtube video');
  assert(youtubeMatches.length > 0, 'Should match youtube trigger');
  assert(youtubeMatches.some(s => s.name === 'media-stream-controller'), 'Must match media-stream-controller');

  const formMatches = skillManager.matchTriggers('Fill out login form and type password');
  assert(formMatches.some(s => s.name === 'credential-autofill'), 'Must match credential-autofill');
  console.log('   ✅ Triggers accurately matched media-stream-controller and credential-autofill.');

  // Test 5: Dynamic skill synthesis (/learn loop)
  console.log('5. Testing dynamic skill creation (/learn synthesis)...');
  const dynamicSkillName = 'test-dynamic-download-bypass';
  const savedPath = skillManager.saveSkill({
    name: dynamicSkillName,
    description: 'Dynamic bypass skill created by /learn subroutine',
    triggers: ['countdown', 'gateway', 'bypass'],
    workflowSteps: '1. Ingest page\n2. Wait for timer\n3. Click download'
  });

  assert(fs.existsSync(savedPath), 'Dynamic skill SKILL.md must be written to disk');
  const readDynamic = skillManager.readSkill(dynamicSkillName);
  assert(readDynamic.found === true, 'Newly created skill must be readable');
  assert(readDynamic.meta.triggers.includes('gateway'), 'Triggers must include gateway');

  // Clean up dynamic test skill
  fs.rmSync(path.dirname(savedPath), { recursive: true, force: true });
  console.log('   ✅ Dynamic skill synthesis and cleanup validated.');

  console.log('\n🎉 ALL PHASE 3 TESTS PASSED SUCCESSFULLY!');
}

runPhase3Tests().catch(err => {
  console.error('\n❌ Phase 3 Test Failed:', err);
  process.exit(1);
});

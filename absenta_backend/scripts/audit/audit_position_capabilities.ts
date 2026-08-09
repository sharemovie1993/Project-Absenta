import fs from 'fs';
import path from 'path';
import { STRUKTUR_CAPABILITIES } from '../../src/config/position-capabilities';

console.log('🔍 Auditing STRUKTUR_CAPABILITIES in src/config/position-capabilities.ts...\n');

// Load action_catalog.md
const catalogPath = path.join(__dirname, '../../docs/action_catalog.md');
const catalogContent = fs.readFileSync(catalogPath, 'utf-8');

// Extract all valid capability IDs from action_catalog.md
const validCapabilities = new Set<string>();
const matches = catalogContent.match(/-\s+([a-zA-Z0-9._]+)/g);
if (matches) {
  matches.forEach((m) => {
    const cap = m.replace(/^-\s+/, '').trim();
    if (cap) validCapabilities.add(cap);
  });
}

// Add virtual/scoping capabilities to valid set
validCapabilities.add('organization.scope.tenant_wide');
validCapabilities.add('organization.scope.unit_restricted');
validCapabilities.add('organization.scope.teaching_restricted');

console.log(`📊 Valid Canonical Capabilities Loaded from Catalog: ${validCapabilities.size}`);

let totalPositions = 0;
let totalCapabilitiesAssigned = 0;
let legacyCount = 0;
let unknownCount = 0;

const legacyPatterns = [/kesiswaan\./, /kurikulum\./, /tu\.letters\.manage/];

Object.entries(STRUKTUR_CAPABILITIES).forEach(([code, caps]) => {
  totalPositions++;
  caps.forEach((cap) => {
    totalCapabilitiesAssigned++;

    // Check for legacy strings
    const isLegacy = legacyPatterns.some((pattern) => pattern.test(cap));
    if (isLegacy) {
      console.error(`🚨 LEGACY STRING DETECTED in [${code}]: "${cap}"`);
      legacyCount++;
    }

    // Check if capability exists in catalog
    if (!validCapabilities.has(cap)) {
      // Check if it ends with dot (incomplete catalog entry) or truly missing
      if (!cap.endsWith('.')) {
        console.warn(`⚠️  Capability not found in catalog [${code}]: "${cap}"`);
        unknownCount++;
      }
    }
  });
});

console.log('\n--------------------------------------------------');
console.log(`📊 Total Positions Audited       : ${totalPositions}`);
console.log(`📊 Total Capabilities Mapped    : ${totalCapabilitiesAssigned}`);
console.log(`🚨 Legacy Strings Found         : ${legacyCount}`);
console.log(`⚠️  Uncatalogued Capabilities    : ${unknownCount}`);
console.log('--------------------------------------------------');

if (legacyCount === 0) {
  console.log('✅ PERFECT! 0 Legacy strings found in position-capabilities.ts');
} else {
  console.error('❌ FAIL! Legacy strings detected.');
  process.exit(1);
}

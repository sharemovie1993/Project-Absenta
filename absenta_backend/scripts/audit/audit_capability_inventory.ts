import fs from 'fs';
import path from 'path';
import { STRUKTUR_CAPABILITIES } from '../../src/config/position-capabilities';
import { STRUKTUR_CODES } from '../../src/config/organization-structure';

const BACKEND_DIR = path.join(__dirname, '../../');
const FRONTEND_DIR = path.join(__dirname, '../../../absenta_frontend');

const OUTPUT_JSON = path.join(BACKEND_DIR, 'capability_audit_inventory.json');

function getAllFiles(dirPath: string, extensions: string[], arrayOfFiles: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build' || file === '.antigravity') {
      return;
    }
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, extensions, arrayOfFiles);
    } else {
      if (extensions.some(ext => file.endsWith(ext))) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

// Regex to capture capability strings (e.g. 'domain.resource.action' or 'domain:resource:action')
const CAPABILITY_REGEX = /['"`]([a-z0-9_-]+(?:\.[a-z0-9_-]+)+|[a-z0-9_-]+(?::[a-z0-9_-]+)+)['"`]/gi;

function extractCapabilitiesFromFiles(files: string[]): { capMap: Map<string, string[]>, allCaps: Set<string> } {
  const capMap = new Map<string, string[]>();
  const allCaps = new Set<string>();

  const knownDomains = [
    'academic', 'attendance', 'affairs', 'bk', 'curriculum', 'kesiswaan',
    'kurikulum', 'sarpras', 'hubin', 'cooperative', 'billing', 'notify',
    'dashboard', 'core', 'superadmin', 'platform', 'system', 'payments', 'correspondence'
  ];

  files.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      let match;
      while ((match = CAPABILITY_REGEX.exec(content)) !== null) {
        const capStr = match[1];
        const prefix = capStr.split(/[\.:]/)[0].toLowerCase();
        
        // Filter out irrelevant strings that match pattern but aren't capabilities
        if (knownDomains.includes(prefix)) {
          if (!capMap.has(capStr)) {
            capMap.set(capStr, []);
          }
          const relPath = path.relative(path.join(__dirname, '../../../'), filePath);
          capMap.get(capStr)!.push(relPath);
          allCaps.add(capStr);
        }
      }
    } catch (e) {
      // Ignore read errors
    }
  });

  return { capMap, allCaps };
}

async function runAudit() {
  console.log('🔍 Starting Absenta Capability Audit Inventory...\n');

  // 1. Config & Position Capabilities
  const configCapsByPosition = new Map<string, string[]>();
  const allConfigCaps = new Set<string>();
  const colonSyntaxCaps = new Set<string>();

  Object.entries(STRUKTUR_CAPABILITIES).forEach(([code, caps]) => {
    configCapsByPosition.set(code, caps);
    caps.forEach(cap => {
      allConfigCaps.add(cap);
      if (cap.includes(':')) {
        colonSyntaxCaps.add(cap);
      }
    });
  });

  // 2. Scan Backend Code (src & seeds)
  const backendFiles = getAllFiles(path.join(BACKEND_DIR, 'src'), ['.ts', '.js']);
  const seedFiles = getAllFiles(path.join(BACKEND_DIR, 'src/database/seeds'), ['.ts', '.js']);
  const allBackendFiles = [...backendFiles, ...seedFiles];
  
  const { capMap: _backendCapOccurrences, allCaps: backendCaps } = extractCapabilitiesFromFiles(allBackendFiles);

  // 3. Scan Frontend Code
  const frontendFiles = getAllFiles(path.join(FRONTEND_DIR, 'src'), ['.ts', '.tsx', '.js', '.jsx']);
  const { capMap: _frontendCapOccurrences, allCaps: frontendCaps } = extractCapabilitiesFromFiles(frontendFiles);

  // 4. Analysis
  const allDiscoveredCaps = new Set([...allConfigCaps, ...backendCaps, ...frontendCaps]);

  const orphanedInBackend = [...backendCaps].filter(cap => !allConfigCaps.has(cap));
  const orphanedInFrontend = [...frontendCaps].filter(cap => !allConfigCaps.has(cap));
  const unusedConfigCaps = [...allConfigCaps].filter(cap => !backendCaps.has(cap) && !frontendCaps.has(cap));

  const legacyAliases: { legacy: string, suggested: string }[] = [];
  allDiscoveredCaps.forEach(cap => {
    if (cap.includes(':')) {
      legacyAliases.push({ legacy: cap, suggested: cap.replace(/:/g, '.') });
    } else if (cap.includes('manage.mapel')) {
      legacyAliases.push({ legacy: cap, suggested: 'academic.subjects.manage' });
    } else if (cap.includes('manage.siswa')) {
      legacyAliases.push({ legacy: cap, suggested: 'academic.students.manage' });
    } else if (cap.includes('manage.guru')) {
      legacyAliases.push({ legacy: cap, suggested: 'academic.teachers.manage' });
    }
  });

  const auditReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPositions: Object.keys(STRUKTUR_CODES).length,
      totalConfiguredCapabilities: allConfigCaps.size,
      totalBackendDiscoveredCaps: backendCaps.size,
      totalFrontendDiscoveredCaps: frontendCaps.size,
      totalUniqueDiscoveredCaps: allDiscoveredCaps.size,
      colonSyntaxViolationsCount: colonSyntaxCaps.size,
      orphanedBackendCapsCount: orphanedInBackend.length,
      orphanedFrontendCapsCount: orphanedInFrontend.length,
      unusedConfigCapsCount: unusedConfigCaps.length
    },
    colonSyntaxViolations: Array.from(colonSyntaxCaps),
    legacyAliases,
    orphanedBackendCaps: orphanedInBackend.slice(0, 50),
    orphanedFrontendCaps: orphanedInFrontend.slice(0, 50),
    unusedConfigCaps: unusedConfigCaps.slice(0, 50),
    positionCapabilitiesBreakdown: Object.fromEntries(
      Object.entries(STRUKTUR_CAPABILITIES).map(([k, v]) => [k, { count: v.length, capabilities: v }])
    )
  };

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(auditReport, null, 2));

  console.log('✅ Audit Completed Successfully!');
  console.log('--------------------------------------------------');
  console.log(`📊 Total Positions Audited: ${auditReport.summary.totalPositions}`);
  console.log(`📊 Configured Capabilities: ${auditReport.summary.totalConfiguredCapabilities}`);
  console.log(`📊 Backend Capabilities: ${auditReport.summary.totalBackendDiscoveredCaps}`);
  console.log(`📊 Frontend Capabilities: ${auditReport.summary.totalFrontendDiscoveredCaps}`);
  console.log(`⚠️ Syntax Violations (colon ':' syntax): ${auditReport.summary.colonSyntaxViolationsCount}`);
  console.log(`⚠️ Orphaned Backend Capabilities: ${auditReport.summary.orphanedBackendCapsCount}`);
  console.log(`⚠️ Orphaned Frontend Capabilities: ${auditReport.summary.orphanedFrontendCapsCount}`);
  console.log(`ℹ️ Unused Config Capabilities: ${auditReport.summary.unusedConfigCapsCount}`);
  console.log('--------------------------------------------------');
  console.log(`📁 Audit Output JSON saved to: ${OUTPUT_JSON}`);
}

runAudit().catch(err => {
  console.error('❌ Audit Failed:', err);
  process.exit(1);
});

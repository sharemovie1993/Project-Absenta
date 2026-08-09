const fs = require('fs');
const path = require('path');
const SRC = 'd:/BarayaProject/Project Absenta/absenta_frontend/src';

const files = [
  'components/kurikulum/perangkat-ajar/PerangkatAjarPdfPreviewModal.tsx',
  'components/kurikulum/perangkat-ajar/PerangkatAjarAIModal.tsx',
  'components/kurikulum/perangkat-ajar/PerangkatAjarWizardModal.tsx',
  'components/kurikulum/perangkat-ajar/PerangkatAjarWordEditorModal.tsx',
  'pages/kurikulum/SupervisiAnalyticsDashboard.tsx',
];

for (const rel of files) {
  const full = path.join(SRC, rel);
  if (!fs.existsSync(full)) { console.log('MISSING:', rel); continue; }
  const content = fs.readFileSync(full, 'utf-8');
  const canMatches = content.match(/\bcan\('([^']+)'\)/g) || [];
  const useAuthMatches = (content.match(/\buseAuth\b/g) || []).length;
  const useCapsMatches = (content.match(/\buseCapabilities\b/g) || []).length;
  const roleMatches = (content.match(/user\?\.role|user\.role|role\?\./g) || []).length;
  const capsIncMatches = (content.match(/caps\.includes/g) || []).length;

  console.log('=== ' + rel + ' ===');
  console.log('  useCaps:', useCapsMatches, '| useAuth:', useAuthMatches, '| roleCheck:', roleMatches, '| capsInc:', capsIncMatches);
  console.log('  can() calls:', canMatches);
}

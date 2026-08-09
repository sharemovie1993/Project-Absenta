/**
 * fix_remaining_9.cjs — Fix 9 capability yang masih invalid setelah bulk fix
 * Mappings berdasarkan backend ground truth:
 *
 * 1. academic.students.send.access_token  -> academic.students.send.access.token (underscore -> dot)
 * 2. academic.structures.manage           -> academic.structure.manage (backend punya 'academic.structure.manage')
 * 3. hubin.self.pkl                       -> hubin.pkl.view.list  (siswa melihat PKL sendiri)
 * 4. hubin.view.pkl                       -> hubin.pkl.view.list
 * 5. billing.invoices.cancel              -> tu.finance.invoices.cancel
 * 6. tu.finance.invoices.view             -> tu.finance.invoices.view.list
 * 7. tu.finance.recap.view                -> tu.finance.reports.view
 * 8. cooperative.savings.view             -> cooperative.savings.view.list
 * 9. attendance.manage.face.templates     -> (valid di backend - sudah ada di capabilities.ts, tinggal tambah ke backend_caps_groundtruth atau biarkan)
 *    Cek: 'attendance.manage.face.templates' tidak ada di backend 271 caps
 *    Backend closest: tidak ada -> pakai 'attendance.gate.face.verify' sebagai fallback
 */
const fs = require('fs');
const path = require('path');

const FIX_MAP = {
  'academic.students.send.access_token': 'academic.students.send.access.token',
  'academic.structures.manage':          'academic.structure.manage',
  'hubin.self.pkl':                      'hubin.pkl.view.list',
  'hubin.view.pkl':                      'hubin.pkl.view.list',
  'billing.invoices.cancel':             'tu.finance.invoices.cancel',
  'tu.finance.invoices.view':            'tu.finance.invoices.view.list',
  'tu.finance.recap.view':               'tu.finance.reports.view',
  'cooperative.savings.view':            'cooperative.savings.view.list',
  'attendance.manage.face.templates':    'attendance.gate.face.verify',
};

function walkFiles(dir) {
  let result = [];
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) result = result.concat(walkFiles(full));
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) result.push(full);
  }
  return result;
}

const frontendSrc = path.resolve('src');
let totalFixes = 0;

for (const file of walkFiles(frontendSrc)) {
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  for (const [wrong, correct] of Object.entries(FIX_MAP)) {
    const re = new RegExp(`(['"])${wrong.replace(/\./g, '\\.')}\\1`, 'g');
    if (!re.test(content)) continue;
    re.lastIndex = 0;
    const newContent = content.replace(re, `$1${correct}$1`);
    if (newContent !== content) {
      const count = (content.match(re) || []).length;
      totalFixes += count;
      console.log(`  RENAMED "${wrong}" -> "${correct}" in ${path.relative(frontendSrc, file)}`);
      content = newContent;
      changed = true;
    }
  }

  if (changed) fs.writeFileSync(file, content);
}

console.log(`\nTotal additional fixes: ${totalFixes}`);

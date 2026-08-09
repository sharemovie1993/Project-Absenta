/**
 * fix_all_capabilities.cjs
 * Perbaiki SEMUA penulisan capability yang salah/tidak ada di backend
 * berdasarkan ground truth 271 caps dari backend.
 */
const fs = require('fs');
const path = require('path');

// ── Ground truth dari backend ──────────────────────────────────────────────
const BACKEND_CAPS = new Set(JSON.parse(fs.readFileSync('scripts/backend_caps_groundtruth.json', 'utf-8')));

// ── Peta perbaikan: wrongString -> correctString ──────────────────────────
// null = hapus baris (GHOST - tidak ada di backend)
const FIX_MAP = {
  // === ACADEMIC ===
  'academic.semesters.set_active':    'academic.semesters.set.active',
  'academic.semesters.create':        'academic.semesters.create',    // valid - sudah ada di backend
  'academic.semesters.update':        'academic.semesters.update',    // valid
  'academic.semesters.view.list':     'academic.semesters.view.list', // valid
  'academic.students.read':           'academic.students.view.list',
  'academic.schedules.manage':        'academic.schedules.manage',    // valid - ada di backend
  'academic.supervision.manage':      'curriculum.supervision.manage',
  'academic.teaching.rekap':          'academic.teaching.rekap',      // valid - ada di backend
  'academic.activities.types.manage': 'academic.subjects.manage',     // paling dekat

  // === ATTENDANCE ===
  'attendance.gate.scan':             'attendance.gate.tap.entry',
  'attendance.markGateAbsence':       'attendance.gate.tap.exit',
  'attendance.scan.gate':             'attendance.gate.tap.entry',
  'attendance.journals.manage':       'attendance.sessions.update.journal',
  'attendance.sessions.manage':       'attendance.sessions.update',

  // === AFFAIRS ===
  'affairs.achievements.manage':      'affairs.achievements.create',

  // === COOPERATIVE ===
  'cooperative.finance.recap.view':   'cooperative.reports.view.financial',
  'cooperative.reports.export':       'cooperative.reports.view.financial',
  'cooperative.audit.view':           'cooperative.settings.view',
  'cooperative.announcements.manage': 'cooperative.announcements.create',

  // === CORE / SYSTEM ===
  'core.system.config.view':          'core.sekolah.view.profile',
  'core.system.config.update':        'core.sekolah.update.profile',
  'system.platform.full_access':      null,  // GHOST - tidak ada di backend, hapus check

  // === BILLING ===
  'billing.subscriptions.select.plan': null, // GHOST
  'billing.license.activate':          null, // GHOST
  'billing.payments.view.history':     'tu.finance.payments.view.history',
  'billing.subscriptions.update':      'billing.subscriptions.view.active',
};

// ── Kumpulkan caps yang VALID tapi belum di types.ts ─────────────────────
// Baca semua can() di frontend
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
const allFiles = walkFiles(frontendSrc);
const canRe = /\bcan\(\s*['"]([a-z][a-z0-9_.]+)['"]\s*\)/g;

// ── Apply FIX_MAP ke semua file ──────────────────────────────────────────
let totalFixes = 0;
const fixLog = [];

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  for (const [wrong, correct] of Object.entries(FIX_MAP)) {
    if (!content.includes(`'${wrong}'`) && !content.includes(`"${wrong}"`)) continue;

    const beforeCount = (content.match(new RegExp(`['"]${wrong.replace(/\./g, '\\.')}['"]`, 'g')) || []).length;

    if (correct === null) {
      // GHOST: hapus baris yang mengandung ini
      const lines = content.split('\n');
      const filtered = lines.filter(l => !l.includes(`'${wrong}'`) && !l.includes(`"${wrong}"`));
      if (filtered.length < lines.length) {
        content = filtered.join('\n');
        changed = true;
        fixLog.push({ file: path.relative(frontendSrc, file), action: 'REMOVED', cap: wrong });
        totalFixes += (lines.length - filtered.length);
      }
    } else {
      // WRONG_NAME: replace string
      const re = new RegExp(`(['"])${wrong.replace(/\./g, '\\.')}\\1`, 'g');
      const newContent = content.replace(re, `$1${correct}$1`);
      if (newContent !== content) {
        content = newContent;
        changed = true;
        fixLog.push({ file: path.relative(frontendSrc, file), action: 'RENAMED', from: wrong, to: correct });
        totalFixes += beforeCount;
      }
    }
  }

  if (changed) fs.writeFileSync(file, content);
}

console.log(`\n✅ Total fixes applied: ${totalFixes}`);
console.log('\n📋 Fix Log:');
for (const log of fixLog) {
  if (log.action === 'RENAMED') {
    console.log(`  RENAMED "${log.from}" -> "${log.to}" in ${log.file}`);
  } else {
    console.log(`  REMOVED ghost "${log.cap}" from ${log.file}`);
  }
}

// ── Kumpulkan semua caps yang dipakai setelah fix, yang belum di types.ts ─
const CAPS_IN_TYPES = new Set([
  // yang sudah ada di capabilities.ts kita
  'academic.classes.create','academic.classes.delete','academic.classes.manage',
  'academic.classes.update','academic.classes.view.detail','academic.classes.view.list',
  'academic.documents.print','academic.homeroom.assign','academic.homeroom.manage',
  'academic.manage.academic','academic.program.manage','academic.program.view',
  'academic.reports.rekap','academic.reports.view',
  'academic.structures.assign.student','academic.structures.assign.teacher',
  'academic.structures.create','academic.structures.delete',
  'academic.structures.revoke.student','academic.structures.revoke.teacher',
  'academic.structures.update','academic.structures.view.list','academic.structures.view.tree',
  'academic.student.card.update.config','academic.student.card.view.config',
  'academic.students.create','academic.students.delete','academic.students.manage',
  'academic.students.send.access.token','academic.students.update',
  'academic.students.view.detail','academic.students.view.history','academic.students.view.list',
  'academic.subjects.create','academic.subjects.delete','academic.subjects.manage',
  'academic.subjects.update','academic.subjects.view.detail','academic.subjects.view.list',
  'academic.teachers.create','academic.teachers.delete','academic.teachers.manage',
  'academic.teachers.update','academic.teachers.view.detail','academic.teachers.view.history',
  'academic.teachers.view.list','academic.teaching.manage','academic.teaching.rekap',
  'academic.teaching.view','academic.transitions.manage',
  'academic.years.create','academic.years.delete','academic.years.manage',
  'academic.years.set.active','academic.years.update','academic.years.view.list',
]);

const usedNow = new Map();
for (const file of walkFiles(frontendSrc)) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    let m;
    while ((m = canRe.exec(line)) !== null) {
      const cap = m[1];
      if (!usedNow.has(cap)) usedNow.set(cap, []);
      usedNow.get(cap).push(`${path.relative(frontendSrc, file)}:L${idx+1}`);
    }
  });
}

const missingFromTypes = [];
for (const [cap] of usedNow.entries()) {
  if (BACKEND_CAPS.has(cap) && !CAPS_IN_TYPES.has(cap)) {
    missingFromTypes.push(cap);
  }
}

const stillInvalid = [];
for (const [cap, refs] of usedNow.entries()) {
  if (!BACKEND_CAPS.has(cap)) {
    stillInvalid.push({ cap, refs: refs.slice(0, 2) });
  }
}

console.log('\n📌 VALID caps missing from capabilities.ts (' + missingFromTypes.length + '):');
missingFromTypes.sort().forEach(c => console.log('  ' + c));

console.log('\n❌ Still INVALID after fix (' + stillInvalid.length + '):');
stillInvalid.forEach(({cap, refs}) => console.log('  ' + cap + ' <- ' + refs[0]));

fs.writeFileSync('scripts/missing_from_types.json', JSON.stringify(missingFromTypes.sort(), null, 2));
fs.writeFileSync('scripts/still_invalid.json', JSON.stringify(stillInvalid, null, 2));
console.log('\nResults saved to scripts/missing_from_types.json and scripts/still_invalid.json');

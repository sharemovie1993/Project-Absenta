import fs from 'fs';
import path from 'path';

const BACKEND_DIR = path.join(__dirname, '../../');
const FRONTEND_DIR = path.join(__dirname, '../../../absenta_frontend');

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

// Exhaustive list of legacy patterns to look for
const LEGACY_PATTERNS = [
  // Indonesian syntax pattern (domain.manage.* or domain.view.* where domain is academic/kesiswaan/kurikulum/cadangan)
  /['"`](academic\.(?:manage|view)\.[a-z0-9_-]+)['"`]/g,
  /['"`](kesiswaan\.(?:manage|view)\.[a-z0-9_-]+)['"`]/g,
  /['"`](kurikulum\.(?:manage|view)\.[a-z0-9_-]+)['"`]/g,
  /['"`](cadangan\.[a-z0-9_-]+(?:\.[a-z0-9_-]+)*)['"`]/g,
  /['"`](sarpras\.view_inventory)['"`]/g,
  /['"`]([a-z0-9_-]+:[a-z0-9_-]+:[a-z0-9_-]+)['"`]/g,
  /['"`]([a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+_[a-z0-9_-]+)['"`]/g
];

interface UsageOccurrence {
  file: string;
  line: number;
  rawMatch: string;
  suggestedCanonical: string;
}

function getCanonicalReplacement(legacy: string): string {
  const map: Record<string, string> = {
    'academic.manage.mapel': 'academic.subjects.manage',
    'academic.view.mapel': 'academic.subjects.view.list',
    'academic.manage.siswa': 'academic.students.manage',
    'academic.view.siswa': 'academic.students.view.list',
    'academic.manage.guru': 'academic.teachers.manage',
    'academic.view.guru': 'academic.teachers.view.list',
    'academic.manage.kelas': 'academic.structures.manage',
    'academic.view.kelas': 'academic.structures.view.list',
    'academic.manage.semester': 'academic.semesters.manage',
    'academic.view.semester': 'academic.semesters.view.list',
    'academic.manage.tahun.pelajaran': 'academic.years.manage',
    'academic.view.tahun.pelajaran': 'academic.years.view.list',
    'academic.manage.jenis.kegiatan': 'academic.activities.types.manage',
    'academic.view.jenis.kegiatan': 'academic.activities.types.view',
    'academic.manage.kbm': 'academic.schedules.manage',
    'academic.view.kbm': 'academic.schedules.view.list',
    'academic.manage.wali.kelas': 'academic.homeroom.manage',
    'academic.view.wali.kelas': 'academic.homeroom.manage',
    'academic.rekap.kbm': 'academic.teaching.rekap',
    'academic.view.struktur.organisasi': 'academic.structures.view.tree',
    'academic.view.student.card': 'academic.student.card.view.config',
    'sarpras.view_inventory': 'sarpras.inventory.view.list',
    'kesiswaan.manage.pelanggaran': 'affairs.violations.manage',
    'kesiswaan.view.pelanggaran': 'affairs.violations.view.list',
    'kurikulum.manage.supervisi': 'curriculum.supervision.manage',
    'kurikulum.view.supervisi': 'curriculum.supervision.view.report',
    'cadangan.manage.cadangan': 'academic.backups.create',
    'cadangan.view.cadangan': 'academic.backups.view.list'
  };

  if (map[legacy]) return map[legacy];
  return '';
}

function scanRepository(): UsageOccurrence[] {
  const occurrences: UsageOccurrence[] = [];

  const backendFiles = getAllFiles(path.join(BACKEND_DIR, 'src'), ['.ts', '.js']);
  const frontendFiles = getAllFiles(path.join(FRONTEND_DIR, 'src'), ['.ts', '.tsx', '.js', '.jsx']);
  const allFiles = [...backendFiles, ...frontendFiles];

  allFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((lineText, lineIdx) => {
        LEGACY_PATTERNS.forEach(pattern => {
          let match;
          const regexCopy = new RegExp(pattern.source, pattern.flags);
          while ((match = regexCopy.exec(lineText)) !== null) {
            const legacyStr = match[1];
            const suggested = getCanonicalReplacement(legacyStr);
            if (suggested) {
              const relPath = path.relative(path.join(__dirname, '../../../'), filePath);
              occurrences.push({
                file: relPath,
                line: lineIdx + 1,
                rawMatch: legacyStr,
                suggestedCanonical: suggested
              });
            }
          }
        });
      });
    } catch (e) {
      // Ignore read errors
    }
  });

  return occurrences;
}

const occurrences = scanRepository();
console.log(`\n🔍 Found ${occurrences.length} legacy capability occurrences across the entire codebase.\n`);

const occurrencesByFile = new Map<string, UsageOccurrence[]>();
occurrences.forEach(occ => {
  if (!occurrencesByFile.has(occ.file)) {
    occurrencesByFile.set(occ.file, []);
  }
  occurrencesByFile.get(occ.file)!.push(occ);
});

console.log('--------------------------------------------------');
console.log('📁 EXHAUSTIVE FILE-BY-FILE MIGRATION LIST:');
console.log('--------------------------------------------------');

occurrencesByFile.forEach((items, file) => {
  console.log(`\n📄 File: ${file} (${items.length} occurrences)`);
  items.forEach(item => {
    console.log(`  - Line ${item.line}: '${item.rawMatch}' -> '${item.suggestedCanonical}'`);
  });
});

fs.writeFileSync(
  path.join(BACKEND_DIR, 'legacy_capabilities_exhaustive_scan.json'),
  JSON.stringify({ total: occurrences.length, filesCount: occurrencesByFile.size, files: Object.fromEntries(occurrencesByFile) }, null, 2)
);

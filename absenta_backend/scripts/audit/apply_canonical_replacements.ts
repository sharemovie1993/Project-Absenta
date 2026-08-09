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

const REPLACEMENTS: Array<{ legacyRegex: RegExp, replacement: string }> = [
  { legacyRegex: /'academic\.manage\.mapel'/g, replacement: "'academic.subjects.manage'" },
  { legacyRegex: /"academic\.manage\.mapel"/g, replacement: '"academic.subjects.manage"' },
  { legacyRegex: /'academic\.view\.mapel'/g, replacement: "'academic.subjects.view.list'" },
  { legacyRegex: /"academic\.view\.mapel"/g, replacement: '"academic.subjects.view.list"' },

  { legacyRegex: /'academic\.manage\.siswa'/g, replacement: "'academic.students.manage'" },
  { legacyRegex: /"academic\.manage\.siswa"/g, replacement: '"academic.students.manage"' },
  { legacyRegex: /'academic\.view\.siswa'/g, replacement: "'academic.students.view.list'" },
  { legacyRegex: /"academic\.view\.siswa"/g, replacement: '"academic.students.view.list"' },

  { legacyRegex: /'academic\.manage\.guru'/g, replacement: "'academic.teachers.manage'" },
  { legacyRegex: /"academic\.manage\.guru"/g, replacement: '"academic.teachers.manage"' },
  { legacyRegex: /'academic\.view\.guru'/g, replacement: "'academic.teachers.view.list'" },
  { legacyRegex: /"academic\.view\.guru"/g, replacement: '"academic.teachers.view.list"' },

  { legacyRegex: /'academic\.manage\.kelas'/g, replacement: "'academic.structures.manage'" },
  { legacyRegex: /"academic\.manage\.kelas"/g, replacement: '"academic.structures.manage"' },
  { legacyRegex: /'academic\.view\.kelas'/g, replacement: "'academic.structures.view.list'" },
  { legacyRegex: /"academic\.view\.kelas"/g, replacement: '"academic.structures.view.list"' },

  { legacyRegex: /'academic\.manage\.kbm'/g, replacement: "'academic.schedules.manage'" },
  { legacyRegex: /"academic\.manage\.kbm"/g, replacement: '"academic.schedules.manage"' },
  { legacyRegex: /'academic\.view\.kbm'/g, replacement: "'academic.schedules.view.list'" },
  { legacyRegex: /"academic\.view\.kbm"/g, replacement: '"academic.schedules.view.list"' },

  { legacyRegex: /'cadangan\.manage\.cadangan'/g, replacement: "'academic.backups.restore'" },
  { legacyRegex: /"cadangan\.manage\.cadangan"/g, replacement: '"academic.backups.restore"' },
  { legacyRegex: /'cadangan\.view\.cadangan'/g, replacement: "'academic.backups.view.list'" },
  { legacyRegex: /"cadangan\.view\.cadangan"/g, replacement: '"academic.backups.view.list"' },

  { legacyRegex: /'sarpras\.view_inventory'/g, replacement: "'sarpras.inventory.view.list'" },
  { legacyRegex: /"sarpras\.view_inventory"/g, replacement: '"sarpras.inventory.view.list"' },

  { legacyRegex: /'academic\.manage\.semester'/g, replacement: "'academic.semesters.manage'" },
  { legacyRegex: /"academic\.manage\.semester"/g, replacement: '"academic.semesters.manage"' },
  { legacyRegex: /'academic\.view\.semester'/g, replacement: "'academic.semesters.view.list'" },
  { legacyRegex: /"academic\.view\.semester"/g, replacement: '"academic.semesters.view.list"' },

  { legacyRegex: /'kesiswaan\.manage\.pelanggaran'/g, replacement: "'affairs.violations.manage'" },
  { legacyRegex: /"kesiswaan\.manage\.pelanggaran"/g, replacement: '"affairs.violations.manage"' },
  { legacyRegex: /'kesiswaan\.view\.pelanggaran'/g, replacement: "'affairs.violations.view.list'" },
  { legacyRegex: /"kesiswaan\.view\.pelanggaran"/g, replacement: '"affairs.violations.view.list"' },

  { legacyRegex: /'kurikulum\.manage\.supervisi'/g, replacement: "'curriculum.supervision.manage'" },
  { legacyRegex: /"kurikulum\.manage\.supervisi"/g, replacement: '"curriculum.supervision.manage"' },
  { legacyRegex: /'kurikulum\.view\.supervisi'/g, replacement: "'curriculum.supervision.view.report'" },
  { legacyRegex: /"kurikulum\.view\.supervisi"/g, replacement: '"curriculum.supervision.view.report"' },
];

function applyReplacements() {
  console.log('🚀 Applying Canonical Capability Replacements across backend and frontend...\n');

  const backendFiles = getAllFiles(path.join(BACKEND_DIR, 'src'), ['.ts', '.js']);
  const frontendFiles = getAllFiles(path.join(FRONTEND_DIR, 'src'), ['.ts', '.tsx', '.js', '.jsx']);
  const allFiles = [...backendFiles, ...frontendFiles];

  let modifiedCount = 0;

  allFiles.forEach(filePath => {
    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      let originalContent = content;

      REPLACEMENTS.forEach(({ legacyRegex, replacement }) => {
        content = content.replace(legacyRegex, replacement);
      });

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf-8');
        const relPath = path.relative(path.join(__dirname, '../../../'), filePath);
        console.log(`✅ Refactored: ${relPath}`);
        modifiedCount++;
      }
    } catch (e) {
      // Ignore read errors
    }
  });

  console.log(`\n🎉 Total files refactored cleanly: ${modifiedCount}`);
}

applyReplacements();

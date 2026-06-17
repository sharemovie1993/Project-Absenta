import fs from 'fs';

const path = 'src/modules/attendance/gerbang/controllers/gerbang.controller.ts';
let content = fs.readFileSync(path, 'utf8');

// Pattern for getSessions and getSessionById redundancy
const longPattern = /if\s*\(roleName\s*===\s*RoleName\.SISWA\s*&&\s*userId\)\s*\{[\s\S]*?if\s*\(!isPetugas\)\s*\{[\s\S]*?return\s*\{[\s\S]*?\}\s*\}\s*\}/g;

const replacement = `      const org = (request as any).organizationalScope;
      const isPetugas = (org?.kelas_ids?.length || 0) > 0 || org?.tenant_wide === true;

      if (roleName === RoleName.SISWA && !isPetugas) {
          reply.status(403);
          return { success: false, message: 'Forbidden: Hanya Petugas yang dapat mengakses fitur ini' };
      }`;

const newContent = content.replace(longPattern, replacement);

if (content !== newContent) {
    fs.writeFileSync(path, newContent);
    console.log('Successfully cleaned redundancies in gerbang.controller.ts');
} else {
    console.log('No redundancies found or pattern mismatch.');
}

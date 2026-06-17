const fs = require('fs');
const path = require('path');

// Full list from Glob scan
const files = [
  'src/modules/kurikulum/routes/supervisi.routes.ts',
  'src/modules/academic/backup/routes/backup.routes.ts',
  'src/modules/document-center/routes/documents.routes.ts',
  'src/modules/billing/routes/billing-dashboard.routes.ts',
  'src/modules/kesiswaan/routes/jenis-pelanggaran.routes.ts',
  'src/modules/attendance/kejadian-khusus/routes/kejadian-khusus.routes.ts',
  'src/modules/academic/wali-kelas/routes/wali-kelas.routes.ts',
  'src/modules/academic/struktur-organisasi/routes/struktur-organisasi.routes.ts',
  'src/modules/billing/routes/billing.routes.ts',
  'src/modules/academic/mapel/routes/mapel.routes.ts',
  'src/modules/payment/routes/payment.routes.ts',
  'src/modules/academic/transition/routes/transition.routes.ts',
  'src/modules/academic/kenaikan-kelas/routes/kenaikan-kelas.routes.ts',
  'src/modules/user/routes/user.routes.ts',
  'src/modules/billing/routes/plan.routes.ts',
  'src/modules/billing/routes/subscription-check.routes.ts',
  'src/modules/billing/routes/subscription.routes.ts',
  'src/modules/system-config/routes/system-config.routes.ts',
  'src/modules/academic/routes/academic.routes.ts',
  'src/modules/notification/routes/notification.routes.ts',
  'src/modules/superadmin/infra/routes/infra.routes.ts',
  'src/modules/attendance/petugas/routes/petugas.routes.ts',
  'src/modules/invoice/routes/invoice.routes.ts',
  'src/modules/attendance/gerbang/routes/gerbang.routes.ts',
  'src/modules/attendance/sesi-absensi/routes/sesi-absensi.routes.ts',
  'src/modules/menu/routes/menu.routes.ts',
  'src/modules/dashboard/routes/dashboard.routes.ts',
  'src/modules/academic/tahun-pelajaran/routes/tahun-pelajaran.routes.ts',
  'src/modules/attendance/rekap/routes/rekap.routes.ts',
  'src/modules/attendance/notify/routes/notify.routes.ts',
  'src/modules/academic/student-card-config/routes/student-card-config.routes.ts',
  'src/modules/attendance/jadwal-template/routes/jadwal-template.routes.ts',
  'src/modules/academic/jurusan/routes/jurusan.routes.ts',
  'src/modules/academic/kelas/routes/kelas.routes.ts',
  'src/modules/attendance/guru-monitoring/routes/guru-monitoring.routes.ts',
  'src/modules/academic/jenis-kegiatan-master/routes/jenis-kegiatan-master.routes.ts',
  'src/modules/academic/guru-mapel/routes/guru-mapel.routes.ts',
  'src/modules/kesiswaan/routes/pelanggaran.routes.ts',
  'src/modules/academic/semester/routes/semester.routes.ts',
  'src/modules/academic/guru/routes/guru.routes.ts',
  'src/modules/academic/siswa/routes/siswa.routes.ts',
  'src/modules/sekolah/routes/sekolah.routes.ts',
  'src/modules/parent-app/routes/parent-app.routes.ts',
  'src/modules/auth/routes/auth.routes.ts',
  'src/modules/invoice/routes/public.routes.ts',
  'src/modules/payment/routes/public.routes.ts',
  'src/modules/pdf/routes/pdf.routes.ts',
  'src/modules/tenant/routes/tenant.routes.ts',
  'src/modules/payment/routes/test.routes.ts',
  'src/modules/upload/routes/upload.routes.ts',
  'src/modules/payment/routes/webhook.routes.ts',
  'src/modules/reporting/routes/reporting.routes.ts',
  'src/modules/consent/routes/consent.routes.ts',
  'src/modules/superadmin/tenant-detail/routes/tenant-detail.routes.ts'
];

const rolePermissions = {
  'ADMIN': new Set(),
  'GURU': new Set(),
  'SISWA': new Set()
};

function cleanRole(r) {
  if (r.includes('ADMIN')) return 'ADMIN';
  if (r.includes('GURU')) return 'GURU';
  if (r.includes('SISWA')) return 'SISWA';
  return null;
}

// Function to extract balanced content
function extractBalanced(str, startIndex) {
  let depth = 0;
  let result = '';
  for (let i = startIndex; i < str.length; i++) {
    const char = str[i];
    if (char === '[') depth++;
    if (char === ']') depth--;
    result += char;
    if (depth === 0) return result;
  }
  return result; // Should not happen if balanced
}

files.forEach(relativePath => {
  const fullPath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(fullPath)) {
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Find all occurrences of "preHandler: ["
  let regex = /preHandler\s*:\s*\[/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    // Start index of the ARRAY content (after '[')
    const startIndex = match.index + match[0].length - 1; // include the opening '['
    
    // Extract the full array block handling nested brackets
    const block = extractBalanced(content, startIndex);
    
    // Now parse block for authorize and requireCapability
    
    // 1. Find Authorize roles
    const authorizeMatch = /authorize\s*\(\s*\[([\s\S]*?)\]\s*\)/.exec(block);
    if (!authorizeMatch) continue;
    
    const rolesStr = authorizeMatch[1];
    const roles = rolesStr.split(',').map(r => cleanRole(r)).filter(r => r);

    // 2. Find Capabilities
    const capRegex = /requireCapability\s*\(\s*['"]([^'"]+)['"](?:,\s*({[\s\S]*?}))?\s*\)/g;
    let capMatch;
    
    while ((capMatch = capRegex.exec(block)) !== null) {
      const capability = capMatch[1];
      const optionsStr = capMatch[2];
      
      let exemptRoles = [];
      if (optionsStr) {
        const exemptMatch = /exemptRoles\s*:\s*\[([\s\S]*?)\]/.exec(optionsStr);
        if (exemptMatch) {
          exemptRoles = exemptMatch[1].split(',').map(r => cleanRole(r)).filter(r => r);
        }
      }

      roles.forEach(role => {
        if (rolePermissions[role] && !exemptRoles.includes(role)) {
          rolePermissions[role].add(capability);
        }
      });
    }
  }
});

let md = `# Inventarisir Role Permission (Routes Based)

Dokumen ini dihasilkan secara otomatis melalui Deep Scan terhadap kode routes.
Daftar ini menunjukkan capability apa saja yang **DIBUTUHKAN** oleh setiap role agar dapat mengakses endpoint yang diizinkan untuk mereka (berdasarkan \`authorize\` guard).

`;

['ADMIN', 'GURU', 'SISWA'].forEach(role => {
  md += `## Role: ${role}\n\n`;
  if (rolePermissions[role].size === 0) {
    md += `*(Tidak ada capability yang terdeteksi secara eksplisit untuk role ini)*\n\n`;
  } else {
    const sortedCaps = Array.from(rolePermissions[role]).sort();
    sortedCaps.forEach(cap => {
      md += `- ${cap}\n`;
    });
    md += `\n**Total: ${sortedCaps.length} capabilities**\n\n`;
  }
  md += `---\n\n`;
});

const outputPath = path.join(process.cwd(), 'docs/inventarisir_role_permission_routes_based.md');
fs.writeFileSync(outputPath, md);
console.log(`Inventory written to ${outputPath}`);

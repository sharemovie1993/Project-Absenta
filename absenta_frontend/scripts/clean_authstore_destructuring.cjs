const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../src');
const TARGET_FILES = [
  'components/academic/guru/GuruList.tsx',
  'components/academic/kelas/KelasList.tsx',
  'components/academic/mapel/MapelList.tsx',
  'components/academic/siswa/SiswaList.tsx',
  'components/academic/siswa/SiswaTimelineAndExitTab.tsx',
  'components/academic/wali-kelas/WaliKelasList.tsx',
  'pages/academic/GuruPage.tsx',
  'pages/academic/JenisKegiatanMasterPage.tsx',
  'pages/academic/JurusanPage.tsx',
  'pages/academic/KelasPage.tsx',
  'pages/academic/SemesterPage.tsx',
  'pages/academic/SiswaPage.tsx',
  'pages/academic/struktur-organisasi/StrukturOrganisasiPage.tsx',
  'pages/academic/TahunPelajaranPage.tsx'
];

TARGET_FILES.forEach(relFile => {
  const full = path.join(SRC, relFile);
  if (!fs.existsSync(full)) return;
  let content = fs.readFileSync(full, 'utf-8');

  // Fix useAuthStore destructuring that includes 'can' or 'authLoading' or 'isLoading'
  content = content.replace(/const\s+\{[^}]*can[^}]*\}\s*=\s*useAuthStore\(\);?/g, (match) => {
    // If user is also destructured, keep user
    if (match.includes('user')) {
      return 'const { user } = useAuthStore();';
    }
    return ''; // remove if user is not in it
  });

  // Remove leftover isLoading / authLoading destructuring from useAuthStore
  content = content.replace(/const\s+\{[^}]*isLoading:\s*authLoading[^}]*\}\s*=\s*useAuthStore\(\);?/g, '');

  fs.writeFileSync(full, content);
  console.log('Cleaned: ' + relFile);
});

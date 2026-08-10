const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../src');
const ACADEMIC_PAGES = [
  'pages/academic/GuruPage.tsx',
  'pages/academic/JenisKegiatanMasterPage.tsx',
  'pages/academic/JurusanPage.tsx',
  'pages/academic/KelasPage.tsx',
  'pages/academic/SemesterPage.tsx',
  'pages/academic/SiswaPage.tsx',
  'pages/academic/struktur-organisasi/StrukturOrganisasiPage.tsx',
  'pages/academic/TahunPelajaranPage.tsx'
];

ACADEMIC_PAGES.forEach(relFile => {
  const full = path.join(SRC, relFile);
  if (!fs.existsSync(full)) return;
  let content = fs.readFileSync(full, 'utf-8');

  content = content.replace(/\s*isLoading=\{authLoading\}/g, '');
  content = content.replace(/\s*if\s*\(\s*authLoading\s*\)\s*\{[^}]*\}/g, '');

  fs.writeFileSync(full, content);
  console.log('Cleaned authLoading in: ' + relFile);
});

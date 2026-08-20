import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';

const externalDir = path.resolve(__dirname, '../../sumber eksternal');

async function inspectModules() {
  const files = fs.readdirSync(externalDir).filter(f => f.endsWith('.docx'));
  console.log(`Found ${files.length} docx files to inspect:\n`);

  for (const file of files) {
    const fullPath = path.join(externalDir, file);
    const result = await mammoth.extractRawText({ path: fullPath });
    const text = result.value;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    console.log('================================================================');
    console.log(`FILE: ${file}`);
    console.log(`TOTAL LINES: ${lines.length}, TOTAL CHARACTERS: ${text.length}`);
    console.log('----------------------------------------------------------------');

    // Cari komponen utama Kurikulum Merdeka di dalam teks
    const hasInformasiUmum = lines.some(l => /informasi umum|identitas modul/i.test(l));
    const hasKompetensiAwal = lines.some(l => /kompetensi awal/i.test(l));
    const hasProfilPancasila = lines.some(l => /profil pelajar pancasila/i.test(l));
    const hasSaranaPrasarana = lines.some(l => /sarana dan prasarana/i.test(l));
    const hasTargetPeserta = lines.some(l => /target peserta didik/i.test(l));
    const hasModelPembelajaran = lines.some(l => /model pembelajaran/i.test(l));
    const hasKomponenInti = lines.some(l => /komponen inti/i.test(l));
    const hasTujuanPembelajaran = lines.some(l => /tujuan pembelajaran/i.test(l));
    const hasPemahamanBermakna = lines.some(l => /pemahaman bermakna/i.test(l));
    const hasPertanyaanPemantik = lines.some(l => /pertanyaan pemantik/i.test(l));
    const hasKegiatanPembelajaran = lines.some(l => /kegiatan pembelajaran/i.test(l));
    const hasAsesmen = lines.some(l => /asesmen|penilaian/i.test(l));
    const hasLampiran = lines.some(l => /lampiran/i.test(l));
    const hasLKPD = lines.some(l => /lembar kerja|lkpd/i.test(l));
    const hasBahanBacaan = lines.some(l => /bahan bacaan|materi/i.test(l));
    const hasGlosarium = lines.some(l => /glosarium/i.test(l));
    const hasDaftarPustaka = lines.some(l => /daftar pustaka/i.test(l));

    // Cari daftar pertemuan
    const pertemuanMatches = lines.filter(l => /pertemuan (ke-?\s*\d+|\d+)/i.test(l));

    console.log('Struktur Utama Terdeteksi:');
    console.log(`- Informasi Umum / Identitas: ${hasInformasiUmum ? '✅' : '❌'}`);
    console.log(`- Profil Pelajar Pancasila: ${hasProfilPancasila ? '✅' : '❌'}`);
    console.log(`- Tujuan Pembelajaran: ${hasTujuanPembelajaran ? '✅' : '❌'}`);
    console.log(`- Pertanyaan Pemantik: ${hasPertanyaanPemantik ? '✅' : '❌'}`);
    console.log(`- Kegiatan Pembelajaran (Langkah KBM): ${hasKegiatanPembelajaran ? '✅' : '❌'}`);
    console.log(`- Asesmen / Penilaian: ${hasAsesmen ? '✅' : '❌'}`);
    console.log(`- Lampiran & LKPD: ${hasLKPD ? '✅' : '❌'}`);
    console.log(`- Bahan Bacaan Guru & Siswa: ${hasBahanBacaan ? '✅' : '❌'}`);
    console.log(`- Glosarium & Daftar Pustaka: ${hasGlosarium && hasDaftarPustaka ? '✅' : '❌'}`);
    console.log(`- Indikasi Pertemuan (${pertemuanMatches.length} baris): ${pertemuanMatches.slice(0, 8).join(' | ')}`);
    console.log('\nCuplikan 15 Baris Pertama:');
    console.log(lines.slice(0, 15).join('\n'));
    console.log('\n');
  }
}

inspectModules().catch(console.error);

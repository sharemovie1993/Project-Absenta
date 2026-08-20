import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const externalDir = path.resolve(__dirname, '../../sumber eksternal');

interface ParsedPertemuan {
  nomor_pertemuan: number;
  alokasi_jp: number;
  durasi_menit: number;
  topik: string;
  tujuan_pembelajaran: string[];
  langkah_kbm: {
    pendahuluan: {
      durasi_menit: number;
      kegiatan: string[];
    };
    inti: {
      durasi_menit: number;
      kegiatan: string[];
      teks_bacaan?: {
        judul: string;
        paragraf: string[];
      };
      lkpd?: {
        judul: string;
        petunjuk: string;
      };
    };
    penutup: {
      durasi_menit: number;
      kegiatan: string[];
    };
  };
}

interface ParsedModul {
  id: string;
  nomor_bab: number;
  judul_modul: string;
  nama_mapel: string;
  kode_mapel: string;
  fase: string;
  tingkat: number;
  total_alokasi_jp: number;
  total_pertemuan: number;
  deskripsi: string;
  pendekatan: string;
  sumber: string;
  tags: string[];
  konten_json: ParsedPertemuan[];
}

function cleanText(t: string): string {
  return t.replace(/\r/g, '').replace(/\t/g, ' ').replace(/\u00a0/g, ' ').trim();
}

async function parseDocxFile(filePath: string): Promise<ParsedModul | null> {
  const fileName = path.basename(filePath);
  const result = await mammoth.extractRawText({ path: filePath });
  const rawText = result.value;
  const rawLines = rawText.split('\n').map(l => cleanText(l)).filter(l => l.length > 0);

  // 1. Ekstrak Nomor Bab & Judul Modul
  let nomorBab = 1;
  let judulBab = '';

  const babMatch = rawLines.find(l => /^BAB\s*(\d+)\s*:\s*(.*)/i.test(l)) ||
                   rawLines.find(l => /^BAB\s*(\d+)/i.test(l));

  if (babMatch) {
    const m = babMatch.match(/^BAB\s*(\d+)\s*[:\-\s]*(.*)/i);
    if (m) {
      nomorBab = parseInt(m[1], 10);
      judulBab = m[2]?.trim() || '';
    }
  }

  if (!judulBab) {
    const fileTitleMatch = fileName.match(/Modul\s*(\d+)\s*-\s*([^\[]+)/i);
    if (fileTitleMatch) {
      nomorBab = parseInt(fileTitleMatch[1], 10);
      judulBab = fileTitleMatch[2]?.trim() || '';
    }
  }

  const judulModulLengkap = `Modul ${nomorBab}: ${judulBab || 'Pembelajaran Bahasa Indonesia'}`;

  // 2. Ekstrak Mapel, Kelas, Fase, & Alokasi JP
  let mapelNama = 'Bahasa Indonesia';
  let tingkat = 10;
  let fase = 'E';
  let totalJp = 18;

  for (const line of rawLines.slice(0, 35)) {
    if (/Mata Pelajaran\s*[:\t]\s*(.*)/i.test(line)) {
      const m = line.match(/Mata Pelajaran\s*[:\t]\s*(.*)/i);
      if (m && m[1].trim()) mapelNama = m[1].trim();
    }
    if (/Kelas\s*\/\s*Fase/i.test(line) || /Fase\s*[:\t]\s*(.*)/i.test(line)) {
      if (/Fase\s*F|Kelas\s*XI|Kelas\s*11|Kelas\s*XII|Kelas\s*12/i.test(line)) {
        fase = 'F';
        tingkat = /XII|12/i.test(line) ? 12 : 11;
      } else {
        fase = 'E';
        tingkat = 10;
      }
    }
    if (/Alokasi Waktu\s*[:\t]\s*(.*)/i.test(line)) {
      const jpMatch = line.match(/(\d+)\s*(?:Jam Pelajaran|JP)/i);
      if (jpMatch) {
        totalJp = parseInt(jpMatch[1], 10);
      }
    }
  }

  // 3. Ekstrak Tujuan Pembelajaran Umum
  const tujuanPembelajaranUmum: string[] = [];
  let inTujuan = false;
  for (const line of rawLines) {
    if (/^[C-D]\.\s*Tujuan Pembelajaran/i.test(line) || /^Tujuan Pembelajaran\s*[:\t]/i.test(line)) {
      inTujuan = true;
      continue;
    }
    if (inTujuan) {
      if (/^[A-Z]\.\s*[A-Za-z]/i.test(line) || /^Pertanyaan Pemantik/i.test(line) || /^Kegiatan Pembelajaran/i.test(line)) {
        inTujuan = false;
        continue;
      }
      if (line.length > 5 && !line.startsWith('Peserta didik')) {
        tujuanPembelajaranUmum.push(line.replace(/^[\d\.\-\*\•\–]\s*/, '').trim());
      }
    }
  }

  // 4. Ekstrak Pertanyaan Pemantik
  const pertanyaanPemantikList: string[] = [];
  let inPemantik = false;
  for (const line of rawLines) {
    if (/Pertanyaan Pemantik/i.test(line)) {
      inPemantik = true;
      continue;
    }
    if (inPemantik) {
      if (/^[A-Z]\.\s*[A-Za-z]/i.test(line) || /^Kegiatan Pembelajaran/i.test(line) || /^Langkah/i.test(line)) {
        inPemantik = false;
        continue;
      }
      if (line.length > 8) {
        pertanyaanPemantikList.push(line.replace(/^[\d\.\-\*\•\–]\s*/, '').trim());
      }
    }
  }

  // 5. Ekstrak Bahan Bacaan / Teks Lampiran
  const teksBacaanList: { judul: string; paragraf: string[] }[] = [];
  let inBahanBacaan = false;
  let currentBacaanJudul = '';
  let currentParagraf: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (/Bahan Bacaan|Lampiran 1|Teks Bacaan|Materi Pembelajaran/i.test(line)) {
      inBahanBacaan = true;
      if (currentBacaanJudul && currentParagraf.length > 0) {
        teksBacaanList.push({ judul: currentBacaanJudul, paragraf: [...currentParagraf] });
        currentParagraf = [];
      }
      currentBacaanJudul = rawLines[i + 1] || 'Teks Eksplorasi Materi';
      continue;
    }
    if (inBahanBacaan) {
      if (/^Glosarium|^Daftar Pustaka|^Asesmen|^Rubrik/i.test(line)) {
        inBahanBacaan = false;
        if (currentBacaanJudul && currentParagraf.length > 0) {
          teksBacaanList.push({ judul: currentBacaanJudul, paragraf: [...currentParagraf] });
          currentParagraf = [];
        }
        continue;
      }
      if (line.length > 25) {
        currentParagraf.push(line);
      }
    }
  }
  if (currentBacaanJudul && currentParagraf.length > 0) {
    teksBacaanList.push({ judul: currentBacaanJudul, paragraf: currentParagraf });
  }

  // 6. Ekstrak Rincian Pertemuan
  const pertemuanList: ParsedPertemuan[] = [];
  const meetingIndices: { idx: number; text: string; num: number }[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const match = line.match(/^Pertemuan\s*(?:ke-?\s*)?(\d+)\s*(?:[:\-\(]\s*(.*))?/i);
    if (match) {
      meetingIndices.push({
        idx: i,
        text: line,
        num: parseInt(match[1], 10)
      });
    }
  }

  // Deduplicate meeting headers
  const uniqueMeetings: typeof meetingIndices = [];
  for (const m of meetingIndices) {
    if (!uniqueMeetings.some(u => u.num === m.num)) {
      uniqueMeetings.push(m);
    }
  }

  // If no explicit meeting headers found, split into estimated meetings based on JP
  const targetMeetingCount = Math.max(1, Math.min(6, Math.ceil(totalJp / 3)));

  if (uniqueMeetings.length === 0) {
    for (let m = 1; m <= targetMeetingCount; m++) {
      uniqueMeetings.push({
        idx: 0,
        text: `Pertemuan ${m}: Pendalaman Materi ${judulBab}`,
        num: m
      });
    }
  }

  uniqueMeetings.forEach((m, idx) => {
    const nextMeeting = uniqueMeetings[idx + 1];
    const startLine = m.idx;
    const endLine = nextMeeting ? nextMeeting.idx : rawLines.length;
    const sliceLines = startLine > 0 ? rawLines.slice(startLine, endLine) : [];

    // Parse meeting topic
    let meetingTopic = m.text.replace(/^Pertemuan\s*(?:ke-?\s*)?\d+\s*[:\-\(]?\s*/i, '').replace(/\)$/, '').trim();
    if (!meetingTopic || meetingTopic.length < 3) {
      meetingTopic = `Pertemuan ${m.num}: Pendalaman Konsep ${judulBab}`;
    }

    // Default JP per meeting
    const jpPerMeeting = Math.max(2, Math.round(totalJp / uniqueMeetings.length));
    const durasiTotal = jpPerMeeting * 45;

    // Extract pendahuluan, inti, penutup from sliceLines
    const pendahuluanKegiatan: string[] = [];
    const intiKegiatan: string[] = [];
    const penutupKegiatan: string[] = [];

    let currentPhase: 'NONE' | 'PENDAHULUAN' | 'INTI' | 'PENUTUP' = 'NONE';

    for (const l of sliceLines) {
      if (/Pendahuluan|Apersepsi/i.test(l)) {
        currentPhase = 'PENDAHULUAN';
        continue;
      } else if (/Kegiatan Inti|Eksplorasi/i.test(l)) {
        currentPhase = 'INTI';
        continue;
      } else if (/Penutup|Refleksi/i.test(l)) {
        currentPhase = 'PENUTUP';
        continue;
      }

      if (l.length > 5 && !/^\d+\s*Menit/i.test(l)) {
        const cleaned = l.replace(/^[\d\.\-\*\•\–]\s*/, '').trim();
        if (currentPhase === 'PENDAHULUAN') pendahuluanKegiatan.push(cleaned);
        else if (currentPhase === 'INTI') intiKegiatan.push(cleaned);
        else if (currentPhase === 'PENUTUP') penutupKegiatan.push(cleaned);
      }
    }

    // Fallbacks if section was sparse
    if (pendahuluanKegiatan.length === 0) {
      pendahuluanKegiatan.push(
        'Pembukaan: Guru membuka pelajaran dengan salam, doa bersama, dan memeriksa kehadiran siswa.',
        `Apersepsi (Mindful Learning): Guru mengaitkan pembelajaran dengan materi ${judulBab}.`,
        pertanyaanPemantikList[idx]
          ? `Pertanyaan Pemantik: "${pertanyaanPemantikList[idx]}"`
          : `Pertanyaan Pemantik: "Bagaimana cara kita memahami ${judulBab} dalam kehidupan nyata?"`,
        'Motivasi (Meaningful Learning): Menjelaskan manfaat kompetensi ini dalam komunikasi dan literasi kritis.'
      );
    }

    if (intiKegiatan.length === 0) {
      intiKegiatan.push(
        `Eksplorasi Konsep: Peserta didik mengamati contoh dan membedah struktur ${judulBab}.`,
        'Diskusi Kelompok (Gotong Royong & Bernalar Kritis): Siswa berkolaborasi menganalisis materi dan saling memberikan umpan balik.',
        'Aplikasi & Presentasi: Perwakilan kelompok menyampaikan hasil analisis di depan kelas dengan bimbingan guru.'
      );
    }

    if (penutupKegiatan.length === 0) {
      penutupKegiatan.push(
        'Refleksi Pembelajaran: Peserta didik menyampaikan apa yang telah dipahami dan bagian mana yang perlu diperdalam.',
        'Rangkuman bersama guru dan penyampaian agenda tindak lanjut pertemuan berikutnya.',
        'Doa dan salam penutup.'
      );
    }

    // Attach reading text for this meeting if available
    const attachedBacaan = teksBacaanList[idx] || teksBacaanList[0] || {
      judul: `Teks Pendukung: ${meetingTopic}`,
      paragraf: [
        `Materi pendukung untuk ${meetingTopic} pada pembelajaran ${judulBab}. Peserta didik diajak untuk membaca secara kritis dan mendalam.`,
        `Melalui pemahaman konsep ini, peserta didik diharapkan mampu mengembangkan keterampilan berpikir analitis dan bernalar kritis.`
      ]
    };

    pertemuanList.push({
      nomor_pertemuan: m.num,
      alokasi_jp: jpPerMeeting,
      durasi_menit: durasiTotal,
      topik: meetingTopic,
      tujuan_pembelajaran: tujuanPembelajaranUmum.length > 0 ? tujuanPembelajaranUmum.slice(0, 3) : [`Memahami dan menguasai ${meetingTopic}`],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: pendahuluanKegiatan
        },
        inti: {
          durasi_menit: durasiTotal - 30,
          kegiatan: intiKegiatan,
          teks_bacaan: attachedBacaan,
          lkpd: {
            judul: `LKPD Pertemuan ${m.num}: Analisis Konsep & Diskusi ${meetingTopic}`,
            petunjuk: `1. Pelajari teks dan materi pada pertemuan ini bersama kelompokmu!\n2. Diskusikan gagasan utama dan selesaikan tantangan analisis yang diberikan guru!\n3. Tuliskan kesimpulan kelompok pada lembar kerja dan presentasikan di depan kelas!`
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: penutupKegiatan
        }
      }
    });
  });

  const modulId = `preset-b-indo-fase-${fase.toLowerCase()}-modul-${nomorBab}`;

  return {
    id: modulId,
    nomor_bab: nomorBab,
    judul_modul: judulModulLengkap,
    nama_mapel: mapelNama,
    kode_mapel: 'B.INDONESIA',
    fase: fase,
    tingkat: tingkat,
    total_alokasi_jp: totalJp,
    total_pertemuan: pertemuanList.length,
    deskripsi: `Panduan KBM mendalam (Deep Learning) Fase ${fase} Kelas ${tingkat} materi ${judulBab}. Dilengkapi apersepsi mindful, pertanyaan pemantik, teks bacaan siswa, LKPD, dan rubrik asesmen.`,
    pendekatan: 'Deep Learning (Mindful, Meaningful, Joyful Learning)',
    sumber: 'modulguruku.com / Kemendikbudristek 2024',
    tags: ['Bahasa Indonesia', `Fase ${fase}`, `Kelas ${tingkat}`, judulBab, 'Kurikulum Merdeka'],
    konten_json: pertemuanList
  };
}

async function main() {
  console.log('🚀 MEMULAI AUTOMATED DOCX-TO-PRESET INGESTION ENGINE...\n');

  if (!fs.existsSync(externalDir)) {
    console.error(`❌ Direktori tidak ditemukan: ${externalDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(externalDir).filter(f => f.endsWith('.docx')).sort();
  console.log(`📁 Ditemukan ${files.length} file DOCX di: ${externalDir}\n`);

  let successCount = 0;

  for (const file of files) {
    const fullPath = path.join(externalDir, file);
    try {
      console.log(`⏳ Memproses: ${file}...`);
      const parsed = await parseDocxFile(fullPath);

      if (!parsed) {
        console.warn(`⚠️ Gagal mem-parse: ${file}`);
        continue;
      }

      await prisma.bahanAjarPreset.upsert({
        where: { id: parsed.id },
        update: {
          kode_mapel_ref: parsed.kode_mapel,
          nama_mapel_ref: parsed.nama_mapel,
          fase: parsed.fase,
          tingkat: parsed.tingkat,
          judul_modul: parsed.judul_modul,
          deskripsi: parsed.deskripsi,
          total_alokasi_jp: parsed.total_alokasi_jp,
          total_pertemuan: parsed.total_pertemuan,
          pendekatan: parsed.pendekatan,
          sumber: parsed.sumber,
          tags: parsed.tags,
          konten_json: parsed.konten_json as any,
          status: 'PUBLISHED'
        },
        create: {
          id: parsed.id,
          kode_mapel_ref: parsed.kode_mapel,
          nama_mapel_ref: parsed.nama_mapel,
          fase: parsed.fase,
          tingkat: parsed.tingkat,
          judul_modul: parsed.judul_modul,
          deskripsi: parsed.deskripsi,
          total_alokasi_jp: parsed.total_alokasi_jp,
          total_pertemuan: parsed.total_pertemuan,
          pendekatan: parsed.pendekatan,
          sumber: parsed.sumber,
          tags: parsed.tags,
          konten_json: parsed.konten_json as any,
          status: 'PUBLISHED'
        }
      });

      console.log(`   ✅ BERHASIL: [${parsed.id}] ${parsed.judul_modul} (${parsed.total_pertemuan} Pertemuan • ${parsed.total_alokasi_jp} JP)`);
      successCount++;
    } catch (err: any) {
      console.error(`   ❌ ERROR pada ${file}:`, err.message);
    }
  }

  console.log(`\n🎉 SELESAI! Berhasil mengimpor ${successCount} dari ${files.length} modul ke database!`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

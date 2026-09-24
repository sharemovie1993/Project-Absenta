import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { raporApi } from '../../../api/rapor.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { getMyTenant } from '../../../api/tenants.api';
import { drawKopSurat } from '../pdfGeneric';
import { getBase64ImageFromUrl } from '../../cooperative/coopDocUtils';

export interface PrintRaporOptions {
  siswaId: string;
  tahunPelajaranId: string;
  semesterId: string;
  tahunPelajaranNama?: string;
  semesterNama?: string;
  tenantId?: string;
}

/**
 * Generate Rapor Semester PDF (client-side via jsPDF).
 * Fetches all data via authenticated axios, no backend Puppeteer needed.
 */
/**
 * Standar Urutan Mata Pelajaran e-Rapor Kemendikbudristek (Multi-Jenjang: SD, SMP, SMA, SMK)
 */
export const getMapelCanonicalPriority = (
  mapelName: string,
  kelompok: string,
  jenjang: 'SD' | 'SMP' | 'SMA' | 'SMK',
  urutanDb?: number
): number => {
  if (typeof urutanDb === 'number' && urutanDb > 0 && urutanDb < 900) {
    return urutanDb;
  }

  const name = (mapelName || '').toLowerCase().trim();
  const grp = (kelompok || '').toLowerCase().trim();

  // 1. KELOMPOK MATA PELAJARAN UMUM
  if (grp.includes('umum')) {
    if (name.includes('agama') || name.includes('budi pekerti') || name.includes('pai') || name.includes('pak')) return 10;
    if (name.includes('pancasila') || name.includes('ppkn') || name.includes('kewarganegaraan')) return 20;
    if (name.includes('bahasa indonesia') || name === 'indonesia') return 30;

    if (jenjang === 'SMK') {
      if (name.includes('jasmani') || name.includes('olahraga') || name.includes('pjok') || name.includes('penjas')) return 40;
      if (name.includes('sejarah')) return 50;
      if (name.includes('seni') || name.includes('budaya') || name.includes('prakarya')) return 60;
      if (name.includes('matematika')) return 70;
      if (name.includes('inggris')) return 80;
    } else if (jenjang === 'SD') {
      if (name.includes('matematika')) return 40;
      if (name.includes('ipas') || (name.includes('alam') && name.includes('sosial'))) return 50;
      if (name.includes('jasmani') || name.includes('olahraga') || name.includes('pjok')) return 60;
      if (name.includes('seni') || name.includes('budaya') || name.includes('prakarya')) return 70;
      if (name.includes('inggris')) return 80;
    } else if (jenjang === 'SMP') {
      if (name.includes('matematika')) return 40;
      if (name.includes('ipa') || (name.includes('alam') && !name.includes('sosial'))) return 50;
      if (name.includes('ips') || (name.includes('sosial') && !name.includes('alam'))) return 60;
      if (name.includes('inggris')) return 70;
      if (name.includes('jasmani') || name.includes('olahraga') || name.includes('pjok')) return 80;
      if (name.includes('informatika') || name.includes('tik')) return 90;
      if (name.includes('seni') || name.includes('budaya') || name.includes('prakarya')) return 100;
    } else {
      if (name.includes('matematika')) return 40;
      if (name.includes('inggris')) return 50;
      if (name.includes('jasmani') || name.includes('olahraga') || name.includes('pjok')) return 60;
      if (name.includes('sejarah')) return 70;
      if (name.includes('seni') || name.includes('budaya') || name.includes('prakarya')) return 80;
    }
    return 150;
  }

  // 2. KELOMPOK MATA PELAJARAN KEJURUAN (SMK)
  if (grp.includes('kejuruan')) {
    if (name.includes('matematika')) return 10;
    if (name.includes('inggris')) return 20;
    if (name.includes('informatika') || name.includes('komputer') || name.includes('tik')) return 30;
    if (name.includes('ipas') || (name.includes('alam') && name.includes('sosial')) || name.includes('projek ipas')) return 40;
    if (name.includes('dasar') || name.includes('program keahlian')) return 50;
    if (name.includes('gtm') || name.includes('gambar teknik')) return 52;
    if (name.includes('pdtm') || name.includes('pekerjaan dasar')) return 54;
    if (name.includes('dptm') || name.includes('dasar perancangan')) return 56;
    if (name.includes('konsentrasi') || name.includes('kejuruan')) return 60;
    if (name.includes('kreatif') || name.includes('kewirausahaan') || name.includes('pkk')) return 70;
    if (name.includes('pkl') || name.includes('praktik kerja')) return 80;
    return 150;
  }

  // 3. KELOMPOK MATA PELAJARAN PILIHAN / PEMINATAN
  if (grp.includes('pilihan') || grp.includes('peminatan')) {
    if (name.includes('koding') || name.includes('kecerdasan') || name.includes('ai') || name.includes('artificial')) return 10;
    if (name.includes('biologi')) return 20;
    if (name.includes('fisika')) return 30;
    if (name.includes('kimia')) return 40;
    if (name.includes('ekonomi')) return 50;
    if (name.includes('sosiologi')) return 60;
    if (name.includes('geografi')) return 70;
    return 100;
  }

  // 4. MUATAN LOKAL
  if (grp.includes('muatan') || grp.includes('lokal') || grp.includes('mulok')) {
    if (name.includes('sunda')) return 10;
    if (name.includes('jawa')) return 20;
    if (name.includes('daerah')) return 30;
    if (name.includes('lingkungan') || name.includes('plh')) return 40;
    return 100;
  }

  return 999;
};

/**
 * Helper untuk merender 2 halaman Rapor Semester Siswa ke dalam instance jsPDF.
 * Mendukung pencetakan individu maupun batch (halaman digabung berurutan).
 */
export const renderStudentRaporPages = (
  doc: jsPDF,
  data: any,
  sekolah: any,
  tenantInfo: any,
  tahunPelajaranNama: string,
  semesterNama: string,
  isFirstStudent = true
): void => {
  const siswa = data?.siswa || {};
  const tingkatNum = Number(siswa.tingkat || 10);
  const jenjangRaw = String(sekolah?.jenjang || tenantInfo?.jenjang || siswa?.jenjang || '').toUpperCase();

  // Multi-Jenjang Detection
  let jenjang: 'SD' | 'SMP' | 'SMA' | 'SMK' = 'SMK';
  if (jenjangRaw.includes('SD') || jenjangRaw.includes('MI') || (tingkatNum >= 1 && tingkatNum <= 6)) {
    jenjang = 'SD';
  } else if (jenjangRaw.includes('SMP') || jenjangRaw.includes('MTS') || (tingkatNum >= 7 && tingkatNum <= 9)) {
    jenjang = 'SMP';
  } else if (jenjangRaw.includes('SMA') || jenjangRaw.includes('MA')) {
    jenjang = 'SMA';
  } else {
    jenjang = 'SMK';
  }

  // Kurikulum Merdeka Fase Detection
  let fase = 'E';
  if (tingkatNum <= 2) fase = 'A';
  else if (tingkatNum <= 4) fase = 'B';
  else if (tingkatNum <= 6) fase = 'C';
  else if (tingkatNum <= 9) fase = 'D';
  else if (tingkatNum === 10) fase = 'E';
  else fase = 'F';

  // Helper: Draw 2-column Student Info Grid at top of page (Multi-Jenjang Adaptive)
  const drawStudentMetadataGrid = (startDoc: jsPDF, startY: number): number => {
    const namaSekolah = sekolah?.nama || tenantInfo?.name || 'SEKOLAH';
    const alamatSekolah = sekolah?.alamat || tenantInfo?.address || '-';

    const leftColX = 15;
    const rightColX = 130;
    const colValOffset = 45;
    const rightValOffset = 35;

    startDoc.setFontSize(8.5);

    // Left column metadata (Adaptive by Jenjang)
    const leftInfo: Array<[string, string]> = [
      ['Nama Peserta Didik', siswa.nama_siswa || '-'],
      ['NIS/NISN', `${siswa.nis || '-'} / ${siswa.nisn || '-'}`],
      ['Nama Sekolah', namaSekolah],
      ['Alamat', alamatSekolah],
    ];

    if (jenjang === 'SMK') {
      leftInfo.push(
        ['Bidang Keahlian', siswa.bidang_keahlian || 'Teknologi Manufaktur dan Rekayasa'],
        ['Program Keahlian', siswa.program_keahlian || 'Teknik Otomotif'],
        ['Konsentrasi Keahlian', siswa.konsentrasi_keahlian || 'Teknik Sepeda Motor']
      );
    } else if (jenjang === 'SMA' && siswa.peminatan) {
      leftInfo.push(['Peminatan / Kelompok', siswa.peminatan]);
    }

    let leftY = startY;
    leftInfo.forEach(([label, value]) => {
      startDoc.setFont('Helvetica', 'normal');
      startDoc.text(label, leftColX, leftY);
      startDoc.text(':', leftColX + colValOffset - 2, leftY);
      startDoc.setFont('Helvetica', label === 'Nama Peserta Didik' ? 'bold' : 'normal');
      startDoc.text(String(value), leftColX + colValOffset, leftY);
      leftY += 4.2;
    });

    // Right column metadata
    const rightInfo = [
      ['Kelas', siswa.kelas || '-'],
      ['Fase', fase],
      ['Semester', semesterNama || 'Ganjil'],
      ['Tahun Pelajaran', tahunPelajaranNama || '2025 / 2026'],
    ];

    let rightY = startY;
    rightInfo.forEach(([label, value]) => {
      startDoc.setFont('Helvetica', 'normal');
      startDoc.text(label, rightColX, rightY);
      startDoc.text(':', rightColX + rightValOffset - 2, rightY);
      startDoc.setFont('Helvetica', label === 'Kelas' ? 'bold' : 'normal');
      startDoc.text(String(value), rightColX + rightValOffset, rightY);
      rightY += 4.2;
    });

    return Math.max(leftY, rightY) + 5;
  };

  if (!isFirstStudent) {
    doc.addPage();
  }

  const pageWidth = 210;
  let y = 14;

  // ── PAGE 1 ──

  // Title Header (Centered)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('LAPORAN HASIL BELAJAR', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text('(RAPOR)', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Student Info Grid on Page 1
  y = drawStudentMetadataGrid(doc, y);

  // Section I: INTRA KURIKULER
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('I. INTRA KURIKULER', 15, y);
  y += 5;

  // Categorized Grade Table
  const nilaiAkademik: any[] = data?.nilai_akademik || [];
  
  if (nilaiAkademik.length === 0) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Belum ada data mata pelajaran terdaftar pada semester ini.', pageWidth / 2, y + 4, { align: 'center' });
    y += 12;
  } else {
    // 1. Deduplicate by normalized mapel name (merging score if present in duplicate record)
    const dedupedMapelMap = new Map<string, any>();
    (nilaiAkademik ?? []).forEach((n: any) => {
      const normName = (n.mapel_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!normName) return;

      const hasScore = (n.nilai_akhir && n.nilai_akhir > 0) || (n.nilai_components && n.nilai_components.length > 0);
      
      if (!dedupedMapelMap.has(normName)) {
        dedupedMapelMap.set(normName, { ...n });
      } else {
        const existing = dedupedMapelMap.get(normName)!;
        const existingHasScore = (existing.nilai_akhir && existing.nilai_akhir > 0) || (existing.nilai_components && existing.nilai_components.length > 0);
        if (!existingHasScore && hasScore) {
          dedupedMapelMap.set(normName, { ...existing, ...n });
        }
      }
    });

    const dedupedList = Array.from(dedupedMapelMap.values());

    // 2. Group into standard e-Rapor categories with intelligent SMK vocational classifier
    const groupedMapel = new Map<string, any[]>();
    dedupedList.forEach((n: any) => {
      let group = n.kelompok_mapel || 'Mata Pelajaran Umum';
      const mapelNameLower = (n.mapel_name || '').toLowerCase();

      // Intelligent vocational classification for SMK
      if (jenjang === 'SMK') {
        const isVocationalKeyword = 
          mapelNameLower.includes('gtm') ||
          mapelNameLower.includes('pdtm') ||
          mapelNameLower.includes('dptm') ||
          mapelNameLower.includes('gambar teknik') ||
          mapelNameLower.includes('pekerjaan dasar') ||
          mapelNameLower.includes('dasar perancangan') ||
          mapelNameLower.includes('dasar-dasar') ||
          mapelNameLower.includes('dasar program keahlian') ||
          mapelNameLower.includes('kejuruan') ||
          mapelNameLower.includes('konsentrasi keahlian') ||
          mapelNameLower.includes('teknik pemesinan') ||
          mapelNameLower.includes('teknik mesin') ||
          mapelNameLower.includes('teknik otomotif') ||
          mapelNameLower.includes('teknik pengelasan') ||
          mapelNameLower.includes('pkk') ||
          mapelNameLower.includes('kreatif dan kewirausahaan') ||
          mapelNameLower.includes('praktik kerja') ||
          mapelNameLower.includes('pkl');

        if (isVocationalKeyword) {
          group = 'Mata Pelajaran Kejuruan';
        }
      }

      if (!group.toLowerCase().includes('umum') && !group.toLowerCase().includes('kejuruan') && !group.toLowerCase().includes('pilihan') && !group.toLowerCase().includes('muatan')) {
        group = 'Mata Pelajaran Umum';
      }

      if (!groupedMapel.has(group)) {
        groupedMapel.set(group, []);
      }
      groupedMapel.get(group)!.push(n);
    });

    const tableRows: any[] = [];
    const groupOrder = ['Mata Pelajaran Umum', 'Mata Pelajaran Kejuruan', 'Mata Pelajaran Pilihan', 'Muatan Lokal'];
    const sortedGroups = Array.from(groupedMapel.keys()).sort((a, b) => {
      const idxA = groupOrder.findIndex(g => a.toLowerCase().includes(g.toLowerCase()));
      const idxB = groupOrder.findIndex(g => b.toLowerCase().includes(g.toLowerCase()));
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });

    sortedGroups.forEach((groupName) => {
      const items = groupedMapel.get(groupName) || [];

      // Urutkan mapel secara presisi sesuai urutan baku e-Rapor Multi-Jenjang
      items.sort((a, b) => {
        const pA = getMapelCanonicalPriority(a.mapel_name || '', groupName, jenjang, a.urutan);
        const pB = getMapelCanonicalPriority(b.mapel_name || '', groupName, jenjang, b.urutan);
        if (pA !== pB) return pA - pB;
        return (a.mapel_name || '').localeCompare(b.mapel_name || '');
      });

      tableRows.push([
        {
          content: groupName,
          colSpan: 4,
          styles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 8.5 },
        },
      ]);

      items.forEach((n: any, idx: number) => {
        const hasScore = (n.nilai_akhir && n.nilai_akhir > 0) || (n.nilai_components && n.nilai_components.length > 0);
        const isMissing = !hasScore;
        const score = hasScore ? n.nilai_akhir : '-';
        
        // Format Capaian Kompetensi into standard Kurikulum Merdeka narrative sentences
        let cap = 'Belum ada penilaian terinput';
        if (hasScore) {
          const numScore = Number(score);
          const kkm = n.kkm ?? 75;
          const rawText = (n.catatan_kompetensi || n.capaian_kompetensi || n.catatan_deskripsi || '').trim();

          if (rawText) {
            if (/^siswa\b/i.test(rawText)) {
              cap = rawText;
            } else {
              const lowerFirst = rawText.charAt(0).toLowerCase() + rawText.slice(1);
              if (numScore >= 85) {
                cap = `Siswa sangat mampu ${lowerFirst}`;
              } else if (numScore >= kkm) {
                cap = `Siswa mampu ${lowerFirst}`;
              } else {
                cap = `Siswa cukup mampu ${lowerFirst}`;
              }
            }
          } else {
            if (numScore >= 85) {
              cap = 'Siswa menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran mata pelajaran ini.';
            } else if (numScore >= kkm) {
              cap = 'Siswa mampu memahami materi dan mencapai kompetensi mata pelajaran ini dengan baik.';
            } else {
              cap = 'Siswa cukup mampu menguasai materi dasar, perlu bimbingan lebih lanjut pada materi utama.';
            }
          }
        }

        tableRows.push([
          { content: String(idx + 1), styles: { halign: 'center' } },
          { content: n.mapel_name || '-' },
          {
            content: String(score),
            styles: {
              halign: 'center',
              fontStyle: 'bold',
              textColor: isMissing ? [220, 38, 38] : [0, 0, 0],
            },
          },
          {
            content: cap,
            styles: {
              textColor: isMissing ? [220, 38, 38] : [0, 0, 0],
              fontStyle: isMissing ? 'italic' : 'normal',
            },
          },
        ]);
      });
    });

    autoTable(doc, {
      startY: y,
      head: [['No', 'Mata Pelajaran', 'Nilai', 'Capaian Kompetensi']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [205, 205, 205], textColor: 0, fontSize: 9, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 55 },
        2: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
        3: { cellWidth: 99 },
      },
      margin: { left: 15, right: 15 },
    });
  }

  // ── PAGE 2 ──
  doc.addPage();
  y = 15;

  // Student Info Grid Header on Page 2
  y = drawStudentMetadataGrid(doc, y);

  // Section II: KOKURIKULER
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('II. KOKURIKULER', 15, y);
  y += 4;

  const kokurikulerText = data?.catatan_kokurikuler ||
    'Peserta didik menunjukkan sikap disiplin dan tanggung jawab (Mandiri), mampu bekerja sama dan saling menghargai (Gotong Royong), serta menerapkan nilai-nilai akhlak mulia dalam kegiatan sekolah (Beriman dan Bertakwa kepada Tuhan YME serta Berakhlak Mulia).';

  const kokurikulerBoxHeight = 25;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(15, y, 180, kokurikulerBoxHeight);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  const kokurikulerLines = doc.splitTextToSize(kokurikulerText, 174);
  doc.text(kokurikulerLines.slice(0, 4), 18, y + 5);
  y += kokurikulerBoxHeight + 8;

  // Section III: EKSTRA KURIKULER
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('III. EKSTRA KURIKULER', 15, y);
  y += 4;

  const ekskulList: any[] = data?.ekskul || [];
  const ekskulRows = ekskulList.length > 0
    ? ekskulList.map((e: any, idx: number) => [idx + 1, e.nama_ekskul || e.nama || '-', e.keterangan || e.predikat || '-'])
    : [
        [1, '', ''],
        [2, '', ''],
      ];

  autoTable(doc, {
    startY: y,
    head: [['No', 'Ekstrakurikuler', 'Keterangan']],
    body: ekskulRows,
    theme: 'grid',
    headStyles: { fillColor: [205, 205, 205], textColor: 0, fontSize: 9, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 8.5, cellPadding: 4 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 55 },
      2: { cellWidth: 113 },
    },
    margin: { left: 15, right: 15 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Section IV: KETIDAKHADIRAN & CATATAN WALI KELAS
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('IV. KETIDAKHADIRAN', 15, y);
  y += 4;

  const absensi = data?.absensi || {};
  const catatanWali = data?.catatan_wali ||
    'Anakku yang tercinta, dengan senang hati Bapak sampaikan bahwa di rapor ini tergambar betapa gigihnya kamu dalam mengejar ilmu. Semoga hasil ini menjadi ladang pahala yang melimpah dari Allah. Tetaplah berusaha dengan niat tulus karena ilmu yang kamu raih adalah amal jariyah untukmu. Barakallahu fikum.';

  autoTable(doc, {
    startY: y,
    head: [['Ketidakhadiran', 'Catatan Wali Kelas']],
    body: [
      [
        `Sakit : ${absensi.sakit ?? 0} Hari\nIzin : ${absensi.izin ?? 0} Hari\nTanpa Keterangan : ${absensi.alpa ?? 0} Hari`,
        catatanWali,
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [205, 205, 205], textColor: 0, fontSize: 9, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 8.5, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 120 },
    },
    margin: { left: 15, right: 15 },
  });
  y = (doc as any).lastAutoTable.finalY + 14;

  // Signatures Section (Orang Tua, Wali Kelas, Kepala Sekolah)
  const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const kepalaSekolahNama = sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'WAHYU TAMIMBARKAH, S.Pd.';
  const kepalaSekolahNip = sekolah?.nip_kepala || tenantInfo?.nip_kepala || '197111022008011001';
  const waliKelasNama = data?.wali_kelas_nama || 'ERWIN BEGASI BUDI SAMPURNO, S.T.';
  const waliKelasNip = data?.wali_kelas_nip || '198107112022211006';

  // Row 1: Orang Tua & Wali Kelas
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Orang Tua/Wali Siswa,', 25, y, { align: 'left' });
  doc.text(`Purwakarta, ${dateStr}`, pageWidth - 25, y, { align: 'right' });
  doc.text('Wali Kelas,', pageWidth - 25, y + 4.5, { align: 'right' });

  y += 24;
  doc.text('......................................................', 25, y, { align: 'left' });
  doc.setFont('Helvetica', 'bold');
  doc.text(waliKelasNama, pageWidth - 25, y, { align: 'right' });
  doc.setFont('Helvetica', 'normal');
  doc.text(`NIP. ${waliKelasNip}`, pageWidth - 25, y + 4.5, { align: 'right' });

  // Row 2: Kepala Sekolah (Centered)
  y += 14;
  doc.text('Mengetahui;', pageWidth / 2, y, { align: 'center' });
  doc.text('Kepala Sekolah,', pageWidth / 2, y + 4.5, { align: 'center' });
  y += 24;
  doc.setFont('Helvetica', 'bold');
  doc.text(kepalaSekolahNama, pageWidth / 2, y, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.text(`NIP. ${kepalaSekolahNip}`, pageWidth / 2, y + 4.5, { align: 'center' });
};

/**
 * Generate Rapor Semester PDF (client-side via jsPDF).
 * Fetches all data via authenticated axios, no backend Puppeteer needed.
 */
export const generateRaporPdf = async (options: PrintRaporOptions): Promise<{ blobUrl: string; filename: string }> => {
  const { siswaId, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '' } = options;

  // 1. Fetch data rapor detail via authenticated API
  const raporRes = await raporApi.getRaporDetail({ siswa_id: siswaId, tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId });
  const data = raporRes?.data || raporRes;

  // 2. Fetch school & tenant info for Multi-Tenant customization
  const [sekolahRes, tenantRes] = await Promise.allSettled([
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null)
  ]);
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? tenantRes.value : null;

  // 3. Create PDF document & render 2 pages
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  renderStudentRaporPages(doc, data, sekolah, tenantInfo, tahunPelajaranNama, semesterNama, true);

  const siswa = data?.siswa || {};
  const filename = `RAPOR_${(siswa.nama_siswa || 'Siswa').replace(/\s+/g, '_')}_${semesterNama || 'Semester'}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

/**
 * Generate P5 Rapor PDF (client-side via jsPDF).
 */
export const generateP5RaporPdf = async (options: PrintRaporOptions): Promise<{ blobUrl: string; filename: string }> => {
  const { siswaId, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '' } = options;

  // Fetch P5 data
  const p5Res = await raporApi.getP5Nilai({ siswa_id: siswaId });
  const allP5: any[] = p5Res?.data || p5Res || [];

  // Fetch rapor detail for student info
  const raporRes = await raporApi.getRaporDetail({ siswa_id: siswaId, tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId });
  const raporData = raporRes?.data || raporRes;
  const siswa = raporData?.siswa || {};

  // Fetch school info
  const [sekolahRes, tenantRes] = await Promise.allSettled([
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null)
  ]);
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? tenantRes.value : null;

  let logoDaerahBase64: string | null = null;
  let logoSekolahBase64: string | null = null;
  const logoUrl = sekolah?.logo_url || tenantInfo?.logo_url;
  const daerahUrl = sekolah?.logo_daerah_url || tenantInfo?.logo_daerah_url;
  if (daerahUrl) logoDaerahBase64 = await getBase64ImageFromUrl(daerahUrl).catch(() => null);
  if (logoUrl) logoSekolahBase64 = await getBase64ImageFromUrl(logoUrl).catch(() => null);

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  let y = drawKopSurat(doc, pageWidth, sekolah, tenantInfo, logoDaerahBase64, logoSekolahBase64, true);

  y += 4;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('RAPOR PROJEK PENGUATAN PROFIL PELAJAR PANCASILA (P5)', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${tahunPelajaranNama ? `TP ${tahunPelajaranNama}` : ''} ${semesterNama ? `| ${semesterNama}` : ''}`, pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Student info
  doc.setFontSize(9);
  [
    ['Nama Siswa', siswa.nama_siswa || '-'],
    ['NIS / NISN', `${siswa.nis || '-'} / ${siswa.nisn || '-'}`],
    ['Kelas', siswa.kelas || '-'],
  ].forEach(([label, value]) => {
    doc.setFont('Helvetica', 'bold');
    doc.text(label, 15, y);
    doc.setFont('Helvetica', 'normal');
    doc.text(`: ${value}`, 55, y);
    y += 5;
  });
  y += 2;

  // Legend
  doc.setFontSize(7.5);
  doc.setFont('Helvetica', 'bold');
  doc.text('Keterangan: ', 15, y);
  doc.setFont('Helvetica', 'normal');
  doc.text('BB = Belum Berkembang  |  MB = Mulai Berkembang  |  BSH = Berkembang Sesuai Harapan  |  SB = Sangat Berkembang', 38, y);
  y += 5;

  // Group by projek_id
  const projekMap = new Map<string, { judul: string; scores: any[] }>();
  allP5.forEach((n: any) => {
    const pid = n.projek_id || n.Projek?.id || 'unknown';
    if (!projekMap.has(pid)) {
      projekMap.set(pid, { judul: n.Projek?.judul || n.projek_judul || 'Projek P5', scores: [] });
    }
    projekMap.get(pid)!.scores.push(n);
  });

  if (projekMap.size === 0) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Belum ada penilaian P5 pada semester ini.', pageWidth / 2, y + 6, { align: 'center' });
  } else {
    let pIdx = 1;
    projekMap.forEach((projek) => {
      if (y > 250) { doc.addPage(); y = 15; }
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(`Projek ${pIdx}: ${projek.judul}`, 15, y);
      y += 2;

      const rows = projek.scores.map((s: any) => [
        s.dimensi || '-',
        s.sub_elemen || '-',
        s.kualifikasi === 'BB' ? '✓' : '',
        s.kualifikasi === 'MB' ? '✓' : '',
        s.kualifikasi === 'BSH' ? '✓' : '',
        s.kualifikasi === 'SB' ? '✓' : '',
        s.catatan_proses || '-',
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Dimensi', 'Sub-Elemen', 'BB', 'MB', 'BSH', 'SB', 'Catatan Proses']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [80, 50, 150], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 7.5, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 40 },
          2: { halign: 'center', cellWidth: 10 },
          3: { halign: 'center', cellWidth: 10 },
          4: { halign: 'center', cellWidth: 10 },
          5: { halign: 'center', cellWidth: 10 },
          6: { cellWidth: 45 },
        },
        margin: { left: 15, right: 15 },
      });
      y = (doc as any).lastAutoTable.finalY + 5;
      pIdx++;
    });
  }

  const filename = `P5_${(siswa.nama_siswa || 'Siswa').replace(/\s+/g, '_')}_${semesterNama || 'Semester'}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

export interface PrintRaporBatchOptions {
  students: Array<{ id: string; nama_siswa: string }>;
  tahunPelajaranId: string;
  semesterId: string;
  tahunPelajaranNama?: string;
  semesterNama?: string;
  kelasNama?: string;
  onProgress?: (current: number, total: number, studentName: string) => void;
}

/**
 * 🖨️ Cetak Massal Rapor Sekelas dalam 1 Berkas PDF Gabungan
 */
export const generateRaporKelasBatchPdf = async (options: PrintRaporBatchOptions): Promise<{ blobUrl: string; filename: string }> => {
  const { students, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '', kelasNama = 'Sekelas', onProgress } = options;
  if (!students || students.length === 0) {
    throw new Error('Tidak ada data siswa untuk dicetak.');
  }

  // 1. Fetch school & tenant info once for whole batch compilation
  const [sekolahRes, tenantRes] = await Promise.allSettled([
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null)
  ]);
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? tenantRes.value : null;

  // 2. Initialize single jsPDF document for entire class
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  let renderedCount = 0;
  let lastError: any = null;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    onProgress?.(i + 1, students.length, student.nama_siswa || 'Siswa');

    try {
      const raporRes = await raporApi.getRaporDetail({
        siswa_id: student.id,
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
      });
      const data = raporRes?.data?.data || raporRes?.data || raporRes;
      renderStudentRaporPages(doc, data, sekolah, tenantInfo, tahunPelajaranNama, semesterNama, renderedCount === 0);
      renderedCount++;
    } catch (err: any) {
      console.warn(`Gagal memuat rapor untuk ${student.nama_siswa}:`, err);
      lastError = err;
    }
  }

  if (renderedCount === 0) {
    const errorMsg =
      lastError?.response?.data?.message ||
      lastError?.message ||
      'Gagal memproses pembuatan PDF batch sekelas.';
    throw new Error(errorMsg);
  }

  const filename = `Rapor_Sekelas_${kelasNama.replace(/\s+/g, '_')}_${semesterNama || 'Semester'}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

/**
 * Helper Format Tanggal Bahasa Indonesia
 */
const formatIndoDate = (dateVal?: string | Date | null): string => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return String(dateVal);
  }
};

/**
 * 📕 1. Generate Cover Rapor PDF (Client-side jsPDF)
 */
export const generateCoverRaporPdf = async (options: {
  siswaId: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  tahunPelajaranNama?: string;
  semesterNama?: string;
}): Promise<{ blobUrl: string; filename: string }> => {
  const { siswaId, tahunPelajaranId = '', semesterId = '' } = options;

  const [raporRes, sekolahRes, tenantRes] = await Promise.allSettled([
    raporApi.getRaporDetail({ siswa_id: siswaId, tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }),
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null),
  ]);

  const raporRaw = raporRes.status === 'fulfilled' ? (raporRes.value?.data || raporRes.value) : null;
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? tenantRes.value : null;

  const siswa = raporRaw?.siswa || {};
  const namaSekolah = sekolah?.nama || tenantInfo?.name || 'SEKOLAH';
  const npsn = sekolah?.npsn || tenantInfo?.npsn || '-';
  const alamatSekolah = sekolah?.alamat || tenantInfo?.address || '-';
  const provinsi = sekolah?.provinsi || tenantInfo?.province || 'Jawa Barat';

  const tingkatNum = Number(siswa.tingkat || 10);
  const jenjangRaw = String(sekolah?.jenjang || tenantInfo?.jenjang || siswa?.jenjang || '').toUpperCase();
  let jenjangJudul = 'SEKOLAH MENENGAH KEJURUAN (SMK)';
  if (jenjangRaw.includes('SD') || jenjangRaw.includes('MI') || (tingkatNum >= 1 && tingkatNum <= 6)) {
    jenjangJudul = 'SEKOLAH DASAR (SD)';
  } else if (jenjangRaw.includes('SMP') || jenjangRaw.includes('MTS') || (tingkatNum >= 7 && tingkatNum <= 9)) {
    jenjangJudul = 'SEKOLAH MENENGAH PERTAMA (SMP)';
  } else if (jenjangRaw.includes('SMA') || jenjangRaw.includes('MA')) {
    jenjangJudul = 'SEKOLAH MENENGAH ATAS (SMA)';
  }

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = 210;

  // Double Decorative Border Frame
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(1.2);
  doc.rect(10, 10, 190, 277);
  doc.setLineWidth(0.4);
  doc.rect(12.5, 12.5, 185, 272);

  // Header Dinas / Pemerintah Daerah
  let currentY = 28;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`PEMERINTAH DAERAH PROVINSI ${(provinsi || 'JAWA BARAT').toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  doc.text('DINAS PENDIDIKAN', pageWidth / 2, currentY, { align: 'center' });

  // Judul Rapor
  currentY += 18;
  doc.setFontSize(18);
  doc.text('RAPOR PESERTA DIDIK', pageWidth / 2, currentY, { align: 'center' });
  currentY += 7;
  doc.setFontSize(13);
  doc.text(jenjangJudul, pageWidth / 2, currentY, { align: 'center' });

  // Logo Sekolah
  currentY += 15;
  const logoUrl = sekolah?.logo_url || tenantInfo?.logo_url;
  let logoLoaded = false;
  if (logoUrl) {
    try {
      const logoBase64 = await getBase64ImageFromUrl(logoUrl);
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', (pageWidth - 36) / 2, currentY, 36, 36);
        logoLoaded = true;
      }
    } catch {
      logoLoaded = false;
    }
  }
  if (!logoLoaded) {
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.8);
    doc.circle(pageWidth / 2, currentY + 18, 18);
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'bold');
    doc.text('LOGO', pageWidth / 2, currentY + 17, { align: 'center' });
    doc.text('SEKOLAH', pageWidth / 2, currentY + 22, { align: 'center' });
  }

  currentY += 45;

  // Nama Sekolah & Identitas Lembaga
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(namaSekolah.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
  currentY += 5.5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`NPSN: ${npsn}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 4.5;
  doc.setFontSize(8.5);
  doc.text(alamatSekolah, pageWidth / 2, currentY, { align: 'center', maxWidth: 140 });

  // Kotak Identitas Siswa
  currentY += 28;
  const boxWidth = 145;
  const boxX = (pageWidth - boxWidth) / 2;

  // Label Nama
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Nama Peserta Didik :', boxX, currentY);
  currentY += 3;
  // Box Nama
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.rect(boxX, currentY, boxWidth, 12, 'FD');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text((siswa.nama_siswa || '-').toUpperCase(), pageWidth / 2, currentY + 7.8, { align: 'center', maxWidth: boxWidth - 8 });

  currentY += 19;
  // Label NIS / NISN
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('NIS / NISN :', boxX, currentY);
  currentY += 3;
  // Box NIS / NISN
  doc.setFillColor(248, 250, 252);
  doc.rect(boxX, currentY, boxWidth, 12, 'FD');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`${siswa.nis || '-'} / ${siswa.nisn || '-'}`, pageWidth / 2, currentY + 7.8, { align: 'center' });

  // Footer Kementerian
  currentY = 265;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  doc.text('REPUBLIK INDONESIA', pageWidth / 2, currentY, { align: 'center' });

  const filename = `Cover_Rapor_${(siswa.nama_siswa || 'Siswa').replace(/\s+/g, '_')}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

/**
 * 📋 2. Generate Biodata Siswa 17 Butir PDF (Client-side jsPDF)
 */
export const generateBiodataSiswaPdf = async (options: {
  siswaId: string;
}): Promise<{ blobUrl: string; filename: string }> => {
  const { siswaId } = options;

  const [raporRes, sekolahRes, tenantRes] = await Promise.allSettled([
    raporApi.getRaporDetail({ siswa_id: siswaId, tahun_pelajaran_id: '', semester_id: '' }),
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null),
  ]);

  const raporRaw = raporRes.status === 'fulfilled' ? (raporRes.value?.data || raporRes.value) : null;
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? tenantRes.value : null;

  const siswa = raporRaw?.siswa || {};
  const kota = sekolah?.kota || tenantInfo?.city || 'Purwakarta';

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = 210;

  // Header Title
  let currentY = 16;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('KETERANGAN TENTANG DIRI PESERTA DIDIK', pageWidth / 2, currentY, { align: 'center' });

  const fullAlamatSiswa = [
    siswa.alamat,
    siswa.dusun ? `Dusun ${siswa.dusun}` : '',
    siswa.rt || siswa.rw ? `RT ${siswa.rt || '01'} RW ${siswa.rw || '01'}` : '',
    siswa.kelurahan ? `Desa/Kel. ${siswa.kelurahan}` : '',
    siswa.kecamatan ? `Kec. ${siswa.kecamatan}` : '',
    siswa.kabupaten ? `Kab. ${siswa.kabupaten}` : '',
  ].filter(Boolean).join(' ') || siswa.alamat || '-';

  const jk = (siswa.jenis_kelamin || '').toUpperCase().startsWith('L') ? 'Laki-Laki' : 'Perempuan';
  const ttl = `${siswa.tempat_lahir || '-'}, ${formatIndoDate(siswa.tanggal_lahir)}`;
  const tglMasuk = formatIndoDate(siswa.tanggal_masuk);

  const tableBody = [
    ['1.', 'Nama Peserta Didik (Lengkap)', ':', (siswa.nama_siswa || '-').toUpperCase()],
    ['2.', 'Nomor Induk Siswa / NISN', ':', `${siswa.nis || '-'} / ${siswa.nisn || '-'}`],
    ['3.', 'Tempat, Tanggal Lahir', ':', ttl],
    ['4.', 'Jenis Kelamin', ':', jk],
    ['5.', 'Agama', ':', siswa.agama || '-'],
    ['6.', 'Status dalam Keluarga', ':', siswa.status_dalam_keluarga || 'Anak Kandung'],
    ['7.', 'Anak ke', ':', siswa.anak_ke ? String(siswa.anak_ke) : '-'],
    ['8.', 'Alamat Peserta Didik', ':', fullAlamatSiswa],
    ['9.', 'Nomor Telepon Rumah / HP', ':', siswa.no_telepon || '-'],
    ['10.', 'Sekolah Asal (SMP / MTs)', ':', siswa.sekolah_asal || '-'],
    ['11.', 'Diterima di Sekolah ini', ':', `a. Di Kelas      : ${siswa.kelas || '-'}\nb. Pada Tanggal: ${tglMasuk}`],
    ['12.', 'Nama Orang Tua', ':', `a. Ayah : ${siswa.nama_ayah || '-'}\nb. Ibu   : ${siswa.nama_ibu || '-'}`],
    ['13.', 'Alamat Orang Tua', ':', siswa.alamat_ortu || fullAlamatSiswa],
    ['14.', 'Pekerjaan Orang Tua', ':', `a. Ayah : ${siswa.pekerjaan_ayah || '-'}\nb. Ibu   : ${siswa.pekerjaan_ibu || '-'}`],
    ['15.', 'Nama Wali Peserta Didik', ':', siswa.nama_wali || '-'],
    ['16.', 'Alamat Wali Peserta Didik', ':', siswa.alamat_wali || '-'],
    ['17.', 'Pekerjaan Wali Peserta Didik', ':', siswa.pekerjaan_wali || '-'],
  ];

  autoTable(doc, {
    startY: currentY + 5,
    margin: { left: 16, right: 16 },
    body: tableBody,
    theme: 'plain',
    styles: {
      font: 'Helvetica',
      fontSize: 8.5,
      cellPadding: 1.4,
      textColor: [17, 24, 39],
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 54 },
      2: { cellWidth: 4 },
      3: { cellWidth: 112 },
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 215;
  const photoY = Math.min(finalY + 6, 235);

  // Kotak Pas Foto 3x4 (Left)
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.6);
  doc.rect(25, photoY, 30, 40);
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Pas Foto', 40, photoY + 18, { align: 'center' });
  doc.text('3 x 4 cm', 40, photoY + 23, { align: 'center' });

  // Tanda Tangan Kepala Sekolah (Right)
  const rightX = 135;
  const kepalaSekolahNama = sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'Drs. H. Mulyadi, M.Pd.';
  const kepalaSekolahNip = sekolah?.nip_kepala_sekolah || tenantInfo?.nip_kepala_sekolah || '-';
  const titimangsa = `${kota}, ${formatIndoDate(new Date())}`;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text(titimangsa, rightX, photoY + 4);
  doc.text('Kepala Sekolah,', rightX, photoY + 9);

  doc.setFont('Helvetica', 'bold');
  doc.text(kepalaSekolahNama, rightX, photoY + 34);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`NIP. ${kepalaSekolahNip}`, rightX, photoY + 38.5);

  const filename = `Biodata_Siswa_${(siswa.nama_siswa || 'Siswa').replace(/\s+/g, '_')}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

/**
 * 📊 3. Generate Buku Leger Nilai PDF (Landscape A4 - Client-side jsPDF)
 */
export const generateLegerPdf = async (options: {
  kelasId: string;
  tahunPelajaranId: string;
  semesterId: string;
  tahunPelajaranNama?: string;
  semesterNama?: string;
  kelasNama?: string;
}): Promise<{ blobUrl: string; filename: string }> => {
  const { kelasId, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '', kelasNama = 'Kelas' } = options;

  const [legerRes, sekolahRes, tenantRes] = await Promise.allSettled([
    raporApi.getLeger({ kelas_id: kelasId, tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }),
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null),
  ]);

  const legerData = legerRes.status === 'fulfilled' ? (legerRes.value?.data || legerRes.value) : null;
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? tenantRes.value : null;

  if (!legerData) {
    throw new Error('Gagal memuat data buku leger dari server.');
  }

  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
  const pageWidth = 297;
  const namaSekolah = sekolah?.nama || tenantInfo?.name || 'SEKOLAH';
  const kota = sekolah?.kota || tenantInfo?.city || 'Purwakarta';
  const tpText = tahunPelajaranNama || legerData?.tahun_pelajaran?.tahun || '2025/2026';
  const semText = semesterNama || legerData?.semester?.nama_semester || 'Ganjil';
  const klsText = kelasNama || legerData?.kelas?.nama_kelas || 'Kelas';

  // Title & Header (Landscape)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('BUKU LEGER NILAI HASIL BELAJAR PESERTA DIDIK', pageWidth / 2, 13, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${namaSekolah.toUpperCase()} - TAHUN PELAJARAN ${tpText.toUpperCase()}`, pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Kelas: ${klsText}   |   Semester: ${semText}`, pageWidth / 2, 22.5, { align: 'center' });

  const mapelList: any[] = legerData.mapel_list || [];
  const students: any[] = legerData.students || [];

  // Header Table Construction
  const headRow1: any[] = [
    { content: 'NO', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
    { content: 'NIS', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
    { content: 'NAMA PESERTA DIDIK', rowSpan: 2, styles: { valign: 'middle' } },
  ];

  if (mapelList.length > 0) {
    headRow1.push({
      content: 'MATA PELAJARAN',
      colSpan: mapelList.length,
      styles: { halign: 'center', fillColor: [224, 242, 254] },
    });
  }

  headRow1.push(
    { content: 'PRESENSI', colSpan: 3, styles: { halign: 'center', fillColor: [254, 226, 226] } },
    { content: 'TOTAL', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: [254, 240, 138] } },
    { content: 'RATA', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: [254, 215, 170] } },
    { content: 'RANK', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: [187, 247, 208] } }
  );

  const headRow2: any[] = [];
  mapelList.forEach((m) => {
    const shortName = m.kode_mapel || m.nama_mapel.substring(0, 6).toUpperCase();
    headRow2.push({ content: shortName, styles: { halign: 'center', fontSize: 6.5 } });
  });
  headRow2.push(
    { content: 'S', styles: { halign: 'center', fontSize: 6.5 } },
    { content: 'I', styles: { halign: 'center', fontSize: 6.5 } },
    { content: 'A', styles: { halign: 'center', fontSize: 6.5 } }
  );

  // Table Body Construction
  const bodyRows = students.map((s, idx) => {
    const mapelScores = mapelList.map((m) => {
      const score = s.grades?.[m.id];
      return typeof score === 'number' && score > 0 ? score : '-';
    });
    return [
      idx + 1,
      s.nis || '-',
      s.nama_siswa || '-',
      ...mapelScores,
      s.sakit ?? 0,
      s.izin ?? 0,
      s.alpa ?? 0,
      s.total ?? 0,
      s.rata_rata ?? 0,
      s.rank || '-',
    ];
  });

  autoTable(doc, {
    startY: 26,
    margin: { left: 10, right: 10 },
    head: [headRow1, headRow2],
    body: bodyRows,
    theme: 'grid',
    styles: {
      font: 'Helvetica',
      fontSize: 7,
      cellPadding: 1,
      textColor: [17, 24, 39],
      lineColor: [100, 116, 139],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 42, halign: 'left' },
    },
  });

  // Bottom Signatures (Landscape)
  const finalY = (doc as any).lastAutoTable?.finalY || 155;
  const signY = finalY > 165 ? 165 : finalY + 8;

  if (signY > 175) {
    doc.addPage('a4', 'l');
  }

  const targetSignY = signY > 175 ? 20 : signY;
  const leftSignX = 35;
  const rightSignX = 220;
  const kepalaSekolahNama = sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'Drs. H. Mulyadi, M.Pd.';
  const kepalaSekolahNip = sekolah?.nip_kepala_sekolah || tenantInfo?.nip_kepala_sekolah || '-';
  const walasNama = legerData?.walas?.nama || 'Wali Kelas';
  const walasNip = legerData?.walas?.nip || '-';

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Mengetahui,`, leftSignX, targetSignY);
  doc.text('Kepala Sekolah,', leftSignX, targetSignY + 4.5);

  doc.text(`${kota}, ${formatIndoDate(new Date())}`, rightSignX, targetSignY);
  doc.text('Wali Kelas,', rightSignX, targetSignY + 4.5);

  doc.setFont('Helvetica', 'bold');
  doc.text(kepalaSekolahNama, leftSignX, targetSignY + 24);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${kepalaSekolahNip}`, leftSignX, targetSignY + 28);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(walasNama, rightSignX, targetSignY + 24);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${walasNip}`, rightSignX, targetSignY + 28);

  const filename = `Buku_Leger_${klsText.replace(/\s+/g, '_')}_${semText}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

/**
 * 📑 4. Generate Rapor Penilaian Sumatif PDF (Client-side jsPDF)
 */
export const generateRaporSumatifPdf = async (options: PrintRaporOptions): Promise<{ blobUrl: string; filename: string }> => {
  const { siswaId, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '' } = options;

  const [raporRes, sekolahRes, tenantRes] = await Promise.allSettled([
    raporApi.getRaporDetail({ siswa_id: siswaId, tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }),
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null),
  ]);

  const raporData = raporRes.status === 'fulfilled' ? (raporRes.value?.data || raporRes.value) : null;
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? tenantRes.value : null;

  if (!raporData) throw new Error('Data rapor sumatif tidak ditemukan.');

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const siswa = raporData.siswa || {};
  const namaSekolah = sekolah?.nama || tenantInfo?.name || 'SEKOLAH';
  const kota = sekolah?.kota || tenantInfo?.city || 'Purwakarta';

  let currentY = 16;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('LAPORAN HASIL PENILAIAN SUMATIF', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  doc.setFontSize(10);
  doc.text(`${namaSekolah.toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 7;

  // Metadata Table
  const metaRows = [
    ['Nama Peserta Didik', ':', (siswa.nama_siswa || '-').toUpperCase(), 'Kelas', ':', siswa.kelas || '-'],
    ['NIS / NISN', ':', `${siswa.nis || '-'} / ${siswa.nisn || '-'}`, 'Fase', ':', siswa.tingkat <= 10 ? 'E' : 'F'],
    ['Tahun Pelajaran', ':', tahunPelajaranNama || '2025/2026', 'Semester', ':', semesterNama || 'Ganjil'],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    body: metaRows,
    theme: 'plain',
    styles: { font: 'Helvetica', fontSize: 8.5, cellPadding: 1 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 4 },
      2: { cellWidth: 65, fontStyle: 'bold' },
      3: { cellWidth: 25 },
      4: { cellWidth: 4 },
      5: { cellWidth: 45 },
    },
  });

  const metaEnd = (doc as any).lastAutoTable?.finalY || 45;

  // Nilai Akademik Sumatif Table
  const nilaiList: any[] = raporData.nilai_akademik || [];
  const tableRows = nilaiList.map((m, idx) => {
    return [
      idx + 1,
      m.mapel_name,
      m.kkm || 75,
      m.nilai_akhir > 0 ? m.nilai_akhir : '-',
      m.catatan_kompetensi || 'Telah mencapai kompetensi dengan optimal.',
    ];
  });

  autoTable(doc, {
    startY: metaEnd + 4,
    margin: { left: 14, right: 14 },
    head: [['NO', 'MATA PELAJARAN', 'KKM', 'NILAI AKHIR', 'CAPAIAN KOMPETENSI / DESKRIPSI']],
    body: tableRows,
    theme: 'grid',
    styles: { font: 'Helvetica', fontSize: 8, cellPadding: 2, textColor: [17, 24, 39] },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 88 },
    },
  });

  const sumatifEnd = (doc as any).lastAutoTable?.finalY || 180;
  const signY = sumatifEnd > 240 ? 240 : sumatifEnd + 10;
  if (signY > 245) {
    doc.addPage();
  }
  const targetSignY = signY > 245 ? 25 : signY;
  const kepalaSekolahNama = sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'Drs. H. Mulyadi, M.Pd.';
  const kepalaSekolahNip = sekolah?.nip_kepala_sekolah || tenantInfo?.nip_kepala_sekolah || '-';

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${kota}, ${formatIndoDate(new Date())}`, 140, targetSignY);
  doc.text('Kepala Sekolah,', 140, targetSignY + 4.5);
  doc.setFont('Helvetica', 'bold');
  doc.text(kepalaSekolahNama, 140, targetSignY + 24);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${kepalaSekolahNip}`, 140, targetSignY + 28);

  const filename = `Rapor_Sumatif_${(siswa.nama_siswa || 'Siswa').replace(/\s+/g, '_')}_${semesterNama || 'Semester'}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

/**
 * 🎓 5. Generate Transkrip Nilai Kumulatif PDF (Client-side jsPDF)
 */
export const generateTranskripPdf = async (options: {
  siswaId: string;
}): Promise<{ blobUrl: string; filename: string }> => {
  const { siswaId } = options;

  const [transkripRes, sekolahRes, tenantRes] = await Promise.allSettled([
    raporApi.getTranskripNilai(siswaId),
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null),
  ]);

  const transkripData = transkripRes.status === 'fulfilled' ? (transkripRes.value?.data || transkripRes.value) : null;
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? tenantRes.value : null;

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const siswa = transkripData?.siswa || {};
  const namaSekolah = sekolah?.nama || tenantInfo?.name || 'SEKOLAH';
  const kota = sekolah?.kota || tenantInfo?.city || 'Purwakarta';

  let currentY = 16;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TRANSKRIP NILAI PRESTASI BELAJAR', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  doc.setFontSize(10);
  doc.text(namaSekolah.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
  currentY += 7;

  // Metadata Table
  const metaRows = [
    ['Nama Peserta Didik', ':', (siswa.nama_siswa || '-').toUpperCase(), 'NIS / NISN', ':', `${siswa.nis || '-'} / ${siswa.nisn || '-'}`],
    ['Kelas / Tingkat', ':', `${siswa.kelas || '-'} (${siswa.tingkat || 12})`, 'Konsentrasi Keahlian', ':', siswa.konsentrasi_keahlian || siswa.jurusan || '-'],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    body: metaRows,
    theme: 'plain',
    styles: { font: 'Helvetica', fontSize: 8.5, cellPadding: 1 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 4 },
      2: { cellWidth: 65, fontStyle: 'bold' },
      3: { cellWidth: 30 },
      4: { cellWidth: 4 },
      5: { cellWidth: 44 },
    },
  });

  const metaEnd = (doc as any).lastAutoTable?.finalY || 45;
  const mapelList: any[] = transkripData?.nilai_kumulatif || [];

  const tableRows = mapelList.map((m, idx) => [
    idx + 1,
    m.nama_mapel,
    m.kelompok_mapel || 'Umum',
    m.rata_rata || m.nilai_akhir || '-',
    m.predikat || 'B',
  ]);

  autoTable(doc, {
    startY: metaEnd + 4,
    margin: { left: 14, right: 14 },
    head: [['NO', 'MATA PELAJARAN', 'KELOMPOK', 'NILAI AKHIR', 'PREDIKAT']],
    body: tableRows.length > 0 ? tableRows : [['-', 'Belum ada data nilai transkrip', '-', '-', '-']],
    theme: 'grid',
    styles: { font: 'Helvetica', fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 80 },
      2: { cellWidth: 50 },
      3: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 20, halign: 'center' },
    },
  });

  const tableEnd = (doc as any).lastAutoTable?.finalY || 180;
  const signY = tableEnd > 240 ? 240 : tableEnd + 10;
  if (signY > 245) doc.addPage();
  const targetSignY = signY > 245 ? 25 : signY;
  const kepalaSekolahNama = sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'Drs. H. Mulyadi, M.Pd.';
  const kepalaSekolahNip = sekolah?.nip_kepala_sekolah || tenantInfo?.nip_kepala_sekolah || '-';

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${kota}, ${formatIndoDate(new Date())}`, 140, targetSignY);
  doc.text('Kepala Sekolah,', 140, targetSignY + 4.5);
  doc.setFont('Helvetica', 'bold');
  doc.text(kepalaSekolahNama, 140, targetSignY + 24);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${kepalaSekolahNip}`, 140, targetSignY + 28);

  const filename = `Transkrip_Nilai_${(siswa.nama_siswa || 'Siswa').replace(/\s+/g, '_')}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

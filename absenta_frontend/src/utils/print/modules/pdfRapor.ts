import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { raporApi } from '../../../api/rapor.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { siswaApi } from '../../../api/academic.api';
import { getKelasDetail } from '../../../api/academic/kelas.api';
import { getMyTenant, getTenantById } from '../../../api/tenants.api';
import { useAuthStore } from '../../../store/authStore';
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
    if (name.includes('koding') || name.includes('kecerdasan') || name.includes('ai') || name.includes('artificial')) return 85;
    if (name.includes('sunda') || name.includes('jawa') || name.includes('daerah') || name.includes('mulok')) return 90;
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
  isFirstStudent = true,
  raporSettings?: any,
  fontFamily: string = 'Cambria'
): void => {
  const font = fontFamily || 'Cambria';
  const siswa = data?.siswa || {};
  const effectiveSettings = raporSettings || data?.rapor_settings;

  // Multi-layered resolution: Parameter -> Data Payload -> Settings Map -> Smart Fallback
  const effectiveSemesterNama =
    (semesterNama || '').trim() ||
    (data?.semester?.nama_semester || '').trim() ||
    (data?.is_genap ? 'Genap' : '') ||
    (effectiveSettings?.genap_semester_id && (
      effectiveSettings.genap_semester_id === data?.semester?.id ||
      effectiveSettings.genap_semester_id === effectiveSettings?.semester_id
    ) ? 'Genap' : '') ||
    '';

  const effectiveTahunPelajaranNama =
    (tahunPelajaranNama || '').trim() ||
    (data?.tahun_pelajaran?.tahun || '').trim() ||
    '';

  const isGenap = Boolean(
    data?.is_genap ||
    data?.semester?.is_genap ||
    (effectiveSemesterNama && (effectiveSemesterNama.toLowerCase().includes('genap') || effectiveSemesterNama.includes('2'))) ||
    (effectiveSettings?.genap_semester_id && (
      effectiveSettings.genap_semester_id === data?.semester?.id ||
      effectiveSettings.genap_semester_id === effectiveSettings?.semester_id
    ))
  );

  const displaySemester = effectiveSemesterNama || (isGenap ? 'Genap' : 'Ganjil');
  const displayTahunPelajaran = effectiveTahunPelajaranNama || '2025 / 2026';

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
    const maxLeftValWidth = rightColX - (leftColX + colValOffset) - 4; // 130 - 60 - 4 = 66mm

    startDoc.setFontSize(8.5);

    // Left column: Top basic info
    const topInfo: Array<[string, string]> = [
      ['Nama Peserta Didik', siswa.nama_siswa || '-'],
      ['NIS/NISN', `${siswa.nis || '-'} / ${siswa.nisn || '-'}`],
      ['Nama Sekolah', namaSekolah],
    ];

    let leftY = startY;
    topInfo.forEach(([label, value]) => {
      startDoc.setFont(font, 'normal');
      startDoc.text(label, leftColX, leftY);
      startDoc.text(':', leftColX + colValOffset - 2, leftY);
      startDoc.setFont(font, label === 'Nama Peserta Didik' ? 'bold' : 'normal');
      startDoc.text(String(value), leftColX + colValOffset, leftY);
      leftY += 4.2;
    });

    // Left column: Alamat (Wrapped cleanly to prevent colliding with right column, followed by an enter/gap)
    startDoc.setFont(font, 'normal');
    startDoc.text('Alamat', leftColX, leftY);
    startDoc.text(':', leftColX + colValOffset - 2, leftY);
    const alamatLines = startDoc.splitTextToSize(alamatSekolah, maxLeftValWidth);
    startDoc.text(alamatLines, leftColX + colValOffset, leftY);
    leftY += Math.max(alamatLines.length * 4.0, 4.2);

    // Spacing/Enter before Bidang Keahlian (Per standard e-Rapor & user request)
    leftY += 3.5;

    // Left column: Vocational/Peminatan fields
    const vocationalInfo: Array<[string, string]> = [];
    if (jenjang === 'SMK') {
      vocationalInfo.push(
        ['Bidang Keahlian', siswa.bidang_keahlian || 'Teknologi Manufaktur dan Rekayasa'],
        ['Program Keahlian', siswa.program_keahlian || 'Teknik Elektronika'],
        ['Konsentrasi Keahlian', siswa.konsentrasi_keahlian || 'Teknik Otomasi Industri']
      );
    } else if (jenjang === 'SMA' && siswa.peminatan) {
      vocationalInfo.push(['Peminatan / Kelompok', siswa.peminatan]);
    }

    vocationalInfo.forEach(([label, value]) => {
      startDoc.setFont(font, 'normal');
      startDoc.text(label, leftColX, leftY);
      startDoc.text(':', leftColX + colValOffset - 2, leftY);
      const valLines = startDoc.splitTextToSize(String(value), maxLeftValWidth);
      startDoc.text(valLines, leftColX + colValOffset, leftY);
      leftY += Math.max(valLines.length * 4.0, 4.2);
    });

    // Right column metadata
    const rightInfo = [
      ['Kelas', siswa.kelas || '-'],
      ['Fase', fase],
      ['Semester', displaySemester],
      ['Tahun Pelajaran', displayTahunPelajaran],
    ];

    let rightY = startY;
    rightInfo.forEach(([label, value]) => {
      startDoc.setFont(font, 'normal');
      startDoc.text(label, rightColX, rightY);
      startDoc.text(':', rightColX + rightValOffset - 2, rightY);
      startDoc.setFont(font, label === 'Kelas' ? 'bold' : 'normal');
      startDoc.text(String(value), rightColX + rightValOffset, rightY);
      rightY += 4.2;
    });

    return Math.max(leftY, rightY) + 4;
  };

  if (!isFirstStudent) {
    doc.addPage();
  }

  const pageWidth = 210;
  let y = 14;

  // ── PAGE 1 ──

  // Title Header (Centered)
  doc.setFont(font, 'bold');
  doc.setFontSize(12);
  doc.text('LAPORAN HASIL BELAJAR', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text('(RAPOR)', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Student Info Grid on Page 1
  y = drawStudentMetadataGrid(doc, y);

  // Section I: INTRA KURIKULER
  doc.setFont(font, 'bold');
  doc.setFontSize(10);
  doc.text('I. INTRA KURIKULER', 15, y);
  y += 5;

  // Categorized Grade Table
  const nilaiAkademik: any[] = data?.nilai_akademik || [];
  
  if (nilaiAkademik.length === 0) {
    doc.setFont(font, 'italic');
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

    // Adaptive Era Detection based on Academic Year:
    // - Legacy Era (< 2025: 2022/2023, 2023/2024, 2024/2025 - Kepmendikbudristek 262/M/2022):
    //   2 Sekat: A. Kelompok Umum & B. Kelompok Kejuruan (Pilihan & Mulok melebur ke Kejuruan)
    // - New Era (>= 2025: 2025/2026 dst. - Permendikbudristek 12/2024):
    //   4 Sekat: A. Mata Pelajaran Umum, B. Mata Pelajaran Kejuruan, C. Mata Pelajaran Pilihan, D. Muatan Lokal
    const matchYear = String(displayTahunPelajaran || '').match(/^(\d{4})/);
    const startYear = matchYear ? parseInt(matchYear[1], 10) : 2025;
    const isLegacyEra = startYear < 2025;

    const groupedMapel = new Map<string, any[]>();
    dedupedList.forEach((n: any) => {
      let groupCategory = 'Kelompok Umum';
      const rawGrp = (n.kelompok_mapel || '').toLowerCase();
      const mapelNameLower = (n.mapel_name || '').toLowerCase();

      if (isLegacyEra) {
        // --- ERA 2022 - 2024 (2 SEKAT: KELOMPOK UMUM & KELOMPOK KEJURUAN) ---
        const isKejuruanLegacy =
          rawGrp.includes('kejuruan') ||
          rawGrp.includes('pilihan') ||
          rawGrp.includes('lokal') ||
          rawGrp.includes('mulok') ||
          (jenjang === 'SMK' && (
            mapelNameLower.includes('matematika') ||
            mapelNameLower.includes('inggris') ||
            mapelNameLower.includes('informatika') ||
            mapelNameLower.includes('ipas') ||
            (mapelNameLower.includes('alam') && mapelNameLower.includes('sosial')) ||
            mapelNameLower.includes('dasar') ||
            mapelNameLower.includes('program keahlian') ||
            mapelNameLower.includes('konsentrasi') ||
            mapelNameLower.includes('kejuruan') ||
            mapelNameLower.includes('pkk') ||
            mapelNameLower.includes('kewirausahaan') ||
            mapelNameLower.includes('pkl') ||
            mapelNameLower.includes('praktik kerja') ||
            mapelNameLower.includes('gtm') ||
            mapelNameLower.includes('pdtm') ||
            mapelNameLower.includes('dptm') ||
            mapelNameLower.includes('gambar teknik') ||
            mapelNameLower.includes('pemesinan') ||
            mapelNameLower.includes('otomotif') ||
            mapelNameLower.includes('pengelasan') ||
            mapelNameLower.includes('elektronika') ||
            mapelNameLower.includes('pilihan') ||
            mapelNameLower.includes('koding') ||
            mapelNameLower.includes('kecerdasan') ||
            mapelNameLower.includes('sunda') ||
            mapelNameLower.includes('jawa') ||
            mapelNameLower.includes('daerah') ||
            mapelNameLower.includes('plh')
          ));

        groupCategory = isKejuruanLegacy ? 'Kelompok Kejuruan' : 'Kelompok Umum';
      } else {
        // --- ERA 2025/2026 DST (4 SEKAT: UMUM, KEJURUAN, PILIHAN, MUATAN LOKAL) ---
        // Priority 1: Muatan Lokal
        if (
          rawGrp.includes('lokal') ||
          rawGrp.includes('mulok') ||
          mapelNameLower.includes('sunda') ||
          mapelNameLower.includes('jawa') ||
          mapelNameLower.includes('madura') ||
          mapelNameLower.includes('daerah') ||
          mapelNameLower.includes('plh') ||
          mapelNameLower.includes('lingkungan hidup')
        ) {
          groupCategory = 'Muatan Lokal';
        }
        // Priority 2: Mata Pelajaran Pilihan
        else if (
          rawGrp.includes('pilihan') ||
          rawGrp.includes('peminatan') ||
          mapelNameLower.includes('pilihan') ||
          mapelNameLower.includes('koding') ||
          mapelNameLower.includes('kecerdasan artifisial') ||
          mapelNameLower.includes('kecerdasan buatan') ||
          mapelNameLower.includes('ai') ||
          mapelNameLower.includes('robotika')
        ) {
          groupCategory = 'Mata Pelajaran Pilihan';
        }
        // Priority 3: Mata Pelajaran Kejuruan (Khusus SMK)
        else if (
          rawGrp.includes('kejuruan') ||
          (jenjang === 'SMK' && (
            mapelNameLower.includes('matematika') ||
            mapelNameLower.includes('inggris') ||
            mapelNameLower.includes('informatika') ||
            mapelNameLower.includes('ipas') ||
            (mapelNameLower.includes('alam') && mapelNameLower.includes('sosial')) ||
            mapelNameLower.includes('dasar') ||
            mapelNameLower.includes('program keahlian') ||
            mapelNameLower.includes('konsentrasi') ||
            mapelNameLower.includes('kejuruan') ||
            mapelNameLower.includes('pkk') ||
            mapelNameLower.includes('kewirausahaan') ||
            mapelNameLower.includes('pkl') ||
            mapelNameLower.includes('praktik kerja') ||
            mapelNameLower.includes('gtm') ||
            mapelNameLower.includes('pdtm') ||
            mapelNameLower.includes('dptm') ||
            mapelNameLower.includes('gambar teknik') ||
            mapelNameLower.includes('pemesinan') ||
            mapelNameLower.includes('otomotif') ||
            mapelNameLower.includes('pengelasan') ||
            mapelNameLower.includes('elektronika')
          ))
        ) {
          groupCategory = 'Mata Pelajaran Kejuruan';
        }
        // Priority 4: Default ke Mata Pelajaran Umum
        else {
          groupCategory = 'Mata Pelajaran Umum';
        }
      }

      if (!groupedMapel.has(groupCategory)) {
        groupedMapel.set(groupCategory, []);
      }
      groupedMapel.get(groupCategory)!.push(n);
    });

    const tableRows: any[] = [];
    const standardOrder = isLegacyEra
      ? ['Kelompok Umum', 'Kelompok Kejuruan']
      : ['Mata Pelajaran Umum', 'Mata Pelajaran Kejuruan', 'Mata Pelajaran Pilihan', 'Muatan Lokal'];

    // Hanya ambil kelompok yang ada datanya
    const activeGroups = standardOrder.filter((grp) => (groupedMapel.get(grp) || []).length > 0);
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

    activeGroups.forEach((groupCategory, groupIdx) => {
      const items = groupedMapel.get(groupCategory) || [];
      const letterPrefix = letters[groupIdx] ? `${letters[groupIdx]}. ` : '';
      const displayTitle = `${letterPrefix}${groupCategory}`;

      // Urutkan mapel secara presisi sesuai urutan baku e-Rapor Multi-Jenjang
      items.sort((a, b) => {
        const pA = getMapelCanonicalPriority(a.mapel_name || '', groupCategory, jenjang, a.urutan);
        const pB = getMapelCanonicalPriority(b.mapel_name || '', groupCategory, jenjang, b.urutan);
        if (pA !== pB) return pA - pB;
        return (a.mapel_name || '').localeCompare(b.mapel_name || '');
      });

      tableRows.push([
        {
          content: displayTitle,
          colSpan: 4,
          styles: {
            fontStyle: 'bold',
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontSize: 8.5,
            halign: 'left',
            valign: 'middle',
            minCellHeight: 7.5,
            cellPadding: { left: 3, top: 1.5, bottom: 1.5 },
          },
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
          { content: String(idx + 1), styles: { halign: 'center', valign: 'middle' } },
          { content: n.mapel_name || '-', styles: { halign: 'left', valign: 'middle' } },
          {
            content: String(score),
            styles: {
              halign: 'center',
              valign: 'middle',
              textColor: isMissing ? [220, 38, 38] : [0, 0, 0],
            },
          },
          {
            content: cap,
            styles: {
              halign: 'left',
              valign: 'middle',
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
      styles: {
        font,
      },
      headStyles: {
        fillColor: [205, 205, 205],
        textColor: 0,
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        minCellHeight: 8,
      },
      bodyStyles: {
        fontSize: 7.8,
        valign: 'middle',
        minCellHeight: 12,
        cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 },
        textColor: 0,
      },
      columnStyles: {
        0: { halign: 'center', valign: 'middle', cellWidth: 10 },
        1: { halign: 'left', valign: 'middle', cellWidth: 56 },
        2: { halign: 'center', valign: 'middle', cellWidth: 16 },
        3: { halign: 'left', valign: 'middle', cellWidth: 98 },
      },
      margin: { left: 15, right: 15 },
    });
  }

  // ── PAGE 2 ──
  doc.addPage();
  y = 15;

  // Student Info Grid Header on Page 2
  y = drawStudentMetadataGrid(doc, y);

  const tpYearStr = displayTahunPelajaran;
  const matchYear = tpYearStr.match(/^(\d{4})/);
  const startYear = matchYear ? parseInt(matchYear[1], 10) : 2025;

  const showKokurikuler = effectiveSettings?.tampilkan_kokurikuler !== undefined
    ? Boolean(effectiveSettings.tampilkan_kokurikuler)
    : (data?.tampilkan_kokurikuler !== undefined ? Boolean(data.tampilkan_kokurikuler) : startYear >= 2025);

  let sectionIdx = 2;

  // Section II: KOKURIKULER (Hanya jika tampilkan_kokurikuler aktif)
  if (showKokurikuler) {
    doc.setFont(font, 'bold');
    doc.setFontSize(10);
    doc.text('II. KOKURIKULER', 15, y);
    y += 4;

    const kokurikulerText = data?.catatan_kokurikuler ||
      'Peserta didik menunjukkan sikap disiplin dan tanggung jawab (Mandiri), mampu bekerja sama dan saling menghargai (Gotong Royong), serta menerapkan nilai-nilai akhlak mulia dalam kegiatan sekolah (Beriman dan Bertakwa kepada Tuhan YME serta Berakhlak Mulia).';

    const kokurikulerBoxHeight = 22;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(15, y, 180, kokurikulerBoxHeight);

    doc.setFont(font, 'normal');
    doc.setFontSize(8.5);
    const kokurikulerLines = doc.splitTextToSize(kokurikulerText, 174);
    doc.text(kokurikulerLines.slice(0, 4), 18, y + 4.5);
    y += kokurikulerBoxHeight + 6;
    sectionIdx = 3;
  }

  // Section: EKSTRA KURIKULER
  const ekskulNumeral = sectionIdx === 3 ? 'III' : 'II';
  doc.setFont(font, 'bold');
  doc.setFontSize(10);
  doc.text(`${ekskulNumeral}. EKSTRA KURIKULER`, 15, y);
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
    styles: { font },
    headStyles: { fillColor: [205, 205, 205], textColor: 0, fontSize: 9, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 8.5, cellPadding: 3.5 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 55 },
      2: { cellWidth: 113 },
    },
    margin: { left: 15, right: 15 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;
  sectionIdx++;

  // Section: KETIDAKHADIRAN & CATATAN WALI KELAS
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const presensiNumeral = romanNumerals[sectionIdx - 1] || 'IV';
  doc.setFont(font, 'bold');
  doc.setFontSize(10);
  doc.text(`${presensiNumeral}. KETIDAKHADIRAN`, 15, y);
  y += 4;

  const absensi = data?.absensi || {};
  const catatanWali = data?.catatan_wali ||
    'Pertahankan prestasi akademik dan terus kembangkan potensi diri dengan penuh disiplin serta semangat pantang menyerah.';

  autoTable(doc, {
    startY: y,
    head: [
      [
        { content: 'Ketidakhadiran', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Catatan Wali Kelas', styles: { halign: 'center' } },
      ],
    ],
    body: [
      [
        { content: 'Sakit', styles: { valign: 'middle' } },
        { content: `${absensi.sakit ?? 0} Hari`, styles: { halign: 'center', valign: 'middle' } },
        { content: catatanWali, rowSpan: 3, styles: { valign: 'middle', halign: 'left', cellPadding: 4 } },
      ],
      [
        { content: 'Izin', styles: { valign: 'middle' } },
        { content: `${absensi.izin ?? 0} Hari`, styles: { halign: 'center', valign: 'middle' } },
      ],
      [
        { content: 'Tanpa Keterangan', styles: { valign: 'middle' } },
        { content: `${absensi.alpa ?? 0} Hari`, styles: { halign: 'center', valign: 'middle' } },
      ],
    ],
    theme: 'grid',
    styles: { font },
    headStyles: { fillColor: [205, 205, 205], textColor: 0, fontSize: 9, fontStyle: 'bold', halign: 'center', valign: 'middle', minCellHeight: 8 },
    bodyStyles: { fontSize: 8.5, cellPadding: 3.5, textColor: 0, valign: 'middle', minCellHeight: 9 },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 117 },
    },
    margin: { left: 15, right: 15 },
  });
  y = (doc as any).lastAutoTable.finalY + 7;
  sectionIdx++;

  // Section: KENAIKAN KELAS (Khusus Semester Genap)
  if (isGenap) {
    const kenaikanNumeral = romanNumerals[sectionIdx - 1] || 'V';
    doc.setFont(font, 'bold');
    doc.setFontSize(10);
    doc.text(`${kenaikanNumeral}. KENAIKAN KELAS`, 15, y);
    y += 5;

    doc.setFont(font, 'bold');
    doc.setFontSize(8.5);
    doc.text('Keputusan :', 15, y);
    y += 4.2;

    const tingkat = Number(siswa.tingkat || 10);
    const targetNext = tingkat === 10 ? 'XI (Sebelas)' : tingkat === 11 ? 'XII (Dua Belas)' : 'Lulus';
    const curKelas = tingkat === 10 ? 'X (Sepuluh)' : tingkat === 11 ? 'XI (Sebelas)' : String(tingkat);

    const rawKep = (data.keputusan_transisi || '').trim().toUpperCase();
    const isMenetap = rawKep === 'MENETAP' || rawKep === 'TINGGAL';

    const textNaik = tingkat >= 12 ? 'Lulus' : `Naik ke kelas ${targetNext}`;
    const textTinggal = (tingkat >= 12 ? 'Tidak Lulus' : `Tinggal di kelas ${curKelas}`) + '  *)';

    doc.setFont(font, 'normal');
    doc.setFontSize(8.5);
    doc.text('Berdasarkan hasil yang dicapai pada semester 1 dan 2, peserta didik ditetapkan', 15, y);
    y += 4.5;

    // Baris 1: Naik
    const textNaikX = 15;
    if (isMenetap) {
      doc.setFont(font, 'normal');
      doc.text(textNaik, textNaikX, y);
      const wNaik = doc.getTextWidth(textNaik);
      doc.setDrawColor(40, 40, 40);
      doc.setLineWidth(0.35);
      doc.line(textNaikX, y - 1.1, textNaikX + wNaik, y - 1.1);
    } else {
      doc.setFont(font, 'bold');
      doc.text(textNaik, textNaikX, y);
    }
    y += 4.2;

    // Baris 2: Tinggal (dengan tanda *)
    const textTinggalX = 15;
    if (!isMenetap) {
      doc.setFont(font, 'normal');
      doc.text(textTinggal, textTinggalX, y);
      const wTinggal = doc.getTextWidth(textTinggal);
      doc.setDrawColor(40, 40, 40);
      doc.setLineWidth(0.35);
      doc.line(textTinggalX, y - 1.1, textTinggalX + wTinggal, y - 1.1);
    } else {
      doc.setFont(font, 'bold');
      doc.text(textTinggal, textTinggalX, y);
    }
    y += 11;
  } else {
    y += 6;
  }

  // Signatures Section (Orang Tua, Wali Kelas, Kepala Sekolah)
  const kota = effectiveSettings?.tempat_terbit || sekolah?.kota || tenantInfo?.city || 'Purwakarta';
  let effectiveDateVal = isGenap
    ? effectiveSettings?.tanggal_rapor_genap
    : effectiveSettings?.tanggal_rapor_ganjil;

  // Fallback ke tanggal_rapor umum HANYA jika bulannya sesuai semester (Genap: Mei-Juli, Ganjil: Nov-Jan)
  if (!effectiveDateVal && effectiveSettings?.tanggal_rapor) {
    const rawParts = String(effectiveSettings.tanggal_rapor).split('-');
    if (rawParts.length === 3) {
      const m = parseInt(rawParts[1], 10);
      if (isGenap && m >= 5 && m <= 7) {
        effectiveDateVal = effectiveSettings.tanggal_rapor;
      } else if (!isGenap && (m >= 11 || m <= 1)) {
        effectiveDateVal = effectiveSettings.tanggal_rapor;
      }
    }
  }

  // Smart Academic Fallback if no titimangsa date is configured: use authentic end-of-semester calendar
  if (!effectiveDateVal) {
    const matchYear = String(displayTahunPelajaran || '').match(/^(\d{4})/);
    const parsedStartYear = matchYear ? parseInt(matchYear[1], 10) : 2025;
    if (isGenap) {
      effectiveDateVal = `${parsedStartYear + 1}-06-24`;
    } else {
      effectiveDateVal = `${parsedStartYear}-12-22`;
    }
  }

  let dateStr = '';
  if (effectiveDateVal) {
    const dateParts = String(effectiveDateVal).split('-');
    if (dateParts.length === 3) {
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      dateStr = `${day} ${months[month]} ${year}`;
    } else {
      try {
        dateStr = new Date(effectiveDateVal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      } catch {
        dateStr = String(effectiveDateVal);
      }
    }
  }

  const kepalaSekolahNama = effectiveSettings?.kepsek_nama || sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'WAHYU TAMIMBARKAH, S.Pd.';
  const kepalaSekolahNip = effectiveSettings?.kepsek_nip || sekolah?.nip_kepala || tenantInfo?.nip_kepala || '197111022008011001';
  const waliKelasNama = data?.wali_kelas_nama || data?.wali_kelas?.nama || data?.walas?.nama || 'Wali Kelas';
  const rawWalasNip = data?.wali_kelas_nip || data?.wali_kelas?.nip || data?.walas?.nip;
  const waliKelasNip = rawWalasNip && rawWalasNip !== '-' 
    ? (rawWalasNip.startsWith('NIP.') ? rawWalasNip : `NIP. ${rawWalasNip}`)
    : 'NIP. -';

  // Row 1: Orang Tua & Wali Kelas
  const leftBlockX = 22;
  const rightBlockX = 135;

  doc.setFont(font, 'normal');
  doc.setFontSize(8.5);
  doc.text('Orang Tua/Wali Siswa,', leftBlockX, y);
  doc.text(`${kota}, ${dateStr}`, rightBlockX, y);
  doc.text('Wali Kelas,', rightBlockX, y + 4.5);

  y += 20;
  doc.text('......................................................', leftBlockX, y);
  doc.setFont(font, 'bold');
  doc.text(waliKelasNama, rightBlockX, y);

  // Underline nama Wali Kelas (rata kiri di rightBlockX)
  const walasWidth = doc.getTextWidth(waliKelasNama);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.line(rightBlockX, y + 0.8, rightBlockX + walasWidth, y + 0.8);

  doc.setFont(font, 'normal');
  doc.text(waliKelasNip, rightBlockX, y + 4.5);

  // Row 2: Kepala Sekolah (Centered)
  y += 12;
  doc.text('Mengetahui;', pageWidth / 2, y, { align: 'center' });
  doc.text('Kepala Sekolah,', pageWidth / 2, y + 4.5, { align: 'center' });
  y += 20;
  doc.setFont(font, 'bold');
  doc.text(kepalaSekolahNama, pageWidth / 2, y, { align: 'center' });

  // Underline nama Kepala Sekolah
  const kepsekWidth = doc.getTextWidth(kepalaSekolahNama);
  const kepsekStartX = (pageWidth / 2) - (kepsekWidth / 2);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.line(kepsekStartX, y + 0.8, kepsekStartX + kepsekWidth, y + 0.8);

  doc.setFont(font, 'normal');
  doc.text(`NIP. ${kepalaSekolahNip}`, pageWidth / 2, y + 4.5, { align: 'center' });
};

/**
 * Generate Rapor Semester PDF (client-side via jsPDF).
 * Fetches all data via authenticated axios, no backend Puppeteer needed.
 */
export const generateRaporPdf = async (options: PrintRaporOptions): Promise<{ blobUrl: string; filename: string }> => {
  const { siswaId, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '' } = options;

  // 1. Fetch data rapor detail via authenticated API, plus settings and school info
  const [raporRes, settingsRes, sekolahRes, tenantRes] = await Promise.allSettled([
    raporApi.getRaporDetail({ siswa_id: siswaId, tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }),
    raporApi.getRaporSettings({ tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }),
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null)
  ]);
  const data = raporRes.status === 'fulfilled' ? (raporRes.value?.data || raporRes.value) : null;
  const raporSettings = settingsRes.status === 'fulfilled' ? (settingsRes.value?.data || settingsRes.value) : null;
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? ((tenantRes.value as any)?.data || tenantRes.value) : null;

  const effectiveSettings = raporSettings || data?.rapor_settings;
  const resolvedSemesterNama =
    (semesterNama || '').trim() ||
    (data?.semester?.nama_semester || '').trim() ||
    (data?.is_genap ? 'Genap' : '') ||
    (effectiveSettings?.genap_semester_id && effectiveSettings.genap_semester_id === semesterId ? 'Genap' : '') ||
    '';

  const resolvedTahunPelajaranNama =
    (tahunPelajaranNama || '').trim() ||
    (data?.tahun_pelajaran?.tahun || '').trim() ||
    '';

  // 3. Create PDF document & render 2 pages
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const fontFamily = await ensureCambriaFont(doc);
  renderStudentRaporPages(doc, data, sekolah, tenantInfo, resolvedTahunPelajaranNama, resolvedSemesterNama, true, raporSettings, fontFamily);

  const siswa = data?.siswa || {};
  const filename = `RAPOR_${(siswa.nama_siswa || 'Siswa').replace(/\s+/g, '_')}_${resolvedSemesterNama || 'Semester'}.pdf`;
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
  const tenantInfo = tenantRes.status === 'fulfilled' ? ((tenantRes.value as any)?.data || tenantRes.value) : null;

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

  // 1. Fetch school, tenant & settings info once for whole batch compilation
  const [sekolahRes, tenantRes, settingsRes] = await Promise.allSettled([
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null),
    raporApi.getRaporSettings({ tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }),
  ]);
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? ((tenantRes.value as any)?.data || tenantRes.value) : null;
  const raporSettings = settingsRes.status === 'fulfilled' ? (settingsRes.value?.data || settingsRes.value) : null;

  // 2. Initialize single jsPDF document for entire class
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const fontFamily = await ensureCambriaFont(doc);
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
      renderStudentRaporPages(doc, data, sekolah, tenantInfo, tahunPelajaranNama, semesterNama, renderedCount === 0, raporSettings, fontFamily);
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

const DEFAULT_JABAR_LOGO_SVG = "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><path d="M50 5 C75 5, 92 18, 92 48 C92 82, 68 108, 50 115 C32 108, 8 82, 8 48 C8 18, 25 5, 50 5 Z" fill="#057835" stroke="#FFD700" stroke-width="4"/><path d="M50 18 C52 24, 55 35, 50 50 C46 38, 48 24, 50 18 Z" fill="#FFD700" stroke="#B8860B" stroke-width="1.5"/><circle cx="50" cy="30" r="3" fill="#FFFFFF"/><path d="M30 45 C30 25, 45 20, 50 20 C55 20, 70 25, 70 45 C70 65, 55 75, 50 75 C45 75, 30 65, 30 45 Z" stroke="#FFD700" stroke-width="2" stroke-dasharray="3,3" fill="none"/><path d="M20 78 C30 92, 42 98, 50 100 C58 98, 70 92, 80 78 Z" fill="#002D62"/><rect x="28" y="80" width="8" height="6" fill="#FFFFFF"/><rect x="44" y="80" width="8" height="6" fill="#FFFFFF"/><rect x="60" y="80" width="8" height="6" fill="#FFFFFF"/><rect x="36" y="86" width="8" height="6" fill="#FFFFFF"/><rect x="52" y="86" width="8" height="6" fill="#FFFFFF"/><path d="M15 102 C30 112, 70 112, 85 102 C80 115, 20 115, 15 102 Z" fill="#FFD700" stroke="#B8860B" stroke-width="1"/></svg>`
);

const resolveCoverImageBase64 = async (url: string | null | undefined): Promise<string | null> => {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();

  // If already base64 data URL
  if (trimmed.startsWith('data:image/png') || trimmed.startsWith('data:image/jpeg')) {
    return trimmed;
  }

  // Handle SVG data URI by rendering to canvas PNG
  if (trimmed.startsWith('data:image/svg+xml')) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 200;
          canvas.height = img.naturalHeight || 240;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = trimmed;
    });
  }

  // 1. Direct browser image loading via canvas (handles relative /api/uploads/..., CORS, and absolute URLs)
  const fromCanvas = await new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 200;
        canvas.height = img.naturalHeight || img.height || 200;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      } catch (err) {
        console.warn('Canvas export failed, falling back:', err);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = trimmed;
  });

  if (fromCanvas) return fromCanvas;

  // 2. Fallback via getBase64ImageFromUrl
  return getBase64ImageFromUrl(trimmed).catch(() => null);
};

let cachedCambriaRegular: string | null = null;
let cachedCambriaBold: string | null = null;

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return window.btoa(binary);
};

export const ensureCambriaFont = async (doc: jsPDF): Promise<string> => {
  try {
    if (!cachedCambriaRegular || !cachedCambriaBold) {
      const [regRes, boldRes] = await Promise.all([
        fetch('/fonts/cambria.ttf'),
        fetch('/fonts/cambria-bold.ttf'),
      ]);
      if (regRes.ok && boldRes.ok) {
        const [regBuf, boldBuf] = await Promise.all([
          regRes.arrayBuffer(),
          boldRes.arrayBuffer(),
        ]);
        cachedCambriaRegular = arrayBufferToBase64(regBuf);
        cachedCambriaBold = arrayBufferToBase64(boldBuf);
      }
    }
    if (cachedCambriaRegular && cachedCambriaBold) {
      if (!doc.existsFileInVFS('Cambria.ttf')) {
        doc.addFileToVFS('Cambria.ttf', cachedCambriaRegular);
        doc.addFont('Cambria.ttf', 'Cambria', 'normal');
      }
      if (!doc.existsFileInVFS('Cambria-Bold.ttf')) {
        doc.addFileToVFS('Cambria-Bold.ttf', cachedCambriaBold);
        doc.addFont('Cambria-Bold.ttf', 'Cambria', 'bold');
      }
      return 'Cambria';
    }
  } catch (err) {
    console.warn('Fallback font rapor:', err);
  }
  return 'Times';
};

interface RenderCoverRaporOptions {
  namaSiswa: string;
  nis: string;
  nisn: string;
  jenjangLine1: string;
  jenjangLine2: string;
  topLogoBase64: string | null;
  midLogoBase64: string | null;
  fontFamily?: string;
}

const renderOfficialCoverRaporPage = (doc: jsPDF, opts: RenderCoverRaporOptions) => {
  const pageWidth = 210;
  const font = opts.fontFamily || 'Cambria';

  // 1. Logo Daerah / Yayasan (Top Logo dari Logo Kiri Kop Surat)
  const topLogoW = 32;
  const topLogoH = 38;
  const topLogoX = (pageWidth - topLogoW) / 2;
  const topLogoY = 24;

  if (opts.topLogoBase64) {
    try {
      doc.addImage(opts.topLogoBase64, 'PNG', topLogoX, topLogoY, topLogoW, topLogoH);
    } catch (e) {
      console.warn('Failed rendering top logo on cover:', e);
    }
  }

  // 2. Jenjang Title (e.g. SEKOLAH MENENGAH KEJURUAN / (SMK)) - Cambria 16 Bold
  doc.setFont(font, 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(opts.jenjangLine1, pageWidth / 2, 72, { align: 'center' });
  doc.text(opts.jenjangLine2, pageWidth / 2, 80, { align: 'center' });

  // 3. Logo Sekolah (Middle Logo dari Logo Kanan Kop Surat)
  const midLogoW = 46;
  const midLogoH = 46;
  const midLogoX = (pageWidth - midLogoW) / 2;
  const midLogoY = 96;

  if (opts.midLogoBase64) {
    try {
      doc.addImage(opts.midLogoBase64, 'PNG', midLogoX, midLogoY, midLogoW, midLogoH);
    } catch {
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.6);
      doc.circle(pageWidth / 2, midLogoY + 23, 22);
      doc.setFont(font, 'normal');
      doc.setFontSize(9);
      doc.text('LOGO', pageWidth / 2, midLogoY + 21, { align: 'center' });
      doc.text('SEKOLAH', pageWidth / 2, midLogoY + 27, { align: 'center' });
    }
  } else {
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.6);
    doc.circle(pageWidth / 2, midLogoY + 23, 22);
    doc.setFont(font, 'normal');
    doc.setFontSize(9);
    doc.text('LOGO', pageWidth / 2, midLogoY + 21, { align: 'center' });
    doc.text('SEKOLAH', pageWidth / 2, midLogoY + 27, { align: 'center' });
  }

  // 4. Kotak Identitas Siswa - Cambria 14 & 16 Bold
  const boxW = 145;
  const boxH = 14;
  const boxX = (pageWidth - boxW) / 2;

  // Nama Peserta Didik
  doc.setFont(font, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Nama Peserta Didik :', pageWidth / 2, 163, { align: 'center' });

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.rect(boxX, 168, boxW, boxH);

  doc.setFont(font, 'bold');
  doc.setFontSize(16);
  doc.text(opts.namaSiswa, pageWidth / 2, 168 + 9.2, { align: 'center', maxWidth: boxW - 8 });

  // NIS / NISN
  doc.setFont(font, 'bold');
  doc.setFontSize(14);
  doc.text('NIS / NISN :', pageWidth / 2, 194, { align: 'center' });

  doc.rect(boxX, 199, boxW, boxH);

  doc.setFont(font, 'bold');
  doc.setFontSize(16);
  doc.text(`${opts.nis} / ${opts.nisn}`, pageWidth / 2, 199 + 9.2, { align: 'center' });

  // 5. Footer Kementerian - Ukuran sama dengan Nama SMK (Cambria 16 Bold)
  doc.setFont(font, 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI', pageWidth / 2, 258, { align: 'center' });
  doc.text('REPUBLIK INDONESIA', pageWidth / 2, 266, { align: 'center' });
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

  const [raporRes, siswaRes, sekolahRes, tenantRes] = await Promise.allSettled([
    raporApi.getRaporDetail({ siswa_id: siswaId, tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }),
    siswaApi.getById(siswaId),
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null),
  ]);

  const raporRaw = raporRes.status === 'fulfilled' ? (raporRes.value?.data || raporRes.value) : null;
  const siswaDirect = siswaRes.status === 'fulfilled' ? (siswaRes.value?.data || siswaRes.value) : null;
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;

  const currentUser = useAuthStore.getState().user;
  const tenantId = (siswaDirect as any)?.tenant_id || currentUser?.tenant_id;

  let tenantData = tenantRes.status === 'fulfilled' ? ((tenantRes.value as any)?.data || tenantRes.value) : null;
  if ((!tenantData?.logo_url && !tenantData?.logo_daerah_url) && tenantId) {
    try {
      const resById = await getTenantById(tenantId);
      if (resById?.data) {
        tenantData = { ...(tenantData || {}), ...resById.data };
      }
    } catch {}
  }

  const tenantInfo = {
    ...((currentUser as any)?.tenant || {}),
    ...(tenantData || {}),
  };

  const siswa = {
    ...(siswaDirect || {}),
    ...(raporRaw?.siswa || {}),
  };

  const tingkatNum = Number(siswa.tingkat || 10);
  const jenjangRaw = String(sekolah?.jenjang || tenantInfo?.jenjang || siswa?.jenjang || '').toUpperCase();
  let jenjangLine1 = 'SEKOLAH MENENGAH KEJURUAN';
  let jenjangLine2 = '(SMK)';
  if (jenjangRaw.includes('SD') || jenjangRaw.includes('MI') || (tingkatNum >= 1 && tingkatNum <= 6)) {
    jenjangLine1 = 'SEKOLAH DASAR';
    jenjangLine2 = '(SD)';
  } else if (jenjangRaw.includes('SMP') || jenjangRaw.includes('MTS') || (tingkatNum >= 7 && tingkatNum <= 9)) {
    jenjangLine1 = 'SEKOLAH MENENGAH PERTAMA';
    jenjangLine2 = '(SMP)';
  } else if (jenjangRaw.includes('SMA') || jenjangRaw.includes('MA')) {
    jenjangLine1 = 'SEKOLAH MENENGAH ATAS';
    jenjangLine2 = '(SMA)';
  }

  const logoDaerahUrl = tenantInfo?.logo_daerah_url || (sekolah as any)?.logo_daerah_url || (sekolah as any)?.logo_daerah || DEFAULT_JABAR_LOGO_SVG;
  const logoSekolahUrl = tenantInfo?.logo_url || sekolah?.logo_url || null;

  const [topLogoBase64, midLogoBase64] = await Promise.all([
    resolveCoverImageBase64(logoDaerahUrl),
    resolveCoverImageBase64(logoSekolahUrl),
  ]);

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const fontFamily = await ensureCambriaFont(doc);

  const namaSiswa = (siswa.nama_siswa || siswa.nama || siswaDirect?.nama_siswa || siswaDirect?.nama || '-').toUpperCase();
  const nis = siswa.nis || siswaDirect?.nis || '-';
  const nisn = siswa.nisn || siswaDirect?.nisn || '-';

  renderOfficialCoverRaporPage(doc, {
    namaSiswa,
    nis,
    nisn,
    jenjangLine1,
    jenjangLine2,
    topLogoBase64,
    midLogoBase64,
    fontFamily,
  });

  const filename = `Cover_Rapor_${namaSiswa.replace(/\s+/g, '_')}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

/**
 * 📋 2. Generate Biodata Siswa 17 Butir PDF (Client-side jsPDF)
 */
export const generateBiodataSiswaPdf = async (options: {
  siswaId: string;
  tahunPelajaranId?: string;
  semesterId?: string;
}): Promise<{ blobUrl: string; filename: string }> => {
  const { siswaId, tahunPelajaranId = '', semesterId = '' } = options;

  const [raporRes, siswaRes, sekolahRes, tenantRes] = await Promise.allSettled([
    raporApi.getRaporDetail({ siswa_id: siswaId, tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }),
    siswaApi.getById(siswaId),
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null),
  ]);

  const raporRaw = raporRes.status === 'fulfilled' ? (raporRes.value?.data || raporRes.value) : null;
  const siswaDirect = siswaRes.status === 'fulfilled' ? (siswaRes.value?.data || siswaRes.value) : null;
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;

  const currentUser = useAuthStore.getState().user;
  const tenantId = (siswaDirect as any)?.tenant_id || currentUser?.tenant_id;

  let tenantData = tenantRes.status === 'fulfilled' ? ((tenantRes.value as any)?.data || tenantRes.value) : null;
  if ((!tenantData?.logo_url && !tenantData?.logo_daerah_url) && tenantId) {
    try {
      const resById = await getTenantById(tenantId);
      if (resById?.data) {
        tenantData = { ...(tenantData || {}), ...resById.data };
      }
    } catch {}
  }

  const tenantInfo = {
    ...((currentUser as any)?.tenant || {}),
    ...(tenantData || {}),
  };

  const siswa = {
    ...(siswaDirect || {}),
    ...(raporRaw?.siswa || {}),
  };
  const kota = sekolah?.kota || tenantInfo?.city || 'Purwakarta';

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const fontFamily = await ensureCambriaFont(doc);

  // ── HALAMAN 1: COVER / SAMPUL RESMI RAPOR (MERGER KE BIODATA) ──
  const tingkatNum = Number(siswa.tingkat || 10);
  const jenjangRaw = String(sekolah?.jenjang || tenantInfo?.jenjang || siswa?.jenjang || '').toUpperCase();
  let jenjangLine1 = 'SEKOLAH MENENGAH KEJURUAN';
  let jenjangLine2 = '(SMK)';
  if (jenjangRaw.includes('SD') || jenjangRaw.includes('MI') || (tingkatNum >= 1 && tingkatNum <= 6)) {
    jenjangLine1 = 'SEKOLAH DASAR';
    jenjangLine2 = '(SD)';
  } else if (jenjangRaw.includes('SMP') || jenjangRaw.includes('MTS') || (tingkatNum >= 7 && tingkatNum <= 9)) {
    jenjangLine1 = 'SEKOLAH MENENGAH PERTAMA';
    jenjangLine2 = '(SMP)';
  } else if (jenjangRaw.includes('SMA') || jenjangRaw.includes('MA')) {
    jenjangLine1 = 'SEKOLAH MENENGAH ATAS';
    jenjangLine2 = '(SMA)';
  }

  const logoDaerahUrl = tenantInfo?.logo_daerah_url || (sekolah as any)?.logo_daerah_url || (sekolah as any)?.logo_daerah || DEFAULT_JABAR_LOGO_SVG;
  const logoSekolahUrl = tenantInfo?.logo_url || sekolah?.logo_url || null;

  const [topLogoBase64, midLogoBase64] = await Promise.all([
    resolveCoverImageBase64(logoDaerahUrl),
    resolveCoverImageBase64(logoSekolahUrl),
  ]);

  const namaSiswa = (siswa.nama_siswa || siswa.nama || siswaDirect?.nama_siswa || siswaDirect?.nama || '-').toUpperCase();
  const nis = siswa.nis || siswaDirect?.nis || '-';
  const nisn = siswa.nisn || siswaDirect?.nisn || '-';

  renderOfficialCoverRaporPage(doc, {
    namaSiswa,
    nis,
    nisn,
    jenjangLine1,
    jenjangLine2,
    topLogoBase64,
    midLogoBase64,
    fontFamily,
  });

  // ── HALAMAN 2: BIODATA SISWA 17 BUTIR RESMI ──
  doc.addPage();
  const pageWidth = 210;

  // Header Title - Cambria 16 Bold
  let currentY = 15;
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('KETERANGAN TENTANG DIRI PESERTA DIDIK', pageWidth / 2, currentY, { align: 'center' });

  const formatAlamatDuaBaris = (
    rawAlamat?: string,
    dusun?: string,
    rt?: string,
    rw?: string,
    kelurahan?: string,
    kecamatan?: string,
    kabupaten?: string
  ): string => {
    if (rawAlamat && (/kec\b|kecamatan\b/i.test(rawAlamat) || /kab\b|kabupaten\b/i.test(rawAlamat))) {
      const splitMatch = rawAlamat.split(/(?=\b(?:Kec|Kecamatan)\b)/i);
      if (splitMatch.length >= 2) {
        return `${splitMatch[0].trim()}\n${splitMatch.slice(1).join('').trim()}`;
      }
    }
    const p1 = [
      rawAlamat || '',
      dusun ? `Dusun ${dusun}` : '',
      (rt || rw) ? `RT ${rt || '01'} RW ${rw || '01'}` : '',
      kelurahan ? `Desa ${kelurahan}` : '',
    ].filter(Boolean).map(s => s.trim()).filter(Boolean);

    const p2 = [
      kecamatan ? `Kecamatan ${kecamatan.replace(/^kec(amatan)?\.?\s*/i, '')}` : '',
      kabupaten ? `Kabupaten ${kabupaten.replace(/^kab(upaten)?\.?\s*/i, '')}` : '',
    ].filter(Boolean).map(s => s.trim()).filter(Boolean);

    let l1 = p1.join(' ');
    let l2 = p2.join(' ');
    if (l1 && l2) return `${l1}\n${l2}`;
    const comb = l1 || l2 || '-';
    if (comb.length > 40 && comb.includes(' ')) {
      const words = comb.split(' ');
      const half = Math.ceil(words.length / 2);
      return `${words.slice(0, half).join(' ')}\n${words.slice(half).join(' ')}`;
    }
    return comb;
  };

  const formatAnakKe = (val: any): string => {
    if (!val) return '-';
    const num = parseInt(String(val), 10);
    const words = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh'];
    if (!isNaN(num) && num >= 1 && num <= 10) {
      return `${num} (${words[num]})`;
    }
    return String(val);
  };

  const alamatSiswaDuaBaris = formatAlamatDuaBaris(
    siswa.alamat,
    siswa.dusun,
    siswa.rt,
    siswa.rw,
    siswa.kelurahan,
    siswa.kecamatan,
    siswa.kabupaten
  );

  const alamatOrtuDuaBaris = formatAlamatDuaBaris(
    siswa.alamat_ortu || siswa.alamat,
    siswa.dusun_ortu || siswa.dusun,
    siswa.rt_ortu || siswa.rt,
    siswa.rw_ortu || siswa.rw,
    siswa.kelurahan_ortu || siswa.kelurahan,
    siswa.kecamatan_ortu || siswa.kecamatan,
    siswa.kabupaten_ortu || siswa.kabupaten
  );

  const jk = (siswa.jenis_kelamin || '').toUpperCase().startsWith('L') ? 'Laki-Laki' : 'Perempuan';
  const ttl = `${siswa.tempat_lahir || '-'} , ${formatIndoDate(siswa.tanggal_lahir)}`;
  const tglMasuk = formatIndoDate(siswa.tanggal_masuk);

  const tableBody: Array<[string, string, string, string]> = [
    ['1.', 'Nama Peserta Didik Lengkap', ':', (siswa.nama_siswa || '-').toUpperCase()],
    ['2.', 'Nomor Induk Siswa / NISN', ':', `${siswa.nis || '-'} / ${siswa.nisn || '-'}`],
    ['3.', 'Tempat Tanggal Lahir', ':', ttl],
    ['4.', 'Jenis Kelamin', ':', jk],
    ['5.', 'Agama / Kepercayaan', ':', siswa.agama || '-'],
    ['6.', 'Status dalam Keluarga', ':', siswa.status_dalam_keluarga || 'Anak Kandung'],
    ['7.', 'Anak ke', ':', formatAnakKe(siswa.anak_ke)],
    ['8.', 'Alamat Peserta Didik', ':', alamatSiswaDuaBaris],
    ['9.', 'Nomor Telepon Rumah', ':', siswa.no_telepon || '-'],
    ['10.', 'Sekolah Asal', ':', siswa.sekolah_asal || '-'],
    ['11.', 'Diterima di sekolah ini', '', ''],
    ['', 'Di kelas', ':', siswa.kelas || '-'],
    ['', 'Pada tanggal', ':', tglMasuk],
    ['12.', 'Nama Orang Tua', '', ''],
    ['', 'a. Ayah', ':', siswa.nama_ayah || '-'],
    ['', 'b. Ibu', ':', siswa.nama_ibu || '-'],
    ['13.', 'Alamat Orang Tua', ':', alamatOrtuDuaBaris],
    ['', 'Nomor Telepon Rumah', ':', siswa.no_telepon_ortu || '-'],
    ['14.', 'Pekerjaan Orang Tua', '', ''],
    ['', 'a. Ayah', ':', siswa.pekerjaan_ayah || '-'],
    ['', 'b. Ibu', ':', siswa.pekerjaan_ibu || '-'],
    ['15.', 'Nama Wali Peserta Didik', ':', siswa.nama_wali || '-'],
    ['16.', 'Alamat Wali Peserta Didik', ':', siswa.alamat_wali || '-'],
    ['', 'Nomor Telepon Rumah', ':', siswa.no_telepon_wali || '-'],
    ['17.', 'Pekerjaan Wali Peserta Didik', ':', siswa.pekerjaan_wali || '-'],
  ];

  autoTable(doc, {
    startY: currentY + 5,
    margin: { left: 16, right: 16, bottom: 5 },
    body: tableBody,
    theme: 'plain',
    styles: {
      font: fontFamily,
      fontSize: 12,
      cellPadding: { top: 1.8, bottom: 1.8, left: 0.8, right: 0.8 },
      textColor: [0, 0, 0],
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'left' },
      1: { cellWidth: 69, halign: 'left' },
      2: { cellWidth: 4, halign: 'center' },
      3: { cellWidth: 97, halign: 'left' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 0 && data.column.index === 3) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 240;
  const photoY = Math.min(finalY + 4, 252);

  // Kotak Pas Foto 3x4 (Centered in left half, matching Gambar 2)
  const photoX = 62;
  const photoW = 28;
  const photoH = 36;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(photoX, photoY, photoW, photoH);
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Pas Foto', photoX + photoW / 2, photoY + 16, { align: 'center' });
  doc.text('3x4', photoX + photoW / 2, photoY + 22, { align: 'center' });

  // Tanda Tangan Kepala Sekolah (Right, matching Gambar 2)
  const rightX = 125;
  const kepalaSekolahNama = sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'WAHYU TAMIMBARKAH, S.Pd.';
  const kepalaSekolahNip = sekolah?.nip_kepala_sekolah || tenantInfo?.nip_kepala_sekolah || '197111022008011001';
  const titimangsa = `${kota}, ${formatIndoDate(new Date())}`;

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(titimangsa, rightX, photoY + 5);
  doc.text('Kepala Sekolah', rightX, photoY + 10);

  // Nama Kepala Sekolah (Bold with Underline)
  doc.setFont(fontFamily, 'bold');
  doc.text(kepalaSekolahNama, rightX, photoY + 30);
  const kepsekWidth = doc.getTextWidth(kepalaSekolahNama);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.line(rightX, photoY + 30.8, rightX + kepsekWidth, photoY + 30.8);

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(9.5);
  doc.text(`NIP. ${kepalaSekolahNip}`, rightX, photoY + 35);

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
  const { kelasId, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '', kelasNama } = options;

  const [legerRes, sekolahRes, tenantRes, settingsRes, kelasRes] = await Promise.allSettled([
    raporApi.getLeger({ kelas_id: kelasId, tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }),
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null),
    raporApi.getRaporSettings().catch(() => null),
    kelasId ? getKelasDetail(kelasId).catch(() => null) : Promise.resolve(null),
  ]);

  const legerData = legerRes.status === 'fulfilled' ? (legerRes.value?.data || legerRes.value) : null;
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? ((tenantRes.value as any)?.data || tenantRes.value) : null;
  const settingsData = settingsRes.status === 'fulfilled' ? (settingsRes.value?.data || settingsRes.value) : null;
  const kelasDetailData = kelasRes.status === 'fulfilled' ? (kelasRes.value as any) : null;

  if (!legerData) {
    throw new Error('Gagal memuat data buku leger dari server.');
  }

  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
  const pageWidth = 297;
  const namaSekolah = sekolah?.nama || tenantInfo?.name || 'SMKN 1 PLERED';
  const effectiveKota = sekolah?.kota || tenantInfo?.city || 'Purwakarta';
  const tpText = tahunPelajaranNama || legerData?.tahun_pelajaran?.tahun || '2025 / 2026';
  const semText = semesterNama || legerData?.semester?.nama_semester || 'Ganjil';

  // Smart Academic Class Resolution (Prioritize actual class name from DB/Leger/API over generic 'Kelas')
  const rawOption = (kelasNama && kelasNama.trim().toLowerCase() !== 'kelas') ? kelasNama.trim() : '';
  const rawLeger = (legerData?.kelas?.nama_kelas && legerData.kelas.nama_kelas.trim().toLowerCase() !== 'kelas') ? legerData.kelas.nama_kelas.trim() : '';
  const rawApi = (kelasDetailData?.nama_kelas || kelasDetailData?.data?.nama_kelas) ? (kelasDetailData?.nama_kelas || kelasDetailData?.data?.nama_kelas).trim() : '';
  const rawStudent = (legerData?.students?.[0]?.kelas && legerData.students[0].kelas.trim().toLowerCase() !== 'kelas') ? legerData.students[0].kelas.trim() : '';
  const klsText = rawOption || rawLeger || rawApi || rawStudent || 'X TE 3';

  // Smart Academic Fallback for titimangsa date
  const isGenap = Boolean(semText.toLowerCase().includes('genap') || semText.includes('2'));
  let effectiveDateVal = settingsData?.tanggal_rapor;
  if (!effectiveDateVal) {
    const matchYear = String(tpText || '').match(/^(\d{4})/);
    const parsedStartYear = matchYear ? parseInt(matchYear[1], 10) : 2025;
    effectiveDateVal = isGenap ? `${parsedStartYear + 1}-06-24` : `${parsedStartYear}-12-22`;
  }
  const dateParts = String(effectiveDateVal).split('-');
  let dateStr = '';
  if (dateParts.length === 3) {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    dateStr = `${parseInt(dateParts[2], 10)} ${months[parseInt(dateParts[1], 10) - 1]} ${dateParts[0]}`;
  } else {
    dateStr = formatIndoDate(new Date());
  }

  // Header Title (Landscape, exactly matching official school format)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(17, 24, 39);
  doc.text(`LEGER SEMESTER ${semText.toUpperCase()}`, pageWidth / 2, 7.5, { align: 'center' });
  doc.text(namaSekolah.toUpperCase(), pageWidth / 2, 11, { align: 'center' });
  doc.setFontSize(9.5);
  doc.text(`TAHUN PELAJARAN ${tpText.toUpperCase()}`, pageWidth / 2, 14.5, { align: 'center' });

  const mapelList: any[] = legerData.mapel_list || [];
  const students: any[] = legerData.students || [];

  // Dynamic column width calculation for perfect horizontal centering on A4 Landscape (297 mm)
  const numMapels = mapelList.length || 1;
  const targetTotalWidth = 281; // gives equal 8 mm margins on left and right
  const fixedColsWidth = 85.5;  // NO(6) + KELAS(12) + SEMESTER(13) + SAKIT(6.5) + IZIN(6.5) + TANPA(8) + JML(12) + RATA(12) + RANK(9.5)
  const remainingForFlex = targetTotalWidth - fixedColsWidth; // 195.5 mm

  // Dynamically allocate width per mapel (fills space proportionately)
  const mapelWidth = Number(Math.min(9.5, Math.max(6.0, 104 / numMapels)).toFixed(1));
  const totalMapelWidth = mapelWidth * numMapels;

  // Remaining for NAMA and 2 EKSKUL columns
  const remainingForNamesAndEskul = remainingForFlex - totalMapelWidth;
  const namaWidth = Math.max(42, Math.round(remainingForNamesAndEskul * 0.50));
  const ekskulWidth = Number(((remainingForNamesAndEskul - namaWidth) / 2).toFixed(1));

  const actualTotalWidth = fixedColsWidth + totalMapelWidth + namaWidth + (ekskulWidth * 2);
  const tableMarginLeft = Math.max(6, Number(((pageWidth - actualTotalWidth) / 2).toFixed(1)));

  // Top Right Orange Badge (aligned with table right edge)
  const badgeWidth = 42;
  const badgeX = tableMarginLeft + actualTotalWidth - badgeWidth;
  doc.setFillColor(249, 115, 22); // vibrant orange #f97316
  doc.roundedRect(badgeX, 5.5, badgeWidth, 9.5, 1.2, 1.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(klsText.toUpperCase(), badgeX + (badgeWidth / 2), 12, { align: 'center' });

  // Helper mapel abbreviation
  const getShortMapelName = (name: string, code?: string): string => {
    if (code && code.trim() && code !== 'N/A' && code.length <= 14) return code.trim();
    const n = (name || '').trim().toLowerCase();
    if (n.includes('agama') || n.includes('budi pekerti') || n.includes('pai')) return 'PAI';
    if (n.includes('pancasila') || n.includes('ppkn') || n.includes('pkn')) return 'PKN';
    if (n.includes('indonesia')) return 'B. INDONESIA';
    if (n.includes('jasmani') || n.includes('olahraga') || n.includes('pjok')) return 'PJOK';
    if (n.includes('sejarah')) return 'SEJARAH';
    if (n.includes('seni') || n.includes('budaya')) return 'SENI BUDAYA';
    if (n.includes('sunda')) return 'B. SUNDA';
    if (n.includes('matematika') || n === 'mtk') return 'MTK';
    if (n.includes('inggris')) return 'B. INGGRIS';
    if (n.includes('informatika')) return 'INFORMATIKA';
    if (n.includes('ipas') || n.includes('projek ipas')) return 'PROJEK IPAS';
    if (n.includes('ddpk') || n.includes('dasar-dasar program keahlian') || n.includes('dasar program keahlian')) return 'DDPK';
    if (n.includes('koding') || n.includes('coding') || n.includes('pemrograman')) return 'KODING';
    if (n.includes('pkk') || n.includes('kreatif')) return 'PKK';
    if (n.includes('konsentrasi') || n.includes('kk')) return 'KONSENTRASI';
    if (n.includes('pkl')) return 'PKL';
    return name.length > 15 ? name.substring(0, 14).toUpperCase() : name.toUpperCase();
  };

  const mapelPalette: Array<[number, number, number]> = [
    [245, 158, 11],  // PAI (amber/orange)
    [21, 128, 61],   // PKN (green)
    [37, 99, 235],   // B. INDONESIA (blue)
    [147, 51, 234],  // PJOK (purple)
    [30, 58, 138],   // SEJARAH (navy)
    [217, 119, 6],   // SENI BUDAYA (amber)
    [101, 163, 13],  // B. SUNDA (olive)
    [234, 88, 12],   // MTK (coral)
    [249, 115, 22],  // B. INGGRIS (orange)
    [2, 132, 199],   // INFORMATIKA (sky)
    [13, 148, 136],  // PROJEK IPAS (teal)
    [59, 130, 246],  // DDPK (blue)
    [51, 65, 85],    // KODING (slate)
    [168, 85, 247],  // extra (purple)
    [20, 184, 166],  // extra (teal)
    [239, 68, 68],   // extra (red)
  ];

  const getSoftTint = (rgb: [number, number, number]): [number, number, number] => {
    return [
      Math.round(rgb[0] + (255 - rgb[0]) * 0.90),
      Math.round(rgb[1] + (255 - rgb[1]) * 0.90),
      Math.round(rgb[2] + (255 - rgb[2]) * 0.90),
    ];
  };

  // Header construction (Single tall row with vertical mapel text)
  const verticalHeadersMap: Record<number, { text: string; lines?: string[]; color: [number, number, number] }> = {};
  const headerRow: any[] = [
    { content: 'NO', styles: { fillColor: [136, 19, 55], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
    { content: 'NAMA', styles: { fillColor: [136, 19, 55], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
    { content: 'KELAS', styles: { fillColor: [136, 19, 55], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
    { content: 'SEMESTER', styles: { fillColor: [136, 19, 55], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
  ];

  let currentColIdx = 4;
  mapelList.forEach((m, idx) => {
    const color = mapelPalette[idx % mapelPalette.length];
    const shortName = getShortMapelName(m.nama_mapel, m.kode_mapel);
    verticalHeadersMap[currentColIdx] = { text: shortName, color: [255, 255, 255] };
    headerRow.push({
      content: '',
      styles: { fillColor: color },
    });
    currentColIdx++;
  });

  // Ekstrakurikuler columns
  headerRow.push(
    { content: 'EKSKUL-1', styles: { fillColor: [55, 65, 81], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 6.2 } },
    { content: 'EKSKUL-2', styles: { fillColor: [55, 65, 81], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 6.2 } }
  );
  currentColIdx += 2;

  // Presensi columns (vertical text)
  verticalHeadersMap[currentColIdx] = { text: 'SAKIT', color: [255, 255, 255] };
  headerRow.push({ content: '', styles: { fillColor: [55, 65, 81] } });
  currentColIdx++;

  verticalHeadersMap[currentColIdx] = { text: 'IZIN', color: [255, 255, 255] };
  headerRow.push({ content: '', styles: { fillColor: [55, 65, 81] } });
  currentColIdx++;

  verticalHeadersMap[currentColIdx] = { text: 'TANPA KETERANGAN', lines: ['TANPA', 'KETERANGAN'], color: [255, 255, 255] };
  headerRow.push({ content: '', styles: { fillColor: [55, 65, 81] } });
  currentColIdx++;

  // Summary columns (vertical text, orange background)
  verticalHeadersMap[currentColIdx] = { text: 'JUMLAH', color: [255, 255, 255] };
  headerRow.push({ content: '', styles: { fillColor: [245, 158, 11] } });
  currentColIdx++;

  verticalHeadersMap[currentColIdx] = { text: 'RATA-RATA', color: [255, 255, 255] };
  headerRow.push({ content: '', styles: { fillColor: [245, 158, 11] } });
  currentColIdx++;

  verticalHeadersMap[currentColIdx] = { text: 'RANKING', color: [255, 255, 255] };
  headerRow.push({ content: '', styles: { fillColor: [245, 158, 11] } });
  currentColIdx++;

  // Body Rows Construction
  const numStudents = students.length || 1;
  const bodyRows = students.map((s, idx) => {
    const mapelScores = mapelList.map((m, mIdx) => {
      const score = s.grades?.[m.id];
      const val = typeof score === 'number' && score > 0 ? score : '-';
      const colColor = mapelPalette[mIdx % mapelPalette.length];
      return {
        content: val,
        styles: { fillColor: getSoftTint(colColor), halign: 'center' },
      };
    });

    const rankVal = s.rank || idx + 1;
    let rankBg: [number, number, number] = [254, 240, 138]; // yellow
    if (rankVal <= 10) {
      rankBg = [187, 247, 208]; // soft green
    } else if (rankVal > Math.floor(numStudents * 0.7)) {
      rankBg = [254, 202, 202]; // soft pink/red
    }

    return [
      idx + 1,
      s.nama_siswa || '-',
      klsText,
      semText,
      ...mapelScores,
      s.ekskul_1 || '',
      s.ekskul_2 || '',
      s.sakit > 0 ? s.sakit : '-',
      s.izin > 0 ? s.izin : '-',
      s.alpa > 0 ? s.alpa : '-',
      { content: s.total ?? 0, styles: { fillColor: [254, 249, 195], fontStyle: 'bold', halign: 'center' } },
      { content: s.rata_rata ? Math.round(s.rata_rata) : 0, styles: { fillColor: [254, 215, 170], fontStyle: 'bold', halign: 'center' } },
      { content: rankVal, styles: { fillColor: rankBg, fontStyle: 'bold', halign: 'center' } },
    ];
  });

  const columnStyles: Record<number, any> = {
    0: { cellWidth: 6, halign: 'center' },
    1: { cellWidth: namaWidth, halign: 'left' },
    2: { cellWidth: 12, halign: 'center' },
    3: { cellWidth: 13, halign: 'center' },
  };

  let cIdx = 4;
  mapelList.forEach(() => {
    columnStyles[cIdx] = { cellWidth: mapelWidth, halign: 'center' };
    cIdx++;
  });

  columnStyles[cIdx] = { cellWidth: ekskulWidth, halign: 'center', fontSize: 5.5 }; // EKSKUL-1
  cIdx++;
  columnStyles[cIdx] = { cellWidth: ekskulWidth, halign: 'center', fontSize: 5.5 }; // EKSKUL-2
  cIdx++;
  columnStyles[cIdx] = { cellWidth: 6.5, halign: 'center' }; // SAKIT
  cIdx++;
  columnStyles[cIdx] = { cellWidth: 6.5, halign: 'center' }; // IZIN
  cIdx++;
  columnStyles[cIdx] = { cellWidth: 8, halign: 'center' }; // TANPA KET
  cIdx++;
  columnStyles[cIdx] = { cellWidth: 12, halign: 'center' }; // JUMLAH
  cIdx++;
  columnStyles[cIdx] = { cellWidth: 12, halign: 'center' }; // RATA-RATA
  cIdx++;
  columnStyles[cIdx] = { cellWidth: 9.5, halign: 'center' }; // RANKING

  // Strict Single-Page Row Heights
  const isLargeClass = numStudents > 40;
  const bodyFontSize = isLargeClass ? 5.7 : (numStudents > 30 ? 6.0 : 6.3);
  const cellPadY = isLargeClass ? 0.22 : 0.32;
  const rowMinHeight = isLargeClass ? 2.45 : (numStudents > 30 ? 2.65 : 2.85);
  const headHeight = isLargeClass ? 18 : 19.5;

  autoTable(doc, {
    startY: 16.5,
    margin: { left: tableMarginLeft, right: tableMarginLeft, top: 4, bottom: 4 },
    pageBreak: 'avoid',
    head: [headerRow],
    body: bodyRows,
    theme: 'grid',
    styles: {
      font: 'Helvetica',
      fontSize: bodyFontSize,
      cellPadding: { top: cellPadY, bottom: cellPadY, left: 0.3, right: 0.3 },
      textColor: [17, 24, 39],
      lineColor: [75, 85, 99],
      lineWidth: 0.15,
      valign: 'middle',
      minCellHeight: rowMinHeight,
    },
    headStyles: {
      valign: 'middle',
      minCellHeight: headHeight,
      lineColor: [55, 65, 81],
      lineWidth: 0.15,
    },
    columnStyles,
    didDrawCell: (data) => {
      if (data.section === 'head' && data.row.index === 0) {
        const vMeta = verticalHeadersMap[data.column.index];
        if (vMeta) {
          const cell = data.cell;
          doc.saveGraphicsState();
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(5.8);
          doc.setTextColor(vMeta.color[0], vMeta.color[1], vMeta.color[2]);

          const lines = vMeta.lines || [vMeta.text];
          if (lines.length > 1) {
            const lineSpacing = 2.6;
            const startX = cell.x + (cell.width - (lines.length - 1) * lineSpacing) / 2 + 0.3;
            const textY = cell.y + cell.height - 1.8;
            lines.forEach((lineText, lIdx) => {
              doc.text(lineText, startX + lIdx * lineSpacing, textY, { angle: 90 });
            });
          } else {
            const textX = cell.x + (cell.width / 2) + 1.0;
            const textY = cell.y + cell.height - 1.8;
            doc.text(lines[0], textX, textY, { angle: 90 });
          }
          doc.restoreGraphicsState();
        }
      }
    },
  });

  // Guarantee strictly 1 page
  while (doc.getNumberOfPages() > 1) {
    doc.deletePage(2);
  }

  // Signatures Block (Landscape, strictly fits bottom of page 1, aligned with table width)
  const finalY = (doc as any).lastAutoTable?.finalY || 160;
  const signStartY = Math.max(finalY + 3.5, 163);

  const leftSignX = tableMarginLeft + 6;
  const rightSignX = tableMarginLeft + actualTotalWidth - 68;
  const kepalaSekolahNama = sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'WAHYU TAMIMBARKAH, S.Pd.';
  const kepalaSekolahNip = sekolah?.nip_kepala_sekolah || tenantInfo?.nip_kepala_sekolah || '197111022008011001';
  const walasNama = legerData?.walas?.nama || 'YULI ANISA FATRIA, S.Pd.';
  const walasNip = legerData?.walas?.nip || '197712182022212008';

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);

  // Left Signatory (Kepsek)
  doc.text('Mengetahui,', leftSignX, signStartY);
  doc.text(`Kepala ${namaSekolah}`, leftSignX, signStartY + 3.8);

  // Right Signatory (Wali Kelas) - Left aligned in right block
  doc.text(`${effectiveKota}, ${dateStr}`, rightSignX, signStartY);
  doc.text('Wali Kelas,', rightSignX, signStartY + 3.8);

  // Underlined Names
  const signYName = signStartY + 16.5;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.2);

  // Left name + underline
  doc.text(kepalaSekolahNama, leftSignX, signYName);
  const kepsekWidth = doc.getTextWidth(kepalaSekolahNama);
  doc.setLineWidth(0.25);
  doc.line(leftSignX, signYName + 0.6, leftSignX + kepsekWidth, signYName + 0.6);

  // Right name + underline
  doc.text(walasNama, rightSignX, signYName);
  const walasWidth = doc.getTextWidth(walasNama);
  doc.line(rightSignX, signYName + 0.6, rightSignX + walasWidth, signYName + 0.6);

  // NIPs
  const signYNip = signYName + 3.8;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.text(`NIP. ${kepalaSekolahNip}`, leftSignX, signYNip);
  doc.text(`NIP. ${walasNip}`, rightSignX, signYNip);

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
  const tenantInfo = tenantRes.status === 'fulfilled' ? ((tenantRes.value as any)?.data || tenantRes.value) : null;

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
  const tenantInfo = tenantRes.status === 'fulfilled' ? ((tenantRes.value as any)?.data || tenantRes.value) : null;

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

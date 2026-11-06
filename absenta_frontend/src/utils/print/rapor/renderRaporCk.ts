import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { raporApi } from '../../../api/rapor.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { getMyTenant } from '../../../api/tenants.api';
import {
  getMapelCanonicalPriority,
  PrintRaporBatchOptions,
  PrintRaporOptions,
  resolveCapaianKompetensi,
} from './raporShared';
import { resolveRaporKelompok } from './raporKelompok';
import {
  normalizeStudentIdentity,
  normalizeTeacherIdentity,
} from '../../academic/academicIdentityNormalizer';

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
  fontFamily: string = 'Helvetica'
): void => {
  const font = fontFamily || 'Helvetica';
  const rawSiswa = data?.siswa || {};
  const normalizedStudent = normalizeStudentIdentity(rawSiswa);

  const resolveNonDash = (...values: Array<string | undefined | null>): string => {
    for (const v of values) {
      if (v && v.trim() !== '' && v.trim() !== '-') return v.trim();
    }
    return '-';
  };

  const siswa = {
    ...rawSiswa,
    nama_siswa: normalizedStudent.nama,
    nis: normalizedStudent.nis,
    nisn: normalizedStudent.nisn,
    kelas: resolveNonDash(normalizedStudent.namaKelas, rawSiswa.kelas),
    bidang_keahlian: resolveNonDash(normalizedStudent.bidangKeahlian, rawSiswa.bidang_keahlian, tenantInfo?.bidang_keahlian, 'Teknologi Manufaktur dan Rekayasa'),
    program_keahlian: resolveNonDash(normalizedStudent.programKeahlian, rawSiswa.program_keahlian, tenantInfo?.program_keahlian, 'Teknik Elektronika'),
    konsentrasi_keahlian: resolveNonDash(normalizedStudent.konsentrasiKeahlian, normalizedStudent.namaJurusan, rawSiswa.konsentrasi_keahlian),
  };
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

  const matchYear = String(displayTahunPelajaran || '').match(/([12]\d{3})/);
  const startYear = matchYear ? parseInt(matchYear[1], 10) : 2025;
  const isLegacyEra = startYear < 2025;

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

    let formattedAlamat = (alamatSekolah || '-').trim();
    if (/(?:,\s*|\s+)(?=(?:Kab\.|Kabupaten|Kota\b))/i.test(formattedAlamat)) {
      formattedAlamat = formattedAlamat.replace(/(?:,\s*|\s+)(?=(?:Kab\.|Kabupaten|Kota\b))/i, (match) => {
        return match.includes(',') ? ',\n' : '\n';
      });
    }

    const alamatLines = startDoc.splitTextToSize(formattedAlamat, maxLeftValWidth);
    startDoc.text(alamatLines, leftColX + colValOffset, leftY);
    leftY += Math.max(alamatLines.length * 4.0, 4.2);

    // Left column: Vocational/Peminatan fields (Format legacy 2024/2025 ke belakang lebih sederhana tanpa bidang/program/konsentrasi)
    if (!isLegacyEra) {
      leftY += 3.5;
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
    }

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
  if (isLegacyEra) {
    // 1. Metadata Grid at Top (Format Legacy 2024/2025 ke belakang: 8 fields, no vocational fields)
    y = drawStudentMetadataGrid(doc, y);

    // 2. Horizontal Divider Line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(15, y - 2, 195, y - 2);
    y += 2.5;

    // 3. Centered Title: LAPORAN HASIL BELAJAR (Tanpa (RAPOR))
    doc.setFont(font, 'bold');
    doc.setFontSize(11.5);
    doc.text('LAPORAN HASIL BELAJAR', pageWidth / 2, y, { align: 'center' });
    y += 5.5;

    // Direct to Grade Table (Tanpa I. INTRA KURIKULER)
  } else {
    // ── PAGE 1 (MODERN ERA 2025+) ──
    doc.setFont(font, 'bold');
    doc.setFontSize(12);
    doc.text('LAPORAN HASIL BELAJAR', pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.text('(RAPOR)', pageWidth / 2, y, { align: 'center' });
    y += 8;

    y = drawStudentMetadataGrid(doc, y);

    doc.setFont(font, 'bold');
    doc.setFontSize(10);
    doc.text('I. INTRA KURIKULER', 15, y);
    y += 4;
  }

  // Categorized Grade Table
  const nilaiAkademik: any[] = data?.nilai_akademik || [];
  
  if (nilaiAkademik.length === 0) {
    doc.setFont(font, 'italic');
    doc.setFontSize(9);
    doc.text('Belum ada data mata pelajaran terdaftar pada semester ini.', pageWidth / 2, y + 4, { align: 'center' });
    y += 12;
  } else {
    // 1. Deduplicate by normalized mapel name (merging score if present in duplicate record)
    // Filter out inactive/hidden subjects per Pengaturan Rapor
    const dedupedMapelMap = new Map<string, any>();
    (nilaiAkademik ?? []).filter((n: any) => n.is_active !== false).forEach((n: any) => {
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

    const groupedMapel = new Map<string, any[]>();
    dedupedList.forEach((n: any) => {
      // SSOT: kelompok_mapel dari Pengaturan Rapor selalu diutamakan (identik dengan modal pratinjau)
      const groupCategory = resolveRaporKelompok(isLegacyEra, n.kelompok_mapel, n.mapel_name, jenjang === 'SMK');

      if (!groupedMapel.has(groupCategory)) {
        groupedMapel.set(groupCategory, []);
      }
      groupedMapel.get(groupCategory)!.push(n);
    });

    type Ck1RowSpec =
      | { kind: 'group'; title: string }
      | {
          kind: 'mapel';
          no: string;
          name: string;
          score: string;
          isMissing: boolean;
          capText: string;
          isCapFallback: boolean;
        };

    const rowSpecs: Ck1RowSpec[] = [];
    const standardOrder = isLegacyEra
      ? ['Kelompok Umum', 'Kelompok Kejuruan']
      : ['Mata Pelajaran Umum', 'Mata Pelajaran Kejuruan', 'Mata Pelajaran Pilihan', 'Muatan Lokal'];

    const activeGroups = standardOrder.filter((grp) => (groupedMapel.get(grp) || []).length > 0);
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

    activeGroups.forEach((groupCategory, groupIdx) => {
      const items = groupedMapel.get(groupCategory) || [];
      const letterPrefix = letters[groupIdx] ? `${letters[groupIdx]}. ` : '';

      items.sort((a, b) => {
        const uA = typeof a.urutan === 'number' && a.urutan > 0 ? a.urutan : 999;
        const uB = typeof b.urutan === 'number' && b.urutan > 0 ? b.urutan : 999;
        if (uA !== uB) return uA - uB;
        const pA = getMapelCanonicalPriority(a.mapel_name || '', groupCategory, jenjang, a.urutan);
        const pB = getMapelCanonicalPriority(b.mapel_name || '', groupCategory, jenjang, b.urutan);
        if (pA !== pB) return pA - pB;
        return (a.mapel_name || '').localeCompare(b.mapel_name || '');
      });

      rowSpecs.push({ kind: 'group', title: `${letterPrefix}${groupCategory}` });

      items.forEach((n: any, idx: number) => {
        const hasScore = (n.nilai_akhir && n.nilai_akhir > 0) || (n.nilai_components && n.nilai_components.length > 0);
        const score = hasScore ? n.nilai_akhir : '-';
        const { text: capText, isFallback: isCapFallback } = resolveCapaianKompetensi(n, score);
        rowSpecs.push({
          kind: 'mapel',
          no: String(idx + 1),
          name: n.mapel_name || '-',
          score: String(score),
          isMissing: !hasScore,
          capText,
          isCapFallback,
        });
      });
    });

    // ── CK1 WAJIB 1 HALAMAN: Auto-fit skala tipografi tabel ──
    // Tinggi tabel diestimasi memakai metrik font jsPDF yang identik dengan autoTable,
    // lalu skala (font, padding, tinggi minimum baris) diperkecil via binary search
    // sampai seluruh tabel muat di sisa halaman 1, seberapa panjang pun teks CP-nya.
    const CK1_PAGE_HEIGHT = 297;
    const CK1_BOTTOM_MARGIN = 10;
    const CK1_HEAD_HEIGHT = 8;
    const COL_WIDTHS = [10, 56, 16, 98];
    const H_PAD = 2.5;
    const availableHeight = CK1_PAGE_HEIGHT - CK1_BOTTOM_MARGIN - y;
    const scaleFactorK = (doc as any).internal.scaleFactor as number;
    const lineHeightFactor = typeof (doc as any).getLineHeightFactor === 'function' ? doc.getLineHeightFactor() : 1.15;
    const lineH = (fs: number) => (fs * lineHeightFactor) / scaleFactorK;
    const countLines = (text: string, fs: number, style: string, width: number) => {
      doc.setFont(font, style);
      doc.setFontSize(fs);
      return Math.max(1, (doc.splitTextToSize(text || '', width) as string[]).length);
    };

    const headLabels = ['No', 'Mata Pelajaran', isLegacyEra ? 'Nilai Akhir' : 'Nilai', 'Capaian Kompetensi'];
    const defaultPad = 5 / scaleFactorK; // default cellPadding autoTable (mm)
    const headHeight = Math.max(
      CK1_HEAD_HEIGHT,
      ...headLabels.map(
        (lbl, i) => countLines(lbl, 8.5, 'bold', COL_WIDTHS[i] - defaultPad * 2) * lineH(8.5) + defaultPad * 2
      )
    );

    const estimateTableHeight = (s: number): number => {
      let total = headHeight;
      const groupFs = 8.5 * s;
      const bodyFs = 7.8 * s;
      const vPadGroup = 1.5 * s * 2;
      const vPadBody = 2 * s * 2;
      for (const r of rowSpecs) {
        if (r.kind === 'group') {
          total += Math.max(7.5 * s, lineH(groupFs) + vPadGroup);
          continue;
        }
        const nameLines = countLines(r.name, bodyFs, 'normal', COL_WIDTHS[1] - H_PAD * 2);
        const capLines = countLines(r.capText, bodyFs, r.isCapFallback ? 'italic' : 'normal', COL_WIDTHS[3] - H_PAD * 2);
        const maxLines = Math.max(nameLines, capLines);
        total += Math.max(12 * s, maxLines * lineH(bodyFs) + vPadBody);
      }
      return total;
    };

    let fitScale = 1;
    const SAFETY = 0.985; // toleransi pembulatan & ketebalan garis grid
    if (estimateTableHeight(1) > availableHeight * SAFETY) {
      let lo = 0.25;
      let hi = 1;
      for (let i = 0; i < 18; i++) {
        const mid = (lo + hi) / 2;
        if (estimateTableHeight(mid) <= availableHeight * SAFETY) lo = mid;
        else hi = mid;
      }
      fitScale = lo;
    }

    const s = fitScale;
    const tableRows: any[] = rowSpecs.map((r) => {
      if (r.kind === 'group') {
        return [
          {
            content: r.title,
            colSpan: 4,
            styles: {
              fontStyle: 'bold',
              fillColor: [255, 255, 255],
              textColor: [0, 0, 0],
              fontSize: 8.5 * s,
              halign: 'left',
              valign: 'middle',
              minCellHeight: 7.5 * s,
              cellPadding: { left: 3, right: H_PAD, top: 1.5 * s, bottom: 1.5 * s },
            },
          },
        ];
      }
      return [
        { content: r.no, styles: { halign: 'center', valign: 'middle' } },
        { content: r.name, styles: { halign: 'left', valign: 'middle' } },
        {
          content: r.score,
          styles: {
            halign: 'center',
            valign: 'middle',
            fontStyle: r.isMissing ? 'italic' : 'bold',
            textColor: r.isMissing ? [220, 38, 38] : [0, 0, 0],
          },
        },
        {
          content: r.capText,
          styles: {
            halign: 'left',
            valign: 'middle',
            textColor: r.isCapFallback ? [220, 38, 38] : [0, 0, 0],
            fontStyle: r.isCapFallback ? 'italic' : 'normal',
          },
        },
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['No', 'Mata Pelajaran', isLegacyEra ? 'Nilai Akhir' : 'Nilai', 'Capaian Kompetensi']],
      body: tableRows,
      theme: 'grid',
      styles: {
        font,
      },
      headStyles: {
        fillColor: isLegacyEra ? [179, 215, 164] : [205, 205, 205],
        textColor: 0,
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        minCellHeight: CK1_HEAD_HEIGHT,
      },
      bodyStyles: {
        fontSize: 7.8 * s,
        valign: 'middle',
        minCellHeight: 12 * s,
        cellPadding: { top: 2 * s, bottom: 2 * s, left: H_PAD, right: H_PAD },
        textColor: 0,
      },
      columnStyles: {
        0: { halign: 'center', valign: 'middle', cellWidth: COL_WIDTHS[0] },
        1: { halign: 'left', valign: 'middle', cellWidth: COL_WIDTHS[1] },
        2: { halign: 'center', valign: 'middle', cellWidth: COL_WIDTHS[2] },
        3: { halign: 'left', valign: 'middle', cellWidth: COL_WIDTHS[3] },
      },
      margin: { left: 15, right: 15, bottom: CK1_BOTTOM_MARGIN },
    });
  }

  // ── PAGE 2 ──
  doc.addPage();
  y = 15;

  // Student Info Grid Header on Page 2
  y = drawStudentMetadataGrid(doc, y);

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
    ? ekskulList.map((e: any, idx: number) => [
        idx + 1,
        e.nama_ekskul || e.nama || '-',
        e.keterangan || (e.predikat ? `Melaksanakan kegiatan ekstrakurikuler dengan predikat ${e.predikat}.` : '-')
      ])
    : [
        [1, '-', '-'],
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

  if (!effectiveDateVal) {
    const matchYear = String(displayTahunPelajaran || '').match(/([12]\d{3})/);
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
  const walasRaw = {
    nama: data?.wali_kelas_nama || data?.wali_kelas?.nama || data?.walas?.nama || 'Wali Kelas',
    nip: data?.wali_kelas_nip || data?.wali_kelas?.nip || data?.walas?.nip,
  };
  const normalizedWalas = normalizeTeacherIdentity(walasRaw);
  const waliKelasNama = normalizedWalas.nama;
  const waliKelasNip = normalizedWalas.nipFormatted || 'NIP. -';

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
 */
export const generateRaporPdf = async (options: PrintRaporOptions): Promise<{ blobUrl: string; filename: string }> => {
  const { siswaId, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '' } = options;

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

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  renderStudentRaporPages(doc, data, sekolah, tenantInfo, resolvedTahunPelajaranNama, resolvedSemesterNama, true, raporSettings, 'Helvetica');

  const siswa = data?.siswa || {};
  const filename = `RAPOR_${(siswa.nama_siswa || 'Siswa').replace(/\s+/g, '_')}_${resolvedSemesterNama || 'Semester'}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

/**
 * 🖨️ Cetak Massal Rapor Sekelas dalam 1 Berkas PDF Gabungan
 */
export const generateRaporKelasBatchPdf = async (options: PrintRaporBatchOptions): Promise<{ blobUrl: string; filename: string }> => {
  const { students, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '', kelasNama = 'Sekelas', onProgress } = options;
  if (!students || students.length === 0) {
    throw new Error('Tidak ada data siswa untuk dicetak.');
  }

  const [sekolahRes, tenantRes, settingsRes] = await Promise.allSettled([
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null),
    raporApi.getRaporSettings({ tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }),
  ]);
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? ((tenantRes.value as any)?.data || tenantRes.value) : null;
  const raporSettings = settingsRes.status === 'fulfilled' ? (settingsRes.value?.data || settingsRes.value) : null;

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
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
      renderStudentRaporPages(doc, data, sekolah, tenantInfo, tahunPelajaranNama, semesterNama, renderedCount === 0, raporSettings, 'Helvetica');
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

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { raporApi } from '../../../api/rapor.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { siswaApi } from '../../../api/academic.api';
import { getMyTenant, getTenantById } from '../../../api/tenants.api';
import { useAuthStore } from '../../../store/authStore';
import {
  formatIndoDate,
  PrintRaporBatchOptions,
  PrintRaporOptions,
} from './raporShared';

// Fallback P5 metadata & dimensions matching official reference format
const DEFAULT_P5_PROJECT = {
  tema: 'Kewirausahaan',
  judul: 'Berwirausaha Dari Hasil Kebun Ibu',
  deskripsi: 'Mengembangkan Impian Peserta Didik SMK',
};

const DEFAULT_P5_DIMENSI = [
  {
    dimensi: 'Mandiri',
    sub_elements: [
      'Mengenali kualitas dan minat diri serta tantangan yang dihadapi & Mengembangkan refleksi diri',
      'Regulasi emosi, penetapan tujuan dan rencana strategis pengembangan diri dan prestasi serta memiliki inisiatif dan bekerja secara mandiri, mengembangkan kendali dan disiplin diri, percaya diri, resilien dan adaptif',
    ],
  },
  {
    dimensi: 'Kreatif',
    sub_elements: [
      'Menghasilkan gagasan yang beragam dan tepat sesuai dengan kebutuhan masyarakat terhadap sebuah permasalahan yang ada.',
      'Mengeksplorasi dan mengekspresikan pikiran dan perasaannya kedalam sebuah karya.',
      'Mampu mengevaluasi tindakan dan gagasan yang sudah dimiliki serta mengetahui kesesuaian dengan kebutuhan masyarakat umum',
    ],
  },
  {
    dimensi: 'Bergotong Royong',
    sub_elements: [
      'Kerjasama, komunikasi untuk mencapai tujuan Bersama, saling ketergantungan positif dan koordinasi sosial',
      'Tanggap terhadap lingkungan, persepsi sosial',
      'Membagi peran dan menyelaraskan tindakan dalam kelompok supaya tercipta keselarasan dan keterbukaan dalam berbagi dengan kelompok.',
    ],
  },
];

const formatKualifikasi = (k?: string | null): string => {
  if (!k || k === 'FALSE') return '-';
  const upper = k.toUpperCase().trim();
  if (upper === 'SB') return 'Sangat Berkembang (SB)';
  if (upper === 'BSH') return 'Berkembang Sesuai Harapan (BSH)';
  if (upper === 'MB') return 'Mulai Berkembang (MB)';
  if (upper === 'BB') return 'Belum Berkembang (BB)';
  return k;
};

/**
 * 🌟 Render Halaman Rapor P5 untuk 1 Siswa (Sesuai Referensi Resmi)
 */
export const renderOfficialP5Page = (
  doc: jsPDF,
  allP5: any[],
  siswa: any,
  sekolah: any,
  tenantInfo: any,
  tahunPelajaranNama: string,
  semesterNama: string,
  logoDaerahBase64: string | null,
  logoSekolahBase64: string | null,
  isFirstStudent: boolean,
  settingsData?: any,
  activeProjek?: any
) => {
  if (!isFirstStudent) {
    doc.addPage();
  }
  const pageWidth = 210;

  // 1. Title (No kop surat, centered bold title)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(0, 0, 0);
  doc.text('PROJEK PENGUATAN PROFIL PELAJAR PANCASILA (P5)', pageWidth / 2, 17, { align: 'center' });

  // 2. Student & Project Metadata
  const namaSiswa = (siswa.nama_siswa || siswa.nama || '-').toUpperCase();
  const nis = siswa.nis || '-';
  const nisn = siswa.nisn || '-';
  const klsText = siswa.kelas || siswa.nama_kelas || siswa.kelas_nama || '-';
  const semText = semesterNama || 'Ganjil';
  const tingkatNum = Number(siswa.tingkat || 10);
  const faseText = siswa.fase || (tingkatNum === 10 ? 'E' : 'F');
  const namaSekolah = (sekolah?.nama || tenantInfo?.name || 'SMKN 1 PLERED').toUpperCase();

  const programKeahlian = siswa.program_keahlian || siswa.jurusan || tenantInfo?.program_keahlian || 'Perhotelan';
  const konsentrasiKeahlian = siswa.konsentrasi_keahlian || siswa.jurusan || programKeahlian;

  // Determine Project Details
  const firstP5 = allP5?.[0];
  const temaProjek = activeProjek?.tema || firstP5?.Projek?.tema || firstP5?.projek_tema || DEFAULT_P5_PROJECT.tema;
  const judulProjek = activeProjek?.judul || firstP5?.Projek?.judul || firstP5?.projek_judul || DEFAULT_P5_PROJECT.judul;
  const deskripsiProjek = activeProjek?.deskripsi || firstP5?.Projek?.deskripsi || DEFAULT_P5_PROJECT.deskripsi;

  autoTable(doc, {
    startY: 23,
    margin: { left: 14, right: 14 },
    body: [
      ['Nama Peserta Didik', ':', { content: namaSiswa, styles: { fontStyle: 'bold' } }, 'Fase', ':', faseText],
      ['NIS/NISN', ':', `${nis} / ${nisn}`, 'Satuan Pendidikan', ':', namaSekolah],
      ['Kelas', ':', klsText, 'Program Keahlian', ':', programKeahlian],
      ['Semester', ':', semText, 'Konsentrasi Keahlian', ':', konsentrasiKeahlian],
      ['', '', '', '', '', ''],
      ['Tema Projek', ':', temaProjek, '', '', ''],
      ['Judul Projek', ':', judulProjek, '', '', ''],
    ],
    theme: 'plain',
    styles: {
      font: 'Helvetica',
      fontSize: 8.5,
      cellPadding: { top: 0.6, bottom: 0.6, left: 0, right: 1 },
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 4, halign: 'center' },
      2: { cellWidth: 64 },
      3: { cellWidth: 34 },
      4: { cellWidth: 4, halign: 'center' },
      5: { cellWidth: 44 },
    },
  });

  const metaEnd = (doc as any).lastAutoTable?.finalY || 52;

  // 3. Dimensions & Table Construction
  // Group student scores if available
  const dimensimap = new Map<string, { subElements: string[]; kualifikasi?: string; catatan?: string }>();

  if (allP5 && allP5.length > 0) {
    allP5.forEach((p: any) => {
      const dimName = (p.dimensi || 'Dimensi').trim();
      if (!dimensimap.has(dimName)) {
        dimensimap.set(dimName, {
          subElements: [],
          kualifikasi: p.kualifikasi,
          catatan: p.catatan_proses,
        });
      }
      const existing = dimensimap.get(dimName)!;
      if (p.sub_elemen && !existing.subElements.includes(p.sub_elemen)) {
        existing.subElements.push(p.sub_elemen);
      }
      if (!existing.kualifikasi && p.kualifikasi) existing.kualifikasi = p.kualifikasi;
      if (!existing.catatan && p.catatan_proses) existing.catatan = p.catatan_proses;
    });
  }

  // Build table data
  const tableRows: any[] = [];

  if (dimensimap.size > 0) {
    dimensimap.forEach((dimData, dimName) => {
      // 1. Dimension Header Row
      tableRows.push([
        {
          content: dimName,
          colSpan: 3,
          styles: { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0], cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
        },
      ]);

      const subList = dimData.subElements.length > 0 ? dimData.subElements : ['Telah melaksanakan rangkaian projek profil pelajar Pancasila.'];
      const kualifikasiFormatted = formatKualifikasi(dimData.kualifikasi);
      const catatanFormatted = dimData.catatan && dimData.catatan !== 'FALSE' ? dimData.catatan : '-';

      subList.forEach((sub, sIdx) => {
        const letter = String.fromCharCode(97 + sIdx);
        if (sIdx === 0) {
          tableRows.push([
            { content: `${letter}.   ${sub}`, styles: { halign: 'left', cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 } } },
            { content: kualifikasiFormatted, rowSpan: subList.length, styles: { halign: 'center', valign: 'middle', cellPadding: 2 } },
            { content: catatanFormatted, rowSpan: subList.length, styles: { halign: 'center', valign: 'middle', cellPadding: 2 } },
          ]);
        } else {
          tableRows.push([
            { content: `${letter}.   ${sub}`, styles: { halign: 'left', cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 } } },
          ]);
        }
      });
    });
  } else {
    // Use official standard reference dimensions
    DEFAULT_P5_DIMENSI.forEach((dim) => {
      tableRows.push([
        {
          content: dim.dimensi,
          colSpan: 3,
          styles: { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0], cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
        },
      ]);

      dim.sub_elements.forEach((sub, sIdx) => {
        const letter = String.fromCharCode(97 + sIdx);
        if (sIdx === 0) {
          tableRows.push([
            { content: `${letter}.   ${sub}`, styles: { halign: 'left', cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 } } },
            { content: '-', rowSpan: dim.sub_elements.length, styles: { halign: 'center', valign: 'middle', cellPadding: 2 } },
            { content: '-', rowSpan: dim.sub_elements.length, styles: { halign: 'center', valign: 'middle', cellPadding: 2 } },
          ]);
        } else {
          tableRows.push([
            { content: `${letter}.   ${sub}`, styles: { halign: 'left', cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 } } },
          ]);
        }
      });
    });
  }

  autoTable(doc, {
    startY: metaEnd + 4,
    margin: { left: 14, right: 14 },
    head: [
      [
        { content: deskripsiProjek, styles: { halign: 'left', fontStyle: 'bold', fillColor: [217, 217, 217], textColor: [0, 0, 0] } },
        { content: 'Keterangan', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [217, 217, 217], textColor: [0, 0, 0] } },
      ],
    ],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'Helvetica',
      fontSize: 7.5,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
      valign: 'middle',
    },
    headStyles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      minCellHeight: 7,
    },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 36, halign: 'center' },
      2: { cellWidth: 36, halign: 'center' },
    },
  });

  // 4. Signatures Block (3-way signatures matching reference layout)
  const finalY = (doc as any).lastAutoTable?.finalY || 155;
  const signY = Math.max(finalY + 6, 168);

  const leftSignX = 16;
  const rightSignX = 140;
  const centerX = pageWidth / 2;

  const effectiveKota = sekolah?.kota || tenantInfo?.city || 'Purwakarta';
  const isGenap = Boolean(semText.toLowerCase().includes('genap') || semText.includes('2'));
  let effectiveDateVal = settingsData?.tanggal_rapor_p5 || settingsData?.tanggal_rapor;
  if (!effectiveDateVal) {
    const matchYear = String(tahunPelajaranNama || '').match(/^(\d{4})/);
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

  const kepalaSekolahNama = sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'WAHYU TAMIMBARKAH, S.Pd.';
  const kepalaSekolahNip = sekolah?.nip_kepala_sekolah || tenantInfo?.nip_kepala_sekolah || '197111022008011001';
  const walasNama = siswa?.walas_nama || siswa?.walas?.nama || (siswa.kelas_detail?.wali_kelas?.nama) || tenantInfo?.walas_nama || 'HERI JUNAEDI, S.E.';
  const walasNip = siswa?.walas_nip || siswa?.walas?.nip || (siswa.kelas_detail?.wali_kelas?.nip) || tenantInfo?.walas_nip || '196907222025211018';

  // 1. Ortu (Left)
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Orang Tua/Wali Siswa,', leftSignX, signY);

  // 2. Walas (Right)
  doc.text(`${effectiveKota}, ${dateStr}`, rightSignX, signY);
  doc.text('Wali Kelas,', rightSignX, signY + 4.5);

  const walasSignY = signY + 24;
  doc.setFont('Helvetica', 'bold');
  doc.text(walasNama, rightSignX, walasSignY);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${walasNip}`, rightSignX, walasSignY + 4.5);

  // Ortu line (dotted)
  doc.setFont('Helvetica', 'normal');
  doc.text('....................................................', leftSignX, walasSignY);

  // 3. Kepala Sekolah (Center Bottom)
  const kepsekSignY = walasSignY + 12;
  doc.setFontSize(8.5);
  doc.text('Mengetahui;', centerX, kepsekSignY, { align: 'center' });
  doc.text('Kepala Sekolah,', centerX, kepsekSignY + 4.5, { align: 'center' });

  const kepsekNameY = kepsekSignY + 24;
  doc.setFont('Helvetica', 'bold');
  doc.text(kepalaSekolahNama, centerX, kepsekNameY, { align: 'center' });
  const kepsekWidth = doc.getTextWidth(kepalaSekolahNama);
  doc.setLineWidth(0.25);
  doc.line(centerX - (kepsekWidth / 2), kepsekNameY + 0.6, centerX + (kepsekWidth / 2), kepsekNameY + 0.6);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${kepalaSekolahNip}`, centerX, kepsekNameY + 4.5, { align: 'center' });
};

/**
 * Generate P5 Rapor PDF (client-side via jsPDF).
 */
export const generateP5RaporPdf = async (options: PrintRaporOptions): Promise<{ blobUrl: string; filename: string }> => {
  const { siswaId, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '' } = options;

  const [p5Res, raporRes, siswaRes, sekolahRes, tenantRes, settingsRes, projekRes] = await Promise.allSettled([
    raporApi.getP5Nilai({ siswa_id: siswaId }),
    raporApi.getRaporDetail({ siswa_id: siswaId, tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }),
    siswaApi.getById(siswaId),
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null),
    raporApi.getRaporSettings({ tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }).catch(() => null),
    raporApi.getP5Projek({ tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }).catch(() => null),
  ]);

  const allP5: any[] = p5Res.status === 'fulfilled' ? (p5Res.value?.data || p5Res.value || []) : [];
  const raporData = raporRes.status === 'fulfilled' ? (raporRes.value?.data || raporRes.value) : null;
  const siswaDirect = siswaRes.status === 'fulfilled' ? (siswaRes.value?.data || siswaRes.value) : null;
  const siswa = {
    ...(siswaDirect || {}),
    ...(raporData?.siswa || {}),
  };

  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const currentUser = useAuthStore.getState().user;
  let tenantData = tenantRes.status === 'fulfilled' ? ((tenantRes.value as any)?.data || tenantRes.value) : null;
  if ((!tenantData?.logo_url && !tenantData?.logo_daerah_url) && currentUser?.tenant_id) {
    try {
      const resById = await getTenantById(currentUser.tenant_id);
      if (resById?.data) tenantData = { ...(tenantData || {}), ...resById.data };
    } catch {}
  }
  const tenantInfo = {
    ...((currentUser as any)?.tenant || {}),
    ...(tenantData || {}),
  };

  const settingsData = settingsRes.status === 'fulfilled' ? (settingsRes.value?.data || settingsRes.value) : null;
  const projekList = projekRes.status === 'fulfilled' ? (projekRes.value?.data || projekRes.value || []) : [];
  const activeProjek = Array.isArray(projekList) && projekList.length > 0 ? projekList[0] : null;

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  renderOfficialP5Page(
    doc,
    allP5,
    siswa,
    sekolah,
    tenantInfo,
    tahunPelajaranNama,
    semesterNama,
    null,
    null,
    true,
    settingsData,
    activeProjek
  );

  const filename = `Rapor_P5_${(siswa.nama_siswa || 'Siswa').replace(/\s+/g, '_')}_${semesterNama || 'Semester'}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

/**
 * 🌟 Cetak Massal Rapor P5 Sekelas dalam 1 Berkas PDF Gabungan
 */
export const generateP5KelasBatchPdf = async (options: PrintRaporBatchOptions): Promise<{ blobUrl: string; filename: string }> => {
  const { students, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '', kelasNama = 'Sekelas', onProgress } = options;
  if (!students || students.length === 0) {
    throw new Error('Tidak ada data siswa untuk dicetak.');
  }

  const [sekolahRes, tenantRes, settingsRes, projekRes] = await Promise.allSettled([
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null),
    raporApi.getRaporSettings({ tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }).catch(() => null),
    raporApi.getP5Projek({ tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }).catch(() => null),
  ]);
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const currentUser = useAuthStore.getState().user;
  let tenantData = tenantRes.status === 'fulfilled' ? ((tenantRes.value as any)?.data || tenantRes.value) : null;
  if ((!tenantData?.logo_url && !tenantData?.logo_daerah_url) && currentUser?.tenant_id) {
    try {
      const resById = await getTenantById(currentUser.tenant_id);
      if (resById?.data) tenantData = { ...(tenantData || {}), ...resById.data };
    } catch {}
  }
  const tenantInfo = {
    ...((currentUser as any)?.tenant || {}),
    ...(tenantData || {}),
  };
  const settingsData = settingsRes.status === 'fulfilled' ? (settingsRes.value?.data || settingsRes.value) : null;
  const projekList = projekRes.status === 'fulfilled' ? (projekRes.value?.data || projekRes.value || []) : [];
  const activeProjek = Array.isArray(projekList) && projekList.length > 0 ? projekList[0] : null;

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  let renderedCount = 0;
  let lastError: any = null;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    onProgress?.(i + 1, students.length, student.nama_siswa || 'Siswa');

    try {
      const [p5Res, raporRes, siswaRes] = await Promise.allSettled([
        raporApi.getP5Nilai({ siswa_id: student.id }),
        raporApi.getRaporDetail({ siswa_id: student.id, tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }),
        siswaApi.getById(student.id),
      ]);
      const allP5 = p5Res.status === 'fulfilled' ? (p5Res.value?.data || p5Res.value || []) : [];
      const raporData = raporRes.status === 'fulfilled' ? (raporRes.value?.data || raporRes.value) : null;
      const siswaDirect = siswaRes.status === 'fulfilled' ? (siswaRes.value?.data || siswaRes.value) : null;
      const siswa = {
        ...(siswaDirect || {}),
        ...(raporData?.siswa || {}),
        ...student,
      };

      renderOfficialP5Page(
        doc,
        allP5,
        siswa,
        sekolah,
        tenantInfo,
        tahunPelajaranNama,
        semesterNama,
        null,
        null,
        renderedCount === 0,
        settingsData,
        activeProjek
      );
      renderedCount++;
    } catch (err: any) {
      console.warn(`Gagal memuat rapor P5 untuk ${student.nama_siswa}:`, err);
      lastError = err;
    }
  }

  if (renderedCount === 0) {
    throw new Error(lastError?.message || 'Gagal memproses pembuatan PDF batch P5.');
  }

  const filename = `Rapor_P5_Sekelas_${kelasNama.replace(/\s+/g, '_')}_${semesterNama || 'Semester'}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

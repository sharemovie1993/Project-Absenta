import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { raporApi } from '../../../api/rapor.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { siswaApi } from '../../../api/academic.api';
import { getMyTenant, getTenantById } from '../../../api/tenants.api';
import { useAuthStore } from '../../../store/authStore';
import {
  DEFAULT_JABAR_LOGO_SVG,
  ensureCambriaFont,
  formatAlamatDuaBaris,
  formatAnakKe,
  formatIndoDate,
  PrintRaporBatchOptions,
  resolveCoverImageBase64,
  resolveJenjangLines,
} from './raporShared';
import { renderOfficialCoverRaporPage } from './renderCover';

/**
 * 📇 Render Halaman Biodata Siswa 17 Butir Resmi
 */
export const renderOfficialBiodataPage = (
  doc: jsPDF,
  siswa: any,
  sekolah: any,
  tenantInfo: any,
  kota: string,
  fontFamily: string
) => {
  const pageWidth = 210;

  // Header Title - Cambria 16 Bold
  const currentY = 15;
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('KETERANGAN TENTANG DIRI PESERTA DIDIK', pageWidth / 2, currentY, { align: 'center' });

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
    ['1.', 'Nama Peserta Didik Lengkap', ':', (siswa.nama_siswa || siswa.nama || '-').toUpperCase()],
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
    ['', 'Di kelas', ':', siswa.kelas_awal || siswa.kelas || '-'],
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

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  const fontFamily = await ensureCambriaFont(doc);

  // ── HALAMAN 1: COVER / SAMPUL RESMI RAPOR (MERGER KE BIODATA) ──
  const { jenjangLine1, jenjangLine2 } = resolveJenjangLines(sekolah, tenantInfo, siswa);

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
  renderOfficialBiodataPage(doc, siswa, sekolah, tenantInfo, kota, fontFamily);

  const filename = `Biodata_Siswa_${namaSiswa.replace(/\s+/g, '_')}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

/**
 * 📇 Cetak Massal Biodata & Cover Rapor Sekelas dalam 1 Berkas PDF Gabungan
 */
export const generateBiodataKelasBatchPdf = async (options: PrintRaporBatchOptions): Promise<{ blobUrl: string; filename: string }> => {
  const { students, tahunPelajaranId, semesterId, kelasNama = 'Sekelas', onProgress } = options;
  if (!students || students.length === 0) {
    throw new Error('Tidak ada data siswa untuk dicetak.');
  }

  // Preload sekolah & tenant info ONCE
  const [sekolahRes, tenantRes] = await Promise.allSettled([
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null),
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
  const kota = sekolah?.kota || tenantInfo?.city || 'Purwakarta';

  // Preload and cache logos base64 ONCE
  const logoDaerahUrl = tenantInfo?.logo_daerah_url || (sekolah as any)?.logo_daerah_url || (sekolah as any)?.logo_daerah || DEFAULT_JABAR_LOGO_SVG;
  const logoSekolahUrl = tenantInfo?.logo_url || sekolah?.logo_url || null;
  const [topLogoBase64, midLogoBase64] = await Promise.all([
    resolveCoverImageBase64(logoDaerahUrl),
    resolveCoverImageBase64(logoSekolahUrl),
  ]);

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  const fontFamily = await ensureCambriaFont(doc);
  let renderedCount = 0;
  let lastError: any = null;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    onProgress?.(i + 1, students.length, student.nama_siswa || 'Siswa');

    try {
      const [raporRes, siswaRes] = await Promise.allSettled([
        raporApi.getRaporDetail({ siswa_id: student.id, tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }),
        siswaApi.getById(student.id),
      ]);
      const raporRaw = raporRes.status === 'fulfilled' ? (raporRes.value?.data || raporRes.value) : null;
      const siswaDirect = siswaRes.status === 'fulfilled' ? (siswaRes.value?.data || siswaRes.value) : null;
      const siswa = {
        ...(siswaDirect || {}),
        ...(raporRaw?.siswa || {}),
        ...student,
      };

      const { jenjangLine1, jenjangLine2 } = resolveJenjangLines(sekolah, tenantInfo, siswa);
      const namaSiswa = (siswa.nama_siswa || siswa.nama || '-').toUpperCase();
      const nis = siswa.nis || '-';
      const nisn = siswa.nisn || '-';

      if (renderedCount > 0) {
        doc.addPage();
      }
      // Halaman 1: Cover
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

      // Halaman 2: Biodata
      doc.addPage();
      renderOfficialBiodataPage(doc, siswa, sekolah, tenantInfo, kota, fontFamily);
      renderedCount++;
    } catch (err: any) {
      console.warn(`Gagal memuat biodata untuk ${student.nama_siswa}:`, err);
      lastError = err;
    }
  }

  if (renderedCount === 0) {
    throw new Error(lastError?.message || 'Gagal memproses pembuatan PDF batch biodata.');
  }

  const filename = `Biodata_Cover_Sekelas_${kelasNama.replace(/\s+/g, '_')}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

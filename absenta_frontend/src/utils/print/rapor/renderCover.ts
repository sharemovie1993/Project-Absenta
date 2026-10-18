import { jsPDF } from 'jspdf';
import { raporApi } from '../../../api/rapor.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { siswaApi } from '../../../api/academic.api';
import { getMyTenant, getTenantById } from '../../../api/tenants.api';
import { useAuthStore } from '../../../store/authStore';
import {
  DEFAULT_JABAR_LOGO_SVG,
  ensureCambriaFont,
  resolveCoverImageBase64,
  resolveJenjangLines,
} from './raporShared';

export interface RenderCoverRaporOptions {
  namaSiswa: string;
  nis: string;
  nisn: string;
  jenjangLine1: string;
  jenjangLine2: string;
  topLogoBase64: string | null;
  midLogoBase64: string | null;
  fontFamily?: string;
}

export const renderOfficialCoverRaporPage = (doc: jsPDF, opts: RenderCoverRaporOptions) => {
  const pageWidth = 210;
  const font = opts.fontFamily || 'Cambria';

  // 1. Logo Daerah / Yayasan (Top Logo dari Logo Kiri Kop Surat)
  const topLogoW = 32;
  const topLogoH = 38;
  const topLogoX = (pageWidth - topLogoW) / 2;
  const topLogoY = 24;

  if (opts.topLogoBase64) {
    try {
      doc.addImage(opts.topLogoBase64, 'PNG', topLogoX, topLogoY, topLogoW, topLogoH, 'cover_top_logo', 'FAST');
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
      doc.addImage(opts.midLogoBase64, 'PNG', midLogoX, midLogoY, midLogoW, midLogoH, 'cover_mid_logo', 'FAST');
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

  const { jenjangLine1, jenjangLine2 } = resolveJenjangLines(sekolah, tenantInfo, siswa);

  const logoDaerahUrl = tenantInfo?.logo_daerah_url || (sekolah as any)?.logo_daerah_url || (sekolah as any)?.logo_daerah || DEFAULT_JABAR_LOGO_SVG;
  const logoSekolahUrl = tenantInfo?.logo_url || sekolah?.logo_url || null;

  const [topLogoBase64, midLogoBase64] = await Promise.all([
    resolveCoverImageBase64(logoDaerahUrl),
    resolveCoverImageBase64(logoSekolahUrl),
  ]);

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
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

import { jsPDF } from 'jspdf';
import { raporApi } from '../../../api/rapor.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { siswaApi } from '../../../api/academic.api';
import { getMyTenant, getTenantById } from '../../../api/tenants.api';
import { useAuthStore } from '../../../store/authStore';
import {
  DEFAULT_JABAR_LOGO_SVG,
  ensureCambriaFont,
  PrintRaporBatchOptions,
  resolveCoverImageBase64,
  resolveJenjangLines,
} from './raporShared';
import { renderOfficialCoverRaporPage } from './renderCover';
import { renderOfficialBiodataPage } from './renderBiodata';
import { renderStudentRaporPages } from './renderRaporCk';

/**
 * 📦 Cetak Massal Bundel Lengkap Rapor Sekelas (Cover + Biodata + Rapor Semester CK1/CK2)
 */
export const generateBundelRaporKelasBatchPdf = async (options: PrintRaporBatchOptions): Promise<{ blobUrl: string; filename: string }> => {
  const { students, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '', kelasNama = 'Sekelas', onProgress } = options;
  if (!students || students.length === 0) {
    throw new Error('Tidak ada data siswa untuk dicetak.');
  }

  // Preload settings, profile, tenant, logos & font ONCE
  const [sekolahRes, tenantRes, settingsRes] = await Promise.allSettled([
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null),
    raporApi.getRaporSettings({ tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }),
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
  const raporSettings = settingsRes.status === 'fulfilled' ? (settingsRes.value?.data || settingsRes.value) : null;
  const kota = sekolah?.kota || tenantInfo?.city || 'Purwakarta';

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
      const data = raporRes.status === 'fulfilled' ? (raporRes.value?.data?.data || raporRes.value?.data || raporRes.value) : null;
      const siswaDirect = siswaRes.status === 'fulfilled' ? (siswaRes.value?.data || siswaRes.value) : null;
      const siswa = {
        ...(siswaDirect || {}),
        ...(data?.siswa || {}),
        ...student,
      };

      const { jenjangLine1, jenjangLine2 } = resolveJenjangLines(sekolah, tenantInfo, siswa);
      const namaSiswa = (siswa.nama_siswa || siswa.nama || '-').toUpperCase();
      const nis = siswa.nis || '-';
      const nisn = siswa.nisn || '-';

      // 1. Cover
      if (renderedCount > 0) doc.addPage();
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

      // 2. Biodata
      doc.addPage();
      renderOfficialBiodataPage(doc, siswa, sekolah, tenantInfo, kota, fontFamily);

      // 3. Rapor Semester (CK1-CK2)
      if (data) {
        renderStudentRaporPages(doc, data, sekolah, tenantInfo, tahunPelajaranNama, semesterNama, false, raporSettings, 'Helvetica');
      }

      renderedCount++;
    } catch (err: any) {
      console.warn(`Gagal memuat bundel rapor untuk ${student.nama_siswa}:`, err);
      lastError = err;
    }
  }

  if (renderedCount === 0) {
    throw new Error(lastError?.message || 'Gagal memproses pembuatan PDF bundel sekelas.');
  }

  const filename = `Bundel_Rapor_Sekelas_${kelasNama.replace(/\s+/g, '_')}_${semesterNama || 'Semester'}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

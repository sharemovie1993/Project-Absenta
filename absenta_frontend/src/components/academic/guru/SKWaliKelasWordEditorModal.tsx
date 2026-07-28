/**
 * SKWaliKelasWordEditorModal
 *
 * Thin wrapper di atas komponen shared <WordEditorModal>.
 * Bertanggung jawab membangun template HTML 3-halaman SK Wali Kelas (sesuai sampel resmi)
 * dan menyuntikkan variabel dari database (nama guru, NIP, kelas, sekolah, dll.).
 *
 * Untuk keperluan editor Word lain (SK Mengajar, Surat Dinas, Undangan, dll.),
 * buat wrapper serupa yang menggunakan <WordEditorModal> dari:
 *   src/components/common/WordEditorModal.tsx
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { getTenantById } from '../../../api/tenants.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { tahunPelajaranApi } from '../../../api/academic.api';
import { skWaliKelasArsipApi } from '../../../api/academic/sk-wali-kelas-arsip.api';
import WordEditorModal, { WordEditorPage } from '../../common/WordEditorModal';
import { getDefaultMasterPages } from './SKWaliKelasTemplateMasterModal';

// ─── Data Contract ─────────────────────────────────────────────────────────────

export interface SKWaliKelasData {
  guruId?: string;
  namaGuru: string;
  nipGuru?: string;
  pangkatGol?: string;
  jabatan?: string;
  namaKelas?: string;
  tmt?: string;
  pendidikanTerakhir?: string;
  tahunPelajaran?: string;
  nomorSk?: string;
  tanggalSk?: string;
  kotaSk?: string;
  namaKepalaSekolah?: string;
  nipKepalaSekolah?: string;
  pangkatKepalaSekolah?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  skData?: SKWaliKelasData | null;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function SKWaliKelasWordEditorModal({ isOpen, onClose, skData }: Props) {
  const { user } = useAuth();
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [sekolahInfo, setSekolahInfo] = useState<any>(null);
  const [activeTa, setActiveTa] = useState<string>('');
  const [pages, setPages] = useState<WordEditorPage[]>(() => getDefaultMasterPages());
  const [templateConfig, setTemplateConfig] = useState<any>(undefined);

  // ── Fetch profil & build template dari DB ──
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;

    Promise.all([
      user?.tenant_id ? getTenantById(user.tenant_id).catch(() => null) : Promise.resolve(null),
      sekolahApi.getProfile().catch(() => null),
      tahunPelajaranApi.getActive().catch(() => null),
    ]).then(([tenantRes, sekolahRes, taRes]) => {
      if (!isSubscribed) return;

      const tInfo = tenantRes?.data || null;
      const sInfo = sekolahRes?.data || null;
      const activeYear = taRes?.data?.tahun || '';

      if (tInfo) setTenantInfo(tInfo);
      if (sInfo) setSekolahInfo(sInfo);
      if (activeYear) setActiveTa(activeYear);

      // Gunakan template master & konfigurasi margin dari DB
      const masterFromDb = sInfo?.sk_wali_kelas_template;
      let basePages: WordEditorPage[] = getDefaultMasterPages();
      let savedConfig: any = undefined;

      if (masterFromDb && typeof masterFromDb === 'object' && !Array.isArray(masterFromDb) && masterFromDb.pages) {
        basePages = masterFromDb.pages;
        savedConfig = masterFromDb.config;
      } else if (Array.isArray(masterFromDb) && masterFromDb.length > 0) {
        basePages = masterFromDb;
      }

      // ── Resolve variabel dari sekolah/tenant/skData ──
      const UNSET = '<span style="color:#dc2626;font-weight:bold;background-color:#fee2e2;padding:1px 5px;border-radius:3px">[BELUM DIISI]</span>';

      const namaSekolah   = sInfo?.nama       || tInfo?.name || UNSET;
      const kabKota       = sInfo?.kota        || tInfo?.kabupaten || tInfo?.kota || UNSET;
      const namaKepala    = skData?.namaKepalaSekolah || sInfo?.kepala_sekolah || tInfo?.kepala_sekolah || tInfo?.nama_kepala_sekolah || UNSET;
      const nipKepala     = skData?.nipKepalaSekolah  || sInfo?.nip_kepala     || tInfo?.nip_kepala || tInfo?.nip_kepala_sekolah || UNSET;
      const pangkatKepala = skData?.pangkatKepalaSekolah || sInfo?.pangkat_kepala || tInfo?.pangkat_kepala || UNSET;

      const namaGuru           = skData?.namaGuru          || UNSET;
      const nipGuru            = skData?.nipGuru           || UNSET;
      const pangkatGol         = skData?.pangkatGol        || UNSET;
      const namaKelas          = skData?.namaKelas         || (skData?.jabatan ? skData.jabatan.replace('WALI KELAS ', '') : null) || UNSET;
      const jabatan            = namaKelas !== UNSET ? `WALI KELAS ${namaKelas}` : UNSET;
      const tmt                = skData?.tmt               || UNSET;
      const pendidikanTerakhir = skData?.pendidikanTerakhir || UNSET;
      
      const now = new Date();
      const defaultYearRange = `${now.getFullYear()}/${now.getFullYear() + 1}`;
      const tahunPelajaran     = skData?.tahunPelajaran    
        || activeYear 
        || sInfo?.tahun_pelajaran 
        || sInfo?.tahun_ajaran 
        || tInfo?.tahun_pelajaran 
        || tInfo?.tahun_ajaran 
        || defaultYearRange;

      const nomorSk            = skData?.nomorSk           || UNSET;
      const tanggalSk          = skData?.tanggalSk         || UNSET;
      const kotaSk             = skData?.kotaSk            || kabKota;

      // Mapping lengkap placeholder key -> real value (Case insensitive & alternative aliases)
      const replacements: Record<string, string> = {
        '{{namaGuru}}': namaGuru,
        '{{NAMAGURU}}': namaGuru,
        '{{nipGuru}}': nipGuru,
        '{{NIPGURU}}': nipGuru,
        '{{pangkatGol}}': pangkatGol,
        '{{PANGKATGOL}}': pangkatGol,
        '{{golonganGuru}}': pangkatGol,
        '{{namaKelas}}': namaKelas,
        '{{NAMAKELAS}}': namaKelas,
        '{{jabatan}}': jabatan,
        '{{JABATAN}}': jabatan,
        '{{tmt}}': tmt,
        '{{TMT}}': tmt,
        '{{pendidikanTerakhir}}': pendidikanTerakhir,
        '{{tahunPelajaran}}': tahunPelajaran,
        '{{TAHUNPELAJARAN}}': tahunPelajaran,
        '{{namaSekolah}}': namaSekolah,
        '{{NAMASEKOLAH}}': namaSekolah,
        '{{kabKota}}': kabKota,
        '{{KABKOTA}}': kabKota,
        '{{nomorSk}}': nomorSk,
        '{{NOMORSK}}': nomorSk,
        '{{nomorSurat}}': nomorSk,
        '{{NOMORSURAT}}': nomorSk,
        '{{tanggalSk}}': tanggalSk,
        '{{TANGGALSK}}': tanggalSk,
        '{{tanggalSurat}}': tanggalSk,
        '{{TANGGALSURAT}}': tanggalSk,
        '{{kotaSk}}': kotaSk,
        '{{KOTASK}}': kotaSk,
        '{{namaKepala}}': namaKepala,
        '{{NAMAKEPALA}}': namaKepala,
        '{{nipKepala}}': nipKepala,
        '{{NIPKEPALA}}': nipKepala,
        '{{pangkatKepala}}': pangkatKepala,
        '{{PANGKATKEPALA}}': pangkatKepala,
      };

      const replacePlaceholders = (htmlStr: string) => {
        let res = htmlStr;
        // Strip annual-field-mark wrappers, yellow mark badges, and 🔄 indicators for clean official print output
        res = res.replace(/<mark[^>]*>(?:🔄\s*EDIT TIAP TAHUN:\s*)?(\{\{[^}]+\}\})<\/mark>/gi, '$1');
        res = res.replace(/<span[^>]*class="annual-field-mark"[^>]*>(.*?)<\/span>/gi, '$1');
        res = res.replace(/🔄\s*(?:EDIT TIAP TAHUN:\s*)?/gi, '');
        Object.entries(replacements).forEach(([key, val]) => {
          res = res.replaceAll(key, val || '');
        });
        return res;
      };

      const substitutedPages = basePages.map((page) => ({
        ...page,
        html: replacePlaceholders(page.html),
      }));

      setPages(substitutedPages);
      setTemplateConfig(savedConfig);
    });

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, skData, user?.tenant_id]);

  // ── Otomatis Simpan ke Arsip saat Cetak ──
  const handleBeforePrint = async (printedPages: WordEditorPage[]) => {
    try {
      await skWaliKelasArsipApi.saveArsip({
        guru_id: skData?.guruId || 'unknown',
        nama_guru: skData?.namaGuru || 'Guru',
        nama_kelas: skData?.namaKelas || skData?.jabatan?.replace('WALI KELAS ', '') || 'Kelas',
        tahun_pelajaran: skData?.tahunPelajaran || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        nomor_sk: skData?.nomorSk,
        tanggal_sk: skData?.tanggalSk,
        halaman_html: printedPages,
      });
    } catch (err) {
      console.error('Gagal mengarsipkan SK Wali Kelas:', err);
    }
  };

  return (
    <WordEditorModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Pratinjau SK Wali Kelas - ${skData?.namaGuru || 'Resmi'}`}
      printTitle={`SK Wali Kelas - ${skData?.namaGuru || 'Resmi'}`}
      printButtonLabel="🖨️ Cetak SK Wali Kelas (PDF)"
      initialPages={pages}
      initialConfig={templateConfig}
      allowExtraPages={true}
      orientation="portrait"
      readOnly={true}
      onBeforePrint={handleBeforePrint}
    />
  );
}

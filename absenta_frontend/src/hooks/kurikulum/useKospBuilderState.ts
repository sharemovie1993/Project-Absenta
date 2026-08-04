import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTahunPelajaranOptions } from '../useTahunPelajaranOptions';
import { useJurusanOptions } from '../useJurusanOptions';
import { hubinApi, type MitraIndustri } from '../../api/hubin.api';
import { sekolahApi } from '../../api/academic/sekolah.api';
import { kurikulumApi } from '../../api/kurikulum.api';
import { kospApi } from '../../api/kurikulum/kosp.api';
import { getStrukturTree } from '../../api/academic/strukturOrganisasi.api';
import { toast } from 'react-hot-toast';
import { getDefaultKospMasterPages } from '../../utils/kurikulum/kospTemplateMaster';
import { 
  buildKospStrukturTableHtml,
  buildKospKalenderPendidikanHtml,
  buildKospJamKbmHtml,
  buildKospDudiMitraHtml,
  buildKospCoverLogoHtml,
  buildKospSkTimTableHtml,
  buildKospP5TableHtml,
  buildKospEskulTableHtml,
  type TimPenyusunItem
} from '../../utils/kurikulum/kospDataHelper';
import { WordEditorPage, WordEditorConfig } from '../../components/common/WordEditorModal';
import type { KospMetaConfigData } from '../../components/kurikulum/kosp/KospMetaConfigModal';
import type { Jurusan, StrukturKurikulum } from '../../types/academic';

export const useKospBuilderState = () => {
  const queryClient = useQueryClient();
  // NOTE: useAuth/useTenant/useJenjang dipakai hanya jika data mereka dibutuhkan secara eksplisit
  // di masa depan (role-based KOSP filtering). Saat ini data datang dari sekolahApi & strukturApi.

  // ── 1. ALL REACT STATES AT THE VERY TOP (React Rules of Hooks Best Practice) ──
  const [selectedTahunId, setSelectedTahunId] = useState<string>('');
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isMetaModalOpen, setIsMetaModalOpen] = useState<boolean>(false);

  // ── 2. HELPER HOOKS ──
  const {
    options: tahunOptions,
    rawList: tahunList,
    activeYear,
    isLoading: isLoadingTahun
  } = useTahunPelajaranOptions();

  const {
    options: jurusanOptions,
    rawList: jurusanList,
    isLoading: isLoadingJurusan
  } = useJurusanOptions();

  // ── 3. STATE SYNC EFFECT ──
  useEffect(() => {
    if (activeYear && !selectedTahunId) {
      setSelectedTahunId(activeYear.id);
    } else if (tahunList.length > 0 && !selectedTahunId) {
      setSelectedTahunId(tahunList[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeYear?.id, tahunList.length]); // tanpa selectedTahunId agar tidak double-trigger

  // ── 4. TANSTACK QUERY DATA FETCHING ──
  const { data: dudiData, isLoading: isLoadingDudi } = useQuery({
    queryKey: ['hubin-dudi-options-kosp-list'],
    queryFn: async () => {
      try {
        const res = await hubinApi.getMitra({ limit: 200 });
        const list: MitraIndustri[] = Array.isArray(res.data) 
          ? res.data 
          : res.data?.list || res.data?.data || (Array.isArray(res) ? res : []);
        return list;
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: sekolahRes } = useQuery({
    queryKey: ['sekolah-profile'],
    queryFn: () => sekolahApi.getProfile(),
    staleTime: 30 * 60 * 1000, // profil sekolah sangat jarang berubah
  });

  const { data: kospConfigRes, isLoading: isLoadingKospConfig } = useQuery({
    queryKey: ['kosp-config', selectedTahunId],
    queryFn: () => kospApi.getConfigByTahun(selectedTahunId),
    enabled: !!selectedTahunId,
  });

  const { data: mappingRes, isLoading: isLoadingMapping } = useQuery({
    queryKey: ['kurikulum-struktur-all', selectedTahunId],
    queryFn: () => kurikulumApi.getStruktur({ tahun_pelajaran_id: selectedTahunId }),
    enabled: !!selectedTahunId,
  });

  const { data: treeRes } = useQuery({
    queryKey: ['struktur-organisasi-tree-kosp'],
    queryFn: () => getStrukturTree(),
    staleTime: 30 * 60 * 1000, // struktur org jarang berubah
  });

  const { data: kalenderRes } = useQuery({
    queryKey: ['kosp-kalender-akademik', selectedTahunId],
    queryFn: () => kurikulumApi.getKalenderAkademik(selectedTahunId),
    enabled: !!selectedTahunId,
    staleTime: 10 * 60 * 1000,
  });

  // ── 5. DERIVED DATA & USEMEMOS ──
  const dudiList = useMemo(() => dudiData || [], [dudiData]);
  const sekolahInfo = sekolahRes?.data || null;
  const kospDbConfig = kospConfigRes?.data || null;

  // Parsed Config JSON (Margin, Meta SK, Tim Penyusun)
  const parsedConfigObj = useMemo<Record<string, any>>(() => {
    if (kospDbConfig?.config) {
      try {
        return typeof kospDbConfig.config === 'string' ? JSON.parse(kospDbConfig.config) : kospDbConfig.config;
      } catch (e) {}
    }
    return {};
  }, [kospDbConfig]);

  const metaConfigData: KospMetaConfigData = useMemo(() => {
    return parsedConfigObj?.meta || {};
  }, [parsedConfigObj]);

  const selectedTahunObj = useMemo(() => {
    return tahunList.find(y => y.id === selectedTahunId) || activeYear || null;
  }, [tahunList, selectedTahunId, activeYear]);

  const selectedTahunNama = useMemo(() => {
    return selectedTahunObj?.tahun || (selectedTahunObj as any)?.nama || '2025/2026';
  }, [selectedTahunObj]);

  const mappingAllData: StrukturKurikulum[] = useMemo(() => {
    return mappingRes?.data || [];
  }, [mappingRes?.data]);

  const treeData = treeRes?.data || {};
  const kepsekNode = treeData['KEPALA_SEKOLAH']?.[0]?.members?.[0];
  const kurikulumNode = treeData['KURIKULUM']?.[0]?.members?.[0];

  const namaKepalaSekolah = kepsekNode?.name || sekolahInfo?.kepala_sekolah || 'Kepala Sekolah';
  const nipKepalaSekolah = (kepsekNode?.details || '').match(/NIP[:\s.]+([\d\s]+)/i)?.[1]?.trim() || sekolahInfo?.nip_kepala || '-';
  const wakasekKurikulum = kurikulumNode?.name || 'Wakasek Kurikulum';
  const nipWakasekKurikulum = (kurikulumNode?.details || '').match(/NIP[:\s.]+([\d\s]+)/i)?.[1]?.trim() || '-';

  // ── 6. HTML TABLE BUILDERS (USEMEMO) ──
  const tabelStrukturSemuaJurusanHtml = useMemo(() => {
    if (!jurusanList || jurusanList.length === 0) {
      return '<p style="color:#64748b; font-style:italic;">Belum ada daftar jurusan terdaftar.</p>';
    }
    return jurusanList
      .map((j: Jurusan) => buildKospStrukturTableHtml(j, mappingAllData))
      .join('');
  }, [jurusanList, mappingAllData]);

  const tabelKalenderPendidikanHtml = useMemo(() => {
    const kalenderItems = Array.isArray(kalenderRes?.data) ? kalenderRes.data : [];
    return buildKospKalenderPendidikanHtml(kalenderItems);
  }, [kalenderRes]);

  const tabelJamKbmHtml = useMemo(() => {
    return buildKospJamKbmHtml([]);
  }, []);

  const tabelDudiMitraHtml = useMemo(() => {
    return buildKospDudiMitraHtml(dudiList || []);
  }, [dudiList]);

  const coverLogoHtml = useMemo(() => {
    return buildKospCoverLogoHtml(sekolahInfo?.logo_url, sekolahInfo?.nama || 'SMK');
  }, [sekolahInfo?.logo_url, sekolahInfo?.nama]);

  const tabelSkTimHtml = useMemo(() => {
    return buildKospSkTimTableHtml(
      namaKepalaSekolah, 
      wakasekKurikulum, 
      metaConfigData.tim_penyusun,
      treeData
    );
  }, [namaKepalaSekolah, wakasekKurikulum, metaConfigData.tim_penyusun, treeData]);

  const tabelP5Html = useMemo(() => {
    return buildKospP5TableHtml();
  }, []);

  const tabelEskulHtml = useMemo(() => {
    return buildKospEskulTableHtml();
  }, []);

  const daftarJurusanSummaryHtml = useMemo(() => {
    if (!jurusanList || jurusanList.length === 0) return '';
    return `
      <ul style="font-size:11pt; line-height:1.6; margin-top:6px;">
        ${jurusanList.map((j: Jurusan) => `
          <li><strong>${j.nama}</strong> (${j.singkatan || j.kode || 'JUR'})</li>
        `).join('')}
      </ul>
    `;
  }, [jurusanList]);

  // ── 7. COMPILED WORD PAGES WITH LIVE SUBSTITUTIONS ──
  const compiledPages = useMemo<WordEditorPage[]>(() => {
    const basePages: WordEditorPage[] = kospDbConfig?.halaman_html
      ? (typeof kospDbConfig.halaman_html === 'string' ? JSON.parse(kospDbConfig.halaman_html) : kospDbConfig.halaman_html)
      : getDefaultKospMasterPages();

    const tglPengesahanFormatted = metaConfigData.tanggal_sk
      ? new Date(metaConfigData.tanggal_sk).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const safeString = (val: any): string => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'string') return val;
      if (typeof val === 'number' || typeof val === 'boolean') return String(val);
      return '';
    };

    const renderFieldOrWarning = (val: string | undefined, fieldLabel: string) => {
      if (val && val.trim() && val !== '-' && val !== 'Kepala Sekolah' && val !== 'Wakasek Kurikulum') {
        return safeString(val);
      }
      return `<span style="color:#dc2626; font-style:italic; font-weight:bold;">[⚠️ ${fieldLabel} BELUM DIISI - SILAKAN ATUR DI PENGATURAN SK]</span>`;
    };

    const replacements: Record<string, string> = {
      '{{NAMASEKOLAH}}': safeString(sekolahInfo?.nama || '[NAMA SEKOLAH BELUM DIISI]'),
      '{{TAHUNPELAJARAN}}': safeString(selectedTahunNama),
      '{{KOTASEKOLAH}}': safeString(sekolahInfo?.kota || sekolahInfo?.kecamatan || '[KOTA SEKOLAH]'),
      '{{ALAMATSEKOLAH}}': safeString(sekolahInfo?.alamat || '[ALAMAT SEKOLAH]'),
      '{{NPSNSEKOLAH}}': safeString((sekolahInfo as any)?.npsn || '[NPSN SEKOLAH]'),
      '{{LOGOSEKOLAH_HTML}}': safeString(coverLogoHtml),
      '{{TANGGALPENGESAHAN}}': safeString(tglPengesahanFormatted),
      '{{NAMAKETUAKOMITE}}': renderFieldOrWarning(metaConfigData?.komite_nama, 'NAMA KETUA KOMITE'),
      '{{NAMAKEPALASEKOLAH}}': renderFieldOrWarning(namaKepalaSekolah, 'NAMA KEPALA SEKOLAH'),
      '{{NIPKEPALASEKOLAH}}': safeString(nipKepalaSekolah !== '-' ? nipKepalaSekolah : '[NIP KEPALA SEKOLAH]'),
      '{{NAMAKEPAKACABDIN}}': renderFieldOrWarning(metaConfigData?.kcd_nama, 'NAMA KEPALA CABDIN'),
      '{{NIPKEPAKACABDIN}}': safeString(metaConfigData?.kcd_nip || '[NIP KEPALA CABDIN]'),
      '{{KARAKTERISTIK_SEKOLAH}}': safeString(kospDbConfig?.karakteristik || `
        <p style="text-align:justify; font-size:11pt; line-height:1.6; color:#475569;">
          <em><span style="color:#dc2626; font-weight:bold;">[⚠️ BELUM DITETAPKAN]</span> Deskripsi Karakteristik Satuan Pendidikan belum diisi di database kustomisasi KOSP.</em>
        </p>
      `),
      '{{DAFTAR_JURUSAN_SUMMARY}}': safeString(daftarJurusanSummaryHtml),
      '{{VISI_SEKOLAH}}': safeString(kospDbConfig?.visi || '<span style="color:#dc2626; font-weight:bold;">[⚠️ VISI SEKOLAH BELUM DIISI DI DATABASE]</span>'),
      '{{MISI_SEKOLAH}}': safeString(kospDbConfig?.misi || '<p style="color:#dc2626; font-weight:bold;">[⚠️ MISI SEKOLAH BELUM DIISI DI DATABASE]</p>'),
      '{{TABEL_STRUKTUR_KURIKULUM_SEMUA_JURUSAN}}': safeString(tabelStrukturSemuaJurusanHtml),
      '{{TABEL_KALENDER_PENDIDIKAN}}': safeString(tabelKalenderPendidikanHtml),
      '{{TABEL_JAM_KBM}}': safeString(tabelJamKbmHtml),
      '{{TABEL_DUDI_MITRA}}': safeString(tabelDudiMitraHtml),
      '{{TABEL_SK_TIM_PENYUSUN}}': safeString(tabelSkTimHtml),
      '{{TABEL_P5_MATRIKS}}': safeString(tabelP5Html),
      '{{TABEL_ESKUL_MATRIKS}}': safeString(tabelEskulHtml),
      // ── Meta SK & Legalitas ──
      '{{NOMOR_SK}}': renderFieldOrWarning(metaConfigData?.nomor_sk, 'NOMOR SK KEPSEK'),
      '{{NAMA_DINAS_PROVINSI}}': safeString(metaConfigData?.nama_dinas_provinsi || '[DINAS PENDIDIKAN PROVINSI BELUM DIISI]'),
      '{{NAMA_CABDIN}}': safeString(metaConfigData?.nama_cabdin || '[CABANG DINAS PENDIDIKAN BELUM DIISI]'),
    };


    return basePages.map(page => {
      let html = safeString(page.html);
      Object.entries(replacements).forEach(([key, val]) => {
        html = html.replaceAll(key, val);
      });
      return { ...page, html };
    });
  }, [
    kospDbConfig,
    sekolahInfo,
    selectedTahunNama,
    namaKepalaSekolah,
    nipKepalaSekolah,
    coverLogoHtml,
    tabelSkTimHtml,
    tabelP5Html,
    tabelEskulHtml,
    daftarJurusanSummaryHtml,
    tabelStrukturSemuaJurusanHtml,
    tabelKalenderPendidikanHtml, // sudah derive dari kalenderRes — tidak perlu kalenderRes lagi
    tabelJamKbmHtml,
    tabelDudiMitraHtml,
    metaConfigData,
  ]);

  // ── 8. INITIAL CONFIG ──
  const initialConfig = useMemo<WordEditorConfig>(() => {
    return {
      paperKey: parsedConfigObj.paperKey || 'A4',
      orientation: parsedConfigObj.orientation || 'portrait',
      margin: parsedConfigObj.margin || { top: '2.5cm', right: '2.5cm', bottom: '2.5cm', left: '2.5cm' }
    };
  }, [parsedConfigObj]);

  // ── 9. MUTATION FOR UPSERT ──
  const upsertMutation = useMutation({
    mutationFn: (payload: { halaman_html?: string; config?: string }) => {
      return kospApi.upsertConfig({
        tahun_pelajaran_id: selectedTahunId,
        halaman_html: payload.halaman_html,
        config: payload.config
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kosp-config', selectedTahunId] });
      toast.success(`Pengaturan KOSP TP ${selectedTahunNama} berhasil disimpan ke database!`);
    },
    onError: () => {
      toast.error('Gagal menyimpan pengaturan KOSP');
    }
  });

  const handleSaveKospPages = useCallback(async (pages: WordEditorPage[], config?: WordEditorConfig) => {
    const updatedConfigObj = {
      ...parsedConfigObj,
      ...(config || initialConfig),
    };
    await upsertMutation.mutateAsync({
      halaman_html: JSON.stringify(pages),
      config: JSON.stringify(updatedConfigObj)
    });
  }, [selectedTahunId, upsertMutation, initialConfig, parsedConfigObj]);

  const handleSaveMetaConfig = useCallback(async (updatedMeta: KospMetaConfigData) => {
    const updatedConfigObj = {
      ...parsedConfigObj,
      meta: updatedMeta,
    };
    await upsertMutation.mutateAsync({
      config: JSON.stringify(updatedConfigObj)
    });
  }, [parsedConfigObj, upsertMutation]);

  return {
    selectedTahunId,
    setSelectedTahunId,
    selectedTahunNama,
    tahunOptions,
    tahunList,
    jurusanList,
    sekolahInfo,
    isEditorOpen,
    setIsEditorOpen,
    isMetaModalOpen,
    setIsMetaModalOpen,
    metaConfigData,
    compiledPages,
    initialConfig,
    isLoading: isLoadingTahun || isLoadingJurusan || isLoadingKospConfig || isLoadingMapping || isLoadingDudi,
    isSaving: upsertMutation.isPending,
    handleSaveKospPages,
    handleSaveMetaConfig,
    namaKepalaSekolah,
    wakasekKurikulum,
    mappingAllDataCount: mappingAllData.length,
    treeData, // expose untuk KospMetaConfigModal agar Tim Penyusun bisa di-populate dari data org live
  };
};

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../useAuth';
import { useTenant } from '../useTenant';
import { useJenjang } from '../useJenjang';
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
  buildKospEskulTableHtml
} from '../../utils/kurikulum/kospDataHelper';
import { WordEditorPage, WordEditorConfig } from '../../components/common/WordEditorModal';
import type { Jurusan, StrukturKurikulum } from '../../types/academic';

export const useKospBuilderState = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const { jenjang, kurikulum } = useJenjang();

  // 1. Tahun Pelajaran Options
  const {
    options: tahunOptions,
    rawList: tahunList,
    activeYear,
    isLoading: isLoadingTahun
  } = useTahunPelajaranOptions();

  // 2. Jurusan Options
  const {
    options: jurusanOptions,
    rawList: jurusanList,
    isLoading: isLoadingJurusan
  } = useJurusanOptions();

  // 3. DUDI Mitra List (Direct useQuery for 100% strict Hook sequence stability)
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
  const dudiList = useMemo(() => dudiData || [], [dudiData]);

  // 4. Selected Tahun Pelajaran State
  const [selectedTahunId, setSelectedTahunId] = useState<string>('');

  useEffect(() => {
    if (activeYear && !selectedTahunId) {
      setSelectedTahunId(activeYear.id);
    } else if (tahunList.length > 0 && !selectedTahunId) {
      setSelectedTahunId(tahunList[0].id);
    }
  }, [activeYear, tahunList, selectedTahunId]);

  // 5. Selected Tahun Object
  const selectedTahunObj = useMemo(() => {
    return tahunList.find(y => y.id === selectedTahunId) || activeYear || null;
  }, [tahunList, selectedTahunId, activeYear]);

  const selectedTahunNama = useMemo(() => {
    return selectedTahunObj?.tahun || (selectedTahunObj as any)?.nama || '2025/2026';
  }, [selectedTahunObj]);

  // 6. Fetch Sekolah Profile
  const { data: sekolahRes } = useQuery({
    queryKey: ['sekolah-profile'],
    queryFn: () => sekolahApi.getProfile(),
  });
  const sekolahInfo = sekolahRes?.data || null;

  // 7. Fetch KOSP Config per Tahun Pelajaran from DB
  const { data: kospConfigRes, isLoading: isLoadingKospConfig } = useQuery({
    queryKey: ['kosp-config', selectedTahunId],
    queryFn: () => kospApi.getConfigByTahun(selectedTahunId),
    enabled: !!selectedTahunId,
  });
  const kospDbConfig = kospConfigRes?.data || null;

  // 8. Fetch Struktur Kurikulum ALL Jurusans for this selected Tahun Pelajaran
  const { data: mappingRes, isLoading: isLoadingMapping } = useQuery({
    queryKey: ['kurikulum-struktur-all', selectedTahunId],
    queryFn: () => kurikulumApi.getStruktur({ tahun_pelajaran_id: selectedTahunId }),
    enabled: !!selectedTahunId,
  });
  const mappingAllData: StrukturKurikulum[] = useMemo(() => {
    return mappingRes?.data || [];
  }, [mappingRes?.data]);

  // 9. Fetch Struktur Organisasi Tree for Pejabat (Kepsek, Wakasek Kurikulum, Komite)
  const { data: treeRes } = useQuery({
    queryKey: ['struktur-organisasi-tree-kosp'],
    queryFn: () => getStrukturTree(),
  });
  const treeData = treeRes?.data || {};

  const kepsekNode = treeData['KEPALA_SEKOLAH']?.[0]?.members?.[0];
  const kurikulumNode = treeData['KURIKULUM']?.[0]?.members?.[0];

  const namaKepalaSekolah = kepsekNode?.name || sekolahInfo?.kepala_sekolah || 'Kepala Sekolah';
  const nipKepalaSekolah = (kepsekNode?.details || '').match(/NIP[:\s.]+([\d\s]+)/i)?.[1]?.trim() || sekolahInfo?.nip_kepala || '-';
  const wakasekKurikulum = kurikulumNode?.name || 'Wakasek Kurikulum';
  const nipWakasekKurikulum = (kurikulumNode?.details || '').match(/NIP[:\s.]+([\d\s]+)/i)?.[1]?.trim() || '-';

  // 10. Build Table HTML for ALL Jurusans
  const tabelStrukturSemuaJurusanHtml = useMemo(() => {
    if (!jurusanList || jurusanList.length === 0) {
      return '<p style="color:#64748b; font-style:italic;">Belum ada daftar jurusan terdaftar.</p>';
    }
    return jurusanList
      .map((j: Jurusan) => buildKospStrukturTableHtml(j, mappingAllData))
      .join('');
  }, [jurusanList, mappingAllData]);

  // 11. Build Table HTML for Kalender Pendidikan
  const tabelKalenderPendidikanHtml = useMemo(() => {
    return buildKospKalenderPendidikanHtml([]);
  }, []);

  // 12. Build Table HTML for Jam KBM / Roster
  const tabelJamKbmHtml = useMemo(() => {
    return buildKospJamKbmHtml([]);
  }, []);

  // 13. Build Table HTML for DUDI Mitra
  const tabelDudiMitraHtml = useMemo(() => {
    return buildKospDudiMitraHtml(dudiList || []);
  }, [dudiList]);

  // 14. Build Cover Logo HTML
  const coverLogoHtml = useMemo(() => {
    return buildKospCoverLogoHtml(sekolahInfo?.logo_url, sekolahInfo?.nama || 'SMK');
  }, [sekolahInfo?.logo_url, sekolahInfo?.nama]);

  // 15. Build SK Tim Table HTML
  const tabelSkTimHtml = useMemo(() => {
    return buildKospSkTimTableHtml(namaKepalaSekolah, wakasekKurikulum);
  }, [namaKepalaSekolah, wakasekKurikulum]);

  // 16. Build P5 Matriks HTML
  const tabelP5Html = useMemo(() => {
    return buildKospP5TableHtml();
  }, []);

  // 17. Build Eskul Matriks HTML
  const tabelEskulHtml = useMemo(() => {
    return buildKospEskulTableHtml();
  }, []);

  // 18. Daftar Jurusan Summary
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

  // 19. Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // 20. Compile Pages with Live Variable Substitutions
  const compiledPages = useMemo<WordEditorPage[]>(() => {
    const basePages: WordEditorPage[] = kospDbConfig?.halaman_html
      ? (typeof kospDbConfig.halaman_html === 'string' ? JSON.parse(kospDbConfig.halaman_html) : kospDbConfig.halaman_html)
      : getDefaultKospMasterPages();

    const replacements: Record<string, string> = {
      '{{NAMASEKOLAH}}': sekolahInfo?.nama || 'SMK NEGERI 1 PLERED',
      '{{TAHUNPELAJARAN}}': selectedTahunNama,
      '{{KOTASEKOLAH}}': sekolahInfo?.kota || sekolahInfo?.kecamatan || 'Purwakarta',
      '{{ALAMATSEKOLAH}}': sekolahInfo?.alamat || 'Jl. Raya Cibogo Girang, Plered, Purwakarta',
      '{{NPSNSEKOLAH}}': (sekolahInfo as any)?.npsn || '20217088',
      '{{LOGOSEKOLAH_HTML}}': coverLogoHtml,
      '{{TANGGALPENGESAHAN}}': new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      '{{NAMAKETUAKOMITE}}': 'H. Dudung Abdurrahman, M.Pd.',
      '{{NAMAKEPALASEKOLAH}}': namaKepalaSekolah,
      '{{NIPKEPALASEKOLAH}}': nipKepalaSekolah,
      '{{NAMAKEPAKACABDIN}}': 'Drs. H. Mamat Rahmat, M.Si.',
      '{{NIPKEPAKACABDIN}}': '19680315 199303 1 008',
      '{{KARAKTERISTIK_SEKOLAH}}': kospDbConfig?.karakteristik || `
        <p style="text-align:justify; font-size:11pt; line-height:1.6;">
          <strong>${sekolahInfo?.nama || 'Sekolah'}</strong> terletak di wilayah ${sekolahInfo?.kota || 'Daerah'} dengan potensi industri dan lingkungan masyarakat yang dinamis. Sekolah berkomitmen menyelenggarakan pendidikan kejuruan berkualitas yang berorientasi pada kesiapan kerja, wirausaha, dan karakter Pancasila.
        </p>
      `,
      '{{DAFTAR_JURUSAN_SUMMARY}}': daftarJurusanSummaryHtml,
      '{{VISI_SEKOLAH}}': kospDbConfig?.visi || 'Mewujudkan lulusan SMK yang Unggul, Berkarakter Pancasila, Kompeten, dan Siap Kerja di Era Global.',
      '{{MISI_SEKOLAH}}': kospDbConfig?.misi || `
        <ol style="margin-top:4px; padding-left:20px;">
          <li>Menyelenggarakan pembelajaran berbasis Industri dan Kurikulum Merdeka.</li>
          <li>Mengembangkan sikap disiplin, kerja keras, dan akhlak mulia.</li>
          <li>Memperkuat kemitraan dengan Dunia Usaha / Dunia Kerja (DUDI).</li>
        </ol>
      `,
      '{{TABEL_STRUKTUR_KURIKULUM_SEMUA_JURUSAN}}': tabelStrukturSemuaJurusanHtml,
      '{{TABEL_KALENDER_PENDIDIKAN}}': tabelKalenderPendidikanHtml,
      '{{TABEL_JAM_KBM}}': tabelJamKbmHtml,
      '{{TABEL_DUDI_MITRA}}': tabelDudiMitraHtml,
      '{{TABEL_SK_TIM_PENYUSUN}}': tabelSkTimHtml,
      '{{TABEL_P5_MATRIKS}}': tabelP5Html,
      '{{TABEL_ESKUL_MATRIKS}}': tabelEskulHtml,
    };

    return basePages.map(page => {
      let html = page.html;
      Object.entries(replacements).forEach(([key, val]) => {
        html = html.replaceAll(key, val || '');
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
    tabelKalenderPendidikanHtml,
    tabelJamKbmHtml,
    tabelDudiMitraHtml
  ]);

  // 21. Initial Configuration (Margin, Paper)
  const initialConfig = useMemo<WordEditorConfig>(() => {
    if (kospDbConfig?.config) {
      try {
        return typeof kospDbConfig.config === 'string' ? JSON.parse(kospDbConfig.config) : kospDbConfig.config;
      } catch (e) {}
    }
    return { paperKey: 'A4', orientation: 'portrait' };
  }, [kospDbConfig]);

  // 22. Upsert Mutation
  const upsertMutation = useMutation({
    mutationFn: (payload: { halaman_html: string; config?: string }) => {
      return kospApi.upsertConfig({
        tahun_pelajaran_id: selectedTahunId,
        halaman_html: payload.halaman_html,
        config: payload.config
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kosp-config', selectedTahunId] });
      toast.success(`Dokumen KOSP TP ${selectedTahunNama} berhasil disimpan ke database!`);
    },
    onError: () => {
      toast.error('Gagal menyimpan dokumen KOSP');
    }
  });

  const handleSaveKospPages = useCallback(async (pages: WordEditorPage[], config?: WordEditorConfig) => {
    await upsertMutation.mutateAsync({
      halaman_html: JSON.stringify(pages),
      config: JSON.stringify(config || initialConfig)
    });
  }, [selectedTahunId, upsertMutation, initialConfig]);

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
    compiledPages,
    initialConfig,
    isLoading: isLoadingTahun || isLoadingJurusan || isLoadingKospConfig || isLoadingMapping || isLoadingDudi,
    isSaving: upsertMutation.isPending,
    handleSaveKospPages,
    namaKepalaSekolah,
    wakasekKurikulum,
    mappingAllDataCount: mappingAllData.length
  };
};

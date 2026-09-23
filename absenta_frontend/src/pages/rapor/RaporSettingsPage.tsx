import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Save, 
  Calendar, 
  UserCheck, 
  Printer, 
  Sparkles,
  Building,
  Eye,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/layoutUtils';
import { raporApi, type RaporSettings } from '../../api/rapor.api';
import { useAcademicContext } from '../../hooks/useAcademicContext';
import { useCapabilities } from '../../hooks/useCapabilities';
import { AcademicContextBar } from '../../components/common/AcademicContextBar';
import { useIsMobile } from '../../hooks/useIsMobile';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '../../components/superadmin/infra/InfraErrorBoundary';
import { SectionCard } from '../../components/ui/SectionCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import { P5FacilitatorSettingsTab } from '../../components/rapor/p5/P5FacilitatorSettingsTab';

// Zod Schema Validation Guard (Pilar 25)
const raporSettingsSchema = z.object({
  tempat_terbit: z.string().min(2, 'Tempat terbit minimal 2 karakter'),
  kepsek_nama: z.string().min(2, 'Nama kepala sekolah minimal 2 karakter'),
  kepsek_nip: z.string().min(5, 'NIP kepala sekolah minimal 5 karakter'),
});

export const RaporSettingsPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>(
    tabFromUrl === 'tim_p5' || tabFromUrl === 'p5' ? 'tim_p5' : 'titimangsa'
  );
  const [showAdvancedDates, setShowAdvancedDates] = useState(false);

  useEffect(() => {
    if (tabFromUrl && (tabFromUrl === 'tim_p5' || tabFromUrl === 'titimangsa' || tabFromUrl === 'penandatangan' || tabFromUrl === 'format')) {
      setActiveTab(tabFromUrl);
    } else if (tabFromUrl === 'p5') {
      setActiveTab('tim_p5');
    }
  }, [tabFromUrl]);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabId);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Academic Context
  const academicCtx = useAcademicContext();

  // Capabilities & Authorization Guard (PoLP)
  const { isAdmin, isKurikulum, isKepsek, isTuHead, can } = useCapabilities();
  const canManage = Boolean(
    isAdmin || 
    isKurikulum || 
    isKepsek || 
    isTuHead || 
    can('academic.manage.academic') || 
    can('dashboard.view.kepsek') || 
    can('core.sekolah.update.profile')
  );

  // Form State: Tempat Terbit
  const [tempatTerbit, setTempatTerbit] = useState('Purwakarta');

  // Form State: 2 Titimangsa Pokok (Utama)
  const [tanggalRaporGanjil, setTanggalRaporGanjil] = useState('');
  const [tanggalRaporGenap, setTanggalRaporGenap] = useState('');

  // Form State: Opsi Tambahan / Lanjutan (Khusus)
  const [tanggalP5Ganjil, setTanggalP5Ganjil] = useState('');
  const [tanggalPtsGanjil, setTanggalPtsGanjil] = useState('');
  const [tanggalP5Genap, setTanggalP5Genap] = useState('');
  const [tanggalPtsGenap, setTanggalPtsGenap] = useState('');
  const [tanggalPlenoGenap, setTanggalPlenoGenap] = useState('');
  const [tanggalKelulusan, setTanggalKelulusan] = useState('');

  // Form State: Pejabat Penandatangan
  const [kepsekStatus, setKepsekStatus] = useState<'DEFINITIF' | 'PLT'>('DEFINITIF');
  const [kepsekNama, setKepsekNama] = useState('');
  const [kepsekNip, setKepsekNip] = useState('');

  // Form State: Format & Cetak
  const [ukuranKertas, setUkuranKertas] = useState<'A4' | 'F4'>('A4');
  const [tampilkanKop, setTampilkanKop] = useState(true);
  const [tampilkanQr, setTampilkanQr] = useState(true);

  // Detect whether active semester in toolbar is Ganjil or Genap
  const isGanjilActive = useMemo(() => {
    const semName = (academicCtx.activeSemester?.nama_semester || academicCtx.activeSemester?.nama || '').toLowerCase();
    return semName.includes('ganjil') || semName.includes('1') || semName.includes('smt 1');
  }, [academicCtx.activeSemester]);

  // Preview Simulator State (user can toggle preview between Ganjil and Genap)
  const [previewSemester, setPreviewSemester] = useState<'ganjil' | 'genap'>('ganjil');

  useEffect(() => {
    setPreviewSemester(isGanjilActive ? 'ganjil' : 'genap');
  }, [isGanjilActive]);

  // Fetch Settings based on selected TP & Semester
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['rapor-settings', academicCtx.selectedTahunPelajaran, academicCtx.selectedSemester],
    queryFn: () => raporApi.getRaporSettings({
      tahun_pelajaran_id: academicCtx.selectedTahunPelajaran,
      semester_id: academicCtx.selectedSemester,
    }),
    enabled: Boolean(academicCtx.selectedTahunPelajaran),
  });

  // Synchronize state when settings query returns
  useEffect(() => {
    if (settingsData?.data) {
      const s = settingsData.data as RaporSettings;
      setTempatTerbit(s.tempat_terbit || 'Purwakarta');

      // Titimangsa Pokok Ganjil & Genap
      setTanggalRaporGanjil(s.tanggal_rapor_ganjil || (isGanjilActive ? s.tanggal_rapor : '') || '');
      setTanggalRaporGenap(s.tanggal_rapor_genap || (!isGanjilActive ? s.tanggal_rapor : '') || '');

      // Opsi Tambahan / Khusus
      setTanggalP5Ganjil(s.tanggal_p5_ganjil || '');
      setTanggalPtsGanjil(s.tanggal_pts_ganjil || '');
      setTanggalP5Genap(s.tanggal_p5_genap || '');
      setTanggalPtsGenap(s.tanggal_pts_genap || '');
      setTanggalPlenoGenap(s.tanggal_pleno_genap || '');
      setTanggalKelulusan(s.tanggal_kelulusan || '');

      // Pejabat & format
      setKepsekStatus(s.kepsek_status || 'DEFINITIF');
      setKepsekNama(s.kepsek_nama || '');
      setKepsekNip(s.kepsek_nip || '');
      setUkuranKertas(s.ukuran_kertas || 'A4');
      setTampilkanKop(s.tampilkan_kop !== undefined ? s.tampilkan_kop : true);
      setTampilkanQr(s.tampilkan_qr !== undefined ? s.tampilkan_qr : true);
    }
  }, [settingsData, isGanjilActive]);

  // Mutation to save settings
  const saveSettingsMutation = useMutation({
    mutationFn: (payload: Partial<RaporSettings>) => raporApi.updateRaporSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapor-settings'] });
      toast.success('Pengaturan titimangsa rapor berhasil disimpan!');
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message || 'Gagal menyimpan pengaturan rapor');
    },
  });

  const handleSave = useCallback(() => {
    if (!canManage) {
      toast.error('Anda tidak memiliki wewenang untuk mengubah pengaturan dokumen rapor.');
      return;
    }

    const parseResult = raporSettingsSchema.safeParse({
      tempat_terbit: tempatTerbit.trim(),
      kepsek_nama: kepsekNama.trim(),
      kepsek_nip: kepsekNip.trim(),
    });

    if (!parseResult.success) {
      toast.error(parseResult.error.errors[0]?.message || 'Data pengaturan tidak valid');
      return;
    }

    if (!academicCtx.selectedTahunPelajaran) {
      toast.error('Konteks Tahun Pelajaran belum dipilih');
      return;
    }

    // Auto-fallback: jika tanggal P5 tidak diisi khusus, otomatis gunakan tanggal rapor semester
    const effectiveP5Ganjil = tanggalP5Ganjil || tanggalRaporGanjil;
    const effectiveP5Genap = tanggalP5Genap || tanggalRaporGenap;

    saveSettingsMutation.mutate({
      tahun_pelajaran_id: academicCtx.selectedTahunPelajaran,
      semester_id: academicCtx.selectedSemester || undefined,
      tempat_terbit: tempatTerbit.trim(),
      // Contextual active semester fallback
      tanggal_rapor: isGanjilActive ? tanggalRaporGanjil : tanggalRaporGenap,
      tanggal_rapor_p5: isGanjilActive ? effectiveP5Ganjil : effectiveP5Genap,
      tanggal_rapor_pts: isGanjilActive ? tanggalPtsGanjil : tanggalPtsGenap,
      tanggal_pleno: !isGanjilActive ? tanggalPlenoGenap : undefined,

      // Explicit Ganjil & Genap
      tanggal_rapor_ganjil: tanggalRaporGanjil,
      tanggal_p5_ganjil: effectiveP5Ganjil,
      tanggal_pts_ganjil: tanggalPtsGanjil,
      tanggal_rapor_genap: tanggalRaporGenap,
      tanggal_p5_genap: effectiveP5Genap,
      tanggal_pts_genap: tanggalPtsGenap,
      tanggal_pleno_genap: tanggalPlenoGenap,
      tanggal_kelulusan: tanggalKelulusan,

      kepsek_status: kepsekStatus,
      kepsek_nama: kepsekNama.trim(),
      kepsek_nip: kepsekNip.trim(),
      ukuran_kertas: ukuranKertas,
      tampilkan_kop: tampilkanKop,
      tampilkan_qr: tampilkanQr,
    });
  }, [
    academicCtx.selectedTahunPelajaran,
    academicCtx.selectedSemester,
    isGanjilActive,
    tempatTerbit,
    tanggalRaporGanjil,
    tanggalRaporGenap,
    tanggalP5Ganjil,
    tanggalPtsGanjil,
    tanggalP5Genap,
    tanggalPtsGenap,
    tanggalPlenoGenap,
    tanggalKelulusan,
    kepsekStatus,
    kepsekNama,
    kepsekNip,
    ukuranKertas,
    tampilkanKop,
    tampilkanQr,
    saveSettingsMutation,
    canManage,
  ]);

  const tabs = useMemo(() => [
    { id: 'titimangsa', label: isMobile ? '📅 Titimangsa' : '📅 Titimangsa Ganjil & Genap' },
    { id: 'tim_p5', label: isMobile ? '✨ Tema & Tim P5' : '✨ Tema Projek & Fasilitator P5' },
    { id: 'penandatangan', label: isMobile ? '✍️ Pejabat' : '✍️ Pejabat Penandatangan' },
    { id: 'format', label: isMobile ? '⚙️ Format Cetak' : '⚙️ Format & Output Cetak' },
  ], [isMobile]);

  const breadcrumbs = useMemo(() => [
    { label: 'Rapor', path: '/rapor/input' },
    { label: 'Pengaturan & Titimangsa', path: '/rapor/settings' },
  ], []);

  const formattedPreviewDate = useMemo(() => {
    const rawDate = previewSemester === 'ganjil' ? tanggalRaporGanjil : tanggalRaporGenap;
    if (!rawDate) return previewSemester === 'ganjil' ? '19 Des 2025' : '26 Jun 2026';
    try {
      return formatDate(rawDate, { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return rawDate;
    }
  }, [previewSemester, tanggalRaporGanjil, tanggalRaporGenap]);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Pengaturan Dokumen & Titimangsa Rapor"
        description="Pusat konfigurasi tanggal resmi titimangsa rapor semester ganjil, semester genap, dan pejabat penandatangan."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="rapor_settings_page"
        topSlot={
          <AcademicContextBar
            tahunPelajaranId={academicCtx.selectedTahunPelajaran}
            semesterId={academicCtx.selectedSemester}
            onTahunPelajaranChange={academicCtx.handleTpChange}
            onSemesterChange={academicCtx.handleSemesterChange}
            tpOptions={academicCtx.tpOptions}
            semesterOptions={academicCtx.semesterOptions}
            isLoadingTp={academicCtx.isLoadingTp}
            isLoadingSem={academicCtx.isLoadingSem}
            variant="toolbar"
          />
        }
        instruction={{
          title: 'Panduan Titimangsa Rapor Sekolah',
          description: 'Rapor resmi intrakurikuler dan projek P5 dibagikan 2 kali dalam setahun (akhir Semester Ganjil dan akhir Semester Genap).',
          items: [
            { text: 'Tentukan Tempat/Kota penerbitan rapor resmi satuan pendidikan.' },
            { text: 'Isi Tanggal Titimangsa Rapor Semester Ganjil (biasanya pertengahan/akhir Desember).' },
            { text: 'Isi Tanggal Titimangsa Rapor Semester Genap & Kenaikan Kelas (biasanya pertengahan/akhir Juni).' },
            { text: 'Buka "Opsi Tanggal Khusus" jika sekolah ingin menentukan tanggal rapat pleno, tanggal kelulusan, atau tanggal P5 terpisah.' },
            { text: 'Pastikan nama dan NIP Kepala Sekolah terverifikasi dengan benar sebagai penandatangan resmi.' }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6 pb-12 w-full min-w-0 max-w-full">
            {/* Navigation TabSwitcher */}
            <TabSwitcher
              activeTab={activeTab}
              onChange={handleTabChange}
              tabs={tabs}
            />

            {!canManage && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Mode Pratinjau (Read-Only). Anda dapat meninjau titimangsa dan pejabat penandatangan, namun hanya Waka Kurikulum, Kepala Sekolah, atau Kepala TU yang berwenang mengubah konfigurasi dokumen rapor.</span>
              </div>
            )}

            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Memuat konfigurasi dokumen rapor...</p>
              </div>
            ) : activeTab === 'tim_p5' ? (
              <div className="w-full min-w-0">
                <P5FacilitatorSettingsTab
                  tahunPelajaranId={academicCtx.selectedTahunPelajaran}
                  semesterId={academicCtx.selectedSemester}
                  canManage={canManage}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
                {/* Main Settings Form (2 Cols) */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* TAB 1: TITIMANGSA DUA SEMESTER POKOK */}
                  {activeTab === 'titimangsa' && (
                    <div className="space-y-6">
                      
                      {/* 1. KOTA PENERBITAN */}
                      <Card className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                        <div className="flex items-center gap-2">
                          <Building size={16} className="text-indigo-600 shrink-0" />
                          <div>
                            <h3 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-tight">
                              Tempat / Kota Penerbitan Rapor *
                            </h3>
                            <p className="text-[11px] text-slate-400">
                              Nama kota/kabupaten yang dicetak sebelum tanggal pada footer rapor (contoh: Purwakarta).
                            </p>
                          </div>
                        </div>
                        <div className="max-w-xs">
                          <Input
                            id="tempat-terbit-input"
                            aria-label="Tempat penerbitan rapor"
                            value={tempatTerbit}
                            onChange={(e) => setTempatTerbit(e.target.value)}
                            placeholder="Contoh: Purwakarta"
                            className="rounded-xl font-semibold"
                          />
                        </div>
                      </Card>

                      {/* 2. DUA TITIMANGSA POKOK: GANJIL & GENAP */}
                      <Card className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                        <div>
                          <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <Calendar size={16} className="text-indigo-600" />
                            Tanggal Titimangsa Pembagian Rapor Resmi
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Dua tanggal pokok pembagian rapor resmi dalam satu tahun ajaran. Otomatis berlaku untuk rapor intrakurikuler dan rapor projek P5.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          {/* SEMESTER GANJIL */}
                          <div className={`p-4 rounded-2xl border transition-all space-y-3 ${
                            isGanjilActive 
                              ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 shadow-xs' 
                              : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                                📅 Semester Ganjil (Smt 1)
                              </span>
                              {isGanjilActive && (
                                <Badge className="text-[9px] font-black bg-indigo-600 text-white px-2 py-0.5">
                                  AKTIF
                                </Badge>
                              )}
                            </div>
                            
                            <div className="space-y-1.5">
                              <label htmlFor="tgl-rapor-ganjil" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Tanggal Rapor Ganjil (Desember) *
                              </label>
                              <Input
                                id="tgl-rapor-ganjil"
                                type="date"
                                value={tanggalRaporGanjil}
                                onChange={(e) => setTanggalRaporGanjil(e.target.value)}
                                className="rounded-xl font-semibold bg-white dark:bg-slate-900"
                              />
                              <p className="text-[10px] text-slate-500 leading-tight">
                                Dicetak pada lembar Rapor Semester 1 & Projek P5 Ganjil.
                              </p>
                            </div>
                          </div>

                          {/* SEMESTER GENAP */}
                          <div className={`p-4 rounded-2xl border transition-all space-y-3 ${
                            !isGanjilActive 
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60 shadow-xs' 
                              : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                                📅 Semester Genap (Smt 2)
                              </span>
                              {!isGanjilActive && (
                                <Badge className="text-[9px] font-black bg-emerald-600 text-white px-2 py-0.5">
                                  AKTIF
                                </Badge>
                              )}
                            </div>
                            
                            <div className="space-y-1.5">
                              <label htmlFor="tgl-rapor-genap" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Tanggal Rapor Genap (Juni) *
                              </label>
                              <Input
                                id="tgl-rapor-genap"
                                type="date"
                                value={tanggalRaporGenap}
                                onChange={(e) => setTanggalRaporGenap(e.target.value)}
                                className="rounded-xl font-semibold bg-white dark:bg-slate-900"
                              />
                              <p className="text-[10px] text-slate-500 leading-tight">
                                Dicetak pada lembar Rapor Kenaikan Kelas & Projek P5 Genap.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* ACCORDION: OPSI TANGGAL KHUSUS / LANJUTAN */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setShowAdvancedDates(!showAdvancedDates)}
                            className="flex items-center justify-between w-full py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <SlidersHorizontal size={14} />
                              Opsi Tambahan: Tanggal Rapat Pleno, Kelulusan & PTS (Opsional)
                            </span>
                            {showAdvancedDates ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>

                          {showAdvancedDates && (
                            <div className="mt-4 p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                Kolom di bawah ini bersifat opsional. Jika dikosongkan, dokumen terkait akan otomatis mengikuti tanggal rapor semester di atas.
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div className="space-y-1">
                                  <label htmlFor="tgl-pleno-input" className="font-semibold text-slate-700 dark:text-slate-300">
                                    Tanggal Rapat Pleno Dewan Guru (Kenaikan Kelas/Kelulusan)
                                  </label>
                                  <Input
                                    id="tgl-pleno-input"
                                    type="date"
                                    value={tanggalPlenoGenap}
                                    onChange={(e) => setTanggalPlenoGenap(e.target.value)}
                                    className="rounded-xl font-semibold bg-white dark:bg-slate-900"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label htmlFor="tgl-kelulusan-input" className="font-semibold text-slate-700 dark:text-slate-300">
                                    Tanggal Kelulusan Resmi Kelas XII (Tingkat Akhir)
                                  </label>
                                  <Input
                                    id="tgl-kelulusan-input"
                                    type="date"
                                    value={tanggalKelulusan}
                                    onChange={(e) => setTanggalKelulusan(e.target.value)}
                                    className="rounded-xl font-semibold bg-white dark:bg-slate-900"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label htmlFor="tgl-pts-ganjil-input" className="font-semibold text-slate-700 dark:text-slate-300">
                                    Tanggal PTS/STS Semester Ganjil
                                  </label>
                                  <Input
                                    id="tgl-pts-ganjil-input"
                                    type="date"
                                    value={tanggalPtsGanjil}
                                    onChange={(e) => setTanggalPtsGanjil(e.target.value)}
                                    className="rounded-xl font-semibold bg-white dark:bg-slate-900"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label htmlFor="tgl-pts-genap-input" className="font-semibold text-slate-700 dark:text-slate-300">
                                    Tanggal PTS/STS Semester Genap
                                  </label>
                                  <Input
                                    id="tgl-pts-genap-input"
                                    type="date"
                                    value={tanggalPtsGenap}
                                    onChange={(e) => setTanggalPtsGenap(e.target.value)}
                                    className="rounded-xl font-semibold bg-white dark:bg-slate-900"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* TOMBOL SIMPAN UTAMA */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                          <Button
                            type="button"
                            variant="toolbarPrimary"
                            size="toolbar"
                            onClick={handleSave}
                            disabled={!canManage || saveSettingsMutation.isPending}
                            className="font-bold rounded-xl shadow-md"
                          >
                            <Save className="w-3.5 h-3.5 mr-1.5" />
                            Simpan Titimangsa
                          </Button>
                        </div>
                      </Card>

                    </div>
                  )}

                  {/* TAB 2: PEJABAT PENANDATANGAN */}
                  {activeTab === 'penandatangan' && (
                    <Card className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
                      <div>
                        <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                          <UserCheck size={16} className="text-indigo-600" />
                          Pejabat Kepala Sekolah Penandatangan
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Konfigurasi nama, status, dan NIP kepala sekolah yang dicetak pada seluruh dokumen rapor periode ini.
                        </p>
                      </div>

                      <div className="space-y-4 text-xs">
                        <div className="space-y-1">
                          <label htmlFor="kepsek-status-select" className="font-bold text-slate-700 dark:text-slate-300">
                            Status Pejabat Kepala Sekolah
                          </label>
                          <SearchableSelect
                            id="kepsek-status-select"
                            aria-label="Status pejabat kepala sekolah"
                            value={kepsekStatus}
                            onValueChange={(val) => setKepsekStatus(val as 'DEFINITIF' | 'PLT')}
                            options={[
                              { value: 'DEFINITIF', label: 'Kepala Sekolah Definitif' },
                              { value: 'PLT', label: 'Pelaksana Tugas (Plt. Kepala Sekolah)' },
                            ]}
                            placeholder="Pilih Status"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label htmlFor="kepsek-nama-input" className="font-bold text-slate-700 dark:text-slate-300">
                              Nama Lengkap & Gelar Kepala Sekolah *
                            </label>
                            <Input
                              id="kepsek-nama-input"
                              aria-label="Nama lengkap kepala sekolah"
                              value={kepsekNama}
                              onChange={(e) => setKepsekNama(e.target.value)}
                              placeholder="Contoh: Wahyu Tamimbarkah, S.Pd."
                              className="rounded-xl font-semibold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label htmlFor="kepsek-nip-input" className="font-bold text-slate-700 dark:text-slate-300">
                              Nomor Induk Pegawai (NIP) *
                            </label>
                            <Input
                              id="kepsek-nip-input"
                              aria-label="NIP kepala sekolah"
                              value={kepsekNip}
                              onChange={(e) => setKepsekNip(e.target.value)}
                              placeholder="Contoh: 197111022008011001"
                              className="rounded-xl font-semibold"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <Button
                          type="button"
                          variant="toolbarPrimary"
                          size="toolbar"
                          onClick={handleSave}
                          disabled={!canManage || saveSettingsMutation.isPending}
                          className="font-bold rounded-xl shadow-md"
                        >
                          <Save className="w-3.5 h-3.5 mr-1.5" />
                          Simpan Pejabat
                        </Button>
                      </div>
                    </Card>
                  )}

                  {/* TAB 3: FORMAT & CETAK */}
                  {activeTab === 'format' && (
                    <Card className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
                      <div>
                        <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                          <Printer size={16} className="text-indigo-600" />
                          Format & Standar Output Cetak
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Pengaturan tata letak dan visualisasi lembar PDF rapor resmi.
                        </p>
                      </div>

                      <div className="space-y-4 text-xs">
                        <div className="space-y-1">
                          <label htmlFor="kertas-select" className="font-bold text-slate-700 dark:text-slate-300">
                            Ukuran Kertas Default
                          </label>
                          <SearchableSelect
                            id="kertas-select"
                            aria-label="Ukuran kertas default"
                            value={ukuranKertas}
                            onValueChange={(val) => setUkuranKertas(val as 'A4' | 'F4')}
                            options={[
                              { value: 'A4', label: 'A4 (210 x 297 mm) - Standar Kemendikbud' },
                              { value: 'F4', label: 'F4 / Folio (215 x 330 mm)' },
                            ]}
                            placeholder="Pilih Ukuran Kertas"
                          />
                        </div>

                        <div className="pt-2 space-y-3">
                          <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <input
                              type="checkbox"
                              checked={tampilkanKop}
                              onChange={(e) => setTampilkanKop(e.target.checked)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                            />
                            <div>
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Sertakan Kop Surat Resmi Sekolah</span>
                              <span className="text-[10px] text-slate-400">Mencetak kop surat instansi lengkap dengan logo resmi di bagian atas rapor.</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <input
                              type="checkbox"
                              checked={tampilkanQr}
                              onChange={(e) => setTampilkanQr(e.target.checked)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                            />
                            <div>
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Barcode / QR Validasi Otentikasi</span>
                              <span className="text-[10px] text-slate-400">Menyertakan QR code untuk pemindaian keaslian dokumen oleh orang tua atau pihak dinas.</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <Button
                          type="button"
                          variant="toolbarPrimary"
                          size="toolbar"
                          onClick={handleSave}
                          disabled={!canManage || saveSettingsMutation.isPending}
                          className="font-bold rounded-xl shadow-md"
                        >
                          <Save className="w-3.5 h-3.5 mr-1.5" />
                          Simpan Format Cetak
                        </Button>
                      </div>
                    </Card>
                  )}

                </div>

                {/* Sidebar Preview: Titimangsa & Tanda Tangan Cetak (1 Col) */}
                <div className="space-y-4">
                  <Card className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                        <Eye size={14} className="text-indigo-600" />
                        Pratinjau Footer Resmi
                      </span>
                      <Badge variant="outline" className="text-[9px] font-bold border-indigo-200 dark:border-indigo-900 text-indigo-600">
                        LIVE PREVIEW
                      </Badge>
                    </div>

                    {/* Toggle Preview Semester */}
                    <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setPreviewSemester('ganjil')}
                        className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                          previewSemester === 'ganjil'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs font-black'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Semester Ganjil
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewSemester('genap')}
                        className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                          previewSemester === 'genap'
                            ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs font-black'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Semester Genap
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Format visual titimangsa dan tanda tangan resmi yang akan dicetak di bagian bawah lembar dokumen {previewSemester === 'ganjil' ? 'Semester Ganjil' : 'Semester Genap'}.
                    </p>

                    {/* Rendered Signature Box Simulator */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 font-sans text-xs space-y-5">
                      {/* Place and Date */}
                      <div className="text-right font-medium text-[11px] text-slate-600 dark:text-slate-400">
                        {tempatTerbit || 'Purwakarta'}, {formattedPreviewDate}
                      </div>

                      {/* Parents & Homeroom Teacher */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center text-[10px]">
                        <div>
                          <span className="text-slate-500 font-bold block mb-10">Orang Tua/Wali Siswa,</span>
                          <span className="text-slate-400 font-mono">...................................</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block mb-10">Wali Kelas,</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 underline block">Guru Wali Kelas, S.Pd.</span>
                          <span className="text-slate-400 font-mono text-[9px]">NIP. 199110292022212020</span>
                        </div>
                      </div>

                      {/* Principal Signature */}
                      <div className="text-center pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[10px] space-y-1">
                        <span className="text-slate-400 block text-[9px]">Mengetahui;</span>
                        <span className="text-slate-600 dark:text-slate-300 font-bold block mb-10">
                          {kepsekStatus === 'PLT' ? 'Plt. Kepala Sekolah,' : 'Kepala Sekolah,'}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 underline block">
                          {kepsekNama || 'Wahyu Tamimbarkah, S.Pd.'}
                        </span>
                        <span className="text-slate-400 font-mono text-[9px]">
                          NIP. {kepsekNip || '197111022008011001'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-indigo-50/50 dark:bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                      <Sparkles size={14} className="text-indigo-600 shrink-0" />
                      <span>Perubahan disimpan per Tahun Pelajaran dan otomatis diterapkan ke seluruh siswa.</span>
                    </div>
                  </Card>
                </div>

              </div>
            )}

          </div>
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default RaporSettingsPage;

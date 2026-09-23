import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings2, 
  FileText, 
  Save, 
  Calendar, 
  UserCheck, 
  Printer, 
  Sparkles,
  CheckCircle2,
  Building,
  Eye,
  ShieldAlert
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
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { TabSwitcher } from '../../components/ui/TabSwitcher';

// Zod Schema Validation Guard (Pilar 25)
const raporSettingsSchema = z.object({
  tempat_terbit: z.string().min(2, 'Tempat terbit minimal 2 karakter'),
  kepsek_nama: z.string().min(2, 'Nama kepala sekolah minimal 2 karakter'),
  kepsek_nip: z.string().min(5, 'NIP kepala sekolah minimal 5 karakter'),
});

export const RaporSettingsPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<string>('titimangsa');

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

  // Form State: Titimangsa & Tanggal Dokumen
  const [tempatTerbit, setTempatTerbit] = useState('Purwakarta');
  const [tanggalRapor, setTanggalRapor] = useState('');
  const [tanggalRaporP5, setTanggalRaporP5] = useState('');
  const [tanggalRaporPts, setTanggalRaporPts] = useState('');
  const [tanggalPleno, setTanggalPleno] = useState('');

  // Form State: Pejabat Penandatangan
  const [kepsekStatus, setKepsekStatus] = useState<'DEFINITIF' | 'PLT'>('DEFINITIF');
  const [kepsekNama, setKepsekNama] = useState('');
  const [kepsekNip, setKepsekNip] = useState('');

  // Form State: Format & Cetak
  const [ukuranKertas, setUkuranKertas] = useState<'A4' | 'F4'>('A4');
  const [tampilkanKop, setTampilkanKop] = useState(true);
  const [tampilkanQr, setTampilkanQr] = useState(true);

  // Fetch Settings based on selected TP & Semester
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['rapor-settings', academicCtx.selectedTahunPelajaran, academicCtx.selectedSemester],
    queryFn: () => raporApi.getRaporSettings({
      tahun_pelajaran_id: academicCtx.selectedTahunPelajaran,
      semester_id: academicCtx.selectedSemester,
    }),
    enabled: Boolean(academicCtx.selectedTahunPelajaran && academicCtx.selectedSemester),
  });

  // Synchronize state when settings query returns
  useEffect(() => {
    if (settingsData?.data) {
      const s = settingsData.data as RaporSettings;
      setTempatTerbit(s.tempat_terbit || 'Purwakarta');
      setTanggalRapor(s.tanggal_rapor || '');
      setTanggalRaporP5(s.tanggal_rapor_p5 || '');
      setTanggalRaporPts(s.tanggal_rapor_pts || '');
      setTanggalPleno(s.tanggal_pleno || '');
      setKepsekStatus(s.kepsek_status || 'DEFINITIF');
      setKepsekNama(s.kepsek_nama || '');
      setKepsekNip(s.kepsek_nip || '');
      setUkuranKertas(s.ukuran_kertas || 'A4');
      setTampilkanKop(s.tampilkan_kop !== undefined ? s.tampilkan_kop : true);
      setTampilkanQr(s.tampilkan_qr !== undefined ? s.tampilkan_qr : true);
    }
  }, [settingsData]);

  // Mutation to save settings
  const saveSettingsMutation = useMutation({
    mutationFn: (payload: Partial<RaporSettings>) => raporApi.updateRaporSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapor-settings'] });
      toast.success('Pengaturan dokumen rapor berhasil disimpan!');
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

    saveSettingsMutation.mutate({
      tahun_pelajaran_id: academicCtx.selectedTahunPelajaran,
      semester_id: academicCtx.selectedSemester || undefined,
      tempat_terbit: tempatTerbit.trim(),
      tanggal_rapor: tanggalRapor,
      tanggal_rapor_p5: tanggalRaporP5,
      tanggal_rapor_pts: tanggalRaporPts,
      tanggal_pleno: tanggalPleno,
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
    tempatTerbit,
    tanggalRapor,
    tanggalRaporP5,
    tanggalRaporPts,
    tanggalPleno,
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
    { id: 'titimangsa', label: isMobile ? '📅 Titimangsa' : '📅 Titimangsa & Tanggal Dokumen' },
    { id: 'penandatangan', label: isMobile ? '✍️ Pejabat' : '✍️ Pejabat Penandatangan' },
    { id: 'format', label: isMobile ? '⚙️ Format Cetak' : '⚙️ Format & Output Cetak' },
  ], [isMobile]);

  const breadcrumbs = useMemo(() => [
    { label: 'Rapor', path: '/rapor/input' },
    { label: 'Pengaturan & Titimangsa', path: '/rapor/settings' },
  ], []);

  const formattedPreviewDate = useMemo(() => {
    const rawDate = tanggalRaporP5 || tanggalRapor;
    if (!rawDate) return '22 Des 2025';
    try {
      return formatDate(rawDate, { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return rawDate;
    }
  }, [tanggalRaporP5, tanggalRapor]);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Pengaturan Dokumen & Titimangsa Rapor"
        description="Pusat konfigurasi tanggal terbit resmi, titimangsa, dan pejabat penandatangan rapor intrakurikuler dan projek P5."
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
          title: 'Panduan Pengaturan Dokumen Rapor',
          description: 'Kelola data titimangsa dan pejabat penandatangan resmi yang otomatis dicetak pada lembar Rapor Semester dan Rapor P5.',
          items: [
            { text: 'Pilih Tahun Pelajaran dan Semester aktif pada toolbar bagian atas.' },
            { text: 'Tentukan kota dan tanggal resmi pembagian rapor (Titimangsa) untuk semester berjalan.' },
            { text: 'Pastikan nama dan NIP Kepala Sekolah terverifikasi dengan benar sebagai pejabat penandatangan resmi.' },
            { text: 'Periksa kotak simulasi pratinjau tanda tangan di sebelah kanan sebelum menyimpan.' }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6 pb-12 w-full min-w-0 max-w-full">
            {/* Navigation TabSwitcher */}
            <TabSwitcher
              activeTab={activeTab}
              onChange={setActiveTab}
              tabs={tabs}
            />

            {!canManage && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Mode Pratinjau (Read-Only). Anda dapat meninjau titimangsa dan pejabat penandatangan, namun hanya Waka Kurikulum, Kepala Sekolah, atau Kepala TU yang berwenang mengubah konfigurasi dokumen rapor.</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
              {/* Main Settings Form (2 Cols) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* TAB 1: TITIMANGSA & TANGGAL DOKUMEN */}
                {activeTab === 'titimangsa' && (
                  <Card className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
                    <div>
                      <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                        <Calendar size={16} className="text-indigo-600" />
                        Titimangsa & Tanggal Dokumen Resmi
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Menentukan tanggal penerbitan yang tertera di sudut bawah rapor cetak.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <label htmlFor="tempat-terbit-input" className="font-bold text-slate-700 dark:text-slate-300">
                          Tempat / Kota Penerbitan Rapor *
                        </label>
                        <Input
                          id="tempat-terbit-input"
                          aria-label="Tempat penerbitan rapor"
                          value={tempatTerbit}
                          onChange={(e) => setTempatTerbit(e.target.value)}
                          placeholder="Contoh: Purwakarta"
                          className="rounded-xl"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="tgl-rapor-p5-input" className="font-bold text-slate-700 dark:text-slate-300">
                          Tanggal Terbit Rapor Projek P5 *
                        </label>
                        <Input
                          id="tgl-rapor-p5-input"
                          type="date"
                          aria-label="Tanggal rapor projek P5"
                          value={tanggalRaporP5}
                          onChange={(e) => setTanggalRaporP5(e.target.value)}
                          className="rounded-xl font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="tgl-rapor-input" className="font-bold text-slate-700 dark:text-slate-300">
                          Tanggal Rapor Akhir Semester (PAS/SAS)
                        </label>
                        <Input
                          id="tgl-rapor-input"
                          type="date"
                          aria-label="Tanggal rapor akhir semester"
                          value={tanggalRapor}
                          onChange={(e) => setTanggalRapor(e.target.value)}
                          className="rounded-xl font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="tgl-pts-input" className="font-bold text-slate-700 dark:text-slate-300">
                          Tanggal Rapor Tengah Semester (PTS/STS)
                        </label>
                        <Input
                          id="tgl-pts-input"
                          type="date"
                          aria-label="Tanggal rapor tengah semester"
                          value={tanggalRaporPts}
                          onChange={(e) => setTanggalRaporPts(e.target.value)}
                          className="rounded-xl font-semibold"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label htmlFor="tgl-pleno-input" className="font-bold text-slate-700 dark:text-slate-300">
                          Tanggal Rapat Pleno Dewan Guru (Kenaikan Kelas / Kelulusan)
                        </label>
                        <Input
                          id="tgl-pleno-input"
                          type="date"
                          aria-label="Tanggal rapat pleno"
                          value={tanggalPleno}
                          onChange={(e) => setTanggalPleno(e.target.value)}
                          className="rounded-xl font-semibold"
                        />
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
                        Simpan Titimangsa
                      </Button>
                    </div>
                  </Card>
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
                          Status Jabatan Kepala Sekolah
                        </label>
                        <SearchableSelect
                          id="kepsek-status-select"
                          aria-label="Status jabatan kepala sekolah"
                          value={kepsekStatus}
                          onValueChange={(val) => setKepsekStatus(val as 'DEFINITIF' | 'PLT')}
                          options={[
                            { value: 'DEFINITIF', label: 'Kepala Sekolah (Definitif)' },
                            { value: 'PLT', label: 'Plt. Kepala Sekolah (Pelaksana Tugas)' },
                          ]}
                          placeholder="Pilih Status Jabatan"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label htmlFor="kepsek-nama-input" className="font-bold text-slate-700 dark:text-slate-300">
                            Nama Lengkap & Gelar Kepala Sekolah *
                          </label>
                          <Input
                            id="kepsek-nama-input"
                            aria-label="Nama kepala sekolah"
                            value={kepsekNama}
                            onChange={(e) => setKepsekNama(e.target.value)}
                            placeholder="Contoh: Wahyu Tamimbarkah, S.Pd."
                            className="rounded-xl font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="kepsek-nip-input" className="font-bold text-slate-700 dark:text-slate-300">
                            NIP Kepala Sekolah *
                          </label>
                          <Input
                            id="kepsek-nip-input"
                            aria-label="NIP kepala sekolah"
                            value={kepsekNip}
                            onChange={(e) => setKepsekNip(e.target.value)}
                            placeholder="Contoh: 197111022008011001"
                            className="rounded-xl font-mono"
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
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Sertakan Kop Surat & Logo Sekolah</span>
                            <span className="text-[10px] text-slate-400">Menampilkan identitas header resmi sekolah pada halaman pertama rapor.</span>
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

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Format visual titimangsa dan tanda tangan yang akan dicetak di bagian bawah Rapor Semester & Rapor P5.
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

          </div>
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default RaporSettingsPage;

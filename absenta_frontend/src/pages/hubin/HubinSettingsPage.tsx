import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Award, 
  Sliders, 
  FileText, 
  Cloud, 
  Save, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { hubinApi } from '../../api/hubin.api';
import { useTahunPelajaranOptions } from '../../hooks/useTahunPelajaranOptions';
import { useDudiOptions } from '../../hooks/useDudiOptions';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { InfraErrorBoundary } from '../../components/superadmin/infra/InfraErrorBoundary';
import { SectionCard } from '../../components/ui/SectionCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { TabSwitcher } from '../../components/ui/TabSwitcher';

// Zod Schema Validation Guard (Pilar 25)
const sertifikatSettingsSchema = z.object({
  nomorSurat: z.string().min(3, 'Nomor surat minimal 3 karakter'),
  tempatTerbit: z.string().min(2, 'Tempat terbit minimal 2 karakter'),
  durasiJp: z.string().min(1, 'Durasi JP wajib diisi'),
});

const deskripsiTpSchema = z.object({
  mitra_id: z.string().min(1, 'Mitra industri wajib dipilih'),
  deskripsi_tp: z.string().min(5, 'Deskripsi capaian pembelajaran minimal 5 karakter'),
});

interface DeskripsiTpItem {
  id: string;
  Mitra?: { id: string; nama: string };
  deskripsi_tp: string;
}

export const HubinSettingsPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const urlTp = searchParams.get('tp');

  const [activeTab, setActiveTab] = useState<string>(
    urlTab && ['sertifikat', 'skema', 'deskripsi', 'storage'].includes(urlTab) ? urlTab : 'sertifikat'
  );

  // Sync tab from URL if changed
  useEffect(() => {
    if (urlTab && ['sertifikat', 'skema', 'deskripsi', 'storage'].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  // Academic Year selection for certificate and assessment scheme context
  const { options: tpOptions, activeYear, isLoading: isLoadingTp } = useTahunPelajaranOptions();
  const [selectedTp, setSelectedTp] = useState<string>(urlTp || '');

  useEffect(() => {
    if (urlTp && urlTp !== selectedTp) {
      setSelectedTp(urlTp);
    } else if (activeYear?.id && !selectedTp && !urlTp) {
      setSelectedTp(activeYear.id);
    }
  }, [urlTp, activeYear, selectedTp]);

  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', newTab);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleTpChange = useCallback((newTp: string) => {
    setSelectedTp(newTp);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newTp) {
        next.set('tp', newTp);
      } else {
        next.delete('tp');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Query Hubin Settings scoped to selected academic year
  const { data: rawSettings, isFetching: isFetchingSettings } = useQuery({
    queryKey: ['hubin-settings', selectedTp],
    queryFn: () => hubinApi.getSettings({ tahun_pelajaran_id: selectedTp || undefined }),
    enabled: true,
  });

  const settings = useMemo(() => {
    return rawSettings || {};
  }, [rawSettings]);

  // Form State: Tab 1 - Sertifikat & Nomor Surat Resmi TU
  const [nomorSurat, setNomorSurat] = useState('');
  const [tempatTerbit, setTempatTerbit] = useState('Purwakarta');
  const [tanggalTerbit, setTanggalTerbit] = useState('');
  const [durasiJp, setDurasiJp] = useState('792');
  const [penandatanganNama, setPenandatanganNama] = useState('');
  const [penandatanganNip, setPenandatanganNip] = useState('');

  // Form State: Tab 2 - Skema & Bobot Penilaian
  const [formMode, setFormMode] = useState<'DUDI_ONLY' | 'COMPOSITE'>('DUDI_ONLY');
  const [formWeightDudi, setFormWeightDudi] = useState<number>(70);
  const [formWeightLaporan, setFormWeightLaporan] = useState<number>(15);
  const [formWeightSidang, setFormWeightSidang] = useState<number>(15);

  // Form State: Tab 3 - Master Deskripsi TP
  const { options: mitraOptions } = useDudiOptions();
  const [selectedMitra, setSelectedMitra] = useState('');
  const [deskripsiTpText, setDeskripsiTpText] = useState('');

  const { data: rawDeskripsiList, isLoading: isLoadingDeskripsi } = useQuery({
    queryKey: ['deskripsi-tp-list', selectedMitra],
    queryFn: () => hubinApi.getSettingDeskripsiPklList({ mitra_id: selectedMitra || undefined }),
  });

  const deskripsiList = useMemo<DeskripsiTpItem[]>(() => {
    const raw = (rawDeskripsiList as { data?: DeskripsiTpItem[] })?.data;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(rawDeskripsiList)) return rawDeskripsiList as DeskripsiTpItem[];
    return [];
  }, [rawDeskripsiList]);

  // Form State: Tab 4 - Cloud Storage
  const [folderUrl, setFolderUrl] = useState('');
  const [driveMode, setDriveMode] = useState('simulated');

  // Synchronize state when settings query returns
  useEffect(() => {
    if (settings) {
      setNomorSurat(settings.nomorSuratSertifikat || '425.1/0630/SMKN1PLD-KCD Wil.IV');
      setTempatTerbit(settings.tempatTerbit || 'Purwakarta');
      setTanggalTerbit(settings.tanggalTerbitSertifikat || '');
      setDurasiJp(String(settings.durasiJp || '792'));
      setPenandatanganNama(settings.penandatanganNama || '');
      setPenandatanganNip(settings.penandatanganNip || '');

      setFormMode(settings.assessmentMode || 'DUDI_ONLY');
      setFormWeightDudi(settings.weightDudi ?? 70);
      setFormWeightLaporan(settings.weightLaporan ?? 15);
      setFormWeightSidang(settings.weightSidang ?? 15);

      setFolderUrl(settings.folderUrl || '');
      setDriveMode(settings.driveMode || 'simulated');
    }
  }, [settings]);

  // Mutation to save settings
  const saveSettingsMutation = useMutation({
    mutationFn: (payload: {
      tahun_pelajaran_id?: string;
      nomorSuratSertifikat?: string;
      tempatTerbit?: string;
      tanggalTerbitSertifikat?: string;
      durasiJp?: string | number;
      penandatanganNama?: string;
      penandatanganNip?: string;
      assessmentMode?: 'DUDI_ONLY' | 'COMPOSITE';
      weightDudi?: number;
      weightLaporan?: number;
      weightSidang?: number;
      folderUrl?: string;
      driveMode?: string;
    }) => hubinApi.updateSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      toast.success('Pengaturan & referensi Hubin berhasil disimpan!');
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message || 'Gagal menyimpan pengaturan Hubin');
    },
  });

  // Handler Tab 1: Simpan Referensi Sertifikat
  const handleSaveSertifikat = useCallback(() => {
    const parseResult = sertifikatSettingsSchema.safeParse({
      nomorSurat: nomorSurat.trim(),
      tempatTerbit: tempatTerbit.trim(),
      durasiJp: durasiJp.trim(),
    });

    if (!parseResult.success) {
      toast.error(parseResult.error.errors[0]?.message || 'Data sertifikat tidak valid');
      return;
    }

    saveSettingsMutation.mutate({
      tahun_pelajaran_id: selectedTp || undefined,
      nomorSuratSertifikat: nomorSurat.trim(),
      tempatTerbit: tempatTerbit.trim(),
      tanggalTerbitSertifikat: tanggalTerbit.trim(),
      durasiJp: durasiJp.trim(),
      penandatanganNama: penandatanganNama.trim(),
      penandatanganNip: penandatanganNip.trim(),
    });
  }, [selectedTp, nomorSurat, tempatTerbit, tanggalTerbit, durasiJp, penandatanganNama, penandatanganNip, saveSettingsMutation]);

  // Handler Tab 2: Simpan Skema & Bobot
  const handleSaveSkema = useCallback(() => {
    if (formMode === 'COMPOSITE') {
      const total = formWeightDudi + formWeightLaporan + formWeightSidang;
      if (total !== 100) {
        toast.error(`Total persentase bobot harus pas 100% (Saat ini: ${total}%)`);
        return;
      }
    }
    saveSettingsMutation.mutate({
      tahun_pelajaran_id: selectedTp || undefined,
      assessmentMode: formMode,
      weightDudi: formWeightDudi,
      weightLaporan: formWeightLaporan,
      weightSidang: formWeightSidang,
    });
  }, [selectedTp, formMode, formWeightDudi, formWeightLaporan, formWeightSidang, saveSettingsMutation]);

  // Handler Tab 3: Simpan Deskripsi TP
  const saveDeskripsiTpMutation = useMutation({
    mutationFn: (data: { mitra_id: string; deskripsi_tp: string }) =>
      hubinApi.upsertSettingDeskripsiPkl(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deskripsi-tp-list'] });
      toast.success('Master deskripsi Capaian TP berhasil disimpan!');
      setDeskripsiTpText('');
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message || 'Gagal menyimpan deskripsi TP');
    },
  });

  const handleSaveDeskripsiTp = useCallback(() => {
    const parseResult = deskripsiTpSchema.safeParse({
      mitra_id: selectedMitra,
      deskripsi_tp: deskripsiTpText.trim(),
    });

    if (!parseResult.success) {
      toast.error(parseResult.error.errors[0]?.message || 'Data deskripsi tidak valid');
      return;
    }

    saveDeskripsiTpMutation.mutate({
      mitra_id: selectedMitra,
      deskripsi_tp: deskripsiTpText.trim(),
    });
  }, [selectedMitra, deskripsiTpText, saveDeskripsiTpMutation]);

  // Handler Tab 4: Simpan Storage
  const handleSaveStorage = useCallback(() => {
    saveSettingsMutation.mutate({
      folderUrl: folderUrl.trim(),
      driveMode,
    });
  }, [folderUrl, driveMode, saveSettingsMutation]);

  const breadcrumbs = useMemo(() => [
    { label: 'Hubin & PKL', path: '/hubin/workspace' },
    { label: 'Pengaturan & Referensi' }
  ], []);

  const tabs = useMemo(() => [
    { id: 'sertifikat', label: '📜 Nomor Surat & Sertifikat' },
    { id: 'skema', label: '⚖️ Skema & Bobot Penilaian' },
    { id: 'deskripsi', label: '📝 Master Capaian / TP PKL' },
    { id: 'storage', label: '☁️ Cloud Storage & Berkas' }
  ], []);

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Pengaturan & Referensi Data Hubin"
      description="Pusat konfigurasi dan referensi resmi persuratan sertifikat, skema penilaian, master capaian pembelajaran, serta arsip digital PKL."
    >
      <InfraErrorBoundary>
        <AcademicPageLayout
          title="Pusat Pengaturan & Referensi Hubin"
          description="Source of truth untuk nomor surat sertifikat PKL resmi dari TU per tahun pelajaran, skema penilaian, dan arsip digital."
          breadcrumbs={breadcrumbs}
          hardeningModuleKey="hubin_settings"
          instruction={{
            title: "Panduan Referensi & Pengaturan Hubin",
            description: "Halaman ini berfungsi sebagai referensi induk tunggal (Source of Truth) untuk seluruh operasional Hubin & PKL.",
            items: [
              { text: "Tab Nomor Surat & Sertifikat: Masukkan 1 nomor surat resmi dari TU untuk 1 angkatan/tahun pelajaran berjalan." },
              { text: "Tab Skema & Bobot: Atur pembagian persentase penilaian antara industri DUDI, laporan, dan seminar sidang." },
              { text: "Tab Master Capaian: Definisikan standar narasi deskripsi TP PKL yang otomatis dicetak di lembar transkrip nilai." },
              { text: "Tab Cloud Storage: Sambungkan folder Google Drive untuk arsip portofolio dan dokumen PKL siswa." }
            ]
          }}
        >
          <SectionCard fullWidth className="p-4 sm:p-6 space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
            {/* Topbar Tab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <TabSwitcher
                tabs={tabs}
                activeTab={activeTab}
                onChange={handleTabChange}
                ariaLabel="Kategori Pengaturan Hubin"
              />
              {isFetchingSettings && (
                <div className="flex items-center gap-1.5 text-xs text-indigo-500 font-medium self-end sm:self-auto">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Sinkronisasi referensi...</span>
                </div>
              )}
            </div>

            {/* TAB 1: SERTIFIKAT & NOMOR SURAT RESMI TU */}
            {activeTab === 'sertifikat' && (
              <div className="space-y-6">
                {/* Selector Konteks Tahun Pelajaran */}
                <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Konteks Tahun Pelajaran Angkatan</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Pilih tahun pelajaran untuk mengelola nomor surat resmi dan tanggal arsip sertifikat angkatan tersebut.
                      </p>
                    </div>
                  </div>
                  <div className="w-full sm:w-64 shrink-0">
                    <SearchableSelect
                      id="select-tp-sertifikat"
                      aria-label="Pilih tahun pelajaran untuk referensi sertifikat"
                      value={selectedTp}
                      onValueChange={handleTpChange}
                      options={tpOptions}
                      placeholder="Pilih Tahun Pelajaran"
                      isLoading={isLoadingTp}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Form Entri Data */}
                  <div className="lg:col-span-2 space-y-4">
                    <Card className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                        <Award size={18} className="text-amber-500" />
                        <h3 className="font-bold text-sm">Data Referensi Sertifikat Resmi (Source of Truth)</h3>
                      </div>

                      {/* Nomor Surat TU */}
                      <div>
                        <label htmlFor="input-nomor-surat" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Nomor Surat Sertifikat Resmi dari TU (1 Angkatan) <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          id="input-nomor-surat"
                          aria-label="Nomor surat resmi dari TU untuk 1 angkatan"
                          type="text"
                          placeholder="Contoh: 425.1/0630/SMKN1PLD-KCD Wil.IV/2025"
                          value={nomorSurat}
                          onChange={(e) => setNomorSurat(e.target.value)}
                          className="font-mono font-bold text-indigo-900 dark:text-indigo-200 bg-slate-50 dark:bg-slate-800"
                        />
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          Nomor surat yang didapatkan dari Buku Agenda Surat Keluar TU. Berlaku otomatis untuk seluruh sertifikat siswa di Tahun Pelajaran ini.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Tempat Penerbitan */}
                        <div>
                          <label htmlFor="input-tempat-terbit" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Tempat / Kota Penerbitan
                          </label>
                          <Input
                            id="input-tempat-terbit"
                            aria-label="Tempat atau kota penerbitan sertifikat"
                            type="text"
                            placeholder="Purwakarta"
                            value={tempatTerbit}
                            onChange={(e) => setTempatTerbit(e.target.value)}
                          />
                        </div>

                        {/* Tanggal Penerbitan */}
                        <div>
                          <label htmlFor="input-tanggal-terbit" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Tanggal Terbit Resmi Sertifikat
                          </label>
                          <Input
                            id="input-tanggal-terbit"
                            aria-label="Tanggal resmi penerbitan sertifikat"
                            type="text"
                            placeholder="Contoh: 22 Desember 2025"
                            value={tanggalTerbit}
                            onChange={(e) => setTanggalTerbit(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Durasi Jam Pelajaran (JP) */}
                      <div>
                        <label htmlFor="input-durasi-jp" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Total Jam Pelajaran (Durasi JP PKL)
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="input-durasi-jp"
                            aria-label="Total durasi jam pelajaran PKL"
                            type="number"
                            placeholder="792"
                            value={durasiJp}
                            onChange={(e) => setDurasiJp(e.target.value)}
                            className="w-32 font-bold"
                          />
                          <span className="text-xs font-bold text-slate-500">Jam Pelajaran (JP)</span>
                        </div>
                      </div>

                      {/* Penandatangan Sertifikat */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pejabat Penandatangan Sertifikat</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="input-ttd-nama" className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Nama Kepala Sekolah / Pejabat
                            </label>
                            <Input
                              id="input-ttd-nama"
                              aria-label="Nama pejabat penandatangan sertifikat"
                              type="text"
                              placeholder="Nama & Gelar Lengkap"
                              value={penandatanganNama}
                              onChange={(e) => setPenandatanganNama(e.target.value)}
                            />
                          </div>
                          <div>
                            <label htmlFor="input-ttd-nip" className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              NIP Pejabat Penandatangan
                            </label>
                            <Input
                              id="input-ttd-nip"
                              aria-label="NIP pejabat penandatangan sertifikat"
                              type="text"
                              placeholder="19711102..."
                              value={penandatanganNip}
                              onChange={(e) => setPenandatanganNip(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-3">
                        <Button
                          type="button"
                          variant="primary"
                          onClick={handleSaveSertifikat}
                          disabled={saveSettingsMutation.isPending}
                          className="w-full sm:w-auto font-bold rounded-xl flex items-center gap-2"
                        >
                          <Save size={16} />
                          {saveSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan Referensi Sertifikat'}
                        </Button>
                      </div>
                    </Card>
                  </div>

                  {/* Right Column: Live Pratinjau Format Dokumen */}
                  <div className="space-y-4">
                    <Card className="p-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl shadow-md border border-slate-800 space-y-4">
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                        <Sparkles size={16} />
                        <span>Pratinjau Kop & Nomor Surat</span>
                      </div>

                      <div className="p-4 bg-white/10 rounded-xl backdrop-blur-xs border border-white/10 space-y-2 text-center">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Sertifikat Praktik Kerja Lapangan</div>
                        <div className="text-sm font-black font-mono text-amber-300 break-all">
                          Nomor : {nomorSurat || 'Belum diisi'}
                        </div>
                        <div className="text-[11px] text-slate-300">
                          {tempatTerbit || 'Kota'}, {tanggalTerbit || 'Tanggal Belum Diatur'}
                        </div>
                        <div className="text-[10px] text-indigo-300 font-semibold mt-1">
                          Durasi Resmi: {durasiJp || '0'} Jam Pelajaran
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-2">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span>Otomatis diterapkan ke seluruh sertifikat siswa pada tahun ajaran ini.</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span>Tersimpan permanen sebagai arsip resmi dan tidak terpengaruh pergantian tahun ajaran.</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SKEMA & BOBOT PENILAIAN */}
            {activeTab === 'skema' && (
              <div className="max-w-3xl space-y-6">
                {/* Selector Konteks Tahun Pelajaran untuk Skema Nilai */}
                <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Konteks Tahun Pelajaran Skema Nilai</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Tentukan skema dan persentase bobot penilaian khusus untuk angkatan/tahun ajaran yang dipilih.
                      </p>
                    </div>
                  </div>
                  <div className="w-full sm:w-64 shrink-0">
                    <SearchableSelect
                      id="select-tp-skema"
                      aria-label="Pilih tahun pelajaran untuk skema penilaian"
                      value={selectedTp}
                      onValueChange={handleTpChange}
                      options={tpOptions}
                      placeholder="Pilih Tahun Pelajaran"
                      isLoading={isLoadingTp}
                    />
                  </div>
                </div>

                <Card className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                    <Sliders size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-bold text-sm">Pengaturan Skema Evaluasi Nilai PKL</h3>
                  </div>

                  {/* Mode Penilaian */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Mode Penilaian PKL Sekolah:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormMode('DUDI_ONLY')}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          formMode === 'DUDI_ONLY'
                            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 font-bold ring-2 ring-indigo-500/30'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold flex items-center gap-2">
                            <span>🏢</span> Hanya Industri (DUDI 100%)
                          </span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            formMode === 'DUDI_ONLY' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {formMode === 'DUDI_ONLY' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                          Nilai akhir 100% mutlak diambil dari 8 indikator capaian industri yang dinilai pembimbing DUDI.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormMode('COMPOSITE')}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          formMode === 'COMPOSITE'
                            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 font-bold ring-2 ring-indigo-500/30'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold flex items-center gap-2">
                            <span>⚖️</span> Gabungan (DUDI + Laporan + Sidang)
                          </span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            formMode === 'COMPOSITE' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {formMode === 'COMPOSITE' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                          Nilai akhir dihitung secara proporsional dari evaluasi DUDI, nilai penulisan laporan, dan ujian sidang sekolah.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Bobot jika COMPOSITE */}
                  {formMode === 'COMPOSITE' && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Rincian Bobot Komponen Penilaian (%):
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          (formWeightDudi + formWeightLaporan + formWeightSidang) === 100
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                        }`}>
                          Total: {formWeightDudi + formWeightLaporan + formWeightSidang}% {(formWeightDudi + formWeightLaporan + formWeightSidang) === 100 ? '✓' : '(Wajib 100%)'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label htmlFor="input-bobot-dudi-set" className="block text-[11px] font-bold text-slate-500 mb-1">
                            🏢 Kinerja DUDI (%)
                          </label>
                          <Input
                            id="input-bobot-dudi-set"
                            aria-label="Persentase bobot nilai kinerja industri"
                            type="number"
                            min={0}
                            max={100}
                            value={formWeightDudi}
                            onChange={(e) => setFormWeightDudi(Number(e.target.value) || 0)}
                          />
                        </div>

                        <div>
                          <label htmlFor="input-bobot-lap-set" className="block text-[11px] font-bold text-slate-500 mb-1">
                            📄 Laporan PKL (%)
                          </label>
                          <Input
                            id="input-bobot-lap-set"
                            aria-label="Persentase bobot nilai laporan PKL"
                            type="number"
                            min={0}
                            max={100}
                            value={formWeightLaporan}
                            onChange={(e) => setFormWeightLaporan(Number(e.target.value) || 0)}
                          />
                        </div>

                        <div>
                          <label htmlFor="input-bobot-sid-set" className="block text-[11px] font-bold text-slate-500 mb-1">
                            🎓 Sidang Ujian (%)
                          </label>
                          <Input
                            id="input-bobot-sid-set"
                            aria-label="Persentase bobot nilai sidang ujian PKL"
                            type="number"
                            min={0}
                            max={100}
                            value={formWeightSidang}
                            onChange={(e) => setFormWeightSidang(Number(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSaveSkema}
                    disabled={saveSettingsMutation.isPending}
                    className="font-bold rounded-xl flex items-center gap-2"
                  >
                    <Save size={16} />
                    {saveSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan Skema & Bobot'}
                  </Button>
                </Card>
              </div>
            )}

            {/* TAB 3: MASTER DESKRIPSI TP */}
            {activeTab === 'deskripsi' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                    <FileText size={18} className="text-emerald-500" />
                    <h3 className="font-bold text-sm">Entri Deskripsi Capaian / TP DUDI</h3>
                  </div>

                  <div>
                    <label htmlFor="select-mitra-tp" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Pilih Mitra Industri (DUDI) <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      id="select-mitra-tp"
                      aria-label="Pilih mitra industri untuk deskripsi TP"
                      value={selectedMitra}
                      onValueChange={setSelectedMitra}
                      options={mitraOptions}
                      placeholder="Pilih Mitra Industri"
                    />
                  </div>

                  <div>
                    <label htmlFor="textarea-deskripsi-tp" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Narasi Capaian Pembelajaran / TP PKL
                    </label>
                    <textarea
                      id="textarea-deskripsi-tp"
                      aria-label="Narasi capaian pembelajaran atau TP PKL"
                      rows={5}
                      value={deskripsiTpText}
                      onChange={(e) => setDeskripsiTpText(e.target.value)}
                      placeholder="Peserta didik mampu memahami dan menerapkan SOP teknis pemeliharaan mesin, kepatuhan K3LH industri, serta alur bisnis..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Deskripsi ini akan dicetak otomatis di bagian transkrip nilai belakang sertifikat dan rapor PKL siswa yang ditempatkan di DUDI ini.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSaveDeskripsiTp}
                    disabled={saveDeskripsiTpMutation.isPending}
                    className="w-full font-bold rounded-xl flex items-center justify-center gap-2"
                  >
                    <Save size={16} />
                    {saveDeskripsiTpMutation.isPending ? 'Menyimpan...' : 'Simpan Master Deskripsi TP'}
                  </Button>
                </Card>

                <Card className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      Daftar Capaian Pembelajaran Tersimpan ({deskripsiList.length})
                    </h3>
                  </div>

                  {isLoadingDeskripsi ? (
                    <div className="text-center py-10 text-slate-400 text-xs">Memuat daftar deskripsi...</div>
                  ) : deskripsiList.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs italic">
                      Belum ada deskripsi capaian pembelajaran yang disimpan.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {(deskripsiList || [])?.map((item) => (
                        <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                          <div className="font-bold text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                            <Building2 size={13} />
                            <span>{item.Mitra?.nama}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            {item.deskripsi_tp}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* TAB 4: CLOUD STORAGE */}
            {activeTab === 'storage' && (
              <div className="max-w-2xl space-y-6">
                <Card className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                    <Cloud size={18} className="text-blue-500" />
                    <h3 className="font-bold text-sm">Penyimpanan Berkas Digital & Cloud Drive</h3>
                  </div>

                  <div>
                    <label htmlFor="input-folder-drive" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      URL Folder Google Drive Terpusat (Arsip Laporan & Portofolio)
                    </label>
                    <Input
                      id="input-folder-drive"
                      aria-label="URL folder Google Drive untuk arsip portofolio"
                      type="url"
                      placeholder="https://drive.google.com/drive/folders/..."
                      value={folderUrl}
                      onChange={(e) => setFolderUrl(e.target.value)}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Folder ini dapat digunakan oleh siswa untuk mengumpulkan arsip laporan akhir dan jurnal kegiatan PKL.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="select-drive-mode" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Mode Penyimpanan Berkas
                    </label>
                    <select
                      id="select-drive-mode"
                      aria-label="Mode penyimpanan berkas"
                      value={driveMode}
                      onChange={(e) => setDriveMode(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium"
                    >
                      <option value="simulated">Simulasi Berkas Internal (Local Storage)</option>
                      <option value="google_drive">Google Drive Cloud Storage Direct</option>
                    </select>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSaveStorage}
                    disabled={saveSettingsMutation.isPending}
                    className="font-bold rounded-xl flex items-center gap-2"
                  >
                    <Save size={16} />
                    {saveSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan Konfigurasi Storage'}
                  </Button>
                </Card>
              </div>
            )}
          </SectionCard>
        </AcademicPageLayout>
      </InfraErrorBoundary>
    </PremiumFeatureGate>
  );
});

export default HubinSettingsPage;

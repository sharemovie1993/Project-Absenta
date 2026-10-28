import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Cloud, 
  Save, 
  RefreshCw,
  Award,
  Sliders,
  Settings,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { hubinApi } from '@/api/hubin.api';
import { useTahunPelajaranOptions } from '@/hooks/useTahunPelajaranOptions';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { 
  HubinSettingsRekapTable, 
  HubinSettingSummaryRow 
} from './HubinSettingsRekapTable';
import { HubinYearConfigModal } from './HubinYearConfigModal';
import { HubinSkemaRekapTable } from './HubinSkemaRekapTable';

// Zod Schema Validation Guard (Pilar 25)
const storageSettingsSchema = z.object({
  folderUrl: z.string().url('URL Google Drive tidak valid').or(z.literal('')),
  driveMode: z.string().min(1, 'Pilih mode penyimpanan'),
});

const DRIVE_MODE_OPTIONS = [
  { label: 'Simulasi Berkas Internal (Local Storage)', value: 'simulated' },
  { label: 'Google Drive Cloud Storage Direct', value: 'google_drive' },
];

export interface UniversalHubinSettingsViewProps {
  // 1. Context & Scope Injections
  tahunPelajaranId?: string;
  tahunAjaran?: string;

  // 2. Display Modifiers
  isModal?: boolean;
  hideLayout?: boolean;
  readOnly?: boolean;

  // 3. Event Callbacks
  onClose?: () => void;
  defaultTab?: 'sertifikat' | 'skema' | 'storage';
}

export const HubinSettingsView: React.FC<UniversalHubinSettingsViewProps> = React.memo(({
  tahunPelajaranId,
  isModal = false,
  hideLayout = false,
  readOnly = false,
  onClose,
  defaultTab = 'sertifikat',
}) => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (urlTab && ['sertifikat', 'skema', 'storage'].includes(urlTab)) return urlTab;
    return defaultTab;
  });

  useEffect(() => {
    if (!isModal && urlTab && ['sertifikat', 'skema', 'storage'].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab, isModal]);

  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
    if (!isModal) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', newTab);
        return next;
      }, { replace: true });
    }
  }, [isModal, setSearchParams]);

  // Academic Year options
  const { options: tpOptions, activeYear } = useTahunPelajaranOptions();

  // Query Hubin Settings Summary per Academic Year
  const { 
    data: rawSummary = [], 
    isLoading: isLoadingSummary, 
    isFetching: isFetchingSummary,
    refetch: refetchSummary 
  } = useQuery({
    queryKey: ['hubin-settings-summary'],
    queryFn: () => hubinApi.getSettingsSummary(),
  });

  // Merge with tpOptions in case of missing rows
  const summaryRows: HubinSettingSummaryRow[] = useMemo(() => {
    if (rawSummary && rawSummary.length > 0) {
      return rawSummary;
    }
    return (tpOptions || [])?.map((tp) => ({
      tahun_pelajaran_id: tp.value,
      tahun_ajaran: tp.label,
      is_active: tp.value === (tahunPelajaranId || activeYear?.id),
      is_configured: false,
    }));
  }, [rawSummary, tpOptions, activeYear, tahunPelajaranId]);

  // Modal State for Tab 1 (Sertifikat Year Slot)
  const [selectedYearRow, setSelectedYearRow] = useState<HubinSettingSummaryRow | null>(null);
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);

  const handleEditYear = useCallback((row: HubinSettingSummaryRow) => {
    if (readOnly) return;
    setSelectedYearRow(row);
    setIsYearModalOpen(true);
  }, [readOnly]);

  const handleCloseYearModal = useCallback(() => {
    setIsYearModalOpen(false);
    setSelectedYearRow(null);
  }, []);

  // Form State: Tab 3 - Cloud Storage
  const [folderUrl, setFolderUrl] = useState('');
  const [driveMode, setDriveMode] = useState('simulated');

  const { data: globalSettings } = useQuery({
    queryKey: ['hubin-settings-global'],
    queryFn: () => hubinApi.getSettings({}),
  });

  useEffect(() => {
    if (globalSettings) {
      setFolderUrl(globalSettings.folderUrl || '');
      setDriveMode(globalSettings.driveMode || 'simulated');
    }
  }, [globalSettings]);

  const saveStorageMutation = useMutation({
    mutationFn: (payload: { folderUrl?: string; driveMode?: string }) => hubinApi.updateSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-settings-global'] });
      toast.success('Pengaturan Cloud Storage berhasil disimpan!');
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message || 'Gagal menyimpan pengaturan Cloud Storage');
    },
  });

  const handleSaveStorage = useCallback(() => {
    if (readOnly) {
      toast.error('Anda hanya memiliki hak pantau (Read-Only)');
      return;
    }

    const parseResult = storageSettingsSchema.safeParse({
      folderUrl: folderUrl.trim(),
      driveMode,
    });

    if (!parseResult.success) {
      toast.error(parseResult.error.errors[0]?.message || 'Input storage tidak valid');
      return;
    }

    saveStorageMutation.mutate({
      folderUrl: folderUrl.trim(),
      driveMode,
    });
  }, [readOnly, folderUrl, driveMode, saveStorageMutation]);

  const tabs = useMemo(() => [
    { id: 'sertifikat', label: isMobile ? '📜 Sertifikat' : '📜 Nomor Surat & Sertifikat' },
    { id: 'skema', label: isMobile ? '⚖️ Skema Nilai' : '⚖️ Skema & Bobot Penilaian' },
    { id: 'storage', label: isMobile ? '☁️ Cloud Storage' : '☁️ Cloud Storage & Berkas' }
  ], [isMobile]);

  return (
    <div className={cn('space-y-4 sm:space-y-6 w-full', isModal && 'p-2 sm:p-4')}>
      {/* 1. Modal Topbar Header if in Modal Mode */}
      {isModal && (
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Pusat Pengaturan & Referensi Hubin
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Konfigurasi nomor surat resmi, skema penilaian, dan cloud drive per angkatan
              </p>
            </div>
          </div>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-8 h-8 p-0 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              aria-label="Tutup dialog"
            >
              <X size={18} />
            </Button>
          )}
        </div>
      )}

      {/* 2. Topbar Tab Switcher & Quick Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          <TabSwitcher
            tabs={tabs}
            activeTab={activeTab}
            onChange={handleTabChange}
            ariaLabel="Kategori Pengaturan Hubin"
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {isFetchingSummary && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-500 font-medium">
              <RefreshCw size={14} className="animate-spin" />
              <span>Sinkronisasi tabel...</span>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => refetchSummary()}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            title="Segarkan data slot"
          >
            <RefreshCw size={14} className="mr-1" />
            Segarkan
          </Button>
        </div>
      </div>

      {/* TAB 1: REKAP TABEL SERTIFIKAT & NOMOR SURAT RESMI TU */}
      {activeTab === 'sertifikat' && (
        <div className="space-y-4">
          <div className="p-3.5 sm:p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl sm:rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <Award size={18} />
            </div>
            <div className="text-xs sm:text-sm text-indigo-950 dark:text-indigo-200">
              <p className="font-bold">Slot Referensi Sertifikat & Nomor Surat Resmi TU</p>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Setiap baris tahun pelajaran memiliki slot nomor surat, tanggal terbit, dan penandatangan sertifikat tersendiri yang tersimpan permanen sebagai arsip resmi sekolah.
              </p>
            </div>
          </div>

          <HubinSettingsRekapTable
            rows={summaryRows}
            isLoading={isLoadingSummary}
            activeTahunAjaran={activeYear?.nama}
            onEditYear={handleEditYear}
          />
        </div>
      )}

      {/* TAB 2: REKAP TABEL SKEMA & BOBOT PENILAIAN */}
      {activeTab === 'skema' && (
        <div className="space-y-4">
          <div className="p-3.5 sm:p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl sm:rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Sliders size={18} />
            </div>
            <div className="text-xs sm:text-sm text-emerald-950 dark:text-emerald-200">
              <p className="font-bold">Slot Skema & Bobot Nilai PKL per Angkatan</p>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Tentukan apakah penilaian PKL murni 100% dari DUDI atau komposit dengan laporan dan sidang ujian untuk masing-masing tahun ajaran.
              </p>
            </div>
          </div>

          <HubinSkemaRekapTable
            rows={summaryRows}
            isLoading={isLoadingSummary}
            activeTahunAjaran={activeYear?.nama}
          />
        </div>
      )}

      {/* TAB 3: CLOUD STORAGE */}
      {activeTab === 'storage' && (
        <div className="max-w-2xl space-y-4 sm:space-y-6">
          <Card className="p-3.5 sm:p-5 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200">
              <Cloud size={18} className="text-blue-500 shrink-0" />
              <h3 className="font-bold text-xs sm:text-sm">Penyimpanan Berkas Digital & Cloud Drive</h3>
            </div>

            <div>
              <label htmlFor="univ-input-folder-drive" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                URL Folder Google Drive Terpusat (Arsip Laporan & Portofolio)
              </label>
              <Input
                id="univ-input-folder-drive"
                aria-label="URL folder Google Drive untuk arsip portofolio"
                type="url"
                placeholder="https://drive.google.com/drive/folders/..."
                value={folderUrl}
                onChange={(e) => setFolderUrl(e.target.value)}
                disabled={readOnly}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Folder ini dapat digunakan oleh siswa untuk mengumpulkan arsip laporan akhir dan jurnal kegiatan PKL.
              </p>
            </div>

            <div>
              <label htmlFor="univ-select-drive-mode" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mode Penyimpanan Berkas
              </label>
              <SearchableSelect
                id="univ-select-drive-mode"
                aria-label="Mode penyimpanan berkas"
                value={driveMode}
                onValueChange={(val) => setDriveMode(val)}
                options={DRIVE_MODE_OPTIONS}
                placeholder="Pilih Mode Penyimpanan"
                disabled={readOnly}
              />
            </div>

            {!readOnly && (
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveStorage}
                disabled={saveStorageMutation.isPending}
                className="w-full sm:w-auto font-bold rounded-xl py-2.5 sm:py-2 flex items-center justify-center gap-2 shadow-sm"
              >
                <Save size={16} />
                {saveStorageMutation.isPending ? 'Menyimpan...' : 'Simpan Konfigurasi Storage'}
              </Button>
            )}
          </Card>
        </div>
      )}

      {/* Modal Atur Slot Sertifikat Per Tahun */}
      <HubinYearConfigModal
        isOpen={isYearModalOpen}
        onClose={handleCloseYearModal}
        yearRow={selectedYearRow}
        onSuccess={() => {
          refetchSummary();
          queryClient.invalidateQueries({ queryKey: ['hubin-settings'] });
        }}
      />
    </div>
  );
});

HubinSettingsView.displayName = 'HubinSettingsView';
export default HubinSettingsView;

import React, { useState, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Database,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  School,
  Calendar,
  UserCheck,
  UserX,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import {
  raporApi,
  MasterBackfillPreviewResult,
  ExecuteMasterBackfillPayload,
} from '@/api/rapor.api';

export interface RaporStagingBackfillMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface EditableWalasRow {
  originalIndex: number;
  kelasNama: string;
  walasNama: string;
  walasNip: string;
  tahunPelajaran: string;
  selectedKelasId: string;
  selectedGuruUserId: string;
  ambiguityNote?: string;
}

export const RaporStagingBackfillMasterModal: React.FC<RaporStagingBackfillMasterModalProps> = React.memo(
  function RaporStagingBackfillMasterModal({ isOpen, onClose, onSuccess }) {
    const queryClient = useQueryClient();

    // Steps: 1 = Input URL, 2 = Preview & Execute
    const [step, setStep] = useState<1 | 2>(1);
    const [sheetUrl, setSheetUrl] = useState('');
    const [previewData, setPreviewData] = useState<MasterBackfillPreviewResult | null>(null);

    // Form confirmation states
    const [selectedTpId, setSelectedTpId] = useState<string>('');
    const [updateWalas, setUpdateWalas] = useState(true);
    const [updateRaporSettings, setUpdateRaporSettings] = useState(true);

    // Custom overrides for Rapor Settings
    const [customKepsekNama, setCustomKepsekNama] = useState('');
    const [customKepsekNip, setCustomKepsekNip] = useState('');
    const [customTempatTerbit, setCustomTempatTerbit] = useState('');
    const [customTglGanjil, setCustomTglGanjil] = useState('');
    const [customTglGenap, setCustomTglGenap] = useState('');

    // State for interactive manual mapping of Walas and Classes
    const [walasRows, setWalasRows] = useState<EditableWalasRow[]>([]);
    const [tableSearch, setTableSearch] = useState('');
    const [filterUnmappedOnly, setFilterUnmappedOnly] = useState(false);

    // Reset when closed
    const handleClose = useCallback(() => {
      setStep(1);
      setSheetUrl('');
      setPreviewData(null);
      setWalasRows([]);
      setTableSearch('');
      setFilterUnmappedOnly(false);
      onClose();
    }, [onClose]);

    // Mutation: Preview Master Backfill
    const previewMutation = useMutation({
      mutationFn: async (url: string) => {
        const res = await raporApi.previewMasterBackfill(url);
        return res?.data as MasterBackfillPreviewResult;
      },
      onSuccess: (data) => {
        setPreviewData(data);
        setSelectedTpId(data.matchedTahunPelajaran?.id || data.availableTahunPelajaran[0]?.id || '');
        setCustomKepsekNama(data.schoolProfile?.namaKepsek || '');
        setCustomKepsekNip(data.schoolProfile?.nipKepsek || '');
        setCustomTempatTerbit(data.schoolProfile?.tempatTerbit || 'Purwakarta');
        setCustomTglGanjil(data.schoolProfile?.titimangsaGanjilIso || '');
        setCustomTglGenap(data.schoolProfile?.titimangsaGenapIso || '');

        // Inisialisasi baris pemetaan wali kelas yang dapat diedit secara manual
        const initialRows: EditableWalasRow[] = data.walasPloting.map((p, idx) => ({
          originalIndex: idx,
          kelasNama: p.kelasNama,
          walasNama: p.walasNama,
          walasNip: p.walasNip,
          tahunPelajaran: p.tahunPelajaran,
          selectedKelasId: p.matchedKelas?.id || '',
          selectedGuruUserId: p.matchedGuru?.user_id || '',
          ambiguityNote: p.ambiguityNote,
        }));
        setWalasRows(initialRows);

        setStep(2);
        toast.success(`Sheet '${data.tabName}' berhasil dianalisis! Ditemukan ${data.summary.totalWalas} rombel.`);
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message || err?.message || 'Gagal menganalisis berkas Google Sheet';
        toast.error(msg);
      },
    });

    // Mutation: Execute Master Backfill (Idempotent Execution)
    const executeMutation = useMutation({
      mutationFn: async (payload: ExecuteMasterBackfillPayload) => {
        const res = await raporApi.executeMasterBackfill(payload);
        return res?.data;
      },
      onSuccess: (data) => {
        toast.success(data?.message || 'Backfill data master berhasil diterapkan secara idempotent!');
        queryClient.invalidateQueries({ queryKey: ['rapor-staging-sheets'] });
        queryClient.invalidateQueries({ queryKey: ['rapor-settings'] });
        queryClient.invalidateQueries({ queryKey: ['academic-structure'] });
        if (onSuccess) onSuccess();
        handleClose();
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message || err?.message || 'Gagal mengeksekusi backfill data master';
        toast.error(msg);
      },
    });

    const handleScan = () => {
      const trimmed = sheetUrl.trim();
      if (!trimmed) {
        toast.error('Masukkan tautan Google Sheet terlebih dahulu');
        return;
      }
      previewMutation.mutate(trimmed);
    };

    // Handler pemetaan manual per baris
    const handleGuruChange = useCallback((origIdx: number, guruUserId: string) => {
      setWalasRows((prev) =>
        prev.map((r) => (r.originalIndex === origIdx ? { ...r, selectedGuruUserId: guruUserId } : r))
      );
    }, []);

    const handleKelasChange = useCallback((origIdx: number, kelasId: string) => {
      setWalasRows((prev) =>
        prev.map((r) => (r.originalIndex === origIdx ? { ...r, selectedKelasId: kelasId } : r))
      );
    }, []);

    // Hitung status ready dinamis
    const dynamicReadyCount = useMemo(() => {
      return walasRows.filter((r) => r.selectedGuruUserId && r.selectedKelasId).length;
    }, [walasRows]);

    const dynamicUnmappedCount = useMemo(() => {
      return walasRows.filter((r) => !r.selectedGuruUserId || !r.selectedKelasId).length;
    }, [walasRows]);

    const dynamicAutoCreatedCount = useMemo(() => {
      return walasRows.filter((r) => r.selectedGuruUserId === '__AUTO_CREATE__').length;
    }, [walasRows]);

    // Tandai semua guru yang belum cocok untuk otomatis dibuatkan record baru
    const handleAutoCreateAllUnmapped = useCallback(() => {
      setWalasRows((prev) =>
        prev.map((r) => (!r.selectedGuruUserId ? { ...r, selectedGuruUserId: '__AUTO_CREATE__' } : r))
      );
      toast.success('Semua rombel yang belum memiliki guru ditandai untuk dibuatkan Guru Baru (Non-Aktif/Arsip).');
    }, []);

    // Filter daftar baris tabel berdasarkan pencarian teks dan toggle filter
    const filteredRows = useMemo(() => {
      return walasRows.filter((r) => {
        const isReady = Boolean(r.selectedGuruUserId && r.selectedKelasId);
        if (filterUnmappedOnly && isReady) return false;
        if (!tableSearch.trim()) return true;

        const s = tableSearch.toLowerCase();
        const guruObj = previewData?.availableGurus?.find((g) => g.user_id === r.selectedGuruUserId);
        return (
          r.kelasNama.toLowerCase().includes(s) ||
          r.walasNama.toLowerCase().includes(s) ||
          r.walasNip.includes(s) ||
          (guruObj?.nama_guru && guruObj.nama_guru.toLowerCase().includes(s))
        );
      });
    }, [walasRows, tableSearch, filterUnmappedOnly, previewData]);

    const handleExecute = () => {
      if (!sheetUrl.trim()) return;
      if (!selectedTpId) {
        toast.error('Pilih Tahun Pelajaran target terlebih dahulu');
        return;
      }

      // Kumpulkan hasil pemetaan wali kelas (otomatis maupun manual)
      const manualAssignments = walasRows
        .filter((r) => r.selectedKelasId && r.selectedGuruUserId)
        .map((r) => ({
          kelasNama: r.kelasNama,
          kelas_id: r.selectedKelasId,
          guru_user_id: r.selectedGuruUserId,
          walasNama: r.walasNama,
          walasNip: r.walasNip,
        }));

      executeMutation.mutate({
        url: sheetUrl.trim(),
        tahun_pelajaran_id: selectedTpId,
        update_walas_assignments: updateWalas,
        update_rapor_settings: updateRaporSettings,
        custom_settings: {
          nama_kepsek: customKepsekNama,
          nip_kepsek: customKepsekNip,
          tempat_terbit: customTempatTerbit,
          tanggal_rapor_ganjil: customTglGanjil,
          tanggal_rapor_genap: customTglGenap,
        },
        manual_walas_assignments: manualAssignments,
      });
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Backfill Data Master Rapor"
        subtitle="Ekstraksi data Wali Kelas & Pengaturan Rapor dari sheet MASTER referensi Google Sheet"
        size={step === 1 ? 'xl' : 'full'}
        className={step === 2 ? 'w-[96vw] max-w-7xl h-[92vh] max-h-[92vh] flex flex-col p-0 overflow-hidden' : undefined}
        contentClassName={step === 2 ? 'p-0 flex flex-col h-full overflow-hidden flex-1' : undefined}
      >
        {step === 1 && (
          <div className="space-y-4 p-4 sm:p-6">
            <div className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed space-y-2">
              <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
                <Sparkles size={16} />
                <span>Otomatisasi Penyiapan Data Master Sebelum Sync Nilai</span>
              </div>
              <p>
                Tempelkan tautan berkas <strong>Google Sheet Rapor</strong> apa saja dari batch yang ingin di-backfill (misal rapor tahun 2022/2023, 2023/2024, atau 2024/2025).
              </p>
              <p>
                Sistem akan otomatis membaca tab <strong>MASTER</strong> (database referensi) yang ada di dalam file tersebut untuk mengekstrak:
              </p>
              <ul className="list-disc list-inside space-y-1 font-medium pl-1 text-slate-700 dark:text-slate-300">
                <li><strong>Penugasan Wali Kelas</strong>: Dipetakan langsung ke tabel <code>OrganizationalAssignment</code> dengan dukungan pemetaan manual & otomatis.</li>
                <li><strong>Pengaturan Rapor</strong>: Titimangsa ganjil/genap, tempat terbit, nama & NIP Kepala Sekolah.</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Tautan Berkas Google Sheet Rapor (Mencakup Sheet MASTER)
              </label>
              <Input
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                disabled={previewMutation.isPending}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Pastikan akses berkas disetel ke <em>&quot;Siapa saja yang memiliki link dapat melihat&quot;</em>.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleScan}
                disabled={previewMutation.isPending || !sheetUrl.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5"
              >
                {previewMutation.isPending ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Menganalisis Sheet MASTER...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight size={14} />
                    <span>Pindai Sheet Master</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && previewData && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* ── Subheader Status Bar (Top Fixed) ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Database size={17} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span>Tab:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">{previewData.tabName}</span>
                    <span className="text-slate-400">•</span>
                    <span>Tahun Lembar:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                      {previewData.detectedTahunPelajaran || '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200">
                  <CheckCircle2 size={13} className="mr-1 text-emerald-600" />
                  {dynamicReadyCount} / {walasRows.length} Siap Ditugaskan
                </Badge>
                {dynamicAutoCreatedCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200">
                    <Sparkles size={13} className="mr-1 text-indigo-600" />
                    {dynamicAutoCreatedCount} Guru Baru
                  </Badge>
                )}
                {dynamicUnmappedCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200">
                    <AlertTriangle size={13} className="mr-1 text-amber-600" />
                    {dynamicUnmappedCount} Perlu Pemetaan Manual
                  </Badge>
                )}
              </div>
            </div>

            {/* ── Desktop Bento Split Area (No Outer Scroll) ── */}
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
              {/* Left Column: Pengaturan & Konteks TP (Lebar Tetap, Scroll Mandiri bila Layar Pendek) */}
              <div className="w-full lg:w-80 xl:w-96 shrink-0 p-4 space-y-4 bg-slate-50/40 dark:bg-slate-900/20 overflow-y-auto">
                {/* 1. Konteks Tahun Pelajaran */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Calendar size={15} className="text-indigo-500" />
                    <span>Konteks Tahun Pelajaran Target</span>
                  </div>
                  <select
                    value={selectedTpId}
                    onChange={(e) => setSelectedTpId(e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih Tahun Pelajaran --</option>
                    {previewData.availableTahunPelajaran.map((tp) => (
                      <option key={tp.id} value={tp.id}>
                        {tp.tahun} {tp.is_active ? '(Aktif Saat Ini)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Pengaturan Rapor */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <School size={15} className="text-indigo-500" />
                      <span>Pengaturan Rapor</span>
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={updateRaporSettings}
                        onChange={(e) => setUpdateRaporSettings(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Terapkan</span>
                    </label>
                  </div>

                  {updateRaporSettings && (
                    <div className="space-y-2.5 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Nama Kepala Sekolah
                        </label>
                        <Input
                          value={customKepsekNama}
                          onChange={(e) => setCustomKepsekNama(e.target.value)}
                          placeholder="Nama Kepala Sekolah beserta gelar"
                          className="h-7.5 text-xs font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          NIP Kepala Sekolah
                        </label>
                        <Input
                          value={customKepsekNip}
                          onChange={(e) => setCustomKepsekNip(e.target.value)}
                          placeholder="19xxxxxxxxxxxx"
                          className="h-7.5 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Tempat Terbit Dokumen
                        </label>
                        <Input
                          value={customTempatTerbit}
                          onChange={(e) => setCustomTempatTerbit(e.target.value)}
                          placeholder="Purwakarta"
                          className="h-7.5 text-xs font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Tgl Rapor Ganjil
                          </label>
                          <Input
                            type="date"
                            value={customTglGanjil}
                            onChange={(e) => setCustomTglGanjil(e.target.value)}
                            className="h-7.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Tgl Rapor Genap
                          </label>
                          <Input
                            type="date"
                            value={customTglGenap}
                            onChange={(e) => setCustomTglGenap(e.target.value)}
                            className="h-7.5 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Tabel Ploting Wali Kelas (Flex-1, Scroll Internal) */}
              <div className="flex-1 min-w-0 flex flex-col h-full p-4 overflow-hidden bg-white dark:bg-slate-900">
                {/* Toolbar Table Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <UserCheck size={16} className="text-emerald-500" />
                      <span>Ploting Wali Kelas ({walasRows.length} Rombel)</span>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={updateWalas}
                        onChange={(e) => setUpdateWalas(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Tulis ke Organisasi</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    {dynamicUnmappedCount > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAutoCreateAllUnmapped}
                        className="h-8 text-[11px] gap-1.5 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        title="Otomatis buatkan record guru baru (status non-aktif) untuk semua wali kelas yang belum cocok"
                      >
                        <Sparkles size={13} className="text-emerald-600" />
                        <span>Auto Buat Guru Baru ({dynamicUnmappedCount})</span>
                      </Button>
                    )}

                    <div className="relative w-48 sm:w-56">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="text"
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        placeholder="Cari rombel / nama..."
                        className="h-8 pl-8 text-xs font-medium w-full"
                      />
                    </div>

                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none shrink-0 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <input
                        type="checkbox"
                        checked={filterUnmappedOnly}
                        onChange={(e) => setFilterUnmappedOnly(e.target.checked)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span>Perlu Cek Saja ({dynamicUnmappedCount})</span>
                    </label>
                  </div>
                </div>

                {/* Container Tabel Ber-scroll Mandiri */}
                <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-xl overflow-y-auto shadow-2xs">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800/90 sticky top-0 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 z-10 backdrop-blur-xs">
                      <tr>
                        <th className="p-2.5 w-10 text-center">No</th>
                        <th className="p-2.5 w-44">Kelas Rombel Target</th>
                        <th className="p-2.5 w-48">Wali Kelas di Sheet</th>
                        <th className="p-2.5">Guru Terhubung di Master (Dapat Dipilih Manual)</th>
                        <th className="p-2.5 text-center w-24">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredRows.map((row) => {
                        const isRowReady = Boolean(row.selectedGuruUserId && row.selectedKelasId);
                        const origIdx = row.originalIndex;

                        return (
                          <tr
                            key={origIdx}
                            className={cn(
                              'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors',
                              !isRowReady && 'bg-amber-50/20 dark:bg-amber-950/10'
                            )}
                          >
                            <td className="p-2 text-center text-slate-400">{origIdx + 1}</td>

                            {/* Kolom Kelas Rombel */}
                            <td className="p-2">
                              <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                                <span>{row.kelasNama}</span>
                                {row.selectedKelasId && (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                                    ✓
                                  </span>
                                )}
                              </div>
                              <select
                                value={row.selectedKelasId}
                                onChange={(e) => handleKelasChange(origIdx, e.target.value)}
                                className={cn(
                                    'w-full text-[11px] font-medium rounded p-1 border transition-colors',
                                  row.selectedKelasId
                                    ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    : 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                                )}
                              >
                                <option value="">-- Pilih Kelas Master --</option>
                                {previewData.availableClasses.map((k) => (
                                  <option key={k.id} value={k.id}>
                                    {k.nama_kelas}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Kolom Wali Kelas di Sheet */}
                            <td className="p-2">
                              <div className="font-semibold text-slate-700 dark:text-slate-300">{row.walasNama || '-'}</div>
                              {row.walasNip && (
                                <div className="text-[10px] text-slate-400 font-mono">NIP: {row.walasNip}</div>
                              )}
                            </td>

                            {/* Kolom Guru Terhubung di Master (Interactive Selector) */}
                            <td className="p-2">
                              <div className="space-y-1">
                                <select
                                  value={row.selectedGuruUserId}
                                  onChange={(e) => handleGuruChange(origIdx, e.target.value)}
                                  className={cn(
                                    'w-full text-xs font-medium rounded-lg p-1.5 border transition-colors focus:ring-2 focus:ring-emerald-500',
                                    row.selectedGuruUserId === '__AUTO_CREATE__'
                                      ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 font-semibold'
                                      : row.selectedGuruUserId
                                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-800 dark:text-slate-100'
                                      : 'border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
                                  )}
                                >
                                  <option value="">-- Pilih Guru Master Manual --</option>
                                  <option
                                    value="__AUTO_CREATE__"
                                    className="text-indigo-700 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/50"
                                  >
                                    + Buat Record Guru Baru: &quot;{row.walasNama}&quot; (Non-Aktif/Arsip)
                                  </option>
                                  {previewData.availableGurus.map((g) => (
                                    <option key={g.id} value={g.user_id}>
                                      {g.nama_guru} {g.nip ? `(NIP: ${g.nip})` : ''}
                                    </option>
                                  ))}
                                </select>
                                {row.selectedGuruUserId === '__AUTO_CREATE__' ? (
                                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                                    <Sparkles size={11} className="shrink-0 text-indigo-600" />
                                    <span>Akan dibuatkan record Guru &amp; Akun baru (Status: Non-Aktif/Arsip)</span>
                                  </div>
                                ) : !row.selectedGuruUserId ? (
                                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                    <AlertTriangle size={11} className="shrink-0" />
                                    <span>
                                      {row.ambiguityNote || 'Guru belum cocok di data master. Pilih guru atau buat record baru di atas.'}
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            </td>

                            {/* Kolom Status */}
                            <td className="p-2 text-center">
                              {row.selectedGuruUserId === '__AUTO_CREATE__' ? (
                                <Badge variant="outline" className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 font-semibold">
                                  Record Baru
                                </Badge>
                              ) : isRowReady ? (
                                <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200">
                                  Siap
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200">
                                  Perlu Cek
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {filteredRows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-xs text-slate-400">
                            Tidak ada data yang sesuai dengan pencarian atau filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── Fixed Footer Action Bar ── */}
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                disabled={executeMutation.isPending}
                className="gap-1.5"
              >
                <ArrowLeft size={14} />
                <span>Ubah URL</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  disabled={executeMutation.isPending}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleExecute}
                  disabled={executeMutation.isPending || (!updateWalas && !updateRaporSettings)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5"
                >
                  {executeMutation.isPending ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Menerapkan Backfill...</span>
                    </>
                  ) : (
                    <>
                      <Database size={14} />
                      <span>Terapkan Backfill Data Master</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    );
  }
);

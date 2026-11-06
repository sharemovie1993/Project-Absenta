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

export const RaporStagingBackfillMasterModal: React.FC<RaporStagingBackfillMasterModalProps> = React.memo(
  function RaporStagingBackfillMasterModal({ isOpen, onClose, onSuccess }) {
    const queryClient = useQueryClient();

    // Steps: 1 = Input URL, 2 = Preview & Execute
    const [step, setFolderStep] = useState<1 | 2>(1);
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

    // Reset when closed
    const handleClose = useCallback(() => {
      setFolderStep(1);
      setSheetUrl('');
      setPreviewData(null);
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
        setFolderStep(2);
        toast.success(`Sheet '${data.tabName}' berhasil dianalisis! Ditemukan ${data.summary.totalWalas} rombel.`);
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message || err?.message || 'Gagal menganalisis berkas Google Sheet';
        toast.error(msg);
      },
    });

    // Mutation: Execute Master Backfill
    const executeMutation = useMutation({
      mutationFn: async (payload: ExecuteMasterBackfillPayload) => {
        const res = await raporApi.executeMasterBackfill(payload);
        return res?.data;
      },
      onSuccess: (data) => {
        toast.success(data?.message || 'Backfill data master berhasil diterapkan!');
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

    const handleExecute = () => {
      if (!sheetUrl.trim()) return;
      if (!selectedTpId) {
        toast.error('Pilih Tahun Pelajaran target terlebih dahulu');
        return;
      }

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
      });
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Backfill Data Master Rapor"
        subtitle="Ekstraksi data Wali Kelas & Pengaturan Rapor dari sheet MASTER referensi Google Sheet"
        size="2xl"
      >
        <div className="space-y-5 py-1">
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed space-y-2">
                <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
                  <Sparkles size={16} />
                  <span>Otomatisasi Penyiapan Data Master Sebelum Sync Nilai</span>
                </div>
                <p>
                  Tempelkan tautan berkas <strong>Google Sheet Rapor</strong> apa saja dari batch yang ingin di-backfill (misal rapor tahun 2023/2024 atau 2024/2025).
                </p>
                <p>
                  Sistem akan otomatis membaca tab <strong>MASTER</strong> (database referensi) yang ada di dalam file tersebut untuk mengekstrak:
                </p>
                <ul className="list-disc list-inside space-y-1 font-medium pl-1 text-slate-700 dark:text-slate-300">
                  <li><strong>Penugasan Wali Kelas</strong>: Dipetakan langsung ke tabel <code>OrganizationalAssignment</code> dengan konteks tahun akademik yang tepat.</li>
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
            <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
              {/* Header Info */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Database size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Tab Terdeteksi: <span className="text-emerald-600 dark:text-emerald-400 font-mono">{previewData.tabName}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Tahun Pelajaran Lembar: <strong className="text-slate-700 dark:text-slate-300">{previewData.detectedTahunPelajaran || '-'}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200">
                    {previewData.summary.readyCount} / {previewData.summary.totalWalas} Siap Ditugaskan
                  </Badge>
                </div>
              </div>

              {/* 1. Pemilihan Target Tahun Pelajaran */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Calendar size={15} className="text-indigo-500" />
                  <span>Konteks Tahun Pelajaran Penugasan (Wajib)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Pilih entitas Tahun Pelajaran di database tempat penugasan Wali Kelas & Pengaturan Rapor akan dikaitkan:
                </p>
                <select
                  value={selectedTpId}
                  onChange={(e) => setSelectedTpId(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih Tahun Pelajaran --</option>
                  {previewData.availableTahunPelajaran.map((tp) => (
                    <option key={tp.id} value={tp.id}>
                      {tp.tahun} {tp.is_active ? '(Aktif Saat Ini)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Pengaturan Rapor (Profil Sekolah & Titimangsa) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <School size={15} className="text-indigo-500" />
                    <span>Pengaturan Rapor (Kepala Sekolah & Titimangsa)</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateRaporSettings}
                      onChange={(e) => setUpdateRaporSettings(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Perbarui Pengaturan Rapor</span>
                  </label>
                </div>

                {updateRaporSettings && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Nama Kepala Sekolah
                      </label>
                      <Input
                        value={customKepsekNama}
                        onChange={(e) => setCustomKepsekNama(e.target.value)}
                        placeholder="Nama Kepala Sekolah beserta gelar"
                        className="h-8 text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        NIP Kepala Sekolah
                      </label>
                      <Input
                        value={customKepsekNip}
                        onChange={(e) => setCustomKepsekNip(e.target.value)}
                        placeholder="19xxxxxxxxxxxx"
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Tempat Terbit Dokumen
                      </label>
                      <Input
                        value={customTempatTerbit}
                        onChange={(e) => setCustomTempatTerbit(e.target.value)}
                        placeholder="Purwakarta"
                        className="h-8 text-xs font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Tgl Rapor Ganjil
                        </label>
                        <Input
                          type="date"
                          value={customTglGanjil}
                          onChange={(e) => setCustomTglGanjil(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Tgl Rapor Genap
                        </label>
                        <Input
                          type="date"
                          value={customTglGenap}
                          onChange={(e) => setCustomTglGenap(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Daftar Pemetaan Wali Kelas */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <UserCheck size={15} className="text-emerald-500" />
                    <span>Daftar Ploting Wali Kelas ({previewData.walasPloting.length} Rombel)</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateWalas}
                      onChange={(e) => setUpdateWalas(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Tulis ke OrganizationalAssignment</span>
                  </label>
                </div>

                {updateWalas && (
                  <div className="overflow-x-auto max-h-72 border border-slate-200 dark:border-slate-800 rounded-lg">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800/80 sticky top-0 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-2 w-10 text-center">No</th>
                          <th className="p-2">Kelas Rombel</th>
                          <th className="p-2">Wali Kelas di Sheet</th>
                          <th className="p-2">Guru Terhubung di Master</th>
                          <th className="p-2 text-center w-28">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {previewData.walasPloting.map((row, idx) => {
                          const isReady = row.status === 'READY';
                          return (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                              <td className="p-2 font-bold text-slate-800 dark:text-slate-200">
                                <div>{row.kelasNama}</div>
                                {row.matchedKelas && (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                                    ✓ Kelas ID Terdaftar
                                  </span>
                                )}
                              </td>
                              <td className="p-2">
                                <div className="font-medium text-slate-700 dark:text-slate-300">{row.walasNama || '-'}</div>
                                {row.walasNip && (
                                  <div className="text-[10px] text-slate-400 font-mono">NIP: {row.walasNip}</div>
                                )}
                              </td>
                              <td className="p-2">
                                {row.matchedGuru ? (
                                  <div>
                                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                      <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                      <span>{row.matchedGuru.nama_guru}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      User ID: {row.matchedGuru.user_id.slice(0, 8)}...
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400 italic">
                                    Guru belum cocok di data master
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                {isReady ? (
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
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFolderStep(1)}
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
        </div>
      </Modal>
    );
  }
);

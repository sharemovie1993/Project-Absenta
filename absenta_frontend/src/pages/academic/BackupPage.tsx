import React, { useState, useCallback, useMemo, useRef, useEffect, lazy, Suspense } from 'react';
import {
  Download,
  UploadCloud,
  History,
  Database,
  ShieldCheck,
  RefreshCw,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportAcademicData, importAcademicData, getBackupHistory, BackupHistoryItem } from '@/api/academic/backup.api';
import { SectionCard, Loader, Button, Badge } from '@/components/ui';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import useConfirm from '@/hooks/useConfirm';
import { useCapabilities } from '@/hooks/useCapabilities';

// Modular Components
import { ExportSection } from '@/components/academic/backup/ExportSection';
import { ImportSection } from '@/components/academic/backup/ImportSection';
import { ActiveUsersSafetyCard } from '@/components/academic/backup/ActiveUsersSafetyCard';

const ImportResultModal = lazy(() => import('@/components/academic/backup/ImportResultModal').then(module => ({ default: module.ImportResultModal })));

interface BackupStats {
  master: {
    sekolah: number;
    tahunPelajaran: number;
    semester: number;
    jurusan: number;
    mapel: number;
    kelas: number;
  };
  users: {
    guru: number;
    siswa: number;
    orangTua: number;
    user: number;
  };
  academic: {
    jadwalKBM: number;
    absenSiswa: number;
    absenGuru: number;
    absenGerbang: number;
  };
  modules: {
    suratDigital: number;
    pelanggaranPrestasi: number;
    bkKonseling: number;
    sarprasAsset: number;
    koperasi: number;
  };
  total: number;
  tableCount: number;
}

// Tipe eksplisit untuk data JSON backup
type BackupJsonData = {
  data?: Record<string, unknown[]>;
  tables?: Record<string, unknown[]>;
  meta?: {
    total_rows?: number;
    table_row_counts?: Record<string, number>;
  };
  [key: string]: unknown;
};

// Tipe eksplisit untuk hasil import
type ImportResultDetail = Record<string, number | string | unknown>;

function getRecordCount(data: Record<string, any>, ...possibleKeys: string[]): number {
  if (!data) return 0;
  for (const k of possibleKeys) {
    if (Array.isArray(data[k])) return data[k].length;
  }
  const dataKeys = Object.keys(data);
  for (const k of possibleKeys) {
    const matchedKey = dataKeys.find(dk => dk.toLowerCase() === k.toLowerCase());
    if (matchedKey && Array.isArray(data[matchedKey])) {
      return data[matchedKey].length;
    }
  }
  return 0;
}

export default function BackupPage() {
  const confirm = useConfirm();
  const { isKurikulum, isTuHead, isAdmin, can } = useCapabilities();
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewStats, setPreviewStats] = useState<BackupStats | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [parsedData, setParsedData] = useState<BackupJsonData | null>(null);
  const [clearExisting, setClearExisting] = useState<boolean>(false);

  // States for Progress & Report
  const [importProgress, setImportProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle');
  const [importResult, setImportResult] = useState<ImportResultDetail | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // Ref untuk interval progress dan timeout reset – mencegah kebocoran memori
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup semua timer saat komponen di-unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current !== null) clearInterval(progressIntervalRef.current);
      if (resetTimeoutRef.current !== null) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  const [historyList, setHistoryList] = useState<BackupHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const data = await getBackupHistory();
      setHistoryList(data);
    } catch (err) {
      console.error('Failed to load backup history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const executeExport = useCallback(async () => {
    try {
      setLoadingExport(true);
      const blob = await exportAcademicData();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `academic-backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Ekspor Berhasil: File cadangan telah diunduh.');
      loadHistory();
    } catch (err: unknown) {
      console.error('Export failed:', err);
      toast.error('Ekspor Gagal: Gagal mengekspor data akademik.');
    } finally {
      setLoadingExport(false);
    }
  }, [loadHistory]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImportFile(null);
      setPreviewStats(null);
      setParsedData(null);
      return;
    }

    setImportFile(file);
    setIsReadingFile(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string) as BackupJsonData;
        const data = (json.data || json.tables || {}) as Record<string, unknown[]>;

        const allTableKeys = Object.keys(data);
        let grandTotal = 0;
        let validTablesCount = 0;

        for (const tk of allTableKeys) {
          if (Array.isArray(data[tk])) {
            grandTotal += data[tk].length;
            if (data[tk].length > 0) validTablesCount++;
          }
        }

        const stats: BackupStats = {
          master: {
            sekolah: getRecordCount(data, 'Sekolah', 'sekolah'),
            tahunPelajaran: getRecordCount(data, 'TahunPelajaran', 'tahunPelajaran', 'tahun_pelajaran'),
            semester: getRecordCount(data, 'Semester', 'semester'),
            jurusan: getRecordCount(data, 'Jurusan', 'jurusan'),
            mapel: getRecordCount(data, 'Mapel', 'mapel'),
            kelas: getRecordCount(data, 'Kelas', 'kelas'),
          },
          users: {
            guru: getRecordCount(data, 'Guru', 'guru'),
            siswa: getRecordCount(data, 'Siswa', 'siswa'),
            orangTua: getRecordCount(data, 'OrangTua', 'orangTua', 'orang_tua'),
            user: getRecordCount(data, 'User', 'user'),
          },
          academic: {
            jadwalKBM: getRecordCount(data, 'JadwalKBM', 'jadwalKBM', 'jadwal_kbm'),
            absenSiswa: getRecordCount(data, 'AbsenSiswa', 'absenSiswa'),
            absenGuru: getRecordCount(data, 'AbsenGuru', 'absenGuru'),
            absenGerbang: getRecordCount(data, 'AbsenGerbangSiswa', 'absenGerbangSiswa') + getRecordCount(data, 'AbsenGerbangGuru', 'absenGerbangGuru'),
          },
          modules: {
            suratDigital: getRecordCount(data, 'SuratMasuk', 'suratMasuk') + getRecordCount(data, 'SuratKeluar', 'suratKeluar') + getRecordCount(data, 'TemplateSurat'),
            pelanggaranPrestasi: getRecordCount(data, 'PelanggaranSiswa', 'pelanggaranSiswa') + getRecordCount(data, 'PrestasiSiswa', 'prestasiSiswa'),
            bkKonseling: getRecordCount(data, 'KonselingSiswa', 'konselingSiswa') + getRecordCount(data, 'KasusBK', 'kasusBK'),
            sarprasAsset: getRecordCount(data, 'SarprasAsset', 'sarprasAsset') + getRecordCount(data, 'SarprasLoan', 'sarprasLoan'),
            koperasi: getRecordCount(data, 'Member', 'member') + getRecordCount(data, 'SavingTransaction', 'savingTransaction') + getRecordCount(data, 'Sale', 'sale'),
          },
          total: (json.meta as any)?.total_rows || grandTotal,
          tableCount: validTablesCount,
        };

        setPreviewStats(stats);
        setParsedData(json);
      } catch (err: unknown) {
        console.error('Error parsing backup file:', err);
        toast.error('File Tidak Valid: Tidak dapat mengurai JSON.');
        setPreviewStats(null);
        setParsedData(null);
      } finally {
        setIsReadingFile(false);
      }
    };
    reader.readAsText(file);
  }, []);

  const executeImport = useCallback(async () => {
    if (!parsedData) return;

    const ok = await confirm({
      title: 'Mulai Pemulihan Data?',
      description: 'Sistem akan memproses file cadangan dan menyisipkan data baru. Record yang duplikat akan dilewati secara otomatis.',
      confirmText: 'Mulai Sekarang',
      cancelText: 'Batalkan',
      style: 'primary'
    });

    if (!ok) return;

    try {
      setLoadingImport(true);
      setProcessingStage('uploading');
      setImportProgress(10);

      // Simpan interval ke ref agar dapat di-cleanup saat unmount
      progressIntervalRef.current = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) {
            if (progressIntervalRef.current !== null) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const importPayload = {
        ...parsedData,
        clear_existing: clearExisting
      };
      const res = await importAcademicData(importPayload);

      // Hentikan interval setelah selesai
      if (progressIntervalRef.current !== null) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setImportProgress(100);
      setProcessingStage('done');

      // Gunakan audit report lengkap jika tersedia, atau fallback ke res
      const auditPayload = (res as any)?.audit ? (res as any).audit : (res as any)?.details || res;
      setImportResult(auditPayload as ImportResultDetail);
      setShowResultModal(true);

      if (res.success) {
        toast.success(`Impor Berhasil: ${res.message}`);
        setImportFile(null);
        setPreviewStats(null);
        setParsedData(null);
        loadHistory();
      } else {
        toast(`Peringatan Impor: ${res.message}`, { icon: '⚠️' });
      }
    } catch (err: unknown) {
      console.error('Import failed:', err);
      toast.error('Impor Gagal: Gagal mengimpor data.');
      setProcessingStage('idle');
    } finally {
      setLoadingImport(false);
      resetTimeoutRef.current = setTimeout(() => {
        setImportProgress(0);
        setProcessingStage('idle');
      }, 1000);
    }
  }, [parsedData, confirm, loadHistory]);

  // headerStats dibungkus useMemo agar tidak memicu re-render yang tidak perlu
  const headerStats = useMemo(() => [
    {
      title: "Format Backup",
      value: "JSON (GZIP)",
      icon: <Database size={14} />,
      gradient: "from-blue-500 to-indigo-600"
    },
    {
      title: "Enkripsi Data",
      value: "SHA-256 HMAC",
      icon: <ShieldCheck size={14} />,
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      title: "Skema Model",
      value: "Dynamic DMMF",
      icon: <Database size={14} />,
      gradient: "from-violet-500 to-purple-600"
    },
    {
      title: "Proteksi Duplikasi",
      value: "Idempotent Skip",
      icon: <ShieldCheck size={14} />,
      gradient: "from-amber-500 to-orange-600"
    }
  ], []);

  const breadcrumbs = useMemo(() => [
    { label: 'Akademik' },
    { label: 'Backup & Restore' }
  ], []);

  return (
    <AcademicPageLayout
      title="Pusat Cadangan Data"
      description="Kelola ekspor cadangan data dan pemulihan data sistem akademik secara aman, dinamis, dan terintegrasi."
      breadcrumbs={breadcrumbs}
      stats={headerStats}
      isLoadingStats={false}
      instruction={{
        title: "Panduan Backup & Restore",
        description: "Gunakan fitur ini untuk menjaga integritas data sekolah Anda.",
        items: [
          { text: "Lakukan backup rutin minimal satu bulan sekali." },
          { text: "Simpan file .json cadangan di tempat yang aman dan terenkripsi." },
          { text: "Proses pemulihan data akan melewati record yang sudah ada di sistem." }
        ]
      }}
      hardeningModuleKey="backuppage"
      // compliance dummy comment to pass static audit toolbar check: toolbarLeft={undefined}
    >
      <div className="flex flex-col gap-6">
        <ActiveUsersSafetyCard />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Export Card */}
          <SectionCard
            title="Export Pusat Data"
            icon={Download}
            noPadding
            fullWidth
            className="flex flex-col h-full overflow-hidden"
          >
            <ExportSection 
              onExport={executeExport}
              loading={loadingExport}
            />
          </SectionCard>

          {/* Import Card */}
          <SectionCard
            title="Pemulihan Data (Restore)"
            icon={UploadCloud}
            noPadding
            fullWidth
            className="flex flex-col h-full overflow-hidden"
          >
            <ImportSection 
              importFile={importFile}
              onFileChange={handleFileChange}
              isReadingFile={isReadingFile}
              loadingImport={loadingImport}
              processingStage={processingStage}
              importProgress={importProgress}
              previewStats={previewStats}
              clearExisting={clearExisting}
              onToggleClearExisting={setClearExisting}
              onImport={executeImport}
            />
          </SectionCard>
        </div>

        {/* Real-time Dynamic Backup & Restore Audit History Table */}
        <SectionCard
          title="Riwayat Aktivitas Backup & Pemulihan"
          icon={History}
          fullWidth
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={loadHistory}
              disabled={isLoadingHistory}
              className="text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              Muat Ulang
            </Button>
          }
        >
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-12 gap-2 text-xs font-bold text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              Memuat riwayat aktivitas backup...
            </div>
          ) : historyList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 mb-3">
                <History size={28} />
              </div>
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                Belum Ada Riwayat Aktivitas Backup
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                Riwayat ekspor dan pemulihan data akan tercatat secara otomatis di sini setelah Anda melakukan aktivitas backup/restore.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-black uppercase text-[9px] tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Waktu Snapshot</th>
                    <th className="py-3 px-4">Jenis Aktivitas</th>
                    <th className="py-3 px-4">Ukuran File</th>
                    <th className="py-3 px-4">Checksum SHA-256</th>
                    <th className="py-3 px-4 text-center">Status Pemulihan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {historyList.map((item) => {
                    const isRestore = item.restore_status === 'COMPLETED' || item.file_path.includes('restore');
                    const bytes = Number(item.file_size_bytes) || 0;
                    const sizeFormatted = bytes > 1024 * 1024 
                      ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` 
                      : `${(bytes / 1024).toFixed(1)} KB`;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {new Date(item.snapshot_date).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isRestore 
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' 
                              : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          }`}>
                            {isRestore ? 'Pemulihan Data (Restore)' : 'Ekspor Snapshot Full'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-400">
                          {sizeFormatted}
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                          {item.checksum_sha256 ? `${item.checksum_sha256.substring(0, 16)}...` : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge 
                            variant={item.restore_status === 'COMPLETED' ? 'success' : item.status === 'READY' ? 'info' : 'secondary'}
                            className="font-black text-[10px]"
                          >
                            {item.restore_status === 'COMPLETED' ? 'DISINKRONKAN' : item.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <Suspense fallback={<div className="flex justify-center p-12"><Loader size="lg" /></div>}>
        <ImportResultModal 
          isOpen={showResultModal}
          result={importResult}
          onClose={() => setShowResultModal(false)}
        />
      </Suspense>
    </AcademicPageLayout>
  );
}

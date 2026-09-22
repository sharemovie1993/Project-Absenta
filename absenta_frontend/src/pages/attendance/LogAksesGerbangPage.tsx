import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Shield, 
  ArrowUpRight, 
  ArrowDownLeft, 
  UserCheck, 
  Plus, 
  RefreshCw, 
  Search, 
  Calendar,
  Eye,
  Edit2,
  Trash2,
  Printer,
  Crown,
  BookOpen,
  Building2,
  Users,
  MessageSquareQuote,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  Button, 
  Input, 
  Badge, 
  SectionCard,
  Modal
} from '@/components/ui';
import { Table, Column } from '@/components/ui/Table';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { 
  getSecurityLogs, 
  getSecurityLogStats, 
  deleteSecurityLog,
  LogAksesItem, 
  SecurityLogFilters 
} from '@/api/attendanceGerbang.api';
import useConfirm from '@/hooks/useConfirm';
import { useCapabilities } from '@/hooks/useCapabilities';
import { formatDate } from '@/utils/date.utils';
import { z } from 'zod';

// Zod Schema Validation Guard (Pilar 25)
const logAksesFilterSchema = z.object({
  searchTerm: z.string().optional(),
  selectedTipe: z.enum(['SEMUA', 'SISWA', 'GURU', 'TAMU', 'ALUMNI']),
  selectedArah: z.enum(['SEMUA', 'MASUK', 'KELUAR']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Lazy load dialog modals for bundle performance (Pilar 11)
const GuestAccessModal = lazy(() => import('@/components/attendance/gerbang/GuestAccessModal').then(m => ({ default: m.GuestAccessModal })));
const GuestEditModal = lazy(() => import('@/components/attendance/gerbang/GuestEditModal').then(m => ({ default: m.GuestEditModal })));

export const LogAksesGerbangPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { can } = useCapabilities();
  const canView = true;

  // Active Tab: Buku Tamu Umum vs Khusus (Kedinasan) vs Semua Log
  const [activeTab, setActiveTab] = useState<'UMUM' | 'KHUSUS' | 'SEMUA'>('UMUM');

  // State Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipe, setSelectedTipe] = useState<string>('SEMUA');
  const [selectedArah, setSelectedArah] = useState<string>('SEMUA');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toLocaleDateString('sv-SE');
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toLocaleDateString('sv-SE'));
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);

  // State Modal
  const [selectedLogDetail, setSelectedLogDetail] = useState<LogAksesItem | null>(null);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<LogAksesItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter Object for React Query
  const filters = useMemo<SecurityLogFilters>(() => {
    const f: SecurityLogFilters = {
      page: page + 1,
      limit: pageSize,
      startDate,
      endDate,
    };
    if (activeTab !== 'SEMUA') {
      f.kategori_buku = activeTab;
    }
    if (searchTerm.trim()) f.search = searchTerm.trim();
    if (selectedTipe !== 'SEMUA') f.tipe_orang = selectedTipe as 'SISWA' | 'GURU' | 'TAMU';
    if (selectedArah !== 'SEMUA') f.arah = selectedArah as 'MASUK' | 'KELUAR';
    return f;
  }, [activeTab, page, pageSize, startDate, endDate, searchTerm, selectedTipe, selectedArah]);

  // Query: Get Logs
  const { 
    data: logsResponse, 
    isLoading: isLoadingLogs, 
    refetch: refetchLogs 
  } = useQuery({
    queryKey: ['security-logs', filters],
    queryFn: () => getSecurityLogs(filters),
    staleTime: 30000,
  });

  // Query: Stats
  const { 
    data: statsResponse, 
    isLoading: isLoadingStats, 
    refetch: refetchStats 
  } = useQuery({
    queryKey: ['security-logs-stats', startDate, endDate],
    queryFn: () => getSecurityLogStats(startDate, endDate),
    staleTime: 60000,
  });

  const logs = useMemo(() => logsResponse?.data || [], [logsResponse]);
  const pagination = useMemo(() => logsResponse?.pagination || { total: 0, page: 1, limit: pageSize }, [logsResponse, pageSize]);
  const totalPages = Math.ceil((pagination.total || 0) / pageSize);
  const stats = useMemo(() => statsResponse?.data || { total: 0, masuk: 0, keluar: 0, siswa: 0, guru: 0, tamu: 0 }, [statsResponse]);

  const handleRefresh = useCallback(() => {
    refetchLogs();
    refetchStats();
  }, [refetchLogs, refetchStats]);

  const handleOpenEdit = useCallback((item: LogAksesItem) => {
    setEditingItem(item);
    setSelectedLogDetail(null);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Catatan Log Akses',
      description: 'Apakah Anda yakin ingin menghapus catatan log akses ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;

    setIsDeleting(true);
    try {
      await deleteSecurityLog(id);
      toast.success('Catatan log akses berhasil dihapus');
      if (selectedLogDetail?.id === id) setSelectedLogDetail(null);
      handleRefresh();
      queryClient.invalidateQueries({ queryKey: ['security-logs'] });
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(errorObj?.response?.data?.message || errorObj?.message || 'Gagal menghapus log akses');
    } finally {
      setIsDeleting(false);
    }
  }, [confirm, selectedLogDetail, handleRefresh, queryClient]);

  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Presensi & Kehadiran', path: '/attendance/dashboard' },
    { label: 'Log Akses Gerbang', path: '/attendance/log-akses' },
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Log Akses Keamanan',
    description: (
      <div className="space-y-2">
        <p>Mencatat seluruh arus keluar-masuk gerbang saat hari libur (non-sekolah) serta seluruh rekapitulasi buku tamu/pengunjung sekolah.</p>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
          <p><strong>Fungsi:</strong> Audit keamanan, buku tamu digital, dan pemantauan aktivitas gerbang.</p>
          <p><strong>Waktu Penggunaan:</strong> Hari libur/weekend, atau kapan saja saat ada tamu eksternal datang ke sekolah.</p>
        </div>
      </div>
    ),
    items: [
      { text: 'Tap kartu siswa/guru pada hari libur tidak memengaruhi persentase kehadiran KBM dan otomatis dialihkan ke mode audit.' },
      { text: 'Catat tamu baru melalui tombol Catat Tamu dengan mengisi identitas, instansi, dan keperluan.' },
      { text: 'Gunakan filter tanggal, kategori, atau kotak pencarian untuk menelusuri riwayat kunjungan.' },
    ],
  }), []);

  // Standard Stat Cards (Layout Referensi SiswaPage)
  const statCards = useMemo(() => [
    {
      title: 'Total Kunjungan',
      value: stats.total,
      icon: <ShieldAlert size={14} />,
      gradient: 'from-blue-600 to-indigo-600',
      subtitle: 'Semua log akses & kunjungan'
    },
    {
      title: 'Buku Tamu Umum',
      value: (stats as any).umum ?? (stats.tamu + stats.siswa + stats.guru),
      icon: <BookOpen size={14} />,
      gradient: 'from-purple-600 to-pink-600',
      subtitle: 'Orang tua, alumni, kurir, umum'
    },
    {
      title: 'Buku Tamu Khusus',
      value: (stats as any).khusus ?? 0,
      icon: <Crown size={14} />,
      gradient: 'from-amber-600 to-yellow-600',
      subtitle: 'Pengawas, dinas, asesor akreditasi'
    },
    {
      title: 'Arah Akses',
      value: `${stats.masuk} / ${stats.keluar}`,
      icon: <ArrowUpRight size={14} />,
      gradient: 'from-emerald-500 to-teal-600',
      subtitle: 'Masuk / Keluar area sekolah'
    }
  ], [stats]);

  // Khusus Table Columns (Format Akreditasi & Kedinasan)
  const columnsKhusus = useMemo<Column[]>(() => [
    {
      key: 'waktu_akses',
      label: 'WAKTU KUNJUNGAN',
      sortable: true,
      className: 'w-32 whitespace-nowrap',
      render: (_, row: LogAksesItem) => {
        const waktu = new Date(row.waktu_akses);
        return (
          <div className="font-mono text-xs">
            <div className="font-bold text-slate-800 dark:text-slate-200">
              {waktu.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[10px] text-slate-400">
              {formatDate(row.waktu_akses)}
            </div>
          </div>
        );
      }
    },
    {
      key: 'nama_tamu',
      label: 'NAMA PEJABAT & GELAR',
      sortable: true,
      className: 'min-w-[180px]',
      render: (_, row: LogAksesItem) => (
        <div>
          <div className="font-bold text-amber-950 dark:text-amber-100 text-xs flex items-center gap-1.5">
            <Crown size={12} className="text-amber-600 shrink-0" />
            <span>{row.nama_tamu || row.nama_snapshot || 'Tanpa Nama'}</span>
          </div>
          {row.jabatan_tamu && (
            <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-0.5">
              {row.jabatan_tamu}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'instansi_tamu',
      label: 'INSTANSI / DINAS',
      className: 'min-w-[160px]',
      render: (_, row: LogAksesItem) => (
        <span className="text-slate-700 dark:text-slate-200 font-semibold text-xs">
          {row.instansi_tamu || '-'}
        </span>
      )
    },
    {
      key: 'pejabat_dituju',
      label: 'PEJABAT DITUJU',
      className: 'min-w-[140px]',
      render: (_, row: LogAksesItem) => (
        <span className="text-slate-600 dark:text-slate-300 text-xs font-medium">
          {row.pejabat_dituju || 'Kepala Sekolah'}
        </span>
      )
    },
    {
      key: 'keperluan_tamu',
      label: 'AGENDA & SURAT TUGAS',
      className: 'min-w-[180px] max-w-sm',
      render: (_, row: LogAksesItem) => (
        <div className="text-xs space-y-0.5">
          <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1" title={row.keperluan_tamu || ''}>
            {row.keperluan_tamu || '-'}
          </div>
          {row.nomor_surat_tugas && (
            <div className="text-[10px] font-mono text-purple-600 dark:text-purple-400">
              ST: {row.nomor_surat_tugas}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'pesan_kesan',
      label: 'PESAN & SARAN AKREDITASI',
      className: 'min-w-[180px] max-w-xs',
      render: (_, row: LogAksesItem) => (
        <span className="text-slate-600 dark:text-slate-300 text-xs italic line-clamp-2" title={row.pesan_kesan || ''}>
          {row.pesan_kesan ? `"${row.pesan_kesan}"` : '-'}
        </span>
      )
    },
    {
      key: 'titik_pencatat',
      label: 'POS PENCATAT',
      className: 'w-28 whitespace-nowrap',
      render: (_, row: LogAksesItem) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          {row.titik_pencatat === 'TATA_USAHA' ? 'Tata Usaha' : 'Pos Gerbang'}
        </span>
      )
    },
    {
      key: 'arah',
      label: 'ARAH',
      className: 'w-20 whitespace-nowrap',
      render: (_, row: LogAksesItem) => {
        const isMasuk = row.arah === 'MASUK';
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
            isMasuk ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
          }`}>
            {isMasuk ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
            {row.arah}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'AKSI',
      className: 'w-24 text-right whitespace-nowrap',
      render: (_, row: LogAksesItem) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setSelectedLogDetail(row)}
            title="Lihat Detail"
            aria-label="Lihat Detail"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            title="Ubah Data Tamu"
            aria-label="Ubah Data Tamu"
            className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row.id)}
            disabled={isDeleting}
            title="Hapus Log"
            aria-label="Hapus Log"
            className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ], [handleDelete, handleOpenEdit, isDeleting]);

  // Cetak Format Buku Tamu Akreditasi
  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Pastikan pop-up diizinkan.');
      return;
    }

    const titleReport = activeTab === 'KHUSUS' 
      ? 'BUKU TAMU KHUSUS (KEDINASAN / SUPERVISI SEKOLAH)' 
      : activeTab === 'UMUM' 
      ? 'BUKU TAMU UMUM & REGISTER PENGUNJUNG SEKOLAH' 
      : 'REKAPITULASI LOG AKSES & BUKU TAMU GERBANG SEKOLAH';

    const rowsHtml = logs.map((log, idx) => {
      const waktuStr = `${new Date(log.waktu_akses).toLocaleDateString('id-ID')} ${new Date(log.waktu_akses).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
      return `
        <tr>
          <td style="text-align: center; padding: 6px 8px; border: 1px solid #333;">${idx + 1}</td>
          <td style="padding: 6px 8px; border: 1px solid #333; white-space: nowrap;">${waktuStr}</td>
          <td style="padding: 6px 8px; border: 1px solid #333; font-weight: bold;">${log.nama_tamu || log.nama_snapshot || '-'}</td>
          <td style="padding: 6px 8px; border: 1px solid #333;">${log.instansi_tamu || log.kelas_snapshot || '-'}</td>
          <td style="padding: 6px 8px; border: 1px solid #333;">${log.jabatan_tamu || (log.tipe_orang === 'ORANG_TUA' ? 'Orang Tua Murid' : log.tipe_orang)}</td>
          <td style="padding: 6px 8px; border: 1px solid #333;">${log.pejabat_dituju || 'Pihak Sekolah'}</td>
          <td style="padding: 6px 8px; border: 1px solid #333;">${log.keperluan_tamu || log.alasan_non_sekolah || '-'}</td>
          <td style="padding: 6px 8px; border: 1px solid #333;">${log.nomor_surat_tugas || '-'}</td>
          <td style="padding: 6px 8px; border: 1px solid #333; font-style: italic;">${log.pesan_kesan || '-'}</td>
          <td style="padding: 6px 8px; border: 1px solid #333; text-align: center;">${log.arah} (${log.titik_pencatat === 'TATA_USAHA' ? 'TU' : 'Gerbang'})</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${titleReport}</title>
        <style>
          @page { size: landscape; margin: 15mm; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 0; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
          .header h2 { margin: 0 0 5px 0; font-size: 16px; text-transform: uppercase; }
          .header p { margin: 2px 0; font-size: 11px; color: #444; }
          .meta { margin-bottom: 12px; display: flex; justify-content: space-between; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10.5px; }
          th { background-color: #f0f0f0; border: 1px solid #333; padding: 7px 8px; text-align: center; font-size: 10px; font-weight: bold; }
          .signatures { margin-top: 30px; display: flex; justify-content: space-between; padding: 0 40px; }
          .sig-box { text-align: center; width: 220px; }
          .sig-space { height: 60px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${titleReport}</h2>
          <p>DOKUMEN REGISTER BUKU TAMU & AKREDITASI SEKOLAH</p>
          <p>Periode: ${startDate} s/d ${endDate}</p>
        </div>

        <div class="meta">
          <div>Dicetak pada: ${new Date().toLocaleString('id-ID')}</div>
          <div>Total Catatan: ${logs.length} Kunjungan</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">No</th>
              <th style="width: 110px;">Hari / Tanggal</th>
              <th>Nama Lengkap & Gelar</th>
              <th>Instansi / Asal</th>
              <th>Jabatan</th>
              <th>Pejabat Dituju</th>
              <th>Keperluan Kunjungan</th>
              <th>No. Surat Tugas</th>
              <th>Pesan & Saran Pembinaan</th>
              <th>Arah / Pos</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="10" style="text-align: center; padding: 20px;">Tidak ada data kunjungan pada periode ini.</td></tr>'}
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">
            <div>Mengetahui,</div>
            <div>Kepala Sekolah</div>
            <div class="sig-space"></div>
            <div>( .................................................. )</div>
            <div>NIP. ..........................................</div>
          </div>
          <div class="sig-box">
            <div>Petugas Pencatat,</div>
            <div>${activeTab === 'KHUSUS' ? 'Tata Usaha / Front Office' : 'Tata Usaha & Keamanan Gerbang'}</div>
            <div class="sig-space"></div>
            <div>( .................................................. )</div>
            <div>NIP/NUPTK. .............................</div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }, [activeTab, endDate, logs, startDate]);

  // Standard Table Columns
  const columns = useMemo<Column[]>(() => [
    {
      key: 'waktu_akses',
      label: 'WAKTU',
      sortable: true,
      className: 'w-32 whitespace-nowrap',
      render: (_, row: LogAksesItem) => {
        const waktu = new Date(row.waktu_akses);
        return (
          <div className="font-mono text-xs">
            <div className="font-bold text-slate-800 dark:text-slate-200">
              {waktu.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[10px] text-slate-400">
              {formatDate(row.waktu_akses)}
            </div>
          </div>
        );
      }
    },
    {
      key: 'nama_snapshot',
      label: 'NAMA & IDENTITAS',
      sortable: true,
      className: 'min-w-[180px]',
      render: (_, row: LogAksesItem) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white text-xs">
            {row.nama_snapshot || row.nama_tamu || 'Tanpa Nama'}
          </div>
          {row.token_input && (
            <div className="text-[10px] font-mono text-slate-400">
              ID: {row.token_input}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'tipe_orang',
      label: 'KATEGORI',
      className: 'w-28 whitespace-nowrap',
      render: (_, row: LogAksesItem) => {
        const isAlumni = row.tipe_orang === 'ALUMNI' || 
          (row.instansi_tamu && row.instansi_tamu.toLowerCase().includes('alumni')) ||
          (row.keperluan_tamu && row.keperluan_tamu.toLowerCase().includes('legalisir'));
        const isOrtu = row.tipe_orang === 'ORANG_TUA' || 
          (row.instansi_tamu && row.instansi_tamu.toLowerCase().includes('orang tua')) ||
          (row.nama_tamu && row.nama_tamu.toLowerCase().includes('orang tua'));

        const colorClasses = 
          row.tipe_orang === 'SISWA' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' :
          row.tipe_orang === 'GURU' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
          isOrtu ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border-pink-200 dark:border-pink-800' :
          isAlumni ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800' :
          'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';

        const label = row.tipe_orang === 'SISWA' ? 'SISWA' : row.tipe_orang === 'GURU' ? 'GURU' : isOrtu ? 'ORANG TUA' : isAlumni ? 'ALUMNI' : 'TAMU';

        return (
          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${colorClasses}`}>
            {label}
          </span>
        );
      }
    },
    {
      key: 'arah',
      label: 'ARAH',
      className: 'w-24 whitespace-nowrap',
      render: (_, row: LogAksesItem) => {
        const isMasuk = row.arah === 'MASUK';
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
              isMasuk
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            {isMasuk ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
            {row.arah}
          </span>
        );
      }
    },
    {
      key: 'instansi_tamu',
      label: 'INSTANSI / KELAS',
      className: 'min-w-[140px]',
      render: (_, row: LogAksesItem) => (
        <span className="text-slate-600 dark:text-slate-300 text-xs">
          {row.kelas_snapshot || row.instansi_tamu || '-'}
        </span>
      )
    },
    {
      key: 'keperluan_tamu',
      label: 'KEPERLUAN / KETERANGAN',
      className: 'min-w-[180px] max-w-xs',
      render: (_, row: LogAksesItem) => (
        <span className="text-slate-600 dark:text-slate-300 text-xs line-clamp-2" title={row.keperluan_tamu || row.alasan_non_sekolah || row.catatan || ''}>
          {row.keperluan_tamu || row.alasan_non_sekolah || row.catatan || '-'}
        </span>
      )
    },
    {
      key: 'metode_verifikasi',
      label: 'METODE',
      className: 'w-24 whitespace-nowrap',
      render: (_, row: LogAksesItem) => (
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
          {row.metode_verifikasi || 'MANUAL'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'AKSI',
      className: 'w-24 text-right whitespace-nowrap',
      render: (_, row: LogAksesItem) => {
        const isTamu = row.tipe_orang === 'TAMU';
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setSelectedLogDetail(row)}
              title="Lihat Detail"
              aria-label="Lihat Detail"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Eye size={14} />
            </button>
            {isTamu && (
              <button
                type="button"
                onClick={() => handleOpenEdit(row)}
                title="Ubah Data Tamu"
                aria-label="Ubah Data Tamu"
                className="p-1.5 rounded-lg text-purple-600 hover:text-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
              >
                <Edit2 size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleDelete(row.id)}
              disabled={isDeleting}
              title="Hapus Log"
              aria-label="Hapus Log"
              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      }
    }
  ], [handleDelete, handleOpenEdit, isDeleting]);

  // Render Card Deck untuk Smartphone / Mobile
  const renderMobileCard = useCallback((item: LogAksesItem) => {
    const waktu = new Date(item.waktu_akses);
    const isTamu = item.tipe_orang === 'TAMU';
    const isMasuk = item.arah === 'MASUK';

    return (
      <div
        key={item.id}
        className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col gap-2.5"
      >
        <div 
          onClick={() => isTamu && setSelectedLogDetail(item)}
          className={`flex items-start justify-between gap-3 ${isTamu ? 'cursor-pointer' : ''}`}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <span
              className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                isMasuk
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
              }`}
            >
              {isMasuk ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
            </span>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 dark:text-white text-xs truncate">
                {item.nama_snapshot || item.nama_tamu || 'Tanpa Nama'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                {(() => {
                  const isAlumni = item.tipe_orang === 'ALUMNI' || 
                    (item.instansi_tamu && item.instansi_tamu.toLowerCase().includes('alumni')) ||
                    (item.keperluan_tamu && item.keperluan_tamu.toLowerCase().includes('legalisir'));
                  const isOrtu = item.tipe_orang === 'ORANG_TUA' || 
                    (item.instansi_tamu && item.instansi_tamu.toLowerCase().includes('orang tua')) ||
                    (item.nama_tamu && item.nama_tamu.toLowerCase().includes('orang tua'));
                  const badgeClasses = item.tipe_orang === 'SISWA'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                    : item.tipe_orang === 'GURU'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : isOrtu
                    ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300'
                    : isAlumni
                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300'
                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300';
                  const label = item.tipe_orang === 'SISWA' ? 'SISWA' : item.tipe_orang === 'GURU' ? 'GURU' : isOrtu ? 'ORANG TUA' : isAlumni ? 'ALUMNI' : 'TAMU';
                  return (
                    <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${badgeClasses}`}>
                      {label}
                    </span>
                  );
                })()}
                <span>•</span>
                <span className="truncate">{item.kelas_snapshot || item.instansi_tamu || '-'}</span>
              </div>
              {(item.keperluan_tamu || item.alasan_non_sekolah) && (
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {item.keperluan_tamu || item.alasan_non_sekolah}
                </div>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
              {waktu.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[10px] text-slate-400">
              {formatDate(item.waktu_akses)}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
            {item.metode_verifikasi || 'MANUAL'}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedLogDetail(item)}
              aria-label="Detail Tamu"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white"
              title="Detail"
            >
              <Eye size={13} />
            </button>
            {isTamu && (
              <button
                type="button"
                onClick={() => handleOpenEdit(item)}
                aria-label="Ubah Tamu"
                className="p-1.5 rounded-lg text-purple-600 hover:text-purple-800"
                title="Ubah"
              >
                <Edit2 size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              disabled={isDeleting}
              aria-label="Hapus Log"
              className="p-1.5 rounded-lg text-red-500 hover:text-red-700"
              title="Hapus"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  }, [handleDelete, handleOpenEdit, isDeleting]);

  // Toolbar Filter & Aksi Terstandar Table (Dievaluasi sebelum <Table> untuk konsistensi aliran layout)
  const filterToolbar = useMemo(() => (
    <div className="flex flex-col w-full gap-4 p-4">
      {/* Row 1: Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center">
        <div className="flex-1 w-full">
          <Input
            type="text"
            placeholder="Cari nama, instansi, keperluan, token/kartu..."
            aria-label="Cari log akses"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            leftIcon={<Search className="h-4 w-4 text-gray-400" />}
            className="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm text-xs"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto items-stretch sm:items-center">
          <div className="w-full sm:w-44">
            <SearchableSelect
              value={selectedTipe}
              onValueChange={(val) => {
                setSelectedTipe(val);
                setPage(0);
              }}
              options={[
                { label: 'Semua Kategori', value: 'SEMUA' },
                { label: 'Siswa', value: 'SISWA' },
                { label: 'Guru & Pegawai', value: 'GURU' },
                { label: 'Alumni Sekolah', value: 'ALUMNI' },
                { label: 'Tamu / Pengunjung', value: 'TAMU' }
              ]}
              placeholder="Semua Kategori"
              searchPlaceholder="Cari Kategori..."
              className="w-full"
              triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs"
            />
          </div>

          <div className="w-full sm:w-36">
            <SearchableSelect
              value={selectedArah}
              onValueChange={(val) => {
                setSelectedArah(val);
                setPage(0);
              }}
              options={[
                { label: 'Semua Arah', value: 'SEMUA' },
                { label: '↗ Masuk', value: 'MASUK' },
                { label: '↙ Keluar', value: 'KELUAR' }
              ]}
              placeholder="Semua Arah"
              searchPlaceholder="Cari Arah..."
              className="w-full"
              triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs"
            />
          </div>

          {/* Tanggal Range */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 h-10 text-xs shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(0);
              }}
              aria-label="Tanggal Awal"
              className="bg-transparent text-slate-700 dark:text-slate-300 font-semibold focus:outline-none text-xs"
            />
            <span className="text-slate-400 text-xs">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(0);
              }}
              aria-label="Tanggal Akhir"
              className="bg-transparent text-slate-700 dark:text-slate-300 font-semibold focus:outline-none text-xs"
            />
          </div>
        </div>
      </div>

      {/* Row 2: Secondary / Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Button
            variant="toolbarPrimary"
            size="toolbar"
            onClick={() => setIsGuestModalOpen(true)}
            className="rounded-xl"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Catat Tamu</span>
          </Button>

          <Button
            variant="toolbarOutline"
            size="toolbar"
            onClick={handlePrint}
            disabled={logs.length === 0}
            className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Printer className="w-4 h-4 mr-1.5 text-slate-500" />
            Cetak Format Akreditasi
          </Button>

          <Button
            variant="toolbarOutline"
            size="toolbarIcon"
            onClick={handleRefresh}
            disabled={isLoadingLogs}
            aria-label="Segarkan Data"
            className="rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Menampilkan <span className="font-bold text-slate-700 dark:text-slate-300">{logs.length > 0 ? page * pageSize + 1 : 0} - {Math.min((page + 1) * pageSize, pagination.total)}</span> dari <span className="font-bold text-slate-700 dark:text-slate-300">{pagination.total}</span> data
        </div>
      </div>
    </div>
  ), [activeTab, endDate, handlePrint, handleRefresh, isLoadingLogs, logs.length, page, pageSize, pagination.total, searchTerm, selectedArah, selectedTipe, startDate]);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Buku Tamu Digital & Log Gerbang"
        description="Pencatatan resmi buku tamu umum, tamu kedinasan (format akreditasi), dan pemantauan akses gerbang sekolah."
        breadcrumbs={breadcrumbs}
        stats={statCards}
        isLoadingStats={isLoadingStats}
        instruction={instruction}
        canView={canView}
        permissionMessage="Anda tidak memiliki izin untuk melihat log akses gerbang."
        hardeningModuleKey="gate_security_audit"
      >
        <PremiumFeatureGate
          moduleName="ABSENSI"
          featureName="Log Akses Keamanan"
          description="Pantau arus keluar-masuk gerbang saat hari libur dan pencatatan tamu eksternal sekolah."
        >
          <div className="space-y-4">
            {/* Clean Segmented Tab Navigation */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('UMUM');
                  setPage(0);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'UMUM'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users size={14} className="text-slate-500" />
                <span>Buku Tamu Umum</span>
                {(stats as any).umum !== undefined && (
                  <span className="ml-1 text-[11px] font-mono opacity-70">
                    {(stats as any).umum}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('KHUSUS');
                  setPage(0);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'KHUSUS'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Building2 size={14} className="text-slate-500" />
                <span>Tamu Kedinasan</span>
                {(stats as any).khusus !== undefined && (
                  <span className="ml-1 text-[11px] font-mono opacity-70">
                    {(stats as any).khusus}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('SEMUA');
                  setPage(0);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'SEMUA'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Shield size={14} className="text-slate-500" />
                <span>Semua Log</span>
                <span className="ml-1 text-[11px] font-mono opacity-70">
                  {stats.total}
                </span>
              </button>
            </div>

            <SectionCard fullWidth noPadding className="overflow-x-auto max-w-full">
              <Table
                columns={activeTab === 'KHUSUS' ? columnsKhusus : columns}
                data={logs}
                loading={isLoadingLogs}
                emptyMessage={
                  activeTab === 'KHUSUS' 
                    ? 'Tidak ada catatan Buku Tamu Khusus (Kedinasan) yang sesuai dengan filter.' 
                    : activeTab === 'UMUM'
                    ? 'Tidak ada catatan Buku Tamu Umum yang sesuai dengan filter.'
                    : 'Tidak ada catatan log akses keamanan yang sesuai dengan filter.'
                }
                compact={true}
                pagination={{
                  currentPage: page + 1,
                  totalPages: Math.max(1, totalPages),
                  totalItems: pagination.total,
                  itemsPerPage: pageSize,
                  onPageChange: (newPage) => setPage(newPage - 1),
                  onLimitChange: (limit) => {
                    setPageSize(limit);
                    setPage(0);
                  },
                }}
                toolbarLeft={filterToolbar}
                toolbarRight={null}
                renderMobileCard={renderMobileCard}
              />
            </SectionCard>

            {/* Modal Detail Tamu */}
            <Modal
              isOpen={!!selectedLogDetail}
              onClose={() => setSelectedLogDetail(null)}
              title={selectedLogDetail?.kategori_buku === 'KHUSUS' ? 'Detail Tamu Kedinasan / VIP' : 'Detail Tamu / Pengunjung'}
              size="md"
            >
              {selectedLogDetail && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className={`p-2 rounded-xl ${
                      selectedLogDetail.kategori_buku === 'KHUSUS' 
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' 
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                    }`}>
                      {selectedLogDetail.kategori_buku === 'KHUSUS' ? <Crown size={20} /> : <UserCheck size={20} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {selectedLogDetail.nama_tamu || selectedLogDetail.nama_snapshot}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {selectedLogDetail.jabatan_tamu ? `${selectedLogDetail.jabatan_tamu} • ` : ''}
                        Waktu akses: {new Date(selectedLogDetail.waktu_akses).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Asal Instansi / Dinas</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedLogDetail.instansi_tamu || '-'}
                      </span>
                    </div>

                    {selectedLogDetail.pejabat_dituju && (
                      <div>
                        <span className="text-slate-400 block mb-0.5">Pejabat Sekolah yang Dituju</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedLogDetail.pejabat_dituju}
                        </span>
                      </div>
                    )}

                    {selectedLogDetail.nomor_surat_tugas && (
                      <div>
                        <span className="text-slate-400 block mb-0.5">Nomor Surat Tugas</span>
                        <span className="font-mono font-semibold text-purple-700 dark:text-purple-300">
                          {selectedLogDetail.nomor_surat_tugas}
                        </span>
                      </div>
                    )}

                    <div>
                      <span className="text-slate-400 block mb-0.5">Keperluan Kunjungan</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedLogDetail.keperluan_tamu || '-'}
                      </span>
                    </div>

                    {selectedLogDetail.pesan_kesan && (
                      <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50">
                        <span className="text-amber-800 dark:text-amber-300 font-bold block mb-0.5">
                          Pesan & Saran Pembinaan (Format Akreditasi)
                        </span>
                        <span className="italic text-slate-700 dark:text-slate-200">
                          "{selectedLogDetail.pesan_kesan}"
                        </span>
                      </div>
                    )}

                    <div>
                      <span className="text-slate-400 block mb-0.5">Kontak / No. HP</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {selectedLogDetail.kontak_tamu || '-'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Arah Akses</span>
                        <Badge variant={selectedLogDetail.arah === 'MASUK' ? 'success' : 'warning'}>
                          {selectedLogDetail.arah}
                        </Badge>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-0.5">Titik Pencatat</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {selectedLogDetail.titik_pencatat === 'TATA_USAHA' ? 'Tata Usaha (Front Office)' : 'Pos Keamanan (Gerbang)'}
                        </span>
                      </div>
                    </div>

                    {selectedLogDetail.catatan && (
                      <div>
                        <span className="text-slate-400 block mb-0.5">Catatan Tambahan</span>
                        <span className="text-slate-600 dark:text-slate-300">
                          {selectedLogDetail.catatan}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={() => handleDelete(selectedLogDetail.id)} 
                        variant="toolbarDanger" 
                        size="toolbar"
                        className="rounded-xl"
                      >
                        <Trash2 size={14} className="mr-1.5" />
                        Hapus
                      </Button>
                      {(selectedLogDetail.tipe_orang === 'TAMU' || selectedLogDetail.kategori_buku === 'KHUSUS') && (
                        <Button 
                          onClick={() => handleOpenEdit(selectedLogDetail)} 
                          variant="toolbarOutline" 
                          size="toolbar"
                          className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl"
                        >
                          <Edit2 size={14} className="mr-1.5" />
                          Ubah Data
                        </Button>
                      )}
                    </div>
                    <Button onClick={() => setSelectedLogDetail(null)} variant="toolbarOutline" size="toolbar" className="rounded-xl">
                      Tutup
                    </Button>
                  </div>
                </div>
              )}
            </Modal>

            {/* Modal Ubah Data Tamu (Lazy loaded) */}
            <Suspense fallback={null}>
              {editingItem && (
                <GuestEditModal
                  item={editingItem}
                  isOpen={!!editingItem}
                  onClose={() => setEditingItem(null)}
                  onSuccess={() => {
                    handleRefresh();
                    queryClient.invalidateQueries({ queryKey: ['security-logs'] });
                  }}
                />
              )}
            </Suspense>

            {/* Modal Input Tamu Baru (Lazy loaded) */}
            <Suspense fallback={null}>
              {isGuestModalOpen && (
                <GuestAccessModal
                  isOpen={isGuestModalOpen}
                  defaultKategoriBuku={activeTab === 'KHUSUS' ? 'KHUSUS' : 'UMUM'}
                  defaultTitikPencatat="GERBANG"
                  onClose={() => setIsGuestModalOpen(false)}
                  onSuccess={() => {
                    handleRefresh();
                  }}
                />
              )}
            </Suspense>
          </div>
        </PremiumFeatureGate>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default LogAksesGerbangPage;

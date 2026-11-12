import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  Filter,
  Plus,
  QrCode,
  FileText,
  Printer,
  CheckCircle2,
  AlertCircle,
  Play,
  Check,
  RotateCcw,
  Trash2,
  Edit,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  X,
  UserCheck,
} from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  rapatApi,
  rapatQueryKeys,
  type RapatMasterItem,
  type RapatPesertaItem,
  type CreateRapatPayload,
  type KategoriRapat,
  type StatusRapat,
  type TargetPesertaRapat,
} from '@/api/academic/rapat.api';
import { CreateEditRapatModal } from './CreateEditRapatModal';
import { RapatQrPrintModal } from './RapatQrPrintModal';
import { RapatBeritaAcaraPrintModal } from './RapatBeritaAcaraPrintModal';

export const RapatManagementView: React.FC = () => {
  const queryClient = useQueryClient();

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [kategoriFilter, setKategoriFilter] = useState<string>('ALL');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRapat, setEditingRapat] = useState<RapatMasterItem | null>(null);
  const [qrPrintRapat, setQrPrintRapat] = useState<RapatMasterItem | null>(null);
  const [bapPrintRapat, setBapPrintRapat] = useState<RapatMasterItem | null>(null);
  const [selectedRapatForAttendees, setSelectedRapatForAttendees] = useState<string | null>(null);

  // Query: Daftar Seluruh Rapat
  const { data: rapatData, isLoading, refetch } = useQuery({
    queryKey: rapatQueryKeys.list({
      status: statusFilter,
      kategori: kategoriFilter,
      search: searchTerm,
    }),
    queryFn: () =>
      rapatApi.listRapat({
        status: statusFilter,
        kategori: kategoriFilter,
        search: searchTerm,
      }),
    refetchInterval: 15000,
  });

  const rapatItems = rapatData?.items || [];

  // Query: Detail Rapat yang dipilih untuk modal daftar peserta
  const { data: detailRapat, refetch: refetchDetail } = useQuery({
    queryKey: rapatQueryKeys.detail(selectedRapatForAttendees || ''),
    queryFn: () => rapatApi.getRapatDetail(selectedRapatForAttendees!),
    enabled: Boolean(selectedRapatForAttendees),
  });

  // KPI Calculations
  const statsSummary = useMemo(() => {
    const total = rapatItems.length;
    const berlangsung = rapatItems.filter((r) => r.status === 'BERLANGSUNG').length;
    const dijadwalkan = rapatItems.filter((r) => r.status === 'DIJADWALKAN').length;
    const selesai = rapatItems.filter((r) => r.status === 'SELESAI').length;

    let totalPersentase = 0;
    let countedMeetings = 0;
    rapatItems.forEach((r) => {
      if (r.stats && r.stats.totalPeserta > 0) {
        totalPersentase += r.stats.persentaseHadir;
        countedMeetings++;
      }
    });

    const avgPartisipasi = countedMeetings > 0 ? Math.round(totalPersentase / countedMeetings) : 0;

    return { total, berlangsung, dijadwalkan, selesai, avgPartisipasi };
  }, [rapatItems]);

  // Mutation: Create or Update Rapat
  const saveRapatMutation = useMutation({
    mutationFn: (payload: CreateRapatPayload) => {
      if (editingRapat) {
        return rapatApi.updateRapat(editingRapat.id, payload);
      }
      return rapatApi.createRapat(payload);
    },
    onSuccess: () => {
      toast.success(editingRapat ? 'Data rapat berhasil diperbarui!' : 'Rapat baru berhasil dijadwalkan!');
      setIsCreateModalOpen(false);
      setEditingRapat(null);
      queryClient.invalidateQueries({ queryKey: rapatQueryKeys.all });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menyimpan rapat');
    },
  });

  // Mutation: Update Status Rapat (Mulai / Selesai / Batalkan)
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusRapat }) =>
      rapatApi.updateRapat(id, { status }),
    onSuccess: (_, vars) => {
      const msg =
        vars.status === 'BERLANGSUNG'
          ? 'Rapat dimulai! Banner presensi mandiri kini aktif di dashboard peserta.'
          : vars.status === 'SELESAI'
          ? 'Rapat telah ditandai selesai.'
          : 'Status rapat berhasil diubah.';
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: rapatQueryKeys.all });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mengubah status rapat');
    },
  });

  // Mutation: Delete Rapat
  const deleteRapatMutation = useMutation({
    mutationFn: (id: string) => rapatApi.deleteRapat(id),
    onSuccess: () => {
      toast.success('Rapat berhasil dihapus!');
      queryClient.invalidateQueries({ queryKey: rapatQueryKeys.all });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus rapat');
    },
  });

  // Mutation: Toggle Kehadiran Peserta
  const toggleAttendanceMutation = useMutation({
    mutationFn: ({
      rapatId,
      pesertaId,
      isHadir,
      metode,
    }: {
      rapatId: string;
      pesertaId: string;
      isHadir: boolean;
      metode?: any;
    }) =>
      rapatApi.recordAttendance(rapatId, {
        pesertaId,
        isHadir,
        metodeKehadiran: metode || (isHadir ? 'MANUAL_PANITIA' : 'BELUM_HADIR'),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rapatQueryKeys.detail(selectedRapatForAttendees || '') });
      queryClient.invalidateQueries({ queryKey: rapatQueryKeys.list() });
    },
  });

  // Filter peserta di modal detail
  const [pesertaSearch, setPesertaSearch] = useState('');
  const [pesertaFilter, setPesertaFilter] = useState<'ALL' | 'HADIR' | 'BELUM'>('ALL');

  const filteredAttendees = useMemo(() => {
    if (!detailRapat?.PesertaRapat) return [];
    return detailRapat.PesertaRapat.filter((p) => {
      const matchSearch =
        p.nama_peserta.toLowerCase().includes(pesertaSearch.toLowerCase()) ||
        (p.nomor_identitas && p.nomor_identitas.toLowerCase().includes(pesertaSearch.toLowerCase())) ||
        (p.jabatan_keterangan && p.jabatan_keterangan.toLowerCase().includes(pesertaSearch.toLowerCase()));

      if (pesertaFilter === 'HADIR') return matchSearch && p.is_hadir;
      if (pesertaFilter === 'BELUM') return matchSearch && !p.is_hadir;
      return matchSearch;
    });
  }, [detailRapat?.PesertaRapat, pesertaSearch, pesertaFilter]);

  const handleDelete = (r: RapatMasterItem) => {
    if (window.confirm(`Yakin ingin menghapus rapat "${r.judul_rapat}" beserta seluruh data kehadirannya?`)) {
      deleteRapatMutation.mutate(r.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER & STATS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Manajemen Rapat Terpadu & Notulen
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Modul Global
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan agenda rapat dinas, sosialisasi, kurikulum, orang tua murid, dan rekapitulasi kehadiran resmi.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs h-9"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Muat Ulang
          </Button>

          <Button
            onClick={() => {
              setEditingRapat(null);
              setIsCreateModalOpen(true);
            }}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs h-9 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Jadwalkan Rapat Baru
          </Button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Rapat</p>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-bold text-slate-900">{statsSummary.total}</span>
            <span className="text-[11px] text-slate-400 font-mono">Agenda</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Sedang Berlangsung</p>
            {statsSummary.berlangsung > 0 && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-bold text-emerald-600">{statsSummary.berlangsung}</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Live Scanner
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Rapat Terjadwal</p>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-bold text-blue-600">{statsSummary.dijadwalkan}</span>
            <span className="text-[11px] text-slate-400">Akan Datang</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Rata-rata Kehadiran</p>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-bold text-indigo-600">{statsSummary.avgPartisipasi}%</span>
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
              Partisipasi
            </span>
          </div>
        </div>
      </div>

      {/* ── FILTER TOOLBAR ── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Cari judul, ruangan, atau pimpinan rapat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={kategoriFilter}
            onChange={(e) => setKategoriFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="DEWAN_GURU">Dewan Guru (Dinas)</option>
            <option value="SOSIALISASI">Sosialisasi Platform</option>
            <option value="KURIKULUM">Kurikulum & KBM</option>
            <option value="KOMITE_ORANG_TUA">Komite / Wali Murid</option>
            <option value="PLENO_KENAIKAN_KELULUSAN">Pleno Kelulusan</option>
            <option value="JURUSAN_KAPROG">Program Keahlian / PKL</option>
            <option value="KOORDINASI_BK">Koordinasi BK</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="BERLANGSUNG">🔴 Sedang Berlangsung</option>
            <option value="DIJADWALKAN">📅 Terjadwal</option>
            <option value="SELESAI">✅ Selesai</option>
            <option value="DIBATALKAN">❌ Dibatalkan</option>
          </select>
        </div>
      </div>

      {/* ── DAFTAR KARTU RAPAT ── */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
          Memuat data rapat institusi...
        </div>
      ) : rapatItems.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-700">Belum ada agenda rapat yang sesuai</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Jadwalkan rapat dinas, sosialisasi, atau rapat komite orang tua baru untuk mulai mencatat presensi mandiri.
          </p>
          <Button
            onClick={() => {
              setEditingRapat(null);
              setIsCreateModalOpen(true);
            }}
            size="sm"
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Jadwalkan Rapat Pertama
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rapatItems.map((r) => {
            const isLive = r.status === 'BERLANGSUNG';
            const total = r.stats?.totalPeserta || 0;
            const hadir = r.stats?.hadirCount || 0;
            const persentase = r.stats?.persentaseHadir || 0;

            const formattedDate = new Date(r.tanggal_rapat).toLocaleDateString('id-ID', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={r.id}
                className={cn(
                  'bg-white rounded-2xl border p-5 transition-all shadow-sm flex flex-col justify-between',
                  isLive
                    ? 'border-emerald-300 ring-2 ring-emerald-500/20 bg-gradient-to-br from-emerald-50/30 via-white to-white'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div>
                  {/* Status & Kategori Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider',
                          isLive
                            ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                            : r.status === 'SELESAI'
                            ? 'bg-slate-100 text-slate-700'
                            : r.status === 'DIBATALKAN'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-blue-100 text-blue-700'
                        )}
                      >
                        {isLive ? '🔴 LIVE BERLANGSUNG' : r.status}
                      </span>

                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {r.kategori_rapat.replace(/_/g, ' ')}
                      </span>

                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {r.target_peserta.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {r.nomor_surat && (
                      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                        {r.nomor_surat}
                      </span>
                    )}
                  </div>

                  {/* Judul & Deskripsi */}
                  <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                    {r.judul_rapat}
                  </h3>
                  {r.deskripsi && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.deskripsi}</p>
                  )}

                  {/* Waktu & Lokasi */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{formattedDate}</span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {r.jam_mulai} {r.jam_selesai ? `- ${r.jam_selesai}` : 's/d Selesai'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{r.tempat}</span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{r.pimpinan_rapat || 'Kepala Sekolah'}</span>
                    </div>
                  </div>

                  {/* Kehadiran Progress Bar */}
                  <div className="mt-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                        Kehadiran Peserta:
                      </span>
                      <span className="font-bold text-slate-900 font-mono">
                        {hadir} / {total} Hadir ({persentase}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all duration-500 rounded-full',
                          persentase >= 80 ? 'bg-emerald-500' : persentase >= 50 ? 'bg-amber-500' : 'bg-indigo-600'
                        )}
                        style={{ width: `${Math.min(100, persentase)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi Rapat */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  {/* Status Lifecycle Quick Action */}
                  <div className="flex items-center gap-1.5">
                    {r.status === 'DIJADWALKAN' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: r.id, status: 'BERLANGSUNG' })}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-8 px-2.5 font-semibold"
                      >
                        <Play className="w-3 h-3 mr-1 fill-white" />
                        Mulai Rapat (Live)
                      </Button>
                    )}

                    {r.status === 'BERLANGSUNG' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: r.id, status: 'SELESAI' })}
                        className="bg-slate-800 hover:bg-slate-900 text-white text-[11px] h-8 px-2.5 font-semibold"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Tutup / Selesaikan
                      </Button>
                    )}

                    {r.status === 'SELESAI' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: r.id, status: 'BERLANGSUNG' })}
                        className="text-[11px] h-8 px-2 text-slate-600"
                        title="Buka kembali sesi rapat jika ada yang perlu diperbaiki"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Buka Ulang
                      </Button>
                    )}
                  </div>

                  {/* Tool Buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* Buka Lembar QR Cetak */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQrPrintRapat(r)}
                      className="text-xs h-8 px-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                      title="Cetak Lembar QR Presensi Resmi"
                    >
                      <QrCode className="w-3.5 h-3.5 mr-1" />
                      QR Cetak
                    </Button>

                    {/* Buka Berita Acara & Notulen */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const detail = await rapatApi.getRapatDetail(r.id);
                        setBapPrintRapat(detail);
                      }}
                      className="text-xs h-8 px-2 text-slate-700 border-slate-200 hover:bg-slate-50"
                      title="Cetak Berita Acara & Daftar Hadir"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1" />
                      Berita Acara
                    </Button>

                    {/* Buka Daftar Peserta & Checklist Manual */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRapatForAttendees(r.id)}
                      className="text-xs h-8 px-2 text-slate-700 border-slate-200 hover:bg-slate-50"
                      title="Lihat & Kelola Daftar Peserta"
                    >
                      <Users className="w-3.5 h-3.5 mr-1" />
                      Peserta
                    </Button>

                    {/* Edit Rapat */}
                    <button
                      onClick={() => {
                        setEditingRapat(r);
                        setIsCreateModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors"
                      title="Ubah Rapat & Notulen"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Hapus Rapat */}
                    <button
                      onClick={() => handleDelete(r)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                      title="Hapus Rapat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT RAPAT ── */}
      {isCreateModalOpen && (
        <CreateEditRapatModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingRapat(null);
          }}
          onSubmit={async (payload) => {
            await saveRapatMutation.mutateAsync(payload);
          }}
          initialData={editingRapat}
          isLoading={saveRapatMutation.isPending}
        />
      )}

      {/* ── MODAL: LEMBAR QR CETAK RESMI ── */}
      {qrPrintRapat && (
        <RapatQrPrintModal
          isOpen={Boolean(qrPrintRapat)}
          onClose={() => setQrPrintRapat(null)}
          rapat={qrPrintRapat}
        />
      )}

      {/* ── MODAL: BERITA ACARA & NOTULEN PDF ── */}
      {bapPrintRapat && (
        <RapatBeritaAcaraPrintModal
          isOpen={Boolean(bapPrintRapat)}
          onClose={() => setBapPrintRapat(null)}
          rapat={bapPrintRapat}
          attendees={bapPrintRapat.PesertaRapat || []}
        />
      )}

      {/* ── MODAL: KELOLA PESERTA & CHECKLIST LIVE ── */}
      {selectedRapatForAttendees && detailRapat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Daftar Kehadiran: {detailRapat.judul_rapat}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {detailRapat.stats?.hadirCount || 0} / {detailRapat.stats?.totalPeserta || 0} Hadir
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Checklist manual panitia, verifikasi NIP/NISN, atau konfirmasi izin/sakit peserta rapat.
                </p>
              </div>

              <button
                onClick={() => setSelectedRapatForAttendees(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between gap-3 bg-white">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Cari nama peserta, NIP, atau jabatan..."
                  value={pesertaSearch}
                  onChange={(e) => setPesertaSearch(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant={pesertaFilter === 'ALL' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPesertaFilter('ALL')}
                  className="text-xs h-8"
                >
                  Semua ({detailRapat.PesertaRapat?.length || 0})
                </Button>
                <Button
                  variant={pesertaFilter === 'HADIR' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPesertaFilter('HADIR')}
                  className="text-xs h-8 text-emerald-700"
                >
                  Hadir ({detailRapat.stats?.hadirCount || 0})
                </Button>
                <Button
                  variant={pesertaFilter === 'BELUM' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPesertaFilter('BELUM')}
                  className="text-xs h-8 text-rose-700"
                >
                  Belum ({detailRapat.stats?.belumHadirCount || 0})
                </Button>
              </div>
            </div>

            {/* Tabel Peserta */}
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-left font-semibold">
                    <th className="pb-2 pl-2 w-10">No</th>
                    <th className="pb-2">Nama Peserta</th>
                    <th className="pb-2">NIP / Identitas</th>
                    <th className="pb-2">Jabatan / Keterangan</th>
                    <th className="pb-2">Waktu Hadir</th>
                    <th className="pb-2 text-right pr-2">Aksi Presensi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttendees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">
                        Tidak ada peserta yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendees.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 pl-2 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 font-semibold text-slate-900">{p.nama_peserta}</td>
                        <td className="py-2.5 font-mono text-slate-500">{p.nomor_identitas || '-'}</td>
                        <td className="py-2.5 text-slate-600">{p.jabatan_keterangan || '-'}</td>
                        <td className="py-2.5">
                          {p.is_hadir && p.waktu_hadir ? (
                            <span className="font-mono text-emerald-700 font-medium">
                              {new Date(p.waktu_hadir).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              WIB
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-2 text-right">
                          {p.is_hadir ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                toggleAttendanceMutation.mutate({
                                  rapatId: detailRapat.id,
                                  pesertaId: p.id,
                                  isHadir: false,
                                })
                              }
                              className="text-xs h-7 px-2 border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                              Hadir (Batalkan)
                            </Button>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                onClick={() =>
                                  toggleAttendanceMutation.mutate({
                                    rapatId: detailRapat.id,
                                    pesertaId: p.id,
                                    isHadir: true,
                                  })
                                }
                                className="text-xs h-7 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                              >
                                Tandai Hadir
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  toggleAttendanceMutation.mutate({
                                    rapatId: detailRapat.id,
                                    pesertaId: p.id,
                                    isHadir: false,
                                    metode: 'IZIN',
                                  })
                                }
                                className="text-[10px] h-7 px-1.5 text-amber-700 hover:bg-amber-50"
                              >
                                Izin
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <Button onClick={() => setSelectedRapatForAttendees(null)} size="sm">
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

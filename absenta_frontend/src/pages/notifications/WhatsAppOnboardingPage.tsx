import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { OperationalPageLayout } from '@/components/layout/OperationalPageLayout';
import {
  Search,
  Users,
  BookOpen,
  GraduationCap,
  HeartHandshake,
  MessageSquare,
  Send,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  Smartphone,
} from 'lucide-react';
import {
  getWaOnboardingUsers,
  sendWaGreeting,
  sendWaGreetingBulk,
  type WaOnboardingUser,
  type WaOnboardingSummary,
} from '@/api/whatsapp.api';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export function WhatsAppOnboardingPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<WaOnboardingUser[]>([]);
  const [summary, setSummary] = useState<WaOnboardingSummary>({
    totalTotal: 0,
    totalGuru: 0,
    totalSiswa: 0,
    totalOrtu: 0,
    totalBelum: 0,
    totalSudah: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Filters
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'GURU' | 'SISWA' | 'ORTU' | 'KEPALA_SEKOLAH' | 'WALIKELAS' | 'PETUGAS_KELAS' | 'PETUGAS_GERBANG' | 'KAPROG' | 'WAKA' | 'TOOLMAN' | 'TU' | 'BPBK' | 'KOPERASI'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BELUM' | 'SUDAH'>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modals & Action states
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [previewUser, setPreviewUser] = useState<WaOnboardingUser | null>(null);
  const [customMsg, setCustomMsg] = useState('');
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getWaOnboardingUsers({
        role: roleFilter,
        status: statusFilter,
        search: debouncedSearch,
        page: pagination.page,
        limit: pagination.limit,
      });

      if (res.success) {
        setUsers(res.data);
        setSummary(res.summary);
        setPagination(res.pagination);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat data onboarding pengguna WA.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, debouncedSearch, pagination.page, pagination.limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Preview Modal
  const handleOpenPreview = (u: WaOnboardingUser) => {
    setPreviewUser(u);
    let defaultMsg = '';
    if (u.userType === 'GURU') {
      defaultMsg =
        `👋 *Halo Bapak/Ibu ${u.nama}*\n\n` +
        `Selamat datang di Layanan WhatsApp Bot Resmi *Absenta*.\n\n` +
        `Bapak/Ibu dapat menggunakan layanan informasi cepat WA Bot ini dengan mengetik perintah berikut:\n\n` +
        `[1] 📚 Jadwal KBM (Hari Ini, 1 Minggu & Jadwal Kelas)\n` +
        `[2] ⏰ Presensi & Rekap Kehadiran Guru\n` +
        `[3] 🏫 Portal Wali Kelas & Kontak Ortu Siswa\n` +
        `[8] 📍 Posisi & Status Mengajar Guru saat ini\n` +
        `[9] 🟨 Siswa Izin Keluar (Khusus Guru Piket)\n\n` +
        `💡 *Himbauan*: Mohon simpan nomor WhatsApp ini sebagai *WA Bot Absenta Sekolah* agar notifikasi & informasi penting sekolah dapat diterima dengan lancar.\n\n` +
        `Ketik *[0]* atau *MENU* untuk mencoba layanan bot! 😊`;
    } else if (u.userType === 'SISWA') {
      defaultMsg =
        `👋 *Halo ${u.nama}* (${u.detailInfo})\n\n` +
        `Selamat datang di Layanan WhatsApp Bot Resmi *Absenta*.\n\n` +
        `Kamu dapat mengecek informasi sekolahmu secara langsung di sini:\n\n` +
        `[1] 👤 Profil & Data RFID\n` +
        `[2] ⏰ Status Presensi Gate Masuk/Pulang\n` +
        `[3] 🏆 Catatan Poin Pelanggaran & Prestasi\n` +
        `[4] 📅 Jadwal Pelajaran Hari Ini & 1 Minggu\n` +
        `[5] 📊 Rekap Bulanan Kehadiran\n\n` +
        `💡 *Himbauan*: Jangan lupa simpan nomor WhatsApp ini sebagai *WA Bot Absenta Sekolah*.\n\n` +
        `Ketik *[0]* atau *MENU* untuk mencoba layanan bot! 😊`;
    } else {
      defaultMsg =
        `👋 *Halo Bapak/Ibu ${u.nama}*\n\n` +
        `Selamat datang di Layanan WhatsApp Bot Resmi *Absenta*.\n\n` +
        `Bapak/Ibu dapat memantau kehadiran & perkembangan Ananda di sekolah secara langsung via WhatsApp Bot:\n\n` +
        `[1] ⏰ Status Presensi Gate & KBM Ananda Hari Ini\n` +
        `[2] 📊 Rekapitulasi Kehadiran Bulanan\n` +
        `[3] 🏆 Catatan Poin Kedisiplinan & Prestasi\n` +
        `[4] 📞 Kontak Info Wali Kelas Ananda\n` +
        `[5] ✉️ Pengajuan Surat Izin / Sakit Ananda via WA\n\n` +
        `💡 *Himbauan*: Mohon simpan nomor WhatsApp ini sebagai *WA Bot Absenta Sekolah*.\n\n` +
        `Ketik *[0]* atau *MENU* untuk mencoba layanan bot! 😊`;
    }
    setCustomMsg(defaultMsg);
  };

  // Send Single Greeting
  const handleSendSingle = async () => {
    if (!previewUser) return;
    try {
      setSendingId(previewUser.id);
      const res = await sendWaGreeting({
        userType: previewUser.userType,
        nama: previewUser.nama,
        no_hp: previewUser.no_hp,
        detailInfo: previewUser.detailInfo,
        customMessage: customMsg,
      });

      if (res.success) {
        toast.success(`Pesan sapaan berhasil dijadwalkan ke ${previewUser.nama}`);
        setPreviewUser(null);
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim pesan sapaan WA.');
    } finally {
      setSendingId(null);
    }
  };

  // Send Bulk Greeting
  const handleSendBulk = async () => {
    try {
      setBulkSending(true);
      setShowBulkConfirmModal(false);
      const res = await sendWaGreetingBulk({
        role: roleFilter,
        search: debouncedSearch,
      });

      if (res.success) {
        toast.success(res.message);
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim pesan sapaan masif.');
    } finally {
      setBulkSending(false);
    }
  };

  return (
    <OperationalPageLayout
      title="Monitoring & Sapa Pengguna WA Bot"
      subtitle="Pantau status komunikasi Guru, Siswa, dan Orang Tua dengan WA Bot serta kirimkan pesan sapaan onboarding instan."
      headerActions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/notifications/wa-chat-logs')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition border border-slate-700"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Riwayat Chat Log</span>
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition border border-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      }
    >
      <div className="p-4 space-y-6">
        {/* STATS CARDS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Total */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Total Kontak</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl font-bold text-white">{summary.totalTotal}</div>
          </div>

          {/* Guru */}
          <div className="bg-slate-900/80 border border-blue-900/40 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-blue-400 mb-1">
              <span className="text-xs font-medium">Guru</span>
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold text-blue-400">{summary.totalGuru}</div>
          </div>

          {/* Siswa */}
          <div className="bg-slate-900/80 border border-emerald-900/40 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-emerald-400 mb-1">
              <span className="text-xs font-medium">Siswa</span>
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold text-emerald-400">{summary.totalSiswa}</div>
          </div>

          {/* Ortu */}
          <div className="bg-slate-900/80 border border-amber-900/40 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-amber-400 mb-1">
              <span className="text-xs font-medium">Orang Tua</span>
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold text-amber-400">{summary.totalOrtu}</div>
          </div>

          {/* Belum Komunikasi (Highlight) */}
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-rose-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Belum Sapa</span>
              <XCircle className="w-4 h-4 text-rose-400 animate-pulse" />
            </div>
            <div className="text-xl font-extrabold text-rose-300">{summary.totalBelum}</div>
          </div>

          {/* Sudah Komunikasi */}
          <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-emerald-400 mb-1">
              <span className="text-xs font-medium">Sudah Sapa</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-300">{summary.totalSudah}</div>
          </div>
        </div>

        {/* FILTER BAR & ACTION BUTTON */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Filter Role Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Peran:
              </span>
              {(['ALL', 'GURU', 'SISWA', 'ORTU', 'KEPALA_SEKOLAH', 'WALIKELAS', 'PETUGAS_KELAS', 'PETUGAS_GERBANG', 'KAPROG', 'WAKA', 'TOOLMAN', 'TU', 'BPBK', 'KOPERASI'] as const).map((r) => {
                const active = roleFilter === r;
                const labels: Record<string, string> = {
                  ALL: 'Semua Peran',
                  GURU: '📚 Guru',
                  SISWA: '🎓 Siswa',
                  ORTU: '👨‍👩‍👧 Ortu',
                  KEPALA_SEKOLAH: '👨‍💼 Kepala Sekolah',
                  WALIKELAS: '🏫 Wali Kelas',
                  PETUGAS_KELAS: '📋 Petugas Kelas',
                  PETUGAS_GERBANG: '🛡️ Petugas Gerbang',
                  KAPROG: '👨‍🏫 Kaprog',
                  WAKA: '👔 Para Waka',
                  TOOLMAN: '🔧 Toolman',
                  TU: '📁 Tata Usaha',
                  BPBK: '💬 Guru BP/BK',
                  KOPERASI: '🏪 Koperasi',
                };
                return (
                  <button
                    key={r}
                    onClick={() => {
                      setRoleFilter(r);
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                      active
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 font-semibold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                    }`}
                  >
                    {labels[r]}
                  </button>
                );
              })}
            </div>

            {/* Action Bulk Button */}
            <button
              onClick={() => setShowBulkConfirmModal(true)}
              disabled={bulkSending || summary.totalBelum === 0}
              className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30 hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '3s' }} />
              <span>Sapa Semua yang Belum Komunikasi ({summary.totalBelum})</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            {/* Filter Status Pills */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs font-medium text-slate-400 mr-1">Status:</span>
              {(['ALL', 'BELUM', 'SUDAH'] as const).map((st) => {
                const active = statusFilter === st;
                const labels = {
                  ALL: 'Semua',
                  BELUM: '🔴 Belum Komunikasi',
                  SUDAH: '🟢 Sudah Komunikasi',
                };
                return (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusFilter(st);
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                      active
                        ? 'bg-slate-700 text-white border border-slate-600'
                        : 'bg-slate-800/50 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {labels[st]}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama, no. HP, NIP, kelas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
              />
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nama Pengguna</th>
                  <th className="py-3 px-4">Peran</th>
                  <th className="py-3 px-4">No. WhatsApp</th>
                  <th className="py-3 px-4">Detail Info / Kelas</th>
                  <th className="py-3 px-4">Status WA Bot</th>
                  <th className="py-3 px-4">Komunikasi Terakhir</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                        <span>Memuat data pengguna & status komunikasi WA...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Tidak ada pengguna yang memenuhi kriteria filter.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSudah = u.statusKomunikasi === 'SUDAH';
                    const roleBadge =
                      u.userType === 'GURU'
                        ? { label: 'Guru', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: <BookOpen className="w-3 h-3" /> }
                        : u.userType === 'SISWA'
                        ? { label: 'Siswa', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: <GraduationCap className="w-3 h-3" /> }
                        : { label: 'Ortu', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: <HeartHandshake className="w-3 h-3" /> };

                    return (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-semibold text-white">
                          {u.nama}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${roleBadge.bg}`}>
                            {roleBadge.icon}
                            {roleBadge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {u.no_hp}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {u.detailInfo}
                        </td>
                        <td className="py-3 px-4">
                          {isSudah ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                              <CheckCircle2 className="w-3 h-3" /> Sudah Komunikasi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-950/80 text-rose-400 border border-rose-800/80">
                              <XCircle className="w-3 h-3" /> Belum Komunikasi
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {u.lastCommAt ? (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {format(parseISO(u.lastCommAt.toString()), 'dd MMM yyyy, HH:mm', { locale: idLocale })}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenPreview(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-600/40 transition shadow-sm"
                          >
                            <Send className="w-3 h-3" />
                            <span>Sapa WA</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER */}
          {pagination.totalPages > 1 && (
            <div className="py-3 px-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
              <div>
                Menampilkan halaman <span className="font-semibold text-white">{pagination.page}</span> dari{' '}
                <span className="font-semibold text-white">{pagination.totalPages}</span> ({pagination.total} total data)
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PREVIEW & SEND SINGLE GREETING MODAL */}
      {previewUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Pratinjau Pesan Sapaan WA</h3>
              </div>
              <button onClick={() => setPreviewUser(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between">
                <div>
                  <span className="text-slate-400">Penerima:</span>{' '}
                  <span className="font-bold text-white">{previewUser.nama}</span>
                </div>
                <div className="font-mono text-emerald-400">{previewUser.no_hp}</div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Teks Pesan (Dapat Disesuaikan):</label>
                <textarea
                  rows={10}
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPreviewUser(null)}
                className="px-4 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={handleSendSingle}
                disabled={sendingId !== null}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingId !== null ? 'Mengirim...' : 'Kirim Sapaan WA'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK GREETING CONFIRMATION MODAL */}
      {showBulkConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <Sparkles className="w-6 h-6 animate-spin" style={{ animationDuration: '4s' }} />
              <h3 className="font-bold text-white text-base">Konfirmasi Sapa Masif</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Anda akan mengirimkan pesan sapaan WA personal ke{' '}
              <strong className="text-emerald-400 font-bold">{summary.totalBelum} pengguna</strong> yang saat ini memiliki status{' '}
              <strong className="text-rose-400 font-bold">Belum Komunikasi</strong>.
            </p>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div>• Pengiriman menggunakan antrean WA Queue otomatis dengan jeda aman.</div>
              <div>• Pengguna akan diajak mencoba menu bot & menyimpan nomor WA sekolah.</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowBulkConfirmModal(false)}
                className="px-4 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={handleSendBulk}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ya, Kirim Sapaan Masif</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </OperationalPageLayout>
  );
}

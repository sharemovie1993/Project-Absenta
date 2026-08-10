import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OperationalPageLayout } from '@/components/layout/OperationalPageLayout';
import {
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  GraduationCap,
  HeartHandshake,
  Send,
} from 'lucide-react';
import {
  type WaOnboardingUser,
} from '@/api/whatsapp.api';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

import { useWaOnboarding, type RoleFilterType, type StatusFilterType } from '@/hooks/useWaOnboarding';
import { WaOnboardingStatsCards } from './components/WaOnboardingStatsCards';
import { WaOnboardingFilterBar } from './components/WaOnboardingFilterBar';
import { WaOnboardingPreviewModal } from './components/WaOnboardingPreviewModal';
import { WaOnboardingBulkModal } from './components/WaOnboardingBulkModal';

export function WhatsAppOnboardingPage() {
  const navigate = useNavigate();

  // Filters & State
  const [roleFilter, setRoleFilter] = useState<RoleFilterType>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [previewUser, setPreviewUser] = useState<WaOnboardingUser | null>(null);
  const [customMsg, setCustomMsg] = useState('');
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // React Query Custom Hook
  const {
    users,
    summary,
    pagination,
    isLoading,
    isRefetching,
    refetch,
    sendSingle,
    isSendingSingle,
    sendBulk,
    isSendingBulk,
  } = useWaOnboarding({
    role: roleFilter,
    status: statusFilter,
    search: debouncedSearch,
    page,
  });

  // Open Preview Modal
  const handleOpenPreview = (u: WaOnboardingUser) => {
    setPreviewUser(u);
    const detail = String(u.detailInfo || '').trim();
    const detailUpper = detail.toUpperCase();

    // Position Flags
    const isKepsek = detailUpper.includes('KEPALA SEKOLAH') || detailUpper.includes('KEPSEK');
    const isWaliKelas = detailUpper.includes('WALI KELAS') || detailUpper.includes('WALIKELAS');
    const isBpBk = detailUpper.includes('BP') || detailUpper.includes('BK') || detailUpper.includes('KONSELING');
    const isKoperasi = detailUpper.includes('KOPERASI');
    const isWaka = detailUpper.includes('WAKA') || detailUpper.includes('KURIKULUM') || detailUpper.includes('KESISWAAN') || detailUpper.includes('HUBIN') || detailUpper.includes('SARPRAS');
    const isKaprog = detailUpper.includes('KAPROG');
    const isGerbang = detailUpper.includes('GERBANG') || detailUpper.includes('SATPAM');
    const isPetugasKelas = detailUpper.includes('PETUGAS') && u.userType === 'SISWA';

    // Salutation & Header
    let salutation = 'Halo';
    let honorific = 'Bapak/Ibu ';
    if (u.userType === 'SISWA') {
      honorific = '';
    } else if (isKepsek || isWaka) {
      salutation = 'Yth.';
    }

    const titleSuffix = detail ? ` (${detail})` : (u.userType === 'GURU' ? ' (Guru)' : u.userType === 'SISWA' ? ' (Siswa)' : ' (Orang Tua)');
    let header = `👋 *${salutation} ${honorific}${u.nama}*${titleSuffix}\n\n` +
      `Selamat datang di Layanan WhatsApp Bot Resmi *Absenta*.\n\n`;

    const menuItems: string[] = [];

    if (isPetugasKelas) {
      header += `Sebagai *Petugas Absensi Kelas*, kamu dapat mengentri presensi & jurnal KBM di kelasmu via WA Bot:\n\n`;
      menuItems.push(`[1] 📋 Presensi Sesi KBM Kelas (Input Hadir/Sakit/Izin & Jurnal Guru)`);
      menuItems.push(`[2] 👤 Profil & Data RFID`);
      menuItems.push(`[3] ⏰ Status Presensi Gate Masuk/Pulang`);
      menuItems.push(`[4] 📅 Jadwal Pelajaran Kelas`);
    } else if (isGerbang) {
      header += `Sebagai *Petugas Gerbang*, Anda dapat mengawasi presensi gate & kedisiplinan gerbang:\n\n`;
      menuItems.push(`[1] 🛡️ Scan RFID / QR Code Gate Masuk & Pulang`);
      menuItems.push(`[2] 🟨 Penindakan Kedisiplinan Langsung di Gerbang`);
      menuItems.push(`[3] 📋 Cek Daftar Siswa Belum Absen / Terlambat`);
    } else if (u.userType === 'GURU') {
      header += `Bapak/Ibu dapat menggunakan layanan WA Bot sesuai dengan persona & jabatan Anda:\n\n`;
      menuItems.push(`[1] 📚 Jadwal KBM (Hari Ini, 1 Minggu & Jadwal Kelas)`);
      menuItems.push(`[2] ⏰ Presensi & Rekap Kehadiran Guru`);

      if (isWaliKelas) {
        menuItems.push(`[3] 🏫 Portal Wali Kelas (Monitoring Absensi, Poin, & Kontak Ortu Siswa Binaan)`);
      } else if (isBpBk) {
        menuItems.push(`[3] 🏆 Portal BP/BK (Poin Pelanggaran, Prestasi, & Bimbingan Konseling)`);
      } else {
        menuItems.push(`[3] 🏫 Portal Wali Kelas & Kontak Ortu Siswa`);
      }

      if (isKepsek || isWaka || isKaprog) {
        menuItems.push(`[4] 📊 Supervisi & Monitoring Operasional Manajerial`);
      }

      if (isKoperasi) {
        menuItems.push(`[7] 🏪 Portal Koperasi (Saldo, Transaksi POS, & Simpanan Anggota)`);
      }

      menuItems.push(`[8] 📍 Posisi & Status Mengajar Guru Saat Ini`);
      menuItems.push(`[9] 🟨 Siswa Izin Keluar (Khusus Guru Piket)`);
    } else if (u.userType === 'SISWA') {
      header += `Kamu dapat mengecek informasi sekolahmu secara langsung di sini:\n\n`;
      menuItems.push(`[1] 👤 Profil & Data RFID`);
      menuItems.push(`[2] ⏰ Status Presensi Gate Masuk/Pulang`);
      menuItems.push(`[3] 🏆 Catatan Poin Pelanggaran & Prestasi`);
      menuItems.push(`[4] 📅 Jadwal Pelajaran Hari Ini & 1 Minggu`);
      menuItems.push(`[5] 📊 Rekap Bulanan Kehadiran`);
    } else {
      // ORTU
      header += `Bapak/Ibu dapat memantau kehadiran & perkembangan Ananda di sekolah via WA Bot:\n\n`;
      menuItems.push(`[1] ⏰ Status Presensi Gate & KBM Ananda Hari Ini`);
      menuItems.push(`[2] 📊 Rekapitulasi Kehadiran Bulanan`);
      menuItems.push(`[3] 🏆 Catatan Poin Kedisiplinan & Prestasi`);
      menuItems.push(`[4] 📞 Kontak Info Wali Kelas Ananda`);
      menuItems.push(`[5] ✉️ Pengajuan Surat Izin / Sakit Ananda via WA`);
    }

    const footer = `\n\n💡 *Himbauan*: Mohon simpan nomor WhatsApp ini sebagai *WA Bot Absenta Sekolah* agar informasi penting sekolah dapat diterima dengan lancar.\n\n` +
      `Ketik *[0]* atau *MENU* untuk mencoba layanan bot! 😊`;

    setCustomMsg(header + menuItems.join('\n') + footer);
  };

  // Dispatch Single Greeting
  const handleSendSingle = async () => {
    if (!previewUser) return;
    try {
      await sendSingle({
        userType: previewUser.userType,
        nama: previewUser.nama,
        no_hp: previewUser.no_hp,
        detailInfo: previewUser.detailInfo,
        customMessage: customMsg,
      });
      setPreviewUser(null);
    } catch {
      // Toast handles error automatically in mutation hook
    }
  };

  // Dispatch Bulk Greeting
  const handleSendBulk = async () => {
    try {
      await sendBulk({
        role: roleFilter,
        search: debouncedSearch,
      });
      setShowBulkConfirmModal(false);
    } catch {
      // Toast handles error automatically in mutation hook
    }
  };

  return (
    <OperationalPageLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/notifications')}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shadow-sm"
              title="Kembali ke Pengaturan Notifikasi"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <h1 className="text-lg font-bold text-white tracking-tight">Onboarding & Sapaan WA Bot</h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitoring status komunikasi & kirim sapaan resmi WA Bot ke Guru, Staf, Siswa, dan Ortu
              </p>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700/60 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>{isRefetching ? 'Memutakhirkan...' : 'Refresh Data'}</span>
          </button>
        </div>

        {/* SUMMARY STATS CARDS */}
        <WaOnboardingStatsCards summary={summary} />

        {/* FILTER BAR & SEARCH */}
        <WaOnboardingFilterBar
          roleFilter={roleFilter}
          onSelectRole={(r) => {
            setRoleFilter(r);
            setPage(1);
          }}
          statusFilter={statusFilter}
          onSelectStatus={(s) => {
            setStatusFilter(s);
            setPage(1);
          }}
          search={search}
          onSearchChange={setSearch}
          totalBelum={summary.totalBelum}
          bulkSending={isSendingBulk}
          onOpenBulkModal={() => setShowBulkConfirmModal(true)}
        />

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
                {isLoading ? (
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
                  onClick={() => setPage((p) => p - 1)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PREVIEW MODAL */}
      <WaOnboardingPreviewModal
        user={previewUser}
        customMsg={customMsg}
        onCustomMsgChange={setCustomMsg}
        onClose={() => setPreviewUser(null)}
        onSend={handleSendSingle}
        isSending={isSendingSingle}
      />

      {/* BULK CONFIRM MODAL */}
      <WaOnboardingBulkModal
        isOpen={showBulkConfirmModal}
        onClose={() => setShowBulkConfirmModal(false)}
        onConfirm={handleSendBulk}
        isSending={isSendingBulk}
        totalBelum={summary.totalBelum}
        roleFilterLabel={roleFilter}
      />
    </OperationalPageLayout>
  );
}

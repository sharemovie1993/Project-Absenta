import React, { useState, useEffect, useCallback } from 'react';
import { Users, ShieldCheck, AlertTriangle, RefreshCw, Eye, X, Activity, Clock, UserCheck, MessageSquare, Copy, Phone, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getActiveOnlineUsers, sendWaLogoutWarning, ActiveUserItem } from '@/api/activityLog.api';
import { Button, Badge } from '@/components/ui';

export function ActiveUsersSafetyCard() {
  const [activeUsers, setActiveUsers] = useState<ActiveUserItem[]>([]);
  const [count, setCount] = useState<number>(0);
  const [windowMinutes, setWindowMinutes] = useState<number>(15);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [sendingWaUserId, setSendingWaUserId] = useState<string | null>(null);
  const [sendingBulkWa, setSendingBulkWa] = useState<boolean>(false);

  const fetchActiveUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getActiveOnlineUsers();
      if (res.success && res.data) {
        setCount(res.data.count || 0);
        setActiveUsers(res.data.users || []);
        setWindowMinutes(res.data.window_minutes || 15);
      }
    } catch (err) {
      console.error('Failed to fetch active online users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveUsers();
    const interval = setInterval(fetchActiveUsers, 30000);
    return () => clearInterval(interval);
  }, [fetchActiveUsers]);

  const isSafeForMaintenance = count <= 1;

  // Kirim via Backend WA Gateway murni (Tanpa membuka tab browser external/wa.me)
  const handleSendWaGateway = async (user: ActiveUserItem) => {
    try {
      setSendingWaUserId(user.user_id);
      const res = await sendWaLogoutWarning({
        user_id: user.user_id,
        phone: user.no_hp || undefined,
        name: user.name,
      });

      if (res.success) {
        toast.success(res.message || `Pesan WA Gateway berhasil terkirim ke ${user.name}!`, {
          icon: '✅',
          duration: 5000,
        });
      } else {
        toast.error(`Gagal WA Gateway: ${res.message}`, { duration: 5000 });
      }
    } catch (err: any) {
      console.error('WA Gateway Send Error:', err);
      const serverMsg = err.response?.data?.message || err.message || 'Koneksi terputus';
      toast.error(`Gagal WA Gateway: ${serverMsg}`, {
        duration: 6000,
      });
    } finally {
      setSendingWaUserId(null);
    }
  };

  // Kirim masif (Bulk Broadcast) via Backend WA Gateway
  const handleSendBulkWaGateway = async () => {
    if (activeUsers.length === 0) return;
    try {
      setSendingBulkWa(true);
      const res = await sendWaLogoutWarning({
        is_bulk: true,
        target_users: activeUsers.map(u => ({
          user_id: u.user_id,
          phone: u.no_hp || undefined,
          name: u.name,
        })),
      });

      if (res.success) {
        toast.success(res.message || 'Berhasil mengirim pesan WA Gateway ke pengguna online!', {
          duration: 5000,
        });
      } else {
        toast.error(`Gagal broadcast WA: ${res.message}`, { duration: 5000 });
      }
    } catch (err: any) {
      console.error('Bulk WA Gateway Error:', err);
      const serverMsg = err.response?.data?.message || err.message || 'Gangguan server';
      toast.error(`Gagal broadcast WA Gateway: ${serverMsg}`, {
        duration: 6000,
      });
    } finally {
      setSendingBulkWa(false);
    }
  };

  const handleCopyBroadcastText = () => {
    const names = activeUsers.map(u => u.name).join(', ');
    const broadcastMessage = `*PEMBERITAHUAN MAINTENANCE & PETUNJUK LOGOUT*\n\nKepada Seluruh Pengguna Aktif (*${names}*),\n\nSistem Absenta akan segera melakukan pemeliharaan / backup data.\n\nMohon untuk *SEGERA MENYIMPAN PEKERJAAN* Anda dan melakukan *LOGOUT* dari sistem.\n\nTerima kasih atas pengertian dan kerja samanya! 🙏`;

    navigator.clipboard.writeText(broadcastMessage);
    toast.success('Pesan broadcast peringatan logout berhasil disalin ke clipboard!');
  };

  return (
    <>
      <div className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
        isSafeForMaintenance
          ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-900/40 border-emerald-500/30'
          : 'bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-slate-900/40 border-amber-500/30'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
              isSafeForMaintenance
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {isSafeForMaintenance ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6 animate-pulse" />}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Indikator Keamanan Aktivitas Sesi User
                </h3>
                <Badge
                  variant={isSafeForMaintenance ? 'success' : 'warning'}
                  className="font-black text-[10px] tracking-widest uppercase px-2.5 py-0.5"
                >
                  {isSafeForMaintenance ? 'Aman Untuk Backup/Restore' : 'Perhatian: Sesi Aktif'}
                </Badge>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                {isSafeForMaintenance ? (
                  <span>
                    Saat ini terdeteksi <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">{count} pengguna aktif</strong> (termasuk Anda) dalam {windowMinutes} menit terakhir. Sistem dalam kondisi aman untuk melakukan ekspor atau pemulihan data.
                  </span>
                ) : (
                  <span>
                    Terdeteksi <strong className="text-amber-600 dark:text-amber-400 font-extrabold">{count} pengguna aktif</strong> yang sedang mengakses aplikasi dalam {windowMinutes} menit terakhir. Disarankan untuk berkoordinasi sebelum melakukan pemulihan data agar sesi pengguna tidak terganggu.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchActiveUsers}
              disabled={loading}
              className="text-xs font-bold gap-1.5 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>

            <Button
              variant={isSafeForMaintenance ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => setShowModal(true)}
              className="text-xs font-black gap-1.5 shadow-md"
            >
              <Eye className="w-3.5 h-3.5" />
              Lihat {count} User Online
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Detail User Active */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header Modal */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-500/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    Pengguna Aktif Terdeteksi ({count})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Daftar pengguna yang beraktivitas dalam {windowMinutes} menit terakhir
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Toolbar */}
            {activeUsers.length > 0 && (
              <div className="px-6 py-3 bg-emerald-500/5 border-b border-emerald-500/10 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Kirim peringatan via Service WA Gateway Absenta:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSendBulkWaGateway}
                    disabled={sendingBulkWa}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                  >
                    {sendingBulkWa ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Broadcast WA Gateway Ke Semua
                  </button>
                  <button
                    onClick={handleCopyBroadcastText}
                    className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all shrink-0"
                    title="Salin Teks Broadcast WA"
                  >
                    <Copy className="w-3 h-3" />
                    Salin Teks
                  </button>
                </div>
              </div>
            )}

            {/* List Body */}
            <div className="p-6 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/80">
              {activeUsers.length === 0 ? (
                <div className="py-12 text-center">
                  <UserCheck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Tidak ada aktivitas pengguna terdeteksi dalam {windowMinutes} menit terakhir.
                  </p>
                </div>
              ) : (
                activeUsers.map((u) => {
                  const hasPhone = Boolean(u.no_hp);
                  const isSendingThisUser = sendingWaUserId === u.user_id;

                  return (
                    <div key={u.user_id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                              {u.name}
                            </h4>
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {typeof u.role === 'object' ? (u.role as any)?.name : (u.role || 'USER')}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {u.email || 'Tanpa Email'}
                            </p>
                            {hasPhone ? (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5" />
                                {u.no_hp}
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-500 font-medium">
                                (Tanpa No HP)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 justify-end">
                            <Activity className="w-3 h-3 text-blue-500" />
                            <span>Aksi: {u.last_action}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5 justify-end">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{new Date(u.last_activity).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>

                        {/* Tombol Murni Backend WA Gateway API */}
                        <button
                          onClick={() => handleSendWaGateway(u)}
                          disabled={isSendingThisUser}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                          title={`Kirim WA Gateway ke ${u.name}`}
                        >
                          {isSendingThisUser ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>{isSendingThisUser ? 'Mengirim...' : 'Kirim WA Gateway'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                Pesan dikirim langsung melalui Service WA Gateway Absenta (Backend API)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModal(false)}
                className="text-xs font-bold px-4"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, Button, Badge } from "../../components/ui";
import { getUserNotifications } from "../../api/notifications.api";
import type { NotificationStatsResponse } from "../../types/notification";
import { AcademicPageLayout } from "../../components/academic/AcademicPageLayout";
import { formatDate } from "../../utils/layoutUtils";
import { Bell, CheckCheck, Send, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<NotificationStatsResponse["data"] | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("readNotificationIds");
      const arr = raw ? JSON.parse(raw) : [];
      return new Set<string>(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set<string>();
    }
  });

  const saveReadIds = useCallback((ids: string[]) => {
    setReadIds(new Set(ids));
    try {
      localStorage.setItem("readNotificationIds", JSON.stringify(ids));
    } catch {}
  }, []);

  const recent = useMemo(() => stats?.recentNotifications || [], [stats]);

  const todayCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (recent ?? []).filter((n) => String(n.created_at).slice(0, 10) === today).length;
  }, [recent]);

  const weekCount = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return (recent ?? []).filter((n) => {
      const d = new Date(n.created_at);
      return d >= sevenDaysAgo && d <= now;
    }).length;
  }, [recent]);

  const unreadCount = useMemo(() => {
    return (recent ?? []).filter((n) => !readIds.has(n.id)).length;
  }, [recent, readIds]);

  const markAllRead = useCallback(() => {
    const allIds = (recent ?? [])?.map((n) => n.id);
    saveReadIds(Array.from(new Set([...(Array.from(readIds)), ...allIds])));
  }, [recent, readIds, saveReadIds]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUserNotifications();
      setStats(res.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal memuat notifikasi";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pageStats = useMemo(() => [
    {
      title: "Unread",
      value: unreadCount,
      icon: <Bell size={14} />,
      gradient: "from-orange-500 to-red-600",
      subtitle: "Pesan baru"
    },
    {
      title: "Hari Ini",
      value: todayCount,
      icon: <Info size={14} />,
      gradient: "from-blue-500 to-indigo-600",
      subtitle: "Masuk hari ini"
    },
    {
      title: "Minggu Ini",
      value: weekCount,
      icon: <Send size={14} />,
      gradient: "from-emerald-500 to-teal-600",
      subtitle: "Total 7 hari terakhir"
    }
  ], [unreadCount, todayCount, weekCount]);

  return (
    <AcademicPageLayout
      title="Notifikasi & Pengumuman"
      description="Pusat pemberitahuan sistem, pesan otomatis, dan riwayat aktivitas akun Anda."
      stats={pageStats}
      hardeningModuleKey="notificationspage"
      breadcrumbs={[
        { label: 'Notifikasi' }
      ]}
      instruction={{
        title: 'Pusat Notifikasi',
        description: 'Halaman ini merangkum semua pesan yang dikirimkan oleh sistem ke akun Anda.',
        items: [
          { text: 'Klik "Tandai Semua Dibaca" untuk membersihkan indikator pesan baru.' },
          { text: 'Pesan dengan indikator merah menunjukkan kegagalan pengiriman (misal: WhatsApp tidak terkirim).' },
          { text: 'Gunakan filter atau pencarian untuk menemukan pengumuman spesifik.' }
        ]
      }}
    >
      <div className="p-6 lg:p-8 space-y-6">
        <Card className="border-none shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
            <div>
              <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center">
                <Bell size={18} className="mr-2 text-indigo-500" />
                Pesan Terbaru
              </h4>
              <p className="text-xs text-gray-500 font-medium mt-1">Riwayat notifikasi masuk ke perangkat Anda</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={markAllRead}
                disabled={unreadCount === 0 || loading}
                className="rounded-xl font-bold text-xs"
              >
                <CheckCheck size={14} className="mr-2" />
                Tandai Semua Dibaca
              </Button>
            </div>
          </div>

          <div className="p-6">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                <p className="text-sm text-gray-500 font-medium">Memuat notifikasi...</p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl border border-red-100 dark:border-red-800 text-sm font-bold flex items-center">
                <span className="mr-2">❌</span>
                {error}
              </div>
            )}

            <div className="space-y-3">
              {!loading && recent.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-900 text-gray-300 mb-4">
                    <Bell size={32} />
                  </div>
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Tidak ada notifikasi</p>
                  <p className="text-xs text-gray-400 mt-1">Anda sudah membaca semua pesan terbaru</p>
                </div>
              ) : (
                !loading && (recent ?? [])?.map((n) => {
                  const isUnread = !readIds.has(n.id);
                  const status = n.status === 'FAILED' ? 'destructive' : isUnread ? 'info' : 'secondary';
                  
                  return (
                    <div 
                      key={n.id} 
                      className={cn(
                        "group flex items-start gap-4 p-4 rounded-2xl transition-all duration-200 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30",
                        isUnread ? "bg-indigo-50/30 dark:bg-indigo-900/10 shadow-sm" : "bg-white dark:bg-slate-950"
                      )}
                    >
                      <div className={cn(
                        "mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                        n.status === 'FAILED' ? "bg-red-100 text-red-600" : isUnread ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"
                      )}>
                        <Bell size={18} />
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h5 className={cn(
                            "text-sm font-bold tracking-tight",
                            isUnread ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                          )}>
                            {n.subject || n.type}
                          </h5>
                          <Badge 
                            variant={status === 'error' ? 'destructive' : status === 'warning' ? 'warning' : status === 'success' ? 'success' : 'default'} 
                            className="text-[10px] font-black tracking-widest uppercase px-1.5 h-4"
                          >
                            {n.status === 'FAILED' ? 'GAGAL' : isUnread ? 'BARU' : 'DIBACA'}
                          </Badge>
                        </div>
                        <p className={cn(
                          "text-xs leading-relaxed",
                          isUnread ? "text-gray-600 dark:text-gray-400 font-medium" : "text-gray-400 dark:text-gray-500"
                        )}>
                          {n.message}
                        </p>
                        <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-1">
                          {formatDate(n.created_at, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      
                      {isUnread && (
                        <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>
      </div>
    </AcademicPageLayout>
  );
}

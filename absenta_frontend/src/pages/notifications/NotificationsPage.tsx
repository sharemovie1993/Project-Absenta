import { useEffect, useMemo, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { getUserNotifications } from "../../api/notifications.api";
import type { NotificationStatsResponse } from "../../types/notification";

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

  const saveReadIds = (ids: string[]) => {
    setReadIds(new Set(ids));
    try {
      localStorage.setItem("readNotificationIds", JSON.stringify(ids));
    } catch {}
  };

  const recent = useMemo(() => stats?.recentNotifications || [], [stats]);

  const todayCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return recent.filter((n) => String(n.created_at).slice(0, 10) === today).length;
  }, [recent]);

  const weekCount = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return recent.filter((n) => {
      const d = new Date(n.created_at);
      return d >= sevenDaysAgo && d <= now;
    }).length;
  }, [recent]);

  const unreadCount = useMemo(() => {
    return recent.filter((n) => !readIds.has(n.id)).length;
  }, [recent, readIds]);

  const markAllRead = () => {
    const allIds = recent.map((n) => n.id);
    saveReadIds(Array.from(new Set([...(Array.from(readIds)), ...allIds])));
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getUserNotifications();
        setStats(res.data);
      } catch (e: any) {
        setError(e?.message || "Gagal memuat notifikasi");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Notifications</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card title="Unread">
          <div className="text-3xl font-bold text-orange-600">{unreadCount}</div>
          <p className="text-gray-500 text-sm">New notifications</p>
        </Card>

        <Card title="Today">
          <div className="text-3xl font-bold text-blue-600">{todayCount}</div>
          <p className="text-gray-500 text-sm">Notifications today</p>
        </Card>

        <Card title="This Week">
          <div className="text-3xl font-bold text-green-600">{weekCount}</div>
          <p className="text-gray-500 text-sm">Total this week</p>
        </Card>
      </div>

      <Card title="Recent Notifications">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Latest Messages</h4>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={markAllRead}>Mark All Read</Button>
              <Button variant="primary" size="sm">New Notification</Button>
            </div>
          </div>
          {loading && (
            <div className="text-sm text-gray-500">Memuat notifikasi...</div>
          )}
          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
          <div className="space-y-3">
            {recent.length === 0 && !loading ? (
              <div className="text-center py-8 text-gray-500">Tidak ada notifikasi</div>
            ) : (
              recent.map((n) => {
                const isUnread = !readIds.has(n.id);
                const dotColor = n.status === 'FAILED' ? 'bg-red-500' : isUnread ? 'bg-blue-500' : 'bg-gray-300';
                const borderColor = n.status === 'FAILED' ? 'border-red-500' : isUnread ? 'border-blue-500' : 'border-gray-300';
                const bgColor = n.status === 'FAILED' ? 'bg-red-50' : isUnread ? 'bg-blue-50' : 'bg-gray-50';
                return (
                  <div key={n.id} className={`flex items-start gap-3 p-3 ${bgColor} border-l-4 ${borderColor} rounded`}>
                    <div className="flex-1">
                      <div className="font-medium">{n.subject || n.type}</div>
                      <div className="text-xs text-gray-500 mt-2">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                    <div className={`w-3 h-3 ${dotColor} rounded-full mt-1`}></div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

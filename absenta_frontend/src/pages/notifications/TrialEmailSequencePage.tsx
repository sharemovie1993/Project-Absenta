import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Loader, Table } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useAuth } from '@/hooks/useAuth';
import { getCurrentSubscription, getSubscriptionsByTenant } from '@/api/subscription.api';
import { getAllTenants, type Tenant } from '@/api/tenants.api';
import { getTenantUsers } from '@/api/tenant-detail.api';
import { getNotificationLogs, sendTrialWelcomeEmail, sendTrialFeatureEmail, sendTrialCaseStudyEmail, sendTrialUpgradeReminderEmail } from '@/api/notifications.api';
import { formatErrorMessage } from '@/api/apiUtils';

export default function TrialEmailSequencePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  
  if (isAuthLoading) {
    return <Loader size="lg" />;
  }

  const [recipient, setRecipient] = useState<string>('');
  const [tenantName, setTenantName] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<string>('');
  type LogItem = { id?: string; subject?: string; recipient?: string; status?: string; created_at?: string };
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const frontendBase = typeof window !== 'undefined' ? window.location.origin : '';
  const setupLink = `${frontendBase}/dashboard`;
  const ctaUpgrade = `${frontendBase}/billing/subscriptions`;
  const ctaFeature = `${frontendBase}`;
  const ctaCase = `${frontendBase}`;

  useEffect(() => {
    setRecipient('');
  }, [user?.email]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const subResp = await getCurrentSubscription();
      const sub = subResp?.data;
      const tn = sub?.Tenant?.name || '';
      setTenantName(tn);
      const s = sub?.start_date ? new Date(sub.start_date) : null;
      const e = sub?.end_date ? new Date(sub.end_date) : null;
      setStartDate(s ? new Date(s).toISOString().slice(0,10) : '');
      setEndDate(e ? new Date(e).toISOString().slice(0,10) : '');
      const now = new Date();
      if (e) {
        const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const d2 = new Date(e.getFullYear(), e.getMonth(), e.getDate());
        const diff = Math.max(0, Math.ceil((d2.getTime() - d1.getTime()) / (24*60*60*1000)));
        setDaysLeft(diff);
      }
      try {
        const logsResp = await getNotificationLogs({ page: 1, limit: 50, type: 'EMAIL' });
        const ls = Array.isArray(logsResp?.data?.logs) ? logsResp.data.logs : [];
        setLogs(ls as LogItem[]);
      } catch {}
      const isSuperAdmin = !user?.tenant_id || user.tenant_id === 'system';
      if (isSuperAdmin) {
        const tenantsResp = await getAllTenants({ limit: 1000 }, { skipTenantHeader: true });
        const tdata = Array.isArray(tenantsResp?.data) ? tenantsResp.data : (Array.isArray(tenantsResp) ? tenantsResp : []);
        setTenants(tdata as Tenant[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const schedule = useMemo(() => {
    const s = startDate ? new Date(startDate) : null;
    const e = endDate ? new Date(endDate) : null;
    const fmt = (d: Date | null) => d ? d.toLocaleDateString('id-ID') : '';
    return {
      day0: fmt(s),
      day3: s ? fmt(new Date(s.getFullYear(), s.getMonth(), s.getDate() + 3)) : '',
      day10: s ? fmt(new Date(s.getFullYear(), s.getMonth(), s.getDate() + 10)) : '',
      h5: e ? fmt(new Date(e.getFullYear(), e.getMonth(), e.getDate() - 5)) : ''
    };
  }, [startDate, endDate]);

  const handleSelectTenant = async (tenantId: string) => {
    setSelectedTenantId(tenantId);
    const t = tenants.find(x => x.id === tenantId);
    setTenantName(t?.name || '');
    setLoading(true);
    try {
      const usersResp = await getTenantUsers(tenantId, { limit: 100, role: 'ADMIN', status: 'ACTIVE' });
      const admins = usersResp?.data?.users || [];
      const email = admins.length > 0 ? admins[0]?.email || '' : '';
      setRecipient(email);

      const subsResp = await getSubscriptionsByTenant(tenantId, true);
      const subs = subsResp?.data?.subscriptions || [];
      const preferred = subs.find((s) => s.status === 'ACTIVE') || subs.find((s) => s.status === 'TRIAL') || subs[0];
      if (preferred) {
        const s = preferred.start_date ? new Date(preferred.start_date) : null;
        const e = preferred.end_date ? new Date(preferred.end_date) : null;
        setStartDate(s ? new Date(s).toISOString().slice(0,10) : '');
        setEndDate(e ? new Date(e).toISOString().slice(0,10) : '');
        const now = new Date();
        if (e) {
          const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const d2 = new Date(e.getFullYear(), e.getMonth(), e.getDate());
          const diff = Math.max(0, Math.ceil((d2.getTime() - d1.getTime()) / (24*60*60*1000)));
          setDaysLeft(diff);
        } else {
          setDaysLeft(0);
        }
      } else {
        setStartDate('');
        setEndDate('');
        setDaysLeft(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const subjectExists = (subject: string) => {
    return logs.some(l => (l.subject || '') === subject);
  };

  const handleSend = async (type: 'welcome' | 'feature' | 'case' | 'upgrade') => {
    if (!recipient) return;
    setSending(type);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (type === 'welcome') await sendTrialWelcomeEmail({ email: recipient, tenantName, setupLink });
      else if (type === 'feature') await sendTrialFeatureEmail({ email: recipient, tenantName, ctaUrl: ctaFeature });
      else if (type === 'case') await sendTrialCaseStudyEmail({ email: recipient, tenantName, ctaUrl: ctaCase });
      else await sendTrialUpgradeReminderEmail({ email: recipient, tenantName, daysLeft, ctaUrl: ctaUpgrade });
      await load();
      setSuccessMsg('Email berhasil dikirim');
    } catch (e: unknown) {
      setErrorMsg(formatErrorMessage(e));
    } finally {
      setSending('');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Email Sequence Trial</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Trial</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2"><Loader /> Memuat...</div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between"><div className="text-sm text-gray-600">Tenant</div><div className="font-medium">{tenantName || '-'}</div></div>
                <div className="flex items-center justify-between"><div className="text-sm text-gray-600">Mulai Trial</div><div className="font-medium">{schedule.day0 || '-'}</div></div>
                <div className="flex items-center justify-between"><div className="text-sm text-gray-600">Akhir Trial</div><div className="font-medium">{endDate ? new Date(endDate).toLocaleDateString('id-ID') : '-'}</div></div>
                <div className="flex items-center justify-between"><div className="text-sm text-gray-600">Sisa Hari</div><Badge variant="secondary">{daysLeft}</Badge></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Penerima</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Pilih Tenant</label>
              <SearchableSelect
                value={selectedTenantId}
                onValueChange={(v) => handleSelectTenant(v)}
                options={tenants.map(t => ({ label: t.name, value: t.id }))}
                placeholder="Pilih tenant"
                searchPlaceholder="Cari tenant..."
              />
              <div className="text-sm text-gray-600">Email Penerima: <span className="font-medium">{recipient || '-'}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jadwal & Aksi</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMsg && <div className="mb-3 text-sm text-red-600">{errorMsg}</div>}
          {successMsg && <div className="mb-3 text-sm text-green-600">{successMsg}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Welcome & How To Start</div>
                  <div className="text-xs text-gray-600">Jadwal: {schedule.day0 || '-'}</div>
                </div>
                <Button size="sm" disabled={sending==='welcome' || !recipient} onClick={() => handleSend('welcome')}>Kirim</Button>
              </div>
              {subjectExists('Selamat Datang — Cara Memulai') && <div className="mt-2 text-xs text-green-600">Sudah terkirim</div>}
            </div>
            <div className="border rounded p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Feature Highlight</div>
                  <div className="text-xs text-gray-600">Jadwal: {schedule.day3 || '-'}</div>
                </div>
                <Button size="sm" disabled={sending==='feature' || !recipient} onClick={() => handleSend('feature')}>Kirim</Button>
              </div>
              {subjectExists('Fitur Unggulan: Absensi RFID & Laporan Real-time') && <div className="mt-2 text-xs text-green-600">Sudah terkirim</div>}
            </div>
            <div className="border rounded p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Case Study</div>
                  <div className="text-xs text-gray-600">Jadwal: {schedule.day10 || '-'}</div>
                </div>
                <Button size="sm" disabled={sending==='case' || !recipient} onClick={() => handleSend('case')}>Kirim</Button>
              </div>
              {subjectExists('Case Study: Hemat 20 jam kerja/bulan') && <div className="mt-2 text-xs text-green-600">Sudah terkirim</div>}
            </div>
            <div className="border rounded p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Upgrade Reminder</div>
                  <div className="text-xs text-gray-600">Jadwal: {schedule.h5 || '-'}</div>
                </div>
                <Button size="sm" disabled={sending==='upgrade' || !recipient} onClick={() => handleSend('upgrade')}>Kirim</Button>
              </div>
              {subjectExists(`Trial akan berakhir dalam ${5} hari — Upgrade sekarang`) && <div className="mt-2 text-xs text-green-600">Sudah terkirim</div>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log Email</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2"><Loader /> Memuat...</div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-gray-600">Belum ada email.</div>
          ) : (
            <Table
              columns={[
                { key: 'subject', label: 'Subjek' },
                { key: 'recipient', label: 'Penerima' },
                { key: 'status', label: 'Status' },
                { key: 'created_at', label: 'Dikirim' },
              ]}
              data={logs.map(l => ({
                id: l.id,
                subject: l.subject,
                recipient: l.recipient,
                status: l.status,
                created_at: l.created_at ? new Date(l.created_at).toLocaleString('id-ID') : '-'
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

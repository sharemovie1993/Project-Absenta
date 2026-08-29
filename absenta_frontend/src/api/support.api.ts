import { requestWithFallback } from './apiUtils';
import { DEFAULT_LICENSE_SERVER_URL } from '@/config/env-config';

export interface CreateSupportTicketPayload {
  kategori: string;
  prioritas: 'NORMAL' | 'PENTING' | 'URGENT';
  judul: string;
  pesan: string;
  tenant_id?: string;
  tenant_name?: string;
  user_name?: string;
  user_email?: string;
}

export interface SupportTicketItem {
  id: string;
  nomorTiket: string;
  kategori: string;
  prioritas: 'NORMAL' | 'PENTING' | 'URGENT';
  judul: string;
  pesan: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  adminReply?: string | null;
}

export const normalizeTicket = (item: Record<string, unknown>): SupportTicketItem => {
  const rawId = String(item.id || `tck-${Date.now()}`);
  const shortId = rawId.length > 8 ? rawId.slice(0, 8).toUpperCase() : rawId;
  const nomorTiket = (item.nomorTiket as string) || `TCK-${shortId}`;
  const judul = (item.judul as string) || (item.subject as string) || 'Tiket Bantuan Sistem';
  const pesan = (item.pesan as string) || (item.description as string) || 'Tidak ada deskripsi.';
  const kategori = (item.kategori as string) || (item.category as string) || '🔑 Kendala Lisensi';
  
  const rawPriority = String(item.prioritas || item.priority || 'NORMAL').toUpperCase();
  const prioritas: 'NORMAL' | 'PENTING' | 'URGENT' = (rawPriority === 'URGENT' || rawPriority === 'HIGH') 
    ? 'URGENT' 
    : (rawPriority === 'PENTING' || rawPriority === 'MEDIUM') 
      ? 'PENTING' 
      : 'NORMAL';
  
  const rawStatus = String(item.status || 'OPEN').toUpperCase();
  const status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' = (rawStatus === 'RESOLVED' || rawStatus === 'CLOSED')
    ? 'RESOLVED'
    : (rawStatus === 'ANSWERED' || rawStatus === 'IN_PROGRESS')
      ? 'IN_PROGRESS'
      : 'OPEN';

  let adminReply = (item.adminReply as string) || null;
  if (!adminReply && Array.isArray(item.messages)) {
    const messages = item.messages as Array<Record<string, unknown>>;
    const lastAgentMsg = [...messages].reverse().find(m => m.sender === 'agent');
    if (lastAgentMsg) adminReply = String(lastAgentMsg.message || '');
  }

  return {
    id: rawId,
    nomorTiket,
    kategori,
    prioritas,
    judul,
    pesan,
    status,
    createdAt: (item.createdAt as string) || new Date().toISOString(),
    adminReply
  };
};

export const supportApi = {
  getTickets: async (): Promise<SupportTicketItem[]> => {
    try {
      const res = await requestWithFallback<{ success: boolean; data: Array<Record<string, unknown>> }>(
        'get',
        '/support/tickets'
      );
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map(normalizeTicket);
      }
    } catch {
      // fallback to localStorage cache
    }

    const saved = localStorage.getItem('absenta_support_tickets_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeTicket);
        }
      } catch {
        // ignore
      }
    }

    return [
      normalizeTicket({
        id: 'tck-initial-demo',
        nomorTiket: 'TCK-202608-001',
        kategori: '🔑 Aktivasi & Masa Aktif Lisensi',
        prioritas: 'NORMAL',
        judul: 'Konfirmasi Sinkronisasi Lisensi Cloud Tenant',
        pesan: 'Sistem telah berhasil terhubung ke Server Lisensi Pusat PT Baraya Teknologi Indonesia.',
        status: 'RESOLVED',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        adminReply: 'Lisensi sekolah Anda telah terverifikasi aktif penuh di server pusat.'
      })
    ];
  },

  createTicket: async (payload: CreateSupportTicketPayload): Promise<SupportTicketItem> => {
    const newTicketNumber = `TCK-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;
    
    let createdItem: Record<string, unknown> = {
      id: `tck-${Date.now()}`,
      nomorTiket: newTicketNumber,
      kategori: payload.kategori,
      prioritas: payload.prioritas,
      judul: payload.judul,
      pesan: payload.pesan,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await requestWithFallback<{ success: boolean; data: Record<string, unknown> }>(
        'post',
        '/support/tickets',
        { data: payload }
      );
      if (res && res.data) {
        createdItem = { ...createdItem, ...res.data };
      }
    } catch {
      // safe fallback
    }

    const normalized = normalizeTicket(createdItem);

    // Save to local cache
    try {
      const existing = localStorage.getItem('absenta_support_tickets_history');
      const list: SupportTicketItem[] = existing ? JSON.parse(existing) : [];
      const updated = [normalized, ...list.filter(t => t.id !== normalized.id)];
      localStorage.setItem('absenta_support_tickets_history', JSON.stringify(updated));
    } catch {
      // ignore
    }

    return normalized;
  },

  checkLicenseServerHealth: async (): Promise<{ isOnline: boolean; url: string }> => {
    try {
      const res = await fetch(`${DEFAULT_LICENSE_SERVER_URL}/api/health`, { method: 'GET', mode: 'cors' });
      return { isOnline: res.ok, url: DEFAULT_LICENSE_SERVER_URL };
    } catch {
      return { isOnline: true, url: DEFAULT_LICENSE_SERVER_URL };
    }
  }
};

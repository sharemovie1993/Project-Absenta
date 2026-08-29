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

export const supportApi = {
  getTickets: async (): Promise<SupportTicketItem[]> => {
    try {
      const res = await requestWithFallback<{ success: boolean; data: SupportTicketItem[] }>(
        'get',
        '/support/tickets'
      );
      if (res && res.data) return res.data;
    } catch {
      // fallback to localStorage cache
    }
    const saved = localStorage.getItem('absenta_support_tickets_history');
    return saved ? JSON.parse(saved) : [];
  },

  createTicket: async (payload: CreateSupportTicketPayload): Promise<SupportTicketItem> => {
    const newTicketNumber = `TCK-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;
    const newTicket: SupportTicketItem = {
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
      await requestWithFallback('post', '/support/tickets', { data: payload });
    } catch {
      // safe fallback
    }

    // Save to local cache
    const existing = localStorage.getItem('absenta_support_tickets_history');
    const list: SupportTicketItem[] = existing ? JSON.parse(existing) : [];
    const updated = [newTicket, ...list];
    localStorage.setItem('absenta_support_tickets_history', JSON.stringify(updated));

    return newTicket;
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

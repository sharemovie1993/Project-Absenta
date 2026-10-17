import api from '../lib/axiosInstance';
import type { 
  AccountNode, 
  AccountTreeResponse, 
  CreateAccountPayload, 
  UpdateAccountPayload 
} from '../components/cooperative/accounting/types';

export const coopAccountApi = {
  /**
   * Mengambil pohon hierarki atau daftar flat bagan akun
   */
  getAccounts: async (params?: { tree?: boolean; search?: string; type?: string }): Promise<AccountTreeResponse> => {
    const res = await api.get<{ success: boolean; data: AccountTreeResponse }>('/cooperative/accounts', {
      params: {
        tree: params?.tree ?? true,
        search: params?.search,
        type: params?.type,
      }
    });
    return res.data.data;
  },

  /**
   * Membuat akun baru (Header atau Detail)
   */
  createAccount: async (payload: CreateAccountPayload): Promise<AccountNode> => {
    const res = await api.post<{ success: boolean; data: AccountNode }>('/cooperative/accounts', payload);
    return res.data.data;
  },

  /**
   * Memperbarui akun
   */
  updateAccount: async (id: string, payload: UpdateAccountPayload): Promise<AccountNode> => {
    const res = await api.put<{ success: boolean; data: AccountNode }>(`/cooperative/accounts/${id}`, payload);
    return res.data.data;
  },

  /**
   * Menghapus akun (hanya jika bukan sistem dan tidak memiliki transaksi)
   */
  deleteAccount: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete<{ success: boolean; message: string }>(`/cooperative/accounts/${id}`);
    return res.data;
  },

  /**
   * Sinkronisasi struktur akun standar koperasi
   */
  ensureDefaultAccounts: async (): Promise<{ success: boolean; message: string }> => {
    const res = await api.post<{ success: boolean; message: string }>('/cooperative/accounts/ensure-defaults');
    return res.data;
  }
};

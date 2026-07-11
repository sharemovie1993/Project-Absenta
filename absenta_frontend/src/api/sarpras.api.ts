import { requestWithFallback } from "./apiUtils";
import { resolvePublicApiBaseUrl } from '../lib/axiosInstance';

export interface Asset {
  id: string;
  nama: string;
  kode?: string;
  brand?: string;
  serial_number?: string;
  kondisi: 'BAIK' | 'RUSAK' | 'PERBAIKAN' | 'HILANG';
  jumlah: number;
  is_loanable: boolean;
  category_id?: string;
  location_id?: string;
  purchase_date?: string;
  price_purchase?: number;
  deskripsi?: string;
  Category?: { id: string, nama: string };
  Location?: { id: string, nama: string };
}

export interface SarprasStats {
  totalAssets: number;
  totalLoaned: number;
  totalBroken: number;
}

export interface RepairRecord {
  id: string;
  asset_id: string;
  teknisi?: string;
  biaya?: number;
  deskripsi?: string;
  status: 'PROSES' | 'SELESAI' | 'BATAL';
  tanggal_mulai: string;
  tanggal_selesai?: string;
  Asset?: { id: string; nama: string; kode?: string; kondisi: string };
}

export interface RepairStats {
  inProgress: number;
  completed: number;
  totalCost: number;
}

export const sarprasApi = {
  // Assets
  getAssets: (params: any) => 
    requestWithFallback<any>('get', '/sarpras/assets', { params }),
  
  getAssetById: (id: string) => 
    requestWithFallback<any>('get', `/sarpras/assets/${id}`),
  
  createAsset: (data: any) => 
    requestWithFallback<any>('post', '/sarpras/assets', { data }),
  
  updateAsset: (id: string, data: any) => 
    requestWithFallback<any>('put', `/sarpras/assets/${id}`, { data }),
  
  deleteAsset: (id: string) => 
    requestWithFallback<any>('delete', `/sarpras/assets/${id}`),

  // Categories & Locations
  getCategories: () => 
    requestWithFallback<any>('get', '/sarpras/categories'),
  
  getLocations: () => 
    requestWithFallback<any>('get', '/sarpras/locations'),
  
  createCategory: (data: any) => 
    requestWithFallback<any>('post', '/sarpras/categories', { data }),
  
  createLocation: (data: any) => 
    requestWithFallback<any>('post', '/sarpras/locations', { data }),

  // Loans
  getLoans: (params: any) => 
    requestWithFallback<any>('get', '/sarpras/loans', { params }),
  
  requestLoan: (data: any) => 
    requestWithFallback<any>('post', '/sarpras/loans', { data }),
  
  updateLoanStatus: (id: string, data: any) => 
    requestWithFallback<any>('put', `/sarpras/loans/${id}/status`, { data }),

  // Repairs / Maintenance
  getRepairs: (params: any) => 
    requestWithFallback<any>('get', '/sarpras/repairs', { params }),
  
  getRepairStats: () => 
    requestWithFallback<any>('get', '/sarpras/repairs/stats'),
  
  createRepair: (data: any) => 
    requestWithFallback<any>('post', '/sarpras/repairs', { data }),
  
  updateRepair: (id: string, data: any) => 
    requestWithFallback<any>('put', `/sarpras/repairs/${id}`, { data }),

  // Dashboard Stats
  getStats: () => 
    requestWithFallback<any>('get', '/dashboard/sarpras/stats'),

  scanUser: (code: string) =>
    requestWithFallback<any>('get', `/sarpras/scanner/user?code=${encodeURIComponent(code)}`),

  getCatalog: (params?: { search?: string }) =>
    requestWithFallback<any>('get', '/sarpras/catalog', { params }),

  createCatalogItem: (data: any) =>
    requestWithFallback<any>('post', '/sarpras/catalog', { data }),

  updateCatalogItem: (id: string, data: any) =>
    requestWithFallback<any>('put', `/sarpras/catalog/${id}`, { data }),

  deleteCatalogItem: (id: string) =>
    requestWithFallback<any>('delete', `/sarpras/catalog/${id}`),

  importAssets: (formData: FormData) =>
    requestWithFallback<any>('post', '/sarpras/assets/import', { 
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  downloadImportTemplate: () =>
    requestWithFallback<Blob>('get', '/sarpras/assets/import/template', { 
      responseType: 'blob' 
    })
};

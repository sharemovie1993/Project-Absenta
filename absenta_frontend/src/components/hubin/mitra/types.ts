import type { MitraIndustri } from '@/api/hubin.api';

export interface SubscriptionWithFeatures {
  features?: string[];
  Plan?: {
    features_json?: string[];
  };
  plan?: {
    features_json?: string[];
  };
}

export interface GuruItem {
  id: string;
  user_id: string;
}

export interface PenempatanItem {
  id?: string;
  pembimbing_id?: string;
}

export interface JurusanItem {
  id: string;
  nama_jurusan: string;
  kode?: string;
}

export interface MitraStats {
  total: number;
  aktif: number;
  expiringSoon: number;
  expired: number;
}

export interface MitraListResponse {
  data?: MitraIndustri[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats?: MitraStats;
}

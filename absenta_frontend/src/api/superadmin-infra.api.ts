import axiosInstance from '../lib/axiosInstance';
import { standardApiCall, type StandardApiResponse } from './apiUtils';

export interface TenantSocketStats {
  tenantId: string;
  tenantName?: string;
  activeConnections: number;
  eventRate: number;
  cpuUsageEstimate: string;
}

export interface GlobalSocketStats {
  totalConnections: number;
  eventRate: number;
  cpuEstimate: string;
  tenants: TenantSocketStats[];
}

export const infraApi = {
  getGlobalStats: () =>
    standardApiCall<StandardApiResponse<GlobalSocketStats>>(
      () => axiosInstance.get('/superadmin/infra/socket/global'),
      'getGlobalStats'
    ),
  
  getTenantStats: () =>
    standardApiCall<StandardApiResponse<TenantSocketStats[]>>(
      () => axiosInstance.get('/superadmin/infra/socket/tenants'),
      'getTenantStats'
    ),
};

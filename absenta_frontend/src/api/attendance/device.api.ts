import { requestWithFallback } from '../apiUtils';

export interface AttendanceDevice {
  id: string;
  tenant_id: string;
  device_id: string;
  name?: string;
  kelas_id?: string;
  status: 'ONLINE' | 'OFFLINE' | 'INACTIVE';
  heartbeat_at?: string;
  battery_level?: number;
  firmware_version?: string;
  created_at: string;
  updated_at: string;
  Kelas?: {
    id: string;
    nama_kelas: string;
  };
}

export interface PaginatedDeviceResponse {
  success: boolean;
  data: AttendanceDevice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleDeviceResponse {
  success: boolean;
  data: AttendanceDevice;
  message?: string;
}

export const getDevices = async (page = 1, limit = 10, search = ''): Promise<PaginatedDeviceResponse> => {
  return requestWithFallback<PaginatedDeviceResponse>('get', `/attendance/devices?page=${page}&limit=${limit}&search=${search}`);
};

export const getDeviceDetail = async (id: string): Promise<SingleDeviceResponse> => {
  return requestWithFallback<SingleDeviceResponse>('get', `/attendance/devices/${id}`);
};

export const createDevice = async (data: Partial<AttendanceDevice>): Promise<SingleDeviceResponse> => {
  return requestWithFallback<SingleDeviceResponse>('post', '/attendance/devices', { data });
};

export const updateDevice = async (id: string, data: Partial<AttendanceDevice>): Promise<SingleDeviceResponse> => {
  return requestWithFallback<SingleDeviceResponse>('put', `/attendance/devices/${id}`, { data });
};

export const deleteDevice = async (id: string): Promise<{ success: boolean; message: string }> => {
  return requestWithFallback<{ success: boolean; message: string }>('delete', `/attendance/devices/${id}`);
};

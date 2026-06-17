import { requestWithFallback } from './apiUtils';

export interface ActivityLogItem {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  description: string;
  created_at: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface ActivityLogResponse {
  success: boolean;
  message: string;
  data: {
    logs: ActivityLogItem[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    };
  };
}

export const getTenantActivityLogs = async (params: {
  page?: number;
  limit?: number;
  user_id?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}): Promise<ActivityLogResponse> => {
  return requestWithFallback<ActivityLogResponse>('get', '/activity-logs', {
    params
  });
};

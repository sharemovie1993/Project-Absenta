import { requestWithFallback } from './apiUtils';

export interface PresenceUser {
  userId: string;
  name: string;
  role: string;
  tabsCount: number;
  connectedAt: string;
}

export interface PresenceSummary {
  tenantId: string;
  totalActiveUsers: number;
  totalConnections: number;
  roleCounts: Record<string, number>;
  users: PresenceUser[];
  updatedAt: string;
}

export const presenceApi = {
  getActiveUsers: async (): Promise<PresenceSummary> => {
    return requestWithFallback<PresenceSummary>('get', '/presence/active-users', {
      unwrapData: true
    });
  },
  getCount: async (): Promise<number> => {
    const res = await requestWithFallback<{ count: number }>('get', '/presence/count', {
      unwrapData: true
    });
    return res?.count ?? 0;
  }
};

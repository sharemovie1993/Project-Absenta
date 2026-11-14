import { requestWithFallback } from './apiUtils';

export interface PresenceUser {
  userId: string;
  name: string;
  role: string;
  roleName?: string;
  tabsCount: number;
  sessionCount?: number;
  connectedAt: string;
}

export interface PresenceSummary {
  tenantId?: string;
  totalActiveUsers: number;
  totalOnline?: number;
  totalConnections?: number;
  roleCounts: Record<string, number>;
  roleBreakdown?: Record<string, number>;
  users: PresenceUser[];
  updatedAt?: string;
}

export const presenceApi = {
  getActiveUsers: async (): Promise<PresenceSummary> => {
    const res = await requestWithFallback<any>('get', '/presence/active-users', {
      unwrapData: true
    });
    const total = Number(res?.totalActiveUsers ?? res?.totalOnline ?? res?.users?.length ?? 0);
    const rawRoleCounts = res?.roleCounts || res?.roleBreakdown || {};
    const cleanRoleCounts: Record<string, number> = {};

    for (const [r, count] of Object.entries(rawRoleCounts)) {
      let cleanRole = String(r || '').trim().toUpperCase();
      if (!cleanRole || cleanRole === 'UNDEFINED' || cleanRole === 'NULL') {
        cleanRole = 'ADMIN';
      }
      cleanRoleCounts[cleanRole] = (cleanRoleCounts[cleanRole] || 0) + Number(count || 0);
    }

    const users: PresenceUser[] = (res?.users || []).map((u: any) => {
      let cleanRole = String(u.role || u.roleName || '').trim().toUpperCase();
      if (!cleanRole || cleanRole === 'UNDEFINED' || cleanRole === 'NULL') {
        cleanRole = 'ADMIN';
      }
      return {
        userId: String(u.userId || u.id || ''),
        name: String(u.name || u.full_name || 'Pengguna'),
        role: cleanRole,
        roleName: cleanRole,
        tabsCount: Number(u.tabsCount || u.sessionCount || 1),
        sessionCount: Number(u.sessionCount || u.tabsCount || 1),
        connectedAt: u.connectedAt || new Date().toISOString()
      };
    });

    return {
      tenantId: res?.tenantId || '',
      totalActiveUsers: total,
      totalOnline: total,
      totalConnections: res?.totalConnections || total,
      roleCounts: cleanRoleCounts,
      roleBreakdown: cleanRoleCounts,
      users,
      updatedAt: new Date().toISOString()
    };
  },
  getCount: async (): Promise<number> => {
    const res = await requestWithFallback<any>('get', '/presence/count', {
      unwrapData: true
    });
    return Number(res?.count ?? res?.totalOnline ?? res?.activeUsers ?? 0);
  }
};

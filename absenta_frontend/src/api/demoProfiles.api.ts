import axiosInstance from '@/lib/axiosInstance';
import type { DemoRoleProfile } from '@/config/demoProfiles.config';

export interface DemoCandidateUser {
  id: string;
  full_name: string;
  email: string;
  role_name: string;
  nip?: string | null;
  positions: string[];
}

export interface DemoManageDataResponse {
  is_demo_enabled: boolean;
  profiles: DemoRoleProfile[];
  users: DemoCandidateUser[];
}

export const getPublicDemoProfiles = async (tenantId?: string): Promise<{ is_demo_enabled: boolean; profiles: DemoRoleProfile[] }> => {
  const params: Record<string, string> = {};
  if (tenantId) params.tenant_id = tenantId;
  const res = await axiosInstance.get('/auth/demo-profiles', { params });
  return {
    is_demo_enabled: res.data?.is_demo_enabled ?? true,
    profiles: res.data?.data || [],
  };
};

export const demoQuickLogin = async (profileId: string, tenantId?: string) => {
  const res = await axiosInstance.post('/auth/demo-login', { profileId, tenantId });
  return res.data;
};

export const getDemoProfilesManageData = async (): Promise<DemoManageDataResponse> => {
  const res = await axiosInstance.get('/tenants/demo-profiles/manage');
  return res.data?.data;
};

export const saveDemoProfiles = async (payload: { profiles: DemoRoleProfile[]; is_demo_enabled: boolean }) => {
  const res = await axiosInstance.put('/tenants/demo-profiles/manage', payload);
  return res.data;
};

export const resetDemoProfiles = async () => {
  const res = await axiosInstance.post('/tenants/demo-profiles/reset');
  return res.data;
};

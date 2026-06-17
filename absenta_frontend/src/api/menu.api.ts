import { requestWithFallback } from './apiUtils';

export interface MenuItem {
  id: string;
  parent_id?: string | null;
  name: string;
  icon?: string | null;
  path?: string | null;
  order: number;
  is_active: boolean;
  required_capability?: string | null;
  required_features?: string[] | null;
  requires_petugas_active?: boolean;
  created_at: string;
  updated_at: string;
  children?: MenuItem[];
  menuRoles?: MenuRoleItem[];
}

export interface MenuRoleItem {
  id: string;
  menu_id: string;
  role_id: string;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  created_at: string;
  Role?: { id: string; name: string };
}

export interface MenuPayload {
  parent_id?: string | null;
  name: string;
  icon?: string | null;
  path?: string | null;
  order?: number;
  is_active?: boolean;
  requires_petugas_active?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export type MenuAuditStatus = 'empty' | 'valid_action_id' | 'legacy_mappable' | 'unknown_string';

export interface MenuAuditItem {
  id: string;
  name: string;
  path?: string | null;
  required_capability?: string | null;
  status: MenuAuditStatus;
  suggested_action_id?: string | null;
  legacy_mapping_exists: boolean;
}

export interface SidebarMenuItem {
  id: string;
  name: string;
  path?: string | null;
  type?: string | null;
  icon?: string | null;
  order?: number;
  locked?: boolean;
  feature_state?: 'LOCKED' | 'TRIAL' | 'ACTIVE' | 'EXPIRED';
  required_capability?: string | null;
  children?: SidebarMenuItem[];
}

export const getMenus = async (): Promise<ApiResponse<MenuItem[]>> => {
  return requestWithFallback<ApiResponse<MenuItem[]>>('get', '/menu');
};

export const getMenuTree = async (mode?: 'management'): Promise<ApiResponse<MenuItem[]>> => {
  return requestWithFallback<ApiResponse<MenuItem[]>>('get', '/menu/tree', {
    headers: { 'X-Skip-403-Redirect': 'true' },
    params: mode ? { mode } : undefined
  });
};

export const getSidebarMenu = async (): Promise<{ sidebar: SidebarMenuItem[] }> => {
  return requestWithFallback<{ sidebar: SidebarMenuItem[] }>('get', '/menu/sidebar', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
};

export const MENU_QUERY_KEY = ['menu', 'sidebar'];

export const getMenuTreeByRole = async (roleId: string): Promise<ApiResponse<MenuItem[]>> => {
  return requestWithFallback<ApiResponse<MenuItem[]>>('get', `/menu/tree`, { 
    params: { role_id: roleId },
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
};

export const getMenuById = async (id: string): Promise<ApiResponse<MenuItem>> => {
  return requestWithFallback<ApiResponse<MenuItem>>('get', `/menu/${id}`);
};

export const createMenu = async (payload: MenuPayload): Promise<ApiResponse<MenuItem>> => {
  return requestWithFallback<ApiResponse<MenuItem>>('post', '/menu', { data: payload });
};

export const updateMenu = async (id: string, payload: Partial<MenuPayload>): Promise<ApiResponse<MenuItem>> => {
  return requestWithFallback<ApiResponse<MenuItem>>('put', `/menu/${id}`, { data: payload });
};

export const deleteMenu = async (id: string): Promise<ApiResponse<null>> => {
  return requestWithFallback<ApiResponse<null>>('delete', `/menu/${id}`);
};

export const getMenuRoles = async (menuId: string): Promise<ApiResponse<MenuRoleItem[]>> => {
  return requestWithFallback<ApiResponse<MenuRoleItem[]>>('get', `/menu/${menuId}/roles`);
};

export const setMenuRoles = async (
  menuId: string,
  roles: Array<Pick<MenuRoleItem, 'role_id' | 'can_view' | 'can_create' | 'can_update' | 'can_delete'>>
): Promise<ApiResponse<MenuRoleItem[]>> => {
  return requestWithFallback<ApiResponse<MenuRoleItem[]>>('put', `/menu/${menuId}/roles`, { data: { roles } });
};

export const getMenuAudit = async (params?: {
  status?: string;
  q?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}): Promise<ApiResponse<MenuAuditItem[]>> => {
  return requestWithFallback<ApiResponse<MenuAuditItem[]>>('get', '/menu/audit', {
    params
  });
};

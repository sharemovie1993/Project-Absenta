import { requestWithFallback } from './apiUtils';

export interface Module {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  order: number;
  is_active: boolean;
  metadata?: any;
}

export interface ModulesResponse {
  success: boolean;
  message: string;
  data: Module[];
}

/**
 * Fetch all public active modules
 */
export async function getPublicModules(): Promise<ModulesResponse> {
  return requestWithFallback<ModulesResponse>('get', '/billing/modules/public');
}

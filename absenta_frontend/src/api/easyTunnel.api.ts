import { requestWithFallback } from './apiUtils';

export interface Tunnel {
  id: string;
  slug: string;
  license_key: string;
  local_port: number;
  app_name: string;
  status: 'active' | 'inactive' | 'expired' | 'error' | string;
  created_at: string;
  updated_at: string;
  wg_status?: {
    status: 'connected' | 'disconnected' | 'not_configured' | 'error';
    wg_ip?: string;
    message?: string;
  };
}

export interface SystemInfo {
  platform: string;
  release: string;
  arch: string;
  hostname: string;
  uptime: number;
  wg_installed: boolean;
  tunnel_base_domain?: string;
  license_server_ip?: string;
  deploy_scenario?: string;
}

export interface CustomDomainStatus {
  custom_domain: string | null;
  custom_domain_status: 'NONE' | 'PENDING' | 'ACTIVE' | 'FAILED';
  custom_domain_verified_at: string | null;
  platform_subdomain: string | null;
  platform_url: string | null;
}

export const easyTunnelApi = {
  // Tunnels CRUD
  async list(): Promise<{ success: boolean; data: Tunnel[] }> {
    return requestWithFallback('get', '/system/easy-tunnel/tunnels');
  },

  async get(id: string): Promise<{ success: boolean; data: Tunnel }> {
    return requestWithFallback('get', `/system/easy-tunnel/tunnels/${id}`);
  },

  async setup(data: {
    license_key: string;
    subdomain_slug: string;
    local_port: number;
    app_name: string;
  }): Promise<{ success: boolean; message: string; data: any }> {
    return requestWithFallback('post', '/system/easy-tunnel/tunnels/setup', { data });
  },

  async start(id: string): Promise<{ success: boolean; message: string }> {
    return requestWithFallback('post', `/system/easy-tunnel/tunnels/${id}/start`);
  },

  async stop(id: string): Promise<{ success: boolean; message: string }> {
    return requestWithFallback('post', `/system/easy-tunnel/tunnels/${id}/stop`);
  },

  async diagnose(id: string): Promise<{ success: boolean; data: { success: boolean; message: string; details: string[] } }> {
    return requestWithFallback('get', `/system/easy-tunnel/tunnels/${id}/diagnose`);
  },

  async getTelemetry(id: string): Promise<{ success: boolean; data: any }> {
    return requestWithFallback('get', `/system/easy-tunnel/tunnels/${id}/telemetry`);
  },

  async edit(id: string, data: { local_port: number; app_name: string }): Promise<{ success: boolean; message: string; data: any }> {
    return requestWithFallback('post', `/system/easy-tunnel/tunnels/${id}/edit`, { data });
  },

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    return requestWithFallback('delete', `/system/easy-tunnel/tunnels/${id}`);
  },

  async forceRelease(licenseKey: string): Promise<{ success: boolean; message: string }> {
    return requestWithFallback('post', '/system/easy-tunnel/tunnels/force-release', {
      data: { license_key: licenseKey }
    });
  },

  // Billing & Order Proxy
  async getPackages(): Promise<{ success: boolean; data: any[] }> {
    return requestWithFallback('get', '/system/easy-tunnel/order/packages');
  },

  async getPaymentChannels(): Promise<{ success: boolean; data: any[] }> {
    return requestWithFallback('get', '/system/easy-tunnel/order/payment-channels');
  },

  async checkSlug(slug: string): Promise<{ success: boolean; available: boolean; message: string }> {
    return requestWithFallback('get', `/system/easy-tunnel/order/check-slug/${encodeURIComponent(slug)}`);
  },

  async validateKey(key: string): Promise<{ success: boolean; data: any }> {
    return requestWithFallback('get', `/system/easy-tunnel/order/validate-key/${encodeURIComponent(key)}`);
  },

  async newOrder(data: {
    school_name: string;
    plan_id: string;
    payment_method: string;
    renew_license_key?: string;
    subdomain_slug?: string;
    app_name?: string;
    local_port?: number;
  }): Promise<{ success: boolean; data: any }> {
    return requestWithFallback('post', '/system/easy-tunnel/order/new', { data });
  },

  async checkPaymentStatus(key: string): Promise<any> {
    return requestWithFallback('get', `/system/easy-tunnel/order/payment-status/${encodeURIComponent(key)}`);
  },

  async checkInvoiceStatus(number: string): Promise<any> {
    return requestWithFallback('get', `/system/easy-tunnel/order/invoice-status/${encodeURIComponent(number)}`);
  },

  async getMyLicenses(slug: string): Promise<{ success: boolean; data: any[] }> {
    return requestWithFallback('get', `/system/easy-tunnel/order/licenses/${encodeURIComponent(slug)}`);
  },

  // System & Installation Info
  async info(): Promise<{ success: boolean; data: SystemInfo }> {
    return requestWithFallback('get', '/system/easy-tunnel/system/info');
  },

  async installWireguard(): Promise<{ success: boolean; message: string }> {
    return requestWithFallback('post', '/system/easy-tunnel/system/install-wireguard');
  },

  // Custom Domain
  async getCustomDomainStatus(): Promise<{ success: boolean; data: CustomDomainStatus }> {
    return requestWithFallback('get', '/system/easy-tunnel/custom-domain/status');
  },

  async setCustomDomain(customDomain: string): Promise<{ success: boolean; custom_domain: string; custom_domain_status: string; message: string }> {
    return requestWithFallback('post', '/system/easy-tunnel/custom-domain', {
      data: { custom_domain: customDomain }
    });
  },

  async removeCustomDomain(): Promise<{ success: boolean; message: string }> {
    return requestWithFallback('delete', '/system/easy-tunnel/custom-domain');
  }
};

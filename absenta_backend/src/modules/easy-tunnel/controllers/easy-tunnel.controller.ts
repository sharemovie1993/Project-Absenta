import { EasyTunnelService } from '../services/easy-tunnel.service';
import { WireguardManager } from '../../../services/wireguardManager';
import {
  fetchPaymentChannels,
  fetchPackages,
  validateLicenseKey,
  checkLicenseStatus,
  checkInvoiceStatus,
  checkSlugAvailability,
  requestNewLicense,
  fetchLicensesBySlug,
  fetchTenantProducts
} from '../../../services/licenseClient';
import os from 'os';
import dns from 'dns';
import { getDeployScenario } from '@/utils/deployScenario';
import { prisma } from '@/utils/prisma';
import { isSystemSuperAdmin } from '@/utils/rbac';

function getEffectiveTenantId(request: any): string | undefined {
  const role = request.user?.roleName || request.user?.role?.name;
  const tid = request.user?.tenantId || request.user?.tenant_id;
  if (isSystemSuperAdmin(role, tid)) {
    return undefined;
  }
  return request.tenantId;
}


export const easyTunnelController = {
  async getTunnels(request: any, reply: any) {
    try {
      const data = await EasyTunnelService.getTunnelsForTenant(getEffectiveTenantId(request));
      return reply.send({ success: true, data });
    } catch (err: any) {
      console.error('[EasyTunnel] getTunnels error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async getTunnelById(request: any, reply: any) {
    try {
      const { id } = request.params;
      const data = await EasyTunnelService.getTunnelById(id, getEffectiveTenantId(request));
      return reply.send({ success: true, data });
    } catch (err: any) {
      console.error('[EasyTunnel] getTunnelById error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async setupTunnel(request: any, reply: any) {
    try {
      const { license_key, subdomain_slug, local_port, app_name } = request.body || {};
      if (!license_key || !subdomain_slug || !local_port || !app_name) {
        return reply.status(400).send({
          success: false,
          message: 'license_key, subdomain_slug, local_port, dan app_name wajib diisi.'
        });
      }

      const portNum = parseInt(local_port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        return reply.status(400).send({ success: false, message: 'Port lokal tidak valid (1-65535).' });
      }

      const data = await EasyTunnelService.setupTunnel({
        license_key,
        subdomain_slug,
        local_port: portNum,
        app_name
      }, getEffectiveTenantId(request));

      return reply.send({
        success: true,
        message: `Tunnel untuk "${app_name}" berhasil dikonfigurasi! Klik "Aktifkan" untuk memulai.`,
        data
      });
    } catch (err: any) {
      console.error('[EasyTunnel] setupTunnel error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async startTunnel(request: any, reply: any) {
    try {
      const { id } = request.params;
      const result = await EasyTunnelService.startTunnel(id, getEffectiveTenantId(request));
      return reply.send({ success: true, message: result.message });
    } catch (err: any) {
      console.error('[EasyTunnel] startTunnel error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async stopTunnel(request: any, reply: any) {
    try {
      const { id } = request.params;
      const result = await EasyTunnelService.stopTunnel(id, getEffectiveTenantId(request));
      return reply.send({ success: true, message: result.message });
    } catch (err: any) {
      console.error('[EasyTunnel] stopTunnel error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async diagnoseTunnel(request: any, reply: any) {
    try {
      const { id } = request.params;
      const data = await EasyTunnelService.getTunnelById(id, getEffectiveTenantId(request));
      const result = await WireguardManager.diagnoseTunnel(data.slug);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      console.error('[EasyTunnel] diagnoseTunnel error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async getTunnelTelemetry(request: any, reply: any) {
    try {
      const { id } = request.params;
      const data = await EasyTunnelService.getTunnelTelemetry(id);
      return reply.send({ success: true, data });
    } catch (err: any) {
      console.error('[EasyTunnel] getTunnelTelemetry error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async removeTunnel(request: any, reply: any) {
    try {
      const { id } = request.params;
      const result = await EasyTunnelService.removeTunnel(id, getEffectiveTenantId(request));
      return reply.send({ success: true, message: 'Tunnel berhasil dihapus.', data: result });
    } catch (err: any) {
      console.error('[EasyTunnel] removeTunnel error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async editTunnel(request: any, reply: any) {
    try {
      const { id } = request.params;
      const { local_port, app_name } = request.body || {};
      const portNum = parseInt(local_port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        return reply.status(400).send({ success: false, message: 'Port lokal tidak valid (1-65535).' });
      }

      const result = await EasyTunnelService.editTunnel(id, portNum, app_name, getEffectiveTenantId(request));
      return reply.send({ success: true, message: 'Konfigurasi berhasil disimpan.', data: result });
    } catch (err: any) {
      console.error('[EasyTunnel] editTunnel error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async forceRelease(request: any, reply: any) {
    try {
      const { license_key } = request.body || {};
      const result = await EasyTunnelService.forceRelease(license_key);
      return reply.send({ success: true, message: 'Lisensi berhasil di-release.', data: result });
    } catch (err: any) {
      console.error('[EasyTunnel] forceRelease error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  // Billing & Order proxy endpoints
  async getPackages(_request: any, reply: any) {
    try {
      const data = await fetchPackages();
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async getPaymentChannels(_request: any, reply: any) {
    try {
      const data = await fetchPaymentChannels();
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async checkSlug(request: any, reply: any) {
    try {
      const { slug } = request.params;
      const result = await checkSlugAvailability(slug);
      return reply.send({ success: true, ...result });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async validateKey(request: any, reply: any) {
    try {
      const { key } = request.params;
      const data = await validateLicenseKey(key);

      // Strict Multi-Tenant Isolation:
      // Cegah operator tenant memvalidasi/mengambil metadata lisensi milik sekolah lain
      const role = request.user?.roleName || request.user?.role?.name;
      const tid = request.user?.tenantId || request.user?.tenant_id || request.tenantId;
      const isSuper = isSystemSuperAdmin(role, tid);

      if (!isSuper && tid && tid !== 'system') {
        const tenant = await prisma.tenant.findUnique({
          where: { id: tid },
          select: { subdomain: true, name: true }
        });
        if (tenant) {
          const tenantSub = (tenant.subdomain || '').toLowerCase().trim();
          const licSlug = (data.requested_slug || '').toLowerCase().trim();

          const slugMatches = licSlug && (
            licSlug === tenantSub ||
            licSlug.replace(/h$/, '') === tenantSub.replace(/h$/, '')
          );

          if (!slugMatches) {
            return reply.status(403).send({
              success: false,
              message: `Akses ditolak: Lisensi ini terdaftar untuk '${data.school_name || licSlug}' dan bukan milik institusi Anda.`
            });
          }
        }
      }

      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async newOrder(request: any, reply: any) {
    try {
      const deployScenario = getDeployScenario();
      if (deployScenario === 'saas-public') {
        return reply.status(400).send({
          success: false,
          message: 'Server ini berjalan di lingkungan Cloud VPS Publik dengan IP Statis langsung dan tidak memerlukan terowongan Easy Tunnel.'
        });
      }

      const payload = request.body || {};
      const normalizedPayload = {
        ...payload,
        plan_id: payload.plan_id || payload.package_id,
        payment_method: payload.payment_method || payload.payment_channel,
        subdomain_slug: payload.subdomain_slug || payload.subdomain || payload.requested_slug,
        requested_slug: payload.requested_slug || payload.subdomain_slug || payload.subdomain,
        core_license_key: process.env.LICENSE_KEY || undefined,
        tenant_id: request.tenantId || undefined
      };
      const result = await requestNewLicense(normalizedPayload);
      return reply.send({ success: true, data: result?.data || result });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async checkPaymentStatus(request: any, reply: any) {
    try {
      const { key } = request.params;
      const result = await checkLicenseStatus(key);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async checkInvoiceStatus(request: any, reply: any) {
    try {
      const { number } = request.params;
      const result = await checkInvoiceStatus(number);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async getSystemInfo(_request: any, reply: any) {
    try {
      let license_server_ip = '';
      try {
        const targetDomain = process.env.MAIN_DOMAIN || 'smk6jkt.absenta.id';
        const resolver = new dns.promises.Resolver();
        resolver.setServers(['1.1.1.1', '8.8.8.8']);
        const resolvedIps = await resolver.resolve4(targetDomain);
        if (resolvedIps && resolvedIps.length > 0) {
          license_server_ip = resolvedIps[0];
        }
      } catch (dnsErr: any) {
        console.error('[EasyTunnel] Failed to resolve target domain IP via public DNS:', dnsErr.message);
      }

      const info = {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        wg_installed: WireguardManager.isWireGuardInstalled(),
        tunnel_base_domain: process.env.EASY_TUNNEL_BASE_DOMAIN || 'absenta.id',
        license_server_ip,
        deploy_scenario: getDeployScenario()
      };
      return reply.send({ success: true, data: info });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async installWireguard(_request: any, reply: any) {
    try {
      const result = await WireguardManager.installWireGuard();
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  // ─── Custom Domain Handlers ──────────────────────────────────────────────────

  async setCustomDomain(request: any, reply: any) {
    try {
      const { custom_domain } = request.body || {};
      if (!custom_domain) {
        return reply.status(400).send({ success: false, message: 'custom_domain wajib diisi.' });
      }
      const result = await EasyTunnelService.setCustomDomain(request.tenantId, custom_domain);
      return reply.send({ success: true, ...result });
    } catch (err: any) {
      console.error('[EasyTunnel] setCustomDomain error:', err);
      return reply.status(400).send({ success: false, message: err.message });
    }
  },

  async removeCustomDomain(request: any, reply: any) {
    try {
      const result = await EasyTunnelService.removeCustomDomain(request.tenantId);
      return reply.send({ success: true, ...result });
    } catch (err: any) {
      console.error('[EasyTunnel] removeCustomDomain error:', err);
      return reply.status(400).send({ success: false, message: err.message });
    }
  },

  async getCustomDomainStatus(request: any, reply: any) {
    try {
      const result = await EasyTunnelService.getCustomDomainStatus(request.tenantId);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      console.error('[EasyTunnel] getCustomDomainStatus error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },
  
  async getMyLicenses(request: any, reply: any) {
    try {
      let { slug } = request.params;

      // 1. Auto-detect subdomain tenant jika parameter slug default atau kosong
      if (!slug || slug === 'default') {
        if (request.tenantId && request.tenantId !== 'system') {
          const tenant = await prisma.tenant.findUnique({
            where: { id: request.tenantId },
            select: { subdomain: true }
          });
          if (tenant?.subdomain) {
            slug = tenant.subdomain;
          }
        }

        if (!slug || slug === 'default') {
          const activeTenant = await prisma.tenant.findFirst({
            where: { subdomain: { not: null } },
            select: { subdomain: true }
          });
          if (activeTenant?.subdomain) {
            slug = activeTenant.subdomain;
          }
        }
      }

      const isSuper = isSystemSuperAdmin(request.user);
      const searchSlugs = new Set<string>();

      if (!isSuper && request.tenantId && request.tenantId !== 'system') {
        // Strict Multi-Tenant Isolation: Admin sekolah HANYA boleh melihat lisensi institusinya sendiri
        const tenant = await prisma.tenant.findUnique({
          where: { id: request.tenantId },
          select: { subdomain: true }
        });
        if (tenant?.subdomain) {
          const cleanSub = tenant.subdomain.trim().toLowerCase();
          searchSlugs.add(cleanSub);
          if (cleanSub.endsWith('t')) searchSlugs.add(`${cleanSub}h`);
          if (cleanSub.endsWith('th')) searchSlugs.add(cleanSub.slice(0, -1));
        }
      } else {
        // Superadmin Scope:
        if (slug && slug !== 'default') {
          const cleanSlug = slug.trim().toLowerCase();
          searchSlugs.add(cleanSlug);
          if (cleanSlug.endsWith('t')) searchSlugs.add(`${cleanSlug}h`);
          if (cleanSlug.endsWith('th')) searchSlugs.add(cleanSlug.slice(0, -1));
        }

        // Di saas-local, Superadmin platform boleh mengelola lisensi seluruh tenant lokal di host server
        const deployScenario = getDeployScenario();
        if (deployScenario === 'saas-local' || !slug || slug === 'default') {
          const localTenants = await prisma.tenant.findMany({
            where: { subdomain: { not: null } },
            select: { subdomain: true }
          });
          for (const lt of localTenants) {
            if (lt.subdomain) {
              const cleanSub = lt.subdomain.trim().toLowerCase();
              searchSlugs.add(cleanSub);
              if (cleanSub.endsWith('t')) searchSlugs.add(`${cleanSub}h`);
              if (cleanSub.endsWith('th')) searchSlugs.add(cleanSub.slice(0, -1));
            }
          }
        }
      }

      const combinedLicenses: any[] = [];
      const seenKeys = new Set<string>();
      const serverLicenseKey = process.env.LICENSE_KEY || '';
      const deployScenario = getDeployScenario();

      for (const s of searchSlugs) {
        try {
          // 1. Prioritize authenticated, strictly-scoped 2-Tier Entitlements query
          let list = await fetchTenantProducts({
            server_license_key: serverLicenseKey,
            tenant_slug: s,
            deploy_scenario: deployScenario
          });

          // 2. Fallback to legacy fetchLicensesBySlug if empty (e.g. backward compatibility)
          if (!list || list.length === 0) {
            list = await fetchLicensesBySlug(s);
          }

          if (Array.isArray(list)) {
            for (const lic of list) {
              if (lic.license_key && !seenKeys.has(lic.license_key)) {
                // Hanya sertakan lisensi produk easy-tunnel
                if (lic.product_id && lic.product_id !== 'easy-tunnel') continue;

                seenKeys.add(lic.license_key);
                combinedLicenses.push({
                  ...lic,
                  subdomain: lic.subdomain || lic.requested_slug || s,
                  requested_slug: lic.requested_slug || lic.subdomain || s,
                  app_name: lic.app_name || lic.school_name || ''
                });
              }
            }
          }
        } catch (slugErr: any) {
          console.warn(`[EasyTunnel] Warning fetching licenses for slug ${s}:`, slugErr.message);
        }
      }

      return reply.send({ success: true, data: combinedLicenses });
    } catch (err: any) {
      console.error('[EasyTunnel] getMyLicenses error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  }
};

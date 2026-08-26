// @ts-nocheck
import { authService } from '../../services/auth.service';
import { authDb as prisma } from '../../services/repositories/auth.db';
import { RegisterInput, LoginInput, RegisterTenantInput, UserResponse } from '../../types/auth.types';
import { authorizationService } from '../../services/authorization.service';
import { checkSlugAvailability, checkLicenseStatus } from '@/services/licenseClient';
import { organizationalAuthorizationEngine } from '../../services/organizational-authorization.engine';
import { getTenantCapabilities } from '@/utils/tenant-capabilities';
import { getEffectiveAbsensiMode } from '@/utils/attendanceModeHelper';
import { VALID_ROLES } from '@/constants/enums';
import { EmailService } from '@/modules/notification/services/email.service';
import { WhatsAppService } from '@/modules/notification/services/whatsapp.service';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import { activityLogService } from '@/modules/activity/services/activity-log.service';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { getSmartFrontendBaseUrl, getDomainBases, getSmartParentAppUrl } from '@/utils/url-helper';
import { WireguardManager } from '@/services/wireguardManager';
import * as jwt from 'jsonwebtoken';

export const getJwtSecret = () => process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export const authTenantController = {
  extractSubdomain(host: string): string | null {
    const raw = String(host || '').toLowerCase();
    const withoutProtocol = raw.includes('://') ? raw.split('://')[1] : raw;
    const hostOnly = withoutProtocol.split('/')[0].split(':')[0];
    const parts = hostOnly.split('.');
    if (parts.length < 3) return null;
    return parts[0] || null;
  },

  resolveBaseDomains(): string[] {
    return getDomainBases();
  },

  pickHostForTenant(headers: any): string {
    const originRaw = headers?.origin || headers?.referer || '';
    const forwardedHostRaw = headers?.['x-forwarded-host'] || '';
    const hostRaw = headers?.host || '';
    const originHost = originRaw ? String(originRaw).toLowerCase() : '';
    const forwardedHost = forwardedHostRaw ? String(forwardedHostRaw).toLowerCase() : '';
    const reqHost = hostRaw ? String(hostRaw).toLowerCase() : '';
    const baseDomains = authTenantController.resolveBaseDomains();
    const candidates = [originHost, forwardedHost, reqHost];
    for (const c of candidates) {
      if (!c) continue;
      const h = (c.includes('://') ? c.split('://')[1] : c).split('/')[0].split(':')[0];
      for (const base of baseDomains) {
        if (h === base || h.endsWith(`.${base}`)) return h;
      }
    }
    return (forwardedHost || reqHost).split('/')[0].split(':')[0];
  },

  resolveTenantDomainBase(headers: any): string {
    const explicit = String(process.env.PUBLIC_DOMAIN_BASE || '').trim().toLowerCase();
    if (explicit) return explicit;
    const main = String(process.env.MAIN_DOMAIN || '').trim().toLowerCase();
    if (main) return main;

    const basesRaw = String(process.env.CORS_WILDCARD_BASES || '').toLowerCase();
    const baseFromCors = basesRaw.split(',').map(s => s.trim()).filter(Boolean)[0] || '';
    if (baseFromCors) return baseFromCors;

    const parseBaseFromUrlOrHost = (raw: any): string => {
      const s = String(raw || '').trim();
      if (!s) return '';
      const host = (() => {
        try {
          return new URL(s).hostname;
        } catch {
          return s.split('://').pop()?.split('/')[0]?.split(':')[0] || '';
        }
      })().toLowerCase();
      const sanitized = host.replace(/^www\./, '').replace(/^api\./, '').replace(/^app\./, '');
      const parts = sanitized.split('.').filter(Boolean);
      if (parts.length >= 3) return parts.slice(1).join('.');
      if (parts.length === 2) return parts.join('.');
      return '';
    };

    const baseFromOrigin = parseBaseFromUrlOrHost(headers?.origin);
    if (baseFromOrigin) return baseFromOrigin;
    const baseFromReferer = parseBaseFromUrlOrHost(headers?.referer);
    if (baseFromReferer) return baseFromReferer;

    const hostPicked = authTenantController.pickHostForTenant(headers);
    const hostNoPort = String(hostPicked || '').split('/')[0].split(':')[0].toLowerCase();
    const sanitized = hostNoPort.replace(/^www\./, '').replace(/^api\./, '').replace(/^app\./, '');
    const parts = sanitized.split('.').filter(Boolean);
    if (parts.length >= 2) {
      if (parts.length >= 3) return parts.slice(1).join('.');
      return parts.join('.');
    }
    const fallbackMain = String(process.env.MAIN_DOMAIN || process.env.PUBLIC_DOMAIN_BASE || '').trim().toLowerCase();
    if (fallbackMain) return fallbackMain;
    try {
      return new URL(getSmartFrontendBaseUrl()).hostname;
    } catch {
      return 'localhost';
    }
  },
async resolveTenantByHost(headers: any): Promise<any | null> {
    const isSingleTenant = process.env.DEPLOY_SCENARIO === 'SINGLE_TENANT' || process.env.DEPLOY_SCENARIO === 'hybrid' || process.env.DEPLOY_SCENARIO === 'on-premise';
    if (isSingleTenant) {
      const singleTenant = await prisma.tenant.findFirst({
        where: { subdomain: { not: 'app' } }
      }) || await prisma.tenant.findFirst();
      if (singleTenant) return singleTenant;
    }

    const host = authTenantController.pickHostForTenant(headers);
    const hostNoPort = String(host || '').split('/')[0].split(':')[0].toLowerCase().trim();
    if (!hostNoPort) return null;

    // 1. Exact Match on custom_domain or legacy domain (Case Insensitive)
    const exact = await prisma.tenant.findFirst({
      where: {
        OR: [
          { custom_domain: { equals: hostNoPort, mode: 'insensitive' } },
          { subdomain: { equals: hostNoPort, mode: 'insensitive' } }
        ]
      }
    });
    if (exact) return exact;

    // 2. Subdomain Match (e.g. smk1.absenta.id -> subdomain: smk1)
    const baseDomains = authTenantController.resolveBaseDomains();
    
    // Jika tidak ada base domain, coba tebak dari host (ambil 2 part terakhir)
    const hostParts = hostNoPort.split('.');
    if (baseDomains.length === 0 && hostParts.length >= 3) {
      baseDomains.push(`${hostParts[hostParts.length - 2]}.${hostParts[hostParts.length - 1]}`);
    }

    for (const base of baseDomains) {
      if (hostNoPort === base) {
        // Jika host sama persis dengan base domain, mungkin ada tenant 'default' atau 'app'
        const rootTenant = await prisma.tenant.findFirst({
          where: { subdomain: { equals: 'app', mode: 'insensitive' } }
        });
        if (rootTenant) return rootTenant;
      }

      if (hostNoPort.endsWith(`.${base}`)) {
        const sub = hostNoPort.slice(0, -(base.length + 1)).replace(/^(api|www)\./, '');
        if (sub) {
          const t = await prisma.tenant.findFirst({
            where: {
              subdomain: { equals: sub, mode: 'insensitive' }
            }
          });
          if (t) return t;
        }
      }
    }

    // 3. Fallback Terakhir: Jika masih tidak ketemu, dan ini adalah domain utama Bapak
    // kita asumsikan ini adalah tenant 'app' (untuk testing/landing)
    if (hostNoPort.includes('absenta.id')) {
       return await prisma.tenant.findFirst({
         where: { subdomain: { equals: 'app', mode: 'insensitive' } }
       });
    }

    return null;
  },
async getDevTenants(request: any, reply: any) {
    try {
      const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
      if (isProd) {
        reply.status(404);
        return { success: false, message: 'Not found' };
      }

      const headerHostRaw = request.headers['x-forwarded-host'] || request.headers['host'] || '';
      const hostNoPort = (headerHostRaw ? String(headerHostRaw).toLowerCase() : '').split(':')[0];
      const isLocalHostRequest = hostNoPort === 'localhost' || hostNoPort === '127.0.0.1';
      const isPrivateLanRequest =
        /^10\./.test(hostNoPort) ||
        /^192\.168\./.test(hostNoPort) ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostNoPort);
      const devAllow = (process.env.DEV_ALLOW_LOCALHOST_LOGIN || '').toLowerCase() === 'true';
      if (!(devAllow && (isLocalHostRequest || isPrivateLanRequest))) {
        reply.status(403);
        return { success: false, message: 'Forbidden' };
      }

      const tenants = await prisma.tenant.findMany({
        where: {
          status: 'ACTIVE',
          id: { not: 'system' as any },
        },
        select: { id: true, name: true, subdomain: true, custom_domain: true },
        orderBy: { name: 'asc' },
      });

      const mappedTenants = tenants.map(t => ({
        id: t.id,
        name: t.name,
        domain: t.subdomain,
        subdomain: t.subdomain,
        custom_domain: t.custom_domain
      }));

      reply.status(200);
      return { success: true, message: 'Tenants retrieved', data: mappedTenants };
    } catch {
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },
async tenantInfo(request: any, reply: any) {
    try {
      const tenantRecord = await authTenantController.resolveTenantByHost(request.headers);
      if (!tenantRecord) {
        reply.status(404);
        return { success: false, message: 'Tenant not found' };
      }
      
      let isTunnelActive = false;
      try {
        const tunnels = await prisma.easyTunnel.findMany({
          where: tenantRecord.subdomain 
            ? { OR: [{ slug: tenantRecord.subdomain }, { status: 'active' }] }
            : {}
        });

        for (const t of tunnels) {
          if (t.status === 'active' || t.status === 'connected') {
            isTunnelActive = true;
            break;
          }
          if (t.slug) {
            const wg = WireguardManager.getStatus(t.slug);
            if (wg.status === 'connected') {
              isTunnelActive = true;
              break;
            }
          }
        }
      } catch (tunnelErr) {
        console.warn('[tenantInfo] Failed to check easy tunnel status:', tunnelErr);
      }

      // Fetch address and phone from Config table
      const configs = await prisma.config.findMany({
        where: {
          tenant_id: tenantRecord.id,
          key: { in: ['address', 'phone'] }
        }
      });
      const configMap = configs.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {} as Record<string, string>);

      reply.status(200);
      return {
        success: true,
        message: 'OK',
        data: {
          id: tenantRecord.id,
          name: tenantRecord.name,
          domain: tenantRecord.domain,
          logo_url: tenantRecord.logo_url,
          address: configMap['address'] || null,
          phone: configMap['phone'] || null,
          is_tunnel_active: isTunnelActive,
        }
      };
    } catch (err) {
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },
async checkDomain(request: any, reply: any) {
    try {
      const raw = (request.query?.domain ?? request.query?.fqdn ?? request.query?.d ?? '') as string;
      const domain = String(raw || '').trim().toLowerCase();
      if (!domain) {
        reply.status(400);
        return { success: false, message: 'Parameter domain diperlukan' };
      }
      const sub = (() => {
        const ix = domain.indexOf('.');
        if (ix > 0) return domain.substring(0, ix);
        return domain;
      })();

      // 1. Format validation
      const subdomainRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
      if (!subdomainRegex.test(sub)) {
        return {
          success: true,
          message: 'Format subdomain tidak valid.',
          data: { domain, subdomain: sub, available: false }
        };
      }

      // 2. Reserved subdomains
      const reservedSubdomains = ['www', 'api', 'admin', 'mail', 'smtp', 'pop', 'imap', 'test', 'dev', 'stage', 'prod', 'support', 'help', 'blog', 'status', 'app', 'dashboard', 'auth', 'login', 'register', 'signin', 'signup'];
      if (reservedSubdomains.includes(sub)) {
        return {
          success: true,
          message: 'Subdomain ini tidak tersedia (reserved).',
          data: { domain, subdomain: sub, available: false }
        };
      }

      // 2b. Bypass check if it matches local server's licensed subdomain in single-tenant mode
      const isSingleTenant = process.env.DEPLOY_SCENARIO === 'SINGLE_TENANT' || process.env.DEPLOY_SCENARIO === 'hybrid' || process.env.DEPLOY_SCENARIO === 'on-premise';
      const licenseKey = process.env.LICENSE_KEY;
      if (isSingleTenant && licenseKey) {
        try {
          const licInfo = await checkLicenseStatus(licenseKey);
          if (licInfo.success && licInfo.data?.requested_slug) {
            const serverSub = String(licInfo.data.requested_slug).trim().toLowerCase();
            if (sub === serverSub) {
              reply.status(200);
              return {
                success: true,
                message: 'Domain tersedia (Lisensi Server Terverifikasi)',
                data: { domain, subdomain: sub, available: true }
              };
            }
          }
        } catch (err: any) {
          console.warn(`[Subdomain Bypass Warning] Gagal memvalidasi lisensi lokal saat checkDomain:`, err.message);
        }
      }

      // 3. Local check
      const existing = await prisma.tenant.findFirst({
        where: {
          OR: [
            { subdomain: sub },
            { custom_domain: domain }
          ]
        }
      });
      if (existing) {
        return {
          success: true,
          message: 'Domain sudah digunakan secara lokal',
          data: { domain, subdomain: sub, available: false }
        };
      }

      // 4. Global license server check
      try {
        const globCheck = await checkSlugAvailability(sub);
        if (!globCheck.available) {
          return {
            success: true,
            message: 'Domain sudah digunakan di server lisensi pusat',
            data: { domain, subdomain: sub, available: false }
          };
        }
      } catch (err: any) {
        console.warn(`[Subdomain Check Warning] Gagal verifikasi subdomain '${sub}' secara global di server pusat:`, err.message);
      }

      reply.status(200);
      return {
        success: true,
        message: 'Domain tersedia',
        data: {
          domain,
          subdomain: sub,
          available: true
        }
      };
    } catch (err) {
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },
async registrationPreset(_request: any, reply: any) {
    try {
      const isSingleTenant = process.env.DEPLOY_SCENARIO === 'SINGLE_TENANT' || process.env.DEPLOY_SCENARIO === 'hybrid' || process.env.DEPLOY_SCENARIO === 'on-premise';
      const licenseKey = process.env.LICENSE_KEY;

      const tenantCount = await prisma.tenant.count({
        where: {
          AND: [
            { subdomain: { not: null } },
            { subdomain: { not: '' } },
            { subdomain: { notIn: ['app', 'system'] } }
          ]
        }
      });
      const isRegistered = tenantCount > 0;

      if (isSingleTenant) {
        let presetData: any = {
          is_single_tenant: true,
          is_registered: isRegistered,
          license_key: licenseKey || '',
          school_name: '',
          subdomain: '',
          npsn: '',
          operator_phone: ''
        };

        if (licenseKey) {
          try {
            const licInfo = await checkLicenseStatus(licenseKey);
            if (licInfo.success && licInfo.data) {
              presetData.school_name = licInfo.data.school_name || '';
              presetData.subdomain = licInfo.data.requested_slug || '';
              presetData.npsn = licInfo.data.npsn || '';
              presetData.operator_phone = licInfo.data.operator_phone || '';
            }
          } catch (err: any) {
            console.error('[RegistrationPreset] Gagal memuat status lisensi pusat:', err.message);
          }
        }

        return reply.send({
          success: true,
          data: presetData
        });
      }

      return reply.send({
        success: true,
        data: {
          is_single_tenant: false,
          is_registered: false
        }
      });
    } catch (err: any) {
      console.error('[RegistrationPreset] error:', err);
      return reply.status(500).send({
        success: false,
        message: err.message || 'Internal server error'
      });
    }
  }
};

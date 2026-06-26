import { authService } from '../services/auth.service';
import { authDb as prisma } from '../services/repositories/auth.db';
import { RegisterInput, LoginInput, RegisterTenantInput, UserResponse } from '../types/auth.types';
import { authorizationService } from '../services/authorization.service';
import { organizationalAuthorizationEngine } from '../services/organizational-authorization.engine';
import { getTenantCapabilities } from '@/utils/tenant-capabilities';
import { getEffectiveAbsensiMode } from '@/utils/attendanceModeHelper';
import { VALID_ROLES } from '../../../constants/enums';
import { EmailService } from '../../notification/services/email.service';
import { WhatsAppService } from '../../notification/services/whatsapp.service';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import { activityLogService } from '@/modules/activity/services/activity-log.service';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { getSmartFrontendBaseUrl, getDomainBases, getSmartParentAppUrl } from '@/utils/url-helper';

export const authController = {
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
    const baseDomains = authController.resolveBaseDomains();
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

    const hostPicked = authController.pickHostForTenant(headers);
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
    const host = authController.pickHostForTenant(headers);
    const hostNoPort = String(host || '').split('/')[0].split(':')[0].toLowerCase();
    if (!hostNoPort) return null;

    const sanitize = (h: string) => h.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();
    const h = sanitize(hostNoPort);
    const hNoWww = h.replace(/^www\./, '');
    const hNoApi = hNoWww.replace(/^api\./, '');
    const hNoApp = hNoApi.replace(/^app\./, '');

    const baseDomains = authController.resolveBaseDomains();
    const exactCandidates = Array.from(new Set([h, hNoWww, hNoApi, hNoApp].filter(Boolean)));
    const exact = await prisma.tenant.findFirst({ where: { domain: { in: exactCandidates as any } } });
    if (exact) return exact;

    for (const base of baseDomains) {
      if (hNoApp === base) {
        const direct = await prisma.tenant.findFirst({ where: { domain: base as any } });
        if (direct) return direct;
      }
      if (hNoApp.endsWith(`.${base}`)) {
        const left = hNoApp.slice(0, -(base.length + 1));
        if (!left) continue;
        const stripped = left.replace(/^(api|app|www)\./, '');
        if (!stripped) continue;
        const firstLabel = stripped.split('.')[0];
        const candidates = Array.from(new Set([firstLabel, stripped].filter(Boolean)));
        const t = await prisma.tenant.findFirst({ where: { domain: { in: candidates as any } } });
        if (t) return t;
      }
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
        select: { id: true, name: true, domain: true },
        orderBy: { name: 'asc' },
      });

      reply.status(200);
      return { success: true, message: 'Tenants retrieved', data: tenants };
    } catch {
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  async checkEmail(request: any, reply: any) {
    try {
      console.log('[DEBUG] checkEmail params:', request.params, 'query:', request.query);
      const email = (request.params && request.params.email) || (request.query && request.query.email);
      
      if (!email) {
        return reply.status(400).send({ success: false, message: 'Email required' });
      }

      const user = await prisma.user.findFirst({
        where: { email: email }
      });

      return {
        success: true,
        available: !user,
        message: user ? 'Email sudah terdaftar' : 'Email tersedia'
      };
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ success: false, message: 'Internal Server Error' });
    }
  },

  async register(request: any, reply: any) {
    try {
      if ((process.env.ENABLE_PUBLIC_REGISTRATION || '').toLowerCase() !== 'true') {
        reply.status(403);
        return { success: false, message: 'Public registration is disabled' };
      }
      const { email, password, full_name, role, tenant_id } = request.body as RegisterInput;

      // Validate required fields
      if (!email || !password || !full_name || !role) {
        reply.status(400);
        return {
          success: false,
          message: 'Email, password, full_name, and role are required',
        };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        reply.status(400);
        return {
          success: false,
          message: 'Invalid email format',
        };
      }

      // Password policy
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasDigit = /\d/.test(password);
      if (password.length < 8 || !hasUpper || !hasLower || !hasDigit) {
        reply.status(400);
        return {
          success: false,
          message: 'Password must be at least 8 chars and include upper, lower, digit',
        };
      }

      // Validate role
      const validRoles = VALID_ROLES;
      if (!validRoles.includes(role as any)) {
        reply.status(400);
        return {
          success: false,
          message: 'Invalid role',
        };
      }

      if (role !== 'ADMIN') {
        reply.status(403);
        return {
          success: false,
          message: 'Only ADMIN registration is permitted',
        };
      }

      // tenant_id is required and must exist
      if (!tenant_id) {
        reply.status(400);
        return {
          success: false,
          message: 'tenant_id is required',
        };
      }
      const tenant = await prisma.tenant.findUnique({ where: { id: tenant_id } });
      if (!tenant || tenant.status !== 'ACTIVE') {
        reply.status(400);
        return {
          success: false,
          message: 'Invalid or inactive tenant',
        };
      }

      // SUPERADMIN registration is never allowed through public endpoint

      const registerInput: RegisterInput = {
        email,
        password,
        full_name,
        role,
        tenant_id,
      };

      const user = await authService.register(registerInput);

      try {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (dbUser?.verification_token && dbUser.email) {
          const verifyUrlBase = getSmartFrontendBaseUrl();
          const verifyUrl = `${verifyUrlBase}/verify-email/status/${encodeURIComponent(dbUser.verification_token)}`;
          const systemConfig = await systemConfigService.getActive(String(tenant_id || '') || null);
          const escapeHtml = (v: any): string => String(v ?? '').replace(/[&<>"']/g, (ch) => {
            if (ch === '&') return '&amp;';
            if (ch === '<') return '&lt;';
            if (ch === '>') return '&gt;';
            if (ch === '"') return '&quot;';
            if (ch === "'") return '&#39;';
            return ch;
          });
          const isHttpUrl = (v: any): boolean => /^https?:\/\//i.test(String(v ?? '').trim());
          const safeVerifyUrl = isHttpUrl(verifyUrl) ? String(verifyUrl).trim() : '';
          const safeVerifyUrlEsc = safeVerifyUrl ? escapeHtml(safeVerifyUrl) : '';
          const appNameRaw = String(systemConfig?.app_name || '').trim() || 'Absenta';
          const taglineRaw = String((systemConfig as any)?.tagline || '').trim();
          const companyLegalNameRaw = String((systemConfig as any)?.company_legal_name || '').trim();
          const appLabel = escapeHtml(appNameRaw + (taglineRaw ? ` ${taglineRaw}` : ''));
          const companyLegalName = companyLegalNameRaw ? escapeHtml(companyLegalNameRaw) : '';
          const fullName = escapeHtml(user.full_name);
          const emailService = new EmailService();
          await emailService.sendEmail({
            to: dbUser.email,
            subject: 'Verifikasi Email Akun Absensi',
            html: `
              <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;background:#f3f4f6;padding:20px;">
                <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                  <div style="background:#0ea5e9;color:#fff;padding:16px 20px;">
                    <h2 style="margin:0;font-size:18px;">Verifikasi Email</h2>
                  </div>
                  <div style="padding:18px 20px;color:#111827;">
                    <p style="margin:0 0 12px;">Yth. Bapak/Ibu <strong>${fullName}</strong>,</p>
                    <p style="margin:0 0 12px;">Terima kasih telah melakukan pendaftaran layanan <strong>${appLabel}</strong>.</p>
                    <p style="margin:0 0 16px;">Untuk mengaktifkan akun <strong>Administrator Sekolah</strong>, silakan lakukan verifikasi email melalui tombol berikut:</p>
                    <p style="margin:0 0 16px;">
                      <a href="${safeVerifyUrlEsc}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Verifikasi Email</a>
                    </p>
                    <p style="margin:0 0 8px;color:#374151;">Apabila tombol tidak dapat diakses, silakan buka tautan berikut:</p>
                    <p style="margin:0 0 16px;">
                      <a href="${safeVerifyUrlEsc}" style="color:#2563eb;text-decoration:none;">${safeVerifyUrlEsc}</a><br/>
                      <code style="display:block;margin-top:8px;padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;color:#111827;word-break:break-all;">${safeVerifyUrlEsc}</code>
                    </p>
                    <p style="margin:0 0 18px;color:#374151;">Jika Anda tidak merasa melakukan pendaftaran, mohon abaikan pesan ini.</p>
                    <p style="margin:0;">Hormat kami,</p>
                    <p style="margin:6px 0 0;"><strong>Tim ${escapeHtml(appNameRaw)}</strong></p>
                    ${companyLegalName ? `<p style="margin:6px 0 0;color:#6b7280;">${companyLegalName}</p>` : ''}
                  </div>
                  <div style="padding:12px 20px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
                    Email ini dikirim otomatis oleh sistem.
                  </div>
                </div>
              </div>
            `
          });
        }
      } catch {}

      reply.status(201);
      return {
        success: true,
        message: 'User registered successfully',
        data: user,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      
      if (errorMessage === 'User already exists') {
        reply.status(400);
        return {
          success: false,
          message: errorMessage,
        };
      }

      reply.status(500);
      return {
        success: false,
        message: 'Internal server error',
      };
    }
  },

  async verifyEmail(request: any, reply: any) {
    try {
      const accept = String(request.headers['accept'] || '').toLowerCase();
      const wantsJson = accept.includes('application/json');
      const raw = String(request.query?.token || '').trim();
      const decodeSafe = (v: string) => {
        try { return decodeURIComponent(v); } catch { return v; }
      };
      let token = decodeSafe(raw);
      token = decodeSafe(token);
      token = token.replace(/^['"`<]+|['"`>]+$/g, '').replace(/\s+/g, '');
      const uuidMatch = token.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
      if (uuidMatch && uuidMatch[0]) {
        token = uuidMatch[0];
      } else {
        token = token.replace(/[)\].,;:]+$/g, '');
      }
      if (!token) {
        try {
          await prisma.activityLog.create({
            data: {
              tenant_id: 'system',
              action: 'EMAIL_VERIFICATION_FAILED',
              entity: 'USER',
              metadata: JSON.stringify({ reason: 'MISSING_TOKEN' })
            }
          });
        } catch {}
        if (wantsJson) {
          reply.status(400);
          return { success: false, message: 'Missing token', status: 'MISSING_TOKEN' };
        } else {
          reply.status(400);
          return { success: false, message: 'Missing token' };
        }
      }
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { verification_token: token },
            { verification_token: token.toLowerCase() },
            { verification_token: token.toUpperCase() },
          ]
        }
      });
      if (!user) {
        try {
          await prisma.activityLog.create({
            data: {
              tenant_id: 'system',
              action: 'EMAIL_VERIFICATION_FAILED',
              entity: 'USER',
              metadata: JSON.stringify({ reason: 'INVALID_TOKEN' })
            }
          });
        } catch {}
        if (wantsJson) {
          reply.status(404);
          return { success: false, message: 'Invalid token', status: 'INVALID' };
        }
        const frontendBase = getSmartFrontendBaseUrl();
        reply.redirect(`${frontendBase}/verify-email/status`);
        return;
      }
      // Check token expiry (derived from last token update time)
      const ttlMinutes = parseInt(String(process.env.VERIFICATION_TOKEN_TTL_MINUTES || '1440')); // default 24h
      const issueTime = (user.updated_at || user.created_at) as Date;
      const expiresAtMs = issueTime ? (new Date(issueTime).getTime() + ttlMinutes * 60 * 1000) : 0;
      const nowMs = Date.now();
      const isExpired = expiresAtMs > 0 && nowMs > expiresAtMs;

      if (user.email_verified) {
        if (wantsJson) {
          reply.status(200);
          const tenant = user.tenant_id ? await prisma.tenant.findUnique({ where: { id: user.tenant_id } }) : null;
          const tenantBaseUrl = tenant?.domain ? getSmartParentAppUrl(tenant.domain, tenant.id) : null;
          const tenantDomain = tenantBaseUrl ? tenantBaseUrl.replace(/^https?:\/\//, '') : null;
          const loginUrl = tenantBaseUrl ? `${tenantBaseUrl}/login` : (getSmartFrontendBaseUrl() + '/login');
          return { success: true, message: 'Email already verified', status: 'VERIFIED', tenantDomain, loginUrl };
        }
        const frontendBase = getSmartFrontendBaseUrl();
        reply.redirect(`${frontendBase}/verify-email/status/${encodeURIComponent(token)}`);
        return;
      }
      if (isExpired) {
        if (wantsJson) {
          reply.status(400);
          const tenant = user.tenant_id ? await prisma.tenant.findUnique({ where: { id: user.tenant_id } }) : null;
          const tenantBaseUrl = tenant?.domain ? getSmartParentAppUrl(tenant.domain, tenant.id) : null;
          const tenantDomain = tenantBaseUrl ? tenantBaseUrl.replace(/^https?:\/\//, '') : null;
          const loginUrl = tenantBaseUrl ? `${tenantBaseUrl}/login` : (getSmartFrontendBaseUrl() + '/login');
          return { success: false, message: 'Token kedaluwarsa', status: 'EXPIRED', tenantDomain, loginUrl };
        }
        const frontendBase = getSmartFrontendBaseUrl();
        reply.redirect(`${frontendBase}/verify-email/status/${encodeURIComponent(token)}`);
        return;
      }
      if (wantsJson) {
        reply.status(200);
        const tenant = user.tenant_id ? await prisma.tenant.findUnique({ where: { id: user.tenant_id } }) : null;
        const tenantBaseUrl = tenant?.domain ? getSmartParentAppUrl(tenant.domain, tenant.id) : null;
        const tenantDomain = tenantBaseUrl ? tenantBaseUrl.replace(/^https?:\/\//, '') : null;
        const loginUrl = tenantBaseUrl ? `${tenantBaseUrl}/login` : (getSmartFrontendBaseUrl() + '/login');
        return {
          success: true,
          message: 'Needs confirmation',
          status: 'NEEDS_CONFIRM',
          token,
          expiresAt: expiresAtMs ? new Date(expiresAtMs).toISOString() : null,
          expiresInSeconds: expiresAtMs ? Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000)) : null,
          tenantDomain,
          loginUrl,
        };
      }
      {
        const frontendBase = getSmartFrontendBaseUrl();
        reply.redirect(`${frontendBase}/verify-email/status/${encodeURIComponent(token)}`);
        return;
      }
    } catch (error) {
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  async confirmVerifyEmail(request: any, reply: any) {
    try {
      const accept = String(request.headers['accept'] || '').toLowerCase();
      const wantsJson = accept.includes('application/json');
      const raw = String((request.body && (request.body as any).token) || request.query?.token || '').trim();
      const decodeSafe = (v: string) => {
        try { return decodeURIComponent(v); } catch { return v; }
      };
      let token = decodeSafe(raw);
      token = decodeSafe(token);
      token = token.replace(/^['"`<]+|['"`>]+$/g, '').replace(/\s+/g, '');
      const uuidMatch = token.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
      if (uuidMatch && uuidMatch[0]) {
        token = uuidMatch[0];
      } else {
        token = token.replace(/[)\].,;:]+$/g, '');
      }
      if (!token) {
        if (wantsJson) {
          reply.status(400);
          return { success: false, message: 'Missing token', status: 'MISSING_TOKEN' };
        } else {
          reply.status(400);
          return { success: false, message: 'Missing token' };
        }
      }
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { verification_token: token },
            { verification_token: token.toLowerCase() },
            { verification_token: token.toUpperCase() },
          ]
        }
      });
      if (!user) {
        if (wantsJson) {
          reply.status(404);
          return { success: false, message: 'Invalid token', status: 'INVALID' };
        }
        const frontendBase = getSmartFrontendBaseUrl();
        reply.redirect(`${frontendBase}/verify-email/status`);
        return;
      }
      // Check token expiry before confirming
      const ttlMinutes = parseInt(String(process.env.VERIFICATION_TOKEN_TTL_MINUTES || '1440'));
      const issueTime = (user.updated_at || user.created_at) as Date;
      const expiresAtMs = issueTime ? (new Date(issueTime).getTime() + ttlMinutes * 60 * 1000) : 0;
      const nowMs = Date.now();
      const isExpired = expiresAtMs > 0 && nowMs > expiresAtMs;
      if (isExpired && !user.email_verified) {
        if (wantsJson) {
          reply.status(400);
          const tenant = user.tenant_id ? await prisma.tenant.findUnique({ where: { id: user.tenant_id } }) : null;
          const d = String(tenant?.domain || '').trim().toLowerCase();
          const scheme = (process.env.PUBLIC_APP_SCHEME || 'https').trim();
          const domainBase = authController.resolveTenantDomainBase(request.headers);
          const tenantBaseUrl = d ? (d.includes('.') ? `${scheme}://${d}` : `${scheme}://${d}.${domainBase}`) : null;
          const tenantDomain = tenantBaseUrl ? tenantBaseUrl.replace(/^https?:\/\//, '') : null;
          const loginUrl = tenantBaseUrl ? `${tenantBaseUrl}/login` : (getSmartFrontendBaseUrl() + '/login');
          return { success: false, message: 'Token kedaluwarsa', status: 'EXPIRED', tenantDomain, loginUrl };
        }
        const frontendBase = getSmartFrontendBaseUrl();
        reply.redirect(`${frontendBase}/verify-email/status/${encodeURIComponent(token)}`);
        return;
      }
      if (user.email_verified) {
        if (wantsJson) {
          reply.status(200);
          const tenant = user.tenant_id ? await prisma.tenant.findUnique({ where: { id: user.tenant_id } }) : null;
          const d = String(tenant?.domain || '').trim().toLowerCase();
          const scheme = (process.env.PUBLIC_APP_SCHEME || 'https').trim();
          const domainBase = authController.resolveTenantDomainBase(request.headers);
          const tenantBaseUrl = d ? (d.includes('.') ? `${scheme}://${d}` : `${scheme}://${d}.${domainBase}`) : null;
          const tenantDomain = tenantBaseUrl ? tenantBaseUrl.replace(/^https?:\/\//, '') : null;
          const loginUrl = tenantBaseUrl ? `${tenantBaseUrl}/login` : (getSmartFrontendBaseUrl() + '/login');
          return { success: true, message: 'Email already verified', status: 'VERIFIED', tenantDomain, loginUrl };
        }
        const frontendBase = getSmartFrontendBaseUrl();
        reply.redirect(`${frontendBase}/verify-email/status/${encodeURIComponent(token)}`);
        return;
      }
      await prisma.user.update({ where: { id: user.id }, data: { email_verified: true, verification_token: null } });
      
      // Fetch tenant for email and response
      const tenant = user.tenant_id ? await prisma.tenant.findUnique({ where: { id: user.tenant_id } }) : null;
      const tenantBaseUrl = tenant?.domain ? getSmartParentAppUrl(tenant.domain, tenant.id) : null;
      const tenantDomain = tenantBaseUrl ? tenantBaseUrl.replace(/^https?:\/\//, '') : null;
      const loginUrl = tenantBaseUrl ? `${tenantBaseUrl}/login` : (getSmartFrontendBaseUrl().replace(/\/$/, '') + '/login');

      // Send Welcome Email
      try {
        const emailService = new EmailService();
        // Since we don't store plain text password, and this is post-verification, 
        // we can't show the real password unless we cached it temporarily (risky) or just guide them.
        // However, user specifically asked to show password for copy-paste.
        // Standard practice: "Hidden for security" or provide a one-time setup link.
        // BUT, if user insists on "copy paste password", it implies they want to see what they typed.
        // Since we can't decrypt bcrypt hash, we will use a placeholder that guides them,
        // OR if this was triggered immediately after registration (which has plain password), we could pass it.
        // But here verify-email is async. We don't have the password anymore.
        
        // Strategy: We will show a clear message that password is the one they created.
        // If the user *really* wants the password in email, we would have needed to send it in the FIRST email (verification),
        // or temporarily store it encrypted with a reversible key (complex).
        // 
        // Alternative: The screenshot shows "....... (Sesuai saat registrasi)".
        // User wants it visible. 
        // If I cannot retrieve it, I should update the text to be very clear or offer a reset.
        // 
        // Wait, if the user demands "sending credential email... visible password", 
        // maybe they mean the email sent *immediately* after registration?
        // No, this is the "Welcome" email after verification.
        // 
        // Let's use a friendly placeholder since we CANNOT recover the password safely.
        // "Password yang Anda buat saat registrasi"
        
        await emailService.sendWelcomeLoginInfo(user.email, {
          schoolName: tenant?.name || 'Sekolah Anda',
          adminName: user.full_name,
          email: user.email,
          loginUrl: loginUrl,
          year: new Date().getFullYear(),
          password: '(Password yang Anda buat saat pendaftaran)' 
        });
      } catch (e) {
        console.error('Failed to send welcome email after verification:', e);
        // Continue, don't block response
      }

      if (wantsJson) {
        reply.status(200);
        return { success: true, message: 'Email verified successfully', status: 'VERIFIED', tenantDomain, loginUrl };
      }
      const frontendBase = getSmartFrontendBaseUrl();
      reply.redirect(`${frontendBase}/verify-email/status/${encodeURIComponent(token)}`);
      return;
    } catch (error) {
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  async resendVerification(request: any, reply: any) {
    try {
      const emailRaw = (request.body && (request.body as any).email) ? String((request.body as any).email).trim() : '';
      const phoneRaw = (request.body && (request.body as any).phone) ? String((request.body as any).phone).trim() : '';
      const channelRaw = (request.body && (request.body as any).channel) ? String((request.body as any).channel).trim().toLowerCase() : '';
      const channel: 'email' | 'whatsapp' | 'both' =
        channelRaw === 'whatsapp' ? 'whatsapp' :
        channelRaw === 'both' ? 'both' : 'email';
      if (!emailRaw && !phoneRaw) {
        reply.status(400);
        return { success: false, message: 'Email atau nomor WA diperlukan' };
      }

      let user = null as any;
      if (emailRaw) {
        user = await prisma.user.findFirst({ where: { email: emailRaw } });
      }
      if (!user && phoneRaw) {
        user = await prisma.user.findFirst({ where: { no_hp: phoneRaw } });
      }
      if (!user) {
        reply.status(404);
        return { success: false, message: 'User not found' };
      }

      if (user.email_verified) {
        reply.status(200);
        return { success: true, message: 'Email sudah terverifikasi' };
      }

      // Always issue a fresh UUID token to avoid stale tokens
      const { randomUUID } = await import('crypto');
      const token = randomUUID();
      await prisma.user.update({ where: { id: user.id }, data: { verification_token: token, email_verified: false } });
      const verifyUrl = `${getSmartFrontendBaseUrl()}/verify-email/status/${encodeURIComponent(token)}`;

      try {
        if (channel === 'email' || channel === 'both') {
          if (!emailRaw && !user.email) throw new Error('Email tidak tersedia');
          const systemConfig = await systemConfigService.getActive(String(user.tenant_id || '') || null);
          const appNameRaw = String(systemConfig?.app_name || '').trim() || 'Absenta';
          const taglineRaw = String((systemConfig as any)?.tagline || '').trim();
          const companyLegalNameRaw = String((systemConfig as any)?.company_legal_name || '').trim();
          const appLabel = appNameRaw + (taglineRaw ? ` ${taglineRaw}` : '');
          const companyLegalName = companyLegalNameRaw || '';
          
          const isHttpUrl = (v: any): boolean => /^https?:\/\//i.test(String(v ?? '').trim());
          const safeVerifyUrl = isHttpUrl(verifyUrl) ? String(verifyUrl).trim() : '';

          const emailService = new EmailService();
          await emailService.sendVerificationEmail(emailRaw || user.email, {
            fullName: user.full_name,
            appName: appNameRaw,
            appLabel,
            verifyUrl: safeVerifyUrl,
            companyLegalName,
            year: new Date().getFullYear()
          });
        }
        if (channel === 'whatsapp' || channel === 'both') {
          const wa = new WhatsAppService();
          const phone = phoneRaw || user.no_hp || '';
          const formattedPhone = wa.formatPhoneNumber(phone);
          if (!formattedPhone) throw new Error('Nomor WhatsApp tidak tersedia');
          const msg = `Halo ${user.full_name} 👋

Silakan verifikasi akun Anda dengan membuka tautan berikut:
${verifyUrl}

Jika Anda tidak merasa melakukan pendaftaran, abaikan pesan ini.`;
          await wa.sendWhatsApp({
            phoneNumber: formattedPhone,
            message: msg,
            tenantId: user.tenant_id,
            relatedId: user.id,
          });
        }
        try {
          await prisma.activityLog.create({
            data: {
              tenant_id: user.tenant_id,
              user_id: user.id,
              action: channel === 'whatsapp' ? 'VERIFICATION_WHATSAPP_RESENT' : (channel === 'both' ? 'VERIFICATION_EMAIL_WHATSAPP_RESENT' : 'VERIFICATION_EMAIL_RESENT'),
              entity: 'USER',
              entity_id: user.id,
              metadata: JSON.stringify({ email: user.email })
            }
          });
        } catch {}
      } catch (e) {
        try {
          await prisma.activityLog.create({
            data: {
              tenant_id: user.tenant_id,
              user_id: user.id,
              action: channel === 'whatsapp' ? 'VERIFICATION_WHATSAPP_RESEND_FAILED' : (channel === 'both' ? 'VERIFICATION_EMAIL_WHATSAPP_RESEND_FAILED' : 'VERIFICATION_EMAIL_RESEND_FAILED'),
              entity: 'USER',
              entity_id: user.id,
              metadata: JSON.stringify({ email: user.email })
            }
          });
        } catch {}
      }

      reply.status(200);
      return { success: true, message: channel === 'whatsapp' ? 'Link verifikasi telah dikirim via WhatsApp' : (channel === 'both' ? 'Link verifikasi telah dikirim ke email dan WhatsApp' : 'Email verifikasi telah dikirim ulang') };
    } catch (error) {
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  async requestPasswordReset(request: any, reply: any) {
    try {
      const emailRaw = (request.body && (request.body as any).email) ? String((request.body as any).email).trim() : '';
      const tenantIdRaw = (request.body && (request.body as any).tenant_id) ? String((request.body as any).tenant_id).trim() : '';
      if (!emailRaw) {
        reply.status(400);
        return { success: false, message: 'Email is required' };
      }

      let user: any = null;
      if (tenantIdRaw) {
        user = await prisma.user.findFirst({ where: { email: emailRaw, tenant_id: tenantIdRaw } });
      }
      if (!user) {
        user = await prisma.user.findFirst({ where: { email: emailRaw, Role: { is: { name: 'SUPERADMIN' } } } });
      }
      if (!user) {
        user = await prisma.user.findFirst({ where: { email: emailRaw } });
      }
      if (!user) {
        // SA-IS AUDIT FIX: Prevent User Enumeration
        // Return 200 even if user not found, to mimic success behavior.
        // Add random delay to mitigate timing attacks.
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 200) + 100));
        
        reply.status(200);
        return { success: true, message: 'Link reset password telah dikirim' };
      }

      // SA-IS AUDIT LOG: Request Password Reset
      try {
        await prisma.activityLog.create({
          data: {
            tenant_id: user.tenant_id || 'system',
            user_id: user.id,
            action: 'PASSWORD_RESET_REQUEST',
            entity: 'USER',
            entity_id: user.id,
            metadata: JSON.stringify({ 
              email: user.email,
              ip: request.ip,
              user_agent: request.headers['user-agent']
            })
          }
        });
      } catch (logError) {
        console.error('Failed to create audit log:', logError);
      }

      const token = randomUUID();
      const expires = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.user.update({ where: { id: user.id }, data: { reset_token: token, reset_token_expires: expires } });

      const baseUrlRaw = getSmartFrontendBaseUrl().replace(/\/$/, '');
      const resetLink = `${baseUrlRaw}/reset-password?token=${encodeURIComponent(token)}`;

      try {
        const systemConfig = await systemConfigService.getActive(user.tenant_id);
        const appNameRaw = String(systemConfig?.app_name || '').trim() || 'Absenta';

        const emailService = new EmailService();
        await emailService.sendPasswordResetRequest(user.email, {
          userName: user.full_name,
          resetLink: resetLink,
          appName: appNameRaw,
          year: new Date().getFullYear()
        });
      } catch {}

      reply.status(200);
      return { success: true, message: 'Link reset password telah dikirim' };
    } catch (error) {
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  async confirmPasswordReset(request: any, reply: any) {
    try {
      const token = (request.body && (request.body as any).token) ? String((request.body as any).token).trim() : '';
      const newPassword = (request.body && (request.body as any).new_password) ? String((request.body as any).new_password) : '';
      if (!token) {
        reply.status(400);
        return { success: false, message: 'Token is required' };
      }
      if (!newPassword || newPassword.length < 8) {
        reply.status(400);
        return { success: false, message: 'Password minimal 8 karakter' };
      }

      const user = await prisma.user.findFirst({ where: { reset_token: token } });
      if (!user) {
        reply.status(404);
        return { success: false, message: 'Invalid token' };
      }
      if (!user.reset_token_expires || new Date(user.reset_token_expires).getTime() < Date.now()) {
        reply.status(400);
        return { success: false, message: 'Token kedaluwarsa' };
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({ where: { id: user.id }, data: { password: hashed, reset_token: null, reset_token_expires: null } });

      // SA-IS AUDIT LOG: Password Reset Success
      try {
        await prisma.activityLog.create({
          data: {
            tenant_id: user.tenant_id || 'system',
            user_id: user.id,
            action: 'PASSWORD_RESET_SUCCESS',
            entity: 'USER',
            entity_id: user.id,
            metadata: JSON.stringify({ 
              ip: request.ip,
              method: 'TOKEN_RESET'
            })
          }
        });
      } catch (logError) {
        console.error('Failed to create audit log:', logError);
      }

      // Send Success Notification Email
      try {
        const now = new Date();
        const fmtOptions: Intl.DateTimeFormatOptions = { 
          dateStyle: 'full', 
          timeStyle: 'short' 
        };

        const wib = now.toLocaleString('id-ID', { ...fmtOptions, timeZone: 'Asia/Jakarta' });
        const wita = now.toLocaleString('id-ID', { timeStyle: 'short', timeZone: 'Asia/Makassar' });
        const wit = now.toLocaleString('id-ID', { timeStyle: 'short', timeZone: 'Asia/Jayapura' });

        const dateTimeLabel = `${wib} WIB | ${wita} WITA | ${wit} WIT`;
        
        const emailService = new EmailService();
        await emailService.sendPasswordResetSuccessNotification(user.email, {
          userName: user.full_name,
          email: user.email,
          dateTime: dateTimeLabel,
          year: now.getFullYear()
        });
      } catch (emailError) {
        console.error('Failed to send password reset success email:', emailError);
        // Do not block response if email fails
      }

      reply.status(200);
      return { success: true, message: 'Password berhasil direset' };
    } catch (error) {
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  async registerTenant(request: any, reply: any) {
    try {
      const { tenant_name, tenant_domain, admin_full_name, admin_email, admin_password, admin_phone, billing_cycle_months } = request.body as RegisterTenantInput;

      if (!tenant_name || !tenant_domain || !admin_full_name || !admin_email || !admin_password || !admin_phone) {
        reply.status(400);
        return {
          success: false,
          message: 'Tenant name, tenant domain, admin full name, admin email, admin password, and admin phone are required',
        };
      }

      // Validate billing cycle if provided
      if (typeof billing_cycle_months !== 'undefined') {
        const allowed = [1, 3, 6, 12];
        if (!allowed.includes(Number(billing_cycle_months))) {
          reply.status(400);
          return {
            success: false,
            message: 'Invalid billing_cycle_months. Allowed values: 1, 3, 6, 12',
          };
        }
      }

      const result = await authService.registerTenant(request.body as RegisterTenantInput);

      reply.status(201);
      return {
        success: true,
        message: 'Tenant registered successfully',
        data: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      reply.status(400);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async login(request: any, reply: any) {
    let logDomain = '';
    try {
      const { email, password } = request.body as LoginInput;
      const headerHostRaw = request.headers['x-forwarded-host'] || request.headers['host'] || '';
      const hostNoPort = headerHostRaw ? String(headerHostRaw).toLowerCase().split(':')[0] : '';
      const tenantDomainHeaderRaw = request.headers['x-tenant-domain'] || request.headers['x-tenant-sub'] || '';
      logDomain = tenantDomainHeaderRaw ? String(tenantDomainHeaderRaw).toLowerCase().trim() : hostNoPort;
      
      // Validate required fields
      if (!email || !password) {
        reply.status(400);
        return {
          success: false,
          message: 'Email and password are required',
        };
      }

      const headerHostRawPre = request.headers['x-forwarded-host'] || request.headers['host'] || '';
      const hostNoPortPre = (headerHostRawPre ? String(headerHostRawPre).toLowerCase() : '').split(':')[0];
      const isLocalHostRequest = hostNoPortPre === 'localhost' || hostNoPortPre === '127.0.0.1';
      const isPrivateLanRequest = /^10\./.test(hostNoPortPre) || /^192\.168\./.test(hostNoPortPre) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostNoPortPre);
      const devAllowLocalLogin = (process.env.DEV_ALLOW_LOCALHOST_LOGIN || '').toLowerCase() === 'true';
      const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
      const allowLocalDevLogin = (isLocalHostRequest || isPrivateLanRequest) && (devAllowLocalLogin || !isProd);

      if (request.body && typeof (request.body as any).tenant_id !== 'undefined') {
        const tenantIdFromBody = String((request.body as any).tenant_id || '').trim();
        if (!allowLocalDevLogin) {
          const superUser = await prisma.user.findFirst({ where: { email, Role: { is: { name: 'SUPERADMIN' } } } });
          if (!superUser) {
            try {
            await logLoginFailedOnce('TENANT_ID_NOT_ALLOWED', email, logDomain);
            } catch {}
            reply.status(400);
            return {
              success: false,
              message: 'Invalid payload: tenant_id not allowed',
            };
          }
        } else {
          const tenantRecord = await prisma.tenant.findUnique({ where: { id: tenantIdFromBody } });
          if (!tenantRecord) {
            try {
              await logLoginFailedOnce('INVALID_TENANT_ID_DEV_LOCALHOST', email, logDomain);
            } catch {}
            reply.status(400);
            return { success: false, message: 'Invalid tenant_id in development localhost mode' };
          }
        }
      }

      // Resolve tenant strictly from domain/header
      let resolvedTenantId: string | null = null;
      let resolutionMethod: 'DOMAIN' | 'BODY' | 'EMAIL_FALLBACK' = 'DOMAIN';
      if (allowLocalDevLogin && !resolvedTenantId) {
        try {
          const devUser = await prisma.user.findFirst({
            where: { email },
            select: { tenant_id: true, Role: { select: { name: true } } }
          });
          if (devUser) {
            resolvedTenantId = devUser.Role?.name === 'SUPERADMIN' ? 'system' : String(devUser.tenant_id || '');
            resolutionMethod = 'EMAIL_FALLBACK';
          }
        } catch {}
      }
      {
        const tenantRecord = await authController.resolveTenantByHost(request.headers);
        if (tenantRecord) {
          resolvedTenantId = tenantRecord.id;
          logDomain = String(tenantRecord.domain || logDomain).toLowerCase();
        }
      }
      if (!resolvedTenantId) {
        if (allowLocalDevLogin) {
          const bodyTenantIdRaw = (request.body && (request.body as any).tenant_id) ? String((request.body as any).tenant_id).trim() : '';
          if (bodyTenantIdRaw) {
            const tenantRecord = await prisma.tenant.findUnique({ where: { id: bodyTenantIdRaw } });
            if (tenantRecord) {
              resolvedTenantId = tenantRecord.id;
              resolutionMethod = 'BODY';
            }
          }
        }
      }
        
      // Check if user is a system superadmin (Allow cross-domain access)
      // We capture the original resolved tenant ID (if any) for audit purposes
      let detectedTenantId = resolvedTenantId; 
      
      const superUser = await prisma.user.findFirst({ where: { email, Role: { is: { name: 'SUPERADMIN' } } } });
      if (superUser) {
        resolvedTenantId = 'system';
      }

      if (!resolvedTenantId) {
        // Smart Tenant Resolution by Email
        // If tenant is not resolved by domain/header/body, try to find user's tenant by email
        if (email) {
          try {
            const users = await prisma.user.findMany({
              where: { email },
              select: { tenant_id: true, Role: { select: { name: true } } }
            });
            
            if (users.length === 1) {
              const u = users[0];
              if (u.Role?.name === 'SUPERADMIN') {
                 resolvedTenantId = 'system';
              } else {
                 // Check if we need to redirect user to their tenant subdomain
                 if (u.tenant_id) {
                   const tenant = await prisma.tenant.findUnique({ where: { id: u.tenant_id } });
                   if (tenant && tenant.domain) {
                      let tenantLoginUrl = '';
                      // FIX: Gunakan helper getSmartParentAppUrl agar logika pembentukan URL konsisten dan tidak duplikat
                      tenantLoginUrl = `${getSmartParentAppUrl(tenant.domain, tenant.id)}/login`;

                      if (isProd && !allowLocalDevLogin) {
                        reply.status(403); // Forbidden on this domain, but with redirect info
                        return {
                          success: false,
                          error: 'REDIRECT_REQUIRED',
                          reason: 'REDIRECT_REQUIRED',
                          message: 'Silakan login melalui domain sekolah Anda.',
                          redirectUrl: tenantLoginUrl,
                          tenantName: tenant.name,
                          tenantDomain: tenant.domain
                        };
                      }
                   }
                 }
                 resolvedTenantId = u.tenant_id;
              }
              resolutionMethod = 'EMAIL_FALLBACK';
            } else if (users.length > 1) {
               // If multiple tenants found for same email, and one is SUPERADMIN, prefer system
               const superAdmin = users.find(u => u.Role?.name === 'SUPERADMIN');
               if (superAdmin) {
                 resolvedTenantId = 'system';
               } else {
                 reply.status(400);
                 return {
                   success: false,
                   error: 'AMBIGUOUS_TENANT',
                   reason: 'AMBIGUOUS_TENANT',
                   message: 'Email terdaftar di banyak tenant. Mohon login dari domain khusus atau sertakan tenant ID.'
                 };
               }
            }
          } catch (e) {}
        }

        if (!resolvedTenantId) {
          try {
            await logLoginFailedOnce('TENANT_DOMAIN_NOT_RECOGNIZED', email, logDomain);
          } catch {}
          reply.status(400);
          return {
            success: false,
            error: 'TENANT_NOT_RESOLVED',
            reason: 'TENANT_NOT_RESOLVED',
            message: 'Domain tidak terdaftar untuk tenant manapun. Silakan gunakan domain resmi institusi Anda.',
          };
        }
      }

      const loginInput: LoginInput = {
        email,
        password,
        tenant_id: (resolvedTenantId ?? '') as any,
      };

      const { user } = await authService.login(loginInput);

      // --- GUARD LOGIKA (MANDATORY SECURITY CHECKS) ---

      // SYARAT 1: Strict Verification (User ↔ Tenant)
      // Jika login menggunakan tenant_id dari BODY, kita wajib memastikan user benar-benar anggota tenant tersebut.
      // Meskipun authService.login sudah melakukan filter, kita tambahkan double-check eksplisit untuk kepatuhan (compliance).
      // Jika user bukan SUPERADMIN dan tenant_id user tidak sama dengan yang diminta -> 403 Forbidden.
      if (resolutionMethod === 'BODY' && user.role.name !== 'SUPERADMIN') {
        if (user.tenant_id !== resolvedTenantId) {
          try {
            await prisma.activityLog.create({
              data: {
                tenant_id: 'system', // Log ke system untuk audit keamanan
                user_id: user.id,
                action: 'LOGIN_BLOCKED_TENANT_MISMATCH',
                entity: 'USER',
                entity_id: user.id,
                metadata: JSON.stringify({ 
                  email: user.email, 
                  requested_tenant: resolvedTenantId,
                  actual_tenant: user.tenant_id,
                  resolution_method: resolutionMethod
                })
              }
            });
          } catch {}
          reply.status(403);
          return {
             success: false,
             error: 'FORBIDDEN',
             reason: 'TENANT_MISMATCH',
             message: 'Anda tidak memiliki akses ke tenant ini.'
          };
        }
      }

      // SYARAT 3: Audit Log WAJIB
      // Setiap login via tenant_id body atau email fallback HARUS tercatat dengan reason yang jelas.
      if (resolutionMethod !== 'DOMAIN' || (detectedTenantId && detectedTenantId !== resolvedTenantId)) {
         try {
           await prisma.activityLog.create({
             data: {
               tenant_id: user.role.name === 'SUPERADMIN' ? 'system' : user.tenant_id,
               user_id: user.id,
               action: 'LOGIN_WITH_RISK_FALLBACK',
               entity: 'USER',
               entity_id: user.id,
               metadata: JSON.stringify({
                 email: user.email,
                 domain: logDomain,
                 resolution_method: resolutionMethod,
                 resolved_tenant_id: resolvedTenantId,
                 detected_initial_tenant: detectedTenantId,
                 reason: resolutionMethod === 'EMAIL_FALLBACK' ? 'DOMAIN_UNKNOWN_EMAIL_UNIQUE' : 'TENANT_ID_IN_BODY'
               })
             }
           });
         } catch {}
      }
      // ------------------------------------------------

      if ((process.env.REQUIRE_EMAIL_VERIFICATION || '').toLowerCase() === 'true') {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (dbUser && !dbUser.email_verified) {
          try {
            await prisma.activityLog.create({
              data: {
                tenant_id: dbUser.tenant_id,
                user_id: user.id,
                action: 'LOGIN_BLOCKED_EMAIL_NOT_VERIFIED',
                entity: 'USER',
                entity_id: user.id,
                metadata: JSON.stringify({ email: user.email, domain: logDomain })
              }
            });
          } catch {}
          reply.status(403);
          return { success: false, message: 'Email belum diverifikasi' };
        }
      }

      // Generate JWT tokens
      const tokenPayload = {
        id: user.id,
        email: user.email,
        tenantId: user.tenant_id,
        roleId: user.role.id,
        roleName: user.role.name,
        // permissions: user.role.permissions, // EXCLUDED to reduce header size (prevents HTTP2 errors)
        exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
      };

      const refreshTokenPayload = {
        id: user.id,
        email: user.email,
        tenantId: user.tenant_id,
        roleId: user.role.id,
        roleName: user.role.name,
        // permissions: user.role.permissions, // EXCLUDED to reduce header size
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      };

      const token = await request.server.jwt.sign(tokenPayload);
      const refreshToken = await request.server.jwt.sign(refreshTokenPayload);

      try {
        const logTenantId = user.role.name === 'SUPERADMIN' ? 'system' : user.tenant_id;
        
        // Audit for SUPERADMIN Cross-Domain Login
        // If SUPERADMIN logs in from a domain that resolves to a specific tenant (not system/unknown), log it.
        // resolvedTenantId was forced to 'system' above, so we check detectedTenantId.
        if (user.role.name === 'SUPERADMIN' && detectedTenantId && detectedTenantId !== 'system') {
           await prisma.activityLog.create({
            data: {
              tenant_id: 'system',
              user_id: user.id,
              action: 'SUPERADMIN_LOGIN_CROSS_DOMAIN',
              entity: 'USER',
              entity_id: user.id,
              metadata: JSON.stringify({ 
                superadmin_user_id: user.id,
                accessed_domain: logDomain,
                resolved_tenant_id: detectedTenantId,
                request_ip: request.ip
              })
            }
          });
        }

        activityLogService.logEvent({
          event_type: 'USER_LOGIN',
          tenant_id: logTenantId,
          user_id: user.id,
          entity: 'USER',
          entity_id: user.id,
          metadata: { email: user.email, domain: logDomain },
        });
      } catch {}

      reply.status(200);
      return {
        success: true,
        message: 'Login successful',
        data: {
          user,
          token,
          refreshToken,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      const rawHostCatch = request.headers['x-forwarded-host'] || request.headers['host'] || '';
      const loginDomainCatch = rawHostCatch ? String(rawHostCatch).toLowerCase().split(':')[0] : '';
      const tenantHeaderCatch = request.headers['x-tenant-domain'] || request.headers['x-tenant-sub'] || '';
      const domainForLog = (typeof logDomain === 'string' && logDomain) ? logDomain : (tenantHeaderCatch ? String(tenantHeaderCatch).toLowerCase().trim() : loginDomainCatch);
      const emailCatch = (request.body && (request.body as any).email) ? String((request.body as any).email) : '';
      
      if (errorMessage === 'Invalid credentials') {
        try { await logLoginFailedOnce('INVALID_CREDENTIALS', emailCatch, domainForLog); } catch {}
        reply.status(401);
        return {
          success: false,
          error: 'LOGIN_FAILED',
          reason: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        };
      }

      if (errorMessage === 'Tenant is suspended') {
        reply.status(403);
        return {
          success: false,
          message: 'Tenant is suspended',
        };
      }

      try {
        await prisma.activityLog.create({
          data: {
            tenant_id: 'system',
            action: 'LOGIN_ERROR',
            entity: 'USER',
            metadata: JSON.stringify({ message: errorMessage, email: emailCatch, domain: domainForLog })
          }
        });
      } catch {}
      reply.status(500);
      return {
        success: false,
        message: 'Internal server error',
      };
    }
  },

  async logout(request: any, reply: any) {
    try {
      const rawHost = request.headers['x-forwarded-host'] || request.headers['host'] || '';
      const headerDomain = rawHost ? String(rawHost).toLowerCase().split(':')[0] : '';
      const user = request.user;
      let domain = headerDomain;
      try {
        if (user?.tenant_id) {
          const t = await prisma.tenant.findUnique({ where: { id: user.tenant_id } });
          if (t?.domain) domain = String(t.domain).toLowerCase();
        }
      } catch {}
      const logTenantId = (user?.roleName === 'SUPERADMIN' && (!user?.tenant_id || user?.tenant_id === 'system')) ? 'system' : (user?.tenant_id || 'system');
      try {
        activityLogService.logEvent({
          event_type: 'USER_LOGOUT',
          tenant_id: logTenantId,
          user_id: user?.id ?? null,
          entity: 'USER',
          entity_id: user?.id ?? null,
          metadata: { email: user?.email, domain },
        });
      } catch {}
      reply.status(200);
      return { success: true, message: 'Logout successful' };
    } catch (error) {
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  async refresh(request: any, reply: any) {
    try {
      const { refreshToken } = request.body;

      if (!refreshToken) {
        reply.status(400);
        return {
          success: false,
          error: 'BAD_REQUEST',
          reason: 'REFRESH_TOKEN_REQUIRED',
          message: 'Refresh token is required',
        };
      }

      // Verify the refresh token
      const decoded = await request.server.jwt.verify(refreshToken) as any;

      // Generate new access token
      const newToken = await request.server.jwt.sign({
        id: decoded.id,
        email: decoded.email,
        tenantId: decoded.tenantId,
        roleId: decoded.roleId,
        roleName: decoded.roleName,
        permissions: decoded.permissions, // Include permissions in refreshed token
      });

      reply.status(200);
      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
        },
      };
    } catch (error) {
      reply.status(401);
      return {
        success: false,
        error: 'UNAUTHORIZED',
        reason: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid refresh token',
      };
    }
  },

  async me(request: any, reply: any) {
    try {
      // User data is available from auth middleware
      if (!request.user) {
        reply.status(401);
        return {
          success: false,
          message: 'Unauthorized',
        };
      }

      // Get fresh user data from database
      const user = await authService.getUserById(request.user.id, request.user.tenantId || undefined);

      if (!user) {
        reply.status(404);
        return {
          success: false,
          message: 'User not found',
        };
      }

      reply.status(200);
      return {
        success: true,
        message: 'User profile retrieved successfully',
        data: user,
      };
    } catch (error) {
      reply.status(500);
      return {
        success: false,
        message: 'Internal server error',
      };
    }
  },

  async tenantInfo(request: any, reply: any) {
    try {
      const tenantRecord = await authController.resolveTenantByHost(request.headers);
      if (!tenantRecord) {
        reply.status(404);
        return { success: false, message: 'Tenant not found' };
      }
      reply.status(200);
      return {
        success: true,
        message: 'OK',
        data: {
          id: tenantRecord.id,
          name: tenantRecord.name,
          domain: tenantRecord.domain,
          logo_url: tenantRecord.logo_url,
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
      const existing = await prisma.tenant.findFirst({
        where: {
          OR: [
            { domain },
            { domain: sub }
          ]
        }
      });
      const available = existing ? false : true;
      reply.status(200);
      return {
        success: true,
        message: available ? 'Domain tersedia' : 'Domain sudah digunakan',
        data: {
          domain,
          subdomain: sub,
          available
        }
      };
    } catch (err) {
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  async impersonate(request: any, reply: any) {
    try {
      const { tenantId } = request.body || {};
      if (!tenantId) {
        reply.status(400);
        return { success: false, message: 'ID Tenant target wajib dikirim' };
      }

      // 1. Dapatkan tenant target
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, domain: true, status: true, absensi_mode: true }
      });
      if (!tenant) {
        reply.status(404);
        return { success: false, message: 'Tenant target tidak ditemukan' };
      }

      const status = tenant.status ? String(tenant.status).toUpperCase() : undefined;
      if (status === 'SUSPENDED' || status === 'DELETED') {
        reply.status(400);
        return { success: false, message: 'Tidak dapat masuk ke tenant yang ditangguhkan atau dihapus' };
      }

      // 2. Dapatkan user ADMIN sekolah target
      const adminRole = await prisma.role.findFirst({
        where: { name: 'ADMIN' }
      });
      if (!adminRole) {
        reply.status(500);
        return { success: false, message: 'Peran ADMIN sekolah tidak terkonfigurasi di database' };
      }

      const targetAdminUser = await prisma.user.findFirst({
        where: {
          tenant_id: tenantId,
          role_id: adminRole.id
        },
        include: {
          Role: {
            include: {
              rolePermissions: {
                include: { Permission: true }
              }
            }
          }
        }
      });

      if (!targetAdminUser) {
        reply.status(404);
        return { success: false, message: 'Tidak ada administrator terdaftar untuk tenant sekolah ini' };
      }

      // 3. Bentuk Payload User Response atas nama Admin sekolah target
      const userResponse: UserResponse = {
        id: targetAdminUser.id,
        email: targetAdminUser.email,
        full_name: targetAdminUser.full_name,
        role: {
          id: targetAdminUser.Role.id,
          name: targetAdminUser.Role.name,
          permissions: targetAdminUser.Role.rolePermissions?.map(rp => rp.Permission.id) ?? [],
        },
        tenant_id: targetAdminUser.tenant_id,
        has_completed_onboarding: targetAdminUser.has_completed_onboarding,
        created_at: targetAdminUser.created_at,
        updated_at: targetAdminUser.updated_at,
        tenant: null as any
      };

      const resolvedMode = await getEffectiveAbsensiMode(tenantId);

      userResponse.tenant = {
        id: tenant.id,
        name: tenant.name,
        absensi_mode: resolvedMode as any,
      };

      // Tempelkan kapabilitas dan posisi organisasi
      const orgCtx = await organizationalAuthorizationEngine.resolveOrganizationalContext(targetAdminUser.id);
      userResponse.capabilities = await authorizationService.resolveUserCapabilities(targetAdminUser.id, { user: targetAdminUser });
      userResponse.position_codes = orgCtx.positions.map(p => p.code);
      
      const features = await getTenantCapabilities(tenant.id);
      userResponse.features = features;

      // 4. Generate JWT tokens
      const tokenPayload = {
        id: targetAdminUser.id,
        email: targetAdminUser.email,
        tenantId: targetAdminUser.tenant_id,
        roleId: targetAdminUser.Role.id,
        roleName: targetAdminUser.Role.name,
        exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 menit
      };

      const refreshTokenPayload = {
        id: targetAdminUser.id,
        email: targetAdminUser.email,
        tenantId: targetAdminUser.tenant_id,
        roleId: targetAdminUser.Role.id,
        roleName: targetAdminUser.Role.name,
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 hari
      };

      const token = await request.server.jwt.sign(tokenPayload);
      const refreshToken = await request.server.jwt.sign(refreshTokenPayload);

      // 5. Catat Log Audit Impersonasi
      try {
        const supportUser = request.user;
        await prisma.activityLog.create({
          data: {
            tenant_id: 'system',
            user_id: supportUser?.id || null,
            action: 'SUPPORT_IMPERSONATION_STARTED',
            entity: 'TENANT',
            entity_id: tenantId,
            metadata: JSON.stringify({
              support_user_id: supportUser?.id,
              support_email: supportUser?.email,
              impersonated_user_id: targetAdminUser.id,
              impersonated_email: targetAdminUser.email,
              tenant_name: tenant.name,
              request_ip: request.ip
            })
          }
        });
      } catch (err) {
        console.error('Failed to log impersonation activity:', err);
      }

      reply.status(200);
      return {
        success: true,
        message: 'Impersonation successful',
        data: {
          user: userResponse,
          token,
          refreshToken,
        }
      };
    } catch (error: any) {
      console.error('Error in impersonation controller:', error);
      reply.status(500);
      return { success: false, message: error.message || 'Internal server error' };
    }
  }
};
async function logLoginFailedOnce(reason: string, email: string, domain: string, tenantId?: string) {
  try {
    const tid = tenantId || (await prisma.tenant.findFirst({ where: { domain } }))?.id || 'system';
    const since = new Date(Date.now() - 5000);
    const signature = JSON.stringify({ reason, email, domain });
    const existing = await prisma.activityLog.findFirst({
      where: {
        tenant_id: tid,
        action: 'LOGIN_FAILED',
        entity: 'USER',
        metadata: { contains: signature },
        created_at: { gte: since }
      },
      orderBy: { created_at: 'desc' }
    });
    if (!existing) {
      await prisma.activityLog.create({
        data: {
          tenant_id: tid,
          action: 'LOGIN_FAILED',
          entity: 'USER',
          metadata: signature
        }
      });
    }
  } catch {}
}

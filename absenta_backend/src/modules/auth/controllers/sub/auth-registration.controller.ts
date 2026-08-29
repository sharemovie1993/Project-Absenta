// auth-registration.controller.ts — Registration and Password Reset Handler
import { authService } from '../../services/auth.service';
import { authDb as prisma } from '../../services/repositories/auth.db';
import { RegisterInput, RegisterTenantInput } from '../../types/auth.types';
import { organizationalContextCache } from '../../services/organizational-context-cache';
import { VALID_ROLES } from '@/constants/enums';
import { EmailService } from '@/modules/notification/services/email.service';
import { WhatsAppService } from '@/modules/notification/services/whatsapp.service';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { getSmartFrontendBaseUrl, getSmartParentAppUrl } from '@/utils/url-helper';
import { BCRYPT_ROUNDS, MIN_PASSWORD_LENGTH, getJwtSecret } from '../../utils/auth-security.util';
import { refreshTokenService } from '../../services/refresh-token.service';
export { getJwtSecret };

export const authRegistrationController = {
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
          const tenantBaseUrl = tenant ? getSmartParentAppUrl(tenant, tenant.id) : null;
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
          const tenantBaseUrl = tenant ? getSmartParentAppUrl(tenant, tenant.id) : null;
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
        const tenantBaseUrl = tenant ? getSmartParentAppUrl(tenant, tenant.id) : null;
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
          const tenantBaseUrl = tenant ? getSmartParentAppUrl(tenant, tenant.id) : null;
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
          const tenantBaseUrl = tenant ? getSmartParentAppUrl(tenant, tenant.id) : null;
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
      const tenantBaseUrl = tenant ? getSmartParentAppUrl(tenant, tenant.id) : null;
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
      if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
        reply.status(400);
        return { success: false, message: `Password minimal ${MIN_PASSWORD_LENGTH} karakter` };
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

      const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await prisma.user.update({ where: { id: user.id }, data: { password: hashed, reset_token: null, reset_token_expires: null } });

      // ✅ Security Fix: Invalidasi cache + Revoke SEMUA refresh token aktif user saat reset password
      try { await organizationalContextCache.invalidateUser(String(user.id)); } catch {}
      try { await refreshTokenService.revokeAllByUserId(String(user.id)); } catch {}

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
  }
};

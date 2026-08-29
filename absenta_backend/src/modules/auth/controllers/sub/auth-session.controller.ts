// auth-session.controller.ts — Auth Session Handler (Login, Logout, Refresh, Me, Impersonate, ChangePassword)
import { authService } from '../../services/auth.service';
import { authDb as prisma } from '../../services/repositories/auth.db';
import { LoginInput, UserResponse } from '../../types/auth.types';
import { authorizationService } from '../../services/authorization.service';
import { organizationalAuthorizationEngine } from '../../services/organizational-authorization.engine';
import { organizationalContextCache } from '../../services/organizational-context-cache';
import { getTenantCapabilities } from '@/utils/tenant-capabilities';
import { getEffectiveAbsensiMode } from '@/utils/attendanceModeHelper';
import { activityLogService } from '@/modules/activity/services/activity-log.service';
import bcrypt from 'bcryptjs';
import { getSmartParentAppUrl } from '@/utils/url-helper';
import * as jwt from 'jsonwebtoken';

/** 
 * ✅ Satu sumber kebenaran JWT secret. 
 * Fail-fast: throw jika JWT_SECRET tidak di-set atau terlalu pendek (< 32 char).
 */
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    // Di dev/test boleh pakai fallback, di production wajib ada
    if (String(process.env.NODE_ENV).toLowerCase() === 'production') {
      throw new Error('[SECURITY] JWT_SECRET wajib diisi dan minimal 32 karakter di environment production!');
    }
    return 'absenta-dev-secret-key-32-chars!!';
  }
  return secret;
};

/** Konstanta kebijakan password minimum (digunakan di register, registerTenant, changePassword) */
export const MIN_PASSWORD_LENGTH = 8;

import { authTenantController } from './auth-tenant.controller';
import { refreshTokenService } from '../../services/refresh-token.service';

export const authSessionController = {
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

      // Resolve tenant strictly from body / domain / header
      let resolvedTenantId: string | null = null;
      let resolutionMethod: 'DOMAIN' | 'BODY' | 'EMAIL_FALLBACK' = 'DOMAIN';

      // 1. Priority 1 (Dev / Localhost / Explicit Body Selection): Check body.tenant_id first
      if (allowLocalDevLogin) {
        const bodyTenantIdRaw = (request.body && (request.body as any).tenant_id) ? String((request.body as any).tenant_id).trim() : '';
        if (bodyTenantIdRaw) {
          const tenantRecord = await prisma.tenant.findUnique({ where: { id: bodyTenantIdRaw } });
          if (tenantRecord) {
            resolvedTenantId = tenantRecord.id;
            resolutionMethod = 'BODY';
            logDomain = String(tenantRecord.custom_domain || tenantRecord.subdomain || logDomain).toLowerCase();
          }
        }
      }

      // 2. Priority 2: Host header / domain resolution
      if (!resolvedTenantId) {
        const tenantRecord = await authTenantController.resolveTenantByHost(request.headers);
        if (tenantRecord) {
          resolvedTenantId = tenantRecord.id;
          logDomain = String(tenantRecord.custom_domain || tenantRecord.subdomain || logDomain).toLowerCase();
        }
      }

      // 3. Priority 3: Email fallback in dev/local mode if still unresolved
      if (allowLocalDevLogin && !resolvedTenantId) {
        try {
          let resolvedEmailForDev = email;
          if (email && !email.includes('@')) {
            const siswa = await prisma.siswa.findFirst({
              where: {
                OR: [
                  { nisn: email },
                  { nis: email }
                ]
              },
              select: { User: { select: { email: true } } }
            });
            if (siswa && siswa.User?.email) {
              resolvedEmailForDev = siswa.User.email;
            }
          }
          // Exclude system tenant for regular demo users
          const devUser = await prisma.user.findFirst({
            where: { email: resolvedEmailForDev, tenant_id: { not: 'system' } },
            select: { tenant_id: true, Role: { select: { name: true } } }
          }) || await prisma.user.findFirst({
            where: { email: resolvedEmailForDev },
            select: { tenant_id: true, Role: { select: { name: true } } }
          });
          if (devUser) {
            resolvedTenantId = devUser.Role?.name === 'SUPERADMIN' ? 'system' : String(devUser.tenant_id || '');
            resolutionMethod = 'EMAIL_FALLBACK';
          }
        } catch {}
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
                   if (tenant) {
                      let tenantLoginUrl = '';
                      // FIX: Gunakan helper getSmartParentAppUrl agar logika pembentukan URL konsisten dan tidak duplikat
                      tenantLoginUrl = `${getSmartParentAppUrl(tenant, tenant.id)}/login`;

                      if (isProd && !allowLocalDevLogin) {
                        reply.status(403); // Forbidden on this domain, but with redirect info
                        return {
                          success: false,
                          error: 'REDIRECT_REQUIRED',
                          reason: 'REDIRECT_REQUIRED',
                          message: 'Silakan login melalui domain sekolah Anda.',
                          redirectUrl: tenantLoginUrl,
                          tenantName: tenant.name,
                          tenantDomain: tenant.subdomain
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

      // Generate JWT access token (short-lived: 15 menit)
      const tokenPayload = {
        id: user.id,
        email: user.email,
        tenantId: user.tenant_id,
        roleId: user.role.id,
        roleName: user.role.name,
        exp: Math.floor(Date.now() / 1000) + (15 * 60),
      };
      const token = jwt.sign(tokenPayload, getJwtSecret());

      // ✅ C1 Fix: Refresh token disimpan di DB (hash), bukan JWT — mendukung revokasi
      const deviceHint = String(request.headers['user-agent'] || '').slice(0, 120);
      const refreshToken = await refreshTokenService.createRefreshToken(
        user.id,
        user.tenant_id || 'system',
        deviceHint
      );

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
          if (t) domain = String(t.custom_domain || t.subdomain || '').toLowerCase();
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
      // ✅ Invalidasi cache posisi jabatan
      try { if (user?.id) await organizationalContextCache.invalidateUser(String(user.id)); } catch {}
      // ✅ C1 Fix: Revoke refresh token dari DB (revoke token spesifik jika ada, fallback all)
      try {
        const { refreshToken: rawRefreshToken } = (request.body as any) || {};
        if (rawRefreshToken) {
          await refreshTokenService.revokeByRawToken(String(rawRefreshToken));
        } else if (user?.id) {
          await refreshTokenService.revokeAllByUserId(String(user.id));
        }
      } catch {}
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
        return { success: false, error: 'BAD_REQUEST', reason: 'REFRESH_TOKEN_REQUIRED', message: 'Refresh token is required' };
      }

      // ✅ C1 Fix: Verifikasi refresh token via DB (bukan jwt.verify) — mendukung revokasi
      const verified = await refreshTokenService.verifyRefreshToken(String(refreshToken));
      if (!verified) {
        reply.status(401);
        return { success: false, error: 'UNAUTHORIZED', reason: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token' };
      }

      // Ambil data user terbaru dari DB untuk payload token baru
      const dbUser = await prisma.user.findUnique({
        where: { id: verified.userId },
        include: { Role: { include: { rolePermissions: { include: { Permission: true } } } } }
      });
      if (!dbUser || dbUser.status === 'INACTIVE') {
        await refreshTokenService.revokeAllByUserId(verified.userId); // Revoke semua token jika user nonaktif
        reply.status(401);
        return { success: false, error: 'UNAUTHORIZED', reason: 'USER_INACTIVE', message: 'Akun tidak aktif' };
      }

      // Generate access token baru
      const newToken = jwt.sign({
        id: dbUser.id,
        email: dbUser.email,
        tenantId: dbUser.tenant_id,
        roleId: dbUser.role_id,
        roleName: dbUser.Role?.name,
        exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 menit
      }, getJwtSecret());

      reply.status(200);
      return {
        success: true,
        message: 'Token refreshed successfully',
        data: { token: newToken },
      };
    } catch (error) {
      reply.status(401);
      return { success: false, error: 'UNAUTHORIZED', reason: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token' };
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
        select: { id: true, name: true, subdomain: true, custom_domain: true, status: true, absensi_mode: true }
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
      // ✅ H4 Fix: Invalidasi cache target user agar position_codes selalu fresh dari DB
      try { await organizationalContextCache.invalidateUser(targetAdminUser.id); } catch {}
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

      const token = jwt.sign(tokenPayload, getJwtSecret());
      const refreshToken = jwt.sign(refreshTokenPayload, getJwtSecret());

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

      return reply.status(200).send({
        success: true,
        message: 'Impersonation successful',
        data: {
          user: userResponse,
          token,
          refreshToken,
        }
      });
    } catch (error: any) {
      console.error('Error in impersonation controller:', error);
      return reply.status(500).send({ success: false, message: error.message || 'Internal server error' });
    }
  },
async changePassword(request: any, reply: any) {
    try {
      const userPayload = request.user;
      if (!userPayload || !userPayload.id) {
        return reply.status(401).send({ success: false, message: 'Tidak terotentikasi' });
      }

      const { current_password, new_password } = request.body || {};
      if (!current_password || !new_password) {
        return reply.status(400).send({ success: false, message: 'Password lama dan password baru wajib diisi' });
      }

      // ✅ H3 Fix: Gunakan MIN_PASSWORD_LENGTH terpusat (8 karakter)
      if (String(new_password).length < MIN_PASSWORD_LENGTH) {
        return reply.status(400).send({ success: false, message: `Password baru minimal ${MIN_PASSWORD_LENGTH} karakter` });
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: userPayload.id }
      });

      if (!dbUser || !dbUser.password) {
        return reply.status(404).send({ success: false, message: 'Pengguna tidak ditemukan' });
      }

      const isMatch = await bcrypt.compare(current_password, dbUser.password);
      if (!isMatch) {
        return reply.status(400).send({ success: false, message: 'Password lama yang Anda masukkan salah' });
      }

      // ✅ H2 Fix: gunakan bcrypt rounds 12 (konsisten)
      const hashedPassword = await bcrypt.hash(new_password, 12);
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { password: hashedPassword }
      });

      // ✅ H2+C1 Fix: Invalidasi cache + Revoke SEMUA refresh token aktif user
      // agar jika akun diambil alih dan password diganti, semua sesi attacker langsung tidak valid
      try { await organizationalContextCache.invalidateUser(String(dbUser.id)); } catch {}
      try { await refreshTokenService.revokeAllByUserId(String(dbUser.id)); } catch {}

      return reply.status(200).send({
        success: true,
        message: 'Password berhasil diperbarui! Semua sesi lain telah diakhiri.'
      });
    } catch (error: any) {
      // ✅ M6 Fix: Jangan expose error.message internal ke client
      console.error('Error in changePassword controller:', error);
      return reply.status(500).send({ success: false, message: 'Gagal memperbarui password. Silakan coba lagi.' });
    }
  }
};
async function logLoginFailedOnce(reason: string, email: string, domain: string, tenantId?: string) {
  try {
    const tid = tenantId || (await prisma.tenant.findFirst({ where: { subdomain: domain } }))?.id || 'system';
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

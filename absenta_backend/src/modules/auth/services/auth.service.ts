import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/utils/prisma';
import { getSmartApiBaseUrl, getSmartParentAppUrl, getSmartFrontendBaseUrl } from '@/utils/url-helper';
import { randomUUID } from 'crypto';
import { DEFAULT_STRUKTUR_ORGANISASI } from '@/config/organization-structure';
import { SekolahService } from '@/modules/sekolah/services/sekolah.service';
import { getTenantCapabilities } from '@/utils/tenant-capabilities';
import { getEffectiveAbsensiMode } from '@/utils/attendanceModeHelper';
import { RegisterInput, LoginInput, RegisterTenantInput, UserResponse } from '../types/auth.types';
import { emitDomainEvent } from '@/infra/event-bus';
import { authorizationService } from './authorization.service';
import { organizationalAuthorizationEngine } from './organizational-authorization.engine';
import { checkSlugAvailability, checkLicenseStatus, updateLicenseInfo, sendRegistrationWa } from '@/services/licenseClient';

export interface QuickLoginResult {
  success: boolean;
  message?: string;
  loginUrl?: string;
  name: string;
  email?: string;
}

export class AuthService {
  /**
   * SHARED DOMAIN SERVICE METHOD:
   * Menghasilkan Quick Login Token (JWT) & URL Akses Langsung tanpa password.
   * Dipakai bersama oleh Web/App Controller & WA Chatbot Handler.
   */
  async generateQuickLoginUrl(userId: string | undefined, name: string): Promise<QuickLoginResult> {
    if (!userId) {
      return {
        success: false,
        name,
        message: 'Data profil WhatsApp Anda belum terhubung dengan akun pengguna aplikasi web.',
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        Role: { select: { id: true, name: true } },
        Tenant: { select: { id: true, subdomain: true, custom_domain: true } },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return {
        success: false,
        name,
        email: user?.email,
        message: `Akun pengguna web (${user?.email || 'User'}) dalam status non-aktif.`,
      };
    }

    const secret = process.env.JWT_SECRET || 'absenta-secret-key';
    const payload = {
      id: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      roleId: user.Role?.id || '',
      roleName: user.Role?.name || 'USER',
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // Berlaku 24 jam
    };

    const token = jwt.sign(payload, secret);

    let baseUrl = getSmartParentAppUrl(user.Tenant, user.tenant_id);
    if (!baseUrl || baseUrl.includes('localhost:5173')) {
      baseUrl = getSmartFrontendBaseUrl();
    }
    baseUrl = baseUrl.replace(/\/+$/, '');

    const loginUrl = `${baseUrl}/login?quick_login_token=${token}`;

    return {
      success: true,
      name,
      email: user.email,
      loginUrl,
    };
  }
  async register(input: RegisterInput): Promise<UserResponse> {
    const { email, password, full_name, role, tenant_id } = input;

    // Find the role by name
    const roleRecord = await prisma.role.findFirst({
      where: { name: role },
    });

    if (!roleRecord) {
      throw new Error('Invalid role');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        tenant_id,
      },
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        full_name,
        role_id: roleRecord.id,
        tenant_id,
        email_verified: false,
      },
      include: {
        Role: {
            include: {
                rolePermissions: {
                    include: { Permission: true }
                }
            }
        },
      },
    });

    const verificationToken = randomUUID();
    await prisma.user.update({
      where: { id: user.id },
      data: { verification_token: verificationToken }
    });

    // Return user without password
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: {
        id: user.Role.id,
        name: user.Role.name,
        permissions: user.Role.rolePermissions?.map(rp => rp.Permission.id) ?? [],
      },
      tenant_id: user.tenant_id,
      has_completed_onboarding: false,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  async login(input: LoginInput): Promise<{ user: UserResponse; needsToken: boolean }> {
    const { email, password, tenant_id } = input;

    // Log login attempt (safe)
    console.info(`[AUTH] Login Attempt | Input: ${email} | Tenant: ${tenant_id}`);

    // Resolve NISN/NIS to Email or NIP to Email if the input does not look like an email address
    let targetEmail = email;
    if (email && !email.includes('@')) {
      const siswa = await prisma.siswa.findFirst({
        where: {
          nisn: email,
          tenant_id,
        },
        include: { User: true }
      });
      if (siswa && siswa.User?.email) {
        targetEmail = siswa.User.email;
        console.info(`[AUTH] Resolved NISN ${email} to Email: ${targetEmail}`);
      } else {
        const siswaByNis = await prisma.siswa.findFirst({
          where: {
            nis: email,
            tenant_id,
          },
          include: { User: true }
        });
        if (siswaByNis && siswaByNis.User?.email) {
          targetEmail = siswaByNis.User.email;
          console.info(`[AUTH] Resolved NIS ${email} to Email: ${targetEmail}`);
        } else {
          // Try to resolve Guru/Staf NIP to Email
          const guru = await prisma.guru.findFirst({
            where: {
              nip: email,
              tenant_id,
            },
            include: { User: true }
          });
          if (guru && guru.User?.email) {
            targetEmail = guru.User.email;
            console.info(`[AUTH] Resolved NIP ${email} to Email: ${targetEmail}`);
          }
        }
      }
    }

    // First, check if there is a SUPERADMIN user with this email (role-based, not by email substring)
    let user = await prisma.user.findFirst({
      where: {
        email: targetEmail,
        Role: { is: { name: 'SUPERADMIN' } }
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

    if (user) {
      // SUPERADMIN identified
    } else {
      // For regular users, enforce tenant membership by using tenant_id resolved from domain
      const regularUser = await prisma.user.findFirst({
        where: {
          email: targetEmail,
          tenant_id,
        },
        include: { 
            Role: {
                include: {
                    rolePermissions: {
                        include: { Permission: true }
                    }
                }
            },
            Tenant: {
              select: { status: true }
            }
        },
      });

      // Tenant Kill Switch Policy: Reject login if Tenant is SUSPENDED or DELETED
      if (regularUser?.Tenant) {
        const status = regularUser.Tenant.status;
        if (status === 'SUSPENDED' || status === 'DELETED') {
          console.warn(`[AUTH] Login Rejected | Tenant ${status} | Email: ${targetEmail} | Tenant: ${tenant_id}`);
          throw new Error('Tenant is suspended');
        }
      }

      user = regularUser;
    }

    if (!user) {
      const anyUser = await prisma.user.findFirst({ where: { email: targetEmail }, include: { Role: true } });
      if (anyUser && anyUser.Role?.name !== 'SUPERADMIN' && anyUser.tenant_id && anyUser.tenant_id !== tenant_id) {
        console.warn(`[AUTH] Login Tenant Mismatch | Email: ${targetEmail} | ReqTenant: ${tenant_id} | ActualTenant: ${anyUser.tenant_id}`);
      }
      console.warn(`[AUTH] User Not Found | Email: ${targetEmail}`);
      throw new Error('Invalid credentials');
    }

    if (user.status === 'INACTIVE') {
      console.warn(`[AUTH] Login Rejected | User Inactive | Email: ${targetEmail}`);
      throw new Error('Akun Anda dinonaktifkan. Silakan hubungi admin sekolah.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.warn(`[AUTH] Invalid Password | Email: ${targetEmail}`);
      throw new Error('Invalid credentials');
    }

    // Update last_login timestamp on successful login
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { last_login: new Date() }
      });
    } catch (err) {
      console.error('[AUTH] Failed to update last_login:', err);
    }

    console.info(`[AUTH] Login Success | User: ${user.id} | Role: ${user.Role.name}`);

    // Return user without password
    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: {
        id: user.Role.id,
        name: user.Role.name,
        permissions: user.Role.rolePermissions?.map(rp => rp.Permission.id) ?? [],
      },
      tenant_id: user.Role.name === 'SUPERADMIN' ? null as any : user.tenant_id,
      has_completed_onboarding: user.has_completed_onboarding,
      created_at: user.created_at,
      updated_at: user.updated_at,
      tenant: null,
    };

    // Attach capabilities using shared logic
    await this.attachCapabilities(user, userResponse);

    // Attach tenant info including absensi_mode for non-system SUPERADMIN
    try {
      const effectiveTenantId = userResponse.tenant_id;
      if (effectiveTenantId && effectiveTenantId !== 'system') {
        const t = await prisma.tenant.findUnique({
          where: { id: effectiveTenantId },
          select: { id: true, name: true, subdomain: true, custom_domain: true },
        });
        if (t) {
          const resolvedMode = await getEffectiveAbsensiMode(effectiveTenantId);

          userResponse.tenant = {
            id: t.id,
            name: t.name,
            domain: t.subdomain ?? undefined,
            subdomain: t.subdomain ?? undefined,
            custom_domain: t.custom_domain ?? undefined,
            absensi_mode: resolvedMode,
          };
          // Attach Tenant Features (Capability Switch)
          const features = await getTenantCapabilities(t.id);
          userResponse.features = features;
        }
      }
    } catch {}

    return { user: userResponse, needsToken: true };
  }

  async registerTenant(input: RegisterTenantInput) {
    const { tenant_name, tenant_domain, npsn, admin_full_name, admin_email, admin_password, admin_phone, plan_id, alamat, billing_cycle_months, custom_price, sim_model, sim_students, sim_desc, academic_tier, absensi_mode } = input;
    let aggregatedBillingId: string | null = null;

    const normalizedNpsn = String(npsn ?? '').trim().replace(/\D/g, '');

    if (!normalizedNpsn || !/^\d{8}$/.test(normalizedNpsn)) {
      throw new Error('NPSN wajib diisi dengan 8 digit angka');
    }

    let masterSekolah: any = null;

    // 1. Check if tenant or admin email already exists
    const basesRaw = (process.env.CORS_WILDCARD_BASES || '').toLowerCase();
    const baseDomains = basesRaw.split(',').map(s => s.trim()).filter(Boolean);
    const rawDomain = String(tenant_domain || '').toLowerCase().trim();
    
    // Hardening: Validate subdomain format
    const subdomainRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
    if (!subdomainRegex.test(rawDomain)) {
        throw new Error('Subdomain hanya boleh berisi huruf kecil, angka, dan tanda hubung (-), serta tidak boleh diawali/diakhiri tanda hubung.');
    }

    // Hardening: Reserved subdomains
    const reservedSubdomains = ['www', 'api', 'admin', 'mail', 'smtp', 'pop', 'imap', 'test', 'dev', 'stage', 'prod', 'support', 'help', 'blog', 'status', 'app', 'dashboard', 'auth', 'login', 'register', 'signin', 'signup'];
    if (reservedSubdomains.includes(rawDomain)) {
        throw new Error('Subdomain ini tidak tersedia (reserved). Silakan pilih yang lain.');
    }

    // 1. Check NPSN first (Most specific identifier)
    if (normalizedNpsn) {
      const existingSekolah = await prisma.sekolah.findFirst({
        where: { npsn: normalizedNpsn },
        select: { id: true },
      });
      if (existingSekolah) {
        throw new Error(`NPSN ${normalizedNpsn} sudah terdaftar di sistem.`);
      }
    }

    const hasDot = rawDomain.includes('.');
    const subLabel = hasDot ? rawDomain.split('.')[0] : rawDomain;
    const candidates: string[] = [rawDomain];
    if (!hasDot) {
      for (const b of baseDomains) {
        candidates.push(`${subLabel}.${b}`);
      }
    } else {
      candidates.push(subLabel);
    }

    // 2. Check Subdomain Availability
    const existingDomain = await prisma.tenant.findFirst({
      where: {
        OR: [
          { subdomain: { in: candidates } },
          { custom_domain: { in: candidates } }
        ]
      }
    });
    if (existingDomain) {
      throw new Error(`Subdomain '${subLabel}' sudah digunakan. Silakan pilih yang lain.`);
    }

    // 2b. Check Subdomain Availability Globally on the central License Server
    let shouldCheckGlobally = true;
    const isSingleTenant = process.env.DEPLOY_SCENARIO === 'SINGLE_TENANT' || process.env.DEPLOY_SCENARIO === 'hybrid' || process.env.DEPLOY_SCENARIO === 'on-premise';
    const licenseKey = process.env.LICENSE_KEY;
    if (isSingleTenant && licenseKey) {
      try {
        const licInfo = await checkLicenseStatus(licenseKey);
        if (licInfo.success && licInfo.data?.requested_slug) {
          const serverSub = String(licInfo.data.requested_slug).trim().toLowerCase();
          if (subLabel === serverSub) {
            shouldCheckGlobally = false;
            console.log(`[Subdomain Bypass] Membebaskan pengecekan global karena subdomain '${subLabel}' cocok dengan lisensi lokal.`);
          }
        }
      } catch (err: any) {
        console.warn(`[Subdomain Bypass Warning] Gagal memvalidasi lisensi lokal saat pendaftaran tenant:`, err.message);
      }
    }

    if (shouldCheckGlobally) {
      try {
        const globCheck = await checkSlugAvailability(subLabel);
        if (!globCheck.available) {
          throw new Error(`Subdomain '${subLabel}' sudah digunakan di server lisensi pusat. Silakan pilih subdomain lain.`);
        }
      } catch (err: any) {
        if (err.message && err.message.includes('sudah digunakan')) {
          throw err;
        }
        console.warn(`[Subdomain Check Warning] Gagal verifikasi subdomain '${subLabel}' secara global di server pusat:`, err.message);
      }
    }

    // 3. Check Tenant Name Availability
    const existingName = await prisma.tenant.findFirst({
      where: { name: tenant_name }
    });
    if (existingName) {
      throw new Error(`Nama Sekolah '${tenant_name}' sudah terdaftar. Silakan hubungi admin jika ini kesalahan.`);
    }

    const existingAdmin = await prisma.user.findFirst({ where: { email: admin_email } });
    if (existingAdmin) {
      throw new Error('Email administrator sudah terdaftar. Silakan gunakan email lain atau login.');
    }

    // Hardening: Phone validation
    const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;
    const cleanPhone = String(admin_phone).trim().replace(/-/g, '').replace(/ /g, '');
    if (!phoneRegex.test(cleanPhone)) {
      throw new Error('Nomor telepon tidak valid. Gunakan format Indonesia (contoh: 08123456789).');
    }

    // Hardening: Password strength
    if (admin_password.length < 8) {
        throw new Error('Password minimal 8 karakter.');
    }

    const tier = String(academic_tier || 'MICRO').toUpperCase();
    // Cari plan ACADEMIC berdasarkan code (termasuk yang is_active=false agar tidak jatuh ke CORE_PLATFORM)
    let corePlan = await prisma.plan.findFirst({
      where: { code: `ACADEMIC_${tier}_TAHUNAN` },
    });
    // Jika ditemukan tapi tidak aktif, aktifkan sekarang
    if (corePlan && !corePlan.is_active) {
      corePlan = await prisma.plan.update({
        where: { id: corePlan.id },
        data: { is_active: true }
      });
    }
    if (!corePlan) {
      // Fallback: Cari CORE_PLATFORM jika ACADEMIC tidak ada sama sekali
      corePlan = await prisma.plan.findFirst({
        where: { name: 'CORE_PLATFORM', is_active: true },
      });
    }
    if (!corePlan) {
      throw new Error('Default Academic/CORE plan not found. Please contact support.');
    }

    const requestedPlan = plan_id
      ? await prisma.plan.findUnique({ where: { id: String(plan_id) } })
      : null;
    if (plan_id) {
      if (!requestedPlan || !requestedPlan.is_active) {
        throw new Error('Selected plan not found or inactive');
      }
    }

    // 3. Find the ADMIN role
    const adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } });
    if (!adminRole) {
      throw new Error('ADMIN role not found. Please seed the database.');
    }

    if (normalizedNpsn) {
      const sekolahService = new SekolahService();
      masterSekolah = await (async () => {
        try {
          const res = await sekolahService.lookupMasterByNpsn(normalizedNpsn);
          return res?.data ?? null;
        } catch {
          return null;
        }
      })();

      // Hardening: Reject if NPSN not found in master data (skip in single-tenant/on-premise/hybrid mode)
      if (!masterSekolah && !isSingleTenant) {
        throw new Error(`Data sekolah dengan NPSN ${normalizedNpsn} tidak ditemukan di database Kemdikbud. Pastikan NPSN benar.`);
      }
    }

    // 4. Create Tenant, Admin User, and Subscription in a transaction
    let result: { tenant: any; user: any; subscription: any };
    try {
      result = await prisma.$transaction(async (tx) => {
        // Resolve subdomain: if input is FQDN, take the first part. Otherwise use as is.
        const subdomainSlug = tenant_domain.includes('.') ? tenant_domain.split('.')[0] : tenant_domain;
        
        const newTenant = await tx.tenant.create({
          data: {
            name: tenant_name,
            subdomain: subdomainSlug,
            status: 'ACTIVE',
            absensi_mode: (absensi_mode as any) || 'MULTI_SESI',
          },
        });

        await tx.sekolah.create({
          data: {
            tenant_id: newTenant.id,
            nama: String(masterSekolah?.nama || tenant_name),
            npsn: masterSekolah?.npsn ?? normalizedNpsn ?? null,
            jenjang: masterSekolah?.bentuk_pendidikan ?? masterSekolah?.jenjang ?? null,
            akreditasi: masterSekolah?.akreditasi ?? null,
            alamat: alamat ?? masterSekolah?.alamat ?? null,
            kelurahan: masterSekolah?.kelurahan ?? null,
            kecamatan: masterSekolah?.kecamatan ?? null,
            kota: masterSekolah?.kota ?? null,
            provinsi: masterSekolah?.provinsi ?? null,
            kode_pos: masterSekolah?.kode_pos ?? null,
            telepon: masterSekolah?.telepon ?? null,
            email: masterSekolah?.email ?? null,
            website: masterSekolah?.website ?? null,
            kepala_sekolah: masterSekolah?.kepala_sekolah ?? null,
            nip_kepala: masterSekolah?.nip_kepala ?? null,
            timezone: masterSekolah?.timezone ?? null,
            latitude: typeof masterSekolah?.latitude === 'number' ? masterSekolah.latitude : null,
            longitude: typeof masterSekolah?.longitude === 'number' ? masterSekolah.longitude : null,
          },
        });

      for (const def of DEFAULT_STRUKTUR_ORGANISASI) {
        await tx.organizationalPosition.create({
          data: {
            tenant_id: newTenant.id,
            code: def.kode,
            name: def.nama,
            scope_type: def.scope,
            unit_type: null,
            is_active: true,
          },
        });
      }

      const hashedPassword = await bcrypt.hash(admin_password, 10);

      // Create Admin User
      const newAdmin = await tx.user.create({
        data: {
          full_name: admin_full_name,
          email: admin_email,
          password: hashedPassword,
          tenant_id: newTenant.id,
          role_id: adminRole.id,
          no_hp: String(admin_phone).trim(),
        },
      });

      // Create subscription: ALWAYS start with CORE only. Service ordering happens after tenant is created.
      const now = new Date();
      const end = new Date(now);
      end.setFullYear(end.getFullYear() + 100);
      const newSubscription = await tx.subscription.create({
        data: {
          tenant_id: newTenant.id,
          plan_id: corePlan.id,
          service_code: (corePlan as any).service_code,
          status: 'ACTIVE' as any,
          start_date: now,
          end_date: end,
          next_billing_date: end,
          auto_renew: false,
        },
      });

      if (requestedPlan && requestedPlan.id !== corePlan.id) {
        // Create secondary subscription with UPGRADE_PENDING status
        const reqNow = new Date();
        const cycle = Math.max(1, billing_cycle_months || 1);
        const reqEnd = new Date(reqNow);
        reqEnd.setMonth(reqEnd.getMonth() + cycle);

        await tx.subscription.create({
          data: {
            tenant_id: newTenant.id,
            plan_id: requestedPlan.id,
            service_code: (requestedPlan as any).service_code,
            status: 'UPGRADE_PENDING',
            start_date: reqNow,
            end_date: reqEnd,
            next_billing_date: reqEnd,
            auto_renew: true,
            price_snapshot: custom_price ?? (requestedPlan.price_monthly * cycle),
            pricing_model: sim_model || 'FLAT',
            pricing_meta: {
              students: sim_students,
              desc: sim_desc
            } as any,
          },
        });



        // Keep config markers for backward compatibility/reference
        try {
          await tx.config.create({
            data: {
              tenant_id: newTenant.id,
              key: 'onboarding_requested_plan_id',
              value: String(requestedPlan.id),
              description: 'Plan yang dipilih saat registrasi (untuk referensi)',
            },
          });
        } catch {}
      }

      await tx.activityLog.create({
        data: {
          tenant_id: newTenant.id,
          user_id: newAdmin.id,
          action: 'TENANT_REGISTERED',
          entity: 'TENANT',
          entity_id: newTenant.id,
          metadata: JSON.stringify({
            tenant_name: newTenant.name,
            tenant_domain: newTenant.subdomain,
            npsn: masterSekolah?.npsn ?? normalizedNpsn ?? null,
            admin_user_id: newAdmin.id,
            admin_email: newAdmin.email,
            plan: String(corePlan?.name || 'CORE_PLATFORM'),
            requested_plan: requestedPlan ? { id: requestedPlan.id, name: requestedPlan.name } : undefined,
            requested_order: requestedPlan ? {
              billing_cycle_months: billing_cycle_months ?? undefined,
              custom_price: custom_price ?? undefined,
              sim_model: sim_model ?? undefined,
              sim_students: sim_students ?? undefined,
              sim_desc: sim_desc ?? undefined,
            } : undefined,
            subscription_id: newSubscription.id,
          })
        }
      });

        return { tenant: newTenant, user: newAdmin, subscription: newSubscription };
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        const target = Array.isArray(e?.meta?.target) ? e.meta.target : [];
        if (target.includes('npsn')) {
          throw new Error('NPSN sudah terdaftar');
        }
      }
      throw e;
    }

    // 5. Update central license server if single tenant mode
    if (isSingleTenant && licenseKey) {
      try {
        await updateLicenseInfo({
          license_key: licenseKey,
          school_name: tenant_name,
          npsn: normalizedNpsn
        });
        console.log(`[License Server Sync] Berhasil memperbarui nama sekolah dan NPSN di server pusat.`);
      } catch (err: any) {
        console.error(`[License Server Sync Warning] Gagal memperbarui info lisensi di server pusat:`, err.message);
      }
    }

    // 5b. Send WhatsApp credentials notification via central licensing server (For all modes: Single-Tenant & SaaS)
    try {
      const subdomainSlug = tenant_domain.includes('.') ? tenant_domain.split('.')[0] : tenant_domain;
      await sendRegistrationWa({
        school_name: tenant_name,
        subdomain: subdomainSlug,
        admin_email: admin_email,
        admin_password: admin_password,
        admin_phone: admin_phone
      });
      console.log(`[License Server WA] Berhasil mengirimkan permintaan notifikasi WA registrasi ke server pusat.`);
    } catch (err: any) {
      console.error(`[License Server WA Warning] Gagal mengirimkan notifikasi WA registrasi via server pusat:`, err.message);
    }

    let verificationToken: string | null = null;
    let fallbackVerifyUrl: string | null = null;

    try {
      verificationToken = randomUUID();
      await prisma.user.update({ where: { id: result.user.id }, data: { verification_token: verificationToken, email_verified: false } });
      const apiBase = getSmartApiBaseUrl();
      fallbackVerifyUrl = `${apiBase}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;
      console.log(`✉️ [AuthService] Generated verification URL: ${fallbackVerifyUrl}`);
    } catch (e) {
      console.error('❌ [AuthService] Error generating verification token:', e);
    }

    try {
      const tenantId = result.tenant.id;
      await emitDomainEvent({
        event_type: 'tenant.created',
        tenant_id: tenantId,
        source_service: 'auth',
        metadata: {
          idempotency_key: `tenant_created_${tenantId}`,
          correlation_id: `tenant_created_${tenantId}`,
        },
        payload: {
          tenant_id: tenantId,
          tenant_name: result.tenant.name,
          tenant_domain: result.tenant.subdomain,
          admin_user_id: result.user.id,
          admin_email: admin_email,
          admin_name: admin_full_name,
          admin_phone: admin_phone,
          subscription_id: result.subscription.id,
          aggregated_billing_id: aggregatedBillingId ?? null,
          plan_id: String(plan_id || ''),
          plan_name: String(corePlan?.name || ''),
          billing_cycle_months: billing_cycle_months ?? null,
          verification_token: verificationToken || null,
          fallback_verify_url: fallbackVerifyUrl || null,
          created_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error('Failed to emit tenant.created event:', err);
    }

    return result;
  }

  async getUserById(userId: string, tenantId?: string): Promise<UserResponse | null> {
    const whereClause: any = { id: userId };
    if (tenantId !== undefined) {
      whereClause.tenant_id = tenantId;
    }
    
    const user = await prisma.user.findFirst({
      where: whereClause,
      include: {
        Role: {
            include: {
                rolePermissions: {
                    include: { Permission: true }
                }
            }
        },
      },
    });

    if (!user) {
      return null;
    }

    const response: UserResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: {
        id: user.Role.id,
        name: user.Role.name,
        permissions: user.Role.rolePermissions?.map(rp => rp.Permission.id) ?? [],
      },
      tenant_id: user.tenant_id,
      has_completed_onboarding: user.has_completed_onboarding,
      created_at: user.created_at,
      updated_at: user.updated_at,
      capabilities: [],
    };

    // Attach capabilities using shared logic
    await this.attachCapabilities(user, response);

    // Attach tenant info including absensi_mode
    try {
      const effectiveTenantId = response.tenant_id;
      if (effectiveTenantId && effectiveTenantId !== 'system') {
        const t = await prisma.tenant.findUnique({
          where: { id: effectiveTenantId },
          select: { id: true, name: true, subdomain: true, custom_domain: true },
        });
        if (t) {
          const resolvedMode = await getEffectiveAbsensiMode(effectiveTenantId);

          response.tenant = {
            id: t.id,
            name: t.name,
            domain: t.subdomain ?? undefined,
            subdomain: t.subdomain ?? undefined,
            custom_domain: t.custom_domain ?? undefined,
            absensi_mode: resolvedMode,
          };
          // Attach Tenant Features (Capability Switch)
          const features = await getTenantCapabilities(t.id);
          response.features = features;
        } else {
          response.tenant = null;
        }
      } else {
        response.tenant = null;
      }
    } catch {
      response.tenant = null;
    }

    return response;
  }

  private async attachCapabilities(user: any, response: UserResponse) {
    const orgCtx = await organizationalAuthorizationEngine.resolveOrganizationalContext(user.id);
    response.capabilities = await authorizationService.resolveUserCapabilities(user.id, { user });
    response.position_codes = orgCtx.positions.map(p => p.code);
    
    // Attach siswa_id if role is SISWA
    if (response.role?.name === 'SISWA') {
      const student = await prisma.siswa.findFirst({
        where: { user_id: user.id },
        select: { id: true }
      });
      if (student) {
        response.siswa_id = student.id;
      }
    }

    // Attach guru_profile if role is GURU
    if (response.role?.name === 'GURU') {
      const guru = await prisma.guru.findFirst({
        where: { user_id: user.id }
      });
      if (guru) {
        let waliKelasDi = null;
        const waliAssignment = await prisma.organizationalAssignment.findFirst({
          where: {
            user_id: user.id,
            tenant_id: user.tenant_id,
            is_active: true,
            Position: { code: 'WALIKELAS' },
            kelas_id: { not: null },
          },
          include: {
            Kelas: {
              select: {
                id: true,
                nama_kelas: true,
                tingkat: true,
              },
            },
          },
        });

        if (waliAssignment?.Kelas) {
          waliKelasDi = waliAssignment.Kelas;
        }

        response.guru_profile = {
          id: guru.id,
          wali_kelas_di: waliKelasDi,
          jenis_ptk: guru.jenis_ptk
        };
      }
    }
  }
}

export const authService = new AuthService();

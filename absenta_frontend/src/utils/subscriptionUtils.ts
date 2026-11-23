/**
 * 🛡️ Centralized Subscription & Entitlement Engine (DRY Single Source of Truth)
 * Memastikan verifikasi fitur paket langganan (termasuk PAKET LENGKAP & alias modul)
 * konsisten di seluruh aplikasi tanpa false-lock / false-preview.
 */

import { useAuthStore } from '../store/authStore';

export const MODULE_ALIASES: Record<string, string[]> = {
  ABSENSI: ['ABSENSI', 'ATTENDANCE', 'ATTENDANCE_OPS', 'ABSENSI-MULTI_SESI', 'ABSENSI-SIMPLE', 'PRESENSI'],
  ATTENDANCE: ['ABSENSI', 'ATTENDANCE', 'ATTENDANCE_OPS', 'ABSENSI-MULTI_SESI', 'ABSENSI-SIMPLE', 'PRESENSI'],
  ATTENDANCE_OPS: ['ABSENSI', 'ATTENDANCE', 'ATTENDANCE_OPS', 'ABSENSI-MULTI_SESI', 'ABSENSI-SIMPLE', 'PRESENSI'],
  KOPERASI: ['KOPERASI', 'COOPERATIVE', 'COOP', 'KOPERASI_SEKOLAH'],
  COOPERATIVE: ['KOPERASI', 'COOPERATIVE', 'COOP', 'KOPERASI_SEKOLAH'],
  COOP: ['KOPERASI', 'COOPERATIVE', 'COOP', 'KOPERASI_SEKOLAH'],
  SARPRAS: ['SARPRAS', 'ASSET', 'INVENTORY', 'SARPRAS_ASET'],
  INVENTORY: ['SARPRAS', 'ASSET', 'INVENTORY'],
  ASSET: ['SARPRAS', 'ASSET', 'INVENTORY'],
  HUBIN: ['HUBIN', 'BKK', 'PRAKERIN', 'PKL', 'DU_DI'],
  BKK: ['HUBIN', 'BKK', 'PRAKERIN', 'PKL'],
  PRAKERIN: ['HUBIN', 'BKK', 'PRAKERIN', 'PKL'],
  RAPOR: ['RAPOR', 'REPORTING', 'NILAI', 'RAPOR_KURIKULUM'],
  REPORTING: ['RAPOR', 'REPORTING', 'NILAI'],
  NILAI: ['RAPOR', 'REPORTING', 'NILAI'],
  CBT: ['CBT', 'EXAM', 'UJIAN', 'BANK_SOAL'],
  WHATSAPP: ['WHATSAPP', 'WA_GATEWAY', 'WHATSAPP_SERVICE'],
  EASY_TUNNEL: ['EASY_TUNNEL', 'EASY', 'TUNNEL', 'VPN'],
  KESISWAAN: ['KESISWAAN', 'AFFAIRS', 'BPBK', 'BK'],
  ACADEMIC: ['ACADEMIC', 'AKADEMIK', 'KURIKULUM', 'CORE'],
  KURIKULUM: ['ACADEMIC', 'AKADEMIK', 'KURIKULUM', 'CORE'],
  CORE: ['CORE', 'ACADEMIC', 'KURIKULUM'],
};

/**
 * Cek apakah langganan tenant adalah PAKET LENGKAP / ALL-IN-ONE
 */
export function isSubscriptionPaketLengkap(subscription?: any, user?: any): boolean {
  const sub = subscription || useAuthStore.getState().subscription;
  const u = user || useAuthStore.getState().user;

  // 1. Cek dari user features (disediakan langsung oleh /auth/me untuk seluruh staf/admin)
  const userFeatures = u?.features || [];
  if (Array.isArray(userFeatures)) {
    const hasPaketLengkapFeature = userFeatures.some((f: any) => {
      const uf = String(f).toUpperCase();
      return (
        uf === 'PAKET_LENGKAP' ||
        uf === 'ALL-IN-ONE' ||
        uf.includes('PAKET LENGKAP') ||
        uf.includes('AKSES SELURUH MODUL')
      );
    });
    if (hasPaketLengkapFeature) return true;
  }

  if (!sub) return false;

  const planName = String(
    sub?.Plan?.name ||
    sub?.plan?.name ||
    sub?.plan_name ||
    sub?.package_name ||
    ''
  ).toUpperCase();

  const serviceCode = String(
    sub?.service_code ||
    sub?.Plan?.service_code ||
    sub?.plan_snapshot?.service_code ||
    ''
  ).toUpperCase();

  const moduleId = String(
    sub?.Plan?.module_id ||
    sub?.plan_snapshot?.module_id ||
    ''
  ).toUpperCase();

  if (
    serviceCode === 'PAKET_LENGKAP' ||
    moduleId === 'PAKET_LENGKAP' ||
    planName.includes('PAKET LENGKAP') ||
    planName.includes('ALL-IN-ONE')
  ) {
    return true;
  }

  // Cek features list pada subscription
  const features =
    sub?.features ||
    sub?.Plan?.features_json ||
    sub?.plan?.features_json ||
    sub?.plan_snapshot?.features_json ||
    [];

  if (Array.isArray(features)) {
    const hasPaketLengkapFeature = features.some((f: any) => {
      const uf = String(f).toUpperCase();
      return (
        uf === 'PAKET_LENGKAP' ||
        uf === 'ALL-IN-ONE' ||
        uf.includes('PAKET LENGKAP') ||
        uf.includes('AKSES SELURUH MODUL')
      );
    });
    if (hasPaketLengkapFeature) return true;
  }

  // Cek child subscriptions
  const childSubs: any[] = sub?.subscriptions || [];
  if (Array.isArray(childSubs)) {
    const hasChildPaketLengkap = childSubs.some((s: any) => {
      const sName = String(s?.Plan?.name || s?.plan?.name || s?.plan_name || '').toUpperCase();
      const sCode = String(s?.service_code || s?.Plan?.service_code || '').toUpperCase();
      const sStatus = String(s?.status || '').toUpperCase();
      const isActive = ['ACTIVE', 'TRIAL'].includes(sStatus);
      return isActive && (sCode === 'PAKET_LENGKAP' || sName.includes('PAKET LENGKAP') || sName.includes('ALL-IN-ONE'));
    });
    if (hasChildPaketLengkap) return true;
  }

  return false;
}

/**
 * Cek apakah modul tertentu terbuka (unlocked) untuk tenant
 */
export function isModuleUnlocked(
  subscription?: any,
  moduleCode?: string,
  user?: any
): boolean {
  const effectiveUser = user || useAuthStore.getState().user;
  const effectiveSub = subscription || useAuthStore.getState().subscription;

  const normModule = String(moduleCode || '').trim().toUpperCase();
  const isKoperasi = ['KOPERASI', 'COOPERATIVE', 'COOP', 'KOPERASI_SEKOLAH'].includes(normModule);

  // 1. Role Superadmin / Platform selalu full akses.
  // Untuk KOPERASI (unit otonom "beda dapur"): Admin sekolah tetap tunduk pada status kepemilikan lisensi koperasi.
  const role = String(effectiveUser?.roleName || effectiveUser?.role?.name || '').toUpperCase();
  if (role === 'SUPERADMIN' || role.startsWith('PLATFORM_') || effectiveUser?.tenant_id === 'system') {
    return true;
  }
  if (role.includes('ADMIN') && !isKoperasi) {
    return true;
  }

  // 2. Modul bawaan gratis platform (Core & Academic dasar)
  if (!normModule || ['CORE', 'ACADEMIC', 'KURIKULUM'].includes(normModule)) {
    return true;
  }

  // 3. Jika berlangganan PAKET LENGKAP yang masih aktif -> SELURUH MODUL SEKOLAH TERBUKA (KECUALI KOPERASI KARENA BEDA DAPUR)
  if (!isKoperasi && isSubscriptionPaketLengkap(effectiveSub, effectiveUser)) {
    const subStatus = String(effectiveSub?.status || effectiveUser?.subscription_status || '').toUpperCase();
    const expiredStatuses = ['EXPIRED', 'CANCELLED', 'CANCELED', 'SUSPENDED', 'INACTIVE'];
    if (!expiredStatuses.includes(subStatus)) {
      return true;
    }
  }

  // 4. Kumpulkan seluruh fitur aktif dari subscription & user
  const featurePool: string[] = [];
  const addFeatures = (raw: any) => {
    if (Array.isArray(raw)) {
      raw.forEach((f) => {
        if (typeof f === 'string') {
          const uf = f.toUpperCase().trim();
          if (isKoperasi && (uf === 'PAKET_LENGKAP' || uf.includes('PAKET LENGKAP') || uf.includes('AKSES SELURUH MODUL'))) {
            return;
          }
          featurePool.push(uf);
        }
      });
    }
  };

  addFeatures(effectiveUser?.features);
  addFeatures(effectiveSub?.features);
  addFeatures(effectiveSub?.Plan?.features_json);
  addFeatures(effectiveSub?.plan?.features_json);
  addFeatures(effectiveSub?.plan_snapshot?.features_json);

  // Injek service code utama
  if (effectiveSub?.service_code) featurePool.push(String(effectiveSub.service_code).toUpperCase());
  if (effectiveSub?.Plan?.service_code) featurePool.push(String(effectiveSub.Plan.service_code).toUpperCase());

  // Injek child subscriptions yang berstatus ACTIVE / TRIAL
  const childSubs: any[] = effectiveSub?.subscriptions || effectiveUser?.subscriptions || [];
  if (Array.isArray(childSubs)) {
    childSubs.forEach((s: any) => {
      const sStatus = String(s?.status || '').toUpperCase();
      if (['ACTIVE', 'TRIAL'].includes(sStatus)) {
        if (s?.service_code) featurePool.push(String(s.service_code).toUpperCase());
        if (s?.Plan?.service_code) featurePool.push(String(s.Plan.service_code).toUpperCase());
        addFeatures(s?.Plan?.features_json);
        addFeatures(s?.plan_snapshot?.features_json);
      }
    });
  }

  // Jika featurePool memiliki penanda PAKET LENGKAP -> SELURUH MODUL SEKOLAH TERBUKA (KECUALI KOPERASI)
  if (
    !isKoperasi &&
    (featurePool.includes('PAKET_LENGKAP') ||
      featurePool.includes('ALL-IN-ONE') ||
      featurePool.some((f) => f.includes('PAKET LENGKAP') || f.includes('AKSES SELURUH MODUL')))
  ) {
    return true;
  }

  // 5. Cek kecocokan modul & alias
  const aliases = MODULE_ALIASES[normModule] || [normModule];

  return featurePool.some((feat) => {
    // Exact match dengan alias
    if (aliases.includes(feat)) return true;
    // Prefix / Substring match (misal feat = "ABSENSI-MULTI_SESI" dan target = "ABSENSI")
    return aliases.some((a) => feat.startsWith(a) || feat.includes(a));
  });
}

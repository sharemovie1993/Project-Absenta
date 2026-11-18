/**
 * 🛡️ Centralized Subscription & Entitlement Engine (DRY Single Source of Truth)
 * Memastikan verifikasi fitur paket langganan (termasuk PAKET LENGKAP & alias modul)
 * konsisten di seluruh aplikasi tanpa false-lock / false-preview.
 */

export const MODULE_ALIASES: Record<string, string[]> = {
  ABSENSI: ['ABSENSI', 'ATTENDANCE', 'ATTENDANCE_OPS', 'ABSENSI-MULTI_SESI', 'ABSENSI-SIMPLE', 'PRESENSI'],
  ATTENDANCE: ['ABSENSI', 'ATTENDANCE', 'ATTENDANCE_OPS', 'ABSENSI-MULTI_SESI', 'ABSENSI-SIMPLE', 'PRESENSI'],
  ATTENDANCE_OPS: ['ABSENSI', 'ATTENDANCE', 'ATTENDANCE_OPS', 'ABSENSI-MULTI_SESI', 'ABSENSI-SIMPLE'],
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
export function isSubscriptionPaketLengkap(subscription: any): boolean {
  if (!subscription) return false;

  const planName = String(
    subscription?.Plan?.name ||
    subscription?.plan?.name ||
    subscription?.plan_name ||
    ''
  ).toUpperCase();

  const serviceCode = String(
    subscription?.service_code ||
    subscription?.Plan?.service_code ||
    subscription?.plan_snapshot?.service_code ||
    ''
  ).toUpperCase();

  const moduleId = String(
    subscription?.Plan?.module_id ||
    subscription?.plan_snapshot?.module_id ||
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

  // Cek features list
  const features =
    subscription?.features ||
    subscription?.Plan?.features_json ||
    subscription?.plan?.features_json ||
    subscription?.plan_snapshot?.features_json ||
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
  const childSubs: any[] = subscription?.subscriptions || [];
  if (Array.isArray(childSubs)) {
    const hasChildPaketLengkap = childSubs.some((s: any) => {
      const sName = String(s?.Plan?.name || s?.plan?.name || '').toUpperCase();
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
  subscription: any,
  moduleCode: string,
  user?: any
): boolean {
  // 1. Role Admin / Superadmin selalu full akses
  const role = String(user?.roleName || user?.role?.name || '').toUpperCase();
  if (role.includes('ADMIN') || role === 'SUPERADMIN') {
    return true;
  }

  // 2. Modul bawaan gratis platform (Core & Academic dasar)
  const normModule = String(moduleCode || '').trim().toUpperCase();
  if (!normModule || ['CORE', 'ACADEMIC', 'KURIKULUM'].includes(normModule)) {
    return true;
  }

  // 3. Jika berlangganan PAKET LENGKAP yang masih aktif -> SELURUH MODUL TERBUKA
  if (isSubscriptionPaketLengkap(subscription)) {
    const subStatus = String(subscription?.status || '').toUpperCase();
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
        if (typeof f === 'string') featurePool.push(f.toUpperCase());
      });
    }
  };

  addFeatures(user?.features);
  addFeatures(subscription?.features);
  addFeatures(subscription?.Plan?.features_json);
  addFeatures(subscription?.plan?.features_json);
  addFeatures(subscription?.plan_snapshot?.features_json);

  // Injek service code utama
  if (subscription?.service_code) featurePool.push(String(subscription.service_code).toUpperCase());
  if (subscription?.Plan?.service_code) featurePool.push(String(subscription.Plan.service_code).toUpperCase());

  // Injek child subscriptions yang berstatus ACTIVE / TRIAL
  const childSubs: any[] = subscription?.subscriptions || user?.subscriptions || [];
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

  // 5. Cek kecocokan modul & alias
  const aliases = MODULE_ALIASES[normModule] || [normModule];

  return featurePool.some((feat) => {
    // Exact match dengan alias
    if (aliases.includes(feat)) return true;
    // Prefix / Substring match (misal feat = "ABSENSI-MULTI_SESI" dan target = "ABSENSI")
    return aliases.some((a) => feat.startsWith(a) || feat.includes(a));
  });
}

import { prisma } from '../../../utils/prisma';

export interface ModuleColumn {
  id: string;
  name: string;
  shortDesc: string;
  icon: string;
}

export interface TierModuleStatus {
  included_in_bundle: boolean;
  is_active_for_tenant: boolean;
  is_cross_owned?: boolean;
  status_code: 'ACTIVE' | 'CROSS_ACTIVE' | 'AVAILABLE_IN_BUNDLE' | 'NOT_INCLUDED';
  tooltip: string;
}

export interface TierComparisonRow {
  tier: 'Micro' | 'Small' | 'Medium' | 'Large' | 'Enterprise';
  capacity: string;
  badge?: string;
  description: string;
  is_current_tier: boolean;
  modules: Record<string, TierModuleStatus>;
}

export interface PackageMatrixResponse {
  context: {
    service_id?: string;
    is_master_package: boolean;
    plan_name: string;
    variant: 'Micro' | 'Small' | 'Medium' | 'Large' | 'Enterprise';
    target_module: string;
    capacity: string;
    status: string;
  };
  columns: ModuleColumn[];
  tiers: TierComparisonRow[];
}

export const MODULE_COLUMNS: ModuleColumn[] = [
  { id: 'ABSENSI', name: 'Absensi Multi-Sesi', shortDesc: 'Presensi RFID/QR/GPS', icon: 'Building2' },
  { id: 'ACADEMIC', name: 'Akademik & Kurikulum', shortDesc: 'Jadwal, Rapor & Nilai', icon: 'BookOpen' },
  { id: 'KESISWAAN', name: 'Kesiswaan & BP/BK', shortDesc: 'Poin & Konseling Siswa', icon: 'Users' },
  { id: 'SARPRAS', name: 'Sarpras & Aset', shortDesc: 'Inventaris & Peminjaman', icon: 'Package' },
  { id: 'HUBIN', name: 'Hubin & PKL', shortDesc: 'Kemitraan DUDI & Magang', icon: 'Briefcase' },
  { id: 'KOPERASI', name: 'Koperasi Digital', shortDesc: 'POS Kasir & Tabungan', icon: 'Wallet' },
  { id: 'WHATSAPP', name: 'WhatsApp Gateway', shortDesc: 'Blast Notifikasi Wali', icon: 'MessageSquare' },
  { id: 'EASY_TUNNEL', name: 'Easy Tunnel VPN', shortDesc: 'Akses Server Tanpa IP Publik', icon: 'ShieldCheck' }
];

const STANDARD_BUNDLE_MAP: Record<string, string[]> = {
  Micro: ['ABSENSI', 'ACADEMIC', 'KESISWAAN'],
  Small: ['ABSENSI', 'ACADEMIC', 'KESISWAAN', 'SARPRAS'],
  Medium: ['ABSENSI', 'ACADEMIC', 'KESISWAAN', 'SARPRAS', 'HUBIN', 'WHATSAPP'],
  Large: ['ABSENSI', 'ACADEMIC', 'KESISWAAN', 'SARPRAS', 'HUBIN', 'KOPERASI', 'WHATSAPP', 'EASY_TUNNEL'],
  Enterprise: ['ABSENSI', 'ACADEMIC', 'KESISWAAN', 'SARPRAS', 'HUBIN', 'KOPERASI', 'WHATSAPP', 'EASY_TUNNEL']
};

const TIER_DETAILS: { tier: 'Micro' | 'Small' | 'Medium' | 'Large' | 'Enterprise'; capacity: string; badge?: string; desc: string }[] = [
  { tier: 'Micro', capacity: '100 Pengguna', desc: 'Cocok untuk rintisan atau pilot project' },
  { tier: 'Small', capacity: '300 Pengguna', desc: 'Cocok untuk sekolah jenjang kecil - menengah' },
  { tier: 'Medium', capacity: '600 Pengguna', desc: 'Solusi lengkap dengan notifikasi WhatsApp' },
  { tier: 'Large', capacity: '1.200 Pengguna', desc: 'Institusi besar dengan integrasi jaringan mandiri' },
  { tier: 'Enterprise', capacity: 'Unlimited Pengguna', badge: 'ALL-IN-ONE', desc: 'Fitur tanpa batas dan prioritas performa penuh' }
];

function extractVariantFromPlan(plan: any, maxUser?: number | null): 'Micro' | 'Small' | 'Medium' | 'Large' | 'Enterprise' {
  if (plan?.size_label) {
    const s = String(plan.size_label).toLowerCase();
    if (s.includes('micro')) return 'Micro';
    if (s.includes('small')) return 'Small';
    if (s.includes('medium')) return 'Medium';
    if (s.includes('large')) return 'Large';
    if (s.includes('enterprise')) return 'Enterprise';
  }

  const name = String(plan?.name || plan?.title || '').toUpperCase();
  if (name.includes('ENTERPRISE')) return 'Enterprise';
  if (name.includes('LARGE')) return 'Large';
  if (name.includes('MEDIUM')) return 'Medium';
  if (name.includes('SMALL')) return 'Small';
  if (name.includes('MICRO')) return 'Micro';

  const limit = maxUser || plan?.max_user || plan?.device_limit || 0;
  if (limit > 0) {
    if (limit <= 150) return 'Micro';
    if (limit <= 350) return 'Small';
    if (limit <= 800) return 'Medium';
    if (limit <= 1500) return 'Large';
    return 'Enterprise';
  }

  return 'Enterprise';
}

function resolveModuleCodeFromService(service: any): string {
  const code = String(service?.service_code || service?.Plan?.service_code || service?.Plan?.module_id || '').toUpperCase();
  const name = String(service?.Plan?.name || service?.plan_name || '').toUpperCase();

  if (code === 'PAKET_LENGKAP' || name.includes('PAKET LENGKAP') || name.includes('ALL-IN-ONE')) return 'PAKET_LENGKAP';
  if (code.includes('ABSENSI') || name.includes('ABSENSI')) return 'ABSENSI';
  if (code.includes('KOPERASI') || name.includes('KOPERASI')) return 'KOPERASI';
  if (code.includes('HUBIN') || name.includes('HUBIN')) return 'HUBIN';
  if (code.includes('SARPRAS') || name.includes('SARPRAS')) return 'SARPRAS';
  if (code.includes('WHATSAPP') || name.includes('WHATSAPP')) return 'WHATSAPP';
  if (code.includes('TUNNEL') || code.includes('EASY') || name.includes('TUNNEL')) return 'EASY_TUNNEL';
  if (code.includes('ACADEMIC') || code.includes('KURIKULUM') || name.includes('KURIKULUM')) return 'ACADEMIC';
  if (code.includes('KESISWAAN') || name.includes('KESISWAAN')) return 'KESISWAAN';

  return 'ABSENSI';
}

export const packageMatrixService = {
  async getComparisonMatrix(tenantId: string, serviceId?: string): Promise<PackageMatrixResponse> {
    const subscriptions = await prisma.subscription.findMany({
      where: {
        tenant_id: tenantId,
        status: { in: ['ACTIVE', 'TRIAL', 'UPGRADE_PENDING', 'PENDING_PAYMENT'] as any }
      },
      include: {
        Plan: {
          include: { Module: true }
        }
      },
      orderBy: { end_date: 'desc' }
    });

    // 1. Tentukan target service yang sedang diperiksa
    let targetService = serviceId ? subscriptions.find(s => s.id === serviceId) : null;
    if (!targetService) {
      // Fallback: Cari Paket Lengkap, lalu modul komersial, lalu sub pertama
      targetService = subscriptions.find(s => 
        s.service_code === 'PAKET_LENGKAP' || 
        s.Plan?.service_code === 'PAKET_LENGKAP' || 
        String(s.Plan?.name || '').toUpperCase().includes('PAKET LENGKAP')
      ) || subscriptions[0] || null;
    }

    const targetModuleCode = targetService ? resolveModuleCodeFromService(targetService) : 'PAKET_LENGKAP';
    const isMasterPackage = targetModuleCode === 'PAKET_LENGKAP';
    const targetVariant = targetService 
      ? extractVariantFromPlan(targetService.Plan, targetService.Plan?.max_user) 
      : 'Enterprise';

    // 2. Kumpulkan seluruh modul yang aktif dimiliki tenant (cross-service)
    const activeModuleCodes = new Set<string>();
    subscriptions.forEach(sub => {
      const mod = resolveModuleCodeFromService(sub);
      if (mod === 'PAKET_LENGKAP') {
        const subVariant = extractVariantFromPlan(sub.Plan, sub.Plan?.max_user);
        const bundle = STANDARD_BUNDLE_MAP[subVariant] || STANDARD_BUNDLE_MAP.Enterprise;
        bundle.forEach(b => activeModuleCodes.add(b));
      } else {
        activeModuleCodes.add(mod);
      }
    });

    // 3. Susun rows komparasi berdasarkan tier standar
    const tiers: TierComparisonRow[] = TIER_DETAILS.map(detail => {
      const isCurrentTier = detail.tier.toLowerCase() === targetVariant.toLowerCase();
      const bundleModules = STANDARD_BUNDLE_MAP[detail.tier] || [];

      const modules: Record<string, TierModuleStatus> = {};

      MODULE_COLUMNS.forEach(col => {
        const isIncludedInBundle = bundleModules.includes(col.id);

        let isActiveForTenant = false;
        let isCrossOwned = false;
        let statusCode: 'ACTIVE' | 'CROSS_ACTIVE' | 'AVAILABLE_IN_BUNDLE' | 'NOT_INCLUDED' = 'NOT_INCLUDED';
        let tooltip = '';

        if (isCurrentTier) {
          if (isMasterPackage) {
            // Jika tenant beli Paket Lengkap, seluruh modul di tier ini aktif!
            isActiveForTenant = isIncludedInBundle;
            if (isActiveForTenant) {
              statusCode = 'ACTIVE';
              tooltip = `Aktif pada Paket Lengkap Varian ${detail.tier}`;
            } else {
              statusCode = 'NOT_INCLUDED';
              tooltip = `Tersedia pada varian yang lebih tinggi`;
            }
          } else {
            // Jika tenant beli Modul Satuan (misal: Absensi Varian Small)
            if (col.id === targetModuleCode) {
              isActiveForTenant = true;
              statusCode = 'ACTIVE';
              tooltip = `Aktif pada langganan Anda`;
            } else if (activeModuleCodes.has(col.id)) {
              isCrossOwned = true;
              statusCode = 'CROSS_ACTIVE';
              tooltip = `Aktif melalui lisensi terpisah Anda`;
            } else if (isIncludedInBundle) {
              statusCode = 'AVAILABLE_IN_BUNDLE';
              tooltip = `Tersedia jika berlangganan Paket Lengkap Varian ${detail.tier}`;
            } else {
              statusCode = 'NOT_INCLUDED';
              tooltip = `Tidak termasuk`;
            }
          }
        } else {
          // Baris tier lain (bukan tier aktif tenant)
          if (isIncludedInBundle) {
            statusCode = 'AVAILABLE_IN_BUNDLE';
            tooltip = `Tercakup pada Varian ${detail.tier}`;
          } else {
            statusCode = 'NOT_INCLUDED';
            tooltip = `Tidak termasuk`;
          }
        }

        modules[col.id] = {
          included_in_bundle: isIncludedInBundle,
          is_active_for_tenant: isActiveForTenant,
          is_cross_owned: isCrossOwned,
          status_code: statusCode,
          tooltip
        };
      });

      return {
        tier: detail.tier,
        capacity: detail.capacity,
        badge: detail.badge,
        description: detail.desc,
        is_current_tier: isCurrentTier,
        modules
      };
    });

    const displayPlanName = isMasterPackage 
      ? 'Paket Lengkap' 
      : (MODULE_COLUMNS.find(c => c.id === targetModuleCode)?.name || 'Layanan Absenta');

    return {
      context: {
        service_id: targetService?.id,
        is_master_package: isMasterPackage,
        plan_name: displayPlanName,
        variant: targetVariant,
        target_module: targetModuleCode,
        capacity: TIER_DETAILS.find(t => t.tier === targetVariant)?.capacity || 'Unlimited',
        status: targetService?.status || 'ACTIVE'
      },
      columns: MODULE_COLUMNS,
      tiers
    };
  }
};

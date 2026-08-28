import { prisma } from '@/utils/prisma';
import { cacheService } from '@/utils/cache.service';
import { featureStateResolver } from '@/services/feature-state-resolver.service';
import { FeatureState } from '@/types/feature-state';

export interface SidebarRenderingContext {
  userId: string;
  tenantId: string;
  role: string;
  capabilities: string[];
  tenantFeatures: string[];
  organizationalScope?: {
    petugasActive?: boolean;
    tenant_wide?: boolean;
    kelas_ids?: string[];
    unit_ids?: string[];
  };
}

export class SidebarRenderingService {
  private cacheKey(userId: string) {
    return `sidebar:user:${userId}`;
  }

  async invalidateUser(userId: string): Promise<void> {
    await cacheService.delete(this.cacheKey(userId));
  }

  async invalidateAll(): Promise<void> {
    await cacheService.deletePattern('sidebar:user:*');
  }

  async getSidebarForUser(context: SidebarRenderingContext) {
    // Menghindari cache sementara untuk memastikan Mode Visibilitas Premium (Opsi 1) langsung aktif
    return this.build(context);
    // return cacheService.getOrSet(this.cacheKey(context.userId), async () => this.build(context), 300);
  }

  private normalizeFeatures(raw: any): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
    const s = String(raw).trim();
    return s ? [s] : [];
  }

  private async build(context: SidebarRenderingContext) {
    const roleUpper = String(context.role || '').toUpperCase();
    const isSuperAdmin = roleUpper === 'SUPERADMIN';
    const isPlatformScope = context.tenantId === 'system' || !context.tenantId || context.tenantId === 'null';
    const allowedScope = isPlatformScope ? 'PLATFORM' : 'TENANT';

    // ── Cooperative Member Gating ─────────────────────────────────────────────
    // Cek apakah GURU/SISWA adalah anggota koperasi aktif di tenant ini.
    // Jika bukan anggota: hapus capabilities koperasi "personal anggota" dari capSet
    // sehingga menu Menu Anggota, Tabungan, Pinjaman, dll tidak muncul di sidebar.
    // Hanya cooperative.dashboard.view.overview & announcements yang dipertahankan.
    // Jika user adalah pengurus koperasi (memiliki jabatan struktural koperasi), maka bypass gating.
    const isGuruRole = roleUpper === 'GURU';
    const isSiswaRole = roleUpper === 'SISWA';
    let isCoopMember = false;
    if ((isGuruRole || isSiswaRole) && !isSuperAdmin && context.tenantId && context.userId) {
      try {
        const coopAssignment = await prisma.organizationalAssignment.findFirst({
          where: {
            tenant_id: context.tenantId,
            user_id: context.userId,
            is_active: true,
            Position: {
              code: {
                in: [
                  'KETUA_KOPERASI',
                  'BENDAHARA_KOPERASI',
                  'SEKRETARIS_KOPERASI',
                  'MANAJER_TOKO_KOPERASI',
                  'PENGAWAS_KOPERASI'
                ]
              }
            }
          },
          select: { id: true }
        });

        if (coopAssignment) {
          isCoopMember = true;
        } else {
          const activeMember = await prisma.member.findFirst({
            where: {
              tenantId: context.tenantId,
              userId: context.userId,
              status: 'ACTIVE',
            },
            select: { id: true },
          });
          isCoopMember = !!activeMember;
        }
      } catch {
        // fail safe — default non-member (menu tersembunyi)
      }
    }

    // Daftar capabilities koperasi yang HANYA boleh terlihat untuk anggota terdaftar.
    // GURU/SISWA non-anggota yang punya capabilities ini via baseline akan difilter
    // sehingga menu personal koperasi tersembunyi dari sidebar mereka.
    const COOP_MEMBER_ONLY_CAPS = new Set([
      'cooperative.savings.view.history',
      'cooperative.savings.view.list',
      'cooperative.savings.view.detail',
      'cooperative.points.view',
      'cooperative.store.view.catalog',
      'cooperative.loans.apply',
      'cooperative.loans.view.list',
      'cooperative.loans.view.detail',
      'cooperative.reports.view.financial',
      'cooperative.reports.view.daily',
      'cooperative.reports.view.monthly',
    ]);

    const items = await prisma.menu.findMany({
      where: { is_active: true, scope: allowedScope as any },
      orderBy: { order: 'asc' },
    });

    const byIdAll: Record<string, any> = {};
    for (const m of items as any[]) {
      if (m?.id) byIdAll[String(m.id)] = m;
    }

    const rawCapSet = new Set((context.capabilities || []).map((x) => String(x).trim()).filter(Boolean));

    // Buat capSet yang sudah dipangkas untuk non-anggota
    const capSet = new Set<string>();
    for (const cap of rawCapSet) {
      // Jika GURU/SISWA bukan anggota: hapus capabilities personal koperasi dari capSet
      if ((isGuruRole || isSiswaRole) && !isCoopMember && COOP_MEMBER_ONLY_CAPS.has(cap)) {
        continue; // Lewati — jangan masukkan ke capSet aktif
      }
      capSet.add(cap);
    }

    const petugasActive = context.organizationalScope?.petugasActive === true || !String(context.role || '').toUpperCase().includes('SISWA');

    const featureMemo = new Map<string, string[]>();
    const featureVisiting = new Set<string>();
    const resolveEffectiveFeatures = (menu: any): string[] => {
      const id = String(menu?.id || '').trim();
      if (id && featureMemo.has(id)) return featureMemo.get(id)!;
      if (id) {
        if (featureVisiting.has(id)) return [];
        featureVisiting.add(id);
      }

      const own = this.normalizeFeatures(menu?.required_features);
      if (own.length > 0) {
        if (id) {
          featureMemo.set(id, own);
          featureVisiting.delete(id);
        }
        return own;
      }

      const parentId = String(menu?.parent_id || '').trim();
      if (parentId && byIdAll[parentId]) {
        const inherited = resolveEffectiveFeatures(byIdAll[parentId]);
        if (id) {
          featureMemo.set(id, inherited);
          featureVisiting.delete(id);
        }
        return inherited;
      }

      if (id) {
        featureMemo.set(id, []);
        featureVisiting.delete(id);
      }
      return [];
    };

    const filtered = items.filter((m: any) => {
      if (m.name === 'divider' && !m.path) return true;

      // 1. Check Petugas Active Status (Contextual)
      if (m.requires_petugas_active && !petugasActive) return false;

      // 2. SaaS Feature Gating — SENGAJA TIDAK DIFILTER DI SINI.
      //
      // Kebijakan arsitektur: endpoint GET /menu/sidebar berfungsi sebagai
      // "etalase platform". Semua menu selalu dikirim ke frontend terlepas
      // dari status langganan tenant. Menu yang belum dilanggani akan
      // diberi tanda locked:true + feature_state:'LOCKED' agar frontend
      // dapat menampilkan preview/showcase ekosistem platform.
      //
      // Filter SaaS yang keras (hard-filter) hanya berlaku di:
      // GET /menu/tree → menuService.treeForUser() → untuk admin UI & diagnosa.

      // 3. Permission Check (Capability-based)
      const requiredCapRaw = m.required_capability ? String(m.required_capability).trim() : '';
      if (requiredCapRaw) {
        if (isSuperAdmin) return true;
        
        // Support multiple capabilities separated by comma (OR logic)
        const required = requiredCapRaw.split(',').map((c: string) => c.trim()).filter(Boolean);
        if (required.length === 0) return true;
        
        return required.some((c: string) => capSet.has(c));
      }

      return true;
    });

    const byId: Record<string, any> = {};
    const roots: any[] = [];

    for (const m of filtered) {
      const requiredFeatures = resolveEffectiveFeatures(m);
      const mainFeature = requiredFeatures[0] || null;
      const featureState = await featureStateResolver.resolveFeatureState(context.tenantId, mainFeature);
      
      // Locked logic for UI backward compatibility if needed, 
      // but we now primarily use feature_state
      const isLocked = featureState === FeatureState.LOCKED || featureState === FeatureState.EXPIRED;

      byId[m.id] = { 
        id: m.id, 
        name: m.name, 
        path: m.path, 
        type: (m.name === 'divider' && !m.path) ? 'divider' : null,
        icon: m.icon, 
        order: m.order, 
        locked: false,
        feature_state: FeatureState.ACTIVE,
        required_features: requiredFeatures,
        required_capability: m.required_capability, 
        children: [] as any[] 
      };
    }

    filtered.forEach((m: any) => {
      const node = byId[m.id];
      const parentId = m.parent_id;
      if (parentId && byId[parentId]) {
        // Propagate locked state to children if parent is locked
        if (byId[parentId].locked) {
          node.locked = true;
        }
        // Propagate feature_state if parent is more restrictive
        if (byId[parentId].feature_state === FeatureState.LOCKED && node.feature_state !== FeatureState.LOCKED) {
           node.feature_state = FeatureState.LOCKED;
        } else if (byId[parentId].feature_state === FeatureState.EXPIRED && node.feature_state === FeatureState.ACTIVE) {
           node.feature_state = FeatureState.EXPIRED;
        }

        byId[parentId].children.push(node);
      } else {
        roots.push(node);
      }
    });

    const prune = (nodes: any[]): any[] => {
      const out: any[] = [];
      for (const n of nodes) {
        if (n.type === 'divider') {
          out.push({ id: n.id, name: n.name, path: n.path, type: n.type, order: n.order });
          continue;
        }

        const children = prune(n.children || []);
        const isGroup = String(n.required_capability || '').trim() === '' && !n.path;
        const isLocked = n.feature_state === 'LOCKED' || n.feature_state === 'EXPIRED' || n.locked === true;

        // Aturan etalase platform:
        // - Group yang LOCKED (belum berlangganan) → selalu tampil meski children kosong,
        //   agar calon pembeli dapat melihat ekosistem yang tersedia.
        // - Group yang TIDAK locked dan children kosong → tidak ditampilkan
        //   (benar-benar tidak punya capability → sembunyikan).
        if (isGroup && children.length === 0 && !isLocked) continue;

        out.push({ 
          id: n.id, 
          name: n.name, 
          path: n.path, 
          type: n.type, 
          icon: n.icon, 
          order: n.order, 
          locked: n.locked,
          feature_state: n.feature_state,
          required_capability: n.required_capability,
          children 
        });
      }
      return out;
    };

    return prune(roots);
  }
}

export const sidebarRenderingService = new SidebarRenderingService();

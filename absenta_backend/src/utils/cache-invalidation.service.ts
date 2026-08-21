import { cacheService } from './cache.service';
import { CACHE_KEYS, CACHE_TAGS } from '../constants/cache-keys';
import { organizationalContextCache } from '../modules/auth/services/organizational-context-cache';

/**
 * 🗑️ Cache Invalidation Service
 * Mengelola pembersihan cache ketika data berubah
 */
export class CacheInvalidationService {
  
  /**
   * 🏢 Invalidate semua cache terkait tenant
   */
  async invalidateTenantCache(tenantId: string) {
    const patterns = [
      `${CACHE_KEYS.TENANT.DETAIL(tenantId)}*`,
      `${CACHE_KEYS.TENANT.METRICS(tenantId)}*`,
      `${CACHE_KEYS.TENANT.USERS(tenantId)}*`,
      `${CACHE_KEYS.TENANT.ACADEMIC(tenantId)}*`,
      `${CACHE_KEYS.TENANT.ATTENDANCE(tenantId)}*`,
      `${CACHE_KEYS.TENANT.BILLING(tenantId)}*`,
    ];

    for (const pattern of patterns) {
      await cacheService.deletePattern(pattern);
    }
  }

  /**
   * 📊 Invalidate cache dashboard
   */
  async invalidateDashboardCache(tenantId: string | null, date?: string) {
    if (date) {
      // Invalidate specific date
      await cacheService.delete(CACHE_KEYS.DASHBOARD.OVERVIEW(tenantId, date));
    } else {
      // Invalidate all dashboard cache for tenant
      const pattern = tenantId 
        ? `${CACHE_KEYS.DASHBOARD.OVERVIEW(tenantId, '')}*`
        : `dashboard:overview:*`;
      await cacheService.deletePattern(pattern);
    }
  }

  /**
   * 👥 Invalidate cache user accounts, RBAC roles, & sidebar capabilities
   */
  async invalidateUserCache(tenantId: string, userId?: string) {
    // Invalidate tenant user stats & list
    await cacheService.delete(CACHE_KEYS.TENANT.USERS(tenantId));
    await cacheService.deletePattern(`user:${tenantId}:*`);
    
    // Invalidate dashboard cache
    await this.invalidateDashboardCache(tenantId);
    
    if (userId) {
      // Invalidate specific user cache
      await cacheService.deletePattern(`user:${userId}:*`);
      await cacheService.deletePattern(`user:profile:${userId}*`);
      await cacheService.deletePattern(`user:capabilities:${userId}*`);
      await cacheService.deletePattern(`user:sidebar:${userId}*`);
    }
  }

  /**
   * 🎓 Invalidate cache academic-related
   */
  async invalidateAcademicCache(tenantId: string) {
    await cacheService.delete(CACHE_KEYS.TENANT.ACADEMIC(tenantId));
    await this.invalidateBebanGuruCache(tenantId);
    await this.invalidateSiswaCache(tenantId);
    await this.invalidateDashboardCache(tenantId);
  }

  /**
   * 👨‍🎓 Invalidate cache terkait Siswa & Roster Kelas
   */
  async invalidateSiswaCache(tenantId: string, siswaId?: string) {
    await cacheService.deletePattern(`academic:${tenantId}:siswa_list:*`);
    if (siswaId) {
      await cacheService.delete(CACHE_KEYS.ACADEMIC.SISWA_DETAIL(tenantId, siswaId));
    } else {
      await cacheService.deletePattern(`academic:${tenantId}:siswa_detail:*`);
    }
    await this.invalidateRekapCache(tenantId);
    await this.invalidateDashboardCache(tenantId);
  }

  /**
   * 👨‍🏫 Invalidate cache beban guru
   */
  async invalidateBebanGuruCache(tenantId: string) {
    const pattern = `academic:${tenantId}:beban_guru:*`;
    await cacheService.deletePattern(pattern);
  }

  /**
   * 🗓️ Invalidate cache jadwal KBM & timeline
   */
  async invalidateJadwalKbmCache(tenantId: string) {
    await cacheService.deletePattern(`academic:${tenantId}:jadwal_grid:*`);
    await cacheService.deletePattern(`academic:${tenantId}:jadwal_guru:*`);
    await this.invalidateBebanGuruCache(tenantId);
  }

  /**
   * 🏛️ Invalidate cache struktur organisasi, penugasan guru/wali kelas, dan user organizational context
   */
  async invalidateStrukturTree(tenantId: string, userIds?: string | string[]) {
    // 1. Purge primary tree & structure listing cache
    await cacheService.delete(CACHE_KEYS.ACADEMIC.STRUKTUR_TREE(tenantId));
    await cacheService.deletePattern(`academic:${tenantId}:wali_kelas:*`);
    await cacheService.deletePattern(`academic:${tenantId}:struktur:*`);
    await cacheService.deletePattern(`academic:${tenantId}:beban_guru:*`);
    await cacheService.deletePattern(`academic:${tenantId}:guru_options:*`);
    await cacheService.deletePattern(`academic:${tenantId}:stats*`);
    
    // 2. Purge related KBM, workload & dashboard caches
    await this.invalidateBebanGuruCache(tenantId);
    await this.invalidateRekapCache(tenantId);
    await this.invalidateDashboardCache(tenantId);

    // 3. Purge organizational context & capabilities for affected users
    if (userIds) {
      const uids = Array.isArray(userIds) ? userIds : [userIds];
      const validUids = uids.filter(Boolean).map(String);
      
      if (validUids.length > 0) {
        await Promise.all(
          validUids.map(async (uid) => {
            try {
              await organizationalContextCache.invalidateUser(uid);
              await cacheService.deletePattern(`user:${uid}:*`);
              await cacheService.deletePattern(`user:capabilities:${uid}*`);
              await cacheService.deletePattern(`user:sidebar:${uid}*`);
              await cacheService.deletePattern(`user:profile:${uid}*`);
            } catch (err) {
              console.warn(`[CacheInvalidation] Failed to invalidate context for user ${uid}:`, err);
            }
          })
        );
      }
    }
  }

  /**
   * 📊 Invalidate cache rekap & monitoring presensi / KBM
   */
  async invalidateRekapCache(tenantId: string) {
    await cacheService.deletePattern(`academic:${tenantId}:rekap:*`);
  }

  /**
   * 📜 Invalidate cache Rapor, Nilai Formatif/Sumatif, Leger, P5, & E-Rapor Cetak
   */
  async invalidateRaporCache(tenantId: string, kelasId?: string) {
    await cacheService.deletePattern(`academic:${tenantId}:leger:*`);
    await cacheService.deletePattern(`academic:${tenantId}:nilai_kelas:*`);
    await cacheService.deletePattern(`academic:${tenantId}:transkrip:*`);
    await cacheService.deletePattern(`rapor:${tenantId}:*`);
    if (kelasId) {
      await cacheService.deletePattern(`rapor:${tenantId}:leger:${kelasId}*`);
    }
    await this.invalidateDashboardCache(tenantId);
  }

  /**
   * 🏭 Invalidate cache PKL & sertifikat PKL
   */
  async invalidatePklCache(tenantId: string) {
    await cacheService.deletePattern(`hubin:${tenantId}:*`);
  }

  /**
   * ✅ Invalidate cache attendance-related
   */
  async invalidateAttendanceCache(tenantId: string, date?: string) {
    // Invalidate attendance cache
    const attendancePattern = `${CACHE_KEYS.TENANT.ATTENDANCE(tenantId)}*`;
    await cacheService.deletePattern(attendancePattern);
    
    // Invalidate rekap & monitoring cache
    await this.invalidateRekapCache(tenantId);

    // Invalidate dashboard cache
    await this.invalidateDashboardCache(tenantId, date);
    
    // Invalidate tenant metrics
    await cacheService.delete(CACHE_KEYS.TENANT.METRICS(tenantId));
  }

  /**
   * 🎒 Invalidate cache piket kesiswaan & surat izin keluar
   */
  async invalidatePiketCache(tenantId: string) {
    await cacheService.deletePattern(`kesiswaan:piket:${tenantId}:*`);
    await this.invalidateAttendanceCache(tenantId);
  }

  /**
   * 🚨 Invalidate cache kasus pelanggaran & EWS BPBK
   */
  async invalidatePelanggaranCache(tenantId: string, siswaId?: string) {
    await cacheService.deletePattern(`kesiswaan:pelanggaran:${tenantId}:*`);
    await cacheService.deletePattern(`kesiswaan:${tenantId}:*`);
    if (siswaId) {
      await cacheService.deletePattern(`bpbk:${tenantId}:ews:${siswaId}*`);
    }
    await this.invalidateDashboardCache(tenantId);
  }

  /**
   * 🏆 Invalidate cache prestasi & penghargaan siswa
   */
  async invalidatePrestasiCache(tenantId: string, siswaId?: string) {
    await cacheService.deletePattern(`kesiswaan:prestasi:${tenantId}:*`);
    await cacheService.deletePattern(`kesiswaan:${tenantId}:*`);
    if (siswaId) {
      await cacheService.deletePattern(`bpbk:${tenantId}:ews:${siswaId}*`);
    }
    await this.invalidateDashboardCache(tenantId);
  }

  /**
   * 🏗️ Invalidate cache SARPRAS, aset, peminjaman, & pemeliharaan
   */
  async invalidateSarprasCache(tenantId: string) {
    await cacheService.deletePattern(`sarpras:${tenantId}:*`);
    await this.invalidateDashboardCache(tenantId);
  }

  /**
   * 🏭 Invalidate cache HUBIN, DUDI, PKL/Prakerin, BKK, Tracer Study, & TEFA
   */
  async invalidateHubinCache(tenantId: string, siswaId?: string) {
    await cacheService.deletePattern(`hubin:${tenantId}:*`);
    if (siswaId) {
      await cacheService.deletePattern(`hubin:${tenantId}:siswa:${siswaId}*`);
    }
    await this.invalidateDashboardCache(tenantId);
  }

  /**
   * 🧠 Invalidate cache BPBK konseling, home visit, & EWS
   */
  async invalidateBpbkCache(tenantId: string, siswaId?: string) {
    await cacheService.deletePattern(`bpbk:${tenantId}:*`);
    if (siswaId) {
      await cacheService.deletePattern(`bpbk:${tenantId}:ews:${siswaId}*`);
    }
    await this.invalidateDashboardCache(tenantId);
  }

  /**
   * 🛒 Invalidate cache Koperasi ERP, POS Toko, E-Wallet RFID, & Simpan Pinjam
   */
  async invalidateKoperasiCache(tenantId: string, memberId?: string) {
    await cacheService.deletePattern(`koperasi:${tenantId}:*`);
    await cacheService.deletePattern(`cooperative:${tenantId}:*`);
    if (memberId) {
      await cacheService.deletePattern(`koperasi:${tenantId}:member:${memberId}*`);
      await cacheService.deletePattern(`ewallet:${tenantId}:member:${memberId}*`);
    }
    await this.invalidateDashboardCache(tenantId);
  }





  /**
   * 💰 Invalidate cache billing-related
   */
  async invalidateBillingCache(tenantId: string) {
    await cacheService.delete(CACHE_KEYS.TENANT.BILLING(tenantId));
    await cacheService.delete(CACHE_KEYS.TENANT.METRICS(tenantId));
  }

  /**
   * 🧹 Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]) {
    for (const tag of tags) {
      switch (tag) {
        case CACHE_TAGS.TENANT:
          // Invalidate all tenant-related cache
          await cacheService.deletePattern('tenant:*');
          break;
        case CACHE_TAGS.DASHBOARD:
          await cacheService.deletePattern('dashboard:*');
          break;
        case CACHE_TAGS.USER:
          await cacheService.deletePattern('user:*');
          break;
        case CACHE_TAGS.ACADEMIC:
          await cacheService.deletePattern('academic:*');
          break;
        case CACHE_TAGS.ATTENDANCE:
          await cacheService.deletePattern('attendance:*');
          break;
        case CACHE_TAGS.BILLING:
          await cacheService.deletePattern('billing:*');
          break;
        case CACHE_TAGS.BRANDING:
          await cacheService.deletePattern('branding:*');
          break;
      }
    }
  }

  /**
   * 🔄 Refresh cache - invalidate dan preload data baru
   */
  async refreshTenantCache(tenantId: string) {
    // Invalidate semua cache tenant
    await this.invalidateTenantCache(tenantId);
    
    // Preload data penting (opsional - bisa dijalankan di background)
    // Ini akan memuat ulang cache dengan data terbaru
    console.log(`Cache refreshed for tenant: ${tenantId}`);
  }

  /**
   * 🚨 Emergency cache clear - hapus semua cache
   */
  async clearAllCache() {
    await cacheService.deletePattern('*');
    console.log('All cache cleared');
  }
}

// Export singleton instance
export const cacheInvalidationService = new CacheInvalidationService();

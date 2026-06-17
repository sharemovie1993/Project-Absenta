import { cacheInvalidationService } from '../utils/cache-invalidation.service';
import { TenantDetailService } from '../modules/superadmin/tenant-detail/services/tenant-detail.service';

/**
 * 🔄 Cache Invalidation Middleware
 * Otomatis invalidate cache berdasarkan route dan method
 */

interface CacheInvalidationConfig {
  tenantId?: string;
  patterns?: string[];
  tags?: string[];
  customHandler?: (req: any, reply: any) => Promise<void>;
}

/**
 * Mapping route patterns ke cache invalidation rules
 */
const INVALIDATION_RULES: Record<string, CacheInvalidationConfig> = {
  // 👥 User management routes
  'POST:/api/users': { tags: ['user', 'dashboard'] },
  'PUT:/api/users/:id': { tags: ['user', 'dashboard'] },
  'DELETE:/api/users/:id': { tags: ['user', 'dashboard'] },
  // 👥 Superadmin tenant user management routes
  'POST:/api/superadmin/tenants/:tenantId/users': { tags: ['user', 'dashboard'] },
  'PUT:/api/superadmin/tenants/:tenantId/users/:userId': { tags: ['user', 'dashboard'] },
  'DELETE:/api/superadmin/tenants/:tenantId/users/:userId': { tags: ['user', 'dashboard'] },
  
  // 🎓 Academic routes
  'POST:/api/academic/jurusan': { tags: ['academic', 'dashboard'] },
  'PUT:/api/academic/jurusan/:id': { tags: ['academic', 'dashboard'] },
  'DELETE:/api/academic/jurusan/:id': { tags: ['academic', 'dashboard'] },
  'POST:/api/academic/kelas': { tags: ['academic', 'dashboard'] },
  'PUT:/api/academic/kelas/:id': { tags: ['academic', 'dashboard'] },
  'DELETE:/api/academic/kelas/:id': { tags: ['academic', 'dashboard'] },
  'POST:/api/academic/mapel': { tags: ['academic', 'dashboard'] },
  'PUT:/api/academic/mapel/:id': { tags: ['academic', 'dashboard'] },
  'DELETE:/api/academic/mapel/:id': { tags: ['academic', 'dashboard'] },
  
  // ✅ Attendance routes
  'POST:/api/attendance/siswa': { tags: ['attendance', 'dashboard'] },
  'PUT:/api/attendance/siswa/:id': { tags: ['attendance', 'dashboard'] },
  'DELETE:/api/attendance/siswa/:id': { tags: ['attendance', 'dashboard'] },
  'POST:/api/attendance/guru': { tags: ['attendance', 'dashboard'] },
  'PUT:/api/attendance/guru/:id': { tags: ['attendance', 'dashboard'] },
  'DELETE:/api/attendance/guru/:id': { tags: ['attendance', 'dashboard'] },
  
  // 💰 Billing routes
  'POST:/api/billing/subscription': { tags: ['billing'] },
  'PUT:/api/billing/subscription/:id': { tags: ['billing'] },
  'DELETE:/api/billing/subscription/:id': { tags: ['billing'] },
  'POST:/api/billing/payment': { tags: ['billing'] },
  
  // 🏢 Tenant routes
  'PUT:/api/superadmin/tenants/:id': { tags: ['tenant'] },
  'DELETE:/api/superadmin/tenants/:id': { tags: ['tenant'] },

};

/**
 * Create cache invalidation middleware
 */
export function createCacheInvalidationMiddleware() {
  return async (request: any, reply: any) => {
    // Skip untuk GET requests (tidak mengubah data)
    if (request.method === 'GET') {
      return;
    }

    const routeKey = `${request.method}:${request.routerPath}`;
    const rule = INVALIDATION_RULES[routeKey];

    if (!rule) {
      // Tidak ada rule khusus, skip
      return;
    }

    try {
      // Extract tenant ID dari request
      const tenantId = extractTenantId(request);
      
      // Execute custom handler jika ada
      if (rule.customHandler) {
        await rule.customHandler(request, reply);
        return;
      }

      // Invalidate by tags
      if (rule.tags) {
        await cacheInvalidationService.invalidateByTags(rule.tags);
      }

      // Invalidate specific patterns
      if (rule.patterns) {
        for (const pattern of rule.patterns) {
          await cacheInvalidationService.invalidateByTags([pattern]);
        }
      }

      // Invalidate tenant-specific cache jika ada tenantId
      if (tenantId) {
        if (rule.tags?.includes('user')) {
          await cacheInvalidationService.invalidateUserCache(tenantId);
        }
        if (rule.tags?.includes('academic')) {
          await cacheInvalidationService.invalidateAcademicCache(tenantId);
        }
        if (rule.tags?.includes('attendance')) {
          await cacheInvalidationService.invalidateAttendanceCache(tenantId);
        }
        if (rule.tags?.includes('billing')) {
          await cacheInvalidationService.invalidateBillingCache(tenantId);
        }
        if (rule.tags?.includes('dashboard')) {
          await cacheInvalidationService.invalidateDashboardCache(tenantId);
        }
      }

      console.log(`Cache invalidated for route: ${routeKey}, tenant: ${tenantId}`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
      // Jangan throw error, biarkan request tetap berjalan
    }
  };
}

/**
 * Extract tenant ID dari request
 */
function extractTenantId(request: any): string | null {
  const middlewareTenantId = (request as any).tenantId;
  if (typeof middlewareTenantId === 'string' && middlewareTenantId.trim()) {
    return middlewareTenantId;
  }
  if (middlewareTenantId === null) {
    return null;
  }

  // Coba ambil dari user context (jika ada JWT)
  const user = (request as any).user;
  const userTenantId = user?.tenantId || user?.tenant_id;
  if (userTenantId) {
    return String(userTenantId);
  }

  const routerPath = String((request as any).routerPath || '');
  if (routerPath.startsWith('/api/superadmin/')) {
    const params = request.params as any;
    if (params?.tenantId) return String(params.tenantId);
    if (params?.id) return String(params.id);
  }

  return null;
}

/**
 * Hook untuk invalidate cache setelah response berhasil
 */
export function createPostResponseCacheInvalidation(io?: any) {
  const tenantDetailService = new TenantDetailService();
  return async (request: any, reply: any) => {
    // Hanya jalankan jika response sukses (2xx)
    if (reply.statusCode >= 200 && reply.statusCode < 300) {
      await createCacheInvalidationMiddleware()(request, reply);

      try {
        // Emit realtime updates via WebSocket untuk halaman Tenant Detail
        const routeKey = `${request.method}:${request.routerPath}`;
        const rule = INVALIDATION_RULES[routeKey];
        const tenantId = (extractTenantId(request) || request.tenantId || null) as string | null;
        if (io && rule && tenantId) {
          // Minimal: kirim ulang metrics dan users agar statistik segera ter-update
          const room = `tenant:${tenantId}`;
          const tasks: Array<Promise<void>> = [];
          if (rule.tags?.includes('user') || rule.tags?.includes('dashboard')) {
            tasks.push(
              tenantDetailService.getTenantMetrics(tenantId).then((data: any) => {
                io.to(room).emit('tenant_metrics_update', data);
              }).catch(() => Promise.resolve())
            );
            tasks.push(
              tenantDetailService.getTenantUsers(tenantId, 1, 50).then((data: any) => {
                io.to(room).emit('tenant_users_update', data);
              }).catch(() => Promise.resolve())
            );
          }
          await Promise.allSettled(tasks);
        }
      } catch {}
    }
  };
}

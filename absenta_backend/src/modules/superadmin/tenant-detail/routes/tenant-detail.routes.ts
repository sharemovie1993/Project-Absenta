import { TenantDetailController } from '../controllers/tenant-detail.controller';
import { requireCapability } from '@/middlewares/requireCapability';

/**
 * Routes untuk modul tenant detail
 * Semua endpoint memerlukan autentikasi dan role superadmin
 * Validasi role SUPERADMIN dilakukan di controller
 */
export async function tenantDetailRoutes(fastify: any) {
  const tenantDetailController = new TenantDetailController();

  /**
   * @route GET /api/v1/superadmin/tenants/:tenantId
   * @desc Mengambil detail lengkap tenant
   * @access Superadmin only
   */
  fastify.get('/:tenantId', {
    preHandler: [requireCapability('superadmin.tenants.manage')],
    handler: tenantDetailController.getTenantDetail.bind(tenantDetailController)
  });

  /**
   * @route GET /api/v1/superadmin/tenants/:tenantId/metrics
   * @desc Mengambil metrics dashboard untuk tenant
   * @access Superadmin only
   */
  fastify.get('/:tenantId/metrics', {
    preHandler: [requireCapability('superadmin.tenants.manage')],
    handler: tenantDetailController.getTenantMetrics.bind(tenantDetailController)
  });

  /**
   * @route GET /api/v1/superadmin/tenants/:tenantId/activities
   * @desc Mengambil aktivitas terbaru tenant
   * @access Superadmin only
   */
  fastify.get('/:tenantId/activities', {
    preHandler: [requireCapability('superadmin.tenants.manage')],
    handler: tenantDetailController.getRecentActivities.bind(tenantDetailController)
  });

  /**
   * @route GET /api/v1/superadmin/tenants/:tenantId/user-statistics
   * @desc Mengambil statistik pengguna tenant
   * @access Superadmin only
   */
  fastify.get('/:tenantId/user-statistics', {
    preHandler: [requireCapability('superadmin.tenants.manage')],
    handler: tenantDetailController.getUserStatistics.bind(tenantDetailController)
  });

  // User Management Endpoints
  
  /**
   * @route GET /api/v1/superadmin/tenants/:tenantId/users
   * @desc Mengambil daftar pengguna tenant
   * @access Superadmin only
   */
  fastify.get('/:tenantId/users', {
    preHandler: [requireCapability('superadmin.tenants.manage')],
    handler: tenantDetailController.getTenantUsers.bind(tenantDetailController)
  });

  /**
   * @route POST /api/v1/superadmin/tenants/:tenantId/users
   * @desc Membuat pengguna baru dalam tenant
   * @access Superadmin only
   */
  fastify.post('/:tenantId/users', {
    preHandler: [requireCapability('superadmin.tenants.manage')],
    handler: tenantDetailController.createTenantUser.bind(tenantDetailController)
  });

  /**
   * @route PUT /api/v1/superadmin/tenants/:tenantId/users/:userId
   * @desc Memperbarui data pengguna dalam tenant
   * @access Superadmin only
   */
  fastify.put('/:tenantId/users/:userId', {
    preHandler: [requireCapability('superadmin.tenants.manage')],
    handler: tenantDetailController.updateTenantUser.bind(tenantDetailController)
  });

  /**
   * @route DELETE /api/v1/superadmin/tenants/:tenantId/users/:userId
   * @desc Menghapus pengguna dari tenant
   * @access Superadmin only
   */
  fastify.delete('/:tenantId/users/:userId', {
    preHandler: [requireCapability('superadmin.tenants.manage')],
    handler: tenantDetailController.deleteTenantUser.bind(tenantDetailController)
  });

  /**
   * @route GET /api/v1/superadmin/tenants/:tenantId/academic
   * @desc Mengambil data akademik tenant (jurusan, kelas, guru, siswa, mapel)
   * @access Superadmin only
   */
  fastify.get('/:tenantId/academic', {
    preHandler: [requireCapability('superadmin.tenants.manage')],
    handler: tenantDetailController.getAcademicData.bind(tenantDetailController)
  });

  /**
   * @route GET /api/v1/superadmin/tenants/:tenantId/attendance
   * @desc Mengambil data monitoring absensi tenant dengan analytics dan trends
   * @access Superadmin only
   * @query date_from - Tanggal mulai filter (optional)
   * @query date_to - Tanggal akhir filter (optional)
   * @query period - Periode analisis: daily, weekly, monthly (default: weekly)
   */
  fastify.get('/:tenantId/attendance', {
    preHandler: [requireCapability('superadmin.tenants.manage')],
    handler: tenantDetailController.getAttendanceData.bind(tenantDetailController)
  });

  /**
   * @route GET /api/v1/superadmin/tenants/:tenantId/billing
   * @desc Mengambil data billing tenant (subscription, payment history, analytics)
   * @access Superadmin only
   */
  fastify.get('/:tenantId/billing', {
    preHandler: [requireCapability('superadmin.tenants.manage')],
    handler: tenantDetailController.getTenantBilling.bind(tenantDetailController)
  });

  /**
   * @route GET /api/v1/superadmin/tenants/:tenantId/logs
   * @desc Mengambil activity logs tenant dengan filtering dan pagination
   * @access Superadmin only
   * @query page - Halaman (default: 1)
   * @query limit - Jumlah data per halaman (default: 20)
   * @query user_id - Filter berdasarkan user ID
   * @query action - Filter berdasarkan action (partial match)
   * @query entity - Filter berdasarkan entity (partial match)
   * @query date_from - Filter tanggal mulai (YYYY-MM-DD)
   * @query date_to - Filter tanggal akhir (YYYY-MM-DD)
   */
  fastify.get('/:tenantId/logs', {
    preHandler: [requireCapability('superadmin.tenants.manage')],
    handler: tenantDetailController.getTenantLogs.bind(tenantDetailController)
  });

  /**
   * @route GET /api/v1/superadmin/tenants/:tenantId/export
   * @desc Export data tenant dalam berbagai format
   * @access Superadmin only
   * @query entities - Array entitas yang akan diekspor ['users', 'academic', 'attendance', 'billing', 'logs']
   * @query format - Format export: JSON, CSV, EXCEL
   * @query date_from - Tanggal mulai filter (optional, YYYY-MM-DD)
   * @query date_to - Tanggal akhir filter (optional, YYYY-MM-DD)
   */
  fastify.get('/:tenantId/export', {
    preHandler: [requireCapability('superadmin.tenants.manage')],
    handler: tenantDetailController.exportTenantData.bind(tenantDetailController)
  });
}

export default tenantDetailRoutes;

import { TenantDetailService } from '../services/tenant-detail.service';
import { ApiResponse, TenantDetailData, TenantMetrics, RecentActivity, UserStatistics } from '../types/tenant-detail.types';
import { isSystemSuperAdmin } from '@/utils/rbac';

/**
 * Controller untuk mengelola detail tenant
 * Menyediakan endpoint untuk SUPERADMIN mengakses informasi lengkap tenant
 */
export class TenantDetailController {
  private tenantDetailService: TenantDetailService;

  constructor() {
    this.tenantDetailService = new TenantDetailService();
  }

  /**
   * Mengambil detail lengkap tenant
   */
  async getTenantDetail(request: any, reply: any): Promise<ApiResponse<TenantDetailData>> {
    try {
      // Validasi role: hanya SUPERADMIN dari tenant sistem
      if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
        return reply.status(403).send({
          success: false,
          message: 'Akses ditolak. Hanya SUPERADMIN yang dapat mengakses endpoint ini.'
        });
      }

      const { tenantId } = request.params;

      if (!tenantId) {
        return reply.status(400).send({
          success: false,
          message: 'Tenant ID diperlukan'
        });
      }

      const tenantDetail = await this.tenantDetailService.getTenantDetail(tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Detail tenant berhasil diambil',
        data: tenantDetail
      });
    } catch (error) {
      console.error('Error in getTenantDetail:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Terjadi kesalahan server'
      });
    }
  }

  /**
   * Mengambil metrics dashboard untuk tenant
   */
  async getTenantMetrics(request: any, reply: any): Promise<ApiResponse<TenantMetrics>> {
    try {
      // Validasi role: hanya SUPERADMIN dari tenant sistem
      if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
        return reply.status(403).send({
          success: false,
          message: 'Akses ditolak. Hanya SUPERADMIN yang dapat mengakses endpoint ini.'
        });
      }

      const { tenantId } = request.params;

      if (!tenantId) {
        return reply.status(400).send({
          success: false,
          message: 'Tenant ID diperlukan'
        });
      }

      const metrics = await this.tenantDetailService.getTenantMetrics(tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Metrik tenant berhasil diambil',
        data: metrics
      });
    } catch (error) {
      console.error('Error in getTenantMetrics:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Terjadi kesalahan server'
      });
    }
  }

  /**
   * Mengambil aktivitas terbaru tenant
   */
  async getRecentActivities(request: any, reply: any): Promise<ApiResponse<RecentActivity[]>> {
    try {
      // Validasi role: hanya SUPERADMIN dari tenant sistem
      if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
        return reply.status(403).send({
          success: false,
          message: 'Akses ditolak. Hanya SUPERADMIN yang dapat mengakses endpoint ini.'
        });
      }

      const { tenantId } = request.params;
      const { limit = 10 } = request.query;

      if (!tenantId) {
        return reply.status(400).send({
          success: false,
          message: 'Tenant ID diperlukan'
        });
      }

      const activities = await this.tenantDetailService.getRecentActivities(
        tenantId, 
        parseInt(limit as string)
      );

      return reply.status(200).send({
        success: true,
        message: 'Aktivitas terbaru berhasil diambil',
        data: activities
      });
    } catch (error) {
      console.error('Error in getRecentActivities:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Terjadi kesalahan server'
      });
    }
  }

  /**
   * Mengambil statistik pengguna tenant
   */
  async getUserStatistics(request: any, reply: any): Promise<ApiResponse<UserStatistics>> {
    try {
      // Validasi role: hanya SUPERADMIN dari tenant sistem
      if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
        return reply.status(403).send({
          success: false,
          message: 'Akses ditolak. Hanya SUPERADMIN yang dapat mengakses endpoint ini.'
        });
      }

      const { tenantId } = request.params;

      if (!tenantId) {
        return reply.status(400).send({
          success: false,
          message: 'Tenant ID diperlukan'
        });
      }

      const statistics = await this.tenantDetailService.getUserStatistics(tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Statistik user berhasil diambil',
        data: statistics
      });
    } catch (error) {
      console.error('Error in getUserStatistics:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Terjadi kesalahan server'
      });
    }
  }

  /**
   * Mengambil daftar user dalam tenant
   */
  async getTenantUsers(request: any, reply: any) {
    try {
      // Validasi role: hanya SUPERADMIN dari tenant sistem
      if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
        return reply.status(403).send({
          success: false,
          message: 'Akses ditolak. Hanya SUPERADMIN yang dapat mengakses endpoint ini.'
        });
      }

      const { tenantId } = request.params;
      const { page = 1, limit = 10, search } = request.query;

      if (!tenantId) {
        return reply.status(400).send({
          success: false,
          message: 'Tenant ID diperlukan'
        });
      }

      const result = await this.tenantDetailService.getTenantUsers(
        tenantId, 
        parseInt(page as string), 
        parseInt(limit as string), 
        search as string
      );

      return reply.status(200).send({
        success: true,
        message: 'Daftar user berhasil diambil',
        data: result
      });
    } catch (error) {
      console.error('Error in getTenantUsers:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Terjadi kesalahan server'
      });
    }
  }

  /**
   * Membuat user baru dalam tenant
   */
  async createTenantUser(request: any, reply: any) {
    try {
      // Validasi role: hanya SUPERADMIN dari tenant sistem
      if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
        return reply.status(403).send({
          success: false,
          message: 'Akses ditolak. Hanya SUPERADMIN yang dapat mengakses endpoint ini.'
        });
      }

      const { tenantId } = request.params;
      const userData = request.body;

      if (!tenantId) {
        return reply.status(400).send({
          success: false,
          message: 'Tenant ID diperlukan'
        });
      }

      // Tambahkan informasi pembuat
      userData.createdBy = request.user.id;

      const newUser = await this.tenantDetailService.createTenantUser(tenantId, userData);

      return reply.status(201).send({
        success: true,
        message: 'User berhasil dibuat',
        data: newUser
      });
    } catch (error) {
      console.error('Error in createTenantUser:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Terjadi kesalahan server'
      });
    }
  }

  /**
   * Mengupdate user dalam tenant
   */
  async updateTenantUser(request: any, reply: any) {
    try {
      // Validasi role: hanya SUPERADMIN dari tenant sistem
      if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
        return reply.status(403).send({
          success: false,
          message: 'Akses ditolak. Hanya SUPERADMIN yang dapat mengakses endpoint ini.'
        });
      }

      const { tenantId, userId } = request.params;
      const updateData = request.body;

      if (!tenantId || !userId) {
        return reply.status(400).send({
          success: false,
          message: 'Tenant ID dan User ID diperlukan'
        });
      }

      // Tambahkan informasi pengupdate
      updateData.updatedBy = request.user.id;

      const updatedUser = await this.tenantDetailService.updateTenantUser(
        tenantId, 
        userId, 
        updateData
      );

      return reply.status(200).send({
        success: true,
        message: 'User berhasil diupdate',
        data: updatedUser
      });
    } catch (error) {
      console.error('Error in updateTenantUser:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Terjadi kesalahan server'
      });
    }
  }

  /**
   * Menghapus user dari tenant
   */
  async deleteTenantUser(request: any, reply: any) {
    try {
      // Validasi role: hanya SUPERADMIN dari tenant sistem
      if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenant_id)) {
        return reply.status(403).send({
          success: false,
          message: 'Akses ditolak. Hanya SUPERADMIN yang dapat mengakses endpoint ini.'
        });
      }

      const { tenantId, userId } = request.params;

      if (!tenantId || !userId) {
        return reply.status(400).send({
          success: false,
          message: 'Tenant ID dan User ID diperlukan'
        });
      }

      const deletedUser = await this.tenantDetailService.deleteTenantUser(
        tenantId, 
        userId, 
        request.user.id
      );

      return reply.status(200).send({
        success: true,
        message: 'User berhasil dihapus',
        data: deletedUser
      });
    } catch (error) {
      console.error('Error in deleteTenantUser:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Terjadi kesalahan server'
      });
    }
  }

  /**
   * Mengambil data akademik tenant (jurusan, kelas, guru, siswa, mapel)
   */
  async getAcademicData(request: any, reply: any) {
    try {
      // Validasi role: hanya SUPERADMIN dari tenant sistem
      if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenant_id)) {
        return reply.status(403).send({
          success: false,
          message: 'Akses ditolak. Hanya SUPERADMIN yang dapat mengakses endpoint ini.'
        });
      }

      const { tenantId } = request.params;

      if (!tenantId) {
        return reply.status(400).send({
          success: false,
          message: 'Tenant ID diperlukan'
        });
      }

      const academicData = await this.tenantDetailService.getAcademicData(tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Data akademik berhasil diambil',
        data: academicData
      });
    } catch (error) {
      console.error('Error in getAcademicData:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Terjadi kesalahan server'
      });
    }
  }

  /**
   * Mengambil data attendance monitoring tenant
   */
  async getAttendanceData(request: any, reply: any) {
    try {
      // Validasi role: hanya SUPERADMIN dari tenant sistem
      if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenant_id)) {
        return reply.status(403).send({
          success: false,
          message: 'Akses ditolak. Hanya SUPERADMIN yang dapat mengakses endpoint ini.'
        });
      }

      const { tenantId } = request.params;
      const { date_from, date_to, period = 'weekly' } = request.query;

      if (!tenantId) {
        return reply.status(400).send({
          success: false,
          message: 'Tenant ID diperlukan'
        });
      }

      const attendanceData = await this.tenantDetailService.getAttendanceData(
        tenantId, 
        { date_from, date_to, period }
      );

      return reply.status(200).send({
        success: true,
        message: 'Data attendance berhasil diambil',
        data: attendanceData
      });
    } catch (error) {
      console.error('Error in getAttendanceData:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Terjadi kesalahan server'
      });
    }
  }

  /**
   * Mengambil data billing tenant
   */
  async getTenantBilling(request: any, reply: any): Promise<ApiResponse<any>> {
    try {
      // Validasi role: hanya SUPERADMIN dari tenant sistem
      if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenant_id)) {
        return reply.status(403).send({
          success: false,
          message: 'Akses ditolak. Hanya SUPERADMIN yang dapat mengakses endpoint ini.'
        });
      }

      const { tenantId } = request.params;

      if (!tenantId) {
        return reply.status(400).send({
          success: false,
          message: 'Tenant ID diperlukan'
        });
      }

      const billingData = await this.tenantDetailService.getTenantBilling(tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Data billing tenant berhasil diambil',
        data: billingData
      });
    } catch (error) {
      console.error('Error in getTenantBilling:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Terjadi kesalahan server'
      });
    }
  }

  /**
   * Mengambil activity logs tenant dengan filtering dan pagination
   */
  async getTenantLogs(request: any, reply: any): Promise<ApiResponse<any>> {
    try {
      // Validasi role: hanya SUPERADMIN dari tenant sistem
      if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenant_id)) {
        return reply.status(403).send({
          success: false,
          message: 'Akses ditolak. Hanya SUPERADMIN yang dapat mengakses endpoint ini.'
        });
      }

      const { tenantId } = request.params;
      const { 
        page = 1, 
        limit = 20, 
        user_id, 
        action, 
        entity,
        date_from, 
        date_to,
        search
      } = request.query;

      if (!tenantId) {
        return reply.status(400).send({
          success: false,
          message: 'Tenant ID diperlukan'
        });
      }

      const logsData = await this.tenantDetailService.getTenantLogs(tenantId, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        user_id: user_id as string,
        action: action as string,
        entity: entity as string,
        date_from: date_from as string,
        date_to: date_to as string,
        search: search as string
      });

      return reply.status(200).send({
        success: true,
        message: 'Activity logs berhasil diambil',
        data: logsData
      });
    } catch (error) {
      console.error('Error in getTenantLogs:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Terjadi kesalahan server'
      });
    }
  }

  /**
   * Export data tenant dalam berbagai format
   */
  async exportTenantData(request: any, reply: any): Promise<ApiResponse<any>> {
    try {
      // Validasi role: hanya SUPERADMIN dari tenant sistem
      if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenant_id)) {
        return reply.status(403).send({
          success: false,
          message: 'Akses ditolak. Hanya SUPERADMIN yang dapat mengakses endpoint ini.'
        });
      }

      const { tenantId } = request.params;
      const { entities, format, date_from, date_to } = request.query;

      if (!tenantId) {
        return reply.status(400).send({
          success: false,
          message: 'Tenant ID diperlukan'
        });
      }

      if (!entities || !Array.isArray(entities) || entities.length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'Parameter entities diperlukan dan harus berupa array'
        });
      }

      const validFormats = ['JSON', 'CSV', 'EXCEL'];
      if (!format || !validFormats.includes(format.toUpperCase())) {
        return reply.status(400).send({
          success: false,
          message: 'Format harus salah satu dari: JSON, CSV, EXCEL'
        });
      }

      // Audit log for read-only access
      console.log(`[AUDIT] SUPERADMIN READ_ONLY access to exportTenantData for tenant ${tenantId}`);

      const exportResult = await this.tenantDetailService.exportTenantData(
        tenantId,
        entities,
        format.toUpperCase(),
        date_from,
        date_to
      );

      if (typeof exportResult?.content !== 'undefined' && exportResult?.format === 'CSV') {
        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
        return reply.send(exportResult.content);
      }
      if (exportResult?.content instanceof Buffer && exportResult?.format === 'EXCEL') {
        reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        reply.header('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
        return reply.send(exportResult.content);
      }
      return reply.status(200).send({
        success: true,
        message: 'Data tenant berhasil diekspor',
        data: exportResult
      });
    } catch (error) {
      console.error('Error in exportTenantData:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Terjadi kesalahan server'
      });
    }
  }
}

// Export instance untuk digunakan di routes
export const tenantDetailController = new TenantDetailController();

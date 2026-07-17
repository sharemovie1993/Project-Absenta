import { tahunPelajaranService, CreateTahunPelajaranInput, UpdateTahunPelajaranInput } from '../services/tahun-pelajaran.service';
import { createTahunPelajaranSchema, updateTahunPelajaranSchema } from '../services/tahun-pelajaran.schema';
import { RoleName } from '../../../../constants/enums';
import { isSystemSuperAdmin } from '../../../../utils/rbac';

export class TahunPelajaranController {
   async getAllTahunPelajaran(req: any, reply: any): Promise<void> {
    try {
      const user = req.user as any;
      const { status } = req.query || {};

      const tahunPelajaran = await tahunPelajaranService.getAllTahunPelajaran(
        user.roleName, 
        user.tenantId,
        status
      );

      reply.status(200).send({
        success: true,
        message: 'Tahun pelajaran retrieved successfully',
        data: tahunPelajaran,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Failed to retrieve tahun pelajaran',
        error: error.message,
      });
    }
  }

  async getTahunPelajaranById(req: any, reply: any): Promise<void> {
    try {
      const user = req.user as any;
      const { id } = req.params;

      const tahunPelajaran = await tahunPelajaranService.getTahunPelajaranById(id, user.roleName, user.tenantId);

      if (!tahunPelajaran) {
        reply.status(404).send({
          success: false,
          message: 'Tahun pelajaran not found',
        });
        return;
      }

      reply.status(200).send({
        success: true,
        message: 'Tahun pelajaran retrieved successfully',
        data: tahunPelajaran,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Failed to retrieve tahun pelajaran',
        error: error.message,
      });
    }
  }

  async createTahunPelajaran(req: any, reply: any): Promise<void> {
    try {
      const user = req.user as any;
      const parsedBody = createTahunPelajaranSchema.parse(req.body);

      console.log('🔍 [DEBUG] CreateTahunPelajaran Access Check:', {
        userRole: user?.roleName,
        userTenant: user?.tenantId,
        isAdmin: user?.roleName === RoleName.ADMIN,
        isSystemSuperAdmin: isSystemSuperAdmin(user?.roleName, user?.tenantId)
      });

      const createTahunPelajaranInput: CreateTahunPelajaranInput = parsedBody;

      const tahunPelajaran = await tahunPelajaranService.createTahunPelajaran(
        createTahunPelajaranInput,
        user.tenantId
      );

      reply.status(201).send({
        success: true,
        message: 'Tahun pelajaran created successfully',
        data: tahunPelajaran,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Failed to create tahun pelajaran',
        error: error.message,
      });
    }
  }

  async updateTahunPelajaran(req: any, reply: any): Promise<void> {
    try {
      const user = req.user as any;
      const { id } = req.params;
      const parsedBody = updateTahunPelajaranSchema.parse(req.body);

      const updateTahunPelajaranInput: UpdateTahunPelajaranInput = parsedBody;

      const tahunPelajaran = await tahunPelajaranService.updateTahunPelajaran(
        id,
        updateTahunPelajaranInput,
        user.roleName,
        user.tenantId
      );

      reply.status(200).send({
        success: true,
        message: 'Tahun pelajaran updated successfully',
        data: tahunPelajaran,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Failed to update tahun pelajaran',
        error: error.message,
      });
    }
  }

  async deleteTahunPelajaran(req: any, reply: any): Promise<void> {
    try {
      const user = req.user as any;
      const { id } = req.params;

      await tahunPelajaranService.deleteTahunPelajaran(id, user.roleName, user.tenantId);

      reply.status(200).send({
        success: true,
        message: 'Tahun pelajaran deleted successfully',
      });
    } catch (error: any) {
      const isKnownError = error.message.includes('not found') || 
                          error.message.includes('Tidak dapat menghapus') ||
                          error.message.includes('insufficient permissions');
      
      reply.status(isKnownError ? 400 : 500).send({
        success: false,
        message: error.message || 'Failed to delete tahun pelajaran',
      });
    }
  }

  async getActiveTahunPelajaran(req: any, reply: any): Promise<void> {
    try {
      const user = req.user as any;

      const tahunPelajaran = await tahunPelajaranService.getActiveTahunPelajaranSingle(user.roleName, user.tenantId);

      reply.status(200).send({
        success: true,
        message: 'Active tahun pelajaran retrieved successfully',
        data: tahunPelajaran,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Failed to retrieve active tahun pelajaran',
        error: error.message,
      });
    }
  }

  async setActiveTahunPelajaran(req: any, reply: any): Promise<void> {
    try {
      const user = req.user as any;
      const { id } = req.params;

      const tahunPelajaran = await tahunPelajaranService.setActiveTahunPelajaran(id, user.roleName, user.tenantId);

      reply.status(200).send({
        success: true,
        message: 'Active tahun pelajaran set successfully',
        data: tahunPelajaran,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Failed to set active tahun pelajaran',
        error: error.message,
      });
    }
  }
}

export const tahunPelajaranController = new TahunPelajaranController();

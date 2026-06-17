import { tenantService, CreateTenantInput, UpdateTenantInput } from '../services/tenant.service';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: any;
}

export class TenantController {
  async getAllTenants(request: any, reply: any): Promise<ApiResponse> {
    try {
      const scope = request.dataScope;
      
      // Extract query parameters
      const { page, limit, search } = request.query as {
        page?: string;
        limit?: string;
        search?: string;
      };

      const params = {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        search: search || undefined
      };

      const result = await tenantService.getAllTenants(scope, params);

      return reply.status(200).send({
        success: true,
        message: 'Tenants retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      console.error('Error in getAllTenants:', error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Internal server error',
        data: null,
      });
    }
  }

  async getTenantById(request: any, reply: any): Promise<ApiResponse> {
    try {
      const scope = request.dataScope;
      const { id } = request.params;

      const tenant = await tenantService.getTenantById(scope, id);

      return reply.status(200).send({
        success: true,
        message: 'Tenant retrieved successfully',
        data: tenant,
      });
    } catch (error: any) {
       if (error.message === 'Forbidden') return reply.status(403).send({ success: false, message: 'Forbidden' });
       if (error.message === 'Tenant not found') return reply.status(404).send({ success: false, message: 'Tenant not found' });
       return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async createTenant(request: any, reply: any): Promise<ApiResponse> {
    try {
      const { name } = request.body;
      if (!name) {
        return reply.status(400).send({ success: false, message: 'Name is required' });
      }

      const input: CreateTenantInput = { name };
      const newTenant = await tenantService.createTenant(input);

      return reply.status(201).send({
        success: true,
        message: 'Tenant created successfully',
        data: newTenant,
      });
    } catch (error: any) {
        if (error.message === 'Tenant name already exists') return reply.status(400).send({ success: false, message: error.message });
        return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async updateTenant(request: any, reply: any): Promise<ApiResponse> {
    try {
      const scope = request.dataScope;
      const { id } = request.params;
      const updateData = request.body as UpdateTenantInput;

      const updatedTenant = await tenantService.updateTenant(scope, id, updateData);

      return reply.status(200).send({
        success: true,
        message: 'Tenant updated successfully',
        data: updatedTenant,
      });
    } catch (error: any) {
        if (error.message === 'Forbidden') return reply.status(403).send({ success: false, message: 'Forbidden' });
        if (error.message === 'Tenant not found') return reply.status(404).send({ success: false, message: 'Tenant not found' });
        return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async deleteTenant(request: any, reply: any): Promise<ApiResponse> {
      try {
          const { id } = request.params;
          const { confirmationName, force } = request.body || {};

          if (!confirmationName) {
            return reply.status(400).send({ success: false, message: 'Confirmation name is required' });
          }

          await tenantService.deleteTenant(id, request.user, confirmationName, Boolean(force));
          return reply.status(200).send({ success: true, message: 'Tenant deleted successfully' });
      } catch (error: any) {
          if (error.message === 'Forbidden') {
            return reply.status(403).send({ success: false, message: 'Forbidden' });
          }
          if (error.message === 'Tenant not found') {
            return reply.status(404).send({ success: false, message: 'Tenant not found' });
          }
          if (error.message === 'Invalid confirmation') {
            return reply.status(400).send({ success: false, message: 'Invalid confirmation' });
          }
          if (error.message === 'Cannot delete active tenant without force flag') {
            return reply
              .status(400)
              .send({ success: false, message: 'Cannot delete active tenant without force flag' });
          }
          return reply.status(500).send({ success: false, message: error.message || 'Internal server error' });
      }
  }

  async requestDeletion(request: any, reply: any): Promise<ApiResponse> {
    try {
      const { id } = request.params;
      const result = await tenantService.requestDeletion(id, request.user);
      return reply.status(200).send({ success: true, message: 'Deletion requested', data: result });
    } catch (error: any) {
        if (error.message === 'Forbidden') return reply.status(403).send({ success: false, message: 'Forbidden' });
        if (error.message === 'Tenant not found') return reply.status(404).send({ success: false, message: 'Tenant not found' });
        return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async cancelDeletion(request: any, reply: any): Promise<ApiResponse> {
    try {
      const { id } = request.params;
      const result = await tenantService.cancelDeletion(id, request.user);
      return reply.status(200).send({ success: true, message: 'Deletion cancelled', data: result });
    } catch (error: any) {
        if (error.message === 'Forbidden') return reply.status(403).send({ success: false, message: 'Forbidden' });
        if (error.message === 'Tenant not found') return reply.status(404).send({ success: false, message: 'Tenant not found' });
        if (error.message === 'Tenant is not pending deletion') return reply.status(400).send({ success: false, message: error.message });
        return reply.status(500).send({ success: false, message: error.message });
    }
  }
}

export const tenantController = new TenantController();

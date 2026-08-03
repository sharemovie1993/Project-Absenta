import { guruController } from '../controllers/guru.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { organizationalScopeMiddleware } from '../../../../middlewares/organizationalScope';
import { determineDataScope } from '../../../../middlewares/dataScope';
import { RoleName } from '../../../../constants/enums';
import { authorizationService } from '@/modules/auth/services/authorization.service';

export default async function guruRoutes(fastify: any) {
  // GET /guru - Get all guru
  fastify.get('/', {
    preHandler: [
      requireCapability('academic.teachers.view.list', { exemptRoles: [RoleName.SISWA] }),
      organizationalScopeMiddleware,
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return guruController.getAllGuru(request, reply);
  });

  // GET /guru/me — Profil guru yang sedang login (HARUS sebelum /:id)
  fastify.get('/me', {
    preHandler: [
      requireCapability('academic.teachers.view.detail', { exemptRoles: [RoleName.GURU] }),
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return guruController.getGuruMe(request, reply);
  });

  // GET /guru/:id - Get guru by ID
  fastify.get('/:id', {
    preHandler: [
      requireCapability('academic.teachers.view.detail'),
      organizationalScopeMiddleware,
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return guruController.getGuruById(request, reply);
  });


  // POST /guru - Create new guru
  fastify.post('/', {
    preHandler: [
      requireCapability('academic.teachers.create'),
      organizationalScopeMiddleware,
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return guruController.createGuru(request, reply);
  });

  // PUT /guru/:id - Update guru
  fastify.put('/:id', {
    preHandler: [
      requireCapability('academic.teachers.update', { exemptRoles: [RoleName.GURU, RoleName.ADMIN, RoleName.SUPERADMIN] }),
      organizationalScopeMiddleware,
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return guruController.updateGuru(request, reply);
  });

  // PATCH /guru/:id/max-jp - Proxy update max_jp
  fastify.patch('/:id/max-jp', {
    preHandler: [
      requireCapability(['academic.teachers.update', 'academic.teaching.manage'], { exemptRoles: [RoleName.ADMIN, RoleName.SUPERADMIN] }),
      organizationalScopeMiddleware,
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return guruController.updateGuruMaxJp(request, reply);
  });

  // DELETE /guru/:id - Delete guru
  fastify.delete('/:id', {
    preHandler: [
      requireCapability('academic.teachers.delete'),
      organizationalScopeMiddleware,
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return guruController.deleteGuru(request, reply);
  });

  // GET /guru/export - Export Guru to Excel
  fastify.get('/export', {
    preHandler: [
      requireCapability('academic.teachers.view.list'),
      organizationalScopeMiddleware,
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return guruController.exportToExcel(request, reply);
  });

  // GET /guru/import/template - Download Excel import template
  fastify.get('/import/template', {
    preHandler: [
      requireCapability('academic.teachers.create'),
      organizationalScopeMiddleware,
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return guruController.getImportTemplate(request, reply);
  });

  // POST /guru/import - Import Guru from Excel (xlsx)
  fastify.post('/import', {
    preHandler: [
      requireCapability('academic.teachers.create'),
      organizationalScopeMiddleware,
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return guruController.importFromExcel(request, reply);
  });

  const validateGuruSelfOrAdmin = async (request: any, reply: any) => {
    const user = request.user;
    const roleName = user?.roleName || user?.Role?.name || user?.role?.name;
    const userId = user?.id || user?.userId;
    const { id: targetGuruId } = request.params;

    if (roleName === RoleName.GURU) {
      const isAuthorizedToUpdateOthers = await authorizationService.hasUserPermission(String(userId), 'academic.teachers.update');
      if (isAuthorizedToUpdateOthers) {
        return;
      }

      const guruProfile = await fastify.prisma.guru.findFirst({
        where: { user_id: userId }
      });
      if (!guruProfile || guruProfile.id !== targetGuruId) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          message: 'Forbidden: Anda tidak diperbolehkan mengakses data guru lain'
        });
      }
    }
  };

  // POST /guru/:id/documents - Upload document
  fastify.post('/:id/documents', {
    preHandler: [
      requireCapability(['academic.teachers.update'], { exemptRoles: [RoleName.GURU] }),
      validateGuruSelfOrAdmin,
      organizationalScopeMiddleware
    ]
  }, async (request: any, reply: any) => {
    return guruController.uploadGuruDocument(request, reply);
  });

  // GET /guru/:id/documents - List documents
  fastify.get('/:id/documents', {
    preHandler: [
      requireCapability('academic.teachers.view.detail', { exemptRoles: [RoleName.GURU] }),
      validateGuruSelfOrAdmin,
      organizationalScopeMiddleware
    ]
  }, async (request: any, reply: any) => {
    return guruController.getGuruDocuments(request, reply);
  });

  // GET /guru/:id/documents/:docId/download - Download single document
  fastify.get('/:id/documents/:docId/download', {
    preHandler: [
      requireCapability('academic.teachers.view.detail', { exemptRoles: [RoleName.GURU] }),
      validateGuruSelfOrAdmin,
      organizationalScopeMiddleware
    ]
  }, async (request: any, reply: any) => {
    return guruController.downloadGuruDocument(request, reply);
  });

  // DELETE /guru/:id/documents/:docId - Delete document
  fastify.delete('/:id/documents/:docId', {
    preHandler: [
      requireCapability(['academic.teachers.update'], { exemptRoles: [RoleName.GURU] }),
      validateGuruSelfOrAdmin,
      organizationalScopeMiddleware
    ]
  }, async (request: any, reply: any) => {
    return guruController.deleteGuruDocument(request, reply);
  });
}


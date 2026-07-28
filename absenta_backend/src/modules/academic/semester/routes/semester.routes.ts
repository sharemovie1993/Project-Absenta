import { semesterController } from '../controllers/semester.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';

export default async function semesterRoutes(fastify: any) {
  fastify.get(
    '/',
    {
      preHandler: [requireCapability('academic.semesters.view.list')]
    },
    async (request: any, reply: any) => {
      return semesterController.getAllSemester(request, reply);
    }
  );

  fastify.get(
    '/active',
    {
      preHandler: [requireCapability('academic.semesters.view.list')]
    },
    async (request: any, reply: any) => {
      return semesterController.getActiveSemester(request, reply);
    }
  );

  fastify.get(
    '/tahun-pelajaran/:tahunPelajaranId',
    {
      preHandler: [requireCapability('academic.semesters.view.list')]
    },
    async (request: any, reply: any) => {
      return semesterController.getSemesterByTahunPelajaran(request, reply);
    }
  );

  fastify.get(
    '/:id',
    {
      preHandler: [requireCapability('academic.semesters.view.detail')]
    },
    async (request: any, reply: any) => {
      return semesterController.getSemesterById(request, reply);
    }
  );

  fastify.post(
    '/',
    {
      preHandler: [requireCapability('academic.semesters.create')]
    },
    async (request: any, reply: any) => {
      return semesterController.createSemester(request, reply);
    }
  );

  fastify.put(
    '/:id',
    {
      preHandler: [requireCapability('academic.semesters.update')]
    },
    async (request: any, reply: any) => {
      return semesterController.updateSemester(request, reply);
    }
  );

  fastify.put(
    '/:id/activate',
    {
      preHandler: [requireCapability('academic.semesters.update')]
    },
    async (request: any, reply: any) => {
      return semesterController.setActiveSemester(request, reply);
    }
  );

  fastify.put(
    '/:id/deactivate',
    {
      preHandler: [requireCapability('academic.semesters.update')]
    },
    async (request: any, reply: any) => {
      return semesterController.deactivateSemester(request, reply);
    }
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [requireCapability('academic.semesters.delete')]
    },
    async (request: any, reply: any) => {
      return semesterController.deleteSemester(request, reply);
    }
  );
}

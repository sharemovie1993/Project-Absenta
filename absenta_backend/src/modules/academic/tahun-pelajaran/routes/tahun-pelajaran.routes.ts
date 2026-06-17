import { tahunPelajaranController } from '../controllers/tahun-pelajaran.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { determineDataScope } from '../../../../middlewares/dataScope';

export default async function tahunPelajaranRoutes(fastify: any) {
  fastify.get(
    '/',
    {
      preHandler: [
        requireCapability('academic.years.view.list'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return tahunPelajaranController.getAllTahunPelajaran(request, reply);
    }
  );

  fastify.get(
    '/active',
    {
      preHandler: [
        requireCapability('academic.years.view.list'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return tahunPelajaranController.getActiveTahunPelajaran(request, reply);
    }
  );

  fastify.get(
    '/:id',
    {
      preHandler: [
        requireCapability('academic.years.view.detail'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return tahunPelajaranController.getTahunPelajaranById(request, reply);
    }
  );

  fastify.post(
    '/',
    {
      preHandler: [
        requireCapability('academic.years.create'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return tahunPelajaranController.createTahunPelajaran(request, reply);
    }
  );

  fastify.put(
    '/:id',
    {
      preHandler: [
        requireCapability('academic.years.update'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return tahunPelajaranController.updateTahunPelajaran(request, reply);
    }
  );

  fastify.put(
    '/:id/activate',
    {
      preHandler: [
        requireCapability('academic.years.update'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return tahunPelajaranController.setActiveTahunPelajaran(request, reply);
    }
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [
        requireCapability('academic.years.delete'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return tahunPelajaranController.deleteTahunPelajaran(request, reply);
    }
  );
}

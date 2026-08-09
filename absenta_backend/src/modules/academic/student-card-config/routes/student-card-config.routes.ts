import { studentCardConfigController } from '../controllers/student-card-config.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';


export async function studentCardConfigRoutes(fastify: any) {
  fastify.get(
    '/',
    {
      preHandler: [
        async (request: any, reply: any) => {
          const role = request.user?.roleName || request.user?.role?.name;
          if (role === 'SISWA' || role === 'GURU') {
            return;
          }
          await requireCapability("academic.student.card.view.config")(request, reply);
        },
    determineDataScope(),
  ],
    },
    studentCardConfigController.getConfig.bind(studentCardConfigController)
  );

  fastify.put(
    '/',
    {
      preHandler: [requireCapability("academic.student.card.update.config"), determineDataScope()], // Using manage_siswa as proxy for edit config
    },
    studentCardConfigController.upsertConfig.bind(studentCardConfigController)
  );
}

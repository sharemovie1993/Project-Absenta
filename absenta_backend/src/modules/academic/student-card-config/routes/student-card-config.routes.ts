import { studentCardConfigController } from '../controllers/student-card-config.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';


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
        }
      ],
    },
    studentCardConfigController.getConfig.bind(studentCardConfigController)
  );

  fastify.put(
    '/',
    {
      preHandler: [requireCapability("academic.student.card.update.config")], // Using manage_siswa as proxy for edit config
    },
    studentCardConfigController.upsertConfig.bind(studentCardConfigController)
  );
}

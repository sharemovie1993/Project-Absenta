import { studentCardConfigController } from '../controllers/student-card-config.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';


export async function studentCardConfigRoutes(fastify: any) {
  fastify.get(
    '/',
    {
      preHandler: [requireCapability("academic.student.card.view.config")],
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

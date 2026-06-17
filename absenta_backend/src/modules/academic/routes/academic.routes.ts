import guruRoutes from '../guru/routes/guru.routes';
import guruMapelRoutes from '../guru-mapel/routes/guru-mapel.routes';
import siswaRoutes from '../siswa/routes/siswa.routes';
import kelasRoutes from '../kelas/routes/kelas.routes';
import mapelRoutes from '../mapel/routes/mapel.routes';
import tahunPelajaranRoutes from '../tahun-pelajaran/routes/tahun-pelajaran.routes';
import semesterRoutes from '../semester/routes/semester.routes';
import jurusanRoutes from '../jurusan/routes/jurusan.routes';
import { waliKelasRoutes } from '../wali-kelas/routes/wali-kelas.routes';
import kenaikanKelasRoutes from '../kenaikan-kelas/routes/kenaikan-kelas.routes';
import jenisKegiatanMasterRoutes from '../jenis-kegiatan-master/routes/jenis-kegiatan-master.routes';
import transitionRoutes from '../transition/routes/transition.routes';
import strukturOrganisasiRoutes from '../struktur-organisasi/routes/struktur-organisasi.routes';
import { backupRoutes } from '../backup/routes/backup.routes';
import { studentCardConfigRoutes } from '../student-card-config/routes/student-card-config.routes';
import { organizationalRoutes } from '../organizational/routes/organizational.routes';
import { AcademicStatsController } from '../controllers/academic-stats.controller';
import { UniversalSearchController } from '../controllers/universal-search.controller';
import { determineDataScope } from '../../../middlewares/dataScope';
import { organizationalScopeMiddleware } from '../../../middlewares/organizationalScope';
import { requireCapability } from '../../../middlewares/requireCapability';

export async function academicRoutes(fastify: any) {
  await fastify.register(guruRoutes, { prefix: '/guru' });
  await fastify.register(guruMapelRoutes, { prefix: '/guru-mapel' });
  await fastify.register(siswaRoutes, { prefix: '/siswa' });
  await fastify.register(kelasRoutes, { prefix: '/kelas' });
  await fastify.register(mapelRoutes, { prefix: '/mapel' });
  await fastify.register(tahunPelajaranRoutes, { prefix: '/tahun-pelajaran' });
  await fastify.register(semesterRoutes, { prefix: '/semester' });
  await fastify.register(jurusanRoutes, { prefix: '/jurusan' });
  await fastify.register(waliKelasRoutes, { prefix: '/wali-kelas' });
  await fastify.register(kenaikanKelasRoutes, { prefix: '/kenaikan-kelas' });
  await fastify.register(jenisKegiatanMasterRoutes, { prefix: '/jenis-kegiatan-master' });
  await fastify.register(transitionRoutes, { prefix: '/transition' });
  await fastify.register(strukturOrganisasiRoutes, { prefix: '/struktur-organisasi' });
  await fastify.register(organizationalRoutes);
  await fastify.register(backupRoutes, { prefix: '/backup' });
  await fastify.register(studentCardConfigRoutes, { prefix: '/student-card-config' });

  const academicStatsController = new AcademicStatsController();
  const universalSearchController = new UniversalSearchController();

  // --- UNIVERSAL SEARCH (One Door) ---
  fastify.get(
    '/universal-search',
    {
      preHandler: [organizationalScopeMiddleware]
    },
    universalSearchController.search.bind(universalSearchController)
  );

  fastify.get(
    '/stats',
    {
      preHandler: [requireCapability(['academic.teaching.rekap', 'dashboard.view.overview']), determineDataScope()],
      schema: {
        description: 'Get academic statistics',
        tags: ['Academic'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  total_jurusan: { type: 'number' },
                  total_kelas: { type: 'number' },
                  total_siswa: { type: 'number' },
                  total_guru: { type: 'number' },
                  total_mapel: { type: 'number' },
                  total_semester: { type: 'number' },
                  total_tahun_pelajaran: { type: 'number' }
                }
              }
            }
          }
        }
      }
    },
    academicStatsController.getAcademicStats.bind(academicStatsController)
  );
}

import { prisma } from '@/utils/prisma';

export class RekapKBMController {
  /**
   * GET /kurikulum/rekap-kbm
   * Rekap jam mengajar per guru: rencana JP vs terlaksana (dari sesi absensi)
   */
  static async getAll(request: any, reply: any) {
    try {
      const { semester_id, tahun_pelajaran_id } = request.query as {
        semester_id?: string;
        tahun_pelajaran_id?: string;
      };
      const tenantId = request.tenantId;

      // Ambil data guru-mapel (penugasan mengajar)
      const guruMapelWhere: any = { tenant_id: tenantId };
      if (semester_id) guruMapelWhere.semester_id = semester_id;
      if (tahun_pelajaran_id) guruMapelWhere.tahun_pelajaran_id = tahun_pelajaran_id;

      const guruMapelList = await prisma.guruMapel.findMany({
        where: guruMapelWhere,
        include: {
          Guru: { select: { id: true, nama_guru: true, nip: true } },
          Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
          Kelas: { select: { id: true, nama_kelas: true } },
        }
      });

      // Agregasi per guru
      const guruMap: Record<string, any> = {};

      for (const gm of guruMapelList) {
        const guruId = gm.guru_id;
        if (!guruMap[guruId]) {
          guruMap[guruId] = {
            guru_id: guruId,
            nama_guru: gm.Guru?.nama_guru ?? '-',
            nip: gm.Guru?.nip ?? '-',
            total_jp_rencana: 0,
            detail_kelas: [],
          };
        }
        guruMap[guruId].total_jp_rencana += (gm as any).jp_per_minggu ?? 0;
        guruMap[guruId].detail_kelas.push({
          kelas: gm.Kelas?.nama_kelas ?? '-',
          mapel: gm.Mapel?.nama_mapel ?? '-',
          jp_per_minggu: (gm as any).jp_per_minggu ?? 0,
        });
      }

      // Hitung JP terlaksana dari sesi absensi yang sudah selesai
      const sesiWhere: any = { tenant_id: tenantId, status: 'CLOSED' };
      if (semester_id) sesiWhere.semester_id = semester_id;

      const sesiList = await prisma.sesiAbsensi.findMany({
        where: sesiWhere,
        select: { guru_id: true, jp: true }
      });

      // Aggregate JP terlaksana per guru
      const jpTerlaksana: Record<string, number> = {};
      for (const sesi of sesiList) {
        if (!sesi.guru_id) continue;
        jpTerlaksana[sesi.guru_id] = (jpTerlaksana[sesi.guru_id] || 0) + ((sesi as any).jp ?? 1);
      }

      // Gabungkan data
      const result = Object.values(guruMap).map((guru: any) => ({
        ...guru,
        jp_terlaksana: jpTerlaksana[guru.guru_id] ?? 0,
        jp_sisa: Math.max(0, guru.total_jp_rencana - (jpTerlaksana[guru.guru_id] ?? 0)),
        persentase: guru.total_jp_rencana > 0
          ? Math.round(((jpTerlaksana[guru.guru_id] ?? 0) / guru.total_jp_rencana) * 100)
          : 0,
      }));

      return reply.send({
        data: result,
        meta: {
          total_guru: result.length,
          total_jp_rencana: result.reduce((a, g) => a + g.total_jp_rencana, 0),
          total_jp_terlaksana: result.reduce((a, g) => a + g.jp_terlaksana, 0),
        }
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Gagal mengambil data rekap KBM.' });
    }
  }
}

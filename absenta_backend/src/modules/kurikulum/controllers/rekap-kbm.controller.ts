import { prisma } from '@/utils/prisma';
import { CacheService } from '@/utils/cache.service';
import { CACHE_KEYS } from '@/constants/cache-keys';

const cacheService = CacheService.getInstance();

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

      const cacheKey = CACHE_KEYS.ACADEMIC.REKAP_KBM_GURU(tenantId, tahun_pelajaran_id, semester_id);
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) return reply.send(cached);

      // 1. Ambil data JadwalKBM untuk memetakan penugasan mengajar riil di kelas
      const templates = await prisma.jadwalKBM.findMany({
        where: {
          tenant_id: tenantId,
          tahun_pelajaran_id: tahun_pelajaran_id || undefined,
          semester_id: semester_id || undefined,
          guru_id: { not: null },
          mapel_id: { not: null },
        },
        include: {
          Guru: { select: { id: true, nama_guru: true, nip: true } },
          Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
          Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
        }
      });

      // 2. Ambil data StrukturKurikulum untuk alokasi JP per minggu
      const strukturList = await prisma.strukturKurikulum.findMany({
        where: {
          tenant_id: tenantId,
          tahun_pelajaran_id: tahun_pelajaran_id || undefined,
        },
        select: {
          mapel_id: true,
          tingkat: true,
          jp_per_minggu: true,
        }
      });

      // Map struktur: "mapelId_tingkat" -> jp_per_minggu
      const strukturMap = new Map<string, number>();
      for (const st of strukturList) {
        strukturMap.set(`${st.mapel_id}_${st.tingkat}`, st.jp_per_minggu);
      }

      // Agregasi per guru
      const guruMap: Record<string, any> = {};
      const uniqueAssignments = new Set<string>();

      for (const t of templates) {
        if (!t.Guru || !t.Mapel || !t.Kelas) continue;

        const guruId = t.Guru.id;
        const mapelId = t.Mapel.id;
        const kelasId = t.Kelas.id;
        const assignmentKey = `${guruId}_${mapelId}_${kelasId}`;

        if (!guruMap[guruId]) {
          guruMap[guruId] = {
            guru_id: guruId,
            nama_guru: t.Guru.nama_guru ?? '-',
            nip: t.Guru.nip ?? '-',
            total_jp_rencana: 0,
            total_jp_dijadwalkan: 0,
            detail_kelas: [],
          };
        }

        // Each template is exactly 1 JP slot
        guruMap[guruId].total_jp_dijadwalkan += 1;

        if (!uniqueAssignments.has(assignmentKey)) {
          uniqueAssignments.add(assignmentKey);

          // Ambil JP dari StrukturKurikulum berdasarkan mapel & tingkat kelas
          const jp = strukturMap.get(`${mapelId}_${t.Kelas.tingkat}`) ?? 2; // Default 2 JP jika tidak diatur

          guruMap[guruId].total_jp_rencana += jp;
          guruMap[guruId].detail_kelas.push({
            kelas: t.Kelas.nama_kelas ?? '-',
            mapel: t.Mapel.nama_mapel ?? '-',
            jp_per_minggu: jp,
          });
        }
      }

      // 3. Hitung JP terlaksana dari sesi absensi yang sudah selesai
      const sesiWhere: any = { tenant_id: tenantId, status: 'CLOSED' };
      if (semester_id) sesiWhere.semester_id = semester_id;
      if (tahun_pelajaran_id) sesiWhere.tahun_pelajaran_id = tahun_pelajaran_id;

      const sesiList = await prisma.sesiAbsensi.findMany({
        where: sesiWhere,
        select: { guru_id: true, slot_kbm: true }
      });

      // Aggregate JP terlaksana per guru
      const jpTerlaksana: Record<string, number> = {};
      for (const sesi of sesiList) {
        if (!sesi.guru_id) continue;
        jpTerlaksana[sesi.guru_id] = (jpTerlaksana[sesi.guru_id] || 0) + (sesi.slot_kbm ?? 1);
      }

      // 4. Gabungkan data
      const result = Object.values(guruMap).map((guru: any) => ({
        ...guru,
        jp_dijadwalkan: guru.total_jp_dijadwalkan ?? 0,
        jp_terlaksana: jpTerlaksana[guru.guru_id] ?? 0,
        jp_sisa: Math.max(0, guru.total_jp_rencana - (jpTerlaksana[guru.guru_id] ?? 0)),
        persentase: guru.total_jp_rencana > 0
          ? Math.round(((jpTerlaksana[guru.guru_id] ?? 0) / guru.total_jp_rencana) * 100)
          : 0,
      }));

      const payload = {
        data: result,
        meta: {
          total_guru: result.length,
          total_jp_rencana: result.reduce((a, g) => a + g.total_jp_rencana, 0),
          total_jp_terlaksana: result.reduce((a, g) => a + g.jp_terlaksana, 0),
        }
      };

      await cacheService.set(cacheKey, payload, 300);
      return reply.send(payload);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Gagal mengambil data rekap KBM.' });
    }
  }
}

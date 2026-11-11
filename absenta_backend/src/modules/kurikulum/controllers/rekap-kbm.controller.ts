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

      // 1. Ambil data JadwalKBM untuk memetakan penugasan mengajar SK Resmi vs Pelaksana Riil di kelas
      const templates: any[] = await (prisma.jadwalKBM as any).findMany({
        where: {
          tenant_id: tenantId,
          tahun_pelajaran_id: tahun_pelajaran_id || undefined,
          semester_id: semester_id || undefined,
          guru_id: { not: null },
          mapel_id: { not: null },
        },
        include: {
          Guru: { select: { id: true, nama_guru: true, nip: true } },
          GuruPelaksana: { select: { id: true, nama_guru: true, nip: true } },
          UnitPengajaran: {
            select: {
              id: true,
              nama_unit: true,
              guru_id: true,
              jp_alokasi: true,
              Guru: { select: { id: true, nama_guru: true, nip: true } },
            },
          },
          Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
          Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
        },
      });

      // 1b. Ambil data GuruMapel + UnitPengajaran untuk memastikan seluruh penugasan & unit kolaborasi tercakup
      const guruMapelList: any[] = await (prisma.guruMapel as any).findMany({
        where: {
          tenant_id: tenantId,
          tahun_pelajaran_id: tahun_pelajaran_id || undefined,
          semester_id: semester_id || undefined,
        },
        include: {
          Guru: { select: { id: true, nama_guru: true, nip: true } },
          Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
          Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
          UnitPengajaran: {
            where: { is_active: true },
            include: { Guru: { select: { id: true, nama_guru: true, nip: true } } },
          },
        },
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
        },
      });

      // Map struktur: "mapelId_tingkat" -> jp_per_minggu
      const strukturMap = new Map<string, number>();
      for (const st of strukturList) {
        strukturMap.set(`${st.mapel_id}_${st.tingkat}`, st.jp_per_minggu);
      }

      // Agregasi per guru (membedakan JTM SK Resmi Dapodik vs JTM Riil Lapangan)
      const guruMap: Record<string, any> = {};
      const ensureGuruBucket = (guruObj: { id: string; nama_guru?: string | null; nip?: string | null }) => {
        if (!guruMap[guruObj.id]) {
          guruMap[guruObj.id] = {
            guru_id: guruObj.id,
            nama_guru: guruObj.nama_guru ?? '-',
            nip: guruObj.nip ?? '-',
            total_jp_rencana: 0,
            total_jp_sk_resmi: 0,
            total_jp_dijadwalkan: 0,
            total_jp_delegasi_keluar: 0,
            total_jp_delegasi_masuk: 0,
            detail_kelas: [],
          };
        }
        return guruMap[guruObj.id];
      };

      const uniqueRealAssignments = new Set<string>();
      const uniqueSkAssignments = new Set<string>();

      // Proses JadwalKBM
      for (const t of templates) {
        if (!t.Guru || !t.Mapel || !t.Kelas) continue;

        const skGuru = t.UnitPengajaran?.Guru || t.Guru;
        const effectiveGuru = t.GuruPelaksana || t.UnitPengajaran?.Guru || t.Guru;
        const mapelId = t.Mapel.id;
        const kelasId = t.Kelas.id;
        const unitId = t.unit_pengajaran_id || 'single';
        const isDelegated = Boolean(t.guru_pelaksana_id && t.guru_pelaksana_id !== skGuru.id);

        const skBucket = ensureGuruBucket(skGuru);
        const effBucket = ensureGuruBucket(effectiveGuru);

        // JTM SK Resmi dihitung pada pemilik SK / Unit
        skBucket.total_jp_sk_resmi += 1;
        // JTM Riil Lapangan dihitung pada Effective Teacher
        effBucket.total_jp_dijadwalkan += 1;

        if (isDelegated) {
          skBucket.total_jp_delegasi_keluar += 1;
          effBucket.total_jp_delegasi_masuk += 1;
        }

        const jpUnit = t.UnitPengajaran?.jp_alokasi ?? strukturMap.get(`${mapelId}_${t.Kelas.tingkat}`) ?? 2;

        const skKey = `${skGuru.id}_${mapelId}_${kelasId}_${unitId}`;
        if (!uniqueSkAssignments.has(skKey)) {
          uniqueSkAssignments.add(skKey);
        }

        const realKey = `${effectiveGuru.id}_${mapelId}_${kelasId}_${unitId}`;
        if (!uniqueRealAssignments.has(realKey)) {
          uniqueRealAssignments.add(realKey);
          effBucket.total_jp_rencana += jpUnit;
          effBucket.detail_kelas.push({
            kelas: t.Kelas.nama_kelas ?? '-',
            mapel: t.Mapel.nama_mapel ?? '-',
            nama_unit: t.UnitPengajaran?.nama_unit || null,
            jp_per_minggu: jpUnit,
            is_delegasi: isDelegated,
            guru_sk: skGuru.nama_guru ?? '-',
          });
        }
      }

      // Proses GuruMapel & UnitPengajaran untuk melengkapi penugasan yang belum masuk slot jadwal
      for (const gm of guruMapelList) {
        if (!gm.Mapel || !gm.Kelas) continue;
        const units: any[] = Array.isArray(gm.UnitPengajaran) && gm.UnitPengajaran.length > 0
          ? gm.UnitPengajaran
          : (gm.Guru ? [{ id: 'single', guru_id: gm.Guru.id, Guru: gm.Guru, nama_unit: null, jp_alokasi: gm.alokasi_jam }] : []);

        for (const u of units) {
          const uGuru = u.Guru || gm.Guru;
          if (!uGuru) continue;
          const bucket = ensureGuruBucket(uGuru);
          const assignmentKey = `${uGuru.id}_${gm.Mapel.id}_${gm.Kelas.id}_${u.id || 'single'}`;
          if (!uniqueRealAssignments.has(assignmentKey)) {
            uniqueRealAssignments.add(assignmentKey);
            const jp = u.jp_alokasi ?? strukturMap.get(`${gm.Mapel.id}_${gm.Kelas.tingkat}`) ?? 2;
            bucket.total_jp_rencana += jp;
            if (!uniqueSkAssignments.has(assignmentKey)) {
              uniqueSkAssignments.add(assignmentKey);
            }
            bucket.detail_kelas.push({
              kelas: gm.Kelas.nama_kelas ?? '-',
              mapel: gm.Mapel.nama_mapel ?? '-',
              nama_unit: u.nama_unit || null,
              jp_per_minggu: jp,
              is_delegasi: false,
              guru_sk: gm.Guru?.nama_guru ?? uGuru.nama_guru ?? '-',
            });
          }
        }
      }

      // 3. Hitung JP terlaksana riil dari sesi absensi yang sudah selesai (atribusi ke Pelaksana Riil jika delegasi)
      const sesiWhere: any = { tenant_id: tenantId, status: { in: ['CLOSED', 'SELESAI'] } };
      if (semester_id) sesiWhere.semester_id = semester_id;
      if (tahun_pelajaran_id) sesiWhere.tahun_pelajaran_id = tahun_pelajaran_id;

      const sesiList: any[] = await (prisma.sesiAbsensi as any).findMany({
        where: sesiWhere,
        select: { guru_id: true, guru_pelaksana_id: true, slot_kbm: true },
      });

      // Aggregate JP terlaksana per Effective Teacher
      const jpTerlaksana: Record<string, number> = {};
      for (const sesi of sesiList) {
        const execGuruId = sesi.guru_pelaksana_id || sesi.guru_id;
        if (!execGuruId) continue;
        jpTerlaksana[execGuruId] = (jpTerlaksana[execGuruId] || 0) + (sesi.slot_kbm ?? 1);
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

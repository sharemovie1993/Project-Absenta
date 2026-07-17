import { prisma } from '@/utils/prisma';

export class KalenderAkademikController {
  // GET /kurikulum/kalender?tahun_pelajaran_id=xxx
  static async getAll(request: any, reply: any) {
    try {
      const { tahun_pelajaran_id } = request.query as { tahun_pelajaran_id?: string };
      const tenantId = request.tenantId;

      const where: any = { tenant_id: tenantId };
      if (tahun_pelajaran_id) where.tahun_pelajaran_id = tahun_pelajaran_id;

      const events = await prisma.kalenderAkademik.findMany({
        where,
        orderBy: { tanggal_mulai: 'asc' },
        include: {
          TahunPelajaran: { select: { id: true, tahun: true } },
          CreatedBy: { select: { full_name: true } }
        }
      });

      return reply.send({ data: events });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Gagal mengambil data kalender akademik.' });
    }
  }

  // GET /kurikulum/kalender/stats
  static async getStats(request: any, reply: any) {
    try {
      const { tahun_pelajaran_id } = request.query as { tahun_pelajaran_id?: string };
      const tenantId = request.tenantId;

      const where: any = { tenant_id: tenantId };
      if (tahun_pelajaran_id) where.tahun_pelajaran_id = tahun_pelajaran_id;

      const events = await prisma.kalenderAkademik.findMany({ where });

      const countDays = (evts: any[]) =>
        evts.reduce((acc, e) => {
          const diff = Math.ceil((new Date(e.tanggal_selesai).getTime() - new Date(e.tanggal_mulai).getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return acc + Math.max(diff, 1);
        }, 0);

      const libur = events.filter(e => ['LIBUR_NASIONAL', 'LIBUR_SEKOLAH'].includes(e.jenis));
      const ujian = events.filter(e => ['PTS', 'PAS'].includes(e.jenis));
      const kegiatan = events.filter(e => e.jenis === 'KEGIATAN');
      const efektif = events.filter(e => e.jenis === 'MINGGU_EFEKTIF');

      return reply.send({
        data: {
          total_events: events.length,
          hari_libur: countDays(libur),
          hari_ujian: countDays(ujian),
          hari_kegiatan: countDays(kegiatan),
          minggu_efektif: efektif.length,
          events_by_jenis: events.reduce((acc: any, e) => {
            acc[e.jenis] = (acc[e.jenis] || 0) + 1;
            return acc;
          }, {})
        }
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Gagal mengambil statistik kalender.' });
    }
  }

  // POST /kurikulum/kalender
  static async create(request: any, reply: any) {
    try {
      const body = request.body as any;
      const tenantId = request.tenantId;
      const userId = request.user?.id ?? request.user?.userId;

      const event = await prisma.kalenderAkademik.create({
        data: {
          tenant_id: tenantId,
          tahun_pelajaran_id: body.tahun_pelajaran_id,
          judul: body.judul,
          jenis: body.jenis,
          tanggal_mulai: new Date(body.tanggal_mulai),
          tanggal_selesai: new Date(body.tanggal_selesai),
          keterangan: body.keterangan ?? null,
          created_by: userId ?? null,
        },
        include: {
          TahunPelajaran: { select: { id: true, tahun: true } },
          CreatedBy: { select: { full_name: true } }
        }
      });

      return reply.status(201).send({ data: event, message: 'Event kalender berhasil ditambahkan.' });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Gagal menyimpan event kalender.' });
    }
  }

  // PUT /kurikulum/kalender/:id
  static async update(request: any, reply: any) {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;
      const tenantId = request.tenantId;

      const existing = await prisma.kalenderAkademik.findFirst({ where: { id, tenant_id: tenantId } });
      if (!existing) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Event tidak ditemukan.' });

      const updated = await prisma.kalenderAkademik.update({
        where: { id },
        data: {
          judul: body.judul ?? existing.judul,
          jenis: body.jenis ?? existing.jenis,
          tanggal_mulai: body.tanggal_mulai ? new Date(body.tanggal_mulai) : existing.tanggal_mulai,
          tanggal_selesai: body.tanggal_selesai ? new Date(body.tanggal_selesai) : existing.tanggal_selesai,
          keterangan: body.keterangan !== undefined ? body.keterangan : existing.keterangan,
        }
      });

      return reply.send({ data: updated, message: 'Event kalender berhasil diperbarui.' });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Gagal memperbarui event kalender.' });
    }
  }

  // DELETE /kurikulum/kalender/:id
  static async delete(request: any, reply: any) {
    try {
      const { id } = request.params as { id: string };
      const tenantId = request.tenantId;

      const existing = await prisma.kalenderAkademik.findFirst({ where: { id, tenant_id: tenantId } });
      if (!existing) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Event tidak ditemukan.' });

      await prisma.kalenderAkademik.delete({ where: { id } });
      return reply.send({ message: 'Event kalender berhasil dihapus.' });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Gagal menghapus event kalender.' });
    }
  }

  // GET /kurikulum/kalender/presets
  static async getPresets(request: any, reply: any) {
    try {
      const { jenjang } = request.query as { jenjang?: string };
      const where: any = {};
      
      if (jenjang) {
        where.OR = [
          { jenjang: 'ALL' },
          { jenjang: jenjang.toUpperCase() }
        ];
      }

      const presets = await prisma.globalCalendarPreset.findMany({
        where,
        orderBy: { judul: 'asc' }
      });
      return reply.send({ data: presets });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Gagal mengambil data preset kalender.' });
    }
  }

  // POST /kurikulum/kalender/presets (Superadmin only)
  static async createPreset(request: any, reply: any) {
    try {
      const body = request.body as any;
      if (!body.judul || !body.jenis) {
        return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Judul dan Jenis preset wajib diisi.' });
      }

      const preset = await prisma.globalCalendarPreset.create({
        data: {
          jenjang: body.jenjang ? body.jenjang.toUpperCase() : 'ALL',
          judul: body.judul,
          jenis: body.jenis,
          keterangan: body.keterangan ?? null
        }
      });
      return reply.status(201).send({ data: preset, message: 'Preset kalender berhasil ditambahkan.' });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Gagal menambahkan preset kalender.' });
    }
  }

  // PUT /kurikulum/kalender/presets/:id (Superadmin only)
  static async updatePreset(request: any, reply: any) {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const existing = await prisma.globalCalendarPreset.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Preset tidak ditemukan.' });

      const updated = await prisma.globalCalendarPreset.update({
        where: { id },
        data: {
          jenjang: body.jenjang ? body.jenjang.toUpperCase() : existing.jenjang,
          judul: body.judul ?? existing.judul,
          jenis: body.jenis ?? existing.jenis,
          keterangan: body.keterangan !== undefined ? body.keterangan : existing.keterangan
        }
      });
      return reply.send({ data: updated, message: 'Preset kalender berhasil diperbarui.' });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Gagal memperbarui preset kalender.' });
    }
  }

  // DELETE /kurikulum/kalender/presets/:id (Superadmin only)
  static async deletePreset(request: any, reply: any) {
    try {
      const { id } = request.params as { id: string };

      const existing = await prisma.globalCalendarPreset.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Preset tidak ditemukan.' });

      await prisma.globalCalendarPreset.delete({ where: { id } });
      return reply.send({ message: 'Preset kalender berhasil dihapus.' });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Gagal menghapus preset kalender.' });
    }
  }
}

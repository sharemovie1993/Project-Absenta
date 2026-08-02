import { prisma } from '../../../utils/prisma';
import { cacheInvalidationService } from '../../../utils/cache-invalidation.service';

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

      // Calculate dynamic minggu efektif based on tenant school days configuration
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { hari_sekolah: true }
      });
      const activeSchoolDays = (tenant?.hari_sekolah as string[]) || ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'];
      const daysPerWeek = activeSchoolDays.length || 5;

      let calculated_minggu_efektif = efektif.length; // Fallback to raw events count
      if (tahun_pelajaran_id) {
        const tp = await prisma.tahunPelajaran.findUnique({
          where: { id: tahun_pelajaran_id },
          select: { tahun: true }
        });
        if (tp) {
          const parts = tp.tahun.split(/[\/\-]/);
          const year1 = parseInt(parts[0]);
          const year2 = parts[1] ? parseInt(parts[1]) : year1 + 1;

          if (!isNaN(year1)) {
            const start = new Date(`${year1}-07-01T00:00:00.000Z`);
            const end = new Date(`${year2}-06-30T23:59:59.999Z`);
            const DAY_NAMES_LIST = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
            
            const holidayRanges = [...libur, ...ujian].map(e => ({
              start: new Date(e.tanggal_mulai).getTime(),
              end: new Date(e.tanggal_selesai).getTime()
            }));

            let effectiveDaysS1 = 0;
            let effectiveDaysS2 = 0;
            const curr = new Date(start);
            while (curr <= end) {
              const dayName = DAY_NAMES_LIST[curr.getDay()];
              const isSchoolDay = activeSchoolDays.includes(dayName);
              
              if (isSchoolDay) {
                const t = curr.getTime();
                const isHoliday = holidayRanges.some(h => t >= h.start && t <= h.end);
                if (!isHoliday) {
                  const m = curr.getMonth(); // 0-indexed (0: Jan, 11: Dec)
                  if (m >= 6 && m <= 11) {
                    effectiveDaysS1++;
                  } else {
                    effectiveDaysS2++;
                  }
                }
              }
              curr.setDate(curr.getDate() + 1);
            }

            const calculated_minggu_efektif_s1 = Math.max(0, Math.floor(effectiveDaysS1 / daysPerWeek));
            const calculated_minggu_efektif_s2 = Math.max(0, Math.floor(effectiveDaysS2 / daysPerWeek));
            calculated_minggu_efektif = calculated_minggu_efektif_s1 + calculated_minggu_efektif_s2;

            return reply.send({
              data: {
                total_events: events.length,
                hari_libur: countDays(libur),
                hari_ujian: countDays(ujian),
                hari_kegiatan: countDays(kegiatan),
                minggu_efektif: efektif.length,
                calculated_minggu_efektif,
                calculated_minggu_efektif_s1,
                calculated_minggu_efektif_s2,
                events_by_jenis: events.reduce((acc: any, e) => {
                  acc[e.jenis] = (acc[e.jenis] || 0) + 1;
                  return acc;
                }, {})
              }
            });
          }
        }
      }

      return reply.send({
        data: {
          total_events: events.length,
          hari_libur: countDays(libur),
          hari_ujian: countDays(ujian),
          hari_kegiatan: countDays(kegiatan),
          minggu_efektif: efektif.length,
          calculated_minggu_efektif,
          calculated_minggu_efektif_s1: 0,
          calculated_minggu_efektif_s2: 0,
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

      if (tenantId) {
        await cacheInvalidationService.invalidateAcademicCache(tenantId);
        await cacheInvalidationService.invalidateAttendanceCache(tenantId);
      }

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

      if (tenantId) {
        await cacheInvalidationService.invalidateAcademicCache(tenantId);
        await cacheInvalidationService.invalidateAttendanceCache(tenantId);
      }

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

      if (tenantId) {
        await cacheInvalidationService.invalidateAcademicCache(tenantId);
        await cacheInvalidationService.invalidateAttendanceCache(tenantId);
      }

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

  // POST /kurikulum/kalender/bulk-seed
  static async bulkSeed(request: any, reply: any) {
    try {
      const { tahun_pelajaran_id } = request.body as { tahun_pelajaran_id?: string };
      const tenantId = request.tenantId;
      const userId = request.user?.id ?? request.user?.userId;

      if (!tahun_pelajaran_id) {
        return reply.status(400).send({ error: 'BAD_REQUEST', message: 'tahun_pelajaran_id wajib diisi.' });
      }

      const tp = await prisma.tahunPelajaran.findUnique({
        where: { id: tahun_pelajaran_id }
      });
      if (!tp) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Tahun pelajaran tidak ditemukan.' });
      }

      const parts = tp.tahun.split(/[\/\-]/);
      const year1 = parseInt(parts[0]);
      const year2 = parts[1] ? parseInt(parts[1]) : year1 + 1;

      if (isNaN(year1)) {
        return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Format tahun pelajaran tidak valid.' });
      }

      const nationalHolidays = [
        { judul: 'Tahun Baru Masehi', tanggal_mulai: `${year2}-01-01`, tanggal_selesai: `${year2}-01-01`, jenis: 'LIBUR_NASIONAL' },
        { judul: 'Hari Buruh Internasional', tanggal_mulai: `${year2}-05-01`, tanggal_selesai: `${year2}-05-01`, jenis: 'LIBUR_NASIONAL' },
        { judul: 'Hari Pendidikan Nasional', tanggal_mulai: `${year2}-05-02`, tanggal_selesai: `${year2}-05-02`, jenis: 'LIBUR_SEKOLAH', keterangan: 'Hari Pendidikan Nasional (Upacara)' },
        { judul: 'Hari Lahir Pancasila', tanggal_mulai: `${year2}-06-01`, tanggal_selesai: `${year2}-06-01`, jenis: 'LIBUR_NASIONAL' },
        { judul: 'Hari Kemerdekaan RI', tanggal_mulai: `${year1}-08-17`, tanggal_selesai: `${year1}-08-17`, jenis: 'LIBUR_NASIONAL' },
        { judul: 'Hari Raya Natal', tanggal_mulai: `${year1}-12-25`, tanggal_selesai: `${year1}-12-25`, jenis: 'LIBUR_NASIONAL' },
        { judul: 'Libur Akhir Semester 1', tanggal_mulai: `${year1}-12-20`, tanggal_selesai: `${year1}-12-31`, jenis: 'LIBUR_SEKOLAH' },
        { judul: 'Libur Akhir Semester 2', tanggal_mulai: `${year2}-06-20`, tanggal_selesai: `${year2}-06-30`, jenis: 'LIBUR_SEKOLAH' }
      ];

      const createdEvents = [];
      let skippedCount = 0;
      for (const hol of nationalHolidays) {
        const start = new Date(hol.tanggal_mulai);
        const end = new Date(hol.tanggal_selesai);

        // Check if this event already exists to achieve idempotency
        const existing = await prisma.kalenderAkademik.findFirst({
          where: {
            tenant_id: tenantId,
            tahun_pelajaran_id,
            judul: hol.judul,
            tanggal_mulai: start
          }
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        const ev = await prisma.kalenderAkademik.create({
          data: {
            tenant_id: tenantId,
            tahun_pelajaran_id,
            judul: hol.judul,
            jenis: hol.jenis,
            tanggal_mulai: start,
            tanggal_selesai: end,
            keterangan: hol.keterangan ?? null,
            created_by: userId ?? null
          }
        });
        createdEvents.push(ev);
      }

      if (createdEvents.length > 0 && tenantId) {
        await cacheInvalidationService.invalidateAcademicCache(tenantId);
        await cacheInvalidationService.invalidateAttendanceCache(tenantId);
      }

      let message = '';
      if (createdEvents.length === 0) {
        message = 'Semua event hari libur standar sudah terdaftar (tidak ada duplikasi).';
      } else {
        message = `Berhasil menambahkan ${createdEvents.length} event hari libur standar secara massal (${skippedCount} event sudah ada sebelumnya).`;
      }

      return reply.status(200).send({
        message,
        added: createdEvents.length,
        skipped: skippedCount
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Gagal melakukan bulk seeding.' });
    }
  }

  // GET /kurikulum/kalender/export (Public iCal sync)
  static async exportICal(request: any, reply: any) {
    try {
      const query = (request.query || {}) as { tenant_id?: string; tahun_pelajaran_id?: string };
      const tenant_id = query.tenant_id || request.tenantId || request.user?.tenant_id || request.user?.tenantId;
      const tahun_pelajaran_id = query.tahun_pelajaran_id;

      let events: any[] = [];
      if (tenant_id) {
        const where: any = { tenant_id };
        if (tahun_pelajaran_id && tahun_pelajaran_id !== 'undefined' && tahun_pelajaran_id !== 'null') {
          where.tahun_pelajaran_id = tahun_pelajaran_id;
        }

        try {
          events = await prisma.kalenderAkademik.findMany({
            where,
            include: {
              TahunPelajaran: { select: { tahun: true } }
            }
          });
        } catch (e: any) {
          console.error('[exportICal] DB Query error:', e?.message || e);
        }
      }

      const formatDate = (d: any) => {
        if (!d) return '20260101';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return '20260101';
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${y}${m}${day}`;
      };

      const addOneDay = (d: any) => {
        if (!d) return new Date();
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return new Date();
        dateObj.setDate(dateObj.getDate() + 1);
        return dateObj;
      };

      let ical = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Absenta.id//Academic Calendar//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
      ];

      for (const ev of (events || [])) {
        const startStr = formatDate(ev.tanggal_mulai);
        const endStr = formatDate(addOneDay(ev.tanggal_selesai));
        
        ical.push('BEGIN:VEVENT');
        ical.push(`UID:${ev.id || Math.random().toString(36).substring(2)}@absenta.id`);
        ical.push(`DTSTAMP:${formatDate(new Date())}T000000Z`);
        ical.push(`DTSTART;VALUE=DATE:${startStr}`);
        ical.push(`DTEND;VALUE=DATE:${endStr}`);
        ical.push(`SUMMARY:${ev.judul || 'Event Kalender'}`);
        if (ev.keterangan && typeof ev.keterangan === 'string') {
          const desc = ev.keterangan.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/\n/g, '\\n');
          ical.push(`DESCRIPTION:${desc}`);
        }
        ical.push(`CATEGORIES:${ev.jenis || 'LAINNYA'}`);
        ical.push('END:VEVENT');
      }

      ical.push('END:VCALENDAR');

      const icalContent = ical.join('\r\n');

      reply.type('text/calendar; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="kalender-akademik.ics"');
      return reply.send(icalContent);
    } catch (error: any) {
      console.error('[exportICal] Fatal error:', error);
      const fallbackIcal = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Absenta.id//EN\r\nEND:VCALENDAR";
      reply.type('text/calendar; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="kalender-akademik.ics"');
      return reply.send(fallbackIcal);
    }
  }

  static async bulkDelete(request: any, reply: any) {
    try {
      const { ids } = request.body as { ids?: string[] };
      const tenantId = request.tenantId;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Daftar ID event wajib diisi.' });
      }

      await prisma.kalenderAkademik.deleteMany({
        where: {
          id: { in: ids },
          tenant_id: tenantId
        }
      });

      if (tenantId) {
        await cacheInvalidationService.invalidateAcademicCache(tenantId);
        await cacheInvalidationService.invalidateAttendanceCache(tenantId);
      }

      return reply.send({ message: `Berhasil menghapus ${ids.length} event kalender secara massal.` });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Gagal menghapus event secara massal.' });
    }
  }
}

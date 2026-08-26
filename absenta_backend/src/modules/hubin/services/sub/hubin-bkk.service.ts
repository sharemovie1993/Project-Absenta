// @ts-nocheck
import { prisma } from '@/utils/prisma';
import crypto from 'crypto';
import { activityLogService } from '@/modules/activity/services/activity-log.service';
import { studentResolverService } from '@/services/student-resolver.service';
import { waGatewayService } from '@/services/wa-gateway.service';
import { getRedisConnection } from '@/queue/redis';
import { cacheService } from '@/utils/cache.service';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { CACHE_KEYS, CACHE_TTL } from '@/constants/cache-keys';
import { HubinCommonHelper } from './hubin-common.helper';

export class HubinBkkService {
  async getLowongan(tenantId: string, params?: { search?: string; status?: string; page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const skip = (page - 1) * limit;

    const where: any = { tenant_id: tenantId, deleted_at: null };
    if (params?.status) {
      where.status = params.status;
    }
    if (params?.search) {
      where.OR = [
        { judul_posisi: { contains: params.search, mode: 'insensitive' } },
        { perusahaan_nama: { contains: params.search, mode: 'insensitive' } },
        { deskripsi: { contains: params.search, mode: 'insensitive' } }
      ];
    }

    const [total, data] = await Promise.all([
      prisma.hubinLowongan.count({ where }),
      prisma.hubinLowongan.findMany({
        where,
        include: {
          Mitra: { select: { nama: true, alamat: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      })
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async createLowongan(tenantId: string, data: any, actorUserId?: string | null) {
    const result = await prisma.hubinLowongan.create({
      data: {
        ...data,
        tenant_id: tenantId,
        tanggal_tutup: new Date(data.tanggal_tutup),
        kuota: data.kuota ? parseInt(data.kuota) : 1
      }
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_LOWONGAN_CREATE', 'HubinLowongan', result.id, { posisi: result.judul_posisi });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return result;
  }

  async updateLowongan(tenantId: string, id: string, data: any, actorUserId?: string | null) {
    const updateData = { ...data };
    if (data.tanggal_tutup) updateData.tanggal_tutup = new Date(data.tanggal_tutup);
    if (data.kuota) updateData.kuota = parseInt(data.kuota);
    const result = await prisma.hubinLowongan.update({
      where: { id, tenant_id: tenantId },
      data: updateData
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_LOWONGAN_UPDATE', 'HubinLowongan', id, { posisi: result.judul_posisi });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return result;
  }

  async deleteLowongan(tenantId: string, id: string, actorUserId?: string | null) {
    const result = await prisma.hubinLowongan.update({
      where: { id, tenant_id: tenantId },
      data: { deleted_at: new Date() }
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_LOWONGAN_DELETE', 'HubinLowongan', id, { posisi: result.judul_posisi });
    return result;
  }

  // --- 7. BURSA KERJA KHUSUS (BKK) - LAMARAN ---
  async getLamaran(tenantId: string, params?: { lowonganId?: string; status?: string; siswaId?: string; page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const skip = (page - 1) * limit;

    const where: any = { tenant_id: tenantId, deleted_at: null };
    if (params?.lowonganId) where.lowongan_id = params.lowonganId;
    if (params?.status) where.status_seleksi = params.status;
    if (params?.siswaId) where.siswa_id = params.siswaId;

    const [total, data] = await Promise.all([
      prisma.hubinLamaran.count({ where }),
      prisma.hubinLamaran.findMany({
        where,
        include: {
          Lowongan: { select: { judul_posisi: true, perusahaan_nama: true } },
          Siswa: { 
            select: { 
              nama_siswa: true, 
              nis: true, 
              no_hp: true,
              User: { select: { email: true } }
            } 
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      })
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async createLamaran(tenantId: string, data: any, actorUserId?: string | null) {
    const result = await prisma.hubinLamaran.create({
      data: { ...data, tenant_id: tenantId }
    });
    // Create initial log entry
    await (prisma as any).hubinLamaranLog.create({
      data: {
        lamaran_id: result.id,
        tenant_id: tenantId,
        status_dari: null,
        status_ke: 'TERKIRIM',
        catatan: 'Lamaran berhasil dikirim',
        created_by: actorUserId || null,
      }
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_LAMARAN_CREATE', 'HubinLamaran', result.id, { lowongan_id: result.lowongan_id });
    return result;
  }

  async updateLamaranStatus(
    tenantId: string,
    id: string,
    status: string,
    catatan?: string,
    actorUserId?: string | null
  ) {
    // Fetch current status before update (for log)
    const current = await prisma.hubinLamaran.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        Siswa: { 
          select: { 
            id: true,
            nama_siswa: true, 
            no_hp: true,
            tanggal_keluar: true,
            tahun_pelajaran_id: true
          } 
        },
        Lowongan: { select: { judul_posisi: true, perusahaan_nama: true } },
      }
    });
    if (!current) throw new Error('Lamaran tidak ditemukan');

    const result = await prisma.hubinLamaran.update({
      where: { id, tenant_id: tenantId },
      data: { status_seleksi: status, catatan }
    });

    // Write audit log
    await (prisma as any).hubinLamaranLog.create({
      data: {
        lamaran_id: id,
        tenant_id: tenantId,
        status_dari: current.status_seleksi,
        status_ke: status,
        catatan: catatan || null,
        created_by: actorUserId || null,
      }
    });

    this.log(tenantId, actorUserId || null, 'HUBIN_LAMARAN_STATUS', 'HubinLamaran', id, { status_seleksi: status });

    // Send WA notification to alumni (soft — won't throw if WA not connected)
    const noHp = current.Siswa?.no_hp;
    if (noHp) {
      const statusLabels: Record<string, string> = {
        PROSES: 'sedang diproses secara administrasi',
        INTERVIEW: 'dijadwalkan untuk interview',
        DITERIMA: 'DITERIMA! 🎉 Selamat!',
        DITOLAK: 'tidak berhasil pada seleksi kali ini',
      };
      const label = statusLabels[status];
      if (label) {
        const pesan = [
          `*[Absenta - BKK Notifikasi]*`,
          `Halo ${current.Siswa?.nama_siswa || 'Alumni'},`,
          ``,
          `Lamaran Anda untuk posisi *${current.Lowongan?.judul_posisi}* di *${current.Lowongan?.perusahaan_nama}* ${label}.`,
          status === 'DITOLAK' && catatan ? `\nCatatan: ${catatan}` : '',
          ``,
          `Pantau terus status lamaran Anda di platform Absenta.`,
        ].filter(Boolean).join('\n');
        waGatewayService.sendMessageSoft(tenantId, noHp, pesan);
      }
    }

    // Automate Tracer Study if status is DITERIMA
    if (status === 'DITERIMA' && current.siswa_id) {
      try {
        let graduationYear = new Date().getFullYear();
        
        if (current.Siswa?.tanggal_keluar) {
          graduationYear = new Date(current.Siswa.tanggal_keluar).getFullYear();
        } else if (current.Siswa?.tahun_pelajaran_id) {
          const tapel = await prisma.tahunPelajaran.findFirst({
            where: { id: current.Siswa.tahun_pelajaran_id }
          });
          if (tapel?.tahun) {
            const parts = tapel.tahun.split('/');
            if (parts.length === 2) {
              const parsed = parseInt(parts[1]);
              if (!isNaN(parsed)) {
                graduationYear = parsed;
              }
            }
          }
        }

        await prisma.hubinTracerStudy.upsert({
          where: { siswa_id: current.siswa_id },
          update: {
            status_alumni: 'BEKERJA',
            perusahaan_nama: current.Lowongan?.perusahaan_nama || null,
            posisi: current.Lowongan?.judul_posisi || null,
            deleted_at: null,
          },
          create: {
            tenant_id: tenantId,
            siswa_id: current.siswa_id,
            tahun_lulus: graduationYear,
            status_alumni: 'BEKERJA',
            perusahaan_nama: current.Lowongan?.perusahaan_nama || null,
            posisi: current.Lowongan?.judul_posisi || null,
          }
        });

        this.log(tenantId, actorUserId || null, 'HUBIN_TRACER_SUBMIT', 'HubinTracerStudy', current.siswa_id, { 
          status_alumni: 'BEKERJA', 
          auto: true 
        });
      } catch (err) {
        console.error('[BKK-Tracer-Otomasi] Gagal update tracer study:', err);
      }
    }

    return result;
  }

  async deleteLamaran(tenantId: string, id: string, actorUserId?: string | null) {
    const current = await prisma.hubinLamaran.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
      include: {
        Siswa: { select: { nama_siswa: true } },
        Lowongan: { select: { judul_posisi: true } }
      }
    });
    if (!current) throw new Error('Lamaran tidak ditemukan atau sudah dihapus');

    const result = await prisma.hubinLamaran.update({
      where: { id, tenant_id: tenantId },
      data: { deleted_at: new Date() }
    });

    await (prisma as any).hubinLamaranLog.create({
      data: {
        lamaran_id: id,
        tenant_id: tenantId,
        status_dari: current.status_seleksi,
        status_ke: 'DELETED',
        catatan: 'Lamaran direset oleh koordinator BKK',
        created_by: actorUserId || null,
      }
    });

    this.log(tenantId, actorUserId || null, 'HUBIN_LAMARAN_DELETE', 'HubinLamaran', id, {
      siswa_nama: current.Siswa?.nama_siswa,
      posisi: current.Lowongan?.judul_posisi
    });
    return result;
  }

  /**
   * Jadwalkan interview untuk sebuah lamaran.
   * Otomatis memindahkan status ke INTERVIEW dan menyimpan detail jadwal di log.
   */
  async scheduleInterview(
    tenantId: string,
    lamaranId: string,
    data: {
      tanggal: string;
      lokasi?: string;
      link?: string;
      pesan?: string;
      narahubung?: string;
    },
    actorUserId?: string | null
  ) {
    const current = await prisma.hubinLamaran.findFirst({
      where: { id: lamaranId, tenant_id: tenantId },
      include: {
        Siswa: { select: { nama_siswa: true, no_hp: true } },
        Lowongan: { select: { judul_posisi: true, perusahaan_nama: true } },
      }
    });
    if (!current) throw new Error('Lamaran tidak ditemukan');

    const result = await prisma.hubinLamaran.update({
      where: { id: lamaranId, tenant_id: tenantId },
      data: { status_seleksi: 'INTERVIEW' }
    });

    const interviewDate = new Date(data.tanggal);

    // Write detailed log
    await (prisma as any).hubinLamaranLog.create({
      data: {
        lamaran_id: lamaranId,
        tenant_id: tenantId,
        status_dari: current.status_seleksi,
        status_ke: 'INTERVIEW',
        catatan: data.pesan || 'Interview dijadwalkan',
        interview_tanggal: interviewDate,
        interview_lokasi: data.lokasi || null,
        interview_link: data.link || null,
        interview_pesan: data.pesan || null,
        interview_narahubung: data.narahubung || null,
        created_by: actorUserId || null,
      }
    });

    this.log(tenantId, actorUserId || null, 'HUBIN_LAMARAN_INTERVIEW', 'HubinLamaran', lamaranId, { tanggal: data.tanggal });

    // WA notification with interview details
    const noHp = current.Siswa?.no_hp;
    if (noHp) {
      const tanggalStr = interviewDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const waktuStr = interviewDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
      const pesan = [
        `*[Absenta - BKK Undangan Interview]*`,
        `Halo ${current.Siswa?.nama_siswa || 'Alumni'},`,
        ``,
        `Anda diundang untuk *Interview* posisi *${current.Lowongan?.judul_posisi}* di *${current.Lowongan?.perusahaan_nama}*.`,
        ``,
        `📅 *Jadwal:* ${tanggalStr}, ${waktuStr}`,
        data.lokasi ? `📍 *Lokasi:* ${data.lokasi}` : '',
        data.link ? `🔗 *Link Meet:* ${data.link}` : '',
        data.narahubung ? `👤 *Narahubung:* ${data.narahubung}` : '',
        data.pesan ? `\n📝 ${data.pesan}` : '',
        ``,
        `Semoga sukses! — Tim BKK`,
      ].filter(Boolean).join('\n');
      waGatewayService.sendMessageSoft(tenantId, noHp, pesan);
    }

    return result;
  }

  /**
   * Ambil riwayat/timeline log perubahan status sebuah lamaran.
   */
  async getLamaranTimeline(tenantId: string, lamaranId: string) {
    return await (prisma as any).hubinLamaranLog.findMany({
      where: { lamaran_id: lamaranId, tenant_id: tenantId },
      orderBy: { created_at: 'asc' },
    });
  }

  // --- 8. TRACER STUDY ALUMNI ---
  async getTracerStudy(tenantId: string, params?: { search?: string; tahunLulus?: number; statusAlumni?: string; page?: number; limit?: number; forceSiswaId?: string }) {
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const skip = (page - 1) * limit;

    const where: any = { tenant_id: tenantId, deleted_at: null };
    if (params?.forceSiswaId) {
      where.siswa_id = params.forceSiswaId;
    }
    if (params?.tahunLulus) where.tahun_lulus = parseInt(params.tahunLulus as any);
    if (params?.statusAlumni) where.status_alumni = params.statusAlumni;
    if (params?.search && !params?.forceSiswaId) {
      where.Siswa = {
        OR: [
          { nama_siswa: { contains: params.search, mode: 'insensitive' } },
          { nis: { contains: params.search, mode: 'insensitive' } },
          { User: { username: { contains: params.search, mode: 'insensitive' } } }
        ]
      };
    }

    const [total, data] = await Promise.all([
      prisma.hubinTracerStudy.count({ where }),
      prisma.hubinTracerStudy.findMany({
        where,
        include: {
          Siswa: { select: { nama_siswa: true, nis: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      })
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async submitTracerStudy(tenantId: string, siswaId: string, data: any, actorUserId?: string | null) {
    const result = await prisma.hubinTracerStudy.upsert({
      where: { siswa_id: siswaId },
      update: {
        ...data,
        deleted_at: null,
        tahun_lulus: data.tahun_lulus ? parseInt(data.tahun_lulus) : undefined
      },
      create: {
        ...data,
        siswa_id: siswaId,
        tenant_id: tenantId,
        tahun_lulus: data.tahun_lulus ? parseInt(data.tahun_lulus) : new Date().getFullYear()
      }
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_TRACER_SUBMIT', 'HubinTracerStudy', result.id, { status_alumni: result.status_alumni });
    return result;
  }

  async getTracerStats(tenantId: string) {
    const groups = await prisma.hubinTracerStudy.groupBy({
      by: ['status_alumni'],
      where: { tenant_id: tenantId, deleted_at: null },
      _count: { status_alumni: true }
    });

    const stats = {
      BEKERJA: 0,
      KULIAH: 0,
      WIRAUSAHA: 0,
      MENCARI_KERJA: 0
    };

    groups.forEach(g => {
      const key = g.status_alumni as keyof typeof stats;
      if (stats[key] !== undefined) {
        stats[key] = g._count.status_alumni;
      }
    });

    return stats;
  }

  // --- 9. TEFA ORDERS ---
}

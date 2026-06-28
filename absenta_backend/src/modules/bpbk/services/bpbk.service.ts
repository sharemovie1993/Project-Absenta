import { Prisma } from '@prisma/client';
import { prisma } from '../../../utils/prisma';
import { parentNotificationService } from '../../parent-app/services/parent-notification.service';
import { ParentEventType } from '../../parent-app/constants/parent-event-matrix';
import { activityLogService } from '../../activity/services/activity-log.service';
import { SuratKeluarService } from '../../correspondence/services/surat-keluar.service';
import { systemConfigService } from '../../system-config/services/system-config.service';
import { randomBytes } from 'crypto';
import { cacheService } from '../../../utils/cache.service';
import { getSmartFrontendBaseUrl } from '../../../utils/url-helper';

export class BpbkService {
  // === Helper getWaliKelasClassIds ===
  private static async getWaliKelasClassIds(tenantId: string, userId: string): Promise<string[]> {
    const assignments = await prisma.organizationalAssignment.findMany({
      where: {
        tenant_id: tenantId,
        user_id: userId,
        is_active: true,
        Position: { code: 'WALIKELAS' }
      },
      select: { kelas_id: true }
    });
    return assignments.map(a => a.kelas_id).filter(Boolean) as string[];
  }

  // === Helper isUserWaliKelasOfStudent ===
  private static async isUserWaliKelasOfStudent(tenantId: string, userId: string, siswaId: string): Promise<boolean> {
    const student = await prisma.siswa.findFirst({
      where: { id: siswaId, tenant_id: tenantId },
      select: { kelas_id: true }
    });
    if (!student?.kelas_id) return false;

    const assignment = await prisma.organizationalAssignment.findFirst({
      where: {
        tenant_id: tenantId,
        user_id: userId,
        kelas_id: student.kelas_id,
        is_active: true,
        Position: { code: 'WALIKELAS' }
      }
    });
    return !!assignment;
  }

  // === Helper buildVisibilityFilter ===
  private static async buildVisibilityFilter(
    tenantId: string,
    userContext: { id: string; capabilities: string[] }
  ): Promise<any> {
    const hasSensitiveAccess = userContext.capabilities.includes('bk.counseling.view.sensitive') || 
                                userContext.capabilities.includes('system.platform.full_access');
                                
    if (hasSensitiveAccess) {
      return {}; 
    }

    const waliKelasClassIds = await this.getWaliKelasClassIds(tenantId, userContext.id);

    if (waliKelasClassIds.length > 0) {
      return {
        OR: [
          {
            Siswa: { kelas_id: { in: waliKelasClassIds } },
            visibility: { in: ['LIMITED', 'PUBLIC'] }
          },
          {
            Siswa: { kelas_id: { notIn: waliKelasClassIds } },
            visibility: 'PUBLIC'
          }
        ]
      };
    }

    return {
      visibility: 'PUBLIC'
    };
  }

  // === Helper triggerParentNotification ===
  private static async triggerParentNotification(
    tenantId: string,
    siswaId: string,
    eventType: ParentEventType,
    variables: Record<string, string>
  ) {
    try {
      const student = await prisma.siswa.findUnique({
        where: { id: siswaId },
        select: { nama_siswa: true }
      });
      if (!student) return;

      await parentNotificationService.handleEvent(eventType, {
        siswaId,
        nama_siswa: student.nama_siswa,
        timestamp: new Date(),
        ...variables
      });
      console.log(`[BK Notification] Pushed BK alert notification to parents of ${student.nama_siswa} under tenant ${tenantId}`);
    } catch (e) {
      console.error('[BK Notification] Failed to send parent app notification:', e);
    }
  }

  // === Helper triggerPrincipalNotification ===
  private static async triggerPrincipalNotification(
    tenantId: string,
    siswaId: string,
    tanggal: string,
    alasan: string,
    summonsId: string,
    token: string
  ) {
    try {
      const student = await prisma.siswa.findUnique({
        where: { id: siswaId },
        select: {
          nama_siswa: true,
          Kelas: { select: { nama_kelas: true } }
        }
      });
      if (!student) return;

      const kepsekAssign = await prisma.organizationalAssignment.findFirst({
        where: {
          tenant_id: tenantId,
          is_active: true,
          Position: { code: 'KEPALA_SEKOLAH' }
        },
        include: {
          User: {
            select: {
              no_hp: true,
              full_name: true,
              Guru: { select: { no_hp: true } }
            }
          }
        }
      });

      const noHp = kepsekAssign?.User?.no_hp || kepsekAssign?.User?.Guru?.no_hp;
      if (!noHp) {
        console.log(`[BK Kepsek WA] No active phone number configured for Kepala Sekolah under tenant ${tenantId}`);
        return;
      }

      const studentName = student.nama_siswa;
      const className = student.Kelas?.nama_kelas || '-';
      
      let baseUrl = getSmartFrontendBaseUrl().trim().replace(/\/+$/, '');
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `http://${baseUrl}`;
      }
      const approveLink = `${baseUrl}/surat-keluar/quick-approve/${token}`;

      const message = `*Notifikasi Bimbingan Konseling (BK)*\n` +
        `Yth. Bapak/Ibu Kepala Sekolah,\n\n` +
        `Telah dibuat draf Surat Pemanggilan Orang Tua Baru di sistem Bimbingan Konseling (BK):\n` +
        `- Nama Siswa: *${studentName}*\n` +
        `- Kelas: *${className}*\n` +
        `- Alasan: *${alasan}*\n` +
        `- Rencana Pertemuan: *${tanggal}*\n\n` +
        `👉 *Link Persetujuan Cepat (Tanpa Login):*\n` +
        `${approveLink}\n\n` +
        `Silakan klik link di atas untuk meninjau draf surat dan menyetujuinya langsung dari HP Anda.\n\n` +
        `Terima kasih.`;

      const { WhatsAppService } = await import('../../notification/services/whatsapp.service');
      const ws = new WhatsAppService();
      await ws.sendWhatsApp({
        phoneNumber: noHp,
        message,
        tenantId,
        relatedId: summonsId,
        event: 'SUMMONS_WAITING_APPROVAL'
      });
      console.log(`[BK Kepsek WA] Sent WhatsApp notification to Kepala Sekolah for summons ${summonsId}`);
    } catch (e) {
      console.error('[BK Kepsek WA] Failed to send WhatsApp notification to Kepala Sekolah:', e);
    }
  }

  // === Helper sendSummonsToParentWhatsApp ===
  public static async sendSummonsToParentWhatsApp(tenantId: string, summonsId: string) {
    try {
      const summons = await prisma.pemanggilanOrangTua.findFirst({
        where: { id: summonsId, tenant_id: tenantId },
        include: {
          Siswa: {
            select: {
              nama_siswa: true,
              no_hp: true,
              Kelas: { select: { nama_kelas: true } }
            }
          },
          Tenant: {
            select: { name: true }
          }
        }
      });

      if (!summons) return;

      // Find the associated SuratKeluar
      const suratKeluar = await prisma.suratKeluar.findFirst({
        where: {
          tenant_id: tenantId,
          siswa_id: summons.siswa_id,
          kategori_surat: 'Panggilan'
        },
        orderBy: { created_at: 'desc' }
      });

      // Find recipient phone number (Parents)
      const links = await prisma.orangTuaSiswa.findMany({
        where: { siswa_id: summons.siswa_id },
        include: { OrangTua: true }
      });

      const phoneNumbers: string[] = [];
      for (const link of links) {
        if (link.OrangTua?.no_hp) {
          phoneNumbers.push(link.OrangTua.no_hp);
        }
      }

      // Fallback to student's no_hp if no parent phone number
      if (phoneNumbers.length === 0 && summons.Siswa?.no_hp) {
        phoneNumbers.push(summons.Siswa.no_hp);
      }

      if (phoneNumbers.length === 0) {
        console.log(`[BK Parent WA] No phone number available for parent/student on summons ${summonsId}`);
        return;
      }

      // Generate secure public view token
      const parentToken = randomBytes(32).toString('hex');
      await cacheService.set(
        `surat-keluar:public-view-token:${parentToken}`,
        {
          suratKeluarId: suratKeluar?.id || null,
          tenantId: tenantId,
          pemanggilanId: summonsId
        },
        7 * 24 * 60 * 60 // 7 days expiry
      );

      let baseUrl = getSmartFrontendBaseUrl().trim().replace(/\/+$/, '');
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `http://${baseUrl}`;
      }
      const viewLink = `${baseUrl}/surat-keluar/public-view/${parentToken}`;

      const tglPertemuan = summons.tanggal_pemanggilan.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const message = `*Notifikasi Bimbingan Konseling (BK)*\n` +
        `Yth. Orang Tua / Wali dari *${summons.Siswa?.nama_siswa}*,\n\n` +
        `Sekolah memohon kehadiran Bapak/Ibu pada agenda pertemuan Bimbingan Konseling yang akan dilaksanakan pada:\n` +
        `- Hari/Tanggal: *${tglPertemuan}*\n` +
        `- Waktu: *${summons.waktu_pertemuan || '-'}* WIB\n` +
        `- Tempat: *${summons.tempat_pertemuan || '-'}*\n` +
        `- Alasan: *${summons.alasan}*\n\n` +
        `👉 *Link Surat Panggilan Resmi (Unduh PDF):*\n` +
        `${viewLink}\n\n` +
        `Mohon kehadiran Bapak/Ibu tepat pada waktunya. Terima kasih.\n\n` +
        `*${summons.Tenant?.name || 'Sekolah'}*`;

      const { WhatsAppService } = await import('../../notification/services/whatsapp.service');
      const ws = new WhatsAppService();

      for (const noHp of phoneNumbers) {
        await ws.sendWhatsApp({
          phoneNumber: noHp,
          message,
          tenantId,
          relatedId: summonsId,
          event: 'SUMMONS_DELIVERED'
        });
        console.log(`[BK Parent WA] Sent WhatsApp notification to Parent (${noHp}) for summons ${summonsId}`);
      }
    } catch (e) {
      console.error('[BK Parent WA] Failed to send WhatsApp notification to Parent:', e);
    }
  }

  // === Kasus BK ===
  static async createKasusBK(tenantId: string, data: {
    siswa_id: string;
    judul: string;
    kategori: string;
    status: string;
    prioritas: string;
    visibility: string;
    tanggal_kasus: Date;
    keterangan?: string;
  }, userId?: string) {
    const res = await prisma.kasusBK.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        judul: data.judul,
        kategori: data.kategori,
        status: data.status,
        prioritas: data.prioritas,
        visibility: data.visibility,
        tanggal_kasus: data.tanggal_kasus,
        keterangan: data.keterangan
      }
    });

    activityLogService.logEvent({
      event_type: 'CASE_OPEN',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'KasusBK',
      entity_id: res.id,
      metadata: { newValue: res }
    });

    if (res.visibility === 'PUBLIC') {
      await this.triggerParentNotification(tenantId, res.siswa_id, ParentEventType.BK_CASE_ALERT, {});
    }

    return res;
  }

  static async updateKasusBK(tenantId: string, id: string, data: {
    judul?: string;
    kategori?: string;
    status?: string;
    prioritas?: string;
    visibility?: string;
    tanggal_kasus?: Date;
    keterangan?: string;
  }, userId?: string) {
    await this.verifyOwner('kasusBK', id, tenantId);
    const oldVal = await prisma.kasusBK.findUnique({ where: { id } });
    const res = await prisma.kasusBK.update({
      where: { id },
      data
    });
    activityLogService.logEvent({
      event_type: 'CASE_UPDATE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'KasusBK',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    return res;
  }

  static async deleteKasusBK(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('kasusBK', id, tenantId);
    const oldVal = await prisma.kasusBK.findUnique({ where: { id } });
    const res = await prisma.kasusBK.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: userId || null
      }
    });
    activityLogService.logEvent({
      event_type: 'CASE_DELETE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'KasusBK',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    return res;
  }

  static async restoreKasusBK(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('kasusBK', id, tenantId);
    const res = await prisma.kasusBK.update({
      where: { id },
      data: {
        deleted_at: null,
        deleted_by: null
      }
    });
    activityLogService.logEvent({
      event_type: 'CASE_RESTORE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'KasusBK',
      entity_id: id,
      metadata: { newValue: res }
    });
    return res;
  }

  static async closeKasusBK(tenantId: string, id: string, userId: string, data: { catatan_selesai: string }) {
    await this.verifyOwner('kasusBK', id, tenantId);
    const oldVal = await prisma.kasusBK.findUnique({ where: { id } });
    const res = await prisma.kasusBK.update({
      where: { id },
      data: {
        status: 'SELESAI',
        closed_at: new Date(),
        closed_by: userId,
        catatan_selesai: data.catatan_selesai
      }
    });

    // Automatically complete connected counseling sessions that are still PROSES
    await prisma.konselingSiswa.updateMany({
      where: { kasus_bk_id: id, status: 'PROSES', tenant_id: tenantId },
      data: { status: 'SELESAI' }
    });

    activityLogService.logEvent({
      event_type: 'CASE_CLOSE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'KasusBK',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });

    return res;
  }

  static async reopenKasusBK(tenantId: string, id: string, userId: string) {
    await this.verifyOwner('kasusBK', id, tenantId);
    const oldVal = await prisma.kasusBK.findUnique({ where: { id } });
    const res = await prisma.kasusBK.update({
      where: { id },
      data: {
        status: 'PROSES',
        closed_at: null,
        closed_by: null,
        catatan_selesai: null,
        reopen_count: { increment: 1 }
      }
    });

    activityLogService.logEvent({
      event_type: 'CASE_REOPEN',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'KasusBK',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });

    return res;
  }

  static async getKasusBKById(tenantId: string, id: string, userContext: { id: string; capabilities: string[] }) {
    await this.verifyOwner('kasusBK', id, tenantId);
    const item = await prisma.kasusBK.findUnique({
      where: { id },
      include: {
        Siswa: {
          select: {
            id: true,
            nama_siswa: true,
            nis: true,
            Kelas: { select: { nama_kelas: true } }
          }
        },
        KonselingSiswa: {
          where: { deleted_at: null },
          include: {
            Petugas: { select: { id: true, full_name: true } }
          }
        },
        PemanggilanOrangTua: {
          where: { deleted_at: null },
          include: {
            Dokumen: true
          }
        },
        HomeVisit: {
          where: { deleted_at: null },
          include: {
            Dokumen: true
          }
        },
        AsesmenSiswa: {
          where: { deleted_at: null },
          include: {
            Dokumen: true
          }
        },
        RujukanKasus: {
          where: { deleted_at: null }
        }
      }
    });

    if (!item || item.deleted_at !== null) {
      throw new Error('Kasus tidak ditemukan');
    }

    const isWali = await this.isUserWaliKelasOfStudent(tenantId, userContext.id, item.siswa_id);
    const hasSensitive = userContext.capabilities.includes('bk.counseling.view.sensitive') ||
                         userContext.capabilities.includes('system.platform.full_access');

    if (item.visibility === 'SENSITIVE') {
      if (!hasSensitive) {
        throw new Error('Akses ditolak: Kasus ini bersifat sensitif');
      }
      activityLogService.logEvent({
        event_type: 'CASE_VIEW_SENSITIVE',
        tenant_id: tenantId,
        user_id: userContext.id,
        entity: 'KasusBK',
        entity_id: item.id,
        metadata: { judul: item.judul }
      });
    }
    if (item.visibility === 'LIMITED' && !hasSensitive && !isWali) {
      throw new Error('Akses ditolak: Kasus ini terbatas untuk BK dan Wali Kelas saja');
    }

    const filterByVisibility = <T extends { visibility?: string }>(children: T[]): T[] => {
      return children.filter(c => {
        const vis = c.visibility || 'PUBLIC';
        if (vis === 'SENSITIVE') return hasSensitive;
        if (vis === 'LIMITED') return hasSensitive || isWali;
        return true;
      });
    };

    return {
      ...item,
      KonselingSiswa: filterByVisibility(item.KonselingSiswa),
      PemanggilanOrangTua: filterByVisibility(item.PemanggilanOrangTua),
      HomeVisit: filterByVisibility(item.HomeVisit),
      AsesmenSiswa: filterByVisibility(item.AsesmenSiswa),
      RujukanKasus: filterByVisibility(item.RujukanKasus)
    };
  }

  static async getAllKasusBK(tenantId: string, userContext: { id: string; capabilities: string[] }, query: {
    page?: number;
    limit?: number;
    search?: string;
    siswa_id?: string;
    status?: string;
    prioritas?: string;
    kategori?: string;
    show_deleted?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const visibilityFilter = await this.buildVisibilityFilter(tenantId, userContext);

    const where: Prisma.KasusBKWhereInput = {
      tenant_id: tenantId,
      ...visibilityFilter
    };

    if (query.show_deleted === 'true') {
      where.deleted_at = { not: null };
    } else {
      where.deleted_at = null;
    }

    if (query.siswa_id) {
      where.siswa_id = query.siswa_id;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.prioritas) {
      where.prioritas = query.prioritas;
    }
    if (query.kategori) {
      where.kategori = query.kategori;
    }
    if (query.search) {
      where.OR = [
        { judul: { contains: query.search, mode: 'insensitive' } },
        { keterangan: { contains: query.search, mode: 'insensitive' } },
        { Siswa: { nama_siswa: { contains: query.search, mode: 'insensitive' } } }
      ];
    }

    const [total, list] = await Promise.all([
      prisma.kasusBK.count({ where }),
      prisma.kasusBK.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { tanggal_kasus: 'desc' },
        include: {
          Siswa: {
            select: {
              id: true,
              nama_siswa: true,
              nis: true,
              Kelas: { select: { nama_kelas: true } }
            }
          }
        }
      })
    ]);

    return {
      list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // === Konseling Siswa ===
  static async createKonseling(tenantId: string, data: {
    siswa_id: string;
    tanggal: Date;
    tipe: 'INDIVIDU' | 'KELOMPOK';
    kelompok_id?: string;
    masalah: string;
    solusi?: string;
    status: 'PROSES' | 'SELESAI';
    visibility?: string;
    kasus_bk_id?: string;
    petugas_id: string;
  }, userId?: string) {
    const res = await prisma.konselingSiswa.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        tanggal: data.tanggal,
        tipe: data.tipe,
        kelompok_id: data.kelompok_id,
        masalah: data.masalah,
        solusi: data.solusi,
        status: data.status,
        visibility: data.visibility || 'SENSITIVE',
        kasus_bk_id: data.kasus_bk_id,
        petugas_id: data.petugas_id
      }
    });

    activityLogService.logEvent({
      event_type: 'COUNSELING_CREATE',
      tenant_id: tenantId,
      user_id: userId || data.petugas_id || null,
      entity: 'KonselingSiswa',
      entity_id: res.id,
      metadata: { newValue: res }
    });

    return res;
  }

  static async updateKonseling(tenantId: string, id: string, data: {
    tanggal?: Date;
    tipe?: 'INDIVIDU' | 'KELOMPOK';
    kelompok_id?: string;
    masalah?: string;
    solusi?: string;
    status?: 'PROSES' | 'SELESAI';
    visibility?: string;
    kasus_bk_id?: string;
  }, userId?: string) {
    await this.verifyOwner('konselingSiswa', id, tenantId);
    const oldVal = await prisma.konselingSiswa.findUnique({ where: { id } });
    const res = await prisma.konselingSiswa.update({
      where: { id },
      data
    });
    activityLogService.logEvent({
      event_type: 'COUNSELING_UPDATE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'KonselingSiswa',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    return res;
  }

  static async deleteKonseling(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('konselingSiswa', id, tenantId);
    const oldVal = await prisma.konselingSiswa.findUnique({ where: { id } });
    const res = await prisma.konselingSiswa.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: userId || null
      }
    });
    activityLogService.logEvent({
      event_type: 'COUNSELING_DELETE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'KonselingSiswa',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    return res;
  }

  static async restoreKonseling(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('konselingSiswa', id, tenantId);
    const res = await prisma.konselingSiswa.update({
      where: { id },
      data: {
        deleted_at: null,
        deleted_by: null
      }
    });
    activityLogService.logEvent({
      event_type: 'COUNSELING_RESTORE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'KonselingSiswa',
      entity_id: id,
      metadata: { newValue: res }
    });
    return res;
  }

  static async getAllKonseling(tenantId: string, userContext: { id: string; capabilities: string[] }, query: {
    page?: number;
    limit?: number;
    search?: string;
    siswa_id?: string;
    tipe?: string;
    status?: string;
    kasus_bk_id?: string;
    show_deleted?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const visibilityFilter = await this.buildVisibilityFilter(tenantId, userContext);

    const where: Prisma.KonselingSiswaWhereInput = {
      tenant_id: tenantId,
      ...visibilityFilter
    };

    if (query.show_deleted === 'true') {
      where.deleted_at = { not: null };
    } else {
      where.deleted_at = null;
    }

    if (query.siswa_id) {
      where.siswa_id = query.siswa_id;
    }
    if (query.tipe) {
      where.tipe = query.tipe;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.kasus_bk_id) {
      where.kasus_bk_id = query.kasus_bk_id;
    }
    if (query.search) {
      where.OR = [
        { masalah: { contains: query.search, mode: 'insensitive' } },
        { solusi: { contains: query.search, mode: 'insensitive' } },
        { Siswa: { nama_siswa: { contains: query.search, mode: 'insensitive' } } }
      ];
    }

    const [total, list] = await Promise.all([
      prisma.konselingSiswa.count({ where }),
      prisma.konselingSiswa.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { tanggal: 'desc' },
        include: {
          Siswa: {
            select: {
              id: true,
              nama_siswa: true,
              nis: true,
              Kelas: { select: { nama_kelas: true } }
            }
          },
          Petugas: {
            select: {
              id: true,
              full_name: true
            }
          }
        }
      })
    ]);

    return {
      list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // === Pemanggilan Orang Tua ===
  static async createPemanggilan(tenantId: string, data: {
    siswa_id: string;
    tanggal_pemanggilan: Date;
    alasan: string;
    waktu_pertemuan?: string;
    tempat_pertemuan?: string;
    surat_dokumen_id?: string;
    kasus_bk_id?: string;
    visibility?: string;
    ortu_notified?: boolean;
    status?: string;
  }, userId?: string) {
    // Read tenant config for summons approval workflow
    const config = await systemConfigService.getActive(tenantId);
    const requireApproval = config?.bpbk_summons_require_principal_approval ?? true;
    const finalStatus = data.status || (requireApproval ? 'BARU' : 'DIKIRIM');

    const res = await prisma.pemanggilanOrangTua.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        tanggal_pemanggilan: data.tanggal_pemanggilan,
        alasan: data.alasan,
        waktu_pertemuan: data.waktu_pertemuan || null,
        tempat_pertemuan: data.tempat_pertemuan || null,
        surat_dokumen_id: data.surat_dokumen_id,
        status: finalStatus,
        kasus_bk_id: data.kasus_bk_id,
        visibility: data.visibility || 'LIMITED',
        ortu_notified: data.ortu_notified || false
      }
    });

    activityLogService.logEvent({
      event_type: 'SUMMONS_CREATE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'PemanggilanOrangTua',
      entity_id: res.id,
      metadata: { newValue: res }
    });

    // Auto register to correspondence Surat Keluar on backend only if approval is required
    if (requireApproval) {
      try {
        const student = await prisma.siswa.findUnique({
          where: { id: data.siswa_id },
          select: { nama_siswa: true, nis: true }
        });
        if (student && userId) {
          const nomorStr = `800 / ${student.nis || '___'} / BK / ${new Date().getFullYear()}`;
          const suratKeluar = await SuratKeluarService.create(tenantId, userId, {
            nomor_surat: nomorStr,
            judul: `Surat Panggilan Orang Tua (BK): ${student.nama_siswa}`,
            tujuan_surat: 'Orang Tua / Wali Siswa',
            tanggal_surat: new Date().toISOString().split('T')[0],
            isi_ringkas: `Digenerasikan dari modul BP/BK - Pemanggilan Orang Tua. Alasan: ${data.alasan}`,
            kategori_surat: 'Panggilan',
            siswa_id: data.siswa_id
          });

          // Generate quick approve token
          const token = randomBytes(32).toString('hex');

          // Lookup Kepsek assignment to get user_id
          const kepsekAssign = await prisma.organizationalAssignment.findFirst({
            where: {
              tenant_id: tenantId,
              is_active: true,
              Position: { code: 'KEPALA_SEKOLAH' }
            },
            select: { user_id: true }
          });

          // Cache token details for 3 days
          await cacheService.set(
            `surat-keluar:quick-approve-token:${token}`,
            {
              suratKeluarId: suratKeluar.id,
              tenantId: tenantId,
              kepsekUserId: kepsekAssign?.user_id || userId,
              pemanggilanId: res.id
            },
            3 * 24 * 60 * 60
          );

          // Trigger WhatsApp notification to Kepala Sekolah
          await this.triggerPrincipalNotification(
            tenantId,
            data.siswa_id,
            data.tanggal_pemanggilan.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
            data.alasan,
            res.id,
            token
          );
        }
      } catch (err) {
        console.error('Failed to auto-register Surat Keluar on backend:', err);
      }
    }

    if (res.status === 'DIKIRIM') {
      await this.sendSummonsToParentWhatsApp(tenantId, res.id);
      
      if (res.ortu_notified && res.visibility !== 'SENSITIVE') {
        await this.triggerParentNotification(tenantId, res.siswa_id, ParentEventType.BK_SUMMONS_ISSUED, {
          tanggal: data.tanggal_pemanggilan.toLocaleDateString('id-ID'),
          alasan: data.alasan
        });
      }
    }

    return res;
  }

  static async updatePemanggilan(tenantId: string, id: string, data: {
    tanggal_pemanggilan?: Date;
    tanggal_pertemuan?: Date;
    keterangan_pertemuan?: string;
    status?: string;
    alasan?: string;
    waktu_pertemuan?: string;
    tempat_pertemuan?: string;
    surat_dokumen_id?: string;
    kasus_bk_id?: string;
    visibility?: string;
    ortu_notified?: boolean;
  }, userId?: string) {
    await this.verifyOwner('pemanggilanOrangTua', id, tenantId);
    const existing = await prisma.pemanggilanOrangTua.findUnique({ where: { id } });
    if (!existing) throw new Error('Data tidak ditemukan');

    const updated = await prisma.pemanggilanOrangTua.update({
      where: { id },
      data
    });

    activityLogService.logEvent({
      event_type: 'SUMMONS_UPDATE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'PemanggilanOrangTua',
      entity_id: id,
      metadata: { oldValue: existing, newValue: updated }
    });

    if (
      updated.status === 'DIKIRIM' && 
      updated.ortu_notified && 
      !existing.ortu_notified && 
      updated.visibility !== 'SENSITIVE'
    ) {
      await this.triggerParentNotification(tenantId, updated.siswa_id, ParentEventType.BK_SUMMONS_ISSUED, {
        tanggal: updated.tanggal_pemanggilan.toLocaleDateString('id-ID'),
        alasan: updated.alasan
      });
    }

    return updated;
  }

  static async deletePemanggilan(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('pemanggilanOrangTua', id, tenantId);
    const oldVal = await prisma.pemanggilanOrangTua.findUnique({ where: { id } });
    const res = await prisma.pemanggilanOrangTua.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: userId || null
      }
    });
    activityLogService.logEvent({
      event_type: 'SUMMONS_DELETE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'PemanggilanOrangTua',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    return res;
  }

  static async restorePemanggilan(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('pemanggilanOrangTua', id, tenantId);
    const res = await prisma.pemanggilanOrangTua.update({
      where: { id },
      data: {
        deleted_at: null,
        deleted_by: null
      }
    });
    activityLogService.logEvent({
      event_type: 'SUMMONS_RESTORE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'PemanggilanOrangTua',
      entity_id: id,
      metadata: { newValue: res }
    });
    return res;
  }

  static async getAllPemanggilan(tenantId: string, userContext: { id: string; capabilities: string[] }, query: {
    page?: number;
    limit?: number;
    siswa_id?: string;
    status?: string;
    kasus_bk_id?: string;
    show_deleted?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const visibilityFilter = await this.buildVisibilityFilter(tenantId, userContext);

    const where: Prisma.PemanggilanOrangTuaWhereInput = {
      tenant_id: tenantId,
      ...visibilityFilter
    };

    if (query.show_deleted === 'true') {
      where.deleted_at = { not: null };
    } else {
      where.deleted_at = null;
    }

    if (query.siswa_id) {
      where.siswa_id = query.siswa_id;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.kasus_bk_id) {
      where.kasus_bk_id = query.kasus_bk_id;
    }

    const [total, list] = await Promise.all([
      prisma.pemanggilanOrangTua.count({ where }),
      prisma.pemanggilanOrangTua.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { tanggal_pemanggilan: 'desc' },
        include: {
          Siswa: {
            select: {
              id: true,
              nama_siswa: true,
              nis: true,
              no_hp: true,
              nama_ayah: true,
              nama_ibu: true,
              nama_wali: true,
              Kelas: { select: { nama_kelas: true } },
              OrangTuaSiswa: {
                include: {
                  OrangTua: {
                    select: {
                      nama: true,
                      no_hp: true
                    }
                  }
                }
              }
            }
          },
          Dokumen: true
        }
      })
    ]);

    return {
      list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // === Home Visit ===
  static async createHomeVisit(tenantId: string, data: {
    siswa_id: string;
    tanggal: Date;
    alasan: string;
    hasil?: string;
    foto_dokumen_id?: string;
    kasus_bk_id?: string;
    visibility?: string;
    ortu_notified?: boolean;
  }, userId?: string) {
    const res = await prisma.homeVisit.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        tanggal: data.tanggal,
        alasan: data.alasan,
        hasil: data.hasil,
        foto_dokumen_id: data.foto_dokumen_id,
        kasus_bk_id: data.kasus_bk_id,
        visibility: data.visibility || 'LIMITED',
        ortu_notified: data.ortu_notified || false
      }
    });

    activityLogService.logEvent({
      event_type: 'HOMEVISIT_CREATE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'HomeVisit',
      entity_id: res.id,
      metadata: { newValue: res }
    });

    if (res.ortu_notified && res.visibility !== 'SENSITIVE') {
      await this.triggerParentNotification(tenantId, res.siswa_id, ParentEventType.BK_CASE_ALERT, {});
    }

    return res;
  }

  static async updateHomeVisit(tenantId: string, id: string, data: {
    tanggal?: Date;
    alasan?: string;
    hasil?: string;
    foto_dokumen_id?: string;
    kasus_bk_id?: string;
    visibility?: string;
    ortu_notified?: boolean;
  }, userId?: string) {
    await this.verifyOwner('homeVisit', id, tenantId);
    const oldVal = await prisma.homeVisit.findUnique({ where: { id } });
    const res = await prisma.homeVisit.update({
      where: { id },
      data
    });
    activityLogService.logEvent({
      event_type: 'HOMEVISIT_UPDATE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'HomeVisit',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    return res;
  }

  static async deleteHomeVisit(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('homeVisit', id, tenantId);
    const oldVal = await prisma.homeVisit.findUnique({ where: { id } });
    const res = await prisma.homeVisit.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: userId || null
      }
    });
    activityLogService.logEvent({
      event_type: 'HOMEVISIT_DELETE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'HomeVisit',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    return res;
  }

  static async restoreHomeVisit(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('homeVisit', id, tenantId);
    const res = await prisma.homeVisit.update({
      where: { id },
      data: {
        deleted_at: null,
        deleted_by: null
      }
    });
    activityLogService.logEvent({
      event_type: 'HOMEVISIT_RESTORE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'HomeVisit',
      entity_id: id,
      metadata: { newValue: res }
    });
    return res;
  }

  static async getAllHomeVisits(tenantId: string, userContext: { id: string; capabilities: string[] }, query: {
    page?: number;
    limit?: number;
    siswa_id?: string;
    kasus_bk_id?: string;
    show_deleted?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const visibilityFilter = await this.buildVisibilityFilter(tenantId, userContext);

    const where: Prisma.HomeVisitWhereInput = {
      tenant_id: tenantId,
      ...visibilityFilter
    };

    if (query.show_deleted === 'true') {
      where.deleted_at = { not: null };
    } else {
      where.deleted_at = null;
    }

    if (query.siswa_id) {
      where.siswa_id = query.siswa_id;
    }
    if (query.kasus_bk_id) {
      where.kasus_bk_id = query.kasus_bk_id;
    }

    const [total, list] = await Promise.all([
      prisma.homeVisit.count({ where }),
      prisma.homeVisit.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { tanggal: 'desc' },
        include: {
          Siswa: {
            select: {
              id: true,
              nama_siswa: true,
              nis: true,
              Kelas: { select: { nama_kelas: true } }
            }
          },
          Dokumen: true
        }
      })
    ]);

    return {
      list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // === Asesmen BK ===
  static async createAsesmen(tenantId: string, data: {
    siswa_id: string;
    tanggal: Date;
    nama_asesmen: string;
    hasil_skor?: string;
    keterangan?: string;
    dokumen_id?: string;
    kasus_bk_id?: string;
    visibility?: string;
  }, userId?: string) {
    const res = await prisma.asesmenSiswa.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        tanggal: data.tanggal,
        nama_asesmen: data.nama_asesmen,
        hasil_skor: data.hasil_skor,
        keterangan: data.keterangan,
        dokumen_id: data.dokumen_id,
        kasus_bk_id: data.kasus_bk_id,
        visibility: data.visibility || 'SENSITIVE'
      }
    });

    activityLogService.logEvent({
      event_type: 'ASSESSMENT_CREATE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'AsesmenSiswa',
      entity_id: res.id,
      metadata: { newValue: res }
    });

    return res;
  }

  static async updateAsesmen(tenantId: string, id: string, data: {
    tanggal?: Date;
    nama_asesmen?: string;
    hasil_skor?: string;
    keterangan?: string;
    dokumen_id?: string;
    kasus_bk_id?: string;
    visibility?: string;
  }, userId?: string) {
    await this.verifyOwner('asesmenSiswa', id, tenantId);
    const oldVal = await prisma.asesmenSiswa.findUnique({ where: { id } });
    const res = await prisma.asesmenSiswa.update({
      where: { id },
      data
    });
    activityLogService.logEvent({
      event_type: 'ASSESSMENT_UPDATE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'AsesmenSiswa',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    return res;
  }

  static async deleteAsesmen(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('asesmenSiswa', id, tenantId);
    const oldVal = await prisma.asesmenSiswa.findUnique({ where: { id } });
    const res = await prisma.asesmenSiswa.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: userId || null
      }
    });
    activityLogService.logEvent({
      event_type: 'ASSESSMENT_DELETE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'AsesmenSiswa',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    return res;
  }

  static async restoreAsesmen(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('asesmenSiswa', id, tenantId);
    const res = await prisma.asesmenSiswa.update({
      where: { id },
      data: {
        deleted_at: null,
        deleted_by: null
      }
    });
    activityLogService.logEvent({
      event_type: 'ASSESSMENT_RESTORE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'AsesmenSiswa',
      entity_id: id,
      metadata: { newValue: res }
    });
    return res;
  }

  static async getAllAsesmen(tenantId: string, userContext: { id: string; capabilities: string[] }, query: {
    page?: number;
    limit?: number;
    siswa_id?: string;
    search?: string;
    kasus_bk_id?: string;
    show_deleted?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const visibilityFilter = await this.buildVisibilityFilter(tenantId, userContext);

    const where: Prisma.AsesmenSiswaWhereInput = {
      tenant_id: tenantId,
      ...visibilityFilter
    };

    if (query.show_deleted === 'true') {
      where.deleted_at = { not: null };
    } else {
      where.deleted_at = null;
    }

    if (query.siswa_id) {
      where.siswa_id = query.siswa_id;
    }
    if (query.kasus_bk_id) {
      where.kasus_bk_id = query.kasus_bk_id;
    }
    if (query.search) {
      where.OR = [
        { nama_asesmen: { contains: query.search, mode: 'insensitive' } },
        { keterangan: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const [total, list] = await Promise.all([
      prisma.asesmenSiswa.count({ where }),
      prisma.asesmenSiswa.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { tanggal: 'desc' },
        include: {
          Siswa: {
            select: {
              id: true,
              nama_siswa: true,
              nis: true,
              Kelas: { select: { nama_kelas: true } }
            }
          },
          Dokumen: true
        }
      })
    ]);

    return {
      list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // === Rujukan Kasus ===
  static async createRujukan(tenantId: string, data: {
    siswa_id: string;
    tanggal: Date;
    rujukan_ke: string;
    alasan: string;
    status?: string;
    kasus_bk_id?: string;
    visibility?: string;
  }, userId?: string) {
    const res = await prisma.rujukanKasus.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        tanggal: data.tanggal,
        rujukan_ke: data.rujukan_ke,
        alasan: data.alasan,
        status: data.status || 'DIUSULKAN',
        kasus_bk_id: data.kasus_bk_id,
        visibility: data.visibility || 'LIMITED'
      }
    });

    activityLogService.logEvent({
      event_type: 'REFERRAL_CREATE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'RujukanKasus',
      entity_id: res.id,
      metadata: { newValue: res }
    });

    return res;
  }

  static async updateRujukan(tenantId: string, id: string, data: {
    tanggal?: Date;
    rujukan_ke?: string;
    alasan?: string;
    status?: string;
    kasus_bk_id?: string;
    visibility?: string;
  }, userId?: string) {
    await this.verifyOwner('rujukanKasus', id, tenantId);
    const oldVal = await prisma.rujukanKasus.findUnique({ where: { id } });
    const res = await prisma.rujukanKasus.update({
      where: { id },
      data
    });
    activityLogService.logEvent({
      event_type: 'REFERRAL_UPDATE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'RujukanKasus',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    return res;
  }

  static async deleteRujukan(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('rujukanKasus', id, tenantId);
    const oldVal = await prisma.rujukanKasus.findUnique({ where: { id } });
    const res = await prisma.rujukanKasus.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: userId || null
      }
    });
    activityLogService.logEvent({
      event_type: 'REFERRAL_DELETE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'RujukanKasus',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    return res;
  }

  static async restoreRujukan(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('rujukanKasus', id, tenantId);
    const res = await prisma.rujukanKasus.update({
      where: { id },
      data: {
        deleted_at: null,
        deleted_by: null
      }
    });
    activityLogService.logEvent({
      event_type: 'REFERRAL_RESTORE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'RujukanKasus',
      entity_id: id,
      metadata: { newValue: res }
    });
    return res;
  }

  static async getAllRujukan(tenantId: string, userContext: { id: string; capabilities: string[] }, query: {
    page?: number;
    limit?: number;
    siswa_id?: string;
    status?: string;
    kasus_bk_id?: string;
    show_deleted?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const visibilityFilter = await this.buildVisibilityFilter(tenantId, userContext);

    const where: Prisma.RujukanKasusWhereInput = {
      tenant_id: tenantId,
      ...visibilityFilter
    };

    if (query.show_deleted === 'true') {
      where.deleted_at = { not: null };
    } else {
      where.deleted_at = null;
    }

    if (query.siswa_id) {
      where.siswa_id = query.siswa_id;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.kasus_bk_id) {
      where.kasus_bk_id = query.kasus_bk_id;
    }

    const [total, list] = await Promise.all([
      prisma.rujukanKasus.count({ where }),
      prisma.rujukanKasus.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { tanggal: 'desc' },
        include: {
          Siswa: {
            select: {
              id: true,
              nama_siswa: true,
              nis: true,
              Kelas: { select: { nama_kelas: true } }
            }
          }
        }
      })
    ]);

    return {
      list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // === Dashboard Stats & Early Warning System ===
  static async getDashboardStats(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      activeCounselingCount,
      pendingCallsCount,
      monthHomeVisitsCount,
      recentViolations,
      recentCounselings
    ] = await Promise.all([
      // 1. Active Counseling
      prisma.konselingSiswa.count({
        where: { tenant_id: tenantId, status: 'PROSES' }
      }),
      // 2. Pending Summons
      prisma.pemanggilanOrangTua.count({
        where: { tenant_id: tenantId, status: { in: ['BARU', 'DIKIRIM'] } }
      }),
      // 3. Month Home Visits
      prisma.homeVisit.count({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: startOfMonth }
        }
      }),
      // 4. Recent Violations (top 5)
      prisma.pelanggaranSiswa.findMany({
        where: { tenant_id: tenantId },
        take: 5,
        orderBy: { tanggal: 'desc' },
        include: {
          Siswa: {
            select: { nama_siswa: true, Kelas: { select: { nama_kelas: true } } }
          }
        }
      }),
      // 5. Recent Counselings (top 5)
      prisma.konselingSiswa.findMany({
        where: { tenant_id: tenantId },
        take: 5,
        orderBy: { tanggal: 'desc' },
        include: {
          Siswa: {
            select: { nama_siswa: true, Kelas: { select: { nama_kelas: true } } }
          }
        }
      })
    ]);

    // Composite Risk Score
    const ewsList = await this.calculateEwsForSiswa(tenantId);
    const criticalStudents = ewsList
      .map(e => ({
        id: e.siswa.id,
        nama_siswa: e.siswa.nama_siswa,
        nis: e.siswa.nis,
        kelas: e.siswa.Kelas?.nama_kelas || 'Tanpa Kelas',
        violations: e.violations,
        achievements: e.achievements,
        riskScore: e.riskScore,
        riskLevel: e.riskLevel,
        alpaCount: e.alpaCount
      }))
      .filter(s => s.riskScore > 0)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    return {
      activeCounselingCount,
      pendingCallsCount,
      monthHomeVisitsCount,
      recentViolations,
      recentCounselings,
      criticalStudents
    };
  }

  // === EWS Calculation Helper ===
  static async calculateEwsForSiswa(tenantId: string) {
    const siswaList = await prisma.siswa.findMany({
      where: { tenant_id: tenantId, status: 'AKTIF' },
      include: {
        PelanggaranSiswa: true,
        PrestasiSiswa: true,
        Kelas: {
          include: {
            Jurusan: true
          }
        }
      }
    });

    const activeCases = await prisma.kasusBK.findMany({
      where: {
        tenant_id: tenantId,
        status: { in: ['TERBUKA', 'PROSES', 'RUJUKAN'] },
        deleted_at: null
      }
    });

    const highPriorityMap = new Map<string, number>();
    const mediumPriorityMap = new Map<string, number>();
    const lowPriorityMap = new Map<string, number>();

    activeCases.forEach(c => {
      const sId = c.siswa_id;
      if (c.prioritas === 'TINGGI') {
        highPriorityMap.set(sId, (highPriorityMap.get(sId) || 0) + 1);
      } else if (c.prioritas === 'SEDANG') {
        mediumPriorityMap.set(sId, (mediumPriorityMap.get(sId) || 0) + 1);
      } else if (c.prioritas === 'RENDAH') {
        lowPriorityMap.set(sId, (lowPriorityMap.get(sId) || 0) + 1);
      }
    });

    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);

    const alpaAttendance = await prisma.absenSiswa.findMany({
      where: {
        tenant_id: tenantId,
        status: 'ALPA',
        created_at: { gte: date30DaysAgo },
        Siswa: { status: 'AKTIF' }
      },
      select: { siswa_id: true }
    });

    const alpaMap = new Map<string, number>();
    alpaAttendance.forEach(a => {
      if (a.siswa_id) {
        alpaMap.set(a.siswa_id, (alpaMap.get(a.siswa_id) || 0) + 1);
      }
    });

    return siswaList.map(s => {
      const totalViolations = s.PelanggaranSiswa.reduce((sum: number, p: any) => sum + p.poin, 0);
      const totalAchievements = s.PrestasiSiswa.reduce((sum: number, p: any) => sum + p.poin, 0);
      const alpaCount = alpaMap.get(s.id) || 0;
      const highPriority = highPriorityMap.get(s.id) || 0;
      const mediumPriority = mediumPriorityMap.get(s.id) || 0;
      const lowPriority = lowPriorityMap.get(s.id) || 0;

      let riskScore = (totalViolations * 1.5) 
                      + (alpaCount * 12.0) 
                      + (highPriority * 25.0) 
                      + (mediumPriority * 10.0) 
                      + (lowPriority * 5.0) 
                      - (totalAchievements * 0.5);
      riskScore = Math.max(0, Math.round(riskScore));

      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (riskScore >= 70) {
        riskLevel = 'HIGH';
      } else if (riskScore >= 30) {
        riskLevel = 'MEDIUM';
      }

      return {
        siswa: s as any,
        violations: totalViolations,
        achievements: totalAchievements,
        riskScore,
        riskLevel,
        alpaCount,
        activeCasesCount: highPriority + mediumPriority + lowPriority
      };
    });
  }

  // === Reporting and Analytics ===
  static async getReportsData(tenantId: string) {
    const cases = await prisma.kasusBK.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      include: {
        Siswa: {
          include: {
            Kelas: {
              include: {
                Jurusan: true
              }
            }
          }
        }
      }
    });

    const activeCases = cases.filter(c => ['TERBUKA', 'PROSES', 'RUJUKAN'].includes(c.status));
    const completedCases = cases.filter(c => c.status === 'SELESAI');
    const reopenedCases = cases.filter(c => c.reopen_count > 0);

    const kategoriMap: Record<string, number> = {
      KEDISIPLINAN: 0,
      AKADEMIS: 0,
      PRIBADI: 0,
      SOSIAL: 0
    };
    cases.forEach(c => {
      if (kategoriMap[c.kategori] !== undefined) {
        kategoriMap[c.kategori]++;
      }
    });

    const ewsList = await this.calculateEwsForSiswa(tenantId);
    const riskDistribution = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    ewsList.forEach(e => {
      riskDistribution[e.riskLevel]++;
    });

    const topRiskStudents = ewsList
      .map(e => ({
        id: e.siswa.id,
        nama_siswa: e.siswa.nama_siswa,
        nis: e.siswa.nis,
        kelas: e.siswa.Kelas?.nama_kelas || 'Tanpa Kelas',
        riskScore: e.riskScore,
        riskLevel: e.riskLevel
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20);

    const jurusans = await prisma.jurusan.findMany({
      where: { tenant_id: tenantId }
    });

    const statistikJurusan = jurusans.map(j => {
      const studentsInJurusan = ewsList.filter(e => e.siswa.Kelas?.jurusan_id === j.id);
      const totalStudents = studentsInJurusan.length;
      
      const jumlahKasus = cases.filter(c => c.Siswa?.Kelas?.jurusan_id === j.id).length;
      const jumlahPelanggaran = studentsInJurusan.reduce((sum, e) => sum + e.violations, 0);
      const totalRiskScore = studentsInJurusan.reduce((sum, e) => sum + e.riskScore, 0);
      const averageRiskScore = totalStudents > 0 ? Number((totalRiskScore / totalStudents).toFixed(1)) : 0;

      return {
        id: j.id,
        jurusan: j.kode,
        nama_jurusan: j.nama,
        jumlahKasus,
        jumlahPelanggaran,
        averageRiskScore
      };
    });

    const kelasList = await prisma.kelas.findMany({
      where: { tenant_id: tenantId }
    });

    const statistikKelas = kelasList.map(k => {
      const studentsInKelas = ewsList.filter(e => e.siswa.kelas_id === k.id);
      const totalStudents = studentsInKelas.length;

      const jumlahKasus = cases.filter(c => c.Siswa?.kelas_id === k.id).length;
      const jumlahPelanggaran = studentsInKelas.reduce((sum, e) => sum + e.violations, 0);
      const totalRiskScore = studentsInKelas.reduce((sum, e) => sum + e.riskScore, 0);
      const averageRiskScore = totalStudents > 0 ? Number((totalRiskScore / totalStudents).toFixed(1)) : 0;

      return {
        id: k.id,
        kelas: k.nama_kelas,
        jumlahKasus,
        jumlahPelanggaran,
        averageRiskScore
      };
    }).sort((a, b) => b.averageRiskScore - a.averageRiskScore);

    const kelasBerisiko = [...statistikKelas].slice(0, 5);
    const kelasTerbaik = [...statistikKelas].reverse().slice(0, 5);

    const totalOpened = cases.length;
    const totalCompleted = completedCases.length;
    const completionRate = totalOpened > 0 ? Number(((totalCompleted / totalOpened) * 100).toFixed(1)) : 0;

    let totalResolutionTimeMs = 0;
    let resolvedWithTimeCount = 0;
    completedCases.forEach(c => {
      if (c.closed_at) {
        const openedTime = new Date(c.tanggal_kasus).getTime();
        const closedTime = new Date(c.closed_at).getTime();
        if (closedTime >= openedTime) {
          totalResolutionTimeMs += (closedTime - openedTime);
          resolvedWithTimeCount++;
        }
      }
    });

    const meanResolutionTimeDays = resolvedWithTimeCount > 0 
      ? Number((totalResolutionTimeMs / (1000 * 60 * 60 * 24) / resolvedWithTimeCount).toFixed(1))
      : 0;

    const reopenLogs = await prisma.activityLog.findMany({
      where: {
        tenant_id: tenantId,
        action: 'CASE_REOPEN'
      },
      include: {
        User: {
          include: {
            Guru: true
          }
        }
      }
    });

    const reopenPerGuruMap = new Map<string, number>();
    reopenLogs.forEach(log => {
      const name = log.User?.Guru?.nama_guru || log.User?.full_name || 'System/Lainnya';
      reopenPerGuruMap.set(name, (reopenPerGuruMap.get(name) || 0) + 1);
    });
    const reopenPerGuru = Array.from(reopenPerGuruMap.entries()).map(([name, count]) => ({ name, count }));

    const reopenedCasesDetailed = cases.filter(c => c.reopen_count > 0);
    const reopenPerJurusanMap = new Map<string, number>();
    reopenedCasesDetailed.forEach(c => {
      const jKode = c.Siswa?.Kelas?.Jurusan?.kode || 'Lainnya';
      reopenPerJurusanMap.set(jKode, (reopenPerJurusanMap.get(jKode) || 0) + c.reopen_count);
    });
    const reopenPerJurusan = Array.from(reopenPerJurusanMap.entries()).map(([name, count]) => ({ name, count }));

    const reopenPerKategoriMap = new Map<string, number>();
    reopenedCasesDetailed.forEach(c => {
      reopenPerKategoriMap.set(c.kategori, (reopenPerKategoriMap.get(c.kategori) || 0) + c.reopen_count);
    });
    const reopenPerKategori = Array.from(reopenPerKategoriMap.entries()).map(([name, count]) => ({ name, count }));

    return {
      statistikKasus: {
        active: activeCases.length,
        completed: completedCases.length,
        reopened: reopenedCases.length,
        kategori: kategoriMap
      },
      statistikRisiko: {
        distribution: riskDistribution,
        topRiskStudents
      },
      statistikJurusan,
      statistikKelas: {
        all: statistikKelas,
        best: kelasTerbaik,
        atRisk: kelasBerisiko
      },
      statistikPenyelesaian: {
        totalOpened,
        totalCompleted,
        completionRate,
        meanResolutionTimeDays
      },
      statistikReopen: {
        totalReopened: reopenedCases.reduce((sum, c) => sum + c.reopen_count, 0),
        perGuru: reopenPerGuru,
        perJurusan: reopenPerJurusan,
        perKategori: reopenPerKategori
      }
    };
  }

  static async getStudentRiskTrend(tenantId: string, siswaId: string) {
    await this.verifyOwner('siswa', siswaId, tenantId);

    const snapshots = await prisma.ewsSnapshot.findMany({
      where: { tenant_id: tenantId, siswa_id: siswaId },
      orderBy: { snapshot_date: 'asc' }
    });

    const [violations, achievements, counselings, visits, summons, cases] = await Promise.all([
      prisma.pelanggaranSiswa.findMany({
        where: { tenant_id: tenantId, siswa_id: siswaId },
        orderBy: { tanggal: 'asc' }
      }),
      prisma.prestasiSiswa.findMany({
        where: { tenant_id: tenantId, siswa_id: siswaId },
        orderBy: { tanggal: 'asc' }
      }),
      prisma.konselingSiswa.findMany({
        where: { tenant_id: tenantId, siswa_id: siswaId, deleted_at: null },
        orderBy: { tanggal: 'asc' }
      }),
      prisma.homeVisit.findMany({
        where: { tenant_id: tenantId, siswa_id: siswaId, deleted_at: null },
        orderBy: { tanggal: 'asc' }
      }),
      prisma.pemanggilanOrangTua.findMany({
        where: { tenant_id: tenantId, siswa_id: siswaId, deleted_at: null },
        orderBy: { tanggal_pemanggilan: 'asc' }
      }),
      prisma.kasusBK.findMany({
        where: { tenant_id: tenantId, siswa_id: siswaId, deleted_at: null },
        orderBy: { tanggal_kasus: 'asc' }
      })
    ]);

    const events: Array<{ date: string; type: string; title: string; description: string }> = [];

    violations.forEach(v => {
      events.push({
        date: v.tanggal.toISOString().split('T')[0],
        type: 'VIOLATION',
        title: `Pelanggaran: ${v.jenis_pelanggaran || 'Pelanggaran'}`,
        description: `Poin pelanggaran tercatat: +${v.poin}`
      });
    });

    achievements.forEach(a => {
      events.push({
        date: a.tanggal.toISOString().split('T')[0],
        type: 'ACHIEVEMENT',
        title: `Prestasi: ${a.nama_prestasi}`,
        description: `Poin penghargaan tercatat: -${a.poin}`
      });
    });

    counselings.forEach(c => {
      events.push({
        date: c.tanggal.toISOString().split('T')[0],
        type: 'COUNSELING',
        title: `Konseling ${c.tipe === 'INDIVIDU' ? 'Individu' : 'Kelompok'}`,
        description: `Status: ${c.status}. Masalah: ${c.masalah.slice(0, 60)}...`
      });
    });

    visits.forEach(v => {
      events.push({
        date: v.tanggal.toISOString().split('T')[0],
        type: 'HOMEVISIT',
        title: `Home Visit`,
        description: `Alasan: ${v.alasan.slice(0, 60)}...`
      });
    });

    summons.forEach(s => {
      events.push({
        date: s.tanggal_pemanggilan.toISOString().split('T')[0],
        type: 'SUMMONS',
        title: `Pemanggilan Orang Tua`,
        description: `Alasan: ${s.alasan.slice(0, 60)}... Status: ${s.status}`
      });
    });

    cases.forEach(c => {
      events.push({
        date: c.tanggal_kasus.toISOString().split('T')[0],
        type: 'CASE_OPEN',
        title: `Kasus Baru Dibuka: ${c.judul}`,
        description: `Kategori: ${c.kategori}, Prioritas: ${c.prioritas}`
      });
      if (c.closed_at) {
        events.push({
          date: c.closed_at.toISOString().split('T')[0],
          type: 'CASE_CLOSE',
          title: `Kasus Selesai: ${c.judul}`,
          description: `Catatan: ${c.catatan_selesai || '-'}`
        });
      }
    });

    events.sort((a, b) => a.date.localeCompare(b.date));

    return {
      snapshots: snapshots.map(s => ({
        id: s.id,
        risk_score: s.risk_score,
        risk_level: s.risk_level,
        violations_score: s.violations_score,
        achievement_score: s.achievement_score,
        alpa_count: s.alpa_count,
        active_cases: s.active_cases,
        date: s.snapshot_date.toISOString().split('T')[0]
      })),
      events
    };
  }

  static async getWaliKelasDashboardData(tenantId: string, userId: string) {
    const classIds = await this.getWaliKelasClassIds(tenantId, userId);
    if (classIds.length === 0) {
      return {
        kelas: 'Belum Ditugaskan',
        activeCasesCount: 0,
        pendingSummonsCount: 0,
        siswaKritis: [],
        cases: [],
        summons: [],
        trend: []
      };
    }

    // Ambil nama-nama kelas binaan
    const classes = await prisma.kelas.findMany({
      where: { id: { in: classIds }, tenant_id: tenantId },
      select: { nama_kelas: true }
    });
    const className = classes.map(c => c.nama_kelas).join(', ');

    const allEws = await this.calculateEwsForSiswa(tenantId);
    const classEws = allEws.filter(e => classIds.includes(e.siswa.kelas_id));
    const classSiswaIds = classEws.map(e => e.siswa.id);

    const siswaKritis = classEws
      .map(e => ({
        id: e.siswa.id,
        nama_siswa: e.siswa.nama_siswa,
        nis: e.siswa.nis,
        riskScore: e.riskScore,
        riskLevel: e.riskLevel,
        violations: e.violations,
        achievements: e.achievements,
        alpaCount: e.alpaCount
      }))
      .filter(s => s.riskScore > 0)
      .sort((a, b) => b.riskScore - a.riskScore);

    const cases = await prisma.kasusBK.findMany({
      where: {
        tenant_id: tenantId,
        siswa_id: { in: classSiswaIds },
        status: { in: ['TERBUKA', 'PROSES', 'RUJUKAN'] },
        deleted_at: null
      },
      include: {
        Siswa: {
          select: { nama_siswa: true, nis: true, Kelas: { select: { nama_kelas: true } } }
        }
      }
    });

    const summons = await prisma.pemanggilanOrangTua.findMany({
      where: {
        tenant_id: tenantId,
        siswa_id: { in: classSiswaIds },
        status: { in: ['BARU', 'DIKIRIM'] },
        deleted_at: null
      },
      include: {
        Siswa: {
          select: { nama_siswa: true, nis: true, Kelas: { select: { nama_kelas: true } } }
        }
      }
    });

    // Terapkan filter visibilitas: SENSITIVE tidak boleh dilihat wali kelas
    const allowedCases = cases.filter(c => c.visibility !== 'SENSITIVE').map(c => ({
      id: c.id,
      judul: c.judul,
      kategori: c.kategori,
      prioritas: c.prioritas,
      status: c.status,
      tanggal_kasus: c.tanggal_kasus,
      nama_siswa: c.Siswa?.nama_siswa || '-'
    }));

    const allowedSummons = summons.filter(s => s.visibility !== 'SENSITIVE').map(s => ({
      id: s.id,
      tanggal_pemanggilan: s.tanggal_pemanggilan,
      alasan: s.alasan,
      status: s.status,
      nama_siswa: s.Siswa?.nama_siswa || '-'
    }));

    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);

    const snapshots = await prisma.ewsSnapshot.findMany({
      where: {
        tenant_id: tenantId,
        siswa_id: { in: classSiswaIds },
        snapshot_date: { gte: date30DaysAgo }
      },
      orderBy: { snapshot_date: 'asc' }
    });

    const trendMap = new Map<string, { date: string; sumScore: number; count: number }>();
    snapshots.forEach(s => {
      const dateStr = s.snapshot_date.toISOString().split('T')[0];
      const existing = trendMap.get(dateStr) || { date: dateStr, sumScore: 0, count: 0 };
      existing.sumScore += s.risk_score;
      existing.count += 1;
      trendMap.set(dateStr, existing);
    });

    const trend = Array.from(trendMap.values()).map(t => ({
      date: t.date,
      average_risk_score: Number((t.sumScore / t.count).toFixed(1))
    })).sort((a, b) => a.date.localeCompare(b.date));

    return {
      kelas: className,
      activeCasesCount: allowedCases.length,
      pendingSummonsCount: allowedSummons.length,
      siswaKritis,
      cases: allowedCases,
      summons: allowedSummons,
      trend
    };
  }

  static async getAuditLogsData(tenantId: string, query: { page?: string | number; limit?: string | number; search?: string }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Number(query.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      tenant_id: tenantId,
      entity: {
        in: ['KasusBK', 'KonselingSiswa', 'PemanggilanOrangTua', 'HomeVisit', 'AsesmenSiswa', 'RujukanKasus']
      }
    };

    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { entity: { contains: query.search, mode: 'insensitive' } },
        { User: { full_name: { contains: query.search, mode: 'insensitive' } } }
      ];
    }

    const [total, list] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        include: {
          User: {
            select: {
              id: true,
              full_name: true,
              email: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip,
        take: limit
      })
    ]);

    return {
      list,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // === Helper Owner Verification ===
  private static async verifyOwner(modelName: string, id: string, tenantId: string) {
    const dbModel = (prisma as any)[modelName];
    if (!dbModel) {
      throw new Error(`Model ${modelName} not found in Prisma client`);
    }
    const record = await dbModel.findFirst({
      where: { id, tenant_id: tenantId }
    });
    if (!record) {
      throw new Error(`Data not found or unauthorized access to model ${modelName}`);
    }
  }
}


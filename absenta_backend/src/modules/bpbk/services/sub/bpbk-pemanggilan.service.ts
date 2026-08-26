// @ts-nocheck
import { PLATFORM_TIMEZONE } from '@/infra/jobEngine';
import { getTenantTimezone } from '@/utils/timezone.utils';
import { appLogger } from '@/utils/app-logger';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../utils/prisma';
import { parentNotificationService } from '../../../parent-app/services/parent-notification.service';
import { ParentEventType } from '../../../parent-app/constants/parent-event-matrix';
import { activityLogService } from '../../../activity/services/activity-log.service';
import { SuratKeluarService } from '../../../correspondence/services/surat-keluar.service';
import { systemConfigService } from '../../../system-config/services/system-config.service';
import { randomBytes } from 'crypto';
import { cacheService } from '../../../../utils/cache.service';
import { getSmartFrontendBaseUrl } from '../../../../utils/url-helper';
import { cacheInvalidationService } from '../../../../utils/cache-invalidation.service';
import { BpbkCommonHelper } from './bpbk-common.helper';
import { BpbkPemanggilanService } from './bpbk-pemanggilan.service';
import { BpbkKasusService } from './bpbk-kasus.service';
import { BpbkKonselingService } from './bpbk-konseling.service';
import { BpbkHomeVisitService } from './bpbk-homevisit.service';
import { BpbkAsesmenService } from './bpbk-asesmen.service';
import { BpbkAnalyticsService } from './bpbk-analytics.service';

export class BpbkPemanggilanService {
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
        `?? *Link Persetujuan Cepat (Tanpa Login):*\n` +
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
        `?? *Link Surat Panggilan Resmi (Unduh PDF):*\n` +
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
          event: 'SUMMONS_DELIVERED',
          force: true
        });
        console.log(`[BK Parent WA] Sent WhatsApp notification to Parent (${noHp}) for summons ${summonsId}`);
      }
    } catch (e) {
      console.error('[BK Parent WA] Failed to send WhatsApp notification to Parent:', e);
    }
  }

  // === Kasus BK ===

  static async createPemanggilan(tenantId: string, data: {
    siswa_id: string;
    tanggal_pemanggilan: Date;
    alasan: string;
    waktu_pertemuan?: string | null;
    tempat_pertemuan?: string | null;
    surat_dokumen_id?: string | null;
    kasus_bk_id?: string | null;
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
    tanggal_pertemuan?: Date | null;
    keterangan_pertemuan?: string | null;
    status?: string;
    alasan?: string;
    waktu_pertemuan?: string | null;
    tempat_pertemuan?: string | null;
    surat_dokumen_id?: string | null;
    kasus_bk_id?: string | null;
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
}

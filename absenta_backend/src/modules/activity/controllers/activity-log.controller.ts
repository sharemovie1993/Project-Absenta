import { prisma } from '../../../utils/prisma';

export class ActivityLogController {
  async getTenantLogs(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: Tenant ID required',
        });
      }

      const query = request.query || {};
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const limit = Math.max(1, Math.min(100, parseInt(query.limit || '15', 10)));
      const user_id = query.user_id ? String(query.user_id) : undefined;
      const action = query.action ? String(query.action) : undefined;
      const date_from = query.date_from ? String(query.date_from) : undefined;
      const date_to = query.date_to ? String(query.date_to) : undefined;
      const search = query.search ? String(query.search) : undefined;

      const whereClause: any = {
        tenant_id: tenantId,
      };

      if (user_id) {
        whereClause.user_id = user_id;
      }

      if (action) {
        whereClause.action = action;
      }

      if (date_from || date_to) {
        whereClause.created_at = {};
        if (date_from) {
          whereClause.created_at.gte = new Date(date_from);
        }
        if (date_to) {
          const endDate = new Date(date_to);
          endDate.setHours(23, 59, 59, 999);
          whereClause.created_at.lte = endDate;
        }
      }

      if (search) {
        const q = search;
        const orConditions = [
          { action: { contains: q, mode: 'insensitive' } },
          { entity: { contains: q, mode: 'insensitive' } },
          { metadata: { contains: q, mode: 'insensitive' } },
          { User: { is: { full_name: { contains: q, mode: 'insensitive' } } } },
          { User: { is: { email: { contains: q, mode: 'insensitive' } } } },
        ];
        whereClause.OR = Array.isArray(whereClause.OR)
          ? [...whereClause.OR, ...orConditions]
          : orConditions;
      }

      const offset = (page - 1) * limit;

      const [total, rawLogs] = await Promise.all([
        prisma.activityLog.count({ where: whereClause }),
        prisma.activityLog.findMany({
          where: whereClause,
          orderBy: { created_at: 'desc' },
          skip: offset,
          take: limit,
          include: {
            User: {
              select: {
                id: true,
                full_name: true,
                email: true,
              },
            },
          },
        }),
      ]);

      // Map raw activity logs to a premium Indonesian representation
      const logs = rawLogs.map((log: any) => {
        let description = 'Melakukan aktivitas sistem.';
        let meta: Record<string, any> = {};

        try {
          if (log.metadata) {
            meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
          }
        } catch (e) {
          console.error('Failed to parse log metadata:', e);
        }

        switch (log.action) {
          case 'USER_LOGIN':
            description = 'Berhasil masuk ke dalam aplikasi.';
            break;
          case 'USER_LOGOUT':
            description = 'Berhasil keluar dari aplikasi.';
            break;
          case 'USER_CREATED':
            description = `Membuat data pengguna baru dengan email ${meta.email || 'tidak diketahui'}.`;
            break;
          case 'USER_UPDATED':
            description = `Memperbarui informasi profil pengguna ${meta.email || ''}.`;
            break;
          case 'USER_DELETED':
            description = 'Menghapus data pengguna dari sistem.';
            break;
          case 'PROFILE_UPDATED':
            description = 'Memperbarui rincian informasi profil pribadi.';
            break;
          case 'UPGRADE_CLICKED':
            description = 'Mengklik tombol penawaran peningkatan paket aplikasi.';
            break;
          case 'REPORT_GENERATED':
            description = `Mengunduh laporan rekapitulasi data ${meta.report_type || 'sistem'}.`;
            break;
          case 'ATTENDANCE_MANUAL_INPUT':
            description = `Melakukan input/rekap absensi manual siswa ${meta.siswa_name || ''} dengan status ${meta.status || ''}.`;
            break;
          case 'ACADEMIC_STUDENT_SYNC': {
            const sem = meta.semester_name || '';
            const year = meta.tahun_pelajaran_name || '';
            const kls = meta.kelas_name ? ` untuk kelas ${meta.kelas_name}` : '';
            const countStr = meta.total_synced !== undefined ? `${meta.total_synced} siswa` : '';
            description = `Melakukan sinkronisasi data siswa akademik semester ${sem} ${year}${kls} (${countStr ? `berhasil menyelaraskan ${countStr}` : 'Berhasil'}).`;
            break;
          }
          case 'ACADEMIC_TRANSITION_EXECUTE': {
            const yearLama = meta.tahun_pelajaran_lama_name || '';
            const yearBaru = meta.tahun_pelajaran_baru_name || '';
            const count = meta.total_students_transitioned || 0;
            description = `Mengeksekusi proses kelulusan & kenaikan kelas dari tahun ajaran ${yearLama} ke ${yearBaru} (${count} siswa berhasil dipindahkan).`;
            break;
          }
          case 'ACADEMIC_STUDENT_CLASS_CHANGED': {
            const namaSiswa = meta.nama_siswa || 'Siswa';
            const oldKelas = meta.old_kelas_name || 'Tanpa Kelas';
            const newKelas = meta.new_kelas_name || 'Tanpa Kelas';
            description = `Mengubah kelas siswa ${namaSiswa} dari kelas ${oldKelas} menjadi kelas ${newKelas}.`;
            break;
          }
          default:
            description = `Melakukan aksi ${log.action} pada entitas ${log.entity || 'sistem'}.`;
            break;
        }

        return {
          id: log.id,
          action: log.action,
          entity: log.entity,
          entity_id: log.entity_id,
          description,
          created_at: log.created_at,
          user: log.User
            ? {
                id: log.User.id,
                name: log.User.full_name,
                email: log.User.email,
              }
            : null,
        };
      });

      return reply.status(200).send({
        success: true,
        message: 'Logs fetched successfully',
        data: {
          logs,
          pagination: {
            total,
            page,
            limit,
            total_pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: any) {
      console.error('Failed to get activity logs:', error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  async getActiveUsers(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: Tenant ID required',
        });
      }

      const minutesAgo = 15;
      const sinceTime = new Date(Date.now() - minutesAgo * 60 * 1000);

      const recentLogs = await prisma.activityLog.findMany({
        where: {
          tenant_id: tenantId,
          created_at: { gte: sinceTime },
          user_id: { not: null },
        },
        orderBy: { created_at: 'desc' },
        include: {
          User: {
            select: {
              id: true,
              full_name: true,
              email: true,
              no_hp: true,
              Role: { select: { name: true } },
              Guru: { select: { no_hp: true } },
              Siswa: { select: { no_hp: true } },
            },
          },
        },
      });

      const activeUserMap = new Map<string, any>();
      for (const log of recentLogs) {
        if (log.user_id && !activeUserMap.has(log.user_id)) {
          const userPhone = log.User?.no_hp || log.User?.Guru?.no_hp || log.User?.Siswa?.no_hp || null;
          activeUserMap.set(log.user_id, {
            user_id: log.user_id,
            name: log.User?.full_name || 'Pengguna',
            email: log.User?.email || '',
            no_hp: userPhone,
            role: log.User?.Role?.name || 'Pengguna',
            last_action: log.action,
            last_activity: log.created_at,
          });
        }
      }

      const activeUsers = Array.from(activeUserMap.values());

      return reply.status(200).send({
        success: true,
        data: {
          count: activeUsers.length,
          users: activeUsers,
          window_minutes: minutesAgo,
        },
      });
    } catch (error: any) {
      console.error('Failed to get active users:', error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  async sendLogoutWarning(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: Tenant ID required',
        });
      }

      const { user_id, phone, name, is_bulk, target_users } = request.body || {};

      const { WhatsappService } = await import('../../whatsapp/services/whatsapp.service');
      const whatsappService = new WhatsappService();
      let config: any = await whatsappService.getConfig(tenantId);
      if (!config) {
        config = { tenant_id: tenantId, provider_name: 'LOCAL', is_active: true };
      }

      // Handle Bulk Broadcast
      if (is_bulk && Array.isArray(target_users) && target_users.length > 0) {
        let sentCount = 0;
        let failedCount = 0;

        for (const item of target_users) {
          const targetPhone = item.phone || item.no_hp;
          if (!targetPhone) {
            failedCount++;
            continue;
          }
          const targetName = item.name || 'Pengguna';
          const msg = `*PEMBERITAHUAN LOGOUT SISTEM ABSENTA*\n\nHalo *${targetName}*,\nMohon perhatian: Sistem akademik saat ini sedang dalam persiapan pemeliharaan / pemulihan data.\n\nMohon untuk segera menyimpan pekerjaan Anda dan melakukan *LOGOUT* dari aplikasi.\n\nTerima kasih atas kerja samanya! 🙏`;

          try {
            await whatsappService.sendMessage(config, targetPhone, msg);
            sentCount++;
          } catch (e) {
            console.error(`Failed sending WA logout notice to ${targetName} (${targetPhone}):`, e);
            failedCount++;
          }
        }

        return reply.status(200).send({
          success: true,
          message: `Berhasil mengautomasikan pengiriman WA Gateway ke ${sentCount} pengguna aktif (${failedCount} gagal/tanpa nomor).`,
          data: { sent_count: sentCount, failed_count: failedCount },
        });
      }

      // Single User Mode
      let targetPhone = phone;
      let targetName = name || 'Pengguna';

      if (user_id) {
        const targetUser = await prisma.user.findUnique({
          where: { id: user_id },
          select: {
            full_name: true,
            no_hp: true,
            Guru: { select: { no_hp: true } },
            Siswa: { select: { no_hp: true } },
          },
        });
        if (targetUser) {
          targetName = targetUser.full_name || targetName;
          targetPhone = targetPhone || targetUser.no_hp || targetUser.Guru?.no_hp || targetUser.Siswa?.no_hp;
        }
      }

      if (!targetPhone) {
        return reply.status(400).send({
          success: false,
          message: `Nomor telepon untuk ${targetName} tidak ditemukan di database.`,
        });
      }

      const message = `*PEMBERITAHUAN LOGOUT SISTEM ABSENTA*\n\nHalo *${targetName}*,\nMohon perhatian: Sistem akademik saat ini sedang dalam persiapan pemeliharaan / pemulihan data.\n\nMohon untuk segera menyimpan pekerjaan Anda dan melakukan *LOGOUT* dari aplikasi.\n\nTerima kasih atas kerja samanya! 🙏`;

      const result = await whatsappService.sendMessage(config, targetPhone, message);

      return reply.status(200).send({
        success: true,
        message: `Pesan WA peringatan logout berhasil terkirim via WA Gateway ke ${targetName} (${targetPhone})`,
        data: result,
      });
    } catch (error: any) {
      console.error('Failed to send WA logout warning:', error);
      let errMsg = error.message || 'Gagal mengirim pesan WA via Gateway';
      if (errMsg.includes('belum terhubung') || errMsg.toLowerCase().includes('closed') || errMsg.toLowerCase().includes('disconnect')) {
        errMsg = 'Koneksi WA Gateway terputus atau sedang menyambung ulang. Silakan coba klik Kirim WA sekali lagi, atau buka Konfigurasi WA untuk memverifikasi status WA Connected (Scan QR).';
      }
      return reply.status(400).send({
        success: false,
        message: errMsg,
      });
    }
  }
}

export const activityLogController = new ActivityLogController();

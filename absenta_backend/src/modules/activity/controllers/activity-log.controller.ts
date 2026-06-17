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
}

export const activityLogController = new ActivityLogController();

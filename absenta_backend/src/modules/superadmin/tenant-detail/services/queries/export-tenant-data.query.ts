import { tenantDetailDb as prisma } from '../repositories/tenant-detail.db';

export async function exportTenantDataQuery(
  tenantId: string,
  entities: string[],
  format: 'JSON' | 'CSV' | 'EXCEL',
  dateFrom?: string,
  dateTo?: string
) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true }
    });

    if (!tenant) {
      throw new Error(`Tenant dengan ID ${tenantId} tidak ditemukan`);
    }

    const validEntities = ['users', 'academic', 'attendance', 'billing', 'logs'];
    const invalidEntities = entities.filter((entity) => !validEntities.includes(entity));
    if (invalidEntities.length > 0) {
      throw new Error(`Entitas tidak valid: ${invalidEntities.join(', ')}`);
    }

    const dateFilter: any = {};
    if (dateFrom) {
      dateFilter.gte = new Date(dateFrom);
    }
    if (dateTo) {
      dateFilter.lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const exportData: any = {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        exported_at: new Date().toISOString(),
        date_range: {
          from: dateFrom || null,
          to: dateTo || null
        }
      }
    };

    if (entities.includes('users')) {
      const users = await prisma.user.findMany({
        where: {
          tenant_id: tenantId,
          ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter })
        },
        include: {
          Role: true
        },
        orderBy: { created_at: 'desc' }
      });

      exportData.users = users.map((user) => ({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: (user as any).Role?.name || 'Unknown',
        status: (user as any).status,
        created_at: (user as any).created_at,
        updated_at: (user as any).updated_at
      }));
    }

    if (entities.includes('academic')) {
      const [jurusan, kelas, guru, siswa, mapel] = await Promise.all([
        prisma.jurusan.findMany({
          where: {
            tenant_id: tenantId,
            ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter })
          }
        }),
        prisma.kelas.findMany({
          where: {
            tenant_id: tenantId,
            ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter })
          },
          include: { Jurusan: true }
        }),
        prisma.guru.findMany({
          where: {
            tenant_id: tenantId,
            ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter })
          }
        }),
        prisma.siswa.findMany({
          where: {
            tenant_id: tenantId,
            ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter })
          },
          include: { Kelas: true }
        }),
        prisma.mapel.findMany({
          where: {
            tenant_id: tenantId,
            ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter })
          }
        })
      ]);

      exportData.academic = {
        jurusan: (jurusan as any[]).map((j: any) => ({
          id: j.id,
          nama: j.nama,
          kode: j.kode,
          created_at: j.created_at
        })),
        kelas: (kelas as any[]).map((k: any) => ({
          id: k.id,
          nama_kelas: k.nama_kelas,
          tingkat: k.tingkat,
          jurusan: k.Jurusan?.nama || 'Unknown',
          created_at: k.created_at
        })),
        guru: (guru as any[]).map((g: any) => ({
          id: g.id,
          nama_guru: g.nama_guru,
          nip: g.nip,
          created_at: g.created_at
        })),
        siswa: (siswa as any[]).map((s: any) => ({
          id: s.id,
          nama_siswa: s.nama_siswa,
          nis: s.nis,
          kelas: s.Kelas?.nama_kelas || 'Unknown',
          created_at: s.created_at
        })),
        mata_pelajaran: (mapel as any[]).map((m: any) => ({
          id: m.id,
          nama_mapel: m.nama_mapel,
          kode_mapel: m.kode_mapel,
          created_at: m.created_at
        }))
      };
    }

    if (entities.includes('attendance')) {
      const attendance = await prisma.sesiAbsensi.findMany({
        where: {
          tenant_id: tenantId,
          ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter })
        },
        include: {
          Kelas: true,
          Guru: true,
          Mapel: true
        },
        orderBy: { created_at: 'desc' }
      });

      exportData.attendance = (attendance as any[]).map((a: any) => ({
        id: a.id,
        tanggal: a.tanggal,
        waktu_mulai: a.waktu_mulai,
        waktu_selesai: a.waktu_selesai,
        jenis_kegiatan: a.jenis_kegiatan,
        kelas: a.Kelas?.nama_kelas || 'Unknown',
        guru: a.Guru?.nama_guru || 'Unknown',
        mata_pelajaran: a.Mapel?.nama_mapel || 'Unknown',
        status: a.status,
        created_at: a.created_at
      }));
    }

    if (entities.includes('billing')) {
      const [subscriptions, payments] = await Promise.all([
        prisma.subscription.findMany({
          where: {
            tenant_id: tenantId,
            ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter })
          },
          include: { Plan: true }
        }),
        prisma.payment.findMany({
          where: {
            tenant_id: tenantId,
            ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter })
          }
        })
      ]);

      exportData.billing = {
        subscriptions: (subscriptions as any[]).map((s: any) => ({
          id: s.id,
          plan_name: s.Plan?.name || 'Unknown',
          status: s.status,
          start_date: s.start_date,
          end_date: s.end_date,
          created_at: s.created_at
        })),
        payments: (payments as any[]).map((p: any) => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          payment_method: p.payment_method,
          created_at: p.created_at,
          paid_at: p.paid_at
        }))
      };
    }

    if (entities.includes('logs')) {
      const logs = await prisma.activityLog.findMany({
        where: {
          tenant_id: tenantId,
          ...(Object.keys(dateFilter).length > 0 && { timestamp: dateFilter })
        },
        include: {
          User: {
            select: {
              id: true,
              full_name: true,
              email: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        take: 1000
      });

      exportData.logs = (logs as any[]).map((log: any) => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        entity_id: log.entity_id,
        user: log.User
          ? {
              id: log.User.id,
              name: log.User.full_name,
              email: log.User.email
            }
          : null,
        timestamp: log.created_at,
        metadata: log.metadata
      }));
    }

    if (format === 'JSON') {
      return {
        format: 'JSON',
        data: exportData,
        file_size: JSON.stringify(exportData).length,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
    }

    if (format === 'CSV') {
      const sections: Array<{ title: string; rows: any[] }> = [];
      if (exportData.users) sections.push({ title: 'users', rows: exportData.users });
      if (exportData.academic?.jurusan) sections.push({ title: 'academic_jurusan', rows: exportData.academic.jurusan });
      if (exportData.academic?.kelas) sections.push({ title: 'academic_kelas', rows: exportData.academic.kelas });
      if (exportData.academic?.guru) sections.push({ title: 'academic_guru', rows: exportData.academic.guru });
      if (exportData.academic?.siswa) sections.push({ title: 'academic_siswa', rows: exportData.academic.siswa });
      if (exportData.academic?.mata_pelajaran) sections.push({ title: 'academic_mapel', rows: exportData.academic.mata_pelajaran });
      if (exportData.attendance) sections.push({ title: 'attendance', rows: exportData.attendance });
      if (exportData.billing?.subscriptions) sections.push({ title: 'billing_subscriptions', rows: exportData.billing.subscriptions });
      if (exportData.billing?.payments) sections.push({ title: 'billing_payments', rows: exportData.billing.payments });
      if (exportData.logs) sections.push({ title: 'logs', rows: exportData.logs });
      const buildCsv = (rows: any[]) => {
        if (!rows || rows.length === 0) return '';
        const headers = Array.from(new Set(rows.flatMap((r: any) => Object.keys(r))));
        const escape = (v: any) => {
          if (v === null || typeof v === 'undefined') return '';
          const s = typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v);
          if (s.includes(',') || s.includes('\"') || s.includes('\n')) return `\"${s.replace(/\"/g, '\"\"')}\"`;
          return s;
        };
        const headerLine = headers.join(',');
        const dataLines = rows.map((r: any) => headers.map((h) => escape(r[h])).join(','));
        return [headerLine, ...dataLines].join('\n');
      };
      const parts = sections.map((sec) => [`Entity,${sec.title}`, buildCsv(sec.rows)].join('\n'));
      const content = parts.join('\n\n');
      const filename = `tenant-export-${tenantId}-${Date.now()}.csv`;
      return { format: 'CSV', filename, content };
    }

    if (format === 'EXCEL') {
      const XLSX = require('xlsx');
      const wb = XLSX.utils.book_new();
      const addSheet = (name: string, rows: any[]) => {
        const ws = XLSX.utils.json_to_sheet(rows || []);
        XLSX.utils.book_append_sheet(wb, ws, name);
      };
      if (exportData.users) addSheet('users', exportData.users);
      if (exportData.academic?.jurusan) addSheet('academic_jurusan', exportData.academic.jurusan);
      if (exportData.academic?.kelas) addSheet('academic_kelas', exportData.academic.kelas);
      if (exportData.academic?.guru) addSheet('academic_guru', exportData.academic.guru);
      if (exportData.academic?.siswa) addSheet('academic_siswa', exportData.academic.siswa);
      if (exportData.academic?.mata_pelajaran) addSheet('academic_mapel', exportData.academic.mata_pelajaran);
      if (exportData.attendance) addSheet('attendance', exportData.attendance);
      if (exportData.billing?.subscriptions) addSheet('billing_subscriptions', exportData.billing.subscriptions);
      if (exportData.billing?.payments) addSheet('billing_payments', exportData.billing.payments);
      if (exportData.logs) addSheet('logs', exportData.logs);
      const buffer: Buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      const filename = `tenant-export-${tenantId}-${Date.now()}.xlsx`;
      return { format: 'EXCEL', filename, content: buffer };
    }

    return {
      format: 'JSON',
      data: exportData
    };
  } catch (error) {
    console.error('Error exporting tenant data:', error);
    throw new Error(`Gagal mengekspor data tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


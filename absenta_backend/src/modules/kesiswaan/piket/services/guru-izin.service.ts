import { prisma } from '../../../../utils/prisma';
import { getTenantTimezone, getTenantDayRangeUTC, getTenantOffsetString } from '../../../../utils/timezone.utils';
import { Hari } from '@prisma/client';
import { getRedisConnection } from '../../../../queue/redis';

export interface CreatePermohonanIzinGuruInput {
  guru_id: string;
  tipe_izin: 'SAKIT' | 'IZIN_PRIBADI' | 'DINAS_LUAR' | 'CUTI' | 'LAINNYA';
  tipe_durasi?: 'SEHARIAN' | 'MULTI_HARI' | 'SEBAGIAN_SESI';
  tanggal_mulai: string; // "YYYY-MM-DD"
  tanggal_selesai: string; // "YYYY-MM-DD"
  jam_mulai?: string; // "07:15"
  jam_selesai?: string; // "11:40"
  alasan: string;
  attachment_url?: string;
  attachment_type?: string;
  instruksi_tugas?: string;
  file_tugas_url?: string;
  tugas_per_kelas?: any;
}

export class GuruIzinService {
  /**
   * Helper: Petakan tipe izin ke status presensi kanonikal AbsenGuru
   */
  static mapToCanonicalStatus(tipeIzin: string): 'SAKIT' | 'IZIN' | 'PENUGASAN' {
    const clean = String(tipeIzin).toUpperCase();
    if (clean === 'SAKIT') return 'SAKIT';
    if (clean === 'DINAS_LUAR' || clean === 'PENUGASAN' || clean === 'TUGAS_LUAR') return 'PENUGASAN';
    return 'IZIN';
  }

  /**
   * 1. Ajukan Permohonan Izin / Dinas Guru
   */
  static async createPermohonan(
    tenantId: string,
    userId: string,
    data: CreatePermohonanIzinGuruInput
  ) {
    const timeZone = await getTenantTimezone(tenantId);
    const startRange = getTenantDayRangeUTC(data.tanggal_mulai, timeZone);
    const endRange = getTenantDayRangeUTC(data.tanggal_selesai, timeZone);

    const guru = await prisma.guru.findFirst({
      where: { id: data.guru_id, tenant_id: tenantId }
    });

    if (!guru) {
      throw new Error('Data Guru tidak ditemukan.');
    }

    // 🛡️ Idempotency & Overlap Guard: Prevent duplicate / hanging permissions
    const existingPermits = await prisma.permohonanIzinGuru.findMany({
      where: {
        tenant_id: tenantId,
        guru_id: data.guru_id,
        status: { in: ['PENDING', 'DISETUJUI'] },
        tanggal_mulai: { lte: endRange.endUTC },
        tanggal_selesai: { gte: startRange.startUTC }
      }
    });

    for (const existing of existingPermits) {
      let isConflicting = false;
      const bothPartial = (data.tipe_durasi === 'SEBAGIAN_SESI') && (existing.tipe_durasi === 'SEBAGIAN_SESI');

      if (bothPartial && data.jam_mulai && data.jam_selesai && existing.jam_mulai && existing.jam_selesai) {
        if (data.jam_mulai < existing.jam_selesai && data.jam_selesai > existing.jam_mulai) {
          isConflicting = true;
        }
      } else {
        isConflicting = true;
      }

      if (isConflicting) {
        const statusLabel = existing.status === 'DISETUJUI' ? 'telah disetujui' : 'masih menunggu verifikasi (Pending)';
        throw new Error(
          `Pengajuan ditolak: Guru ${guru.nama_guru} sudah memiliki izin ${existing.tipe_izin.replace('_', ' ')} yang ${statusLabel} pada rentang waktu tersebut.`
        );
      }
    }

    const permohonan = await prisma.permohonanIzinGuru.create({
      data: {
        tenant_id: tenantId,
        guru_id: data.guru_id,
        tipe_izin: data.tipe_izin,
        tipe_durasi: data.tipe_durasi || 'SEHARIAN',
        tanggal_mulai: startRange.startUTC,
        tanggal_selesai: endRange.endUTC,
        jam_mulai: data.jam_mulai || null,
        jam_selesai: data.jam_selesai || null,
        alasan: data.alasan,
        attachment_url: data.attachment_url || null,
        attachment_type: data.attachment_type || null,
        instruksi_tugas: data.instruksi_tugas || null,
        file_tugas_url: data.file_tugas_url || null,
        tugas_per_kelas: data.tugas_per_kelas || undefined,
        status: 'PENDING',
        diajukan_oleh: userId
      },
      include: {
        Guru: { select: { id: true, nama_guru: true, nip: true } },
        Pengaju: { select: { id: true, full_name: true } }
      }
    });

    // Broadcast update via Redis/WebSocket
    this.broadcastUpdate(tenantId, 'GURU_IZIN_SUBMITTED', permohonan);

    return permohonan;
  }

  /**
   * 2. Preview Dampak Jam KBM (Kelas yang akan kosong / jamkos)
   */
  static async previewImpact(
    tenantId: string,
    params: {
      guru_id: string;
      tanggal_mulai: string;
      tanggal_selesai: string;
      jam_mulai?: string;
      jam_selesai?: string;
      tipe_durasi?: string;
    }
  ) {
    const { guru_id, tanggal_mulai, tanggal_selesai, jam_mulai, jam_selesai, tipe_durasi } = params;

    if (!guru_id || !tanggal_mulai || !tanggal_selesai) {
      return { affectedDays: [], totalSlots: 0, totalClasses: 0 };
    }

    // Resolve guru_id (apakah ID Guru atau User ID)
    let resolvedGuruId = guru_id;
    const foundGuru = await prisma.guru.findFirst({
      where: {
        tenant_id: tenantId,
        OR: [
          { id: guru_id },
          { user_id: guru_id }
        ]
      },
      select: { id: true }
    });
    if (foundGuru) {
      resolvedGuruId = foundGuru.id;
    }

    // Generate list of days between tanggal_mulai and tanggal_selesai
    const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const start = new Date(tanggal_mulai + 'T00:00:00.000Z');
    const end = new Date(tanggal_selesai + 'T00:00:00.000Z');

    // Import sesiLifecycleService tunggal (SSOT terpadu seluruh sistem)
    const { sesiLifecycleService } = await import('../../../attendance/sesi-absensi/services/sesi-lifecycle.service');

    const affectedDays: Array<{
      date: string;
      hari: string;
      sessions: Array<{
        id: string;
        kelas_id: string;
        nama_kelas: string;
        mapel_id?: string;
        nama_mapel?: string;
        jam_mulai: string;
        jam_selesai: string;
        jam_label?: string;
        total_jp?: number;
        status?: string;
      }>;
    }> = [];

    let totalSessions = 0;
    const affectedClassSet = new Set<string>();

    const curr = new Date(start);
    while (curr <= end) {
      const dateStr = curr.toISOString().split('T')[0];
      const dayIndex = curr.getUTCDay();
      const hariEnum = dayNames[dayIndex] as Hari;

      if (hariEnum !== 'MINGGU') {
        const unifiedRes = await sesiLifecycleService.list(tenantId, {}, {
          tanggal: dateStr,
          guru_id: resolvedGuruId,
          include_scheduled: true,
          summary: true,
          limit: 100
        });

        const rawList = Array.isArray(unifiedRes?.data) ? unifiedRes.data : [];

        const filteredSessions = rawList.filter((item: any) => {
          if (tipe_durasi === 'SEBAGIAN_SESI' && jam_mulai && jam_selesai) {
            const iStart = item.jam_mulai || '';
            const iEnd = item.jam_selesai || '';
            if (iStart && iEnd) {
              return (iStart < jam_selesai && iEnd > jam_mulai);
            }
          }
          return true;
        });

        // Check existing leaves for this date
        const existingLeaves = await prisma.permohonanIzinGuru.findMany({
          where: {
            tenant_id: tenantId,
            guru_id: resolvedGuruId,
            status: { in: ['PENDING', 'DISETUJUI'] },
            tanggal_mulai: { lte: new Date(`${dateStr}T23:59:59.999Z`) },
            tanggal_selesai: { gte: new Date(`${dateStr}T00:00:00.000Z`) }
          }
        });

        if (filteredSessions.length > 0) {
          filteredSessions.forEach((s: any) => {
            const kId = s.kelas_id || s.Kelas?.id;
            if (kId) affectedClassSet.add(kId);
            totalSessions++;
          });

          affectedDays.push({
            date: dateStr,
            hari: hariEnum,
            sessions: filteredSessions.map((s: any) => {
              let leaveInfo = s.permohonan_izin || null;
              if (!leaveInfo) {
                const matchLeave = existingLeaves.find(l => {
                  if (l.tipe_durasi === 'SEBAGIAN_SESI' && l.jam_mulai && l.jam_selesai && s.jam_mulai && s.jam_selesai) {
                    return (s.jam_mulai < l.jam_selesai && s.jam_selesai > l.jam_mulai);
                  }
                  return true;
                });
                if (matchLeave) {
                  leaveInfo = {
                    id: matchLeave.id,
                    tipe_izin: matchLeave.tipe_izin,
                    status: matchLeave.status,
                    alasan: matchLeave.alasan
                  };
                }
              }

              return {
                id: s.id,
                kelas_id: s.kelas_id || s.Kelas?.id,
                nama_kelas: s.kelas_nama || s.Kelas?.nama_kelas || s.kelas || '-',
                mapel_id: s.mapel_id || s.Mapel?.id,
                nama_mapel: s.mapel_nama || s.Mapel?.nama_mapel || s.mapel || s.kegiatan || '-',
                jam_mulai: s.jam_mulai,
                jam_selesai: s.jam_selesai,
                jam_label: s.jam_label || (s.slot_mulai && s.slot_selesai ? `Jam Ke-${s.slot_mulai} - ${s.slot_selesai}` : undefined),
                total_jp: s.total_jp || (s.slot_mulai && s.slot_selesai ? (s.slot_selesai - s.slot_mulai + 1) : 1),
                status: s.status || 'MENDATANG',
                existing_leave: leaveInfo
              };
            })
          });
        }
      }
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    const allSessions = affectedDays.flatMap(d => d.sessions);
    const hasConflictingLeave = allSessions.length > 0 && allSessions.every(s => !!(s as any).existing_leave);

    return {
      affectedDays,
      totalSessions,
      totalClasses: affectedClassSet.size,
      has_conflict: hasConflictingLeave
    };
  }

  /**
   * 3. Ambil Daftar Permohonan Izin Guru
   */
  static async getPermohonanList(
    tenantId: string,
    query: {
      status?: string;
      guru_id?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const where: any = { tenant_id: tenantId };

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    if (query.guru_id) {
      where.guru_id = query.guru_id;
    }

    if ((query as any).guru_inval_id) {
      where.guru_inval_id = (query as any).guru_inval_id;
    }

    if (query.startDate && query.endDate) {
      const timeZone = await getTenantTimezone(tenantId);
      const startRange = getTenantDayRangeUTC(query.startDate, timeZone);
      const endRange = getTenantDayRangeUTC(query.endDate, timeZone);
      where.OR = [
        {
          tanggal_mulai: { lte: endRange.endUTC },
          tanggal_selesai: { gte: startRange.startUTC }
        }
      ];
    }

    if (query.search) {
      where.Guru = {
        nama_guru: { contains: query.search, mode: 'insensitive' }
      };
    }

    const [total, data] = await Promise.all([
      prisma.permohonanIzinGuru.count({ where }),
      prisma.permohonanIzinGuru.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
        include: {
          Guru: { select: { id: true, nama_guru: true, nip: true, foto: true } },
          GuruInval: { select: { id: true, nama_guru: true, nip: true, foto: true } },
          Pengaju: { select: { id: true, full_name: true } },
          Pemroses: { select: { id: true, full_name: true } }
        }
      })
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 4. Setujui Permohonan Izin (*Approve*) & Sinkronisasi Sesi KBM
   */
  static async approvePermohonan(
    tenantId: string,
    id: string,
    pemrosesUserId: string,
    guruInvalId?: string
  ) {
    const permohonan = await prisma.permohonanIzinGuru.findFirst({
      where: { id, tenant_id: tenantId },
      include: { Guru: true }
    });

    if (!permohonan) {
      throw new Error('Permohonan izin tidak ditemukan.');
    }

    if (permohonan.status === 'DITOLAK') {
      throw new Error('Permohonan ini telah ditolak sebelumnya dan tidak dapat disetujui.');
    }

    // 🛡️ Idempotent Return: If already approved and guru inval unchanged
    if (permohonan.status === 'DISETUJUI' && (!guruInvalId || permohonan.guru_inval_id === guruInvalId)) {
      return permohonan;
    }

    const canonicalStatus = this.mapToCanonicalStatus(permohonan.tipe_izin);

    // 1. Update status Permohonan
    const updated = await prisma.permohonanIzinGuru.update({
      where: { id },
      data: {
        status: 'DISETUJUI',
        diproses_oleh: pemrosesUserId,
        diproses_at: new Date(),
        ...(guruInvalId ? { guru_inval_id: guruInvalId } : {})
      },
      include: {
        Guru: { select: { id: true, nama_guru: true, nip: true } },
        GuruInval: { select: { id: true, nama_guru: true, nip: true } },
        Pemroses: { select: { id: true, full_name: true } }
      }
    });

    // 2. Sinkronisasi ke Sesi Absensi & AbsenGuru Fisik Hari Ini / Beririsan
    try {
      const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

      let curr = new Date(permohonan.tanggal_mulai);
      const end = new Date(permohonan.tanggal_selesai);

      while (curr <= end) {
        const dateStr = curr.toISOString().slice(0, 10);
        const dayIdx = curr.getDay();
        const hariEnum = dayNames[dayIdx] as Hari;

        const scheduledSlots = await prisma.jadwalKBM.findMany({
          where: {
            tenant_id: tenantId,
            guru_id: permohonan.guru_id,
            hari: hariEnum
          }
        });

        for (const slot of scheduledSlots) {
          // Check time overlap if SEBAGIAN_SESI
          if (permohonan.tipe_durasi === 'SEBAGIAN_SESI' && permohonan.jam_mulai && permohonan.jam_selesai) {
            if (slot.jam_mulai && slot.jam_selesai && (slot.jam_mulai >= permohonan.jam_selesai || slot.jam_selesai <= permohonan.jam_mulai)) {
              continue;
            }
          }

          const tz = await getTenantTimezone(tenantId);
          const tzOffset = getTenantOffsetString(tz);
          const targetDay = new Date(`${dateStr}T00:00:00.000${tzOffset}`);
          const startOfDay = new Date(`${dateStr}T00:00:00.000${tzOffset}`);
          const endOfDay = new Date(`${dateStr}T23:59:59.999${tzOffset}`);

          let physical = await prisma.sesiAbsensi.findFirst({
            where: {
              tenant_id: tenantId,
              jadwal_kbm_id: slot.id,
              tanggal: { gte: startOfDay, lte: endOfDay }
            }
          });

          if (!physical) {
            physical = await prisma.sesiAbsensi.create({
              data: {
                tenant_id: tenantId,
                jadwal_kbm_id: slot.id,
                kelas_id: slot.kelas_id,
                mapel_id: slot.mapel_id,
                guru_id: guruInvalId || slot.guru_id,
                tahun_pelajaran_id: slot.tahun_pelajaran_id || 'default-tp',
                semester_id: slot.semester_id || 'default-sem',
                jenis_kegiatan: 'KBM',
                sumber_sesi: 'TEMPLATE',
                tanggal: targetDay,
                waktu_mulai: slot.jam_mulai ? new Date(`${dateStr}T${slot.jam_mulai}:00.000${tzOffset}`) : targetDay,
                waktu_selesai: slot.jam_selesai ? new Date(`${dateStr}T${slot.jam_selesai}:00.000${tzOffset}`) : null,
                status: 'BERLANGSUNG',
                created_by_user_id: pemrosesUserId
              }
            });
          }

          // Ensure AbsenGuru record exists
          const existingAbsenGuru = await prisma.absenGuru.findFirst({
            where: { sesi_id: physical.id, guru_id: permohonan.guru_id }
          });

          if (existingAbsenGuru) {
            await prisma.absenGuru.update({
              where: { id: existingAbsenGuru.id },
              data: {
                status: canonicalStatus,
                catatan: `Izin Disetujui: ${permohonan.alasan}`
              }
            });
          } else {
            await prisma.absenGuru.create({
              data: {
                tenant_id: tenantId,
                sesi_id: physical.id,
                guru_id: permohonan.guru_id,
                status: canonicalStatus,
                catatan: `Izin Disetujui: ${permohonan.alasan}`,
                tahun_pelajaran_id: physical.tahun_pelajaran_id || slot.tahun_pelajaran_id || 'default-tp',
                semester_id: physical.semester_id || slot.semester_id || 'default-sem'
              }
            });
          }
        }

        curr.setDate(curr.getDate() + 1);
      }

      // Also update any existing physical sessions
      const affectedSessions = await prisma.sesiAbsensi.findMany({
        where: {
          tenant_id: tenantId,
          guru_id: permohonan.guru_id,
          tanggal: {
            gte: permohonan.tanggal_mulai,
            lte: permohonan.tanggal_selesai
          }
        }
      });

      if (affectedSessions.length > 0) {
        const sessionIds = affectedSessions.map(s => s.id);
        await prisma.absenGuru.updateMany({
          where: {
            sesi_id: { in: sessionIds },
            guru_id: permohonan.guru_id
          },
          data: {
            status: canonicalStatus,
            catatan: `Izin Disetujui: ${permohonan.alasan}`
          }
        });
      }
    } catch (syncErr) {
      console.error('[GuruIzinService] Gagal sinkronisasi sesi fisik:', syncErr);
    }

    // 3. Broadcast real-time update
    this.broadcastUpdate(tenantId, 'GURU_IZIN_APPROVED', updated);

    return updated;
  }

  /**
   * 5. Tolak Permohonan Izin (*Reject & Rollback*)
   */
  static async rejectPermohonan(
    tenantId: string,
    id: string,
    pemrosesUserId: string,
    catatan?: string
  ) {
    const permohonan = await prisma.permohonanIzinGuru.findFirst({
      where: { id, tenant_id: tenantId }
    });

    if (!permohonan) {
      throw new Error('Permohonan izin tidak ditemukan.');
    }

    if (permohonan.status === 'DITOLAK') {
      return permohonan;
    }

    const wasApproved = permohonan.status === 'DISETUJUI';

    const updated = await prisma.permohonanIzinGuru.update({
      where: { id },
      data: {
        status: 'DITOLAK',
        diproses_oleh: pemrosesUserId,
        diproses_at: new Date(),
        catatan_penolakan: catatan || null
      },
      include: {
        Guru: { select: { id: true, nama_guru: true } },
        Pemroses: { select: { id: true, full_name: true } }
      }
    });

    // Clean rollback if was previously approved
    if (wasApproved) {
      try {
        const affectedSessions = await prisma.sesiAbsensi.findMany({
          where: {
            tenant_id: tenantId,
            guru_id: permohonan.guru_id,
            tanggal: {
              gte: permohonan.tanggal_mulai,
              lte: permohonan.tanggal_selesai
            }
          }
        });

        if (affectedSessions.length > 0) {
          const sessionIds = affectedSessions.map(s => s.id);
          await prisma.absenGuru.updateMany({
            where: {
              sesi_id: { in: sessionIds },
              guru_id: permohonan.guru_id,
              status: { in: ['PENUGASAN', 'DINAS_LUAR', 'IZIN', 'SAKIT'] }
            },
            data: {
              status: 'BELUM_TAP',
              catatan: `Izin Ditolak: ${catatan || 'Oleh Petugas Piket'}`
            }
          });
        }
      } catch (rollbackErr) {
        console.error('[GuruIzinService] Gagal rollback status AbsenGuru:', rollbackErr);
      }
    }

    this.broadcastUpdate(tenantId, 'GURU_IZIN_REJECTED', updated);

    return updated;
  }

  /**
   * 6. Hapus Permohonan Izin (*Delete & Rollback*)
   */
  static async deletePermohonan(tenantId: string, id: string, _userId: string) {
    const permohonan = await prisma.permohonanIzinGuru.findFirst({
      where: { id, tenant_id: tenantId }
    });

    if (!permohonan) {
      throw new Error('Permohonan izin tidak ditemukan.');
    }

    if (permohonan.status === 'DISETUJUI') {
      try {
        const affectedSessions = await prisma.sesiAbsensi.findMany({
          where: {
            tenant_id: tenantId,
            guru_id: permohonan.guru_id,
            tanggal: {
              gte: permohonan.tanggal_mulai,
              lte: permohonan.tanggal_selesai
            }
          }
        });

        if (affectedSessions.length > 0) {
          const sessionIds = affectedSessions.map(s => s.id);
          await prisma.absenGuru.updateMany({
            where: {
              sesi_id: { in: sessionIds },
              guru_id: permohonan.guru_id,
              status: { in: ['PENUGASAN', 'DINAS_LUAR', 'IZIN', 'SAKIT'] }
            },
            data: {
              status: 'BELUM_TAP',
              catatan: 'Permohonan izin dibatalkan'
            }
          });
        }
      } catch (rollbackErr) {
        console.error('[GuruIzinService] Gagal rollback status AbsenGuru saat delete:', rollbackErr);
      }
    }

    const deleted = await prisma.permohonanIzinGuru.delete({
      where: { id }
    });

    this.broadcastUpdate(tenantId, 'GURU_IZIN_DELETED', { id, guru_id: permohonan.guru_id });

    return deleted;
  }

  /**
   * 7. Rekomendasi Guru Inval Cerdas (Smart Inval Recommendation Engine)
   */
  static async getInvalRecommendations(
    tenantId: string,
    params: {
      guru_id: string;
      tanggal_mulai: string;
      tanggal_selesai: string;
      jam_mulai?: string;
      jam_selesai?: string;
      tipe_durasi?: string;
    }
  ) {
    const { guru_id, tanggal_mulai, tanggal_selesai: _tanggal_selesai, jam_mulai, jam_selesai, tipe_durasi } = params;

    // 1. Ambil Mapel yang diajar oleh guru asli
    const [guruMapelList, jadwalList] = await Promise.all([
      prisma.guruMapel.findMany({
        where: { tenant_id: tenantId, guru_id: guru_id },
        select: { mapel_id: true }
      }),
      prisma.jadwalKBM.findMany({
        where: { tenant_id: tenantId, guru_id: guru_id },
        select: { mapel_id: true }
      })
    ]);

    const targetMapelIds = new Set<string>();
    guruMapelList.forEach(m => targetMapelIds.add(m.mapel_id));
    jadwalList.forEach(j => { if (j.mapel_id) targetMapelIds.add(j.mapel_id); });

    // 2. Ambil seluruh PENDIDIK (Guru Pengajar) aktif di tenant (kecuali guru yang izin dan Tenaga Kependidikan/Tendik)
    const allTeachers = await prisma.guru.findMany({
      where: {
        tenant_id: tenantId,
        id: { not: guru_id },
        OR: [
          { jenis_ptk: 'PENDIDIK' },
          { jenis_ptk: null },
          { jenis_ptk: '' }
        ],
        NOT: {
          jenis_ptk: 'TENAGA_KEPENDIDIKAN'
        }
      },
      select: {
        id: true,
        nama_guru: true,
        nip: true,
        foto: true,
        jenis_ptk: true,
        GuruMapel: {
          select: {
            Mapel: { select: { id: true, nama_mapel: true } }
          }
        }
      },
      orderBy: { nama_guru: 'asc' }
    });

    // 3. Ambil jadwal piket hari ini
    const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const startDate = new Date(tanggal_mulai + 'T00:00:00.000Z');
    const dayIndex = startDate.getUTCDay();
    const hariEnum = dayNames[dayIndex] as Hari;

    const piketToday = await (prisma as any).jadwalPiketGuru.findMany({
      where: {
        tenant_id: tenantId,
        hari: hariEnum
      },
      select: { guru_id: true, pos_piket: true }
    });
    const piketGuruMap = new Map<string, string>();
    piketToday.forEach((p: any) => piketGuruMap.set(p.guru_id, p.pos_piket || 'Piket Umum'));

    // 4. Ambil seluruh jadwal KBM aktif di hari/jam tersebut untuk cek bentrok
    const activeSchedules = await prisma.jadwalKBM.findMany({
      where: {
        tenant_id: tenantId,
        hari: hariEnum
      },
      select: {
        guru_id: true,
        jam_mulai: true,
        jam_selesai: true,
        Kelas: { select: { nama_kelas: true } },
        Mapel: { select: { nama_mapel: true } }
      }
    });

    // 5. Evaluasi status setiap guru
    const evaluatedTeachers = allTeachers.map(teacher => {
      const teacherMapels = teacher.GuruMapel.map(gm => gm.Mapel.nama_mapel).filter(Boolean);
      const isSameMapel = teacher.GuruMapel.some(gm => targetMapelIds.has(gm.Mapel.id));
      const isPiket = piketGuruMap.has(teacher.id);
      const posPiket = piketGuruMap.get(teacher.id) || null;

      // Cek bentrok jam KBM
      const teacherSchedules = activeSchedules.filter(s => s.guru_id === teacher.id);
      let isBusy = false;
      let busyInfo = '';

      if (tipe_durasi === 'SEBAGIAN_SESI' && jam_mulai && jam_selesai) {
        const clash = teacherSchedules.find(s => s.jam_mulai < jam_selesai && s.jam_selesai > jam_mulai);
        if (clash) {
          isBusy = true;
          busyInfo = `Mengajar di ${clash.Kelas?.nama_kelas || 'kelas lain'} (${clash.jam_mulai}-${clash.jam_selesai})`;
        }
      } else if (teacherSchedules.length > 0) {
        isBusy = teacherSchedules.length >= 4;
        busyInfo = `Ada ${teacherSchedules.length} jam mengajar hari ini`;
      }

      let priority = 3;
      let category = 'GURU_LAIN_FREE';
      let categoryLabel = 'Rekan Guru (Jam Kosong)';

      if (isSameMapel && !isBusy) {
        priority = 1;
        category = 'MAPEL_SAMA_FREE';
        categoryLabel = '⭐ Guru Mapel Serumpun (Jam Kosong)';
      } else if (isPiket && !isBusy) {
        priority = 2;
        category = 'PIKET_FREE';
        categoryLabel = '🛡️ Petugas Piket Hari Ini';
      } else if (isBusy) {
        priority = 4;
        category = 'BUSY';
        categoryLabel = '⚠️ Sedang Mengajar / Ada Jadwal';
      }

      return {
        id: teacher.id,
        nama_guru: teacher.nama_guru,
        nip: teacher.nip,
        foto: teacher.foto,
        mapelList: teacherMapels,
        isSameMapel,
        isPiket,
        posPiket,
        isBusy,
        busyInfo,
        priority,
        category,
        categoryLabel
      };
    });

    // Sort by priority (1 -> 2 -> 3 -> 4) then by name
    evaluatedTeachers.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.nama_guru.localeCompare(b.nama_guru);
    });

    return {
      recommendations: evaluatedTeachers,
      totalSameMapel: evaluatedTeachers.filter(t => t.isSameMapel && !t.isBusy).length,
      totalPiket: evaluatedTeachers.filter(t => t.isPiket && !t.isBusy).length,
      totalFree: evaluatedTeachers.filter(t => !t.isBusy).length
    };
  }

  /**
   * Helper: Broadcast realtime notification via Redis Pub/Sub
   */
  private static broadcastUpdate(tenantId: string, event: string, payload: any) {
    try {
      const redis = getRedisConnection();
      redis.publish('events:guru_izin_update', JSON.stringify({
        tenant_id: tenantId,
        event,
        data: payload,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      // Non-blocking
    }
  }
}

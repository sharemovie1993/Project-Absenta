import { gerbangDb } from './repositories/gerbang.db';
import { mapArahToAudit } from './gerbang.tap-helpers';
import { emitDomainEvent } from '@/infra/event-bus';
import { ParentEventType } from '@/modules/parent-app/constants/parent-event-matrix';
import { GerbangTapInput } from '../types/gerbang.types';

export interface GuestAccessInput {
  nama_tamu: string;
  instansi_tamu?: string;
  keperluan_tamu: string;
  kontak_tamu?: string;
  arah: 'MASUK' | 'KELUAR' | string;
  catatan?: string;
  tipe_orang?: 'SISWA' | 'GURU' | 'TAMU' | 'ALUMNI' | string;
  siswa_id?: string;
  guru_id?: string;
  kelas_snapshot?: string;
  // Buku Tamu Khusus & Porsi Pencatat
  kategori_buku?: 'UMUM' | 'KHUSUS' | string;
  jabatan_tamu?: string;
  pejabat_dituju?: string;
  nomor_surat_tugas?: string;
  pesan_kesan?: string;
  titik_pencatat?: 'GERBANG' | 'TATA_USAHA' | string;
}

export interface SecurityLogFilters {
  startDate?: string;
  endDate?: string;
  tipe_orang?: 'SISWA' | 'GURU' | 'TAMU' | 'ALUMNI' | string;
  arah?: 'MASUK' | 'KELUAR' | string;
  search?: string;
  kategori_buku?: 'UMUM' | 'KHUSUS' | 'SEMUA' | string;
  titik_pencatat?: 'GERBANG' | 'TATA_USAHA' | 'SEMUA' | string;
  limit?: number;
  offset?: number;
  page?: number;
}

export class GerbangAuditService {
  private static instance: GerbangAuditService;

  public static getInstance(): GerbangAuditService {
    if (!GerbangAuditService.instance) {
      GerbangAuditService.instance = new GerbangAuditService();
    }
    return GerbangAuditService.instance;
  }

  /**
   * Catat akses keamanan gerbang untuk Siswa atau Guru pada hari non-sekolah (libur/weekend)
   */
  async recordSecurityAccess(params: {
    input: GerbangTapInput;
    siswa?: any;
    guru?: any;
    isGuru: boolean;
    userId: string;
    tenantId: string;
    reason?: string;
  }): Promise<any> {
    const { input, siswa, guru, isGuru, userId, tenantId, reason } = params;
    const arah = mapArahToAudit(input.arah);
    const now = new Date();
    const todayStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    const today = new Date(`${todayStr}T00:00:00.000Z`);

    const tipeOrang = isGuru ? 'GURU' : 'SISWA';
    const namaSnapshot = isGuru ? guru?.nama_guru : siswa?.nama_siswa;
    const kelasSnapshot = !isGuru ? siswa?.Kelas?.nama_kelas : null;

    const record = await gerbangDb.logAksesGerbang.create({
      data: {
        tenant_id: tenantId,
        tanggal: today,
        tipe_orang: tipeOrang,
        siswa_id: isGuru ? null : siswa?.id,
        guru_id: isGuru ? guru?.id : null,
        nama_snapshot: namaSnapshot || null,
        kelas_snapshot: kelasSnapshot || null,
        arah,
        waktu_akses: now,
        metode_verifikasi: input.rfid ? 'RFID' : 'MANUAL',
        token_input: input.rfid || (input.siswa_id ? String(input.siswa_id) : null),
        alasan_non_sekolah: reason || 'Hari Non-Sekolah',
        catatan: (input as any).catatan || null,
        recorded_by: userId,
      },
    });

    // 1. Kirim real-time WebSocket event untuk UI gerbang
    void (async () => {
      try {
        await emitDomainEvent({
          event_type: 'gerbang.audit.update' as any,
          tenant_id: tenantId,
          source_service: 'attendance',
          payload: {
            tenant_id: tenantId,
            log_id: record.id,
            tipe_orang: tipeOrang,
            nama: namaSnapshot,
            kelas: kelasSnapshot,
            arah,
            waktu_akses: now.toISOString(),
            alasan: reason,
          },
        });
      } catch (err) {
        console.warn('[GerbangAuditService] Realtime broadcast failed:', err);
      }
    })();

    // 2. Kirim notifikasi ke orang tua jika yang tap adalah Siswa
    if (!isGuru && siswa?.id) {
      void (async () => {
        try {
          await emitDomainEvent({
            event_type: 'parent.notification' as any,
            tenant_id: tenantId,
            source_service: 'attendance',
            payload: {
              tenant_id: tenantId,
              student_id: siswa.id,
              event_type: ParentEventType.STUDENT_HOLIDAY_ACCESS,
              variables: {
                nama_siswa: namaSnapshot || 'Siswa',
                arah: arah === 'MASUK' ? 'memasuki' : 'meninggalkan',
                alasan: reason || 'Hari Libur',
                waktu: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              },
            },
          });
        } catch (notifErr) {
          console.warn('[GerbangAuditService] Parent notification failed:', notifErr);
        }
      })();
    }

    // 3. Catat di ActivityLog umum
    try {
      await gerbangDb.activityLog.create({
        data: {
          tenant_id: tenantId,
          user_id: userId,
          action: 'GATE_SECURITY_AUDIT',
          entity: 'LogAksesGerbang',
          entity_id: record.id,
          metadata: JSON.stringify({
            tipe_orang: tipeOrang,
            nama: namaSnapshot,
            arah,
            alasan: reason,
            waktu: now.toISOString(),
          }),
        },
      });
    } catch {}

    return {
      success: true,
      message: `Akses dicatat (Mode Audit Keamanan: ${reason || 'Hari Libur'})`,
      is_security_audit: true,
      data: {
        id: record.id,
        tipe_orang: tipeOrang,
        nama: namaSnapshot,
        kelas: kelasSnapshot,
        arah,
        waktu_akses: now.toISOString(),
        alasan_non_sekolah: reason,
        metode_verifikasi: record.metode_verifikasi,
        siswa_info: !isGuru && siswa ? {
          id: siswa.id,
          nama: siswa.nama_siswa,
          nis: siswa.nis || null,
          foto_url: siswa.foto_url || null,
          kelas_nama: kelasSnapshot,
        } : undefined,
        guru_info: isGuru && guru ? {
          id: guru.id,
          nama: guru.nama_guru,
          nip: guru.nip || null,
        } : undefined,
      },
    };
  }

  /**
   * Catat tamu / pengunjung atau akses manual Siswa/Guru (hybrid, dapat digunakan kapan saja)
   */
  async recordGuestAccess(
    input: GuestAccessInput,
    userId: string,
    tenantId: string
  ): Promise<any> {
    const arah = mapArahToAudit(input.arah);
    const now = new Date();
    const todayStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    const today = new Date(`${todayStr}T00:00:00.000Z`);

    const tipeOrang = (input.tipe_orang || 'TAMU').toUpperCase();
    const isGuru = tipeOrang === 'GURU';
    const isSiswa = tipeOrang === 'SISWA';

    let namaSnapshot = input.nama_tamu.trim();
    let kelasSnapshot = input.kelas_snapshot?.trim() || null;

    if (isSiswa && input.siswa_id && !kelasSnapshot) {
      const siswa = await gerbangDb.siswa.findUnique({
        where: { id: input.siswa_id },
        include: { Kelas: true },
      });
      if (siswa?.Kelas?.nama_kelas) kelasSnapshot = siswa.Kelas.nama_kelas;
      if (siswa?.nama_siswa) namaSnapshot = siswa.nama_siswa;
    } else if (isGuru && input.guru_id) {
      const guru = await gerbangDb.guru.findUnique({
        where: { id: input.guru_id },
      });
      if (guru?.nama_guru) namaSnapshot = guru.nama_guru;
    }

    const record = await gerbangDb.logAksesGerbang.create({
      data: {
        tenant_id: tenantId,
        tanggal: today,
        tipe_orang: tipeOrang,
        siswa_id: input.siswa_id || null,
        guru_id: input.guru_id || null,
        nama_snapshot: namaSnapshot,
        kelas_snapshot: kelasSnapshot,
        nama_tamu: input.nama_tamu.trim(),
        instansi_tamu: input.instansi_tamu?.trim() || null,
        keperluan_tamu: input.keperluan_tamu.trim(),
        kontak_tamu: input.kontak_tamu?.trim() || null,
        arah,
        waktu_akses: now,
        metode_verifikasi: input.siswa_id || input.guru_id ? 'MANUAL_NO_CARD' : 'FORM_TAMU',
        alasan_non_sekolah: input.keperluan_tamu.trim(),
        catatan: input.catatan?.trim() || null,
        kategori_buku: (input.kategori_buku || 'UMUM').toUpperCase(),
        jabatan_tamu: input.jabatan_tamu?.trim() || null,
        pejabat_dituju: input.pejabat_dituju?.trim() || null,
        nomor_surat_tugas: input.nomor_surat_tugas?.trim() || null,
        pesan_kesan: input.pesan_kesan?.trim() || null,
        titik_pencatat: (input.titik_pencatat || 'GERBANG').toUpperCase(),
        recorded_by: userId,
      },
    });

    // Broadcast socket event
    void (async () => {
      try {
        await emitDomainEvent({
          event_type: 'gerbang.audit.update' as any,
          tenant_id: tenantId,
          source_service: 'attendance',
          payload: {
            tenant_id: tenantId,
            log_id: record.id,
            tipe_orang: tipeOrang,
            nama: namaSnapshot,
            nama_tamu: input.nama_tamu,
            kelas: kelasSnapshot,
            instansi: input.instansi_tamu,
            keperluan: input.keperluan_tamu,
            arah,
            waktu_akses: now.toISOString(),
          },
        });
      } catch (err) {
        console.warn('[GerbangAuditService] Realtime guest broadcast failed:', err);
      }
    })();

    // Kirim notifikasi ortu jika Siswa
    if (isSiswa && input.siswa_id) {
      void (async () => {
        try {
          await emitDomainEvent({
            event_type: 'parent.notification' as any,
            tenant_id: tenantId,
            source_service: 'attendance',
            payload: {
              tenant_id: tenantId,
              student_id: input.siswa_id,
              event_type: ParentEventType.STUDENT_HOLIDAY_ACCESS,
              variables: {
                nama_siswa: namaSnapshot,
                arah: arah === 'MASUK' ? 'memasuki' : 'meninggalkan',
                alasan: input.keperluan_tamu,
                waktu: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              },
            },
          });
        } catch (notifErr) {
          console.warn('[GerbangAuditService] Parent notification for manual access failed:', notifErr);
        }
      })();
    }

    // Activity Log
    try {
      await gerbangDb.activityLog.create({
        data: {
          tenant_id: tenantId,
          user_id: userId,
          action: 'GATE_GUEST_ENTRY',
          entity: 'LogAksesGerbang',
          entity_id: record.id,
          metadata: JSON.stringify({
            nama_tamu: input.nama_tamu,
            instansi_tamu: input.instansi_tamu,
            keperluan_tamu: input.keperluan_tamu,
            arah,
          }),
        },
      });
    } catch {}

    return {
      success: true,
      message: 'Akses tamu berhasil dicatat',
      is_security_audit: true,
      data: {
        id: record.id,
        tipe_orang: 'TAMU',
        nama: input.nama_tamu.trim(),
        nama_tamu: input.nama_tamu.trim(),
        nama_snapshot: input.nama_tamu.trim(),
        instansi_tamu: input.instansi_tamu?.trim() || null,
        keperluan_tamu: input.keperluan_tamu.trim(),
        kontak_tamu: input.kontak_tamu?.trim() || null,
        arah,
        waktu_akses: now.toISOString(),
      },
    };
  }

  /**
   * Update log akses tamu
   */
  async updateLog(
    id: string,
    tenantId: string,
    data: {
      nama_tamu?: string;
      instansi_tamu?: string;
      keperluan_tamu?: string;
      kontak_tamu?: string;
      arah?: 'MASUK' | 'KELUAR';
      catatan?: string;
    }
  ): Promise<any> {
    const existing = await gerbangDb.logAksesGerbang.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Log akses gerbang tidak ditemukan');
    }

    const updateData: any = {};
    if (data.nama_tamu !== undefined) {
      updateData.nama_tamu = data.nama_tamu?.trim() || null;
      updateData.nama_snapshot = data.nama_tamu?.trim() || existing.nama_snapshot;
    }
    if (data.instansi_tamu !== undefined) {
      updateData.instansi_tamu = data.instansi_tamu?.trim() || null;
    }
    if (data.keperluan_tamu !== undefined) {
      updateData.keperluan_tamu = data.keperluan_tamu?.trim() || null;
    }
    if (data.kontak_tamu !== undefined) {
      updateData.kontak_tamu = data.kontak_tamu?.trim() || null;
    }
    if (data.arah !== undefined) {
      updateData.arah = data.arah;
    }
    if (data.catatan !== undefined) {
      updateData.catatan = data.catatan?.trim() || null;
    }
    if ((data as any).kategori_buku !== undefined) {
      updateData.kategori_buku = (data as any).kategori_buku;
    }
    if ((data as any).jabatan_tamu !== undefined) {
      updateData.jabatan_tamu = (data as any).jabatan_tamu?.trim() || null;
    }
    if ((data as any).pejabat_dituju !== undefined) {
      updateData.pejabat_dituju = (data as any).pejabat_dituju?.trim() || null;
    }
    if ((data as any).nomor_surat_tugas !== undefined) {
      updateData.nomor_surat_tugas = (data as any).nomor_surat_tugas?.trim() || null;
    }
    if ((data as any).pesan_kesan !== undefined) {
      updateData.pesan_kesan = (data as any).pesan_kesan?.trim() || null;
    }

    const updated = await gerbangDb.logAksesGerbang.update({
      where: { id },
      data: updateData,
    });

    return {
      success: true,
      message: 'Data log akses berhasil diperbarui',
      data: updated,
    };
  }

  /**
   * Hapus log akses
   */
  async deleteLog(id: string, tenantId: string): Promise<any> {
    const existing = await gerbangDb.logAksesGerbang.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Log akses gerbang tidak ditemukan');
    }

    await gerbangDb.logAksesGerbang.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Log akses berhasil dihapus',
    };
  }

  /**
   * Query riwayat log akses keamanan (paginated & filtered)
   */
  async getSecurityLogs(tenantId: string, filters: SecurityLogFilters = {}): Promise<any> {
    const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
    const offset = Math.max(Number(filters.offset) || 0, 0);

    const where: any = { tenant_id: tenantId };

    if (filters.startDate || filters.endDate) {
      where.waktu_akses = {};
      if (filters.startDate) {
        const s = String(filters.startDate).trim();
        const start = s.includes('T') ? new Date(s) : new Date(`${s}T00:00:00.000+07:00`);
        where.waktu_akses.gte = isNaN(start.getTime()) ? new Date(s) : start;
      }
      if (filters.endDate) {
        const e = String(filters.endDate).trim();
        const end = e.includes('T') ? new Date(e) : new Date(`${e}T23:59:59.999+07:00`);
        where.waktu_akses.lte = isNaN(end.getTime()) ? new Date(e) : end;
      }
    }

    if (filters.tipe_orang && filters.tipe_orang !== 'SEMUA') {
      where.tipe_orang = filters.tipe_orang;
    }

    if (filters.arah && filters.arah !== 'SEMUA') {
      where.arah = filters.arah;
    }

    if (filters.kategori_buku && filters.kategori_buku !== 'SEMUA') {
      where.kategori_buku = filters.kategori_buku;
    }

    if (filters.titik_pencatat && filters.titik_pencatat !== 'SEMUA') {
      where.titik_pencatat = filters.titik_pencatat;
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { nama_snapshot: { contains: q, mode: 'insensitive' } },
        { nama_tamu: { contains: q, mode: 'insensitive' } },
        { instansi_tamu: { contains: q, mode: 'insensitive' } },
        { keperluan_tamu: { contains: q, mode: 'insensitive' } },
        { token_input: { contains: q, mode: 'insensitive' } },
        { jabatan_tamu: { contains: q, mode: 'insensitive' } },
        { pejabat_dituju: { contains: q, mode: 'insensitive' } },
        { nomor_surat_tugas: { contains: q, mode: 'insensitive' } },
        { pesan_kesan: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      gerbangDb.logAksesGerbang.count({ where }),
      gerbangDb.logAksesGerbang.findMany({
        where,
        orderBy: { waktu_akses: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);

    return {
      success: true,
      data: logs,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
    };
  }

  /**
   * Ringkasan statistik log akses keamanan
   */
  async getSecurityLogStats(
    tenantId: string,
    dateRange: { startDate?: string; endDate?: string } = {}
  ): Promise<any> {
    const now = new Date();
    const todayLocalStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    const sStr = dateRange.startDate ? String(dateRange.startDate).trim() : todayLocalStr;
    const eStr = dateRange.endDate ? String(dateRange.endDate).trim() : todayLocalStr;

    const startDate = sStr.includes('T') ? new Date(sStr) : new Date(`${sStr}T00:00:00.000+07:00`);
    const endDate = eStr.includes('T') ? new Date(eStr) : new Date(`${eStr}T23:59:59.999+07:00`);

    const where = {
      tenant_id: tenantId,
      waktu_akses: {
        gte: startDate,
        lte: endDate,
      },
    };

    const logs = await gerbangDb.logAksesGerbang.findMany({
      where,
      select: {
        tipe_orang: true,
        arah: true,
        kategori_buku: true,
        titik_pencatat: true,
      },
    });

    let total = logs.length;
    let siswa = 0;
    let guru = 0;
    let tamu = 0;
    let masuk = 0;
    let keluar = 0;
    let umum = 0;
    let khusus = 0;

    for (const log of logs) {
      if (log.tipe_orang === 'SISWA') siswa++;
      else if (log.tipe_orang === 'GURU') guru++;
      else tamu++;

      if (log.arah === 'MASUK') masuk++;
      else if (log.arah === 'KELUAR') keluar++;

      if (log.kategori_buku === 'KHUSUS') khusus++;
      else umum++;
    }

    return {
      success: true,
      data: {
        total,
        siswa,
        guru,
        tamu,
        masuk,
        keluar,
        umum,
        khusus,
        periode: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
    };
  }
}

export const gerbangAuditService = GerbangAuditService.getInstance();

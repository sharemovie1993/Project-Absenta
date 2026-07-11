/**
 * bk-konsultasi.service.ts
 * Layanan Parent Consultation Booking untuk modul BPBK.
 *
 * Orang tua dapat:
 * - Membuat booking sesi konsultasi dengan Guru BK
 * - Melihat riwayat booking mereka
 * - Membatalkan booking yang masih MENUNGGU
 *
 * Guru BK dapat:
 * - Melihat semua booking yang masuk di tenant-nya
 * - Konfirmasi/Tolak booking dengan catatan
 * - Menandai sesi sebagai SELESAI
 * - Menambahkan link meeting jika ONLINE
 */

import { prisma } from '../../../utils/prisma';
import { z } from 'zod';
import { waGatewayService } from '../../../services/wa-gateway.service';

// ─── Validation Schemas ───────────────────────────────────────────────────────

export const CreateBookingSchema = z.object({
  siswa_id: z.string().uuid(),
  guru_bk_id: z.string().uuid().optional(),
  tanggal_booking: z.string().datetime({ message: 'Format tanggal harus ISO 8601' }),
  durasi_menit: z.number().int().min(15).max(120).optional().default(30),
  metode: z.enum(['TATAP_MUKA', 'ONLINE']).optional().default('TATAP_MUKA'),
  perihal: z.string().min(10).max(500),
  catatan_ortu: z.string().max(500).optional(),
});

export const UpdateBookingStatusSchema = z.object({
  status: z.enum(['DIKONFIRMASI', 'DITOLAK', 'SELESAI', 'DIBATALKAN']),
  catatan_bk: z.string().max(500).optional(),
  link_meeting: z.string().url().optional(),
});

export type CreateBookingDto = z.infer<typeof CreateBookingSchema>;
export type UpdateBookingStatusDto = z.infer<typeof UpdateBookingStatusSchema>;

// ─── Service ─────────────────────────────────────────────────────────────────

export class BkKonsultasiService {

  // ── SISI ORANG TUA ────────────────────────────────────────────────────────

  /**
   * Buat booking konsultasi baru (dari sisi orang tua via Portal Wali Murid).
   */
  static async createBooking(tenantId: string, ortuId: string, dto: CreateBookingDto) {
    const data = CreateBookingSchema.parse(dto);

    // Validasi siswa milik ortu
    const ortuSiswa = await prisma.orangTuaSiswa.findFirst({
      where: { orang_tua_id: ortuId, siswa_id: data.siswa_id },
      include: { Siswa: { select: { nama_siswa: true, kelas_id: true } } }
    });
    if (!ortuSiswa) throw new Error('Siswa tidak ditemukan atau bukan anak Anda');

    // Tidak boleh ada booking aktif (MENUNGGU/DIKONFIRMASI) untuk siswa yang sama
    const existing = await prisma.bkKonsultasiBooking.findFirst({
      where: {
        tenant_id: tenantId,
        ortu_id: ortuId,
        siswa_id: data.siswa_id,
        status: { in: ['MENUNGGU', 'DIKONFIRMASI'] },
      },
    });
    if (existing) throw new Error('Anda sudah memiliki booking aktif untuk siswa ini. Tunggu konfirmasi atau batalkan booking sebelumnya.');

    const booking = await prisma.bkKonsultasiBooking.create({
      data: {
        tenant_id: tenantId,
        ortu_id: ortuId,
        siswa_id: data.siswa_id,
        guru_bk_id: data.guru_bk_id ?? null,
        tanggal_booking: new Date(data.tanggal_booking),
        durasi_menit: data.durasi_menit,
        metode: data.metode,
        perihal: data.perihal,
        catatan_ortu: data.catatan_ortu ?? null,
        status: 'MENUNGGU',
      },
      include: {
        OrangTua: { select: { nama: true, no_hp: true } },
        Siswa: { select: { nama_siswa: true } },
        GuruBk: { select: { full_name: true } },
      },
    });

    // Notifikasi WA ke Guru BK (soft — tidak hentikan proses jika gagal)
    if (booking.GuruBk && booking.guru_bk_id) {
      const guruUser = await prisma.user.findUnique({ where: { id: booking.guru_bk_id }, select: { no_hp: true } });
      if (guruUser?.no_hp) {
        const msg =
          `📋 *Permintaan Konsultasi BK*\n` +
          `Dari: ${booking.OrangTua.nama} (Ortu ${booking.Siswa.nama_siswa})\n` +
          `Tanggal: ${new Date(booking.tanggal_booking).toLocaleString('id-ID')}\n` +
          `Metode: ${booking.metode}\n` +
          `Perihal: ${booking.perihal}\n\n` +
          `Silakan konfirmasi melalui sistem.`;
        await waGatewayService.sendMessageSoft(tenantId, guruUser.no_hp, msg, 'bk_consultation_booking');
      }
    }

    return booking;
  }

  /**
   * Ambil semua booking milik orang tua tertentu.
   */
  static async getOrangTuaBookings(tenantId: string, ortuId: string) {
    return prisma.bkKonsultasiBooking.findMany({
      where: { tenant_id: tenantId, ortu_id: ortuId },
      orderBy: { tanggal_booking: 'desc' },
      include: {
        Siswa: { select: { nama_siswa: true } },
        GuruBk: { select: { full_name: true } },
      },
    });
  }

  /**
   * Batalkan booking dari sisi orang tua (hanya jika MENUNGGU).
   */
  static async cancelBookingOrtu(tenantId: string, ortuId: string, bookingId: string) {
    const booking = await prisma.bkKonsultasiBooking.findFirst({
      where: { id: bookingId, tenant_id: tenantId, ortu_id: ortuId },
    });
    if (!booking) throw new Error('Booking tidak ditemukan');
    if (booking.status !== 'MENUNGGU') throw new Error('Hanya booking berstatus MENUNGGU yang dapat dibatalkan');

    return prisma.bkKonsultasiBooking.update({
      where: { id: bookingId },
      data: { status: 'DIBATALKAN', catatan_bk: 'Dibatalkan oleh orang tua' },
    });
  }

  // ── SISI GURU BK (via Main App) ───────────────────────────────────────────

  /**
   * Ambil semua booking masuk di tenant (untuk dasbor Guru BK).
   */
  static async getAllBookings(tenantId: string, query: { status?: string; page?: number; limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenant_id: tenantId };
    if (query.status) where.status = query.status;

    const [total, list] = await Promise.all([
      prisma.bkKonsultasiBooking.count({ where }),
      prisma.bkKonsultasiBooking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { tanggal_booking: 'asc' },
        include: {
          OrangTua: { select: { nama: true, no_hp: true } },
          Siswa: { select: { nama_siswa: true } },
          GuruBk: { select: { id: true, full_name: true } },
        },
      }),
    ]);

    return { list, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * Update status booking (konfirmasi/tolak/selesai) oleh Guru BK.
   */
  static async updateBookingStatus(tenantId: string, bookingId: string, dto: UpdateBookingStatusDto) {
    const data = UpdateBookingStatusSchema.parse(dto);

    const booking = await prisma.bkKonsultasiBooking.findFirst({
      where: { id: bookingId, tenant_id: tenantId },
      include: {
        OrangTua: { select: { nama: true, no_hp: true } },
        Siswa: { select: { nama_siswa: true } },
      },
    });
    if (!booking) throw new Error('Booking tidak ditemukan');

    const updated = await prisma.bkKonsultasiBooking.update({
      where: { id: bookingId },
      data: {
        status: data.status,
        catatan_bk: data.catatan_bk ?? null,
        link_meeting: data.link_meeting ?? null,
      },
    });

    // Notifikasi WA ke Orang Tua
    if (booking.OrangTua.no_hp) {
      let msg = '';
      const tgl = new Date(booking.tanggal_booking).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });

      if (data.status === 'DIKONFIRMASI') {
        msg = `✅ *Konsultasi BK Dikonfirmasi*\n`
          + `Siswa: ${booking.Siswa.nama_siswa}\n`
          + `Jadwal: ${tgl}\n`
          + `Metode: ${booking.metode}\n`
          + (data.link_meeting ? `Link: ${data.link_meeting}\n` : '')
          + (data.catatan_bk ? `Catatan: ${data.catatan_bk}` : '');
      } else if (data.status === 'DITOLAK') {
        msg = `❌ *Konsultasi BK Ditolak*\n`
          + `Siswa: ${booking.Siswa.nama_siswa}\n`
          + `Alasan: ${data.catatan_bk ?? 'Tidak ada keterangan'}\n`
          + `Silakan ajukan jadwal lain.`;
      } else if (data.status === 'SELESAI') {
        msg = `🎉 *Sesi Konsultasi Selesai*\n`
          + `Terima kasih telah berkonsultasi dengan kami mengenai ${booking.Siswa.nama_siswa}.`;
      }

      if (msg) {
        await waGatewayService.sendMessageSoft(tenantId, booking.OrangTua.no_hp, msg, 'bk_consultation_status');
      }
    }

    return updated;
  }
}

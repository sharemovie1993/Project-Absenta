import { prisma } from '@/utils/prisma';
import { Prisma } from '@prisma/client';
import { getRedisConnection } from '@/infra/redis/redisClient';
import crypto from 'crypto';

export class CbtJadwalService {
  /**
   * Menghasilkan 6 karakter token acak (tanpa karakter ambigu seperti 0/O, 1/I)
   */
  static generateToken(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let token = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      token += chars[bytes[i] % chars.length];
    }
    return token;
  }

  /**
   * Mengambil daftar Jadwal Ujian dengan paginasi dan filter
   */
  static async list(tenantId: string, query: any) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.CbtJadwalUjianWhereInput = {
      tenant_id: tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.bank_soal_id ? { bank_soal_id: query.bank_soal_id } : {}),
      ...(query.search
        ? {
            OR: [
              { nama_sesi: { contains: query.search, mode: 'insensitive' } },
              { token_ujian: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.cbtJadwalUjian.count({ where }),
      prisma.cbtJadwalUjian.findMany({
        where,
        skip,
        take: limit,
        orderBy: { tanggal_mulai: 'desc' },
        include: {
          BankSoal: {
            select: {
              id: true,
              kode_bank: true,
              judul: true,
              tingkat: true,
              jumlah_soal: true,
              Mapel: { select: { nama_mapel: true } },
              Guru: { select: { nama_guru: true } },
            },
          },
          TahunPelajaran: { select: { tahun: true } },
          Semester: { select: { nama_semester: true } },
          _count: { select: { Peserta: true } },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Mengambil detail Jadwal Ujian
   */
  static async getById(tenantId: string, id: string) {
    const jadwal = await prisma.cbtJadwalUjian.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        BankSoal: {
          include: {
            Mapel: { select: { nama_mapel: true, kode_mapel: true } },
            Guru: { select: { nama_guru: true, nip: true } },
          },
        },
        TahunPelajaran: { select: { id: true, tahun: true } },
        Semester: { select: { id: true, nama_semester: true } },
        _count: { select: { Peserta: true } },
      },
    });

    if (!jadwal) {
      throw new Error('Jadwal ujian tidak ditemukan');
    }

    return jadwal;
  }

  /**
   * Membuat Jadwal Ujian baru
   */
  static async create(tenantId: string, data: any) {
    // Pastikan bank soal valid dan memiliki butir soal
    const bankSoal = await prisma.cbtBankSoal.findFirst({
      where: { id: data.bank_soal_id, tenant_id: tenantId },
      include: { _count: { select: { Soal: true } } },
    });

    if (!bankSoal) {
      throw new Error('Bank soal tidak ditemukan');
    }
    if (bankSoal._count.Soal === 0) {
      throw new Error('Bank soal belum memiliki butir soal. Isi soal terlebih dahulu sebelum membuat jadwal.');
    }

    const token = this.generateToken();

    return prisma.cbtJadwalUjian.create({
      data: {
        tenant_id: tenantId,
        bank_soal_id: data.bank_soal_id,
        tahun_pelajaran_id: data.tahun_pelajaran_id,
        semester_id: data.semester_id,
        nama_sesi: data.nama_sesi.trim(),
        token_ujian: token,
        tanggal_mulai: new Date(data.tanggal_mulai),
        tanggal_selesai: new Date(data.tanggal_selesai),
        durasi_menit: data.durasi_menit ?? bankSoal.alokasi_menit,
        toleransi_terlambat_menit: data.toleransi_terlambat_menit ?? 15,
        target_kelas_ids: data.target_kelas_ids,
        setting_keamanan: data.setting_keamanan || {
          lock_device: true,
          block_tab_switching: true,
          max_tab_switches: 3,
          shuffle_questions: bankSoal.acak_soal,
          shuffle_options: bankSoal.acak_opsi,
          show_result_instant: false,
        },
        status: 'DRAFT',
      },
      include: {
        BankSoal: { select: { kode_bank: true, judul: true } },
      },
    });
  }

  /**
   * Mengupdate Jadwal Ujian
   */
  static async update(tenantId: string, id: string, data: any) {
    await this.getById(tenantId, id);

    return prisma.cbtJadwalUjian.update({
      where: { id },
      data: {
        ...(data.bank_soal_id ? { bank_soal_id: data.bank_soal_id } : {}),
        ...(data.tahun_pelajaran_id ? { tahun_pelajaran_id: data.tahun_pelajaran_id } : {}),
        ...(data.semester_id ? { semester_id: data.semester_id } : {}),
        ...(data.nama_sesi ? { nama_sesi: data.nama_sesi.trim() } : {}),
        ...(data.tanggal_mulai ? { tanggal_mulai: new Date(data.tanggal_mulai) } : {}),
        ...(data.tanggal_selesai ? { tanggal_selesai: new Date(data.tanggal_selesai) } : {}),
        ...(data.durasi_menit !== undefined ? { durasi_menit: data.durasi_menit } : {}),
        ...(data.toleransi_terlambat_menit !== undefined ? { toleransi_terlambat_menit: data.toleransi_terlambat_menit } : {}),
        ...(data.target_kelas_ids ? { target_kelas_ids: data.target_kelas_ids } : {}),
        ...(data.setting_keamanan ? { setting_keamanan: data.setting_keamanan } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
    });
  }

  /**
   * Generate token baru untuk jadwal yang aktif
   */
  static async regenerateToken(tenantId: string, id: string) {
    await this.getById(tenantId, id);
    const newToken = this.generateToken();

    await prisma.cbtJadwalUjian.update({
      where: { id },
      data: { token_ujian: newToken },
    });

    // Perbarui token di Redis jika sesi aktif
    const redis = getRedisConnection();
    if (redis) {
      await redis.set(`cbt:${tenantId}:token:${newToken}`, id, 'EX', 86400).catch(() => null);
    }

    return { token_ujian: newToken };
  }

  /**
   * Mengaktifkan Sesi Ujian & Pre-heating Redis Cache Bundle
   * Memastikan 3000 user dapat mengambil bundle soal secara instan tanpa query database berulang.
   */
  static async activateJadwal(tenantId: string, id: string) {
    const jadwal = await this.getById(tenantId, id);

    // Ambil butir soal lengkap
    const soalList = await prisma.cbtSoal.findMany({
      where: { tenant_id: tenantId, bank_soal_id: jadwal.bank_soal_id },
      orderBy: { nomor_urut: 'asc' },
      select: {
        id: true,
        nomor_urut: true,
        jenis_soal: true,
        konten_pertanyaan: true,
        gambar_stimulus_url: true,
        bobot: true,
        opsi_jawaban_json: true,
        // Kunci jawaban TIDAK dikirimkan ke client/redis bundle publik demi keamanan
      },
    });

    // Simpan bundle terkompilasi ke Redis
    const redis = getRedisConnection();
    if (redis) {
      const bundlePayload = JSON.stringify({
        jadwal_id: jadwal.id,
        nama_sesi: jadwal.nama_sesi,
        durasi_menit: jadwal.durasi_menit,
        setting_keamanan: jadwal.setting_keamanan,
        total_soal: soalList.length,
        soal: soalList,
      });

      // TTL 24 jam (86400 detik)
      await redis.set(`cbt:${tenantId}:bundle:${jadwal.id}`, bundlePayload, 'EX', 86400).catch((err: any) => {
        console.warn('[CBT Redis Pre-heat Warn]', err.message);
      });

      // Mapping token -> jadwal_id untuk verifikasi cepat
      await redis.set(`cbt:${tenantId}:token:${jadwal.token_ujian}`, jadwal.id, 'EX', 86400).catch(() => null);
    }

    // Update status di PostgreSQL
    return prisma.cbtJadwalUjian.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  /**
   * Pause Jadwal Ujian
   */
  static async pauseJadwal(tenantId: string, id: string) {
    await this.getById(tenantId, id);

    return prisma.cbtJadwalUjian.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
  }

  /**
   * Menyelesaikan Jadwal Ujian
   */
  static async completeJadwal(tenantId: string, id: string) {
    const jadwal = await this.getById(tenantId, id);

    const redis = getRedisConnection();
    if (redis) {
      await redis.del(`cbt:${tenantId}:bundle:${jadwal.id}`).catch(() => null);
      await redis.del(`cbt:${tenantId}:token:${jadwal.token_ujian}`).catch(() => null);
    }

    return prisma.cbtJadwalUjian.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
  }

  /**
   * Monitoring Peserta Ujian (Proctor Live View)
   */
  static async getPesertaList(tenantId: string, jadwalId: string, query: any) {
    const where: Prisma.CbtPesertaUjianWhereInput = {
      tenant_id: tenantId,
      jadwal_ujian_id: jadwalId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            Siswa: {
              OR: [
                { nama_siswa: { contains: query.search, mode: 'insensitive' } },
                { nis: { contains: query.search, mode: 'insensitive' } },
                { nisn: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const items = await prisma.cbtPesertaUjian.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        Siswa: {
          select: {
            id: true,
            nama_siswa: true,
            nis: true,
            nisn: true,
            Kelas: { select: { id: true, nama_kelas: true } },
          },
        },
      },
    });

    return items;
  }

  /**
   * Reset Sesi Peserta (Jika terjadi mati listrik, kendala laptop rusak, dsb.)
   */
  static async resetPeserta(tenantId: string, jadwalId: string, siswaId: string) {
    const peserta = await prisma.cbtPesertaUjian.findFirst({
      where: { tenant_id: tenantId, jadwal_ujian_id: jadwalId, siswa_id: siswaId },
    });

    if (!peserta) {
      throw new Error('Data peserta tidak ditemukan');
    }

    const redis = getRedisConnection();
    if (redis) {
      // Hapus session lock di Redis agar siswa bisa login kembali
      await redis.del(`cbt:${tenantId}:session:${siswaId}`).catch(() => null);
    }

    return prisma.cbtPesertaUjian.update({
      where: { id: peserta.id },
      data: {
        status: 'STANDBY',
        status_sinkron: 'IDLE',
      },
    });
  }
}

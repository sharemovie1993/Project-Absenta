import { prisma } from '../../../../utils/prisma';
import crypto from 'crypto';

export interface RapatFilterParams {
  status?: string;
  kategori?: string;
  target?: string;
  search?: string;
  tanggalMulai?: string;
  tanggalAkhir?: string;
  page?: number;
  limit?: number;
}

export interface CreateRapatDto {
  nomor_surat?: string;
  judul_rapat: string;
  kategori_rapat?: any; // KategoriRapat enum
  target_peserta?: any; // TargetPesertaRapat enum
  deskripsi?: string;
  tanggal_rapat: string; // ISO date string or YYYY-MM-DD
  jam_mulai: string;
  jam_selesai?: string;
  tempat: string;
  link_daring?: string;
  pimpinan_rapat?: string;
  notulis?: string;
  agenda?: string[] | any;
  notulen_hasil?: string;
  status?: any; // StatusRapat enum
  autoPopulatePeserta?: boolean;
}

export class RapatService {
  /**
   * Mengambil daftar seluruh rapat di tenant dengan filter, statistik kehadiran, dan pagination
   */
  static async listRapat(tenantId: string, params: RapatFilterParams = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      tenant_id: tenantId,
    };

    if (params.status && params.status !== 'ALL') {
      where.status = params.status;
    }

    if (params.kategori && params.kategori !== 'ALL') {
      where.kategori_rapat = params.kategori;
    }

    if (params.target && params.target !== 'ALL') {
      where.target_peserta = params.target;
    }

    if (params.search && params.search.trim() !== '') {
      const q = params.search.trim();
      where.OR = [
        { judul_rapat: { contains: q, mode: 'insensitive' } },
        { tempat: { contains: q, mode: 'insensitive' } },
        { pimpinan_rapat: { contains: q, mode: 'insensitive' } },
        { nomor_surat: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (params.tanggalMulai || params.tanggalAkhir) {
      where.tanggal_rapat = {};
      if (params.tanggalMulai) {
        where.tanggal_rapat.gte = new Date(params.tanggalMulai);
      }
      if (params.tanggalAkhir) {
        const endDate = new Date(params.tanggalAkhir);
        endDate.setHours(23, 59, 59, 999);
        where.tanggal_rapat.lte = endDate;
      }
    }

    const [total, items] = await Promise.all([
      prisma.rapatMaster.count({ where }),
      prisma.rapatMaster.findMany({
        where,
        include: {
          PesertaRapat: {
            select: {
              id: true,
              is_hadir: true,
              metode_kehadiran: true,
            },
          },
        },
        orderBy: [
          { tanggal_rapat: 'desc' },
          { jam_mulai: 'desc' },
        ],
        skip,
        take: limit,
      }),
    ]);

    const formattedItems = items.map((r: any) => {
      const totalPeserta = r.PesertaRapat.length;
      const hadirCount = r.PesertaRapat.filter((p: any) => p.is_hadir).length;
      const persentaseHadir = totalPeserta > 0 ? Math.round((hadirCount / totalPeserta) * 100) : 0;

      // Exclude raw peserta list for light list payloads
      const { PesertaRapat, ...rest } = r;
      return {
        ...rest,
        stats: {
          totalPeserta,
          hadirCount,
          belumHadirCount: totalPeserta - hadirCount,
          persentaseHadir,
        },
      };
    });

    return {
      items: formattedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mengambil detail lengkap rapat tertentu beserta daftar seluruh pesertanya
   */
  static async getRapatDetail(tenantId: string, rapatId: string) {
    const rapat = await prisma.rapatMaster.findFirst({
      where: { id: rapatId, tenant_id: tenantId },
      include: {
        PesertaRapat: {
          orderBy: [
            { is_hadir: 'desc' },
            { nama_peserta: 'asc' },
          ],
        },
      },
    });

    if (!rapat) {
      throw new Error('Data rapat tidak ditemukan.');
    }

    const totalPeserta = rapat.PesertaRapat.length;
    const hadirCount = rapat.PesertaRapat.filter((p: any) => p.is_hadir).length;
    const izinCount = rapat.PesertaRapat.filter((p: any) => p.metode_kehadiran === 'IZIN').length;
    const sakitCount = rapat.PesertaRapat.filter((p: any) => p.metode_kehadiran === 'SAKIT').length;
    const belumHadirCount = totalPeserta - hadirCount - izinCount - sakitCount;
    const persentaseHadir = totalPeserta > 0 ? Math.round((hadirCount / totalPeserta) * 100) : 0;

    return {
      ...rapat,
      stats: {
        totalPeserta,
        hadirCount,
        izinCount,
        sakitCount,
        belumHadirCount: Math.max(0, belumHadirCount),
        persentaseHadir,
      },
    };
  }

  /**
   * Membuat rapat baru lengkap dengan token QR presensi unik dan auto-populate peserta awal
   */
  static async createRapat(tenantId: string, payload: CreateRapatDto, createdByUserId?: string) {
    const qrToken = `RAPAT-${Date.now()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    const parsedDate = new Date(payload.tanggal_rapat);

    const rapat = await prisma.rapatMaster.create({
      data: {
        tenant_id: tenantId,
        nomor_surat: payload.nomor_surat,
        judul_rapat: payload.judul_rapat,
        kategori_rapat: payload.kategori_rapat || 'DEWAN_GURU',
        target_peserta: payload.target_peserta || 'SEMUA_GURU',
        deskripsi: payload.deskripsi,
        tanggal_rapat: parsedDate,
        jam_mulai: payload.jam_mulai || '08:00',
        jam_selesai: payload.jam_selesai,
        tempat: payload.tempat || 'Aula Utama',
        link_daring: payload.link_daring,
        pimpinan_rapat: payload.pimpinan_rapat,
        notulis: payload.notulis,
        agenda: payload.agenda ? JSON.parse(JSON.stringify(payload.agenda)) : undefined,
        notulen_hasil: payload.notulen_hasil,
        qr_token: qrToken,
        status: payload.status || 'DIJADWALKAN',
        created_by_user_id: createdByUserId,
      },
    });

    // Otomatis populasi daftar peserta awal jika diminta
    if (payload.autoPopulatePeserta !== false) {
      await this.populateInitialAttendees(tenantId, rapat.id, rapat.target_peserta);
    }

    return this.getRapatDetail(tenantId, rapat.id);
  }

  /**
   * Mengisi daftar peserta rapat secara otomatis sesuai target_peserta
   */
  static async populateInitialAttendees(tenantId: string, rapatId: string, targetPeserta: string) {
    if (targetPeserta === 'SEMUA_GURU' || targetPeserta === 'GURU_DAN_STAF' || targetPeserta === 'GURU_MAPEL') {
      const gurus = await prisma.guru.findMany({
        where: { tenant_id: tenantId },
        select: {
          id: true,
          nama_guru: true,
          nip: true,
          nuptk: true,
          jabatan: true,
          jenis_ptk: true,
          no_hp: true,
          GuruMapel: {
            select: { Mapel: { select: { nama_mapel: true } } },
            take: 1,
          },
        },
        orderBy: { nama_guru: 'asc' },
      });

      const pesertaData = gurus.map((g: any) => ({
        tenant_id: tenantId,
        rapat_id: rapatId,
        tipe_peserta: (g.jenis_ptk?.toUpperCase().includes('TENDIK') || g.jabatan?.toUpperCase().includes('TU') ? 'STAF_TU' : 'GURU') as any,
        peserta_id: g.id,
        nama_peserta: g.nama_guru,
        nomor_identitas: g.nip || g.nuptk || '-',
        jabatan_keterangan: g.GuruMapel?.[0]?.Mapel?.nama_mapel || g.jabatan || g.jenis_ptk || 'Tenaga Pendidik',
        no_hp: g.no_hp || undefined,
        is_hadir: false,
        metode_kehadiran: 'BELUM_HADIR' as any,
      }));

      if (pesertaData.length > 0) {
        await prisma.rapatPeserta.createMany({
          data: pesertaData,
          skipDuplicates: true,
        });
      }
    } else if (targetPeserta === 'SISWA') {
      const siswas = await prisma.siswa.findMany({
        where: { tenant_id: tenantId, status: 'AKTIF' },
        select: {
          id: true,
          nama_siswa: true,
          nisn: true,
          nis: true,
          no_hp: true,
          Kelas: { select: { nama_kelas: true } },
        },
        orderBy: { nama_siswa: 'asc' },
        take: 500, // Batas aman untuk bulk
      });

      const pesertaData = siswas.map((s: any) => ({
        tenant_id: tenantId,
        rapat_id: rapatId,
        tipe_peserta: 'SISWA' as any,
        peserta_id: s.id,
        nama_peserta: s.nama_siswa,
        nomor_identitas: s.nisn || s.nis || '-',
        jabatan_keterangan: `Siswa (${s.Kelas?.nama_kelas || 'Kelas'})`,
        no_hp: s.no_hp || undefined,
        is_hadir: false,
        metode_kehadiran: 'BELUM_HADIR' as any,
      }));

      if (pesertaData.length > 0) {
        await prisma.rapatPeserta.createMany({
          data: pesertaData,
          skipDuplicates: true,
        });
      }
    } else if (targetPeserta === 'WALI_MURID') {
      const orangTuas = await prisma.orangTuaSiswa.findMany({
        where: { Siswa: { tenant_id: tenantId } },
        include: {
          Siswa: {
            select: {
              nama_siswa: true,
              Kelas: { select: { nama_kelas: true } },
            },
          },
        },
        take: 500,
      });

      const pesertaData = orangTuas.map((ot: any) => ({
        tenant_id: tenantId,
        rapat_id: rapatId,
        tipe_peserta: 'ORANG_TUA' as any,
        peserta_id: ot.id,
        nama_peserta: ot.nama_ayah || ot.nama_ibu || `Wali dari ${ot.Siswa?.nama_siswa || 'Siswa'}`,
        nomor_identitas: ot.no_hp_ayah || ot.no_hp_ibu || '-',
        jabatan_keterangan: `Orang Tua (${ot.Siswa?.nama_siswa || ''} - ${ot.Siswa?.Kelas?.nama_kelas || ''})`,
        no_hp: ot.no_hp_ayah || ot.no_hp_ibu || undefined,
        is_hadir: false,
        metode_kehadiran: 'BELUM_HADIR' as any,
      }));

      if (pesertaData.length > 0) {
        await prisma.rapatPeserta.createMany({
          data: pesertaData,
          skipDuplicates: true,
        });
      }
    }
  }

  /**
   * Memperbarui informasi rapat, status, dan notulen keputusan
   */
  static async updateRapat(tenantId: string, rapatId: string, payload: Partial<CreateRapatDto>) {
    const existing = await prisma.rapatMaster.findFirst({
      where: { id: rapatId, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Data rapat tidak ditemukan.');
    }

    const dataToUpdate: any = {};

    if (payload.nomor_surat !== undefined) dataToUpdate.nomor_surat = payload.nomor_surat;
    if (payload.judul_rapat !== undefined) dataToUpdate.judul_rapat = payload.judul_rapat;
    if (payload.kategori_rapat !== undefined) dataToUpdate.kategori_rapat = payload.kategori_rapat;
    if (payload.target_peserta !== undefined) dataToUpdate.target_peserta = payload.target_peserta;
    if (payload.deskripsi !== undefined) dataToUpdate.deskripsi = payload.deskripsi;
    if (payload.tanggal_rapat !== undefined) dataToUpdate.tanggal_rapat = new Date(payload.tanggal_rapat);
    if (payload.jam_mulai !== undefined) dataToUpdate.jam_mulai = payload.jam_mulai;
    if (payload.jam_selesai !== undefined) dataToUpdate.jam_selesai = payload.jam_selesai;
    if (payload.tempat !== undefined) dataToUpdate.tempat = payload.tempat;
    if (payload.link_daring !== undefined) dataToUpdate.link_daring = payload.link_daring;
    if (payload.pimpinan_rapat !== undefined) dataToUpdate.pimpinan_rapat = payload.pimpinan_rapat;
    if (payload.notulis !== undefined) dataToUpdate.notulis = payload.notulis;
    if (payload.agenda !== undefined) dataToUpdate.agenda = payload.agenda ? JSON.parse(JSON.stringify(payload.agenda)) : null;
    if (payload.notulen_hasil !== undefined) dataToUpdate.notulen_hasil = payload.notulen_hasil;
    if (payload.status !== undefined) dataToUpdate.status = payload.status;

    await prisma.rapatMaster.update({
      where: { id: rapatId },
      data: dataToUpdate,
    });

    return this.getRapatDetail(tenantId, rapatId);
  }

  /**
   * Menghapus rapat
   */
  static async deleteRapat(tenantId: string, rapatId: string) {
    const existing = await prisma.rapatMaster.findFirst({
      where: { id: rapatId, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Data rapat tidak ditemukan.');
    }

    await prisma.rapatMaster.delete({
      where: { id: rapatId },
    });

    return { success: true, message: 'Rapat dan data pesertanya berhasil dihapus.' };
  }

  /**
   * Panitia atau admin menandai kehadiran peserta secara manual / scanner panitia
   */
  static async recordAttendance(
    tenantId: string,
    rapatId: string,
    params: {
      pesertaId: string;
      isHadir: boolean;
      metodeKehadiran?: any; // MetodeHadirRapat
      catatan?: string;
    }
  ) {
    const peserta = await prisma.rapatPeserta.findFirst({
      where: { id: params.pesertaId, rapat_id: rapatId, tenant_id: tenantId },
    });

    if (!peserta) {
      throw new Error('Data peserta rapat tidak ditemukan.');
    }

    const updated = await prisma.rapatPeserta.update({
      where: { id: params.pesertaId },
      data: {
        is_hadir: params.isHadir,
        waktu_hadir: params.isHadir ? new Date() : null,
        metode_kehadiran: params.metodeKehadiran || (params.isHadir ? 'MANUAL_PANITIA' : 'BELUM_HADIR'),
        catatan: params.catatan,
      },
    });

    return updated;
  }

  /**
   * Scan Mandiri Peserta (Guru, Siswa, Orang Tua) melalui QR Code Rapat
   */
  static async selfAttendViaQr(
    tenantId: string,
    params: {
      qrToken: string;
      nomorIdentitasOrId: string;
    }
  ) {
    const rapat = await prisma.rapatMaster.findFirst({
      where: { tenant_id: tenantId, qr_token: params.qrToken },
    });

    if (!rapat) {
      throw new Error('Kode QR presensi rapat tidak valid atau tidak terdaftar.');
    }

    if (rapat.status === 'SELESAI') {
      throw new Error('Rapat ini telah selesai/ditutup oleh panitia.');
    }

    if (rapat.status === 'DIBATALKAN') {
      throw new Error('Rapat ini telah dibatalkan.');
    }

    const queryIdentitas = params.nomorIdentitasOrId.trim();

    // 1. Cek apakah sudah ada di RapatPeserta
    let peserta = await prisma.rapatPeserta.findFirst({
      where: {
        rapat_id: rapat.id,
        tenant_id: tenantId,
        OR: [
          { peserta_id: queryIdentitas },
          { nomor_identitas: queryIdentitas },
          { nama_peserta: { equals: queryIdentitas, mode: 'insensitive' } },
        ],
      },
    });

    // 2. Jika belum ada di list peserta, cari di database Guru atau Siswa
    if (!peserta) {
      const guru = await prisma.guru.findFirst({
        where: {
          tenant_id: tenantId,
          OR: [
            { id: queryIdentitas },
            { nip: queryIdentitas },
            { nuptk: queryIdentitas },
            { nik: queryIdentitas },
            { nama_guru: { equals: queryIdentitas, mode: 'insensitive' } },
          ],
        },
        include: {
          GuruMapel: {
            select: { Mapel: { select: { nama_mapel: true } } },
            take: 1,
          },
        },
      });

      if (guru) {
        peserta = await prisma.rapatPeserta.create({
          data: {
            tenant_id: tenantId,
            rapat_id: rapat.id,
            tipe_peserta: (guru.jenis_ptk?.toUpperCase().includes('TENDIK') || guru.jabatan?.toUpperCase().includes('TU') ? 'STAF_TU' : 'GURU') as any,
            peserta_id: guru.id,
            nama_peserta: guru.nama_guru,
            nomor_identitas: guru.nip || guru.nuptk || '-',
            jabatan_keterangan: guru.GuruMapel?.[0]?.Mapel?.nama_mapel || guru.jabatan || guru.jenis_ptk || 'Tenaga Pendidik',
            no_hp: guru.no_hp || undefined,
            is_hadir: true,
            waktu_hadir: new Date(),
            metode_kehadiran: 'SCAN_QR_MANDIRI',
            catatan: 'Scan QR Presensi Mandiri',
          },
        });
      } else {
        const siswa = await prisma.siswa.findFirst({
          where: {
            tenant_id: tenantId,
            OR: [
              { id: queryIdentitas },
              { nisn: queryIdentitas },
              { nis: queryIdentitas },
              { nik: queryIdentitas },
              { nama_siswa: { equals: queryIdentitas, mode: 'insensitive' } },
            ],
          },
          include: { Kelas: { select: { nama_kelas: true } } },
        });

        if (siswa) {
          peserta = await prisma.rapatPeserta.create({
            data: {
              tenant_id: tenantId,
              rapat_id: rapat.id,
              tipe_peserta: 'SISWA',
              peserta_id: siswa.id,
              nama_peserta: siswa.nama_siswa,
              nomor_identitas: siswa.nisn || siswa.nis || '-',
              jabatan_keterangan: `Siswa (${siswa.Kelas?.nama_kelas || 'Kelas'})`,
              no_hp: siswa.no_hp || undefined,
              is_hadir: true,
              waktu_hadir: new Date(),
              metode_kehadiran: 'SCAN_QR_MANDIRI',
              catatan: 'Scan QR Presensi Mandiri Siswa',
            },
          });
        }
      }
    } else {
      // Update peserta yang sudah terdaftar menjadi hadir
      peserta = await prisma.rapatPeserta.update({
        where: { id: peserta.id },
        data: {
          is_hadir: true,
          waktu_hadir: new Date(),
          metode_kehadiran: 'SCAN_QR_MANDIRI',
          catatan: 'Scan QR Presensi Mandiri',
        },
      });
    }

    if (!peserta) {
      throw new Error('Identitas Anda tidak ditemukan di sistem. Pastikan memasukkan NIP/NISN/Nama yang sesuai.');
    }

    return {
      success: true,
      message: `Terima kasih! Kehadiran ${peserta.nama_peserta} pada ${rapat.judul_rapat} berhasil dicatat.`,
      rapat: {
        id: rapat.id,
        judul: rapat.judul_rapat,
        tempat: rapat.tempat,
        tanggal: rapat.tanggal_rapat,
      },
      peserta: {
        id: peserta.id,
        nama: peserta.nama_peserta,
        nomor_identitas: peserta.nomor_identitas,
        jabatan: peserta.jabatan_keterangan,
        waktuHadir: peserta.waktu_hadir,
      },
    };
  }

  /**
   * Mengambil sesi rapat aktif (BERLANGSUNG) untuk kebutuhan banner dashboard
   */
  static async getActiveMeeting(tenantId: string, _role?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeRapat = await prisma.rapatMaster.findFirst({
      where: {
        tenant_id: tenantId,
        status: 'BERLANGSUNG',
      },
      orderBy: { updated_at: 'desc' },
      include: {
        PesertaRapat: {
          select: {
            id: true,
            peserta_id: true,
            nama_peserta: true,
            is_hadir: true,
            waktu_hadir: true,
          },
        },
      },
    });

    if (!activeRapat) {
      return null;
    }

    const totalPeserta = activeRapat.PesertaRapat.length;
    const hadirCount = activeRapat.PesertaRapat.filter((p: any) => p.is_hadir).length;

    return {
      id: activeRapat.id,
      judul_rapat: activeRapat.judul_rapat,
      kategori_rapat: activeRapat.kategori_rapat,
      target_peserta: activeRapat.target_peserta,
      tanggal_rapat: activeRapat.tanggal_rapat,
      jam_mulai: activeRapat.jam_mulai,
      jam_selesai: activeRapat.jam_selesai,
      tempat: activeRapat.tempat,
      link_daring: activeRapat.link_daring,
      pimpinan_rapat: activeRapat.pimpinan_rapat,
      qr_token: activeRapat.qr_token,
      status: activeRapat.status,
      stats: {
        totalPeserta,
        hadirCount,
        persentaseHadir: totalPeserta > 0 ? Math.round((hadirCount / totalPeserta) * 100) : 0,
      },
      attendees: activeRapat.PesertaRapat,
    };
  }

  /**
   * Menghasilkan dataset terstruktur untuk Berita Acara & Daftar Hadir PDF resmi
   */
  static async getBeritaAcaraData(tenantId: string, rapatId: string) {
    const [sekolah, rapat] = await Promise.all([
      prisma.sekolah.findFirst({ where: { tenant_id: tenantId } }),
      this.getRapatDetail(tenantId, rapatId),
    ]);

    return {
      sekolah: {
        nama_sekolah: sekolah?.nama || 'SMK PUSAT KEUNGGULAN',
        npsn: sekolah?.npsn || '-',
        alamat: sekolah?.alamat || '',
        logo_url: sekolah?.logo_url || null,
        kabupaten: sekolah?.kota || '',
        provinsi: sekolah?.provinsi || '',
      },
      rapat,
    };
  }
}

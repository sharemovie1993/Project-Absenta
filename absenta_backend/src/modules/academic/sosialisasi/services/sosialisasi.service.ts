import { prisma } from '../../../../utils/prisma';

export interface RapatSosialisasiSession {
  id: string;
  tenant_id: string;
  nama_acara: string;
  tanggal: string; // YYYY-MM-DD
  waktu_mulai: string; // HH:mm
  waktu_selesai: string; // HH:mm
  tempat: string;
  pimpinan_rapat: string;
  notulis: string;
  agenda: string[];
  notulen_hasil: string;
  status: 'AKTIF' | 'SELESAI';
  qr_token: string;
  created_at: string;
  updated_at: string;
}

export interface RapatAttendeeItem {
  guru_id: string;
  nama_guru: string;
  nip: string;
  mapel_jabatan: string;
  no_hp?: string;
  is_hadir: boolean;
  waktu_hadir?: string; // ISO
  metode_scan?: 'QR_MANDIRI' | 'SCANNER_PANITIA' | 'MANUAL';
  catatan?: string;
}

export class SosialisasiService {
  private static SESSION_CONFIG_PREFIX = 'rapat_sosialisasi_active';
  private static ATTENDEES_CONFIG_PREFIX = 'rapat_sosialisasi_attendees_';

  /**
   * Mengambil sesi rapat sosialisasi aktif untuk tenant.
   * Jika belum ada sesi, inisialisasi sesi default hari ini secara otomatis.
   */
  static async getActiveSession(tenantId: string): Promise<{
    session: RapatSosialisasiSession;
    stats: { totalGuru: number; hadirCount: number; belumHadirCount: number; persentaseHadir: number };
    attendees: RapatAttendeeItem[];
  }> {
    const configKey = `${this.SESSION_CONFIG_PREFIX}`;
    let configRow = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: configKey },
    });

    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

    let session: RapatSosialisasiSession;

    if (!configRow) {
      // Ambil nama pimpinan default (Kepala Sekolah)
      const kepsek = await prisma.guru.findFirst({
        where: {
          tenant_id: tenantId,
          OR: [
            { jenis_ptk: { contains: 'Kepala Sekolah', mode: 'insensitive' } },
            { jabatan: { contains: 'Kepala Sekolah', mode: 'insensitive' } },
          ],
        },
        select: { nama_guru: true },
      });

      const defaultSessionId = `sosialisasi-${Date.now().toString(36)}`;
      const defaultToken = `SOSIALISASI-ABSENTA-${Date.now().toString(36).toUpperCase()}`;

      session = {
        id: defaultSessionId,
        tenant_id: tenantId,
        nama_acara: 'Sosialisasi & Bimbingan Teknis Penggunaan Platform Absenta',
        tanggal: todayStr,
        waktu_mulai: '08:00',
        waktu_selesai: '11:30',
        tempat: 'Ruang Rapat Guru / Aula Sekolah',
        pimpinan_rapat: kepsek?.nama_guru || 'Kepala Sekolah / Tim Sosialisasi',
        notulis: 'Panitia Sosialisasi Platform',
        agenda: [
          'Pengenalan Arsitektur & Manfaat Ekosistem Platform Absenta',
          'Alur Presensi Digital Guru & Siswa Real-Time (RFID & Mobile)',
          'Pengisian Jurnal KBM, Rekapitulasi Presensi, & Agenda Kelas',
          'Simulasi Pelaksanaan Asesmen CBT & Sinkronisasi Nilai Rapor',
          'Sesi Tanya Jawab, Praktik Langsung Guru, dan Komitmen Bersama',
        ],
        notulen_hasil: '',
        status: 'AKTIF',
        qr_token: defaultToken,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await prisma.config.create({
        data: {
          tenant_id: tenantId,
          key: configKey,
          value: JSON.stringify(session),
          description: 'Sesi Aktif Rapat Sosialisasi Penggunaan Platform',
        },
      });
    } else {
      try {
        session = JSON.parse(configRow.value);
      } catch {
        session = {
          id: `sosialisasi-${Date.now().toString(36)}`,
          tenant_id: tenantId,
          nama_acara: 'Sosialisasi & Bimbingan Teknis Penggunaan Platform Absenta',
          tanggal: todayStr,
          waktu_mulai: '08:00',
          waktu_selesai: '11:30',
          tempat: 'Ruang Rapat Guru / Aula Sekolah',
          pimpinan_rapat: 'Kepala Sekolah / Tim Sosialisasi',
          notulis: 'Panitia Sosialisasi Platform',
          agenda: [
            'Pengenalan Arsitektur & Manfaat Ekosistem Platform Absenta',
            'Alur Presensi Digital Guru & Siswa Real-Time (RFID & Mobile)',
            'Pengisian Jurnal KBM, Rekapitulasi Presensi, & Agenda Kelas',
            'Simulasi Pelaksanaan Asesmen CBT & Sinkronisasi Nilai Rapor',
            'Sesi Tanya Jawab, Praktik Langsung Guru, dan Komitmen Bersama',
          ],
          notulen_hasil: '',
          status: 'AKTIF',
          qr_token: `SOSIALISASI-ABSENTA-${Date.now().toString(36).toUpperCase()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    }

    // Ambil daftar seluruh guru aktif dari database
    const allGurus = await prisma.guru.findMany({
      where: {
        tenant_id: tenantId,
      },
      select: {
        id: true,
        nama_guru: true,
        nip: true,
        nuptk: true,
        nik: true,
        jabatan: true,
        jenis_ptk: true,
        no_hp: true,
        GuruMapel: {
          select: {
            Mapel: { select: { nama_mapel: true } },
          },
          take: 1,
        },
      },
      orderBy: { nama_guru: 'asc' },
    });

    // Ambil data kehadiran yang tersimpan untuk sesi ini
    const attendeesConfigKey = `${this.ATTENDEES_CONFIG_PREFIX}${session.id}`;
    const attendeesRow = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: attendeesConfigKey },
    });

    let savedAttendanceMap: Record<string, Partial<RapatAttendeeItem>> = {};
    if (attendeesRow?.value) {
      try {
        savedAttendanceMap = JSON.parse(attendeesRow.value);
      } catch {
        savedAttendanceMap = {};
      }
    }

    const attendees: RapatAttendeeItem[] = allGurus.map((g: any) => {
      const saved = savedAttendanceMap[g.id];
      const nipVal = g.nip || g.nuptk || g.nik || '-';
      const mapelName = g.GuruMapel?.[0]?.Mapel?.nama_mapel;
      const mapelOrJabatan = mapelName || g.jabatan || g.jenis_ptk || 'Tenaga Pendidik';
      const phoneVal = g.no_hp || '';

      return {
        guru_id: g.id,
        nama_guru: g.nama_guru,
        nip: nipVal,
        mapel_jabatan: mapelOrJabatan,
        no_hp: phoneVal,
        is_hadir: Boolean(saved?.is_hadir),
        waktu_hadir: saved?.waktu_hadir,
        metode_scan: saved?.metode_scan,
        catatan: saved?.catatan,
      };
    });

    const totalGuru = attendees.length;
    const hadirCount = attendees.filter((a) => a.is_hadir).length;
    const belumHadirCount = totalGuru - hadirCount;
    const persentaseHadir = totalGuru > 0 ? Math.round((hadirCount / totalGuru) * 100) : 0;

    return {
      session,
      stats: {
        totalGuru,
        hadirCount,
        belumHadirCount,
        persentaseHadir,
      },
      attendees,
    };
  }

  /**
   * Menyimpan / memperbarui metadata sesi rapat sosialisasi & notulen
   */
  static async updateSession(
    tenantId: string,
    payload: Partial<RapatSosialisasiSession>
  ): Promise<RapatSosialisasiSession> {
    const configKey = `${this.SESSION_CONFIG_PREFIX}`;
    const existing = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: configKey },
    });

    let current: RapatSosialisasiSession;
    if (existing?.value) {
      try {
        current = JSON.parse(existing.value);
      } catch {
        current = {} as any;
      }
    } else {
      current = {} as any;
    }

    const updated: RapatSosialisasiSession = {
      ...current,
      ...payload,
      tenant_id: tenantId,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await prisma.config.update({
        where: { id: existing.id },
        data: { value: JSON.stringify(updated) },
      });
    } else {
      await prisma.config.create({
        data: {
          tenant_id: tenantId,
          key: configKey,
          value: JSON.stringify(updated),
          description: 'Sesi Aktif Rapat Sosialisasi Penggunaan Platform',
        },
      });
    }

    return updated;
  }

  /**
   * Mencatat kehadiran seorang guru (oleh Panitia atau Toggle Manual)
   */
  static async recordTeacherAttendance(
    tenantId: string,
    params: {
      sessionId: string;
      guruId: string;
      isHadir: boolean;
      metodeScan?: 'QR_MANDIRI' | 'SCANNER_PANITIA' | 'MANUAL';
      catatan?: string;
    }
  ): Promise<RapatAttendeeItem> {
    const attendeesConfigKey = `${this.ATTENDEES_CONFIG_PREFIX}${params.sessionId}`;
    const existing = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: attendeesConfigKey },
    });

    let attendanceMap: Record<string, Partial<RapatAttendeeItem>> = {};
    if (existing?.value) {
      try {
        attendanceMap = JSON.parse(existing.value);
      } catch {
        attendanceMap = {};
      }
    }

    const nowIso = new Date().toISOString();

    if (params.isHadir) {
      attendanceMap[params.guruId] = {
        guru_id: params.guruId,
        is_hadir: true,
        waktu_hadir: nowIso,
        metode_scan: params.metodeScan || 'MANUAL',
        catatan: params.catatan || 'Hadir pada rapat sosialisasi',
      };
    } else {
      delete attendanceMap[params.guruId];
    }

    const updatedJson = JSON.stringify(attendanceMap);

    if (existing) {
      await prisma.config.update({
        where: { id: existing.id },
        data: { value: updatedJson },
      });
    } else {
      await prisma.config.create({
        data: {
          tenant_id: tenantId,
          key: attendeesConfigKey,
          value: updatedJson,
          description: `Data Kehadiran Sesi Rapat Sosialisasi ${params.sessionId}`,
        },
      });
    }

    // Ambil data profil guru untuk respons
    const guru = await prisma.guru.findFirst({
      where: { id: params.guruId, tenant_id: tenantId },
      select: {
        id: true,
        nama_guru: true,
        nip: true,
        nuptk: true,
        jabatan: true,
        jenis_ptk: true,
        GuruMapel: {
          select: { Mapel: { select: { nama_mapel: true } } },
          take: 1,
        },
      },
    });

    const mapelOrJabatan =
      guru?.GuruMapel?.[0]?.Mapel?.nama_mapel || guru?.jabatan || guru?.jenis_ptk || 'Guru';

    return {
      guru_id: params.guruId,
      nama_guru: guru?.nama_guru || 'Guru',
      nip: guru?.nip || guru?.nuptk || '-',
      mapel_jabatan: mapelOrJabatan,
      is_hadir: params.isHadir,
      waktu_hadir: params.isHadir ? nowIso : undefined,
      metode_scan: params.metodeScan || 'MANUAL',
      catatan: params.catatan,
    };
  }

  /**
   * Konfirmasi Kehadiran Mandiri oleh Guru via Scan QR Cetak (Public Portal)
   */
  static async selfAttendViaQr(
    tenantId: string,
    params: {
      qrToken: string;
      guruIdOrNip: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
    guru: { id: string; nama: string; nip: string; jabatan: string; waktuHadir: string };
  }> {
    const configKey = `${this.SESSION_CONFIG_PREFIX}`;
    const sessionRow = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: configKey },
    });

    if (!sessionRow) {
      throw new Error('Sesi rapat sosialisasi tidak ditemukan atau belum diaktifkan.');
    }

    const session: RapatSosialisasiSession = JSON.parse(sessionRow.value);

    // Validasi token QR cetak
    if (session.qr_token !== params.qrToken) {
      throw new Error('Kode QR presensi tidak valid atau telah kadaluarsa. Silakan scan ulang kode QR terbaru.');
    }

    if (session.status === 'SELESAI') {
      throw new Error('Sesi rapat sosialisasi ini telah ditutup/selesai oleh panitia.');
    }

    // Cari guru berdasarkan ID, NIP, NIK, atau NUPTK
    const guru = await prisma.guru.findFirst({
      where: {
        tenant_id: tenantId,
        OR: [
          { id: params.guruIdOrNip },
          { nip: params.guruIdOrNip },
          { nuptk: params.guruIdOrNip },
          { nik: params.guruIdOrNip },
        ],
      },
      select: {
        id: true,
        nama_guru: true,
        nip: true,
        nuptk: true,
        jabatan: true,
        jenis_ptk: true,
        GuruMapel: {
          select: { Mapel: { select: { nama_mapel: true } } },
          take: 1,
        },
      },
    });

    if (!guru) {
      throw new Error('Data guru tidak ditemukan. Pastikan Anda memilih nama atau memasukkan NIP yang benar.');
    }

    // Catat kehadiran guru
    const recorded = await this.recordTeacherAttendance(tenantId, {
      sessionId: session.id,
      guruId: guru.id,
      isHadir: true,
      metodeScan: 'QR_MANDIRI',
      catatan: 'Scan mandiri melalui Lembar QR Cetak Sosialisasi',
    });

    const mapelOrJabatan =
      guru.GuruMapel?.[0]?.Mapel?.nama_mapel || guru.jabatan || guru.jenis_ptk || 'Tenaga Pendidik';

    return {
      success: true,
      message: `Terima kasih! Kehadiran ${guru.nama_guru} pada Rapat Sosialisasi Platform telah berhasil dicatat.`,
      guru: {
        id: guru.id,
        nama: guru.nama_guru,
        nip: guru.nip || guru.nuptk || '-',
        jabatan: mapelOrJabatan,
        waktuHadir: recorded.waktu_hadir || new Date().toISOString(),
      },
    };
  }

  /**
   * Reset / Buka Sesi Rapat Sosialisasi Baru
   */
  static async resetNewSession(
    tenantId: string,
    namaAcara?: string
  ): Promise<RapatSosialisasiSession> {
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    const newSessionId = `sosialisasi-${Date.now().toString(36)}`;
    const newQrToken = `SOSIALISASI-ABSENTA-${Date.now().toString(36).toUpperCase()}`;

    const newSession: RapatSosialisasiSession = {
      id: newSessionId,
      tenant_id: tenantId,
      nama_acara: namaAcara || 'Sosialisasi & Bimbingan Teknis Penggunaan Platform Absenta',
      tanggal: todayStr,
      waktu_mulai: '08:00',
      waktu_selesai: '11:30',
      tempat: 'Ruang Rapat Guru / Aula Sekolah',
      pimpinan_rapat: 'Kepala Sekolah / Tim Pengembang Platform',
      notulis: 'Panitia Sosialisasi Platform',
      agenda: [
        'Pengenalan Arsitektur & Manfaat Ekosistem Platform Absenta',
        'Alur Presensi Digital Guru & Siswa Real-Time (RFID & Mobile)',
        'Pengisian Jurnal KBM, Rekapitulasi Presensi, & Agenda Kelas',
        'Simulasi Pelaksanaan Asesmen CBT & Sinkronisasi Nilai Rapor',
        'Sesi Tanya Jawab, Praktik Langsung Guru, dan Komitmen Bersama',
      ],
      notulen_hasil: '',
      status: 'AKTIF',
      qr_token: newQrToken,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const configKey = `${this.SESSION_CONFIG_PREFIX}`;
    const existing = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: configKey },
    });

    if (existing) {
      await prisma.config.update({
        where: { id: existing.id },
        data: { value: JSON.stringify(newSession) },
      });
    } else {
      await prisma.config.create({
        data: {
          tenant_id: tenantId,
          key: configKey,
          value: JSON.stringify(newSession),
          description: 'Sesi Aktif Rapat Sosialisasi Penggunaan Platform',
        },
      });
    }

    return newSession;
  }
}

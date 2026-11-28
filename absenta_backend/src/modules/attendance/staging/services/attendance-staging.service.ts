import { prisma } from '@/utils/prisma';
import { appLogger } from '@/utils/app-logger';
import {
  AttendanceStagingParserService,
  ParsedAttendanceSheetData,
} from './attendance-staging-parser.service';

export class AttendanceStagingService {
  /**
   * Ambil status Guard Event Resmi Staging & Backfill Presensi untuk tenant ini
   */
  static async getGuardStatus(tenantId: string): Promise<{
    enabled: boolean;
    event_label: string;
    updated_by: string | null;
    updated_at: string | null;
  }> {
    const configs = await prisma.config.findMany({
      where: {
        tenant_id: tenantId,
        key: {
          in: [
            'ALLOW_ATTENDANCE_STAGING_BACKFILL',
            'ATTENDANCE_STAGING_EVENT_LABEL',
            'ATTENDANCE_STAGING_UPDATED_BY',
            'ATTENDANCE_STAGING_UPDATED_AT',
          ],
        },
      },
    });
    const map = configs.reduce((acc, c) => {
      acc[c.key] = c.value;
      return acc;
    }, {} as Record<string, string>);

    return {
      enabled: map['ALLOW_ATTENDANCE_STAGING_BACKFILL'] === 'true',
      event_label: map['ATTENDANCE_STAGING_EVENT_LABEL'] || 'Event Resmi Rekonsiliasi & Backfill Presensi',
      updated_by: map['ATTENDANCE_STAGING_UPDATED_BY'] || null,
      updated_at: map['ATTENDANCE_STAGING_UPDATED_AT'] || null,
    };
  }

  /**
   * Ubah status Guard Event Resmi Staging & Backfill Presensi (Hanya Admin)
   */
  static async setGuardStatus(
    tenantId: string,
    enabled: boolean,
    updatedBy: string,
    eventLabel?: string
  ) {
    const upsertConfig = async (key: string, value: string) => {
      const existing = await prisma.config.findFirst({
        where: { tenant_id: tenantId, key },
      });
      if (existing) {
        await prisma.config.update({
          where: { id: existing.id },
          data: { value },
        });
      } else {
        await prisma.config.create({
          data: { tenant_id: tenantId, key, value },
        });
      }
    };

    const nowIso = new Date().toISOString();
    await upsertConfig('ALLOW_ATTENDANCE_STAGING_BACKFILL', enabled ? 'true' : 'false');
    if (eventLabel !== undefined && eventLabel.trim()) {
      await upsertConfig('ATTENDANCE_STAGING_EVENT_LABEL', eventLabel.trim());
    }
    await upsertConfig('ATTENDANCE_STAGING_UPDATED_BY', updatedBy);
    await upsertConfig('ATTENDANCE_STAGING_UPDATED_AT', nowIso);

    return this.getGuardStatus(tenantId);
  }

  /**
   * Pastikan Guard Event Resmi sedang aktif sebelum menjalankan operasi tulis Staging/Backfill
   */
  static async assertGuardEnabled(tenantId: string): Promise<void> {
    const status = await this.getGuardStatus(tenantId);
    if (!status.enabled) {
      const err: any = new Error(
        'Akses Ditolak oleh Guard Keamanan: Fitur Staging & Backfill Presensi sedang dinonaktifkan untuk mencegah manipulasi data di luar Event Resmi. Silakan hubungi Administrator Sekolah untuk mengaktifkan Mode Event Resmi.'
      );
      err.statusCode = 403;
      err.code = 'STAGING_GUARD_LOCKED';
      throw err;
    }
  }

  /**
   * Tarik Google Spreadsheet dari URL, parse seluruh sheet, dan simpan ke Staging
   */
  static async fetchAndStore(tenantId: string, url: string): Promise<{ totalSheets: number; sheets: any[] }> {
    const { buffer, spreadsheetId } = await AttendanceStagingParserService.fetchSpreadsheetBuffer(url);
    const parsedSheets = AttendanceStagingParserService.parseWorkbook(buffer);

    if (parsedSheets.length === 0) {
      throw new Error('Tidak ada sheet valid yang terdeteksi dalam Google Spreadsheet ini. Pastikan format tabel sesuai.');
    }

    appLogger.info({ tenantId, spreadsheetId, totalSheets: parsedSheets.length }, 'Berhasil mem-parse sheets staging absensi');

    // Ambil daftar kelas aktif di tenant untuk auto-matching
    const tenantClasses = await prisma.kelas.findMany({
      where: { tenant_id: tenantId, is_active: true },
      select: { id: true, nama_kelas: true, tingkat: true },
    });

    // Ambil tahun pelajaran aktif
    const activeTp = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true },
      select: { id: true, tahun: true },
    });

    const activeSem = await prisma.semester.findFirst({
      where: { tenant_id: tenantId, is_active: true },
      select: { id: true, nama_semester: true },
    });

    const savedRecords: any[] = [];

    for (const sheetData of parsedSheets) {
      // 1. Auto-match kelas secara presisi
      const matchedClass = this.matchClassSmart(sheetData.sheetName, sheetData.namaKelas, tenantClasses);

      // 2. Hitung kecocokan siswa jika kelas ditemukan berdasarkan Konteks Akademik (SiswaAkademik)
      let matchedStudentCount = 0;
      if (matchedClass) {
        if (activeTp?.id) {
          const saStudents = await prisma.siswaAkademik.findMany({
            where: {
              kelas_id: matchedClass.id,
              tahun_pelajaran_id: activeTp.id,
            },
            include: {
              siswa: {
                select: { id: true, nis: true, nisn: true, nama_siswa: true },
              },
            },
          });

          // Cocokkan setiap siswa di sheet menggunakan Bijective 1-to-1 Priority Matching
          const bijectiveResult = this.matchStudentsBijective(sheetData.students, saStudents);
          matchedStudentCount = bijectiveResult.matchedCount;
        } else {
          const studentNisnList = sheetData.students.map((s) => s.nisn).filter(Boolean);
          const studentNisList = sheetData.students.map((s) => s.nis).filter(Boolean);
          const existingStudents = await prisma.siswa.findMany({
            where: {
              tenant_id: tenantId,
              kelas_id: matchedClass.id,
              OR: [
                { nisn: { in: studentNisnList } },
                { nis: { in: studentNisList } },
              ],
            },
            select: { id: true, nisn: true, nis: true },
          });
          matchedStudentCount = existingStudents.length;
        }
      }

      // 3. Upsert ke tabel penampung staging
      const existingSheet = await (prisma as any).attendanceStagingSheet.findFirst({
        where: {
          tenant_id: tenantId,
          source_url: url,
          sheet_name: sheetData.sheetName,
        },
      });

      const payload = {
        tenant_id: tenantId,
        source_url: url,
        file_title: `Presensi Mingguan ${sheetData.rentangTanggal || ''}`.trim(),
        tahun_pelajaran_id: activeTp?.id || null,
        tahun_pelajaran_nama: sheetData.tahunPelajaran || activeTp?.tahun || '2026/2027',
        semester_id: activeSem?.id || null,
        kelas_id: matchedClass?.id || null,
        nama_kelas: matchedClass?.nama_kelas || sheetData.namaKelas,
        sheet_name: sheetData.sheetName,
        rentang_tanggal: sheetData.rentangTanggal || null,
        total_siswa: sheetData.studentCount,
        total_matched_siswa: matchedStudentCount,
        raw_sheet_data: sheetData as any,
        status: 'READY',
      };

      let record;
      if (existingSheet) {
        record = await (prisma as any).attendanceStagingSheet.update({
          where: { id: existingSheet.id },
          data: payload,
        });
      } else {
        record = await (prisma as any).attendanceStagingSheet.create({
          data: payload,
        });
      }

      savedRecords.push(record);
    }

    return {
      totalSheets: savedRecords.length,
      sheets: savedRecords,
    };
  }

  /**
   * Ambil daftar lembar staging
   */
  static async listSheets(tenantId: string, filter?: { status?: string; search?: string }) {
    const where: any = { tenant_id: tenantId };
    if (filter?.status && filter.status !== 'ALL') {
      where.status = filter.status;
    }
    if (filter?.search) {
      where.OR = [
        { nama_kelas: { contains: filter.search, mode: 'insensitive' } },
        { sheet_name: { contains: filter.search, mode: 'insensitive' } },
        { rentang_tanggal: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return (prisma as any).attendanceStagingSheet.findMany({
      where,
      orderBy: [{ created_at: 'desc' }, { nama_kelas: 'asc' }],
    });
  }

  /**
   * Ambil rincian data 1 lembar staging
   */
  static async getSheetDetail(tenantId: string, id: string) {
    const sheet = await (prisma as any).attendanceStagingSheet.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!sheet) {
      throw new Error('Data staging tidak ditemukan');
    }
    return sheet;
  }

  /**
   * Hapus lembar staging
   */
  static async deleteSheet(tenantId: string, id: string) {
    return (prisma as any).attendanceStagingSheet.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }

  /**
   * Hapus massal lembar staging
   */
  static async bulkDeleteSheets(tenantId: string, ids: string[]) {
    return (prisma as any).attendanceStagingSheet.deleteMany({
      where: { id: { in: ids }, tenant_id: tenantId },
    });
  }

  /**
   * Eksekusi Sinkronisasi Atomik: Smart Day & Column Dispatcher
   */
  static async syncSheet(tenantId: string, id: string, userId: string) {
    const sheetRecord = await (prisma as any).attendanceStagingSheet.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!sheetRecord) {
      throw new Error('Data staging tidak ditemukan');
    }

    const rawData: ParsedAttendanceSheetData = sheetRecord.raw_sheet_data;
    if (!rawData || !rawData.sessions || !rawData.students) {
      throw new Error('Data mentah staging tidak lengkap atau korup');
    }

    // 1. Resolve Kelas
    let targetKelasId = sheetRecord.kelas_id;
    if (!targetKelasId) {
      const matched = await prisma.kelas.findFirst({
        where: {
          tenant_id: tenantId,
          nama_kelas: { equals: sheetRecord.nama_kelas, mode: 'insensitive' },
        },
      });
      if (!matched) {
        throw new Error(`Kelas "${sheetRecord.nama_kelas}" tidak ditemukan di database resmi. Pastikan kelas telah dibuat terlebih dahulu.`);
      }
      targetKelasId = matched.id;
    }

    // 2. Resolve TP & Semester (Gunakan Konteks Sheet jika tersedia, fallback ke Aktif)
    const targetTpId = sheetRecord.tahun_pelajaran_id;
    const targetSemId = sheetRecord.semester_id;

    const tp = targetTpId
      ? await prisma.tahunPelajaran.findFirst({ where: { id: targetTpId, tenant_id: tenantId } })
      : await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } });

    const sem = targetSemId
      ? await prisma.semester.findFirst({ where: { id: targetSemId, tenant_id: tenantId } })
      : await prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true } });

    if (!tp || !sem) {
      throw new Error('Tahun Pelajaran atau Semester belum dikonfigurasi di sekolah ini.');
    }

    // 3. Resolve atau Auto-Create Jadwal Kegiatan untuk tiap Jenis Kegiatan
    const jadwalMap: Record<string, string> = {};
    const kegiatanTypes = ['UPACARA', 'KETARUNAAN', 'DUHA', 'APEL_SORE'];

    for (const kt of kegiatanTypes) {
      const namaKegiatan =
        kt === 'UPACARA'
          ? 'Upacara'
          : kt === 'KETARUNAAN'
          ? 'Ketarunaan'
          : kt === 'DUHA'
          ? 'Duha'
          : 'Apel Pulang';

      let jk = await prisma.jadwalKegiatan.findFirst({
        where: {
          tenant_id: tenantId,
          OR: [
            { nama: { equals: namaKegiatan, mode: 'insensitive' } },
            { jenis_kegiatan: { equals: namaKegiatan, mode: 'insensitive' } },
            { jenis_kegiatan: { contains: kt, mode: 'insensitive' } },
            { nama: { contains: kt, mode: 'insensitive' } },
          ],
        },
      });

      if (!jk) {
        jk = await prisma.jadwalKegiatan.create({
          data: {
            tenant_id: tenantId,
            nama: namaKegiatan,
            jenis_kegiatan: namaKegiatan,
            hari: ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'],
            waktu_mulai: kt === 'APEL_SORE' ? '15:30' : '06:30',
            waktu_selesai: kt === 'APEL_SORE' ? '16:00' : (kt === 'KETARUNAAN' ? '07:30' : '07:50'),
            target_semua_kelas: true,
            berlaku_mulai: new Date(),
            tahun_pelajaran_id: tp.id,
            semester_id: sem.id,
            aktif: true,
            dibuat_oleh: userId,
          },
        });
      }

      jadwalMap[kt] = jk.id;
    }

    // 4. Ambil master siswa kelas ini via SiswaAkademik
    const dbSiswaAkademik = await prisma.siswaAkademik.findMany({
      where: {
        kelas_id: targetKelasId,
        tahun_pelajaran_id: tp.id,
        semester_id: sem.id,
      },
      include: {
        siswa: {
          select: { id: true, nis: true, nisn: true, nama_siswa: true },
        },
      },
    });

    const studentMapById = new Map<string, { siswaId: string; siswaAkademikId: string }>();
    const studentMapByNisn = new Map<string, { siswaId: string; siswaAkademikId: string }>();
    const studentMapByNis = new Map<string, { siswaId: string; siswaAkademikId: string }>();
    const studentMapByName = new Map<string, { siswaId: string; siswaAkademikId: string }>();

    dbSiswaAkademik.forEach((sa) => {
      studentMapById.set(sa.siswa_id, { siswaId: sa.siswa_id, siswaAkademikId: sa.id });
      if (sa.siswa?.nisn) {
        const rawNisn = sa.siswa.nisn.trim();
        const cleanNisn = rawNisn.replace(/[^0-9]/g, '');
        studentMapByNisn.set(rawNisn, { siswaId: sa.siswa_id, siswaAkademikId: sa.id });
        if (cleanNisn && cleanNisn !== '0') {
          studentMapByNisn.set(cleanNisn, { siswaId: sa.siswa_id, siswaAkademikId: sa.id });
        }
      }
      if (sa.siswa?.nis) {
        studentMapByNis.set(sa.siswa.nis.trim(), { siswaId: sa.siswa_id, siswaAkademikId: sa.id });
      }
      if (sa.siswa?.nama_siswa) {
        const normName = sa.siswa.nama_siswa.toUpperCase().replace(/[^A-Z0-9]/g, '');
        studentMapByName.set(normName, { siswaId: sa.siswa_id, siswaAkademikId: sa.id });
      }
    });

    // 4b. Ambil Wali Kelas / Pendamping Rombel ini untuk pencatatan kepatuhan pembina
    const waliPos = await prisma.organizationalPosition.findFirst({
      where: { tenant_id: tenantId, code: 'WALIKELAS', is_active: true },
      include: {
        organizationalAssigns: {
          where: { is_active: true, kelas_id: targetKelasId },
          include: { User: { include: { Guru: { select: { id: true } } } } },
        },
      },
    });
    const waliGuruId = waliPos?.organizationalAssigns?.[0]?.User?.Guru?.id || null;

    // 5. Eksekusi Sinkronisasi per Sesi dalam Transaksi Atomik
    const summaryCounters = {
      totalSesi: rawData.sessions.length,
      upacaraSessions: 0,
      ketarunaanSessions: 0,
      duhaSessions: 0,
      apelSoreSessions: 0,
      totalAttendanceRows: 0,
    };

    await prisma.$transaction(async (tx) => {
      for (const sess of rawData.sessions) {
        const sessionDate = new Date(`${sess.dateIso}T00:00:00.000Z`);
        const sessionType = sess.defaultType;
        const jadwalKegiatanId = jadwalMap[sessionType];

        const dayStart = new Date(`${sess.dateIso}T00:00:00.000+07:00`);
        const dayEnd = new Date(`${sess.dateIso}T23:59:59.999+07:00`);

        // Cari atau buat SesiAbsensi (Cari sesi yang cocok atau gunakan placeholder template yang sudah ada)
        let sesi = await tx.sesiAbsensi.findFirst({
          where: {
            tenant_id: tenantId,
            kelas_id: targetKelasId,
            tanggal: { gte: new Date(dayStart.getTime() - 12 * 3600 * 1000), lte: new Date(dayEnd.getTime() + 12 * 3600 * 1000) },
            OR: [
              ...(jadwalKegiatanId ? [{ jadwal_kegiatan_id: jadwalKegiatanId }] : []),
              { jenis_kegiatan: { equals: sessionType, mode: 'insensitive' as any } },
              { jenis_kegiatan: { contains: sessionType, mode: 'insensitive' as any } },
            ],
          },
        });

        if (!sesi) {
          const startTime = new Date(`${sess.dateIso}T${sessionType === 'APEL_SORE' ? '15:30:00' : '06:30:00'}Z`);
          const endTime = new Date(`${sess.dateIso}T${sessionType === 'APEL_SORE' ? '16:00:00' : '07:30:00'}Z`);

          sesi = await tx.sesiAbsensi.create({
            data: {
              tenant_id: tenantId,
              kelas_id: targetKelasId,
              semester_id: sem.id,
              tahun_pelajaran_id: tp.id,
              tanggal: sessionDate,
              waktu_mulai: startTime,
              waktu_selesai: endTime,
              jenis_kegiatan: sessionType,
              status: 'SELESAI',
              jadwal_kegiatan_id: jadwalKegiatanId,
              created_by_user_id: userId,
              keterangan: `Sinkronisasi Staging Backfill (${sheetRecord.file_title || 'Google Sheet'})`,
            },
          });
        } else if (sesi.status !== 'SELESAI' || !sesi.jadwal_kegiatan_id) {
          // Jika sesi template / placeholder ditemukan, aktifkan menjadi SELESAI
          sesi = await tx.sesiAbsensi.update({
            where: { id: sesi.id },
            data: {
              status: 'SELESAI',
              jadwal_kegiatan_id: sesi.jadwal_kegiatan_id || jadwalKegiatanId,
              keterangan: sesi.keterangan || `Sinkronisasi Staging Backfill (${sheetRecord.file_title || 'Google Sheet'})`,
            },
          });
        }

        if (sessionType === 'UPACARA') summaryCounters.upacaraSessions++;
        else if (sessionType === 'KETARUNAAN') summaryCounters.ketarunaanSessions++;
        else if (sessionType === 'DUHA') summaryCounters.duhaSessions++;
        else if (sessionType === 'APEL_SORE') summaryCounters.apelSoreSessions++;

        // Masukkan / Upsert AbsenGuru untuk Wali Kelas / Pendamping Rombel
        if (waliGuruId) {
          await tx.absenGuru.upsert({
            where: {
              sesi_id_guru_id: {
                sesi_id: sesi.id,
                guru_id: waliGuruId,
              },
            },
            update: {
              status: 'HADIR',
              waktu_tap: sesi.waktu_mulai || sessionDate,
            },
            create: {
              tenant_id: tenantId,
              sesi_id: sesi.id,
              guru_id: waliGuruId,
              status: 'HADIR',
              waktu_tap: sesi.waktu_mulai || sessionDate,
              tahun_pelajaran_id: tp.id,
              semester_id: sem.id,
              catatan: `Pendamping Rombel / Wali Kelas (${sheetRecord.nama_kelas})`,
            },
          });
        }

        // Masukkan / Upsert AbsenSiswa
        for (const student of rawData.students) {
          const cleanStNisn = student.nisn ? String(student.nisn).trim().replace(/[^0-9]/g, '') : '';
          const studentInfo =
            (student.siswa_id ? studentMapById.get(student.siswa_id) : undefined) ||
            (cleanStNisn && cleanStNisn !== '0' ? studentMapByNisn.get(cleanStNisn) : undefined) ||
            (student.nisn ? studentMapByNisn.get(student.nisn.trim()) : undefined) ||
            (student.nis ? studentMapByNis.get(student.nis.trim()) : undefined) ||
            (student.nama ? studentMapByName.get(student.nama.toUpperCase().replace(/[^A-Z0-9]/g, '')) : undefined);
          if (!studentInfo) continue; // Lewati siswa yang tidak terdaftar di database

          const rawCellStatus = student.attendance[`${sess.dateIso}_${sess.sessionCode}`] || 'ALPA';
          const isLateCell = rawCellStatus === 'TERLAMBAT';
          const status = isLateCell ? 'HADIR' : rawCellStatus;

          const existingAbsen = await tx.absenSiswa.findFirst({
            where: {
              sesi_id: sesi.id,
              siswa_akademik_id: studentInfo.siswaAkademikId,
            },
          });

          if (existingAbsen) {
            await tx.absenSiswa.update({
              where: {
                id_created_at: {
                  id: existingAbsen.id,
                  created_at: existingAbsen.created_at,
                },
              },
              data: {
                status,
                is_terlambat: isLateCell,
                menit_keterlambatan: isLateCell ? 15 : 0,
                waktu_tap: sessionDate,
                kelas_id_snapshot: targetKelasId,
                kelas_nama_snapshot: sheetRecord.nama_kelas,
                tahun_pelajaran_id_snapshot: tp.id,
              },
            });
          } else {
            await tx.absenSiswa.create({
              data: {
                tenant_id: tenantId,
                sesi_id: sesi.id,
                siswa_id: studentInfo.siswaId,
                siswa_akademik_id: studentInfo.siswaAkademikId,
                status,
                is_terlambat: isLateCell,
                menit_keterlambatan: isLateCell ? 15 : 0,
                waktu_tap: sessionDate,
                kelas_id_snapshot: targetKelasId,
                kelas_nama_snapshot: sheetRecord.nama_kelas,
                tahun_pelajaran_id_snapshot: tp.id,
                catatan: `Import Google Sheet (${sess.day} ${sess.sessionCode})`,
              },
            });
          }
          summaryCounters.totalAttendanceRows++;
        }
      }

      // 6. Tandai staging sheet sebagai SYNCED
      await (tx as any).attendanceStagingSheet.update({
        where: { id },
        data: {
          status: 'SYNCED',
          last_synced_at: new Date(),
          sync_summary: summaryCounters as any,
        },
      });
    }, { timeout: 60000 });

    appLogger.info({ tenantId, sheetId: id, summaryCounters }, 'Sinkronisasi Staging Absensi Berhasil');

    return {
      success: true,
      message: `Berhasil menyinkronkan rombel ${sheetRecord.nama_kelas} (${summaryCounters.totalSesi} sesi presensi, ${summaryCounters.totalAttendanceRows} entri kehadiran).`,
      summary: summaryCounters,
    };
  }

  /**
   * Helper pencocokan 1-to-1 presisi per siswa (Bijective Priority Matching)
   * Prioritas Utama: NISN (Standar Nasional Dapodik Kemendikbud - SSOT Unik Siswa)
   * Urutan Prioritas:
   * 1. NISN (SSOT Unik Nasional Dapodik) -> PRIORITAS UTAMA
   * 2. NIS sekolah (Nomor Induk Siswa lokal sekolah)
   * 3. Nama siswa normalisasi (huruf kapital tanpa spasi/tanda baca)
   * 4. Explicit manual mapping (siswa_id)
   */
  static matchStudentsBijective(
    sheetStudents: any[],
    classStudents: any[]
  ): {
    matchedCount: number;
    mappedSheetStudents: any[];
  } {
    const usedDbIds = new Set<string>();

    // Pass 1: PRIORITAS UTAMA -> NISN resmi (Dapodik / Kemendikbud)
    for (const st of sheetStudents) {
      const cleanStNisn = String(st.nisn || '').trim().replace(/[^0-9]/g, '');
      let found: any = null;

      if (cleanStNisn && cleanStNisn !== '0' && cleanStNisn.length >= 6) {
        found = classStudents.find((sa) => {
          if (usedDbIds.has(sa.siswa_id)) return false;
          const cleanDbNisn = String(sa.siswa?.nisn || '').trim().replace(/[^0-9]/g, '');
          return cleanDbNisn && cleanDbNisn === cleanStNisn;
        });
      }

      if (found) {
        usedDbIds.add(found.siswa_id);
        st.siswa_id = found.siswa_id;
        st.nis = found.siswa?.nis || st.nis;
        st.nisn = found.siswa?.nisn || st.nisn;
        st.is_matched = true;
        st.matched_db_name = found.siswa?.nama_siswa;
      } else {
        st.is_matched = false;
        st.matched_db_name = null;
      }
    }

    // Pass 2: Prioritas 2 -> NIS resmi sekolah untuk yang belum cocok di Pass 1
    for (const st of sheetStudents) {
      if (st.is_matched && usedDbIds.has(st.siswa_id)) continue;

      const cleanStNis = String(st.nis || '').trim();
      let found: any = null;

      if (cleanStNis && cleanStNis !== '0') {
        found = classStudents.find((sa) => {
          if (usedDbIds.has(sa.siswa_id)) return false;
          const cleanDbNis = String(sa.siswa?.nis || '').trim();
          return cleanDbNis && cleanDbNis === cleanStNis;
        });
      }

      if (found) {
        usedDbIds.add(found.siswa_id);
        st.siswa_id = found.siswa_id;
        st.nis = found.siswa?.nis || st.nis;
        st.nisn = found.siswa?.nisn || st.nisn;
        st.is_matched = true;
        st.matched_db_name = found.siswa?.nama_siswa;
      }
    }

    // Pass 3: Prioritas 3 -> Nama Siswa (Normalisasi)
    for (const st of sheetStudents) {
      if (st.is_matched && usedDbIds.has(st.siswa_id)) continue;

      const stNormName = st.nama ? String(st.nama).toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
      let found: any = null;

      if (stNormName) {
        found = classStudents.find((sa) => {
          if (usedDbIds.has(sa.siswa_id)) return false;
          const dbNormName = sa.siswa?.nama_siswa ? String(sa.siswa.nama_siswa).toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
          return dbNormName === stNormName;
        });
      }

      if (found) {
        usedDbIds.add(found.siswa_id);
        st.siswa_id = found.siswa_id;
        st.nis = found.siswa?.nis || st.nis;
        st.nisn = found.siswa?.nisn || st.nisn;
        st.is_matched = true;
        st.matched_db_name = found.siswa?.nama_siswa;
      }
    }

    // Pass 4: Prioritas 4 -> Explicit Manual Mapping (siswa_id)
    for (const st of sheetStudents) {
      if (st.is_matched && usedDbIds.has(st.siswa_id)) continue;

      let found: any = null;
      if (st.siswa_id && !usedDbIds.has(st.siswa_id)) {
        found = classStudents.find((sa) => !usedDbIds.has(sa.siswa_id) && sa.siswa_id === st.siswa_id);
      }

      if (found) {
        usedDbIds.add(found.siswa_id);
        st.siswa_id = found.siswa_id;
        st.nis = found.siswa?.nis || st.nis;
        st.nisn = found.siswa?.nisn || st.nisn;
        st.is_matched = true;
        st.matched_db_name = found.siswa?.nama_siswa;
      }
    }

    return {
      matchedCount: usedDbIds.size,
      mappedSheetStudents: sheetStudents,
    };
  }

  /**
   * Helper pencocokan kelas cerdas (membedakan nomor rombel secara presisi)
   */
  static matchClassSmart(sheetName: string, namaKelas: string, tenantClasses: any[]): any {
    const rawTarget = `${sheetName} ${namaKelas}`.toUpperCase();

    // Pemetaan khusus rumpun Otomotif (TKR/TSM -> X TO 1..4)
    if (rawTarget.includes('TSM 1') || rawTarget.includes('TSM1')) {
      const found = tenantClasses.find((k) => k.nama_kelas.replace(/\s+/g, '') === 'XTO3' || k.nama_kelas === 'X TO 3');
      if (found) return found;
    }
    if (rawTarget.includes('TSM 2') || rawTarget.includes('TSM2')) {
      const found = tenantClasses.find((k) => k.nama_kelas.replace(/\s+/g, '') === 'XTO4' || k.nama_kelas === 'X TO 4');
      if (found) return found;
    }
    if (rawTarget.includes('TKR 1') || rawTarget.includes('TKR1')) {
      const found = tenantClasses.find((k) => k.nama_kelas.replace(/\s+/g, '') === 'XTO1' || k.nama_kelas === 'X TO 1');
      if (found) return found;
    }
    if (rawTarget.includes('TKR 2') || rawTarget.includes('TKR2')) {
      const found = tenantClasses.find((k) => k.nama_kelas.replace(/\s+/g, '') === 'XTO2' || k.nama_kelas === 'X TO 2');
      if (found) return found;
    }

    // Pemetaan khusus rumpun Kuliner (KULINER -> KUL)
    if (rawTarget.includes('KULINER 1') || rawTarget.includes('KULINER1')) {
      const found = tenantClasses.find((k) => k.nama_kelas.replace(/\s+/g, '') === 'XKUL1' || k.nama_kelas === 'X KUL 1');
      if (found) return found;
    }
    if (rawTarget.includes('KULINER 2') || rawTarget.includes('KULINER2')) {
      const found = tenantClasses.find((k) => k.nama_kelas.replace(/\s+/g, '') === 'XKUL2' || k.nama_kelas === 'X KUL 2');
      if (found) return found;
    }
    if (rawTarget.includes('KULINER')) {
      const found = tenantClasses.find((k) => k.nama_kelas.replace(/\s+/g, '') === 'XKUL' || k.nama_kelas === 'X KUL');
      if (found) return found;
    }

    // Pemetaan khusus rumpun Mesin (TP -> TM)
    if (rawTarget.includes('TP 1') || rawTarget.includes('TP1')) {
      const found = tenantClasses.find((k) => k.nama_kelas.replace(/\s+/g, '') === 'XTM1' || k.nama_kelas === 'X TM 1');
      if (found) return found;
    }
    if (rawTarget.includes('TP 2') || rawTarget.includes('TP2')) {
      const found = tenantClasses.find((k) => k.nama_kelas.replace(/\s+/g, '') === 'XTM2' || k.nama_kelas === 'X TM 2');
      if (found) return found;
    }
    if (rawTarget.includes('TP 3') || rawTarget.includes('TP3')) {
      const found = tenantClasses.find((k) => k.nama_kelas.replace(/\s+/g, '') === 'XTM3' || k.nama_kelas === 'X TM 3');
      if (found) return found;
    }

    // Pemetaan khusus rumpun IT (TKJ -> TJKT)
    if (rawTarget.includes('TKJ 1') || rawTarget.includes('TKJ1')) {
      const found = tenantClasses.find((k) => k.nama_kelas.replace(/\s+/g, '') === 'XTJKT1' || k.nama_kelas === 'X TJKT 1');
      if (found) return found;
    }
    if (rawTarget.includes('TKJ 2') || rawTarget.includes('TKJ2')) {
      const found = tenantClasses.find((k) => k.nama_kelas.replace(/\s+/g, '') === 'XTJKT2' || k.nama_kelas === 'X TJKT 2');
      if (found) return found;
    }
    if (rawTarget.includes('TKJ 3') || rawTarget.includes('TKJ3')) {
      const found = tenantClasses.find((k) => k.nama_kelas.replace(/\s+/g, '') === 'XTJKT3' || k.nama_kelas === 'X TJKT 3');
      if (found) return found;
    }

    // Ekstrak angka nomor rombel jika ada (misal: "2" dari "PHT 2" atau "TE 5")
    const matchNum = rawTarget.match(/(\d+)/);
    const targetNum = matchNum ? matchNum[1] : null;

    // 1. Exact match setelah normalisasi (misal "XPHT2" === "XPHT2" atau "PHT2" === "XPHT2")
    const normalizedTarget = rawTarget.replace(/[^A-Z0-9]/g, '');
    let matched = tenantClasses.find((k) => {
      const normK = k.nama_kelas.replace(/[^A-Z0-9]/g, '').toUpperCase();
      return (
        normK === normalizedTarget ||
        `X${normalizedTarget}` === normK ||
        normK.replace(/^X/, '') === normalizedTarget.replace(/^X/, '')
      );
    });

    // 2. Jika belum ketemu, cocokkan kode jurusan dan nomor rombel yang sama
    if (!matched && targetNum) {
      matched = tenantClasses.find((k) => {
        const normK = k.nama_kelas.replace(/[^A-Z0-9]/g, '').toUpperCase();
        const numK = k.nama_kelas.match(/(\d+)/)?.[1] || null;
        if (numK !== targetNum) return false;

        // Cek apakah kode jurusan cocok (misal PHT, TE, TM, AKL, TJKT)
        const jurusanPrefixes = ['PHT', 'TE', 'TM', 'AKL', 'TJKT', 'TKJ', 'RPL', 'TO', 'KUL'];
        for (const pref of jurusanPrefixes) {
          if (rawTarget.includes(pref) && normK.includes(pref)) return true;
        }
        return false;
      });
    }

    // 3. Fallback jika kelas tanpa nomor (misal "KULINER" -> "X KUL")
    if (!matched && !targetNum) {
      matched = tenantClasses.find((k) => {
        const normK = k.nama_kelas.replace(/[^A-Z0-9]/g, '').toUpperCase();
        if (rawTarget.includes('KULINER') && (normK.includes('KUL') || normK.includes('KULINER'))) {
          return normK === 'XKUL' || normK === 'KUL';
        }
        return false;
      });
    }

    return matched || null;
  }

  /**
   * Petakan ulang kelas master untuk lembar staging
   */
  static async remapClass(tenantId: string, sheetId: string, kelasId: string): Promise<any> {
    const sheetRecord = await (prisma as any).attendanceStagingSheet.findFirst({
      where: { id: sheetId, tenant_id: tenantId },
    });
    if (!sheetRecord) {
      throw new Error('Data lembar staging tidak ditemukan');
    }

    const kelas = await prisma.kelas.findFirst({
      where: { id: kelasId, tenant_id: tenantId },
      select: { id: true, nama_kelas: true, tingkat: true },
    });
    if (!kelas) {
      throw new Error('Kelas master tidak ditemukan di sistem');
    }

    // Hitung ulang kecocokan siswa dengan kelas yang baru dipilih berdasarkan konteks akademik (SiswaAkademik)
    const rawData = sheetRecord.raw_sheet_data;
    const students = rawData?.students || [];
    const tpId = sheetRecord.tahun_pelajaran_id;

    let matchedCount = 0;
    if (tpId) {
      const saStudents = await prisma.siswaAkademik.findMany({
        where: {
          kelas_id: kelas.id,
          tahun_pelajaran_id: tpId,
        },
        include: {
          siswa: {
            select: { id: true, nis: true, nisn: true, nama_siswa: true },
          },
        },
      });

      const bijectiveResult = this.matchStudentsBijective(students, saStudents);
      matchedCount = bijectiveResult.matchedCount;
    } else {
      const studentNisnList = students.map((s: any) => s.nisn).filter(Boolean);
      const studentNisList = students.map((s: any) => s.nis).filter(Boolean);
      const existingStudents = await prisma.siswa.findMany({
        where: {
          tenant_id: tenantId,
          kelas_id: kelas.id,
          OR: [
            { nisn: { in: studentNisnList } },
            { nis: { in: studentNisList } },
          ],
        },
        select: { id: true, nisn: true, nis: true },
      });
      matchedCount = existingStudents.length;
    }

    await (prisma as any).attendanceStagingSheet.update({
      where: { id: sheetId },
      data: {
        kelas_id: kelas.id,
        nama_kelas: kelas.nama_kelas,
        total_matched_siswa: matchedCount,
        raw_sheet_data: rawData,
      },
    });

    return {
      sheetId,
      kelasId: kelas.id,
      namaKelas: kelas.nama_kelas,
      totalSiswa: sheetRecord.total_siswa,
      totalMatchedSiswa: matchedCount,
    };
  }

  /**
   * Ambil rincian pemetaan siswa untuk 1 sheet staging
   */
  static async getStudentsMapping(tenantId: string, sheetId: string) {
    const sheetRecord = await (prisma as any).attendanceStagingSheet.findFirst({
      where: { id: sheetId, tenant_id: tenantId },
    });
    if (!sheetRecord) {
      throw new Error('Data lembar staging tidak ditemukan');
    }

    const rawData = sheetRecord.raw_sheet_data;
    const sheetStudents = rawData?.students || [];

    // Ambil daftar seluruh siswa di kelas master via SiswaAkademik
    let classStudents: any[] = [];
    let saStudents: any[] = [];
    if (sheetRecord.kelas_id && sheetRecord.tahun_pelajaran_id) {
      saStudents = await prisma.siswaAkademik.findMany({
        where: {
          kelas_id: sheetRecord.kelas_id,
          tahun_pelajaran_id: sheetRecord.tahun_pelajaran_id,
        },
        include: {
          siswa: {
            select: { id: true, nis: true, nisn: true, nama_siswa: true },
          },
        },
        orderBy: { siswa: { nama_siswa: 'asc' } },
      });
      classStudents = saStudents.map((item) => ({
        siswaId: item.siswa_id,
        siswaAkademikId: item.id,
        nis: item.siswa?.nis || '',
        nisn: item.siswa?.nisn || '',
        nama: item.siswa?.nama_siswa || '',
      }));
    }

    // Jalankan pencocokan presisi 1-to-1 Bijective
    const bijectiveResult = this.matchStudentsBijective(sheetStudents, saStudents);

    const mappedStudents = sheetStudents.map((st: any) => ({
      no: st.no,
      nama: st.nama,
      nis: st.nis || '',
      nisn: st.nisn || '',
      isMatched: Boolean(st.is_matched),
      matchedStudent: st.is_matched
        ? {
            siswaId: st.siswa_id,
            nama: st.matched_db_name || st.nama,
            nis: st.nis,
            nisn: st.nisn,
          }
        : null,
    }));

    return {
      sheetId: sheetRecord.id,
      sheetName: sheetRecord.sheet_name,
      namaKelas: sheetRecord.nama_kelas,
      totalSiswa: sheetRecord.total_siswa,
      totalMatchedSiswa: bijectiveResult.matchedCount,
      sheetStudents: mappedStudents,
      classStudents,
    };
  }

  /**
   * Simpan pemetaan siswa manual
   */
  static async mapStudents(
    tenantId: string,
    sheetId: string,
    mappings: Array<{ sheetNo: number; siswaId: string }>
  ) {
    const sheetRecord = await (prisma as any).attendanceStagingSheet.findFirst({
      where: { id: sheetId, tenant_id: tenantId },
    });
    if (!sheetRecord) {
      throw new Error('Data lembar staging tidak ditemukan');
    }

    const rawData = sheetRecord.raw_sheet_data;
    if (!rawData || !rawData.students) {
      throw new Error('Data mentah lembar tidak valid');
    }

    // Ambil master siswa yang dipetakan
    const studentIds = mappings.map((m) => m.siswaId).filter(Boolean);
    const masterStudents = await prisma.siswa.findMany({
      where: { tenant_id: tenantId, id: { in: studentIds } },
      select: { id: true, nis: true, nisn: true, nama_siswa: true },
    });
    const masterMap = new Map(masterStudents.map((s) => [s.id, s]));

    // Update siswa di rawData
    const mappingMap = new Map(mappings.map((m) => [m.sheetNo, m.siswaId]));
    for (const st of rawData.students) {
      if (mappingMap.has(st.no)) {
        const targetSiswaId = mappingMap.get(st.no);
        if (targetSiswaId) {
          const master = masterMap.get(targetSiswaId);
          st.siswa_id = targetSiswaId;
          if (master) {
            st.nis = master.nis || st.nis;
            st.nisn = master.nisn || st.nisn;
            st.is_matched = true;
            st.matched_db_name = master.nama_siswa;
          }
        }
      }
    }

    // Hitung ulang total kecocokan menggunakan Bijective 1-to-1
    let matchedCount = 0;
    const tpId = sheetRecord.tahun_pelajaran_id;
    if (tpId && sheetRecord.kelas_id) {
      const saStudents = await prisma.siswaAkademik.findMany({
        where: { kelas_id: sheetRecord.kelas_id, tahun_pelajaran_id: tpId },
        include: { siswa: { select: { id: true, nis: true, nisn: true, nama_siswa: true } } },
      });
      const result = this.matchStudentsBijective(rawData.students, saStudents);
      matchedCount = result.matchedCount;
    }

    await (prisma as any).attendanceStagingSheet.update({
      where: { id: sheetId },
      data: {
        total_matched_siswa: matchedCount,
        raw_sheet_data: rawData,
      },
    });

    return {
      success: true,
      sheetId,
      totalMatchedSiswa: matchedCount,
      totalSiswa: sheetRecord.total_siswa,
    };
  }

  /**
   * Petakan ulang kelas master massal
   */
  static async bulkRemapClasses(
    tenantId: string,
    mappings: Array<{ id: string; kelasId: string }>
  ): Promise<any[]> {
    const results: any[] = [];
    for (const m of mappings) {
      if (!m.id || !m.kelasId) continue;
      const res = await this.remapClass(tenantId, m.id, m.kelasId);
      results.push(res);
    }
    return results;
  }

  /**
   * Ambil opsi daftar kelas aktif di tenant untuk dropdown pemetaan lengkap dengan nama kejuruan
   */
  static async getClassOptions(tenantId: string) {
    const classes = await prisma.kelas.findMany({
      where: { tenant_id: tenantId, is_active: true },
      select: {
        id: true,
        nama_kelas: true,
        tingkat: true,
        Jurusan: {
          select: {
            nama: true,
            singkatan: true,
            kode: true,
          },
        },
      },
      orderBy: [{ tingkat: 'asc' }, { nama_kelas: 'asc' }],
    });

    return classes.map((c) => ({
      id: c.id,
      nama_kelas: c.nama_kelas,
      tingkat: c.tingkat,
      jurusan_nama: c.Jurusan?.nama || c.Jurusan?.singkatan || c.Jurusan?.kode || '',
    }));
  }

  /**
   * Sinkronisasi massal seluruh lembar
   */
  static async bulkSyncSheets(tenantId: string, ids: string[], userId: string) {
    const results: any[] = [];
    const errors: any[] = [];

    for (const id of ids) {
      try {
        const res = await this.syncSheet(tenantId, id, userId);
        results.push(res);
      } catch (err: any) {
        errors.push({ id, error: err.message });
      }
    }

    return {
      totalRequested: ids.length,
      syncedCount: results.length,
      failedCount: errors.length,
      results,
      errors,
    };
  }

  /**
   * Ambil daftar siswa aktif dalam suatu kelas untuk pemilihan siswa non-hadir di form manual backfill
   */
  static async getClassStudents(tenantId: string, kelasId: string) {
    const activeTp = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true },
      select: { id: true },
    });

    let students: any[] = [];
    if (activeTp?.id) {
      const sa = await prisma.siswaAkademik.findMany({
        where: {
          kelas_id: kelasId,
          tahun_pelajaran_id: activeTp.id,
        },
        include: {
          siswa: {
            select: { id: true, nis: true, nisn: true, nama_siswa: true, status: true },
          },
        },
        orderBy: { siswa: { nama_siswa: 'asc' } },
      });
      students = sa.map((s) => ({
        siswa_id: s.siswa_id,
        siswa_akademik_id: s.id,
        nis: s.siswa?.nis || '',
        nisn: s.siswa?.nisn || '',
        nama_siswa: s.siswa?.nama_siswa || '',
        status: s.siswa?.status || 'AKTIF',
      }));
    }

    if (students.length === 0) {
      const sis = await prisma.siswa.findMany({
        where: {
          tenant_id: tenantId,
          kelas_id: kelasId,
          status: 'AKTIF',
        },
        select: { id: true, nis: true, nisn: true, nama_siswa: true, status: true },
        orderBy: { nama_siswa: 'asc' },
      });
      students = sis.map((s) => ({
        siswa_id: s.id,
        siswa_akademik_id: s.id,
        nis: s.nis || '',
        nisn: s.nisn || '',
        nama_siswa: s.nama_siswa || '',
        status: s.status,
      }));
    }

    return students;
  }

  /**
   * Buat lembar staging dari input Backfill Manual UI (Multi-Tanggal & Exception-Based Entry)
   * Siswa yang TIDAK dimasukkan ke daftar pengecualian otomatis dicatat HADIR.
   */
  static async createManualBackfill(
    tenantId: string,
    userId: string,
    payload: {
      file_title?: string;
      dates: string[];
      kelas_ids: string[];
      jenis_kegiatan_mode: 'AUTO_SIKLUS' | 'KETARUNAAN' | 'UPACARA' | 'DUHA' | 'APEL_SORE' | 'ALL_SIKLUS';
      exceptions?: Array<{
        siswa_id: string;
        status: 'SAKIT' | 'IZIN' | 'ALPA' | 'DISPENSASI' | 'TERLAMBAT';
        dates?: string[];
        catatan?: string;
        menit_keterlambatan?: number;
      }>;
      direct_sync?: boolean;
    }
  ) {
    if (!payload.dates || payload.dates.length === 0) {
      throw new Error('Minimal pilih 1 tanggal pelaksanaan presensi');
    }
    if (!payload.kelas_ids || payload.kelas_ids.length === 0) {
      throw new Error('Minimal pilih 1 rombel kelas');
    }

    const activeTp = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true },
      select: { id: true, tahun: true },
    });
    const activeSem = await prisma.semester.findFirst({
      where: { tenant_id: tenantId, is_active: true },
      select: { id: true, nama_semester: true },
    });

    const sortedDates = [...new Set(payload.dates)].sort();
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    // Bangun daftar sesi per tanggal
    const sessions: Array<{
      colIndex: number;
      dateStr: string;
      dateIso: string;
      day: string;
      sessionCode: string;
      defaultType: 'UPACARA' | 'KETARUNAAN' | 'DUHA' | 'APEL_SORE';
    }> = [];

    let colIdx = 0;
    for (const dStr of sortedDates) {
      const d = new Date(`${dStr}T00:00:00Z`);
      const dayNum = d.getUTCDay();
      const dayName = dayNames[dayNum];

      const dateSessions: Array<{ sessionCode: string; defaultType: 'UPACARA' | 'KETARUNAAN' | 'DUHA' | 'APEL_SORE' }> = [];

      if (payload.jenis_kegiatan_mode === 'AUTO_SIKLUS') {
        // Pagi
        if (dayNum === 1) {
          dateSessions.push({ sessionCode: 'PAGI', defaultType: 'UPACARA' });
        } else if (dayNum === 5) {
          dateSessions.push({ sessionCode: 'PAGI', defaultType: 'DUHA' });
        } else if (dayNum >= 2 && dayNum <= 6) {
          dateSessions.push({ sessionCode: 'PAGI', defaultType: 'KETARUNAAN' });
        }
        // Sore
        if (dayNum >= 1 && dayNum <= 6) {
          dateSessions.push({ sessionCode: 'SORE', defaultType: 'APEL_SORE' });
        }
      } else if (payload.jenis_kegiatan_mode === 'ALL_SIKLUS') {
        if (dayNum === 1) dateSessions.push({ sessionCode: 'PAGI', defaultType: 'UPACARA' });
        else if (dayNum === 5) dateSessions.push({ sessionCode: 'PAGI', defaultType: 'DUHA' });
        else dateSessions.push({ sessionCode: 'PAGI', defaultType: 'KETARUNAAN' });
        dateSessions.push({ sessionCode: 'SORE', defaultType: 'APEL_SORE' });
      } else if (payload.jenis_kegiatan_mode === 'KETARUNAAN') {
        dateSessions.push({ sessionCode: 'PAGI', defaultType: 'KETARUNAAN' });
      } else if (payload.jenis_kegiatan_mode === 'UPACARA') {
        dateSessions.push({ sessionCode: 'PAGI', defaultType: 'UPACARA' });
      } else if (payload.jenis_kegiatan_mode === 'DUHA') {
        dateSessions.push({ sessionCode: 'PAGI', defaultType: 'DUHA' });
      } else if (payload.jenis_kegiatan_mode === 'APEL_SORE') {
        dateSessions.push({ sessionCode: 'SORE', defaultType: 'APEL_SORE' });
      }

      if (dateSessions.length === 0) {
        dateSessions.push({ sessionCode: 'PAGI', defaultType: 'KETARUNAAN' });
      }

      for (const ds of dateSessions) {
        sessions.push({
          colIndex: colIdx++,
          dateStr: dStr,
          dateIso: dStr,
          day: dayName,
          sessionCode: ds.sessionCode,
          defaultType: ds.defaultType,
        });
      }
    }

    const createdSheets: any[] = [];
    const syncResults: any[] = [];

    const rentangTanggal = sortedDates.length === 1
      ? sortedDates[0]
      : `${sortedDates[0]} s/d ${sortedDates[sortedDates.length - 1]}`;

    for (const kelasId of payload.kelas_ids) {
      const kelas = await prisma.kelas.findFirst({
        where: { id: kelasId, tenant_id: tenantId },
        include: { Jurusan: true },
      });
      if (!kelas) continue;

      const students = await this.getClassStudents(tenantId, kelasId);
      if (students.length === 0) continue;

      const sheetStudents = students.map((s, idx) => {
        const attendance: Record<string, string> = {};

        for (const sess of sessions) {
          const sessKey = `${sess.dateIso}_${sess.sessionCode}`;

          // Cek apakah siswa ada di daftar pengecualian (non-hadir)
          // Mendukung pencocokan spesifik sesi (`YYYY-MM-DD_PAGI` / `YYYY-MM-DD_SORE`) maupun tanggal penuh (`YYYY-MM-DD`)
          const matchedEx = (payload.exceptions || []).find((ex) => {
            if (ex.siswa_id !== s.siswa_id) return false;
            if (!ex.dates || ex.dates.length === 0) return true;
            return ex.dates.includes(sessKey) || ex.dates.includes(sess.dateIso);
          });

          if (matchedEx) {
            attendance[sessKey] = matchedEx.status;
          } else {
            // SISWA YANG TIDAK DISEBUT MAKA MENJADI HADIR!
            attendance[sessKey] = 'HADIR';
          }
        }

        return {
          no: idx + 1,
          nis: s.nis,
          nisn: s.nisn,
          nama: s.nama_siswa,
          siswa_id: s.siswa_id,
          is_matched: true,
          matched_db_name: s.nama_siswa,
          attendance,
        };
      });

      const raw_sheet_data = {
        sheetName: kelas.nama_kelas,
        namaKelas: kelas.nama_kelas,
        programKeahlian: kelas.Jurusan?.nama || '',
        tahunPelajaran: activeTp?.tahun || '2026/2027',
        rentangTanggal,
        sessionCount: sessions.length,
        sessions,
        studentCount: sheetStudents.length,
        students: sheetStudents,
      };

      const customTitle = payload.file_title
        ? `${payload.file_title} - ${kelas.nama_kelas}`
        : `Backfill Manual UI - ${kelas.nama_kelas} (${rentangTanggal})`;

      const stagingSheet = await (prisma as any).attendanceStagingSheet.create({
        data: {
          tenant_id: tenantId,
          source_url: 'UI_MANUAL_BACKFILL',
          file_title: customTitle,
          tahun_pelajaran_id: activeTp?.id || null,
          tahun_pelajaran_nama: activeTp?.tahun || '2026/2027',
          semester_id: activeSem?.id || null,
          kelas_id: kelas.id,
          nama_kelas: kelas.nama_kelas,
          sheet_name: kelas.nama_kelas,
          rentang_tanggal: rentangTanggal,
          total_siswa: sheetStudents.length,
          total_matched_siswa: sheetStudents.length,
          raw_sheet_data,
          status: 'READY',
        },
      });

      createdSheets.push(stagingSheet);

      if (payload.direct_sync) {
        try {
          const syncRes = await this.syncSheet(tenantId, stagingSheet.id, userId);
          syncResults.push(syncRes);
        } catch (syncErr: any) {
          appLogger.error({ err: syncErr.message, sheetId: stagingSheet.id }, 'Gagal auto-sync lembar backfill manual');
        }
      }
    }

    return {
      totalSheetsCreated: createdSheets.length,
      totalSessionsPerSheet: sessions.length,
      totalDates: sortedDates.length,
      isDirectSynced: Boolean(payload.direct_sync),
      sheets: createdSheets,
      syncResults,
    };
  }
}

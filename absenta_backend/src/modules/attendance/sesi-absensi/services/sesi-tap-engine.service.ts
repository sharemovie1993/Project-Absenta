import { prisma } from '../../../../utils/prisma';
import { AttendanceRuleEngine } from '../../../../domain/attendance/AttendanceRuleEngine';
import { getTenantTimezone, getTenantOffsetString, getTimezoneLabel } from '../../../../utils/timezone.utils';

export class SesiTapEngineService {
  private static instance: SesiTapEngineService;

  public static getInstance(): SesiTapEngineService {
    if (!SesiTapEngineService.instance) {
      SesiTapEngineService.instance = new SesiTapEngineService();
    }
    return SesiTapEngineService.instance;
  }

  async propagateGateAbsenceToSessions(tenantId: string, siswaId: string, status: string, tanggal: Date | string) {
    const tz = await getTenantTimezone(tenantId);
    const tzOffset = getTenantOffsetString(tz);
    const targetDateStr = typeof tanggal === 'string' 
      ? (tanggal.includes('T') ? tanggal.split('T')[0] : tanggal)
      : new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(tanggal);
    
    const startOfDay = new Date(`${targetDateStr}T00:00:00.000${tzOffset}`);
    const endOfDay = new Date(`${targetDateStr}T23:59:59.999${tzOffset}`);

    const activeSessions = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        tanggal: { gte: startOfDay, lte: endOfDay },
        Kelas: {
          SiswaAkademik: { some: { siswa_id: siswaId } }
        }
      },
      select: { id: true, kelas_id: true }
    });

    for (const sesi of activeSessions) {
      await this.tapSiswa(tenantId, null, sesi.id, {
        siswa_id: siswaId,
        status,
        catatan: `Propagated from Gate Absensi (${status})`,
        waktu_tap: startOfDay
      }, 'GATE_PROPAGATION');
    }

    return { success: true, count: activeSessions.length };
  }

  async tapSiswa(tenantId: string, _org: any, sesi_id: string, data: any, _userId: string) {
    const { siswa_id, siswa_akademik_id, status = 'HADIR', catatan, waktu_tap, nisn, rfid } = data;

    let sesi = await prisma.sesiAbsensi.findFirst({
      where: { id: sesi_id, tenant_id: tenantId }
    });

    if (!sesi && typeof sesi_id === 'string' && (sesi_id.startsWith('sched_') || sesi_id.startsWith('sched-') || !sesi_id.includes('-'))) {
      const cleanJadwalId = String(sesi_id).replace(/^(sched-hist-|sched_|sched-)/, '');
      const jadwal = await prisma.jadwalKBM.findFirst({
        where: { id: cleanJadwalId, tenant_id: tenantId },
        include: { Kelas: true, Mapel: true, Guru: true }
      });

      if (jadwal) {
        const tz = await getTenantTimezone(tenantId);
        const tzOffset = getTenantOffsetString(tz);
        const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
        const startOfDay = new Date(`${todayDateStr}T00:00:00.000${tzOffset}`);
        const endOfDay = new Date(`${todayDateStr}T23:59:59.999${tzOffset}`);
        const today = new Date(`${todayDateStr}T00:00:00.000${tzOffset}`);

        const existingForJadwal = await prisma.sesiAbsensi.findFirst({
          where: {
            tenant_id: tenantId,
            jadwal_kbm_id: jadwal.id,
            tanggal: { gte: startOfDay, lte: endOfDay }
          }
        });

        if (existingForJadwal) {
          sesi = existingForJadwal;
        } else {
          // Check if teacher has an active approved leave
          const activeLeave: any = jadwal.guru_id ? await prisma.permohonanIzinGuru.findFirst({
            where: {
              tenant_id: tenantId,
              guru_id: jadwal.guru_id,
              tanggal_mulai: { lte: today },
              tanggal_selesai: { gte: today },
              status: { in: ['DISETUJUI', 'PENDING'] }
            },
            include: { GuruInval: true }
          }) : null;

          const initialGuruStatus = activeLeave 
            ? (activeLeave.status === 'DISETUJUI' ? (activeLeave.GuruInval ? 'PENUGASAN' : (activeLeave.tipe_izin === 'DINAS_LUAR' ? 'DINAS_LUAR' : (activeLeave.tipe_izin === 'SAKIT' ? 'SAKIT' : 'IZIN'))) : 'PENDING_IZIN')
            : 'MENDATANG';

          sesi = await prisma.sesiAbsensi.create({
            data: {
              tenant_id: tenantId,
              jadwal_kbm_id: jadwal.id,
              kelas_id: jadwal.kelas_id,
              mapel_id: jadwal.mapel_id,
              guru_id: activeLeave?.guru_inval_id || jadwal.guru_id || 'default-guru',
              tahun_pelajaran_id: jadwal.tahun_pelajaran_id || 'default-tp',
              semester_id: jadwal.semester_id || 'default-sem',
              jenis_kegiatan: 'KBM',
              sumber_sesi: 'TEMPLATE',
              tanggal: today,
              waktu_mulai: jadwal.jam_mulai ? new Date(`${todayDateStr}T${jadwal.jam_mulai}:00.000${tzOffset}`) : today,
              waktu_selesai: jadwal.jam_selesai ? new Date(`${todayDateStr}T${jadwal.jam_selesai}:00.000${tzOffset}`) : null,
              status: 'BERLANGSUNG',
              created_by_user_id: _userId || null
            }
          });

          // Create AbsenGuru record for leave if applicable
          if (activeLeave && jadwal.guru_id) {
            await prisma.absenGuru.create({
              data: {
                tenant_id: tenantId,
                sesi_id: sesi.id,
                guru_id: jadwal.guru_id,
                status: initialGuruStatus === 'DINAS_LUAR' || initialGuruStatus === 'PENUGASAN' ? 'PENUGASAN' : (initialGuruStatus === 'SAKIT' ? 'SAKIT' : (initialGuruStatus === 'IZIN' ? 'IZIN' : 'PENUGASAN')),
                catatan: `Izin Disetujui: ${activeLeave.alasan}`,
                tahun_pelajaran_id: sesi.tahun_pelajaran_id || jadwal.tahun_pelajaran_id || 'default-tp',
                semester_id: sesi.semester_id || jadwal.semester_id || 'default-sem'
              }
            });
          }
        }
      }
    }

    if (!sesi) throw new Error('Sesi tidak ditemukan');
    if (sesi.status === 'SELESAI') {
      throw new Error('Sesi KBM telah selesai. Presensi sudah ditutup.');
    }

    const tapTime = waktu_tap ? new Date(waktu_tap) : new Date();

    // 🛡️ Time-Window Validation:
    // Cegah siswa mengabsenkan sesi jam siang/sore di pagi hari sekaligus.
    // Presensi HADIR mandiri hanya diizinkan mulai dari 15 menit sebelum waktu_mulai sesi.
    // Bypass: Operasi sistem (GATE_PROPAGATION, AUTO_PULL), Guru/Petugas manual, atau status non-HADIR (IZIN, SAKIT, DISPEN).
    const isSystemOrManualOp = ['GATE_PROPAGATION', 'SYSTEM_AUTO_PULL', 'RECONCILIATION'].includes(_userId) || Boolean(siswa_akademik_id) || status !== 'HADIR';
    if (!isSystemOrManualOp && status === 'HADIR' && sesi.waktu_mulai) {
      const tz = await getTenantTimezone(tenantId);
      const tzLabel = getTimezoneLabel(tz);
      const EARLY_TOLERANCE_MS = 15 * 60 * 1000; // 15 menit sebelum jam mulai
      const earliestAllowed = new Date(sesi.waktu_mulai.getTime() - EARLY_TOLERANCE_MS);
      if (tapTime < earliestAllowed) {
        const fmt = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: tz });
        const openTimeStr = fmt(earliestAllowed);
        const startTimeStr = fmt(sesi.waktu_mulai);
        throw new Error(`Sesi KBM belum dibuka. Presensi sesi ini (jam ${startTimeStr}) baru dapat dilakukan mulai pukul ${openTimeStr} ${tzLabel} (15 menit sebelum jam mulai).`);
      }
    }

    let siswaAkademik: any = null;

    // 1. Direct match by explicit siswa_akademik_id (Manual list Guru / Petugas)
    if (siswa_akademik_id) {
      siswaAkademik = await prisma.siswaAkademik.findFirst({
        where: { id: siswa_akademik_id },
        select: { id: true, siswa_id: true }
      });
    }

    // 2. Resolve via siswa_id (could be SiswaAkademik.id, Siswa.id, or NIS/NISN/RFID token)
    if (!siswaAkademik && siswa_id) {
      // 2a. Check if passed siswa_id is directly a SiswaAkademik ID
      siswaAkademik = await prisma.siswaAkademik.findFirst({
        where: { id: siswa_id },
        select: { id: true, siswa_id: true }
      });

      // 2b. Check if passed siswa_id is Siswa.id in this class
      if (!siswaAkademik) {
        siswaAkademik = await prisma.siswaAkademik.findFirst({
          where: { siswa_id: siswa_id, kelas_id: sesi.kelas_id },
          select: { id: true, siswa_id: true }
        });
      }

      // 2c. Check if passed siswa_id is Siswa.id in any class
      if (!siswaAkademik) {
        siswaAkademik = await prisma.siswaAkademik.findFirst({
          where: { siswa_id: siswa_id },
          select: { id: true, siswa_id: true }
        });
      }

      // 2d. Check if passed siswa_id is NIS, NISN, or RFID barcode token
      if (!siswaAkademik) {
        const foundSiswa = await prisma.siswa.findFirst({
          where: {
            tenant_id: tenantId,
            OR: [
              { nis: siswa_id },
              { nisn: siswa_id },
              { no_rfid: siswa_id }
            ]
          },
          select: { id: true }
        });
        if (foundSiswa) {
          siswaAkademik = await prisma.siswaAkademik.findFirst({
            where: { siswa_id: foundSiswa.id, kelas_id: sesi.kelas_id },
            select: { id: true, siswa_id: true }
          }) || await prisma.siswaAkademik.findFirst({
            where: { siswa_id: foundSiswa.id },
            select: { id: true, siswa_id: true }
          });
        }
      }
    }

    // 3. Resolve via explicit nisn or rfid fields
    if (!siswaAkademik && (nisn || rfid)) {
      const foundSiswa = await prisma.siswa.findFirst({
        where: {
          tenant_id: tenantId,
          OR: [
            ...(nisn ? [{ nisn }, { nis: nisn }] : []),
            ...(rfid ? [{ no_rfid: rfid }] : [])
          ]
        },
        select: { id: true }
      });
      if (foundSiswa) {
        siswaAkademik = await prisma.siswaAkademik.findFirst({
          where: { siswa_id: foundSiswa.id, kelas_id: sesi.kelas_id },
          select: { id: true, siswa_id: true }
        }) || await prisma.siswaAkademik.findFirst({
          where: { siswa_id: foundSiswa.id },
          select: { id: true, siswa_id: true }
        });
      }
    }

    if (!siswaAkademik) {
      throw new Error('Siswa tidak ditemukan');
    }

    let isTerlambat = false;
    if (sesi.waktu_mulai && tapTime > sesi.waktu_mulai) {
      isTerlambat = true;
    }

    const poin = AttendanceRuleEngine.calculateAttendancePoints(status, isTerlambat);

    const existing = await prisma.absenSiswa.findFirst({
      where: {
        tenant_id: tenantId,
        sesi_id,
        siswa_akademik_id: siswaAkademik.id
      }
    });

    let result;
    if (existing) {
      result = await prisma.absenSiswa.update({
        where: {
          sesi_id_siswa_akademik_id: {
            sesi_id,
            siswa_akademik_id: siswaAkademik.id
          }
        },
        data: {
          status,
          is_terlambat: isTerlambat,
          poin_kehadiran: poin,
          waktu_tap: tapTime,
          catatan: catatan !== undefined ? catatan : existing.catatan,
          updated_at: new Date()
        }
      });
    } else {
      result = await prisma.absenSiswa.create({
        data: {
          tenant_id: tenantId,
          sesi_id,
          siswa_id: siswaAkademik.siswa_id || null,
          siswa_akademik_id: siswaAkademik.id,
          status,
          is_terlambat: isTerlambat,
          poin_kehadiran: poin,
          waktu_tap: tapTime,
          catatan: catatan || null
        }
      });
    }

    return result;
  }

  async updateAbsenGuru(tenantId: string, _org: any, sesiId: string, guruId: string, data: any) {
    const { status = 'HADIR', catatan, waktu_tap } = data;

    let sesi = await prisma.sesiAbsensi.findFirst({
      where: { id: sesiId, tenant_id: tenantId }
    });

    const tz = await getTenantTimezone(tenantId);
    const tzOffset = getTenantOffsetString(tz);
    const tzLabel = getTimezoneLabel(tz);

    // 🛡️ Auto-Materialization: If session is virtual (sched_...) or not in DB yet, auto-create physical SesiAbsensi for today
    if (!sesi) {
      const cleanJadwalId = String(sesiId).replace(/^(sched-hist-|sched_|sched-)/, '');
      const jadwal = await prisma.jadwalKBM.findFirst({
        where: { id: cleanJadwalId, tenant_id: tenantId },
        include: {
          Kelas: true,
          Mapel: true,
          Guru: true
        }
      });

      if (jadwal) {
        const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
        const startOfDay = new Date(`${todayDateStr}T00:00:00.000${tzOffset}`);
        const endOfDay = new Date(`${todayDateStr}T23:59:59.999${tzOffset}`);
        const today = new Date(`${todayDateStr}T00:00:00.000${tzOffset}`);

        // Check if another session for this jadwal was already created today
        const existingForJadwal = await prisma.sesiAbsensi.findFirst({
          where: {
            tenant_id: tenantId,
            jadwal_kbm_id: jadwal.id,
            tanggal: { gte: startOfDay, lte: endOfDay }
          }
        });

        if (existingForJadwal) {
          sesi = existingForJadwal;
        } else {
          // Materialize physical session
          sesi = await prisma.sesiAbsensi.create({
            data: {
              tenant_id: tenantId,
              jadwal_kbm_id: jadwal.id,
              kelas_id: jadwal.kelas_id,
              mapel_id: jadwal.mapel_id,
              guru_id: guruId || jadwal.guru_id,
              tahun_pelajaran_id: jadwal.tahun_pelajaran_id || 'default-tp',
              semester_id: jadwal.semester_id || 'default-sem',
              jenis_kegiatan: 'KBM',
              sumber_sesi: 'TEMPLATE',
              tanggal: today,
              waktu_mulai: jadwal.jam_mulai ? new Date(`${todayDateStr}T${jadwal.jam_mulai}:00.000${tzOffset}`) : today,
              waktu_selesai: jadwal.jam_selesai ? new Date(`${todayDateStr}T${jadwal.jam_selesai}:00.000${tzOffset}`) : null,
              status: 'MENDATANG',
              created_by_user_id: null
            }
          });
        }
      }
    }

    if (!sesi) throw new Error('Sesi tidak ditemukan');
    if (sesi.status === 'SELESAI') {
      throw new Error('Sesi KBM telah selesai. Presensi guru sudah ditutup.');
    }

    const tapTime = waktu_tap ? new Date(waktu_tap) : (status === 'HADIR' ? new Date() : null);

    // 🛡️ Time-Window Validation for Guru Attendance:
    // Cegah guru mengabsenkan diri untuk sesi jam siang/sore dari pagi hari secara remote.
    // Check-in HADIR hanya diizinkan mulai dari 15 menit sebelum waktu_mulai sesi.
    if (status === 'HADIR' && sesi.waktu_mulai) {
      const EARLY_TOLERANCE_MS = 15 * 60 * 1000; // 15 menit sebelum jam mulai
      const earliestAllowed = new Date(sesi.waktu_mulai.getTime() - EARLY_TOLERANCE_MS);
      if (tapTime && tapTime < earliestAllowed) {
        const fmt = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: tz });
        const openTimeStr = fmt(earliestAllowed);
        const startTimeStr = fmt(sesi.waktu_mulai);
        throw new Error(`Sesi KBM belum dibuka. Presensi kehadiran guru untuk sesi ini (jam ${startTimeStr}) baru dapat dilakukan mulai pukul ${openTimeStr} ${tzLabel} (15 menit sebelum jam mulai).`);
      }
    }

    let isTerlambat = false;
    let menitKeterlambatan = 0;
    if (status === 'HADIR' && sesi.waktu_mulai && tapTime && tapTime > sesi.waktu_mulai) {
      isTerlambat = true;
      menitKeterlambatan = Math.max(0, Math.floor((tapTime.getTime() - sesi.waktu_mulai.getTime()) / (60 * 1000)));
    }

    const effectiveGuruId = guruId || sesi.guru_id;
    if (!effectiveGuruId) throw new Error('Guru ID tidak ditemukan untuk sesi ini');

    const existing = await prisma.absenGuru.findFirst({
      where: {
        tenant_id: tenantId,
        sesi_id: sesi.id,
        guru_id: effectiveGuruId
      }
    });

    let result;
    if (existing) {
      result = await prisma.absenGuru.update({
        where: { id: existing.id },
        data: {
          status,
          waktu_tap: tapTime,
          is_terlambat: isTerlambat,
          menit_keterlambatan: menitKeterlambatan,
          catatan: catatan !== undefined ? catatan : existing.catatan,
          updated_at: new Date()
        }
      });
    } else {
      result = await prisma.absenGuru.create({
        data: {
          tenant_id: tenantId,
          sesi_id: sesi.id,
          guru_id: effectiveGuruId,
          tahun_pelajaran_id: sesi.tahun_pelajaran_id,
          semester_id: sesi.semester_id,
          status,
          waktu_tap: tapTime,
          is_terlambat: isTerlambat,
          menit_keterlambatan: menitKeterlambatan,
          catatan: catatan || null
        }
      });
    }

    if (status === 'HADIR') {
      const updateData: any = {};
      if (sesi.status === 'MENDATANG') {
        updateData.status = 'BERLANGSUNG';
      }
      if (data.foto || data.foto_kegiatan) {
        updateData.foto_kegiatan = data.foto || data.foto_kegiatan;
      }
      if (Object.keys(updateData).length > 0) {
        await prisma.sesiAbsensi.update({
          where: { id: sesi.id },
          data: updateData
        });
      }
    }

    return result;
  }

  async listAbsenSiswa(tenantId: string, _org: any, sesi_id: string, _userId: string) {
    let sesi = await prisma.sesiAbsensi.findFirst({
      where: { id: sesi_id, tenant_id: tenantId },
      select: {
        id: true,
        kelas_id: true,
        guru_id: true,
        tahun_pelajaran_id: true,
        semester_id: true,
        status: true,
        created_at: true,
        Guru: { select: { nama_guru: true } },
        AbsenGuru: {
          take: 1,
          select: { id: true, guru_id: true, status: true, waktu_tap: true, catatan: true, is_terlambat: true, menit_keterlambatan: true }
        }
      }
    });

    // Fallback: If physical session does not exist in DB yet, resolve from JadwalKBM (virtual schedule slot)
    if (!sesi) {
      const cleanId = sesi_id.replace(/^(sched-hist-|sched_|sched-)/, '');
      const jadwal = await prisma.jadwalKBM.findFirst({
        where: { id: cleanId, tenant_id: tenantId },
        select: { 
          id: true, 
          kelas_id: true, 
          guru_id: true, 
          tahun_pelajaran_id: true, 
          semester_id: true, 
          Guru: { select: { nama_guru: true } } 
        }
      });

      if (jadwal) {
        sesi = {
          id: sesi_id,
          kelas_id: jadwal.kelas_id,
          guru_id: jadwal.guru_id,
          tahun_pelajaran_id: jadwal.tahun_pelajaran_id,
          semester_id: jadwal.semester_id,
          status: 'MENDATANG',
          created_at: new Date(),
          Guru: jadwal.Guru,
          AbsenGuru: []
        } as any;
      }
    }

    if (!sesi) throw new Error('Sesi tidak ditemukan');

    // 1. Fetch Students from SiswaAkademik with Active Filter
    const saWhere: any = {
      kelas_id: sesi.kelas_id,
      status: 'AKTIF',
      siswa: { status: 'AKTIF' }
    };
    if (sesi.tahun_pelajaran_id && sesi.tahun_pelajaran_id !== 'default-tp') {
      saWhere.tahun_pelajaran_id = sesi.tahun_pelajaran_id;
    }

    let rawSiswaAkademikList = await prisma.siswaAkademik.findMany({
      where: saWhere,
      select: {
        id: true,
        siswa_id: true,
        siswa: { select: { id: true, nama_siswa: true, nisn: true, no_rfid: true } }
      }
    });

    if (rawSiswaAkademikList.length === 0) {
      rawSiswaAkademikList = await prisma.siswaAkademik.findMany({
        where: { kelas_id: sesi.kelas_id, status: 'AKTIF' },
        select: {
          id: true,
          siswa_id: true,
          siswa: { select: { id: true, nama_siswa: true, nisn: true, no_rfid: true } }
        }
      });
    }

    // Sort alphabetically by student name (Indonesian Academic Standard)
    const siswaAkademikList = rawSiswaAkademikList.sort((a, b) => {
      const nameA = a.siswa?.nama_siswa || '';
      const nameB = b.siswa?.nama_siswa || '';
      return nameA.localeCompare(nameB, 'id', { sensitivity: 'base' });
    });

    // 1b. Fallback: If SiswaAkademik list is empty, fetch directly from Siswa table (Hanya yang Aktif)
    let directStudents: any[] = [];
    if (siswaAkademikList.length === 0 && sesi.kelas_id) {
      directStudents = await prisma.siswa.findMany({
        where: { kelas_id: sesi.kelas_id, tenant_id: tenantId, status: 'AKTIF' },
        select: { id: true, nama_siswa: true, nisn: true, nis: true }
      });
    }

    const absenSiswaList = await prisma.absenSiswa.findMany({
      where: { tenant_id: tenantId, sesi_id },
      select: {
        id: true,
        siswa_akademik_id: true,
        status: true,
        is_terlambat: true,
        menit_keterlambatan: true,
        poin_kehadiran: true,
        waktu_tap: true,
        catatan: true,
        SiswaAkademik: { select: { siswa_id: true } }
      }
    });

    const absenMap = new Map<string, any>();
    absenSiswaList.forEach(a => {
      if (a.siswa_akademik_id) absenMap.set(a.siswa_akademik_id, a);
      if (a.SiswaAkademik?.siswa_id) absenMap.set(a.SiswaAkademik.siswa_id, a);
    });

    let mergedStudents: any[] = [];

    if (siswaAkademikList.length > 0) {
      mergedStudents = siswaAkademikList.map(sa => {
        const a = absenMap.get(sa.id) || absenMap.get(sa.siswa_id);
        return {
          id: a?.id || `temp-${sa.id}`,
          siswa_akademik_id: sa.id,
          siswa_id: sa.siswa_id,
          nama_siswa: sa.siswa?.nama_siswa || '-',
          nisn: sa.siswa?.nisn || '-',
          is_guru: false,
          status: a?.status || (sesi.status === 'SELESAI' ? 'ALPA' : 'BELUM_TAP'),
          is_terlambat: a?.is_terlambat || false,
          menit_keterlambatan: a?.menit_keterlambatan || 0,
          poin_kehadiran: a?.poin_kehadiran || 0,
          waktu_tap: a?.waktu_tap ? a.waktu_tap.toISOString() : null,
          catatan: a?.catatan || null,
          Siswa: {
            id: sa.siswa?.id,
            nama_siswa: sa.siswa?.nama_siswa,
            nisn: sa.siswa?.nisn
          }
        };
      });
    } else {
      mergedStudents = directStudents.map(s => {
        const a = absenMap.get(s.id);
        return {
          id: a?.id || `temp-${s.id}`,
          siswa_akademik_id: s.id,
          siswa_id: s.id,
          nama_siswa: s.nama_siswa || '-',
          nisn: s.nisn || s.nis || '-',
          is_guru: false,
          status: a?.status || (sesi.status === 'SELESAI' ? 'ALPA' : 'BELUM_TAP'),
          is_terlambat: a?.is_terlambat || false,
          menit_keterlambatan: a?.menit_keterlambatan || 0,
          poin_kehadiran: a?.poin_kehadiran || 0,
          waktu_tap: a?.waktu_tap ? a.waktu_tap.toISOString() : null,
          catatan: a?.catatan || null,
          Siswa: {
            id: s.id,
            nama_siswa: s.nama_siswa,
            nisn: s.nisn || s.nis
          }
        };
      });
    }

    // Resolve real Guru Name if null
    let realGuruName = sesi.Guru?.nama_guru || null;
    if (!realGuruName && sesi.guru_id) {
      const g = await prisma.guru.findFirst({
        where: { id: sesi.guru_id, tenant_id: tenantId },
        select: { nama_guru: true }
      });
      if (g?.nama_guru) realGuruName = g.nama_guru;
    }

    const teacherAbsen = sesi.AbsenGuru?.[0];
    const teacherRec = {
      id: teacherAbsen?.id || `guru-${sesi.guru_id || 'unassigned'}`,
      siswa_akademik_id: `guru-${sesi.guru_id || 'unassigned'}`,
      siswa_id: sesi.guru_id || 'unassigned',
      nama_siswa: realGuruName || 'Guru Pengajar Sesi',
      nisn: 'GURU',
      is_guru: true,
      status: teacherAbsen?.status || 'BELUM_HADIR',
      is_terlambat: teacherAbsen?.is_terlambat || false,
      menit_keterlambatan: teacherAbsen?.menit_keterlambatan || 0,
      poin_kehadiran: 0,
      waktu_tap: teacherAbsen?.waktu_tap ? teacherAbsen.waktu_tap.toISOString() : (teacherAbsen?.status === 'HADIR' ? sesi.created_at.toISOString() : null),
      catatan: teacherAbsen?.catatan || null,
      Guru: {
        id: sesi.guru_id,
        nama_guru: realGuruName || 'Guru Pengajar Sesi'
      }
    };

    return [teacherRec, ...mergedStudents];
  }

  async pullAttendanceFromOverlappingPembiasaan(tenantId: string, targetSesi: any) {
    if (!targetSesi?.kelas_id || !targetSesi?.tanggal) return;

    const startOfDay = new Date(targetSesi.tanggal);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetSesi.tanggal);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const pembiasaanSesi = await prisma.sesiAbsensi.findFirst({
      where: {
        tenant_id: tenantId,
        kelas_id: targetSesi.kelas_id,
        jenis_kegiatan: 'PEMBIASAAN',
        tanggal: { gte: startOfDay, lte: endOfDay }
      },
      select: { id: true }
    });

    if (!pembiasaanSesi) return;

    const pembiasaanAbsen = await prisma.absenSiswa.findMany({
      where: { tenant_id: tenantId, sesi_id: pembiasaanSesi.id, status: 'HADIR' }
    });

    for (const pa of pembiasaanAbsen) {
      await this.tapSiswa(tenantId, null, targetSesi.id, {
        siswa_id: pa.siswa_akademik_id,
        status: 'HADIR',
        catatan: 'Auto-pulled from Pembiasaan',
        waktu_tap: pa.waktu_tap
      }, 'SYSTEM_AUTO_PULL');
    }
  }
}

export const sesiTapEngineService = SesiTapEngineService.getInstance();

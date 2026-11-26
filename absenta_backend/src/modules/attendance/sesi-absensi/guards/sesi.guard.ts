import { prisma } from '@/utils/prisma';
import { RoleName } from '@/constants/enums';

export class SesiGuard {
  static async validateCreate(request: any, reply: any) {
    const { kelas_id, guru_id } = request.body || {};
    const roleName = request.user?.roleName || request.user?.Role?.name || request.user?.role?.name;
    const tenantId = request.tenantId || request.dataScope?.tenantId || request.user?.tenantId || (request.user?.tenant_id as string);

    // 0. Bypass for System/Admin
    if (roleName === RoleName.SUPERADMIN || roleName === RoleName.ADMIN) return;

    // 1. Check Active Petugas Assignment / Siswa Petugas Kelas
    const org = request.organizationalScope;
    const positions = org?.positions || [];
    const isPetugasSesi = positions.some((p: any) => p.code === 'PETUGAS_KELAS' || p.code === 'PETUGAS_ABSENSI' || p.code === 'PETUGAS_PIKET');
    
    if (roleName === RoleName.SISWA || isPetugasSesi) {
      const siswa = await prisma.siswa.findFirst({
        where: { user_id: request.user?.id, tenant_id: tenantId },
        select: { id: true, kelas_id: true }
      });
      
      const kelasIds = Array.isArray(org?.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
      if (siswa?.kelas_id && !kelasIds.includes(String(siswa.kelas_id))) {
        kelasIds.push(String(siswa.kelas_id));
      }

      const targetKelasId = String(kelas_id || siswa?.kelas_id || '');

      if (!targetKelasId || !kelasIds.includes(targetKelasId)) {
        reply.status(403).send({ success: false, message: 'Forbidden: Petugas hanya dapat membuka sesi untuk kelasnya sendiri.' });
        return;
      }

      if (!request.body) request.body = {};
      if (!request.body.kelas_id && targetKelasId) {
        request.body.kelas_id = targetKelasId;
      }
      return; // Allowed for Petugas Kelas
    }

    // 2. Check if user is a Guru (GURU biasa atau Pengajar Pelaksana)
    if (tenantId) {
      const isGuru = await prisma.guru.count({ where: { user_id: request.user?.id, tenant_id: tenantId } });
      if (isGuru > 0) {
        const guruRecord = await prisma.guru.findFirst({ where: { user_id: request.user?.id, tenant_id: tenantId }, select: { id: true } });
        if (guruRecord) {
          if (!request.body) request.body = {};

          // Jika guru_id dikirim dan berbeda dengan user saat ini, periksa apakah dia ditugaskan sebagai guru_pelaksana_id atau Guru UnitPengajaran
          if (guru_id && String(guru_id) !== String(guruRecord.id)) {
            const cleanJadwalId = request.body.jadwal_kbm_id ? String(request.body.jadwal_kbm_id).replace(/^sched_/, '') : null;
            let isDelegated = false;
            let isUnitTeacher = false;
            let resolvedUnitId: string | null = request.body.unit_pengajaran_id || null;

            if (cleanJadwalId) {
              const jadwal = await (prisma as any).jadwalKBM.findFirst({
                where: {
                  id: cleanJadwalId,
                  tenant_id: tenantId,
                },
                select: {
                  id: true,
                  guru_id: true,
                  guru_pelaksana_id: true,
                  unit_pengajaran_id: true,
                  UnitPengajaran: { select: { guru_id: true } },
                },
              });
              if (jadwal) {
                if (!resolvedUnitId && jadwal.unit_pengajaran_id) resolvedUnitId = jadwal.unit_pengajaran_id;
                if (jadwal.guru_pelaksana_id && String(jadwal.guru_pelaksana_id) === String(guruRecord.id)) {
                  isDelegated = true;
                } else if (jadwal.UnitPengajaran?.guru_id && String(jadwal.UnitPengajaran.guru_id) === String(guruRecord.id)) {
                  isUnitTeacher = true;
                }
              }
            }

            if (!isDelegated && !isUnitTeacher) {
              reply.status(403).send({ success: false, message: 'Forbidden: Anda bukan pengampu resmi, guru unit, atau pelaksana KBM yang ditugaskan.' });
              return;
            }

            if (resolvedUnitId) request.body.unit_pengajaran_id = resolvedUnitId;

            if (isDelegated) {
              // Tercatat sebagai sesi delegasi operasional
              request.body.guru_id = guru_id; // Pengampu resmi (SK)
              request.body.guru_pelaksana_id = guruRecord.id; // Pelaksana riil lapangan
              request.body.is_delegasi = true;
              return; // Allowed for Teaching Proxy
            }

            request.body.guru_id = guruRecord.id;
            return; // Allowed for Unit Teacher
          }

          request.body.guru_id = guruRecord.id;
          return; // Allowed for Official Teacher
        }
      }
    }

    // Default: Forbidden for unauthorized users
    reply.status(403).send({ 
        success: false, 
        message: 'Forbidden: Pembuatan sesi hanya dapat dilakukan oleh Petugas Absensi aktif atau Admin.' 
    });
  }

  static async validateSessionAccess(request: any, reply: any) {
    const { tenantId } = request.dataScope;
    const userId = request.user?.id;
    const { id } = request.params as any;
    const method = request.method;
    const roleName = request.user?.roleName || request.user?.Role?.name || request.user?.role?.name;

    if (roleName === RoleName.SUPERADMIN || roleName === RoleName.ADMIN) return;

    // Role & Position based Bypass for management (Kepala Sekolah, Kurikulum, Kesiswaan)
    const managementRoles = ['KEPALA_SEKOLAH', 'KURIKULUM', 'KESISWAAN', 'HUBIN'];
    const org = request.organizationalScope;
    const positions = org?.positions || [];
    const isManagement = managementRoles.includes(roleName) || positions.some((p: any) => managementRoles.includes(p.code));
    const userCaps = Array.isArray(request.user?.capabilities) ? request.user.capabilities : [];
    const isPiketAuthorized = userCaps.includes('attendance.piket.manage') || positions.some((p: any) => p.code === 'GURU_PIKET' || p.code === 'STAFF_PIKET');

    // READ-ONLY access (GET requests like /presensi-terpadu) is allowed for all authenticated users in tenant
    if (method === 'GET') return;

    const url = String(request.url || request.raw?.url || '');
    const isAbsenGuruRoute = url.includes('/absen-guru');

    // 🏛️ Pimpinan (Kurikulum/Kesiswaan/Kepsek) & Petugas Piket memiliki kewenangan penuh
    // untuk menentukan status kehadiran guru (IZIN, SAKIT, PENUGASAN, ALPA) dan Guru Inval di Meja Piket.
    if (isAbsenGuruRoute && (isManagement || isPiketAuthorized)) {
      return; // Allowed for Management / Piket
    }

    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
    const { device_id } = request.body || {};

    // 1. If it's an 'auto' tap from hardware, we bypass the immediate session check in the guard
    // as it will be resolved inside the Service Layer.
    if ((!id || id === 'auto' || !isUUID(id)) && device_id) {
        // We still need to verify the user has some basic capability, but we can't check specific session access yet.
        return; 
    }

    let sesi: any = await (prisma as any).sesiAbsensi.findFirst({
      where: { id, tenant_id: tenantId },
      select: {
        id: true,
        kelas_id: true,
        guru_id: true,
        guru_pelaksana_id: true,
        unit_pengajaran_id: true,
        UnitPengajaran: { select: { guru_id: true } },
      },
    });
    if (!sesi && typeof id === 'string' && (id.startsWith('sched_') || id.startsWith('sched-'))) {
      const cleanJadwalId = id.replace(/^(sched-hist-|sched_|sched-)/, '');
      const jadwal = await (prisma as any).jadwalKBM.findFirst({
        where: { id: cleanJadwalId, tenant_id: tenantId },
        select: {
          id: true,
          kelas_id: true,
          guru_id: true,
          guru_pelaksana_id: true,
          unit_pengajaran_id: true,
          UnitPengajaran: { select: { guru_id: true } },
        },
      });
      if (jadwal) {
        sesi = {
          id,
          kelas_id: jadwal.kelas_id,
          guru_id: jadwal.guru_id,
          guru_pelaksana_id: jadwal.guru_pelaksana_id,
          unit_pengajaran_id: jadwal.unit_pengajaran_id,
          UnitPengajaran: jadwal.UnitPengajaran,
        };
      }
    }

    if (!sesi) {
        reply.status(404).send({ success: false, message: 'Sesi tidak ditemukan atau ID tidak valid' });
        return;
    }

    const isWaliKelas = positions.some((p: any) => p.code === 'WALIKELAS');
    const isPetugasSesi = positions.some((p: any) => p.code === 'PETUGAS_KELAS' || p.code === 'PETUGAS_ABSENSI' || p.code === 'PETUGAS_PIKET');

    const isGuru = await prisma.guru.count({ where: { user_id: userId, tenant_id: tenantId } });
    const siswa = await prisma.siswa.findFirst({
      where: { user_id: userId, tenant_id: tenantId },
      include: {
        SiswaAkademik: {
          where: { status: 'AKTIF' },
          orderBy: { created_at: 'desc' },
        },
      },
    });
    const validKelasIds = new Set(
      [
        (siswa as any)?.kelas_id,
        ...(siswa?.SiswaAkademik || []).map((sa: any) => sa.kelas_id),
      ]
        .filter(Boolean)
        .map(String)
    );

    if (isGuru > 0) {
        const guruRecord = await prisma.guru.findFirst({ where: { user_id: userId, tenant_id: tenantId }, select: { id: true } });
        
        // 0. Jika Guru adalah Petugas Piket hari ini atau memiliki otorisasi piket
        if (guruRecord) {
          const todayDays = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'] as const;
          const hariIni = todayDays[new Date().getDay()];
          const isPiketToday = await (prisma as any).jadwalPiketGuru.findFirst({
            where: { guru_id: guruRecord.id, hari: hariIni as any, tenant_id: tenantId }
          });
          if (isPiketToday || isPiketAuthorized) {
            return; // Allowed for Piket Teacher
          }
        }

        // 1. Jika Guru adalah pengajar di sesi ini (guru SK, pelaksana delegasi, atau guru UnitPengajaran), berikan akses penuh
        if (
          guruRecord &&
          (String(sesi.guru_id || '') === String(guruRecord.id) ||
            String(sesi.guru_pelaksana_id || '') === String(guruRecord.id) ||
            String(sesi.UnitPengajaran?.guru_id || '') === String(guruRecord.id))
        ) {
          // Jika memanggil /absen-guru/:guru_id, guru hanya boleh mencatat kehadiran dirinya sendiri
          if (isAbsenGuruRoute && request.params?.guru_id && String(request.params.guru_id) !== String(guruRecord.id)) {
            reply.status(403).send({ success: false, message: 'Forbidden: Anda tidak dapat mengubah data presensi guru lain.' });
            return;
          }
          return; // Allowed
        }

        // 2. Jika Guru adalah Petugas Sesi (asisten/piket), berikan akses jika kelasnya sesuai
        if (isPetugasSesi && guruRecord) {
             const hasTenantWide = org?.tenant_wide === true;
             const kelasIds = Array.isArray(org?.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
             const canManageThisKelas = kelasIds.includes(String(sesi.kelas_id));
             if (hasTenantWide || canManageThisKelas) return;
        }

        // 3. Rule: Wali Kelas dilarang di modul sesi (KBM) jika BUKAN pengajarnya
        if (isWaliKelas && !isPetugasSesi) {
            const kelasIds = Array.isArray(org?.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
            if (kelasIds.includes(String(sesi.kelas_id))) {
                 reply.status(403).send({ success: false, message: 'Forbidden: Wali Kelas hanya memiliki akses di modul Gerbang (Sakit/Izin/Alfa).' });
                 return;
            }
        }

        // 4. Jika Guru bukan pengajar di sesi ini dan bukan piket
        if (isManagement) {
            reply.status(403).send({ success: false, message: 'Forbidden: Role Pimpinan hanya memiliki akses baca pada sesi kelas yang tidak diampu.' });
            return;
        }

        reply.status(403).send({ success: false, message: 'Forbidden: Anda tidak memiliki akses ke sesi ini.' });
        return;
    }

    if (siswa) {
        if (isPetugasSesi) {
            const kelasIds = Array.isArray(org?.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
            if (siswa?.kelas_id && !kelasIds.includes(String(siswa.kelas_id))) {
                kelasIds.push(String(siswa.kelas_id));
            }
            if ((siswa?.SiswaAkademik || []).some((sa: any) => sa.kelas_id && !kelasIds.includes(String(sa.kelas_id)))) {
                (siswa.SiswaAkademik || []).forEach((sa: any) => { if (sa.kelas_id && !kelasIds.includes(String(sa.kelas_id))) kelasIds.push(String(sa.kelas_id)); });
            }
            if (!kelasIds.includes(String(sesi.kelas_id))) {
                reply.status(403).send({ success: false, message: 'Forbidden: Petugas kelas hanya dapat mengelola sesi kelasnya sendiri.' });
                return;
            }
            return;
        }

        // Regular student: allow READ only for their own class, OR self-presence tap on /:id/tap-siswa for their own class
        if (method === 'GET') {
           if (validKelasIds.has(String(sesi.kelas_id))) {
             return; // Allowed to view their own class session
           }
           reply.status(403).send({ success: false, message: 'Forbidden: Anda hanya dapat melihat sesi kelas Anda sendiri.' });
           return;
        }

        const isTapSiswaRoute = url.includes('/tap-siswa');
        if (method === 'POST' && isTapSiswaRoute && validKelasIds.has(String(sesi.kelas_id))) {
          if (!request.body) request.body = {};
          // Kunci penuh ke identitas siswa yang sedang login (mencegah siswa mengabsenkan siswa lain)
          request.body.siswa_id = siswa.id;
          request.body.siswa_akademik_id = siswa.SiswaAkademik?.[0]?.id || undefined;
          request.body.status = 'HADIR';
          return; // Allowed for Student Self-Presence in Ruang KBM Daring / Tugas
        }

        reply.status(403).send({ success: false, message: 'Forbidden: Akses ditolak.' });
        return;
    }

    // Pure administrative / management without Guru profile
    if (isManagement) {
      reply.status(403).send({ success: false, message: 'Forbidden: Role Pimpinan hanya memiliki akses baca.' });
      return;
    }

    reply.status(403).send({ success: false, message: 'Forbidden: Akses ditolak.' });
  }

  static async validateList(request: any, reply: any) {
    const tenantId = request.tenantId || request.dataScope?.tenantId || request.user?.tenantId || (request.user?.tenant_id as string);
    const userId = request.user?.id;
    const { kelas_id } = request.query as any;

    if (!tenantId) {
        reply.status(401).send({ success: false, message: 'Unauthorized: tenant context missing' });
        return;
    }

    const roleName = request.user?.roleName || request.user?.Role?.name || request.user?.role?.name;
    if (roleName === RoleName.SUPERADMIN || roleName === RoleName.ADMIN) return;

    // Management Roles & Positions: bypass filters to see all classes/sessions
    const managementRoles = ['KEPALA_SEKOLAH', 'KURIKULUM', 'KESISWAAN', 'HUBIN'];
    const org = request.organizationalScope;
    const positions = org?.positions || [];
    const isManagement = managementRoles.includes(roleName) || positions.some((p: any) => managementRoles.includes(p.code));

    if (isManagement) return;

    const isGuru = await prisma.guru.count({ where: { tenant_id: tenantId, OR: [{ user_id: userId }, { id: userId }] } });
    const siswa = await prisma.siswa.findFirst({
      where: { tenant_id: tenantId, OR: [{ user_id: userId }, { id: userId }] },
      include: {
        SiswaAkademik: {
          where: { status: 'AKTIF' },
          orderBy: { created_at: 'desc' },
        },
      },
    });
    const siswaKelasId = (siswa as any)?.kelas_id || siswa?.SiswaAkademik?.[0]?.kelas_id;
    const validKelasIds = new Set(
      [
        (siswa as any)?.kelas_id,
        ...(siswa?.SiswaAkademik || []).map((sa: any) => sa.kelas_id),
      ]
        .filter(Boolean)
        .map(String)
    );

    if (siswa) {
        const org = request.organizationalScope;
        const activePetugasKelasIds = Array.isArray(org?.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];

        if (activePetugasKelasIds.length > 0) {
            if (kelas_id) {
                if (!activePetugasKelasIds.includes(kelas_id)) {
                    reply.status(403).send({ success: false, message: 'Forbidden: not active PetugasAbsensi for selected class' });
                    return;
                }
            } else {
                 request.query.allowedKelasIds = activePetugasKelasIds;
            }
        } else {
            if (!siswaKelasId && validKelasIds.size === 0) {
                 reply.status(403).send({ success: false, message: 'Forbidden: Siswa tidak memiliki kelas aktif' });
                 return;
            }
            if (kelas_id && !validKelasIds.has(String(kelas_id))) {
                 reply.status(403).send({ success: false, message: 'Forbidden: Anda hanya dapat melihat sesi kelas Anda sendiri' });
                 return;
            }
            const effectiveKelasId = (kelas_id && validKelasIds.has(String(kelas_id))) ? kelas_id : siswaKelasId;
            request.query.allowedKelasIds = [effectiveKelasId];
            if (!request.query.kelas_id && effectiveKelasId) {
                request.query.kelas_id = effectiveKelasId;
            }
        }
    } else if (isGuru) {
        const guru = await prisma.guru.findFirst({ where: { tenant_id: tenantId, OR: [{ user_id: userId }, { id: userId }] }, select: { id: true } });
        if (guru) {
            const org = request.organizationalScope;
            const positions = org?.positions || [];
            const requestedGuruId = request.query.guru_id ? String(request.query.guru_id) : undefined;
            if (requestedGuruId === 'me') {
                request.query.guru_id = guru.id;
            }
            const isExplicitOwnGuruQuery = requestedGuruId === 'me' || (requestedGuruId === String(guru.id) && !kelas_id);
            const forceOnlyMe = request.query.only_me === 'true' || request.query.only_me === true || isExplicitOwnGuruQuery;

            // Cek kelas binaan resmi Wali Kelas dari OrganizationalAssignment
            const walasAssignments = await prisma.organizationalAssignment.findMany({
                where: {
                    user_id: userId,
                    is_active: true,
                    Position: { code: 'WALIKELAS' },
                    OR: [
                        { tahun_pelajaran_id: null },
                        { TahunPelajaran: { is_active: true } }
                    ]
                },
                select: { kelas_id: true }
            });
            const walasKelasIds = Array.from(
                new Set(walasAssignments.map((a: any) => String(a.kelas_id || '')).filter(Boolean))
            );

            const isViewingOwnWalasKelas =
                !forceOnlyMe &&
                walasKelasIds.length > 0 &&
                (
                    (kelas_id && walasKelasIds.includes(String(kelas_id))) ||
                    !kelas_id
                );

            const hasPiketOrPetugas =
                positions.some((p: any) => p.code === 'PETUGAS_KELAS' || p.code === 'GURU_PIKET' || p.code === 'STAFF_PIKET');

            if (isViewingOwnWalasKelas) {
                if (!kelas_id) {
                    request.query.allowedKelasIds = walasKelasIds;
                    if (walasKelasIds.length === 1) {
                        request.query.kelas_id = walasKelasIds[0];
                    }
                }
                // Wali Kelas berhak melihat seluruh sesi (Kegiatan & KBM) di kelas binaannya secara Read-Only
                return;
            }

            if (!hasPiketOrPetugas || forceOnlyMe) {
                request.query.guruIdFilter = guru.id;
            }
        }
    }
  }
}

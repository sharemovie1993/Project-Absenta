import { prisma } from '@/utils/prisma';
import { RoleName } from '@/constants/enums';

export class SesiGuard {
  static async validateCreate(request: any, reply: any) {
    const { kelas_id, guru_id } = request.body || {};
    const roleName = request.user?.roleName || request.user?.Role?.name || request.user?.role?.name;
    const tenantId = request.tenantId || request.dataScope?.tenantId || request.user?.tenantId || (request.user?.tenant_id as string);

    // 0. Bypass for System/Admin
    if (roleName === RoleName.SUPERADMIN || roleName === RoleName.ADMIN) return;

    // 1. Check Active Petugas Assignment (Siswa or designated officers)
    const org = request.organizationalScope;
    const positions = org?.positions || [];
    const isPetugasSesi = positions.some((p: any) => p.code === 'PETUGAS_KELAS');
    
    if (isPetugasSesi) {
      const kelasIds = Array.isArray(org?.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
      if (!kelas_id || !kelasIds.includes(String(kelas_id))) {
        reply.status(403).send({ success: false, message: 'Forbidden: not active Petugas for this class' });
        return;
      }
      return; // Allowed
    }

    // 2. Check if user is a Guru (GURU biasa)
    if (tenantId) {
      const isGuru = await prisma.guru.count({ where: { user_id: request.user?.id, tenant_id: tenantId } });
      if (isGuru > 0) {
        const guruRecord = await prisma.guru.findFirst({ where: { user_id: request.user?.id, tenant_id: tenantId }, select: { id: true } });
        if (guruRecord) {
          if (guru_id && String(guru_id) !== String(guruRecord.id)) {
            reply.status(403).send({ success: false, message: 'Forbidden: Guru hanya dapat membuat sesi untuk dirinya sendiri.' });
            return;
          }
          if (!request.body) request.body = {};
          request.body.guru_id = guruRecord.id;
          return; // Allowed
        }
      }
    }

    // Default: Forbidden for Guru (even if Wali Kelas) or anyone else to create session
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

    if (isManagement) {
         if (method === 'GET') return; // Read-only access allowed
         reply.status(403).send({ success: false, message: 'Forbidden: Role Pimpinan hanya memiliki akses baca.' });
         return;
     }

    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
    const { device_id } = request.body || {};

    // 1. If it's an 'auto' tap from hardware, we bypass the immediate session check in the guard
    // as it will be resolved inside the Service Layer.
    if ((!id || id === 'auto' || !isUUID(id)) && device_id) {
        // We still need to verify the user has some basic capability, but we can't check specific session access yet.
        return; 
    }

    const sesi = await prisma.sesiAbsensi.findFirst({ where: { id, tenant_id: tenantId }, select: { id: true, kelas_id: true, guru_id: true } });
    if (!sesi) {
        reply.status(404).send({ success: false, message: 'Sesi tidak ditemukan atau ID tidak valid' });
        return;
    }


     const isWaliKelas = positions.some((p: any) => p.code === 'WALIKELAS');
    const isPetugasSesi = positions.some((p: any) => p.code === 'PETUGAS_KELAS');

    const isGuru = await prisma.guru.count({ where: { user_id: userId, tenant_id: tenantId } });
    const siswa = await prisma.siswa.findFirst({ where: { user_id: userId, tenant_id: tenantId } });

    if (isGuru) {
        const guruRecord = await prisma.guru.findFirst({ where: { user_id: userId, tenant_id: tenantId }, select: { id: true } });
        
        // 1. Jika Guru adalah pengajar di sesi ini, berikan akses (termasuk DELETE)
        if (guruRecord && String(sesi.guru_id || '') === String(guruRecord.id)) {
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

        reply.status(403).send({ success: false, message: 'Forbidden: Anda tidak memiliki akses ke sesi ini.' });
        return;
    }

    if (siswa) {
        if (isPetugasSesi) {
            const kelasIds = Array.isArray(org?.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
            if (!kelasIds.includes(String(sesi.kelas_id))) {
                reply.status(403).send({ success: false, message: 'Forbidden: not active PetugasAbsensi for this class' });
                return;
            }
            return;
        }

        // Regular student: allow READ only for their own class
        if (method === 'GET') {
           if (siswa.kelas_id === sesi.kelas_id) {
             return; // Allowed to view their own class session
           }
           reply.status(403).send({ success: false, message: 'Forbidden: Anda hanya dapat melihat sesi kelas Anda sendiri.' });
           return;
        }

        reply.status(403).send({ success: false, message: 'Forbidden: Akses ditolak.' });
        return;
    }
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
    const siswa = await prisma.siswa.findFirst({ where: { tenant_id: tenantId, OR: [{ user_id: userId }, { id: userId }] } });

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
            if (!siswa.kelas_id) {
                 reply.status(403).send({ success: false, message: 'Forbidden: Siswa tidak memiliki kelas aktif' });
                 return;
            }
            if (kelas_id && kelas_id !== siswa.kelas_id) {
                 reply.status(403).send({ success: false, message: 'Forbidden: Anda hanya dapat melihat sesi kelas Anda sendiri' });
                 return;
            }
            request.query.allowedKelasIds = [siswa.kelas_id];
        }
    } else if (isGuru) {
        const guru = await prisma.guru.findFirst({ where: { tenant_id: tenantId, OR: [{ user_id: userId }, { id: userId }] }, select: { id: true } });
        if (guru) {
            const org = request.organizationalScope;
            const hasPrivilegedStructure = org?.tenant_wide === true || (org?.positions || []).some((p: any) => p.code === 'PETUGAS_KELAS');
            const forceOnlyMe = request.query.only_me === 'true' || request.query.only_me === true || request.query.guru_id === 'me';

            if (!hasPrivilegedStructure || forceOnlyMe) {
                request.query.guruIdFilter = guru.id;
            }
        }
    }
  }
}

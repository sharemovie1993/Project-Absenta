import { authorizationService } from '@/modules/auth/services/authorization.service';
import { RoleName } from '../constants/enums';
import { prisma } from '../utils/prisma';

interface RequireCapabilityOptions {
  checkGuruOnly?: boolean; // Legacy option
  exemptRoles?: RoleName[]; // Roles that skip this check (e.g. SISWA for self-view)
}

export const requireCapability = (capabilityOrCapabilities: string | string[], options: RequireCapabilityOptions = {}) => {
  return async (request: any, reply: any) => {
    const user = (request as any).user;
    if (!user) {
      request.log.warn({
        event: 'REQUIRE_CAP_USER_MISSING',
        path: request.url,
        ip: request.ip
      }, `[REQUIRE_CAP_DEBUG] User object missing from request! Path: ${request.url}`);
      return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
    }



    const userId = (user as any).id ?? (user as any).userId ?? (user as any).user_id;
    const rawRole = user.roleName || user.Role?.name || (typeof user.role === 'string' ? user.role : user.role?.name);
    const roleName = String(rawRole || '').trim().toUpperCase();
    const tenantId = (request as any).tenantId || (user as any).tenantId || (user as any).tenant_id;
    const endpoint = String((request as any).url || '').split('?')[0];

    const capabilities = Array.isArray(capabilityOrCapabilities) ? capabilityOrCapabilities : [capabilityOrCapabilities];

    // Superadmin & Admin bypass (System Owner & Tenant Administrator)
    // PENTING: Modul keuangan / koperasi TETAP WAJIB memiliki capability resmi (Jabatan Bendahara/Ketua/Petugas)
    // agar Superadmin/Admin tidak bisa sembarangan memanipulasi arus kas tanpa penugasan struktural.
    if (roleName === RoleName.SUPERADMIN || roleName === RoleName.ADMIN || roleName === 'SUPERADMIN' || roleName === 'ADMIN') {
        const hasCoopCapability = capabilities.some(cap => cap.startsWith('cooperative.'));
        if (!hasCoopCapability) {
            return;
        }
    }

    // Check Exempt Roles
    if (options.exemptRoles && options.exemptRoles.some(r => String(r).toUpperCase() === roleName)) {
        return;
    }

    // 🎯 Dynamic Pembimbing & Penguji Sidang PKL Authorization:
    // Guru yang di-ploting sebagai Pembimbing (SiswaPkl.pembimbing_id)
    // ATAU sebagai Penguji Sidang (SiswaPkl.nilai_json->penguji_id)
    // berhak penuh melakukan CRUD Nilai PKL, Nilai Sidang, Logbook, Rekap, dan Monitoring PKL
    const isPklCap = capabilities.some(c => 
      c === 'hubin.pkl.manage' || 
      c === 'hubin.guidance.manage' || 
      c === 'hubin.pkl.view.list' ||
      c === 'hubin.logbook.manage' ||
      c === 'hubin.absensi.verify' ||
      c === 'hubin.absensi.view.history' ||
      c === 'hubin.absensi.recap' ||
      c === 'dashboard.view.hubin'
    );
    if (isPklCap && roleName === 'GURU') {
      try {
        const guru = await prisma.guru.findFirst({
          where: { user_id: String(userId) },
          select: { id: true }
        });
        if (guru) {
          // 1. Cek ploting pembimbing PKL
          const isPembimbingPlotted = await prisma.siswaPkl.findFirst({
            where: { pembimbing_id: guru.id },
            select: { id: true }
          });
          if (isPembimbingPlotted) {
            return; // Authorized directly as Pembimbing PKL!
          }

          // 2. Cek ploting penguji sidang PKL
          const isPengujiPlotted = await prisma.siswaPkl.findFirst({
            where: {
              nilai_json: {
                path: ['penguji_id'],
                equals: guru.id
              }
            },
            select: { id: true }
          });
          if (isPengujiPlotted) {
            return; // Authorized directly as Penguji Sidang PKL!
          }
        }
      } catch (e) {
        request.log.warn({ err: e }, '[AUTH] Error checking SiswaPkl pembimbing/penguji plotting in requireCapability');
      }
    }

    const res = await authorizationService.isUserAuthorized(String(userId), capabilities, { user });
    if (res.allowed) return;

    console.warn(`[AUTH] Access Denied (403) | User: ${user.email} | Role: ${roleName} | Missing Caps: ${capabilities.join(', ')}`);
    try {
      console.warn(JSON.stringify({
        event: 'CAPABILITY_ACCESS_DENIED',
        tenantId: tenantId ?? null,
        userId: userId ?? null,
        capability: capabilities.join(', '),
        endpoint,
        timestamp: new Date().toISOString()
      }));
    } catch {}
    return reply.status(403).send({ 
        error: 'CAPABILITY_ACCESS_DENIED',
        code: 'FORBIDDEN',
        message:
          (roleName === RoleName.ADMIN || roleName === 'ADMIN')
            ? res.reason === 'ADMIN_DENIED_CAPABILITY'
              ? `Forbidden: Admin restricted from capability: ${capabilities.join(', ')}`
              : `Forbidden: Admin missing required capability: ${capabilities.join(', ')}`
            : `Forbidden: Missing required capability. Required one of: ${capabilities.join(', ')}`
    });
  };
};

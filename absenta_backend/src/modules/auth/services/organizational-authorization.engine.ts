import { prisma } from '@/utils/prisma';
import { organizationalContextCache } from './organizational-context-cache';
import { STRUKTUR_CAPABILITIES } from '@/config/position-capabilities';

export interface OrganizationalContext {
  positions: Array<{
    id: string;
    tenant_id: string;
    code: string;
    name: string;
    scope_type: string;
    unit_type: string | null;
  }>;
  kelas_ids: string[];
  unit_ids: string[];
  tenant_wide: boolean;
}

export class OrganizationalAuthorizationEngine {
  private isAssignmentActiveNow(assignment: {
    is_active: boolean;
    start_date: Date | null;
    end_date: Date | null;
  }): boolean {
    if (!assignment.is_active) return false;
    const now = new Date();
    if (assignment.start_date && assignment.start_date.getTime() > now.getTime()) return false;
    if (assignment.end_date && assignment.end_date.getTime() < now.getTime()) return false;
    return true;
  }

  async resolveOrganizationalContext(userId: string): Promise<OrganizationalContext> {
    return organizationalContextCache.getOrSet<OrganizationalContext>(userId, async () => {
      // 1. Fetch Structural Assignments (Wali Kelas, etc)
      const raw = await prisma.organizationalAssignment.findMany({
        where: { user_id: userId },
        include: {
          Position: { select: { id: true, tenant_id: true, code: true, name: true, scope_type: true, unit_type: true } },
        },
      });

      // 2. Fetch Teaching Assignments (Based on Schedule)
      const guru = await prisma.guru.findFirst({
        where: { user_id: userId },
        select: { id: true }
      });

      let teachingKelasIds: string[] = [];
      if (guru) {
        const schedules = await prisma.jadwalKBM.findMany({
          where: { guru_id: guru.id },
          select: { kelas_id: true }
        });
        teachingKelasIds = Array.from(new Set(schedules.map(s => s.kelas_id)));
      }

      const active = raw.filter((a: any) =>
        this.isAssignmentActiveNow({
          is_active: Boolean(a.is_active),
          start_date: a.start_date ?? null,
          end_date: a.end_date ?? null,
        })
      );

      const positions = new Map<string, OrganizationalContext['positions'][number]>();
      const kelasIds = new Set<string>(teachingKelasIds); // Initialize with teaching classes
      const unitIds = new Set<string>();
      let tenantWide = false;

      for (const a of active as any[]) {
        const p = a.Position;
        if (p?.id) {
          positions.set(String(p.id), {
            id: String(p.id),
            tenant_id: String(p.tenant_id),
            code: String(p.code),
            name: String(p.name),
            scope_type: String(p.scope_type),
            unit_type: p.unit_type ? String(p.unit_type) : null,
          });
        }
        if (a.kelas_id) kelasIds.add(String(a.kelas_id));
        if (a.unit_id) unitIds.add(String(a.unit_id));

        if (!a.kelas_id && !a.unit_id) {
          tenantWide = true;
        }
      }

      // 3. Prioritaskan kelas utama siswa jika user adalah Siswa
      const siswa = await prisma.siswa.findFirst({
        where: { user_id: userId },
        select: { kelas_id: true }
      });

      const rawKelasList = Array.from(kelasIds);
      if (siswa?.kelas_id && rawKelasList.includes(String(siswa.kelas_id))) {
        const index = rawKelasList.indexOf(String(siswa.kelas_id));
        if (index > 0) {
          rawKelasList.splice(index, 1);
          rawKelasList.unshift(String(siswa.kelas_id));
        }
      }

      return {
        positions: Array.from(positions.values()),
        kelas_ids: rawKelasList,
        unit_ids: Array.from(unitIds),
        tenant_wide: tenantWide,
      };
    });
  }

  async resolveOrganizationalCapabilities(userId: string): Promise<string[]> {
    const ctx = await this.resolveOrganizationalContext(userId);
    const capSet = new Set<string>();

    // 1. Smart Otorisasi: Inject default capabilities based on position codes
    for (const pos of ctx.positions) {
      const defaultCaps = STRUKTUR_CAPABILITIES[pos.code];
      if (Array.isArray(defaultCaps)) {
        defaultCaps.forEach(c => capSet.add(String(c)));
      }
    }

    // 2. Hybrid Otorisasi: Fetch additional / override capabilities from database
    if (ctx.positions.length > 0) {
      const positionIds = ctx.positions.map((p) => p.id);
      const dbCaps = await prisma.organizationalCapability.findMany({
        where: { position_id: { in: positionIds } },
        select: { permission_id: true },
      });

      dbCaps.forEach((c: any) => {
        if (c.permission_id) capSet.add(String(c.permission_id));
      });
    }

    // 3. Dynamic Piket Otorisasi: Auto-grant piket capabilities if teacher is assigned in JadwalPiketGuru today
    const guru = await prisma.guru.findFirst({
      where: { user_id: userId },
      select: { id: true }
    });

    if (guru) {
      // Base Teaching & Teacher Dashboard Capabilities (Jadwal Mengajar, Beban JP, Presensi KBM, Jurnal)
      capSet.add('dashboard.view.guru');
      capSet.add('academic.teaching.view');
      capSet.add('academic.teaching.rekap');
      capSet.add('academic.schedules.view.list');
      capSet.add('academic.structures.view.list');
      capSet.add('academic.structures.view.detail');
      capSet.add('academic.structures.view.tree');
      capSet.add('academic.subjects.view.list');
      capSet.add('academic.teachers.view.list');
      capSet.add('academic.teachers.view.detail');
      capSet.add('academic.students.view.list');
      capSet.add('academic.students.view.detail');
      capSet.add('attendance.schedules.view.list');
      capSet.add('attendance.sessions.view.list');
      capSet.add('attendance.sessions.view.detail');
      capSet.add('attendance.sessions.tap');
      capSet.add('attendance.sessions.update.attendance');
      capSet.add('attendance.sessions.update.journal');
      capSet.add('attendance.recap.view.daily');
      capSet.add('attendance.recap.view.monthly');
      capSet.add('dashboard.view.teacher.attendance');
      capSet.add('attendance.reports.view');
      capSet.add('documents.upload');
      capSet.add('documents.view.list');
      capSet.add('documents.view.detail');

      const todayDays = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'] as const;
      const now = new Date();
      const hariIni = todayDays[now.getDay()];

      const isGuruPiketToday = await prisma.jadwalPiketGuru.findFirst({
        where: {
          guru_id: guru.id,
          hari: hariIni as any,
        },
        select: { id: true }
      });

      if (isGuruPiketToday) {
        capSet.add('attendance.piket.view');
        capSet.add('attendance.piket.manage');
      }
    }

    // 4. Base Self-Service Capabilities (Overview, Notifications & Profile)
    capSet.add('dashboard.view.overview');
    capSet.add('notify.view.my');
    capSet.add('notify.view.preferences');
    capSet.add('notify.update.preferences');
    capSet.add('notify.view.stats');

    return Array.from(capSet).filter(Boolean);
  }

  async resolveDataScope(userId: string): Promise<OrganizationalContext> {
    return this.resolveOrganizationalContext(userId);
  }

}

export const organizationalAuthorizationEngine = new OrganizationalAuthorizationEngine();

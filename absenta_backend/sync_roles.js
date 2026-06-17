const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ADMIN_CAPABILITIES = [
  'academic.students.view.list',
  'academic.students.view.detail',
  'academic.students.view.history',
  'academic.students.create',
  'academic.students.update',
  'academic.students.delete',
  'academic.students.send.access_token',
  'academic.teachers.view.list',
  'academic.teachers.view.detail',
  'academic.teachers.create',
  'academic.teachers.update',
  'academic.teachers.delete',
  'academic.structures.view.list',
  'academic.structures.view.detail',
  'academic.structures.create',
  'academic.structures.update',
  'academic.structures.delete',
  'academic.activities.view.list',
  'academic.activities.create',
  'academic.activities.update',
  'academic.activities.delete',
  'academic.years.view.list',
  'academic.years.create',
  'academic.years.update',
  'academic.years.set_active',
  'academic.semesters.view.list',
  'academic.semesters.create',
  'academic.semesters.update',
  'academic.semesters.set_active',
  'academic.teaching.view',
  'academic.teaching.manage',
  'academic.teaching.rekap',
  'academic.promotions.manage',
  'academic.transitions.manage',
  'academic.homeroom.manage',
  'academic.activities.types.view',
  'academic.activities.types.manage',
  'academic.subjects.view.list',
  'academic.subjects.view.detail',
  'academic.subjects.create',
  'academic.subjects.update',
  'academic.subjects.delete',
  'academic.backups.view.list',
  'academic.backups.create',
  'academic.backups.restore',
  'academic.student_card.view.config',
  'academic.student_card.update.config',
  'attendance.gate.bypass',
  'attendance.recap.view.daily',
  'attendance.recap.view.monthly',
  'attendance.gate.view.logs',
  'attendance.gate.view.face_templates',
  'attendance.officers.view',
  'attendance.officers.manage',
  'attendance.sessions.create',
  'attendance.sessions.view.list',
  'attendance.sessions.view.detail',
  'attendance.sessions.update.attendance',
  'attendance.sessions.close',
  'attendance.sessions.delete',
  'attendance.gate.tap.entry',
  'attendance.gate.tap.exit',
  'attendance.gate.face.verify',
  'attendance.gate.face.enroll',
  'attendance.reports.view',
  'attendance.schedules.create',
  'attendance.schedules.update',
  'attendance.schedules.delete',
  'documents.view.list',
  'documents.view.detail',
  'documents.upload',
  'documents.delete',
  'dashboard.view.overview',
  'dashboard.view.teacher_attendance',
  'dashboard.view.student_stats',
  'dashboard.view.violation_stats',
  'notify.view.preferences',
  'notify.view.logs',
  'notify.update.preferences',
  'core.users.view.list',
  'core.users.view.detail',
  'core.users.create',
  'core.users.update',
  'core.users.delete',
  'core.users.complete_onboarding',
  'core.users.update.email',
  'core.users.reset_password',
  'core.system.config.update',
  'core.sekolah.view.profile',
  'core.sekolah.update.profile',
  'billing.my_subscription.view',
  'billing.invoices.view.list',
  'billing.invoices.view.detail',
  'billing.invoices.generate',
  'billing.invoices.pay',
  'billing.invoices.cancel',
  'billing.subscriptions.view.active',
  'billing.subscriptions.create',
  'billing.subscriptions.update',
  'billing.subscriptions.cancel',
];

async function run() {
  const adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } });
  if (!adminRole) {
    console.log('No ADMIN role found.');
    return;
  }
  
  for (const cap of ADMIN_CAPABILITIES) {
    // Upsert permission record if missing
    let perm = await prisma.permission.findUnique({ where: { id: cap } });
    if (!perm) {
      const group = cap.split('.')[0];
      perm = await prisma.permission.create({
        data: {
          id: cap,
          description: cap,
          group: group,
        }
      });
      console.log('Created missing permission:', cap);
    }
    
    // Create RolePermission mapping
    const existing = await prisma.rolePermission.findUnique({
      where: {
        role_id_permission_id: {
          role_id: adminRole.id,
          permission_id: cap
        }
      }
    });

    if (!existing) {
      await prisma.rolePermission.create({
        data: {
          role_id: adminRole.id,
          permission_id: cap
        }
      });
      console.log('Granted to ADMIN:', cap);
    }
  }
  
  console.log('Successfully synced ADMIN capabilities!');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

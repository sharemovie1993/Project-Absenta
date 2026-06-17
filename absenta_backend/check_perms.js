const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const admin = await p.user.findFirst({
    where: { email: 'admin@smkn1cimahi.com' },
    include: {
      Role: {
        include: {
          rolePermissions: {
            include: { Permission: { select: { id: true, group: true } } }
          }
        }
      }
    }
  });

  const perms = admin?.Role?.rolePermissions?.map(rp => rp.Permission.id) || [];
  
  // All attendance related permissions
  const attPerms = perms.filter(p => p.startsWith('attendance.'));
  console.log('=== ADMIN DB attendance permissions ===');
  attPerms.forEach(p => console.log(' ', p));
  console.log('Total:', attPerms.length);
  
  // Check if the needed ones exist in Permission table at all
  const needed = [
    'attendance.reports.view',
    'attendance.manage_face_templates',
    'attendance.gate.view.face_templates',
  ];
  
  console.log('\n=== Permission table check ===');
  for (const id of needed) {
    const perm = await p.permission.findUnique({ where: { id } });
    console.log(`${id}: ${perm ? 'EXISTS (group: ' + perm.group + ')' : 'NOT_FOUND'}`);
  }
  
  // Check all permissions in attendance group
  const allAttPerms = await p.permission.findMany({
    where: { group: 'attendance' },
    select: { id: true },
    orderBy: { id: 'asc' }
  });
  console.log('\n=== All attendance group permissions in DB ===');
  allAttPerms.forEach(p => console.log(' ', p.id));
  console.log('Total:', allAttPerms.length);
  
  await p.$disconnect();
})();

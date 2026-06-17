import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ids = [
    'attendance.reports.view',
    'attendance.sessions.manage', 
    'academic.students.view',
    'academic.view.kelas',
    'academic.update.kelas'
  ];
  
  const found = await prisma.permission.findMany({
    where: { id: { in: ids } },
    select: { id: true, action: true }
  });
  console.log('Found permissions:', JSON.stringify(found, null, 2));
  
  // Also check what permissions exist with similar patterns
  const similar = await prisma.permission.findMany({
    where: { 
      OR: [
        { action: { contains: 'attendance.reports' } },
        { action: { contains: 'attendance.sessions' } },
        { action: { contains: 'academic.students' } },
      ]
    },
    select: { id: true, action: true },
    take: 20
  });
  console.log('Similar permissions:', JSON.stringify(similar, null, 2));
  
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });

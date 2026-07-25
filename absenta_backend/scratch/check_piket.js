const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { AuthorizationService } = require('../src/modules/auth/services/authorization.service');
const authService = new AuthorizationService();

async function main() {
  // 1. Check GURU role permissions directly
  const guruRole = await prisma.role.findFirst({
    where: { name: 'GURU', tenant_id: null },
    include: {
      rolePermissions: { include: { Permission: true } }
    }
  });
  const rolePerms = guruRole?.rolePermissions?.map(rp => rp.Permission.id) || [];
  console.log('=== GURU ROLE DIRECT PERMISSIONS ===');
  console.log(`Has bk.assessment.manage? ${rolePerms.includes('bk.assessment.manage') ? 'YES ❌' : 'NO ✅'}`);
  console.log(`Has kesiswaan.piket.view? ${rolePerms.includes('kesiswaan.piket.view') ? 'YES ❌' : 'NO ✅'}`);

  // 2. Check Ahmad Heri's resolved capabilities
  const user = await prisma.user.findFirst({
    where: { email: 'aher@gmail.com' }
  });
  if (user) {
    const resolved = await authService.resolveUserCapabilities(user.id);
    console.log('\n=== AHMAD HERI RESOLVED CAPABILITIES (WITH BPBK POSITION) ===');
    console.log(`Has bk.assessment.manage? ${resolved.includes('bk.assessment.manage') ? 'YES ✅' : 'NO ❌'}`);
    console.log(`Has kesiswaan.piket.view? ${resolved.includes('kesiswaan.piket.view') ? 'YES ✅' : 'NO ❌'}`);
  } else {
    console.log('User aher@gmail.com not found!');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

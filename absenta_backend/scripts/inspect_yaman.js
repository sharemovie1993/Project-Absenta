const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== INSPECTING USER YAMAN ===');
  
  const user = await prisma.user.findFirst({
    where: { email: 'yaman@gmail.com' },
    include: {
      Role: true,
      Tenant: true
    }
  });
  
  if (!user) {
    console.log('User yaman@gmail.com not found!');
    return;
  }
  
  console.log('User Info:', {
    id: user.id,
    email: user.email,
    tenant_id: user.tenant_id,
    tenant_name: user.Tenant ? user.Tenant.name : 'NONE',
    role: user.Role ? user.Role.name : 'NONE'
  });
  
  // Find structural assignments
  const assignments = await prisma.organizationalAssignment.findMany({
    where: { user_id: user.id, is_active: true },
    include: {
      Position: true
    }
  });
  
  console.log('Active Structural Assignments:', assignments.map(a => ({
    id: a.id,
    position_code: a.Position ? a.Position.code : 'NONE',
    position_name: a.Position ? a.Position.name : 'NONE',
    kelas_id: a.kelas_id,
    unit_id: a.unit_id
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

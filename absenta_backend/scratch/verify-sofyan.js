const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'sofyan@gmail.com' },
    include: {
      UserRole: {
        include: {
          Role: {
            include: {
              RoleCapability: {
                include: {
                  Capability: true
                }
              }
            }
          }
        }
      }
    }
  });
  if (!user) {
    console.log('User sofyan@gmail.com not found');
    return;
  }
  console.log('User:', user.email);
  console.log('User ID:', user.id);
  console.log('Roles:', user.UserRole.map(ur => ur.Role.name));
  
  const capabilities = [];
  user.UserRole.forEach(ur => {
    ur.Role.RoleCapability.forEach(rc => {
      capabilities.push(rc.Capability.name);
    });
  });
  console.log('Capabilities:', [...new Set(capabilities)]);
}

main().catch(console.error).finally(() => prisma.$disconnect());

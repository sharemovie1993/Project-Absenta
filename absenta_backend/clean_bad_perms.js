const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function run() {
  const mapPath = path.join(__dirname, 'capability_domain_map.json');
  const validMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const validKeys = Object.keys(validMap);
  
  const allPerms = await prisma.permission.findMany({ select: { id: true } });
  let cleaned = 0;
  for (const p of allPerms) {
    if (!validKeys.includes(p.id)) {
      // Delete role permissions
      await prisma.rolePermission.deleteMany({ where: { permission_id: p.id } });
      await prisma.organizationalCapability.deleteMany({ where: { permission_id: p.id } });
      await prisma.permission.delete({ where: { id: p.id } });
      console.log('Deleted invalid permission:', p.id);
      cleaned++;
    }
  }
  console.log(`Cleaned up ${cleaned} invalid permissions.`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addGateCapabilities() {
  console.log('=== ADDING GATE TAP CAPABILITIES IN DB ===');

  // Find all roles
  const roles = await prisma.role.findMany();
  console.log('Roles in DB:', roles.map(r => r.name));

  const targetCapabilities = [
    'attendance.gate.tap.entry',
    'attendance.gate.bypass',
    'attendance.scan'
  ];

  for (const capCode of targetCapabilities) {
    let cap = await prisma.capability.findUnique({
      where: { code: capCode }
    });

    if (!cap) {
      cap = await prisma.capability.create({
        data: {
          code: capCode,
          name: capCode,
          description: `Capability ${capCode}`,
          module: 'attendance'
        }
      });
      console.log('Created capability:', capCode);
    }

    for (const role of roles) {
      const exists = await prisma.roleCapability.findUnique({
        where: {
          role_id_capability_id: {
            role_id: role.id,
            capability_id: cap.id
          }
        }
      });

      if (!exists) {
        await prisma.roleCapability.create({
          data: {
            role_id: role.id,
            capability_id: cap.id
          }
        });
        console.log(`Granted ${capCode} to role ${role.name}`);
      }
    }
  }

  console.log('✅ ALL GATE TAP CAPABILITIES GRANTED!');
}

addGateCapabilities()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

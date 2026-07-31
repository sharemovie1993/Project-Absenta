const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const usersToUpdate = [
    { email: 'suhermat@gmail.com', pass: 'admin1234' },
    { email: 'aaj@gmail.com', pass: '11223344' },
    { email: '1122558890@absenta.id', pass: '11223344' },
    { email: 'aher@gmail.com', pass: 'admin1234' }
  ];

  for (const u of usersToUpdate) {
    const hash = await bcrypt.hash(u.pass, 10);
    const updated = await prisma.user.updateMany({
      where: { email: u.email },
      data: { password: hash }
    });
    console.log(`Updated password for ${u.email} -> '${u.pass}' (count: ${updated.count})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

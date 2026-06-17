const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'sofyan@gmail.com' }
  });
  if (!user) {
    return console.log('User not found');
  }
  console.log('User:', user);
  
  const guru = await prisma.guru.findFirst({
    where: { user_id: user.id }
  });
  console.log('Guru:', guru);

  const assignments = await prisma.organizationalAssignment.findMany({
    where: { user_id: user.id },
    include: { Position: true, Kelas: true }
  });
  console.log('Assignments:', assignments);
}
main().finally(() => prisma.$disconnect());

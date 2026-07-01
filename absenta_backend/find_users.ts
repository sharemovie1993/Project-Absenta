import { prisma } from './src/utils/prisma';

async function main() {
  try {
    const users = await prisma.user.findMany({
      where: {
        tenant_id: 'c2998880-ef62-43b7-8c85-2cc855a84d26'
      },
      select: {
        email: true,
        Role: {
          select: {
            name: true
          }
        }
      },
      take: 10
    });
    console.log(users);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();

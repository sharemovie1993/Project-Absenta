import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function inspect() {
  const email = 'vanesa@gmail.com';
  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      organizationalAssignments: {
        include: {
          Position: true,
          Kelas: true
        }
      }
    }
  });

  console.log('User:', JSON.stringify(user, null, 2));

  const count = await prisma.sarprasAsset.count();
  console.log('Total Assets:', count);

  const locations = await prisma.sarprasLocation.findMany();
  console.log('Locations:', JSON.stringify(locations, null, 2));
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const hidayatUserId = '933486cc-e74f-410a-afe1-7667e41135eb';
  const tenantId = '990d0b8c-5722-4977-94fd-4378f8cb6e04';

  const assignment = await prisma.organizationalAssignment.findMany({
    where: {
      user_id: hidayatUserId,
      tenant_id: tenantId,
    },
    include: {
      Position: true,
      Kelas: true,
    }
  });

  console.log(JSON.stringify(assignment, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

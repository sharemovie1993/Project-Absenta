const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      organizationalAssignments: {
        some: {
          Position: {
            code: 'KURIKULUM'
          }
        }
      }
    },
    include: {
      Role: true,
      Tenant: true
    }
  });
  console.log(JSON.stringify(user, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

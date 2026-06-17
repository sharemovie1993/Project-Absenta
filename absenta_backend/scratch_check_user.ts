import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const member = await prisma.member.findFirst({
    where: {
      User: {
        full_name: {
          contains: 'Gina Lusiana',
          mode: 'insensitive'
        }
      }
    },
    include: {
      savings: {
        include: {
          category: true
        }
      }
    }
  });

  if (!member) {
    console.log('Member Gina Lusiana not found');
    return;
  }

  console.log(`Member: ${member.id} (No: ${member.memberNo})`);
  console.log(`Savings count: ${member.savings.length}`);
  for (const s of member.savings) {
    console.log(`- Category: ${s.category.name} (Code: ${s.category.code}), Balance: ${s.amount}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
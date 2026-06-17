const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const loans = await prisma.loan.findMany({
    where: { member: { tenantId } },
    include: { member: { include: { User: true, Guru: true, Siswa: true } } }
  });
  console.log('Loans in DB for Plered:');
  console.log(JSON.stringify(loans.map(l => ({
    id: l.id,
    amount: l.amount,
    interestRate: l.interestRate,
    duration: l.duration,
    status: l.status,
    memberName: l.member.User?.full_name || l.member.Guru?.nama_guru || l.member.Siswa?.nama_siswa
  })), null, 2));
}

main().finally(() => prisma.$disconnect());

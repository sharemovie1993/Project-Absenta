const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const users = [
    { label: 'Petugas Gerbang', email: 'suhermat@gmail.com', pass: 'admin1234' },
    { label: 'Petugas Kelas', email: 'aaj@gmail.com', pass: '11223344' },
    { label: 'Siswa', nisn: '1122558890', pass: '11223344' },
    { label: 'Guru', nip: '197802000000000000', pass: 'admin1234' },
  ];

  for (const u of users) {
    let dbUser = null;
    if (u.email) {
      dbUser = await prisma.user.findFirst({ where: { email: u.email } });
    } else if (u.nisn) {
      const siswa = await prisma.siswa.findFirst({ where: { nisn: u.nisn } });
      if (siswa?.user_id) {
        dbUser = await prisma.user.findUnique({ where: { id: siswa.user_id } });
      }
    } else if (u.nip) {
      const guru = await prisma.guru.findFirst({ where: { nip: u.nip } });
      if (guru?.user_id) {
        dbUser = await prisma.user.findUnique({ where: { id: guru.user_id } });
      }
    }

    if (dbUser) {
      const match = await bcrypt.compare(u.pass, dbUser.password_hash || '');
      console.log(`[${u.label}] User ID: ${dbUser.id} | Email/Username: ${dbUser.email || dbUser.username} | Password Match ('${u.pass}'):`, match);
    } else {
      console.log(`[${u.label}] User NOT found in DB`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

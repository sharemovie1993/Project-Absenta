const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  console.log('Menguji koneksi database...');
  try {
    const config = await p.systemConfig.findFirst({
      where: { is_active: true }
    });
    console.log('Sukses mengambil systemConfig:', config);
  } catch (err) {
    console.error('Error saat mengambil systemConfig:', err);
  } finally {
    await p.$disconnect();
  }
}
main();

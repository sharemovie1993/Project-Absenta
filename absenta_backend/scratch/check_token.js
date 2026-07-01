const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const siswaId = 'a96103a8-60cf-40a7-8ff9-d946260990f4';
  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  
  const skList = await prisma.suratKeluar.findMany({
    where: {
      siswa_id: siswaId,
      tenant_id: tenantId
    }
  });
  console.log('Surat Keluar Records found:', skList);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

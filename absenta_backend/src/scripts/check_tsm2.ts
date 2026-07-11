import { prisma } from '../utils/prisma';

async function main() {
  console.log('--- CHECK TSM 2 STUDENTS ---');

  const tenantId = 'b4b316ce-c4cf-4519-a7a1-c0d3284d8745'; // smk6jkt tenant ID

  // Find class by name
  const kelas = await prisma.kelas.findFirst({
    where: {
      tenant_id: tenantId,
      nama_kelas: {
        contains: 'XII TSM 2',
        mode: 'insensitive'
      }
    }
  });

  if (!kelas) {
    console.error('Class XII TSM 2 not found!');
    return;
  }
  console.log(`Found class: ${kelas.nama_kelas} (${kelas.id})`);

  // Find students in this class
  const siswas = await prisma.siswa.findMany({
    where: {
      tenant_id: tenantId,
      kelas_id: kelas.id
    },
    select: {
      id: true,
      nama_siswa: true,
      status: true
    }
  });

  console.log(`Total students in database under this class: ${siswas.length}`);
  for (const s of siswas) {
    console.log(`- ${s.nama_siswa} (Status: ${s.status})`);
  }
}

main().catch(console.error);

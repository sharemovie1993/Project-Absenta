import { prisma } from '../utils/prisma';
import { organizationalAuthorizationEngine } from '../modules/auth/services/organizational-authorization.engine';

async function main() {
  // 1. Cari siswa AAJ ULIL AJMI
  const siswa = await prisma.siswa.findFirst({
    where: { nama_siswa: { contains: 'AAJ ULIL AJMI', mode: 'insensitive' } },
    include: { Kelas: true, User: true },
  });

  console.log('=== DATA SISWA AAJ ===');
  console.log('ID:', siswa?.id);
  console.log('Nama:', siswa?.nama_siswa);
  console.log('Kelas Siswa (siswa.kelas_id):', siswa?.Kelas?.nama_kelas, `[${siswa?.kelas_id}]`);
  console.log('User ID:', siswa?.user_id);
  console.log('User Email:', siswa?.User?.email);

  if (siswa?.user_id) {
    const assignments = await prisma.organizationalAssignment.findMany({
      where: { user_id: siswa.user_id },
      include: { Position: true, Kelas: true },
    });
    console.log('\n=== STATUST ALL ASSIGNMENTS ===');
    assignments.forEach((a, i) => {
      console.log(`${i+1}. ID: ${a.id} | Pos: ${a.Position.code} | Kelas: ${a.Kelas?.nama_kelas} (${a.kelas_id}) | is_active: ${a.is_active} | start: ${a.start_date} | end: ${a.end_date}`);
    });

    const ctx = await organizationalAuthorizationEngine.resolveOrganizationalContext(siswa.user_id);
    console.log('\n=== RESOLVED ENGINE SCOPE (CONTEXT) ===');
    console.log(JSON.stringify(ctx, null, 2));

    const kelasData = await prisma.kelas.findMany({
      where: { id: { in: ctx.kelas_ids } },
      select: { id: true, nama_kelas: true }
    });
    console.log('Managed Class Names:', kelasData.map(k => k.nama_kelas).join(', '));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- DIAGNOSTIC SCRIPT START ---');
  
  const hidayatEmail = 'hidayat.catur.pamungkas@gmail.com';
  console.log(`Searching for user with email: ${hidayatEmail}`);
  
  const user = await prisma.user.findUnique({
    where: { email: hidayatEmail },
    include: { Siswa: true }
  });
  
  if (!user) {
    console.log('❌ User not found!');
  } else {
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      siswaId: user.Siswa?.[0]?.id,
      kelasId: user.Siswa?.[0]?.kelas_id,
      status: user.Siswa?.[0]?.status
    });
    
    const tenantId = user.tenant_id;
    
    // Check Tenant Context
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    console.log('✅ Tenant:', { id: tenant?.id, name: tenant?.name, mode: tenant?.absensi_mode });
    
    // Check Active Period
    const tp = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } });
    const sem = await prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true } });
    console.log('✅ Active Period:', { tp: tp?.tahun, sem: sem?.nama_semester });
    
    // Check Classes
    const classes = await prisma.kelas.findMany({ where: { tenant_id: tenantId } });
    console.log('✅ Found Classes:', classes.map(k => k.nama_kelas).join(', '));
    
    const xRpl1 = classes.find(k => k.nama_kelas.includes('X-RPL-1') || k.nama_kelas.includes('X RPL 1'));
    if (xRpl1) {
       console.log('🔍 X-RPL-1 found with ID:', xRpl1.id);
       if (!user.Siswa?.[0]?.kelas_id) {
         console.log('🚀 REPAIRING: Assigning student to class...');
         await prisma.siswa.update({
           where: { id: user.Siswa?.[0]?.id },
           data: { kelas_id: xRpl1.id }
         });
         console.log('✅ Repair completed!');
       }
    } else {
       console.log('❌ X-RPL-1 class NOT FOUND in this tenant!');
    }
  }
  
  console.log('--- DIAGNOSTIC SCRIPT END ---');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});

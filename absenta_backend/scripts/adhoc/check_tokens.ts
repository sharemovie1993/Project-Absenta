
import { prisma } from './src/utils/prisma';

async function checkParentTokens() {
  try {
    console.log('Checking Parent Access Tokens...');
    
    const tokens = await prisma.parentAccessToken.findMany({
      where: { is_active: true },
      include: {
        OrangTua: {
          include: {
            OrangTuaSiswa: {
              include: {
                Siswa: {
                  select: { id: true, nama_siswa: true, status: true }
                }
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: 5
    });

    console.log(`Found ${tokens.length} active tokens.`);

    for (const t of tokens) {
      console.log('--------------------------------------------------');
      console.log(`Token ID: ${t.id}`);
      console.log(`Token: ${t.token.substring(0, 10)}...`);
      console.log(`Parent: ${t.OrangTua.nama} (${t.OrangTua.id})`);
      console.log(`Expired At: ${t.expired_at.toISOString()}`);
      console.log(`Is Active: ${t.is_active}`);
      
      const now = new Date();
      const isExpired = now > t.expired_at;
      console.log(`Current Time: ${now.toISOString()}`);
      console.log(`Is Expired Check: ${isExpired}`);

      const activeChildren = t.OrangTua.OrangTuaSiswa.filter(
        link => link.Siswa && link.Siswa.status === 'AKTIF'
      );

      console.log(`Total Children: ${t.OrangTua.OrangTuaSiswa.length}`);
      console.log(`Active Children (status='AKTIF'): ${activeChildren.length}`);

      t.OrangTua.OrangTuaSiswa.forEach(link => {
        console.log(` - Child: ${link.Siswa?.nama_siswa} | Status: ${link.Siswa?.status}`);
      });

      if (activeChildren.length === 0) {
        console.warn('WARNING: This token is valid but will be REJECTED by validateToken due to NO ACTIVE CHILDREN.');
      } else {
        console.log('PASS: Token should be accepted.');
      }
    }

  } catch (error) {
    console.error('Error checking tokens:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkParentTokens();

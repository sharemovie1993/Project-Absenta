import { prisma } from '../../src/utils/prisma';
import { waGatewayService } from '../../src/services/wa-gateway.service';

async function main() {
  console.log('📱 Checking WhatsApp Gateway Status on VPS...');
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  
  for (const t of tenants) {
    try {
      const status = await waGatewayService.getStatus(t.id);
      console.log(`\nTenant: [${t.name}] (ID: ${t.id})`);
      console.log(` - Status       : ${status.status}`);
      console.log(` - Connected Num: ${status.number || 'Belum Terhubung'}`);
      console.log(` - QR Available : ${status.qrCode ? 'Ya (Menunggu Scan)' : 'Tidak'}`);
    } catch (err: any) {
      console.error(` ❌ Error checking status for tenant ${t.name}:`, err.message);
    }
  }

  // Also check system tenant status if separate
  try {
    const sysStatus = await waGatewayService.getStatus('system');
    console.log(`\nTenant: [SYSTEM MASTER]`);
    console.log(` - Status       : ${sysStatus.status}`);
    console.log(` - Connected Num: ${sysStatus.number || 'Belum Terhubung'}`);
  } catch (err: any) {
    console.error(' ❌ Error checking system status:', err.message);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

import { waGatewayService } from '../../src/services/wa-gateway.service';

async function main() {
  const tenantId = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
  console.log(`🔌 Attempting to initialize WA connection for tenant ${tenantId}...`);
  
  await waGatewayService.initTenant(tenantId);

  // Wait 6 seconds for Baileys socket connection or QR generation
  await new Promise(res => setTimeout(res, 6000));

  const status = await waGatewayService.getStatus(tenantId);
  console.log('\n📊 Updated Status:');
  console.log(` - Status       : ${status.status}`);
  console.log(` - Connected Num: ${status.number || 'Belum Terhubung'}`);
  console.log(` - Has QR Code  : ${!!status.qrCode}`);
  process.exit(0);
}

main().catch(console.error);

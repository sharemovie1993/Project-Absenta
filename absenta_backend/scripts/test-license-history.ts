import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function run() {
  const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
  const coreKey = process.env.LICENSE_KEY || '';

  console.log(`Menghubungi Server Lisensi: ${LICENSE_SERVER_URL}`);
  console.log(`Menggunakan LICENSE_KEY   : ${coreKey}`);

  try {
    const url = `${LICENSE_SERVER_URL}/api/license/history-by-core-key/${coreKey}`;
    console.log(`Requesting URL: ${url}`);
    const response = await axios.get(url, { timeout: 10000 });
    
    console.log('\nStatus Response:', response.status);
    console.log('Success Field  :', response.data?.success);
    
    if (response.data?.success && response.data?.data?.invoices) {
      const invoices = response.data.data.invoices;
      console.log(`\nBerhasil mengambil ${invoices.length} invoice dari pusat:\n`);
      
      invoices.forEach((inv: any, idx: number) => {
        console.log(`[Invoice #${idx + 1}]`);
        console.log(`- Nomor Invoice : ${inv.invoice_number}`);
        console.log(`- Produk ID     : ${inv.product_id}`);
        console.log(`- Nama Produk   : ${inv.product_display_name}`);
        console.log(`- Amount        : Rp ${inv.amount.toLocaleString('id-ID')}`);
        console.log(`- Status        : ${inv.status}`);
        console.log(`- QR/Pay URL    : ${inv.qr_url || 'None'}`);
        console.log(`- Paid At       : ${inv.paid_at || 'Unpaid'}`);
        console.log('---------------------------------------------');
      });
      console.log('\nIntegrasi Server Lisensi Pusat Berjalan 100% Sempurna!');
    } else {
      console.log('\nRespons sukses tetapi tidak ada data invoice:', response.data);
    }
  } catch (err: any) {
    console.error('\n[ERROR] Gagal menghubungi Server Lisensi:', err.message);
    if (err.response) {
      console.error('Response data:', err.response.data);
    }
  }
}

run();

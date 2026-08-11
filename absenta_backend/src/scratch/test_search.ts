import axios from 'axios';

async function testURLs() {
  const urls = [
    'https://raw.githubusercontent.com/zones/kodepos/master/kodepos.json',
    'https://raw.githubusercontent.com/cahyadsn/wilayah/master/db/kodepos.json',
    'https://raw.githubusercontent.com/pedro-12/kodepos-indonesia/master/kodepos.json',
    'https://raw.githubusercontent.com/ajikamaludin/kodepos-indonesia/master/kodepos.json',
    'https://raw.githubusercontent.com/farizdotid/DAFTAR-API-LOKAL-INDONESIA/master/kodepos.json',
    'https://kodepos.id/api/search?q=plered',
    'https://api.nomor.net/kodepos/search?q=plered'
  ];

  for (const u of urls) {
    try {
      const res = await axios.get(u, { timeout: 3000 });
      console.log('SUCCESS:', u, Array.isArray(res.data) ? res.data.length : typeof res.data);
    } catch (e: any) {
      console.log('FAIL:', u, e.message);
    }
  }
}

testURLs();

import axios from 'axios';

async function testKodeposId(q: string) {
  try {
    const res = await axios.get(`https://kodepos.id/api/search?q=${encodeURIComponent(q)}`, { timeout: 5000 });
    console.log('Result for', q, ':', res.data);
  } catch (e: any) {
    console.log('Error:', e.message);
  }
}

testKodeposId('plered');
testKodeposId('coblong');

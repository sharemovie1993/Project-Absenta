import axios from 'axios';

async function testSuggest(term: string) {
  try {
    const res = await axios.get(`https://kodepos.id/suggest?term=${encodeURIComponent(term)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 5000
    });
    console.log('Suggest for', term, ':', res.data);
  } catch (e: any) {
    console.log('Suggest error:', e.message);
  }
}

testSuggest('Plered');
testSuggest('Coblong');

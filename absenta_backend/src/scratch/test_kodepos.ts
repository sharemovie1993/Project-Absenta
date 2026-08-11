import axios from 'axios';

async function testAPIs(q: string) {
  console.log(`\n🔍 Searching postal code for "${q}"...`);
  
  // Provider 1
  try {
    const res = await axios.get(`https://kodepos-237.herokuapp.com/search?q=${encodeURIComponent(q)}`, { timeout: 4000 });
    console.log('Provider 1 (herokuapp):', res.data?.data?.[0]);
  } catch (e: any) {
    console.log('Provider 1 failed:', e.message);
  }

  // Provider 2
  try {
    const res = await axios.get(`https://api.coffeecodes.in/kodepos?q=${encodeURIComponent(q)}`, { timeout: 4000 });
    console.log('Provider 2 (coffeecodes):', res.data);
  } catch (e: any) {
    console.log('Provider 2 failed:', e.message);
  }

  // Provider 3
  try {
    const res = await axios.get(`https://kodepos-api-cdn.vercel.app/search?q=${encodeURIComponent(q)}`, { timeout: 4000 });
    console.log('Provider 3 (vercel cdn):', res.data);
  } catch (e: any) {
    console.log('Provider 3 failed:', e.message);
  }

  // Provider 4 (Github Base API / Emsifa / Binderbyte)
  try {
    const res = await axios.get(`https://api-kodepos-postman.herokuapp.com/search?q=${encodeURIComponent(q)}`, { timeout: 4000 });
    console.log('Provider 4:', res.data);
  } catch (e: any) {
    console.log('Provider 4 failed:', e.message);
  }
}

testAPIs('Plered');

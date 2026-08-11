import axios from 'axios';

async function testGithubKodePos() {
  console.log('🔍 Testing Github Kodepos Datasets...');

  try {
    const res = await axios.get('https://raw.githubusercontent.com/backspace/kodepos/master/kodepos.json', { timeout: 6000 });
    const data = res.data || [];
    console.log(`✅ Loaded ${data.length} postal codes from Github Backspace!`);
    console.log('Sample item:', data[0]);
    return;
  } catch (e: any) {
    console.log('Backspace failed:', e.message);
  }

  try {
    const res = await axios.get('https://raw.githubusercontent.com/rohit-k-s/kodepos-indonesia/master/kodepos.json', { timeout: 6000 });
    const data = res.data || [];
    console.log(`✅ Loaded ${data.length} postal codes from Github Rohit!`);
    console.log('Sample item:', data[0]);
  } catch (e: any) {
    console.log('Rohit failed:', e.message);
  }
}

testGithubKodePos();

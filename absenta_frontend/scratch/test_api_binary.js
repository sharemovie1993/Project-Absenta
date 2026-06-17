const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Ganti dengan URL backend Anda yang sedang berjalan
const BASE_URL = 'http://localhost:5000/api'; 
const TOKEN = 'PASTE_YOUR_TOKEN_HERE'; // Saya perlu token anda jika endpoint ini diproteksi

async function testDownload() {
  const endpoint = `${BASE_URL}/academic/jurusan/import/template`;
  console.log(`Testing endpoint: ${endpoint}`);
  
  try {
    const response = await axios({
      url: endpoint,
      method: 'GET',
      responseType: 'arraybuffer',
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    const buffer = Buffer.from(response.data);
    const hex = buffer.toString('hex', 0, 4);
    
    console.log('--- API Response Info ---');
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers['content-type']);
    console.log('Content-Length:', response.headers['content-length']);
    console.log('Magic Bytes (First 4):', hex);

    if (hex === '504b0304') {
      console.log('✅ VALID: File adalah format ZIP/XLSX yang benar.');
    } else {
      console.log('❌ INVALID: File bukan format Excel yang valid!');
      console.log('Preview content (ASCII):', buffer.toString('utf8', 0, 100));
    }

    const outputPath = path.join(__dirname, 'test_output.xlsx');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Saved to: ${outputPath}`);

  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', Buffer.from(error.response.data).toString());
    }
  }
}

// testDownload();
console.log('Script ready. I need your Auth Token to run this against the real backend.');

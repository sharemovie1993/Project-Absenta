const axios = require('axios');

async function test() {
  const url = 'https://script.google.com/macros/s/AKfycbywlLf0ElgIerviroaIHRlYnDZwGjJmz3ubkfbw45Y-AYj5tUxr9I7k7PaBrUMpRy5smA/exec';
  const dummyImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  console.log('Testing Apps Script URL:', url);
  try {
    const res = await axios.post(url, {
      filename: 'direct_scratch_test.png',
      mimetype: 'image/png',
      base64: dummyImageBase64
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('Response status:', res.status);
    console.log('Response data:', res.data);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();

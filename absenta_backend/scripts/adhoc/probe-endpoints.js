const https = require('https');
const fs = require('fs');

const TOKEN_FILE = 'token.txt';
const BASE_URL = 'https://nepur.absenta.id';

const endpoints = [
  '/api/auth/me',
  '/api/menu/tree',
  '/api/dashboard/overview',
  '/api/system-config' // Added based on user request
];

function probe(path) {
  return new Promise((resolve) => {
    console.log(`\nProbing ${path}...`);
    
    let token;
    try {
      token = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    } catch (err) {
      console.error('Error reading token.txt:', err.message);
      return resolve();
    }

    const options = {
      hostname: 'nepur.absenta.id',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'ProbeScript/1.0',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
      console.log('Headers:', JSON.stringify(res.headers, null, 2));
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Body Length: ${data.length} chars`);
        if (data.length < 1000) {
            console.log('Body Preview:', data);
        } else {
            console.log('Body Preview:', data.substring(0, 500) + '...');
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`PROBLEM with request: ${e.message}`);
      if (e.code) console.error(`Error Code: ${e.code}`);
      resolve();
    });

    req.end();
  });
}

async function run() {
  for (const ep of endpoints) {
    await probe(ep);
  }
}

run();

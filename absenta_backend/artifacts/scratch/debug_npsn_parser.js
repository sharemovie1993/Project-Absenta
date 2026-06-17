const axios = require('axios');
const https = require('https');

function decodeHtml(input) {
  let s = String(input ?? '');
  s = s.replace(/&nbsp;/gi, ' ');
  s = s.replace(/&amp;/gi, '&');
  return s;
}

function htmlToText(html) {
  const cleaned = String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(tr|p|div|li|h\d|table|section)>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return decodeHtml(cleaned).split('\n').map(l => l.trim()).filter(Boolean).join('\n');
}

async function debug() {
  const url = 'https://referensi.data.kemdikbud.go.id/tabs.php?npsn=20224166';
  try {
    const resp = await axios.get(url, {
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const text = htmlToText(resp.data);
    console.log('PARSED TEXT SAMPLE (First 2000 chars):');
    console.log(text.substring(0, 2000));
    
    // Test regex
    const labels = ['Nama', 'NPSN'];
    for (const label of labels) {
      const re = new RegExp(`^\\s*${label}\\s*:?\\s*(.+?)\\s*$`, 'im');
      const match = text.match(re);
      console.log(`Regex Test [${label}]:`, match ? `MATCHED: "${match[1]}"` : 'FAILED');
    }
  } catch (e) {
    console.error(e);
  }
}

debug();

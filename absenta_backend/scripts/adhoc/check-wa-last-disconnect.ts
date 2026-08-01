import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🔍 Checking WhatsApp Last Activity & Session Files...');
  
  const tenantId = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
  const authDir = path.join(process.cwd(), 'wa_auth', tenantId);
  const credsFile = path.join(authDir, 'creds.json');

  if (fs.existsSync(credsFile)) {
    const stat = fs.statSync(credsFile);
    console.log(`\n📄 Creds file [creds.json] stats for tenant SMKN 1 PLERED:`);
    console.log(` - Last Modified (mtime): ${stat.mtime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`);
    console.log(` - Created Time  (ctime): ${stat.ctime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`);
  } else {
    console.log(`\n⚠️ No creds.json file found in ${authDir}`);
  }

  if (fs.existsSync(authDir)) {
    const files = fs.readdirSync(authDir);
    console.log(`\nFound ${files.length} session files in wa_auth directory.`);
    
    // Sort files by mtime desc
    const fileStats = files.map(f => {
      const p = path.join(authDir, f);
      const s = fs.statSync(p);
      return { file: f, mtime: s.mtime, size: s.size };
    }).sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    console.log('\nTop 5 Most Recently Modified Files in wa_auth:');
    fileStats.slice(0, 5).forEach(f => {
      console.log(` - ${f.file.padEnd(30)} : ${f.mtime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB (${f.size} bytes)`);
    });
  } else {
    console.log(`\nDirectory ${authDir} does not exist.`);
  }
}

main().catch(console.error);

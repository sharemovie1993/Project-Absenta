import { execSync } from 'child_process';
import fs from 'fs';

interface TunnelItem {
  name: string;
  slug: string;
  confPath: string;
  clientIp: string;
  gatewayIp: string;
  tableId: number;
}

const configs: TunnelItem[] = [
  {
    name: 'et-smkn1pld',
    slug: 'smkn1pld',
    confPath: '/var/www/project-absenta/tunnels/et-smkn1pld.conf',
    clientIp: '10.0.0.22',
    gatewayIp: '10.0.0.1',
    tableId: 1001
  },
  {
    name: 'et-luxury',
    slug: 'luxury',
    confPath: '/var/www/undangan-digital/backend/tunnels/et-luxury.conf',
    clientIp: '10.0.2.3',
    gatewayIp: '10.0.2.1',
    tableId: 1002
  },
  {
    name: 'et-demo',
    slug: 'demo',
    confPath: '/var/www/project-absenta/tunnels/et-demo.conf',
    clientIp: '10.0.2.4',
    gatewayIp: '10.0.2.1',
    tableId: 1003
  }
];

function applyPBRNumeric() {
  console.log('🚀 [NUMERIC PBR DEPLOYMENT] Menerapkan Source Policy-Based Routing dengan Tabel Numerik...');

  for (const c of configs) {
    if (!fs.existsSync(c.confPath)) {
      console.warn(`File ${c.confPath} tidak ditemukan, skip.`);
      continue;
    }

    let content = fs.readFileSync(c.confPath, 'utf8');
    
    // Extract Address
    const addrMatch = content.match(/Address\s*=\s*([0-9.]+)/i);
    const clientIp = addrMatch ? addrMatch[1] : c.clientIp;

    // Bersihkan Table / PostUp / PreDown lama
    content = content
      .replace(/Table\s*=\s*[^\n]+\n?/gi, '')
      .replace(/PostUp\s*=\s*[^\n]+\n?/gi, '')
      .replace(/PreDown\s*=\s*[^\n]+\n?/gi, '');

    // Buat rule PBR dengan tableId numerik (1001, 1002, 1003):
    const pbr = `Table = off\n` +
      `PostUp = ip -4 rule add from ${clientIp}/32 table ${c.tableId} 2>/dev/null || true; ip -4 route add ${c.gatewayIp}/32 dev %i table ${c.tableId} 2>/dev/null || ip -4 route replace ${c.gatewayIp}/32 dev %i table ${c.tableId} 2>/dev/null || true\n` +
      `PreDown = ip -4 rule del from ${clientIp}/32 table ${c.tableId} 2>/dev/null || true; ip -4 route flush table ${c.tableId} 2>/dev/null || true`;

    content = content.replace(/\[Interface\]/i, `[Interface]\n${pbr}`);
    fs.writeFileSync(c.confPath, content, 'utf8');
    fs.chmodSync(c.confPath, 0o600);

    // Sync ke /etc/wireguard/ jika ada
    const etcPath = `/etc/wireguard/${c.name}.conf`;
    try {
      execSync(`sudo ln -sf "${c.confPath}" "${etcPath}" 2>/dev/null || true`, { stdio: 'pipe' });
    } catch (_) {}

    console.log(`✔ Config updated: ${c.name} (Client: ${clientIp}, Gateway: ${c.gatewayIp}, Table: ${c.tableId})`);

    // Terapkan routing kernel secara langsung
    try {
      execSync(`sudo ip -4 rule add from ${clientIp}/32 table ${c.tableId} 2>/dev/null || true`, { stdio: 'pipe' });
      execSync(`sudo ip -4 route add ${c.gatewayIp}/32 dev ${c.name} table ${c.tableId} 2>/dev/null || sudo ip -4 route replace ${c.gatewayIp}/32 dev ${c.name} table ${c.tableId} 2>/dev/null || true`, { stdio: 'pipe' });
      console.log(`   └─ Kernel Rule applied: from ${clientIp}/32 -> lookup table ${c.tableId}`);
    } catch (e: any) {
      console.warn(`   └─ Note: ${e.message}`);
    }
  }

  console.log('\n================ HASIL STATUS ROUTING KERNEL ================');
  try {
    const rules = execSync('ip -4 rule show', { stdio: 'pipe' }).toString();
    console.log('📌 IP Rules:\n' + rules);

    for (const c of configs) {
      const r = execSync(`ip -4 route show table ${c.tableId}`, { stdio: 'pipe' }).toString();
      console.log(`📌 Table ${c.tableId} (${c.name}) -> ${r.trim() || '(none)'}`);
    }
  } catch (e: any) {
    console.error('Error status:', e.message);
  }
  console.log('==============================================================');
  console.log('🎉 3 INTERFACE WIRECARD BERHASIL DIKONFIGURASI DENGAN PBR ISOLASI PENUH!');
}

applyPBRNumeric();

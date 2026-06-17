const axios = require('axios');
const readline = require('readline');

/**
 * ABSENTA DESKTOP IOT BRIDGE
 * -------------------------
 * Script ini digunakan untuk menghubungkan USB RFID Reader (HID Keyboard mode)
 * langsung ke backend Absenta tanpa perlu membuka browser.
 */

// --- KONFIGURASI ---
const BACKEND_URL = 'http://localhost:3001'; // Silakan ganti dengan URL server backend Anda
const DEVICE_ID = 'USB-RFID-SIMULATOR';        // Pastikan ID ini sudah didaftarkan di Manajemen Perangkat

console.log("\n=======================================");
console.log("   🚀 ABSENTA DESKTOP IOT BRIDGE");
console.log("=======================================");
console.log(`📡 URL Backend  : ${BACKEND_URL}`);
console.log(`🆔 Device ID    : ${DEVICE_ID}`);
console.log("---------------------------------------\n");

// 1. Fungsi Kirim Heartbeat (Agar alat terlihat ONLINE di dashboard)
async function sendHeartbeat() {
  try {
    await axios.post(`${BACKEND_URL}/api/attendance/devices/heartbeat`, {
      device_id: DEVICE_ID,
      version: '1.0.0-desktop-bridge'
    });
    console.log(`[${new Date().toLocaleTimeString()}] ❤️ Heartbeat: Status ONLINE diperbarui.`);
  } catch (e) {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ Heartbeat Gagal: ${e.message}`);
    if (e.response?.data?.message) console.error(`   Pesan Server: ${e.response.data.message}`);
  }
}

// Jalankan heartbeat pertama kali dan setiap 5 menit
sendHeartbeat();
setInterval(sendHeartbeat, 300000); 

// 2. Mendengarkan Input dari USB RFID (yang bertindak sebagai Keyboard)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

console.log("💡 PETUNJUK: Pastikan window ini aktif, lalu tempelkan kartu RFID Anda.");
console.log("----------------------------------------------------------------------\n");

rl.on('line', async (line) => {
  const rfid = line.trim();
  if (!rfid) return;

  console.log(`\n💳 Kartu Terdeteksi: [${rfid}]`);
  console.log("⏳ Memproses absensi...");

  try {
    const res = await axios.post(`${BACKEND_URL}/api/attendance/devices/tap`, {
      device_id: DEVICE_ID,
      rfid: rfid
    });

    if (res.data.success) {
      console.log(`✅ BERHASIL: ${res.data.message || 'Absensi tercatat.'}`);
      // Anda bisa menambahkan suara bip di sini jika diinginkan
    } else {
      console.log(`⚠️ PERINGATAN: ${res.data.message}`);
    }
  } catch (e) {
    console.error(`❌ ERROR: ${e.response?.data?.message || e.message}`);
  }
  
  console.log("\n---------------------------------------");
  console.log("Menunggu tap kartu berikutnya...");
});

rl.on('close', () => {
  console.log('Bridge dihentikan.');
  process.exit(0);
});

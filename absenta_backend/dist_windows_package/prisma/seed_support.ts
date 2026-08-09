import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai seeding Quick Replies dan Knowledge Base...');

  // 1. Seed Quick Replies
  const quickReplies = [
    {
      shortcut: '/absen-offline',
      title: 'Mesin Absen Fingerprint/Face Offline',
      content: 'Halo Bapak/Ibu Admin Sekolah,\n\nJika mesin absen terdeteksi offline, mohon ikuti langkah diagnosis berikut:\n1. Pastikan kabel LAN terhubung kokoh di belakang mesin dan lampu indikator port menyala.\n2. Cek koneksi internet sekolah dengan melakukan ping ke gateway router.\n3. Restart mesin absen dengan mencabut adaptor listrik selama 10 detik lalu pasang kembali.\n\nJika status masih offline di dashboard, silakan kabari kami untuk pengecekan port router.',
      category: 'TECHNICAL'
    },
    {
      shortcut: '/sinkron-dapodik',
      title: 'Gagal Sinkronisasi Dapodik',
      content: 'Halo Bapak/Ibu,\n\nUntuk kendala gagal sinkronisasi data Dapodik ke Absenta.id, mohon pastikan:\n1. Versi Web Helper Dapodik Anda adalah versi terbaru.\n2. Token sinkronisasi di menu Pengaturan Absenta telah disalin ulang dengan benar.\n3. Server Dapodik lokal Anda sedang dalam kondisi aktif dan terhubung internet.\n\nSilakan coba sinkronkan ulang setelah melakukan pembersihan cache browser.',
      category: 'TECHNICAL'
    },
    {
      shortcut: '/billing-payment',
      title: 'Konfirmasi Pembayaran Billing',
      content: 'Halo Bapak/Ibu,\n\nTerima kasih atas konfirmasi pembayarannya. Tagihan langganan sekolah Anda telah terverifikasi lunas di sistem billing Absenta.id.\n\nStatus langganan sekolah Anda kini aktif otomatis kembali. Lembar bukti pembayaran (invoice resmi) dapat diunduh di menu Billing > Invoice & Tagihan.',
      category: 'BILLING'
    }
  ];

  for (const q of quickReplies) {
    await prisma.supportQuickReply.upsert({
      where: { shortcut: q.shortcut },
      update: q,
      create: q
    });
  }

  // 2. Seed Knowledge Base
  const knowledgeBase = [
    {
      title: 'Penanganan IP Gateway Mikrotik Terblokir',
      content: 'Langkah penanganan jika IP sekolah terblokir oleh Firewall Mikrotik:\n1. Buka Winbox Mikrotik di server pusat.\n2. Akses menu IP > Firewall > Address List.\n3. Cari Address List bernama \'absen_ban_list\' atau \'blocked_attackers\'.\n4. Hapus IP publik sekolah yang bersangkutan dari daftar blokir.\n5. Berikan whitelist IP publik sekolah tersebut ke Address List \'trusted_schools\'.',
      tags: ['mikrotik', 'ip blocked', 'firewall']
    },
    {
      title: 'Solusi Kartu Pelajar RFID Tidak Terbaca',
      content: 'Diagnosis kendala kartu RFID sekolah tidak terdeteksi mesin:\n1. Cek apakah LED indikator card reader menyala hijau saat kartu didekatkan.\n2. Pastikan format output card reader di mesin absen disetel ke 10-digit decimal (atau format standar Wiegand).\n3. Daftarkan ulang nomor UID kartu RFID di profil siswa bersangkutan lewat menu Manajemen Siswa.',
      tags: ['rfid', 'kartu pelajar', 'reader']
    }
  ];

  for (const k of knowledgeBase) {
    const exist = await prisma.supportKnowledgeBase.findFirst({
      where: { title: k.title }
    });
    if (exist) {
      await prisma.supportKnowledgeBase.update({
        where: { id: exist.id },
        data: k
      });
    } else {
      await prisma.supportKnowledgeBase.create({
        data: k
      });
    }
  }

  console.log('✅ Seeding Quick Replies dan Knowledge Base sukses!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

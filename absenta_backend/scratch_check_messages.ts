import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 [DIAGNOSE] Mengambil pesan-pesan bantuan terbaru dari database...');
  
  // Dapatkan tiket terakhir yang diperbarui
  const lastTicket = await prisma.supportTicket.findFirst({
    orderBy: { updated_at: 'desc' }
  });

  if (!lastTicket) {
    console.log('❌ [DIAGNOSE] Tidak ada tiket aduan ditemukan.');
    return;
  }

  console.log(`🎫 Tiket Ditemukan: "${lastTicket.title}" (${lastTicket.ticket_number})`);
  console.log(`   ID Tiket: ${lastTicket.id}`);
  console.log(`   Status: ${lastTicket.status} | Urgensi: ${lastTicket.priority}`);

  // Dapatkan semua pesan untuk tiket tersebut
  const messages = await prisma.supportTicketMessage.findMany({
    where: { ticket_id: lastTicket.id },
    include: {
      Sender: {
        select: {
          id: true,
          full_name: true,
          email: true,
          Role: {
             select: { name: true }
          }
        }
      }
    },
    orderBy: { created_at: 'asc' }
  });

  console.log(`\n💬 Jumlah pesan di database: ${messages.length}`);
  messages.forEach((msg, idx) => {
    console.log(`\n--- [PESAN ${idx + 1}] ---`);
    console.log(`    ID Pesan    : ${msg.id}`);
    console.log(`    Waktu       : ${msg.created_at.toLocaleString('id-ID')}`);
    console.log(`    Tipe        : ${msg.sender_type}`);
    console.log(`    Pengirim ID : ${msg.sender_id}`);
    console.log(`    Nama        : ${msg.Sender?.full_name || 'NULL'}`);
    console.log(`    Email       : ${msg.Sender?.email || 'NULL'}`);
    console.log(`    Peran       : ${msg.Sender?.Role?.name || 'NULL'}`);
    console.log(`    Pesan       : "${msg.message}"`);
  });
}

main()
  .catch(err => {
    console.error('💥 [DIAGNOSE-ERROR] Gagal menjalankan diagnosa:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { prisma } from '../utils/prisma';
import { BkKonsultasiService } from '../modules/bpbk/services/bk-konsultasi.service';

async function main() {
  console.log('--- STARTING BK KONSULTASI BOOKING TEST ---');

  // Mock waGatewayService.sendMessageSoft to avoid triggering Redis/BullMQ during local test
  const { waGatewayService } = require('../services/wa-gateway.service');
  waGatewayService.sendMessageSoft = async (tenantId: string, nomor: string, _pesan: string, source?: string) => {
    console.log(`[Mock-WA-Queue:${tenantId}] Enqueued message to ${nomor} (source: ${source})`);
  };

  // Find a tenant
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.error('No tenant found in DB');
    return;
  }
  console.log(`Using Tenant: ${tenant.name} (${tenant.id})`);

  // Find an OrangTua with active relation to a Siswa
  const ortuSiswa = await prisma.orangTuaSiswa.findFirst({
    include: {
      OrangTua: true,
      Siswa: true,
    },
  });

  if (!ortuSiswa) {
    console.error('No OrangTuaSiswa relation found in DB. Make sure you have seeded parents and students.');
    return;
  }

  const ortu = ortuSiswa.OrangTua;
  const siswa = ortuSiswa.Siswa;
  console.log(`Using Ortu: ${ortu.nama} (${ortu.id})`);
  console.log(`Using Student: ${siswa.nama_siswa} (${siswa.id})`);

  // Find a User that could act as Guru BK
  const guruBk = await prisma.user.findFirst({
    where: { tenant_id: tenant.id },
  });

  if (!guruBk) {
    console.error('No Guru BK (User) found in DB');
    return;
  }
  console.log(`Using Guru BK: ${guruBk.full_name} (${guruBk.id})`);

  // Clean up any existing bookings for this student to isolate the test
  await prisma.bkKonsultasiBooking.deleteMany({
    where: {
      tenant_id: tenant.id,
      ortu_id: ortu.id,
      siswa_id: siswa.id,
    }
  });

  // 1. Create a Booking
  console.log('\n--- 1. Creating a Booking (Orang Tua) ---');
  try {
    const booking = await BkKonsultasiService.createBooking(tenant.id, ortu.id, {
      siswa_id: siswa.id,
      guru_bk_id: guruBk.id,
      tanggal_booking: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      durasi_menit: 45,
      metode: 'ONLINE',
      perihal: 'Konsultasi masalah kedisiplinan dan absensi siswa.',
      catatan_ortu: 'Mohon info ketersediaan Google Meet.',
    });
    console.log('Booking successfully created:', {
      id: booking.id,
      status: booking.status,
      perihal: booking.perihal,
      tanggal: booking.tanggal_booking,
    });

    // 2. Fetch Orang Tua's Bookings
    console.log('\n--- 2. Fetching Bookings for Orang Tua ---');
    const myBookings = await BkKonsultasiService.getOrangTuaBookings(tenant.id, ortu.id);
    console.log(`Found ${myBookings.length} booking(s) for Ortu`);
    myBookings.forEach((b) => {
      console.log(`- Booking ID: ${b.id}, Student: ${b.Siswa.nama_siswa}, Status: ${b.status}`);
    });

    // 3. Update Booking Status (Guru BK - Confirm)
    console.log('\n--- 3. Confirming Booking (Guru BK) ---');
    const confirmed = await BkKonsultasiService.updateBookingStatus(tenant.id, booking.id, {
      status: 'DIKONFIRMASI',
      catatan_bk: 'Disetujui. Silakan gabung ke link berikut pada waktu yang dijadwalkan.',
      link_meeting: 'https://meet.google.com/abc-defg-hij',
    });
    console.log('Booking confirmed:', {
      id: confirmed.id,
      status: confirmed.status,
      catatan_bk: confirmed.catatan_bk,
      link: confirmed.link_meeting,
    });

    // 4. Update Booking Status (Guru BK - Complete)
    console.log('\n--- 4. Completing Sesi (Guru BK) ---');
    const completed = await BkKonsultasiService.updateBookingStatus(tenant.id, booking.id, {
      status: 'SELESAI',
      catatan_bk: 'Sesi konsultasi selesai dilaksanakan dengan baik.',
    });
    console.log('Booking status updated to SELESAI:', {
      id: completed.id,
      status: completed.status,
      catatan_bk: completed.catatan_bk,
    });

    // Clean up test booking
    await prisma.bkKonsultasiBooking.delete({ where: { id: booking.id } });
    console.log('\n--- Test cleanup completed successfully! ---');

  } catch (error: any) {
    console.error('Test execution failed:', error.message);
  }
}

main().catch(console.error);

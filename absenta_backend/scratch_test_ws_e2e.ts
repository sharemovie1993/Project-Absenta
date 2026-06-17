import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { io as ClientIO } from 'socket.io-client';
import axios from 'axios';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';

async function main() {
  console.log('🏁 [TEST-WS] Memulai simulasi E2E WebSocket Chat...');

  // 1. Ambil User Superadmin
  const superadmin = await prisma.user.findFirst({
    where: { email: 'superadmin@system.com' },
    include: { Role: true }
  });
  if (!superadmin) {
    console.error('❌ User superadmin tidak ditemukan.');
    return;
  }

  // 2. Ambil User Sekolah (Klien)
  const schoolUser = await prisma.user.findFirst({
    where: { 
      email: { not: 'superadmin@system.com' }, 
      tenant_id: { not: 'system' },
      Role: { name: 'ADMIN' }
    },
    include: { Role: true }
  });
  if (!schoolUser) {
    console.error('❌ User sekolah dengan role ADMIN tidak ditemukan.');
    return;
  }

  console.log('👤 Superadmin:', superadmin.email, 'Role:', (superadmin as any).Role?.name);
  console.log('👤 School User:', schoolUser.email, 'Role:', (schoolUser as any).Role?.name, 'Tenant:', schoolUser.tenant_id);

  // 3. Generate token JWT untuk keduanya
  const saToken = jwt.sign({
    id: superadmin.id,
    email: superadmin.email,
    tenantId: superadmin.tenant_id,
    roleId: (superadmin as any).Role.id,
    roleName: (superadmin as any).Role.name,
    exp: Math.floor(Date.now() / 1000) + 600
  }, JWT_SECRET);

  const schoolToken = jwt.sign({
    id: schoolUser.id,
    email: schoolUser.email,
    tenantId: schoolUser.tenant_id,
    roleId: (schoolUser as any).Role.id,
    roleName: (schoolUser as any).Role.name,
    exp: Math.floor(Date.now() / 1000) + 600
  }, JWT_SECRET);

  // 4. Hubungkan Client WebSocket Superadmin
  const saSocket = ClientIO('http://localhost:3001', {
    auth: { token: saToken },
    path: '/socket.io',
    transports: ['polling']
  });

  let messageReceived = false;

  saSocket.on('connect', () => {
    console.log('🔌 [TEST-WS] Superadmin WebSocket connected!');
  });

  saSocket.on('support:message', (data: any) => {
    console.log('🔔 [TEST-WS] Superadmin RECEIVED support:message!', data);
    messageReceived = true;
  });

  saSocket.on('connect_error', (err: any) => {
    console.error('❌ [TEST-WS] Superadmin connect_error:', err.message);
  });

  // Tunggu agar koneksi WebSocket mantap
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 5. Kirim pesan baru dari Sekolah menggunakan API REST
  console.log('📨 [TEST-WS] Memicu sekolah mengirim pesan baru ke tiket...');
  
  // Ambil atau buat tiket untuk sekolah ini
  let ticket = await prisma.supportTicket.findFirst({
    where: { tenant_id: schoolUser.tenant_id }
  });

  if (!ticket) {
    ticket = await prisma.supportTicket.create({
      data: {
        ticket_number: 'TKT-TEST-9999',
        tenant_id: schoolUser.tenant_id,
        creator_id: schoolUser.id,
        title: 'Tiket Uji Coba Real-Time',
        description: 'Mencoba real-time websocket',
        category: 'TECHNICAL',
        priority: 'MEDIUM',
        status: 'OPEN'
      }
    });
  }

  console.log('🎫 Tiket Target:', ticket.ticket_number, 'ID:', ticket.id);

  try {
    const res = await axios.post(`http://localhost:3001/api/support/${ticket.id}/messages`, {
      message: 'Halo CS, mohon bantuannya secara real-time!',
      attachments: []
    }, {
      headers: {
        Authorization: `Bearer ${schoolToken}`,
        'x-tenant-host': 'localhost'
      }
    });
    
    console.log('✅ Response API Kirim Pesan:', res.data);
  } catch (err: any) {
    console.error('❌ Gagal mengirim pesan via API:', err.response?.data || err.message);
  }

  // Tunggu 5 detik untuk menerima event real-time
  console.log('⏳ Menunggu event real-time di sisi Superadmin...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  if (messageReceived) {
    console.log('🎉 SUCCESS: Komunikasi WebSocket Real-time Superadmin BERHASIL 100%!');
  } else {
    console.error('🔴 FAILED: Komunikasi WebSocket Real-time Superadmin GAGAL. Pesan tidak diterima.');
  }

  saSocket.disconnect();
  await prisma.$disconnect();
}

main().catch(err => console.error(err));

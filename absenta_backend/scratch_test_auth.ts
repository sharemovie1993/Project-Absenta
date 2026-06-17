import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const prisma = new PrismaClient();
const JWT_SECRET = 'your-super-secret-jwt-key-here';

async function run() {
  const u = await prisma.user.findFirst({
    where: { email: 'firman@gmail.com' },
    include: { Role: true }
  });
  if (!u) {
    console.log('User not found');
    return;
  }

  const payload = {
    id: u.id,
    email: u.email,
    tenantId: u.tenant_id,
    roleId: u.Role.id,
    roleName: u.Role.name,
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  const token = jwt.sign(payload, JWT_SECRET);
  console.log('Generated Token for firman@gmail.com:', token);

  try {
    const res = await axios.get('http://localhost:3001/api/attendance/gerbang/not-present', {
      params: { tanggal: '2026-05-19' },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Success:', res.data);
  } catch (err: any) {
    console.log('Error Status:', err.response?.status);
    console.log('Error Data:', err.response?.data);
  }
}

run().finally(() => prisma.$disconnect());

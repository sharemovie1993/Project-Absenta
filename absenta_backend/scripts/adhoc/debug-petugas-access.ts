
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeys'; // Ensure this matches your .env

async function main() {
  console.log('🔍 Debugging Petugas Access for ADMIN (nepur@gmail.com)...');

  // 1. Find User
  const user = await prisma.user.findFirst({
    where: { email: 'nepur@gmail.com' },
    include: { Role: true }
  });

  if (!user) {
    console.error('❌ User nepur@gmail.com not found in database.');
    return;
  }

  // Type assertion or check to ensure Role exists (Prisma include sometimes needs help in scripts)
  const roleName = user.Role ? user.Role.name : 'UNKNOWN';

  console.log(`✅ Found User: ${user.email} (ID: ${user.id})`);
  console.log(`   Role: ${roleName}`);
  console.log(`   Tenant: ${user.tenant_id}`);

  // 2. Generate Token (Mimic auth.service.ts)
  const payload = {
    userId: user.id,
    roleName: roleName,
    tenantId: user.tenant_id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  };

  const token = jwt.sign(payload, JWT_SECRET);
  console.log('🎫 Generated Token for ADMIN');

  // 3. Test Endpoint
  try {
    console.log('🚀 Testing GET http://localhost:3000/api/attendance/petugas...');
    const res = await axios.get('http://localhost:3000/api/attendance/petugas', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': user.tenant_id // Important for tenantMiddleware
      }
    });

    console.log(`✅ Status: ${res.status} ${res.statusText}`);
    console.log('📦 Data:', JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    console.error('❌ Request Failed!');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

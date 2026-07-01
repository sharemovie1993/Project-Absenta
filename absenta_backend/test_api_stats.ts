import axios from 'axios';
import { prisma } from './src/utils/prisma';

async function main() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        tenant_id: 'c2998880-ef62-43b7-8c85-2cc855a84d26',
        email: { contains: '@' }
      },
      select: {
        email: true
      }
    });

    if (!user) {
      console.log('No user found');
      return;
    }

    // Let's call the API directly using axios on port 3003 (PM2 endpoint)
    // We will bypass actual login if we want, or do login with default password 'admin1234'
    const loginRes = await axios.post('http://localhost:3003/api/auth/login', {
      email: 'neple@gmail.com',
      password: 'admin1234'
    });

    const token = loginRes.data.data.token;
    const statsRes = await axios.get('http://localhost:3003/api/academic/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('API RESPONSE STATS:');
    console.log(JSON.stringify(statsRes.data, null, 2));

  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

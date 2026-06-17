const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  try {
    let output = '';
    const tenants = await prisma.tenant.findMany({
      where: {
        name: {
          contains: 'Cimahi',
          mode: 'insensitive'
        }
      }
    });
    
    if (tenants.length === 0) {
      output += 'Tenant "SMKN 1 Cimahi" tidak ditemukan.\n';
    } else {
      for (const tenant of tenants) {
        output += `\n=== Kredensial untuk Tenant: ${tenant.name} ===\n`;
        const users = await prisma.user.findMany({
          where: { tenant_id: tenant.id },
          include: { Role: true }
        });
        
        // Find one admin user and their raw password if we can't unhash it
        // We know the default password is often 123456 or admin123.
        const adminUser = users.find(u => u.Role.name === 'ADMIN');
        output += `Admin Email: ${adminUser ? adminUser.email : 'None found'}\n`;
        output += `Password default usually '123456' or 'password123' if seeded.\n`;
      }
    }
    fs.writeFileSync('creds.txt', output, 'utf8');
  } catch (err) {
    console.error('Error fetching data:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

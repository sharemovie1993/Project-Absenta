import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    console.log('🔧 Creating SUPERADMIN role, system tenant, and user...');

    // Create system tenant for SUPERADMIN
    let systemTenant = await prisma.tenant.findFirst({
      where: { name: 'System' }
    });

    if (!systemTenant) {
      systemTenant = await prisma.tenant.create({
        data: {
          id: randomUUID(),
          name: 'System',
          status: 'ACTIVE',
        },
      });
    }

    console.log('✅ System tenant ready:', systemTenant);

    // Create SUPERADMIN role if it doesn't exist
    let superAdminRole = await prisma.role.findFirst({
      where: { name: 'SUPERADMIN' }
    });

    if (!superAdminRole) {
      superAdminRole = await prisma.role.create({
        data: {
          id: randomUUID(),
          name: 'SUPERADMIN',
          description: 'Super Administrator with full system access',
        },
      });
    }

    console.log('✅ SUPERADMIN role ready:', superAdminRole);

    // Resolve email & password from env (with defaults)
    const email = process.env.SUPERADMIN_EMAIL || 'superadmin@system.com';
    const plainPassword = process.env.SUPERADMIN_PASSWORD || 'superadmin123';

    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Create SUPERADMIN user
    const superAdminUser = await prisma.user.upsert({
      where: { 
        tenant_id_email: {
          tenant_id: systemTenant.id,
          email: email
        }
      },
      update: {
        password: hashedPassword,
        full_name: 'Super Administrator',
        role_id: superAdminRole.id,
        tenant_id: systemTenant.id,
        status: 'ACTIVE',
        email_verified: true,
      },
      create: {
        id: randomUUID(),
        email: email,
        password: hashedPassword,
        full_name: 'Super Administrator',
        role_id: superAdminRole.id,
        tenant_id: systemTenant.id,
        status: 'ACTIVE',
        email_verified: true,
      },
    });

    console.log('✅ SUPERADMIN user created:', {
      id: superAdminUser.id,
      email: superAdminUser.email,
      full_name: superAdminUser.full_name,
      role_id: superAdminUser.role_id,
      tenant_id: superAdminUser.tenant_id,
    });

    console.log('\n🎯 SUPERADMIN credentials:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${plainPassword}`);
    console.log('Tenant ID: (leave empty)');

  } catch (error) {
    console.error('❌ Error creating SUPERADMIN:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();

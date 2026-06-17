
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import path from 'path';

const prisma = new PrismaClient();

async function runPrismaSeed() {
  console.log('➡️  Menjalankan: npx prisma db seed');
  const projectRoot = path.resolve(__dirname, '../../');
  await new Promise<void>((resolve, reject) => {
    const child = exec('npx prisma db seed', { cwd: projectRoot, env: process.env, windowsHide: true }, (error, stdout, stderr) => {
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
    child.on('exit', (code) => {
      if (code === 0) {
        console.log('🌱 Prisma db seed selesai.');
      }
    });
  });
}

async function main() {
  console.log('Starting truncation of Billing and Subscription related tables...');
  
  try {
    // Truncate tables with CASCADE to handle foreign key constraints
    // This will clear all data in these tables and any tables that reference them
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE 
        "Subscription", 
        "Billing", 
        "Invoice", 
        "Payment", 
        "SubscriptionHistory", 
        "PlanChangeRequest",
        "RefundRecord"
      CASCADE;
    `);
    
    console.log('✅ Successfully truncated: Subscription, Billing, Invoice, Payment, SubscriptionHistory, PlanChangeRequest, RefundRecord');
  } catch (error) {
    console.error('❌ Error executing truncate:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  // Jalankan prisma db seed setelah truncate selesai dan koneksi prisma ditutup
  try {
    await runPrismaSeed();
  } catch (e) {
    console.error('❌ Gagal menjalankan prisma db seed:', e);
    process.exit(1);
  }
}

main();

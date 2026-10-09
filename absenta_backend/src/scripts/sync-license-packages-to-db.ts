import { prisma } from '../utils/prisma';
import axios from 'axios';

async function syncLicensePackages() {
  const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
  console.log(`[SyncPackages] Mengambil paket resmi dari ${LICENSE_SERVER_URL}/api/license/packages?product_id=cakola ...`);

  try {
    const res = await axios.get(`${LICENSE_SERVER_URL}/api/license/packages?product_id=cakola`, { timeout: 10000 });
    if (!res.data?.success || !Array.isArray(res.data.data)) {
      throw new Error('Format response dari server lisensi tidak valid.');
    }

    const packages = res.data.data;
    console.log(`[SyncPackages] Ditemukan ${packages.length} paket resmi dari Server Lisensi.`);

    let createdCount = 0;
    let updatedCount = 0;

    for (const pkg of packages) {
      const planId = pkg.id;
      const planName = pkg.name || pkg.title || planId;
      const moduleId = pkg.module_id || 'CORE';

      // Pastikan Module induk ada di database
      if (moduleId) {
        await prisma.module.upsert({
          where: { id: moduleId },
          update: {
            name: moduleId === 'PAKET_LENGKAP' ? 'PAKET LENGKAP' : moduleId,
            is_active: true
          },
          create: {
            id: moduleId,
            name: moduleId === 'PAKET_LENGKAP' ? 'PAKET LENGKAP' : moduleId,
            description: `Modul resmi ${moduleId}`,
            is_active: true
          }
        });
      }

      let features = pkg.features_json;
      if (typeof features === 'string') {
        try { features = JSON.parse(features); } catch { features = []; }
      }

      const priceMonthly = pkg.price_monthly || 0;
      const priceYearly = pkg.price_yearly ?? null;
      const period = pkg.billing_period === 'YEAR' ? 'YEAR' : 'MONTH';

      // Upsert ke tabel Plan
      const existing = await prisma.plan.findUnique({ where: { id: planId } });
      const planData: any = {
        name: planName,
        code: planId,
        service_code: pkg.service_code || moduleId,
        module_id: moduleId,
        price_monthly: priceMonthly,
        price_yearly: priceYearly,
        max_user: pkg.device_limit ?? pkg.max_user ?? null,
        features_json: features || [],
        description: pkg.description ?? null,
        billing_period: period,
        currency: 'IDR',
        is_active: true,
        size_label: pkg.size_label ?? null,
        tier: pkg.size_label ?? null,
        metadata: pkg.metadata ?? null
      };

      if (existing) {
        await prisma.plan.update({
          where: { id: planId },
          data: planData
        });
        updatedCount++;
      } else {
        await prisma.plan.create({
          data: {
            id: planId,
            ...planData
          }
        });
        createdCount++;
      }
    }

    console.log(`[SyncPackages] ✅ Sukses! Dibuat: ${createdCount}, Diperbarui: ${updatedCount}, Total: ${packages.length} paket.`);
  } catch (err: any) {
    console.error(`[SyncPackages] ❌ Gagal:`, err.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncLicensePackages();

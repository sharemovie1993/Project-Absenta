import { prisma } from '@/utils/prisma';

export const DEFAULT_JENIS_PELANGGARAN = [
  { kategori: "Pelanggaran Ringan", nama_pelanggaran: "Terlambat Masuk Sekolah", poin: 5 },
  { kategori: "Pelanggaran Ringan", nama_pelanggaran: "Atribut Seragam Tidak Lengkap", poin: 5 },
  { kategori: "Pelanggaran Ringan", nama_pelanggaran: "Rambut Panjang/Tidak Rapi (Pria)", poin: 5 },
  { kategori: "Pelanggaran Ringan", nama_pelanggaran: "Membuang Sampah Sembarangan", poin: 5 },
  { kategori: "Pelanggaran Ringan", nama_pelanggaran: "Gaduh di Kelas", poin: 5 },
  { kategori: "Pelanggaran Ringan", nama_pelanggaran: "Tidak Mengerjakan PR", poin: 10 },
  
  { kategori: "Pelanggaran Sedang", nama_pelanggaran: "Bolos Pelajaran", poin: 20 },
  { kategori: "Pelanggaran Sedang", nama_pelanggaran: "Merokok di Lingkungan Sekolah", poin: 30 },
  { kategori: "Pelanggaran Sedang", nama_pelanggaran: "Menggunakan HP saat KBM (Tanpa Izin)", poin: 15 },
  { kategori: "Pelanggaran Sedang", nama_pelanggaran: "Merusak Fasilitas Sekolah (Ringan)", poin: 25 },
  { kategori: "Pelanggaran Sedang", nama_pelanggaran: "Mencoret-coret Dinding/Meja", poin: 15 },
  { kategori: "Pelanggaran Sedang", nama_pelanggaran: "Berkata Kasar/Kotor", poin: 20 },
  
  { kategori: "Pelanggaran Berat", nama_pelanggaran: "Berkelahi / Tawuran", poin: 75 },
  { kategori: "Pelanggaran Berat", nama_pelanggaran: "Membawa Senjata Tajam", poin: 100 },
  { kategori: "Pelanggaran Berat", nama_pelanggaran: "Membawa/Menggunakan Narkoba & Miras", poin: 100 },
  { kategori: "Pelanggaran Berat", nama_pelanggaran: "Bullying / Perundungan", poin: 75 },
  { kategori: "Pelanggaran Berat", nama_pelanggaran: "Mencuri", poin: 50 },
  { kategori: "Pelanggaran Berat", nama_pelanggaran: "Tindakan Asusila", poin: 100 }
];

export async function seedDefaultJenisPelanggaranForTenant(tenantId: string) {
  try {
    const count = await prisma.jenisPelanggaran.count({ where: { tenant_id: tenantId } });
    if (count > 0) return;

    await prisma.jenisPelanggaran.createMany({
      data: DEFAULT_JENIS_PELANGGARAN.map(d => ({
        ...d,
        tenant_id: tenantId
      }))
    });
    console.info(`[SEED] Jenis Pelanggaran seeded for tenant ${tenantId}`);
  } catch (error) {
    console.error(`[SEED] Failed to seed Jenis Pelanggaran for tenant ${tenantId}:`, error);
  }
}

export async function getAllJenisPelanggaran(tenantId: string) {
  return prisma.jenisPelanggaran.findMany({
    where: { tenant_id: tenantId },
    orderBy: { poin: 'asc' }
  });
}

export async function createJenisPelanggaran(
  tenantId: string,
  input: { kategori: string; nama_pelanggaran: string; poin: number }
) {
  return prisma.jenisPelanggaran.create({
    data: {
      tenant_id: tenantId,
      kategori: input.kategori,
      nama_pelanggaran: input.nama_pelanggaran,
      poin: input.poin
    }
  });
}

export async function updateJenisPelanggaran(
  tenantId: string,
  id: string,
  input: { kategori?: string; nama_pelanggaran?: string; poin?: number }
) {
  return prisma.jenisPelanggaran.updateMany({
    where: { id, tenant_id: tenantId },
    data: {
      ...(typeof input.kategori !== 'undefined' ? { kategori: input.kategori } : {}),
      ...(typeof input.nama_pelanggaran !== 'undefined' ? { nama_pelanggaran: input.nama_pelanggaran } : {}),
      ...(typeof input.poin !== 'undefined' ? { poin: input.poin } : {})
    }
  });
}

export async function deleteJenisPelanggaran(tenantId: string, id: string) {
  return prisma.jenisPelanggaran.deleteMany({
    where: { id, tenant_id: tenantId }
  });
}

export async function countJenisPelanggaran(tenantId: string) {
  return prisma.jenisPelanggaran.count({ where: { tenant_id: tenantId } });
}

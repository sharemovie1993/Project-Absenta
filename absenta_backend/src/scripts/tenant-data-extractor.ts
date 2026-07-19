import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env variables
dotenv.config();

const prisma = new PrismaClient();

const ALGORITHM = 'aes-256-gcm';
const SECRET = process.env.BACKUP_SIGNING_SECRET || 'default-secure-backup-signing-secret-key-123';

function encrypt(text: string): { iv: string; content: string; tag: string } {
  // Ensure secret is 32 bytes
  const key = crypto.createHash('sha256').update(SECRET).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag().toString('hex');
  
  return {
    iv: iv.toString('hex'),
    content: encrypted,
    tag: tag
  };
}

async function extractTenantData(tenantId: string) {
  console.log(`Starting data extraction for Tenant: ${tenantId}...`);

  // List of prisma models to extract that are tenant-scoped
  // Maps schema model name to Prisma Client API method name
  const modelsToExport: Record<string, string> = {
    'Tenant': 'tenant',
    'TenantBackup': 'tenantBackup',
    'StudentCardConfig': 'studentCardConfig',
    'JenisPelanggaran': 'jenisPelanggaran',
    'PelanggaranSiswa': 'pelanggaranSiswa',
    'SupervisiGuru': 'supervisiGuru',
    'User': 'user',
    'Role': 'role',
    'Jurusan': 'jurusan',
    'Kelas': 'kelas',
    'Guru': 'guru',
    'Mapel': 'mapel',
    'TahunPelajaran': 'tahunPelajaran',
    'Semester': 'semester',
    'Siswa': 'siswa',
    'SiswaDocument': 'siswaDocument',
    'SesiAbsensi': 'sesiAbsensi',
    'SiswaAkademik': 'siswaAkademik',
    'AbsenGuru': 'absenGuru',
    'AbsenSiswa': 'absenSiswa',
    'Sekolah': 'sekolah',
    'MasterSekolah': 'masterSekolah',
    'SesiGerbang': 'sesiGerbang',
    'AbsenGerbangSiswa': 'absenGerbangSiswa',
    'SiswaFaceTemplate': 'siswaFaceTemplate',
    'JenisKegiatanMaster': 'jenisKegiatanMaster',
    'Config': 'config',
    'ActivityLog': 'activityLog',
    'SystemEventLog': 'systemEventLog',
    'AuditLogArchive': 'auditLogArchive',
    'AggregatedMetricDaily': 'aggregatedMetricDaily',
    'QueueJobLog': 'queueJobLog',
    'ObservabilityMetric': 'observabilityMetric',
    'AlertLog': 'alertLog',
    'Document': 'document',
    'DocumentVersion': 'documentVersion',
    'DocumentActivity': 'documentActivity',
    'GuruMapel': 'guruMapel',
    'KelasMapel': 'kelasMapel',
    'OrangTua': 'orangTua',
    'OrangTuaSiswa': 'orangTuaSiswa',
    'SystemConfig': 'systemConfig',
    'ConsentLog': 'consentLog',
    'JadwalKBM': 'jadwalKBM',
    'StrukturKurikulum': 'strukturKurikulum',
    'ProgresMateri': 'progresMateri',
    'AbsensiKejadianKhusus': 'absensiKejadianKhusus',
    'ParentPushSubscription': 'parentPushSubscription',
    'Member': 'member',
    'SavingCategory': 'savingCategory',
    'Saving': 'saving',
    'SavingTransaction': 'savingTransaction',
    'Loan': 'loan',
    'Installment': 'installment',
    'Account': 'account',
    'Journal': 'journal',
    'JournalItem': 'journalItem',
    'Product': 'product',
    'ProductCategory': 'productCategory',
    'CoopStockIn': 'coopStockIn',
    'CoopStockInItem': 'coopStockInItem',
    'CoopStockOpname': 'coopStockOpname',
    'CoopStockOpnameItem': 'coopStockOpnameItem',
    'Sale': 'sale',
    'SaleItem': 'saleItem',
    'Announcement': 'announcement',
    'Voucher': 'voucher',
    'CoopPointTransaction': 'coopPointTransaction',
    'Ticket': 'ticket',
    'TicketMessage': 'ticketMessage',
    'PPOBProduct': 'ppobProduct',
    'PPOBTransaction': 'ppobTransaction',
    'ShuConfig': 'shuConfig',
    'ShuPeriod': 'shuPeriod',
    'ShuAllocation': 'shuAllocation',
    'MitraIndustri': 'mitraIndustri',
    'HubinMoUHistory': 'hubinMoUHistory',
    'HubinLowongan': 'hubinLowongan',
    'HubinLamaran': 'hubinLamaran',
    'HubinLamaranLog': 'hubinLamaranLog',
    'WaTenantConnection': 'waTenantConnection',
    'HubinTracerStudy': 'hubinTracerStudy',
    'HubinTefaOrder': 'hubinTefaOrder',
    'SiswaPkl': 'siswaPkl',
    'AbsensiPkl': 'absensiPkl',
    'IzinKeluarSiswa': 'izinKeluarSiswa',
    'SarprasCategory': 'sarprasCategory',
    'SarprasLocation': 'sarprasLocation',
    'SarprasAsset': 'sarprasAsset',
    'SarprasLoan': 'sarprasLoan',
    'SarprasAssetRepair': 'sarprasAssetRepair',
    'SuratMasuk': 'suratMasuk',
    'SuratKeluar': 'suratKeluar',
    'AttendanceDevice': 'attendanceDevice',
    'WhatsappConfig': 'whatsappConfig',
    'SupportTicket': 'supportTicket',
    'SupportTicketMessage': 'supportTicketMessage',
    'SupportQuickReply': 'supportQuickReply',
    'SupportKnowledgeBase': 'supportKnowledgeBase',
    'JenisPrestasi': 'jenisPrestasi',
    'PrestasiSiswa': 'prestasiSiswa',
    'KonselingSiswa': 'konselingSiswa',
    'PemanggilanOrangTua': 'pemanggilanOrangTua',
    'HomeVisit': 'homeVisit',
    'AsesmenSiswa': 'asesmenSiswa',
    'RujukanKasus': 'rujukanKasus',
    'KasusBK': 'kasusBK',
    'EwsSnapshot': 'ewsSnapshot',
    'BullyingReport': 'bullyingReport'
  };

  const exportedData: Record<string, any[]> = {};
  const summary: Record<string, number> = {};

  for (const [modelName, prismaMethod] of Object.entries(modelsToExport)) {
    try {
      const client = prisma as any;
      if (!client[prismaMethod]) {
        continue;
      }

      let records = [];
      if (modelName === 'Tenant') {
        records = await client[prismaMethod].findMany({
          where: { id: tenantId }
        });
      } else {
        // Try querying by tenant_id first, fallback to tenantId if it errors
        try {
          records = await client[prismaMethod].findMany({
            where: { tenant_id: tenantId }
          });
        } catch (err: any) {
          if (err.message && (err.message.includes('Unknown argument `tenant_id`') || err.message.includes('tenant_id'))) {
            try {
              records = await client[prismaMethod].findMany({
                where: { tenantId: tenantId }
              });
            } catch (innerErr: any) {
              // Model does not have a tenant_id or tenantId filter, skip silently
              continue;
            }
          } else {
            continue;
          }
        }
      }

      if (records.length > 0) {
        exportedData[modelName] = records;
        summary[modelName] = records.length;
      }
    } catch (error: any) {
      // Catch any unexpected model errors
    }
  }

  // Generate output JSON
  const outputPayload = JSON.stringify({
    tenantId,
    exportedAt: new Date().toISOString(),
    schemaVersion: '1.0.0',
    data: exportedData,
    summary
  }, null, 2);

  // Encrypt payload
  console.log('Encrypting exported data...');
  const encryptedPayload = encrypt(outputPayload);

  // Write to file
  const exportDir = path.join(__dirname, '..', '..', 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const outputFilePath = path.join(exportDir, `tenant_${tenantId}_export.json.enc`);
  fs.writeFileSync(outputFilePath, JSON.stringify(encryptedPayload, null, 2));

  console.log(`\n=== Extraction Summary for Tenant ${tenantId} ===`);
  console.table(summary);
  console.log(`\nSuccessfully written encrypted backup to: ${outputFilePath}`);
}

// Read tenant ID from command line arguments
const args = process.argv.slice(2);
const targetTenantId = args[0];

if (!targetTenantId) {
  console.error('Error: Please provide a Tenant ID as the first argument.');
  console.error('Example: npx ts-node tenant-data-extractor.ts <tenant-uuid>');
  process.exit(1);
}

extractTenantData(targetTenantId)
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

import { prisma } from '../utils/prisma';
import { PerangkatAjarService } from '../modules/kurikulum/services/perangkat-ajar.service';

async function main() {
  console.log('🧪 Testing PerangkatAjar saving...');
  const tenant = await prisma.tenant.findFirst();
  const mapel = await prisma.mapel.findFirst({ where: { tenant_id: tenant?.id } });
  const year = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenant?.id }, include: { Semester: true } });
  const guru = await prisma.guru.findFirst({ where: { tenant_id: tenant?.id } });

  if (!tenant || !mapel || !year || !guru) {
    console.error('Missing prerequisites:', { tenant: !!tenant, mapel: !!mapel, year: !!year, guru: !!guru });
    return;
  }

  const created = await PerangkatAjarService.uploadPerangkat(tenant.id, {
    guru_id: guru.id,
    mapel_id: mapel.id,
    tahun_pelajaran_id: year.id,
    semester_id: year.Semester[0]?.id || year.id,
    judul: 'Modul Ajar AI Test Integration',
    jenis: 'MODUL_AJAR',
    file_url: 'perangkat-ajar/test_ai_doc.pdf'
  });

  console.log('✅ TEST SAVE SUCCESSFUL! Item Created:', created);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

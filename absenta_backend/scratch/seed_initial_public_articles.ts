import { prisma } from '../src/utils/prisma';

async function seed() {
  const tenantId = '8535b49c-d3fc-4598-922a-7774b49ee7c5'; // SMKN 1 Plered

  console.log('Seeding initial public articles for SMKN 1 Plered...');

  const sampleArticles = [
    {
      id: 'art-1',
      tenant_id: tenantId,
      slug: 'smkn-1-plered-raih-juara-lks-provinsi-2026',
      title: 'SMKN 1 Plered Raih Juara 1 Lomba Kompetensi Siswa (LKS) Tingkat Provinsi',
      excerpt: 'Siswa jurusan Teknik Otomasi Industri dan TKJ berhasil memboyong medali emas pada ajang LKS tingkat Provinsi Jawa Barat tahun 2026.',
      content: `
        <p>Prestasi membanggakan kembali diukir oleh civitas akademika <strong>SMKN 1 Plered - Purwakarta</strong>. Dalam perhelatan bergengsi Lomba Kompetensi Siswa (LKS) SMK Tingkat Provinsi Jawa Barat yang ditutup kemarin, kontingen SMKN 1 Plered sukses meraih juara pertama pada bidang kompetensi Industrial Automation dan Cloud Computing.</p>
        <p>Kepala SMKN 1 Plered menyampaikan apresiasi setinggi-tingginya kepada seluruh pembimbing dan siswa atas kerja keras dan kedisiplinan selama berbulan-bulan masa pelatihan intensif.</p>
        <blockquote>"Kemenangan ini adalah bukti nyata bahwa kolaborasi antara kurikulum industri, sarana prasarana modern, dan dedikasi guru menghasilkan lulusan yang berdaya saing tinggi," ujar beliau.</blockquote>
        <p>Dengan capaian ini, perwakilan siswa akan mewakili Provinsi Jawa Barat pada ajang LKS Nasional mendatang. Mohon doa dan dukungan dari seluruh keluarga besar sekolah serta masyarakat.</p>
      `,
      cover_image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
      category: 'PRESTASI',
      author_name: 'Humas SMKN 1 Plered',
      published_at: new Date(),
      is_published: true,
      views_count: 142,
    },
    {
      id: 'art-2',
      tenant_id: tenantId,
      slug: 'informasi-ppdb-smkn-1-plered-2026-2027',
      title: 'Informasi Resmi Penerimaan Peserta Didik Baru (PPDB) Tahun Ajaran 2026/2027',
      excerpt: 'Panduan lengkap alur pendaftaran, kuota 9 kompetensi keahlian, dan persyaratan berkas PPDB tahun pelajaran 2026/2027.',
      content: `
        <p>SMKN 1 Plered membuka pendaftaran peserta didik baru (PPDB) Tahun Ajaran 2026/2027 untuk 9 Program Keahlian unggulan:</p>
        <ul>
          <li>Teknik Komputer dan Jaringan (TKJ)</li>
          <li>Teknik Otomasi Industri (TOI)</li>
          <li>Teknik Pemesinan (TP)</li>
          <li>Teknik Kendaraan Ringan (TKR)</li>
          <li>Teknik Sepeda Motor (TSM)</li>
          <li>Teknik Audio Video (TAV)</li>
          <li>Akuntansi dan Keuangan Lembaga (AKL)</li>
          <li>Kuliner (Tata Boga)</li>
          <li>Perhotelan</li>
        </ul>
        <p>Pendaftaran dilaksanakan secara daring melalui sistem resmi terintegrasi. Calon pendaftar diimbau menyiapkan berkas kelulusan SMP/MTs, Kartu Keluarga, dan sertifikat prestasi (jika ada).</p>
      `,
      cover_image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
      category: 'PENGUMUMAN',
      author_name: 'Panitia PPDB 2026',
      published_at: new Date(Date.now() - 86400000 * 2),
      is_published: true,
      views_count: 538,
    },
    {
      id: 'art-3',
      tenant_id: tenantId,
      slug: 'rekrutmen-terbuka-bkk-mitra-industri-otomotif',
      title: 'Rekrutmen Terbuka PT Astra Honda Motor Melalui BKK SMKN 1 Plered',
      excerpt: 'Peluang karir langsung bagi alumni dan siswa tingkat akhir jurusan TSM, TKR, dan Pemesinan untuk bergabung dengan industri manufaktur.',
      content: `
        <p>Bursa Kerja Khusus (BKK) SMKN 1 Plered bekerja sama dengan <strong>PT Astra Honda Motor</strong> menyelenggarakan rekrutmen tenaga kerja industri bagi lulusan SMK tahun 2025 dan 2026.</p>
        <p>Proses seleksi meliputi psikotes, tes fisik, dan wawancara langsung oleh tim HRD industri di aula serbaguna SMKN 1 Plered. Kuota penerimaan mencapai 150 tenaga kerja terampil.</p>
        <p>Bagi alumni yang berminat, silakan mendaftar melalui laman BKK atau menghubungi ruang sekretariat Hubin sekolah.</p>
      `,
      cover_image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80',
      category: 'BERITA',
      author_name: 'Bursa Kerja Khusus (BKK)',
      published_at: new Date(Date.now() - 86400000 * 4),
      is_published: true,
      views_count: 312,
    },
  ];

  for (const art of sampleArticles) {
    await (prisma as any).publicSchoolArticle.upsert({
      where: {
        tenant_id_slug: {
          tenant_id: art.tenant_id,
          slug: art.slug,
        },
      },
      create: art,
      update: art,
    });
    console.log(`✅ Upserted article: "${art.title}"`);
  }

  console.log('Seeding completed successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

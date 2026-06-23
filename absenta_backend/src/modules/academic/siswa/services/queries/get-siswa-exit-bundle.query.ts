import { prisma } from '@/utils/prisma';
import puppeteer from 'puppeteer';
const AdmZip = require('adm-zip');
import { storageService } from '@/infra/storage/storage.service';
import { Readable } from 'stream';

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: any[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export async function getSiswaExitBundleQuery(params: {
  tenantId: string;
  siswaId: string;
}) {
  const { tenantId, siswaId } = params;

  // 1. Fetch student detail
  const student = await prisma.siswa.findFirst({
    where: { id: siswaId, tenant_id: tenantId },
    include: {
      Kelas: true,
      TahunPelajaran: true,
      Semester: true
    }
  });

  if (!student) {
    throw new Error('Siswa tidak ditemukan');
  }

  // 2. Fetch school (Sekolah)
  const sekolah = await prisma.sekolah.findFirst({
    where: { tenant_id: tenantId },
    orderBy: { updated_at: 'desc' }
  });

  // 3. Fetch violations
  const violations = await prisma.pelanggaranSiswa.findMany({
    where: { siswa_id: siswaId, tenant_id: tenantId },
    orderBy: { tanggal: 'asc' }
  });

  // 4. Fetch documents
  const documents = await prisma.siswaDocument.findMany({
    where: { siswa_id: siswaId, tenant_id: tenantId },
    include: {
      UploadedBy: { select: { full_name: true } }
    },
    orderBy: { created_at: 'asc' }
  });

  const totalPoints = violations.reduce((acc, curr) => acc + curr.poin, 0);

  // 5. Generate Dossier HTML
  const dateStr = new Date().toISOString().slice(0, 10);
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Dossier Keluar Siswa</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #333; margin: 0; padding: 24px; line-height: 1.4; }
      .header { border-bottom: 2px solid #1e3c72; padding-bottom: 12px; margin-bottom: 20px; }
      .header-title { font-size: 16px; font-weight: bold; color: #1e3c72; text-transform: uppercase; margin: 0; }
      .header-school { font-size: 13px; font-weight: bold; margin: 4px 0 0; }
      .header-sub { color: #666; font-size: 9px; margin-top: 2px; }
      .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 18px 0 8px; color: #1e3c72; }
      .grid { display: flex; flex-wrap: wrap; gap: 12px; }
      .grid-col { flex: 1; min-width: 200px; }
      .meta-item { display: flex; margin-bottom: 4px; }
      .meta-label { font-weight: bold; width: 120px; color: #555; }
      .meta-val { flex: 1; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
      th { background-color: #f8fafc; font-weight: bold; color: #475569; }
      .poin-badge { font-weight: bold; color: #e11d48; }
      .status-badge { font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: bold; text-transform: uppercase; }
      .status-selesai { background-color: #dcfce7; color: #15803d; }
      .status-proses { background-color: #fef9c3; color: #a16207; }
      .status-baru { background-color: #fee2e2; color: #b91c1c; }
      .sig { display: flex; gap: 20px; margin-top: 40px; }
      .sig-col { flex: 1; text-align: center; }
      .sig-space { margin-top: 50px; border-bottom: 1px solid #333; width: 80%; margin-left: auto; margin-right: auto; }
      .sig-title { font-size: 9px; color: #666; margin-top: 4px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="header-title">Dossier Keluar & Rekap Kedisiplinan Siswa</div>
      <div class="header-school">${escapeHtml(sekolah?.nama || 'Sekolah')}</div>
      <div class="header-sub">${escapeHtml(sekolah?.alamat || '')} ${sekolah?.kota ? `• ${sekolah.kota}` : ''}</div>
    </div>

    <div class="section-title">Profil Akademik & Mutasi</div>
    <div class="grid">
      <div class="grid-col">
        <div class="meta-item">
          <div class="meta-label">Nama Siswa</div>
          <div class="meta-val">${escapeHtml(student.nama_siswa)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">NIS / NISN</div>
          <div class="meta-val">${escapeHtml(student.nis)} / ${escapeHtml(student.nisn || '-')}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Kelas Terakhir</div>
          <div class="meta-val">${escapeHtml(student.Kelas?.nama_kelas || '-')}</div>
        </div>
      </div>
      <div class="grid-col">
        <div class="meta-item">
          <div class="meta-label">Status Keluar</div>
          <div class="meta-val">${escapeHtml(student.status)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Tanggal Keluar</div>
          <div class="meta-val">${student.tanggal_keluar ? student.tanggal_keluar.toISOString().slice(0, 10) : dateStr}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Alasan Keluar</div>
          <div class="meta-val">${escapeHtml(student.alasan_keluar || '-')}</div>
        </div>
      </div>
    </div>

    <div class="section-title">Ringkasan Kedisiplinan BK</div>
    <div class="meta-item">
      <div class="meta-label">Total Akumulasi Poin</div>
      <div class="meta-val"><span class="poin-badge">${totalPoints} Poin</span> (Status: ${totalPoints >= 50 ? 'KRITIS' : 'NORMAL'})</div>
    </div>

    <div class="section-title">Rekap Pelanggaran Siswa</div>
    ${
      violations.length === 0
        ? '<div style="color: #666; font-style: italic;">Tidak ada catatan pelanggaran terdaftar.</div>'
        : `<table>
            <thead>
              <tr>
                <th style="width: 80px;">Tanggal</th>
                <th>Jenis Pelanggaran</th>
                <th>Keterangan</th>
                <th style="width: 60px; text-align: center;">Poin</th>
                <th style="width: 80px; text-align: center;">Status BK</th>
              </tr>
            </thead>
            <tbody>
              ${violations
                .map(
                  (v) => `
                <tr>
                  <td>${v.tanggal.toISOString().slice(0, 10)}</td>
                  <td style="font-weight: bold;">${escapeHtml(v.jenis_pelanggaran)}</td>
                  <td>${escapeHtml(v.keterangan || '-')}</td>
                  <td style="text-align: center;" class="poin-badge">+${v.poin}</td>
                  <td style="text-align: center;">
                    <span class="status-badge status-${v.status.toLowerCase()}">${escapeHtml(v.status)}</span>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>`
    }

    <div class="section-title">Daftar Dokumen Lampiran</div>
    ${
      documents.length === 0
        ? '<div style="color: #666; font-style: italic;">Tidak ada berkas pendukung terunggah.</div>'
        : `<table>
            <thead>
              <tr>
                <th style="width: 150px;">Judul Berkas</th>
                <th>Kategori</th>
                <th>Nama File Asli</th>
                <th style="width: 80px; text-align: right;">Ukuran</th>
                <th>Pengunggah</th>
              </tr>
            </thead>
            <tbody>
              ${documents
                .map(
                  (d) => `
                <tr>
                  <td style="font-weight: bold;">${escapeHtml(d.judul)}</td>
                  <td>${escapeHtml(d.kategori)}</td>
                  <td>${escapeHtml(d.file_original_name)}</td>
                  <td style="text-align: right;">${(d.size_bytes / 1024).toFixed(1)} KB</td>
                  <td>${escapeHtml(d.UploadedBy?.full_name || 'Staf')}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>`
    }

    <div class="sig">
      <div class="sig-col">
        <div>Wali Kelas,</div>
        <div class="sig-space"></div>
        <div class="sig-title">NIP/NUPTK.</div>
      </div>
      <div class="sig-col">
        <div>Koordinator BP/BK,</div>
        <div class="sig-space"></div>
        <div class="sig-title">NIP/NUPTK.</div>
      </div>
      <div class="sig-col">
        <div>Kepala Sekolah,</div>
        <div class="sig-space"></div>
        <div class="sig-title">NIP/NUPTK. ${escapeHtml(sekolah?.kepala_sekolah || '')}</div>
      </div>
    </div>
  </body>
</html>`;

  // 6. Render PDF in Puppeteer
  let browser: any;
  let pdfBuffer: Buffer;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // 7. Create ZIP archive
  const zip = new AdmZip();
  
  // Add generated PDF dossier
  zip.addFile('Dossier_Keluar_Siswa.pdf', pdfBuffer);

  // Add all other attached files
  for (const doc of documents) {
    try {
      const stream = storageService.createReadStream(doc.file_storage_path);
      const buffer = await streamToBuffer(stream);
      // Ensure we don't have duplicate file names in zip
      const fileName = `${doc.kategori}_${doc.file_original_name}`;
      zip.addFile(fileName, buffer);
    } catch (err) {
      console.error(`Failed to add file ${doc.file_storage_path} to exit bundle ZIP:`, err);
    }
  }

  const zipBuffer = zip.toBuffer();
  const filename = `Berkas_Keluar_${student.nama_siswa.replace(/\s+/g, '_')}.zip`;

  return { zipBuffer, filename };
}

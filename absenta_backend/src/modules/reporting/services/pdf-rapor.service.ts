import puppeteer from 'puppeteer';
import { prisma } from '../../../utils/prisma';
import { RaporService } from '../../rapor/services/rapor.service';
import {
  JABAR_LOGO_SVG,
  wrapWithPdfLayout,
  renderStudentReportHeader,
  renderSignaturesBlock,
  numberToWordsIndonesian,
} from './helpers/pdf-template.helpers';

export class PdfRaporService {
  // Helper render HTML to PDF Buffer
  private static async renderHtmlToPdf(
    html: string,
    orientation: 'portrait' | 'landscape',
    paperSize: 'A4' | 'F4' = 'A4'
  ) {
    let browser: any;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdfOptions: any = {
        landscape: orientation === 'landscape',
        printBackground: true,
        preferCSSPageSize: true
      };
      if (paperSize === 'F4') {
        pdfOptions.width = orientation === 'landscape' ? '330mm' : '215mm';
        pdfOptions.height = orientation === 'landscape' ? '215mm' : '330mm';
      } else {
        pdfOptions.format = 'A4';
      }
      const pdfBuffer = await page.pdf(pdfOptions);
      return pdfBuffer;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // Shared Helper for Signatories and School Meta
  private static async getSchoolAndSignatories(
    tenantId: string,
    kelasId?: string | null,
    params?: { tahun_pelajaran_id?: string; semester_id?: string }
  ) {
    const [sekolah, tenant, raporSettings] = await Promise.all([
      prisma.sekolah.findFirst({ where: { tenant_id: tenantId } }),
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      RaporService.getSettings(tenantId, params),
    ]);

    let walasNama = '...................................................';
    let walasNip = 'NIP. ...................................................';

    if (kelasId) {
      const waliAssignment = await prisma.organizationalAssignment.findFirst({
        where: {
          tenant_id: tenantId,
          kelas_id: kelasId,
          is_active: true,
          Position: { code: 'WALIKELAS' },
        },
        include: {
          User: {
            include: {
              Guru: true,
            },
          },
        },
      });

      if (waliAssignment?.User?.Guru) {
        walasNama = waliAssignment.User.Guru.nama_guru;
        walasNip = waliAssignment.User.Guru.nip ? `NIP. ${waliAssignment.User.Guru.nip}` : 'NIP. -';
      } else if (waliAssignment?.User?.full_name) {
        walasNama = waliAssignment.User.full_name;
        walasNip = 'NIP. -';
      }
    }

    const kepsekNama = raporSettings?.kepsek_nama || sekolah?.kepala_sekolah || '...................................................';
    const kepsekNip = raporSettings?.kepsek_nip || sekolah?.nip_kepala || 'NIP. -';
    const kepsekStatus = raporSettings?.kepsek_status || 'DEFINITIF';
    const kota = raporSettings?.tempat_terbit || sekolah?.kota || 'Purwakarta';

    const effectiveDate = raporSettings?.tanggal_rapor || (params?.semester_id ? raporSettings?.tanggal_rapor_ganjil : '') || '';
    const dateStr = effectiveDate
      ? new Date(effectiveDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    return {
      schoolName: sekolah?.nama || tenant?.name || 'SMK NEGERI 1 PLERED',
      schoolAddress: sekolah?.alamat || 'Jl. Rawasari, Plered',
      npsn: sekolah?.npsn || '-',
      logoUrl: tenant?.logo_url || null,
      walas: { nama: walasNama, nip: walasNip },
      kepsek: { nama: kepsekNama, nip: kepsekNip, status: kepsekStatus, kota },
      dateStr,
      raporSettings,
    };
  }

  // 1. GENERATE COVER / SAMPUL LUAR RAPOR PDF (A4 PORTRAIT)
  static async generateCoverRaporPdf(tenantId: string, siswaId: string) {
    const student = await prisma.siswa.findFirst({
      where: { id: siswaId, tenant_id: tenantId },
      include: {
        Kelas: { include: { Jurusan: true } },
      },
    });

    if (!student) {
      throw new Error('Siswa tidak ditemukan');
    }

    const schoolMeta = await this.getSchoolAndSignatories(tenantId, student.kelas_id);
    const tingkat = student.Kelas?.tingkat || 10;
    const isSmk = tingkat >= 10 && Boolean(student.Kelas?.jurusan_id || (student as any).jurusan);
    const jenjangTitle = isSmk ? 'SEKOLAH MENENGAH KEJURUAN<br>(SMK)' : 'SEKOLAH MENENGAH ATAS<br>(SMA)';

    const schoolLogoHtml = schoolMeta.logoUrl
      ? `<img src="${schoolMeta.logoUrl}" style="max-height: 110px; max-width: 150px; object-fit: contain;" />`
      : `
        <div style="display: inline-block; padding: 16px; border: 2px solid #0284c7; border-radius: 50%; width: 100px; height: 100px; line-height: 20px; font-weight: bold; font-size: 11px; color: #0369a1; text-align: center;">
          <div style="margin-top: 15px;">LOGO</div>
          <div>SEKOLAH</div>
        </div>
      `;

    const html = `
      <div style="min-height: 94vh; display: flex; flex-direction: column; justify-content: space-between; text-align: center; padding: 25mm 15mm 15mm 15mm;">
        <!-- Top Emblem: Jabar Prov -->
        <div>
          <div style="margin-bottom: 25px;">
            ${JABAR_LOGO_SVG}
          </div>
          <div style="font-size: 16px; font-weight: bold; letter-spacing: 1px; line-height: 1.5; color: #111; text-transform: uppercase;">
            ${jenjangTitle}
          </div>
        </div>

        <!-- School Logo -->
        <div style="margin: 30px 0;">
          ${schoolLogoHtml}
          <div style="font-size: 13px; font-weight: bold; margin-top: 12px; color: #1e293b; text-transform: uppercase;">
            ${schoolMeta.schoolName}
          </div>
        </div>

        <!-- Student Box -->
        <div style="margin: 20px auto; width: 85%;">
          <div style="font-size: 12px; margin-bottom: 8px; font-weight: 500;">Nama Peserta Didik :</div>
          <div style="border: 1.5px solid #111; padding: 10px 15px; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; background: #fafafa;">
            ${student.nama_siswa}
          </div>

          <div style="font-size: 12px; margin-top: 25px; margin-bottom: 8px; font-weight: 500;">NIS / NISN :</div>
          <div style="border: 1.5px solid #111; padding: 10px 15px; font-size: 14px; font-weight: bold; letter-spacing: 1px; background: #fafafa;">
            ${student.nis} / ${student.nisn || '-'}
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 40px; font-size: 11px; font-weight: bold; line-height: 1.6; text-transform: uppercase; letter-spacing: 0.5px; color: #111;">
          KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI<br>
          REPUBLIK INDONESIA
        </div>
      </div>
    `;

    const paperSize = (schoolMeta.raporSettings?.ukuran_kertas || 'A4') as 'A4' | 'F4';
    return this.renderHtmlToPdf(wrapWithPdfLayout(html, { title: `Cover Rapor - ${student.nama_siswa}`, margin: '0' }), 'portrait', paperSize);
  }

  // 2. GENERATE KETERANGAN TENTANG DIRI PESERTA DIDIK / BIODATA 17 BUTIR PDF (A4 PORTRAIT)
  static async generateBiodataPdf(tenantId: string, siswaId: string) {
    const student = await prisma.siswa.findFirst({
      where: { id: siswaId, tenant_id: tenantId },
      include: {
        Kelas: { include: { Jurusan: true } },
      },
    });

    if (!student) {
      throw new Error('Siswa tidak ditemukan');
    }

    const schoolMeta = await this.getSchoolAndSignatories(tenantId, student.kelas_id);

    const birthDateStr = student.tanggal_lahir
      ? new Date(student.tanggal_lahir).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
      : '-';

    const masukDateStr = student.tanggal_masuk
      ? new Date(student.tanggal_masuk).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
      : '14 Juli 2025';

    const fullAlamat = [
      student.alamat,
      student.dusun ? `Dusun ${student.dusun}` : '',
      student.rt || student.rw ? `RT ${student.rt || '01'} RW ${student.rw || '01'}` : '',
      student.kelurahan ? `Desa ${student.kelurahan}` : '',
      student.kecamatan ? `Kecamatan ${student.kecamatan}` : '',
      student.kabupaten ? `Kabupaten ${student.kabupaten}` : '',
    ].filter(Boolean).join(' ');

    const fullAlamatOrtu = [
      student.alamat,
      student.kelurahan ? `Desa ${student.kelurahan}` : '',
      student.kecamatan ? `Kecamatan ${student.kecamatan}` : '',
      student.kabupaten ? `Kabupaten ${student.kabupaten}` : '',
    ].filter(Boolean).join(' ');

    const jkText = (student.jenis_kelamin || '').toUpperCase().startsWith('L') ? 'Laki-Laki' : 'Perempuan';

    const html = `
      <div style="padding: 10px 5px; font-size: 11px; line-height: 1.5;">
        <div style="text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 22px; text-transform: uppercase; letter-spacing: 0.5px;">
          KETERANGAN TENTANG DIRI PESERTA DIDIK
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 11px;">
          <tr>
            <td style="width: 4%; vertical-align: top; padding: 2px 0;">1.</td>
            <td style="width: 32%; vertical-align: top; padding: 2px 0;">Nama Peserta Didik Lengkap</td>
            <td style="width: 3%; vertical-align: top; padding: 2px 0;">:</td>
            <td style="width: 61%; vertical-align: top; padding: 2px 0; font-weight: bold; text-transform: uppercase;">${student.nama_siswa}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 2px 0;">2.</td>
            <td style="vertical-align: top; padding: 2px 0;">Nomor Induk Siswa / NISN</td>
            <td style="vertical-align: top; padding: 2px 0;">:</td>
            <td style="vertical-align: top; padding: 2px 0;">${student.nis} / ${student.nisn || '-'}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 2px 0;">3.</td>
            <td style="vertical-align: top; padding: 2px 0;">Tempat Tanggal Lahir</td>
            <td style="vertical-align: top; padding: 2px 0;">:</td>
            <td style="vertical-align: top; padding: 2px 0;">${student.tempat_lahir || 'Purwakarta'} , ${birthDateStr}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 2px 0;">4.</td>
            <td style="vertical-align: top; padding: 2px 0;">Jenis Kelamin</td>
            <td style="vertical-align: top; padding: 2px 0;">:</td>
            <td style="vertical-align: top; padding: 2px 0;">${jkText}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 2px 0;">5.</td>
            <td style="vertical-align: top; padding: 2px 0;">Agama / Kepercayaan</td>
            <td style="vertical-align: top; padding: 2px 0;">:</td>
            <td style="vertical-align: top; padding: 2px 0;">${student.agama || 'Islam'}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 2px 0;">6.</td>
            <td style="vertical-align: top; padding: 2px 0;">Status dalam Keluarga</td>
            <td style="vertical-align: top; padding: 2px 0;">:</td>
            <td style="vertical-align: top; padding: 2px 0;">Anak Kandung</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 2px 0;">7.</td>
            <td style="vertical-align: top; padding: 2px 0;">Anak ke</td>
            <td style="vertical-align: top; padding: 2px 0;">:</td>
            <td style="vertical-align: top; padding: 2px 0;">${numberToWordsIndonesian(student.anak_ke || 1)}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 2px 0;">8.</td>
            <td style="vertical-align: top; padding: 2px 0;">Alamat Peserta Didik</td>
            <td style="vertical-align: top; padding: 2px 0;">:</td>
            <td style="vertical-align: top; padding: 2px 0; text-align: justify;">${fullAlamat || 'Jl. Rawasari, Plered, Purwakarta'}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 2px 0;">9.</td>
            <td style="vertical-align: top; padding: 2px 0;">Nomor Telepon Rumah</td>
            <td style="vertical-align: top; padding: 2px 0;">:</td>
            <td style="vertical-align: top; padding: 2px 0;">${student.no_hp || '-'}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 2px 0;">10.</td>
            <td style="vertical-align: top; padding: 2px 0;">Sekolah Asal</td>
            <td style="vertical-align: top; padding: 2px 0;">:</td>
            <td style="vertical-align: top; padding: 2px 0;">${student.sekolah_asal || 'SMPN 1 Plered'}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 2px 0;">11.</td>
            <td style="vertical-align: top; padding: 2px 0;" colspan="3">Diterima di sekolah ini</td>
          </tr>
          <tr>
            <td></td>
            <td style="padding: 1.5px 0 1.5px 15px;">Di kelas</td>
            <td style="padding: 1.5px 0;">:</td>
            <td style="padding: 1.5px 0; font-weight: bold;">${student.Kelas?.nama_kelas || 'X TE 3'}</td>
          </tr>
          <tr>
            <td></td>
            <td style="padding: 1.5px 0 1.5px 15px;">Pada tanggal</td>
            <td style="padding: 1.5px 0;">:</td>
            <td style="padding: 1.5px 0;">${masukDateStr}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 2px 0;">12.</td>
            <td style="vertical-align: top; padding: 2px 0;" colspan="3">Nama Orang Tua</td>
          </tr>
          <tr>
            <td></td>
            <td style="padding: 1.5px 0 1.5px 15px;">a. Ayah</td>
            <td style="padding: 1.5px 0;">:</td>
            <td style="padding: 1.5px 0;">${student.nama_ayah || '-'}</td>
          </tr>
          <tr>
            <td></td>
            <td style="padding: 1.5px 0 1.5px 15px;">b. Ibu</td>
            <td style="padding: 1.5px 0;">:</td>
            <td style="padding: 1.5px 0;">${student.nama_ibu || '-'}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 2px 0;">13.</td>
            <td style="vertical-align: top; padding: 2px 0;">Alamat Orang Tua</td>
            <td style="vertical-align: top; padding: 2px 0;">:</td>
            <td style="vertical-align: top; padding: 2px 0; text-align: justify;">${fullAlamatOrtu || fullAlamat || '-'}</td>
          </tr>
          <tr>
            <td></td>
            <td style="padding: 1.5px 0 1.5px 15px;">Nomor Telepon Rumah</td>
            <td style="padding: 1.5px 0;">:</td>
            <td style="padding: 1.5px 0;">${student.no_hp_ortu || '-'}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 2px 0;">14.</td>
            <td style="vertical-align: top; padding: 2px 0;" colspan="3">Pekerjaan Orang Tua</td>
          </tr>
          <tr>
            <td></td>
            <td style="padding: 1.5px 0 1.5px 15px;">a. Ayah</td>
            <td style="padding: 1.5px 0;">:</td>
            <td style="padding: 1.5px 0;">${student.pekerjaan_ayah || '-'}</td>
          </tr>
          <tr>
            <td></td>
            <td style="padding: 1.5px 0 1.5px 15px;">b. Ibu</td>
            <td style="padding: 1.5px 0;">:</td>
            <td style="padding: 1.5px 0;">${student.pekerjaan_ibu || 'Rumah Tangga'}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 2px 0;">15.</td>
            <td style="vertical-align: top; padding: 2px 0;">Nama Wali Peserta Didik</td>
            <td style="vertical-align: top; padding: 2px 0;">:</td>
            <td style="vertical-align: top; padding: 2px 0;">${student.nama_wali || '-'}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 2px 0;">16.</td>
            <td style="vertical-align: top; padding: 2px 0;">Alamat Wali Peserta Didik</td>
            <td style="vertical-align: top; padding: 2px 0;">:</td>
            <td style="vertical-align: top; padding: 2px 0;">${fullAlamat || '-'}</td>
          </tr>
          <tr>
            <td></td>
            <td style="padding: 1.5px 0 1.5px 15px;">Nomor Telepon Rumah</td>
            <td style="padding: 1.5px 0;">:</td>
            <td style="padding: 1.5px 0;">${student.no_hp_wali || '-'}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 2px 0;">17.</td>
            <td style="vertical-align: top; padding: 2px 0;">Pekerjaan Wali Peserta Didik</td>
            <td style="vertical-align: top; padding: 2px 0;">:</td>
            <td style="vertical-align: top; padding: 2px 0;">${student.pekerjaan_wali || '-'}</td>
          </tr>
        </table>

        <!-- Bottom Pas Foto & Signatures -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="width: 40%; vertical-align: middle; text-align: center;">
              <div style="display: inline-block; width: 30mm; height: 40mm; border: 1.5px solid #111; line-height: 18px; padding-top: 15mm; box-sizing: border-box; font-size: 11px; color: #444; font-weight: bold; background: #fdfdfd;">
                Pas Foto<br>3x4
              </div>
            </td>
            <td style="width: 60%; vertical-align: top; text-align: center;">
              <div style="font-size: 11px;">${schoolMeta.kepsek.kota}, ${schoolMeta.dateStr}</div>
              <div style="margin-top: 3px; font-size: 11px; margin-bottom: 60px;">Kepala Sekolah</div>
              <div style="font-size: 11px; font-weight: bold; text-decoration: underline;">${schoolMeta.kepsek.nama}</div>
              <div style="font-size: 10.5px; color: #222;">${schoolMeta.kepsek.nip ? `NIP. ${schoolMeta.kepsek.nip.replace('NIP.', '').trim()}` : 'NIP. -'}</div>
            </td>
          </tr>
        </table>
      </div>
    `;

    const paperSize = (schoolMeta.raporSettings?.ukuran_kertas || 'A4') as 'A4' | 'F4';
    return this.renderHtmlToPdf(wrapWithPdfLayout(html, { title: `Biodata Siswa - ${student.nama_siswa}` }), 'portrait', paperSize);
  }

  // 3. GENERATE LAPORAN HASIL BELAJAR (CK PAGE 1 & CK PAGE 2) PDF (A4 PORTRAIT)
  static async generateRaporPdf(
    tenantId: string,
    params: {
      siswa_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
    }
  ) {
    const [data, student, semester, tp] = await Promise.all([
      RaporService.getRaporDetail(tenantId, params),
      prisma.siswa.findFirst({
        where: { id: params.siswa_id, tenant_id: tenantId },
        include: { Kelas: { include: { Jurusan: true } } },
      }),
      prisma.semester.findFirst({ where: { id: params.semester_id } }),
      prisma.tahunPelajaran.findFirst({ where: { id: params.tahun_pelajaran_id } }),
    ]);

    if (!student) {
      throw new Error('Siswa tidak ditemukan');
    }

    const schoolMeta = await this.getSchoolAndSignatories(tenantId, student.kelas_id, params);
    const semesterName = semester?.nama_semester || 'Ganjil';
    const isGenap = Boolean(semesterName.toLowerCase().includes('genap') || semesterName.includes('2'));

    // Resolve format and Kokurikuler settings (Scoped to TP -> Global Fallback -> Smart Year Rule)
    const tpYearStr = tp?.tahun || '2025/2026';
    const matchYear = tpYearStr.match(/^(\d{4})/);
    const startYear = matchYear ? parseInt(matchYear[1], 10) : 2025;
    const showKokurikuler = schoolMeta.raporSettings?.tampilkan_kokurikuler !== undefined
      ? schoolMeta.raporSettings.tampilkan_kokurikuler
      : startYear >= 2025;
    const paperSize = (schoolMeta.raporSettings?.ukuran_kertas || 'A4') as 'A4' | 'F4';

    const studentCtx = {
      nama_siswa: student.nama_siswa,
      nis: student.nis,
      nisn: student.nisn,
      kelas: student.Kelas?.nama_kelas || data.siswa.kelas,
      tingkat: student.Kelas?.tingkat || data.siswa.tingkat,
      fase: student.Kelas?.tingkat === 10 ? 'E' : 'F',
      jurusan: student.Kelas?.Jurusan?.nama || 'Teknik Audio Video',
      program_keahlian: student.Kelas?.Jurusan?.nama || 'Teknik Elektronika',
      bidang_keahlian: 'Teknologi Manufaktur dan Rekayasa',
    };

    const academicCtx = {
      schoolName: schoolMeta.schoolName,
      schoolAddress: schoolMeta.schoolAddress,
      semesterName,
      tahunPelajaran: tpYearStr,
    };

    // Grouping 4 Kategori Kurikulum Merdeka SMK:
    // 1. Umum, 2. Kejuruan, 3. Pilihan, 4. Muatan Lokal
    const listMapel = data.nilai_akademik || [];
    const mapelUmum: any[] = [];
    const mapelKejuruan: any[] = [];
    const mapelPilihan: any[] = [];
    const mapelMulok: any[] = [];

    listMapel.forEach((m: any) => {
      const g = (m.kelompok_mapel || '').toUpperCase();
      const n = (m.mapel_name || '').toUpperCase();

      if (g.includes('PILIHAN') || n.includes('KODING') || n.includes('KECERDASAN') || n.includes('ROBOTIKA')) {
        mapelPilihan.push(m);
      } else if (g.includes('LOKAL') || g.includes('MULOK') || n.includes('SUNDA') || n.includes('JAWA') || n.includes('DAERAH')) {
        mapelMulok.push(m);
      } else if (
        g.includes('KEJURUAN') ||
        n.includes('MATEMATIKA') ||
        n.includes('INGGRIS') ||
        n.includes('INFORMATIKA') ||
        n.includes('IPAS') ||
        n.includes('DASAR') ||
        n.includes('KONSENTRASI')
      ) {
        mapelKejuruan.push(m);
      } else {
        mapelUmum.push(m);
      }
    });

    const renderTableGroup = (groupTitle: string, items: any[]) => {
      if (items.length === 0) return '';
      let rows = `
        <tr style="background-color: #f3f4f6; font-weight: bold;">
          <td colspan="4" style="padding: 4px 8px; font-size: 11px;">${groupTitle}</td>
        </tr>
      `;
      items.forEach((item, idx) => {
        const cp = item.catatan_kompetensi ||
          (item.nilai_akhir >= (item.kkm || 75)
            ? 'Siswa menunjukkan pemahaman yang memadai terhadap materi dan kompetensi pembelajaran.'
            : 'Siswa memerlukan bimbingan lebih lanjut dalam penguasaan kompetensi dasar.');
        rows += `
          <tr>
            <td style="text-align: center; vertical-align: middle; width: 6%;">${idx + 1}</td>
            <td style="vertical-align: middle; width: 32%; font-weight: 500;">${item.mapel_name}</td>
            <td style="text-align: center; vertical-align: middle; width: 10%; font-weight: bold; font-size: 12px;">${item.nilai_akhir || '-'}</td>
            <td style="vertical-align: top; width: 52%; font-size: 10px; text-align: justify; line-height: 1.35; padding: 5px 7px;">${cp}</td>
          </tr>
        `;
      });
      return rows;
    };

    let tableBody = '';
    tableBody += renderTableGroup('Mata Pelajaran Umum', mapelUmum);
    tableBody += renderTableGroup('Mata Pelajaran Kejuruan', mapelKejuruan);
    tableBody += renderTableGroup('Mata Pelajaran Pilihan', mapelPilihan);
    tableBody += renderTableGroup('Muatan Lokal', mapelMulok);

    if (listMapel.length === 0) {
      tableBody = `<tr><td colspan="4" style="text-align: center; font-style: italic; padding: 20px;">Belum ada data nilai semester ini</td></tr>`;
    }

    // --- HALAMAN 1 (INTRAKURIKULER) ---
    const page1Html = `
      <div>
        <div style="text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 12px; text-transform: uppercase;">
          LAPORAN HASIL BELAJAR<br>(RAPOR)
        </div>

        ${renderStudentReportHeader(studentCtx, academicCtx)}

        <div style="font-weight: bold; font-size: 11.5px; margin-bottom: 6px;">I. INTRA KURIKULER</div>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 6%;">No</th>
              <th style="width: 32%;">Mata Pelajaran</th>
              <th style="width: 10%;">Nilai</th>
              <th style="width: 52%;">Capaian Kompetensi</th>
            </tr>
          </thead>
          <tbody>
            ${tableBody}
          </tbody>
        </table>
      </div>
    `;

    // --- HALAMAN 2 (PELENGKAP, KOKURIKULER, KENAIKAN KELAS, TTD) ---
    let sectionIdx = 2;
    const kokurikulerSectionHtml = showKokurikuler
      ? `
        <div style="margin-bottom: 12px;">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px;">II. KOKURIKULER</div>
          <div style="border: 1px solid #111; padding: 8px 10px; font-size: 10.5px; text-align: justify; line-height: 1.45;">
            Peserta didik secara konsisten mengikuti Pembiasaan Pagi dengan disiplin (Mandiri), aktif menjaga ketertiban dan bekerja sama dengan teman (Gotong Royong), serta menunjukkan sikap hormat, sopan, dan peduli terhadap lingkungan sekolah (Beriman dan Bertakwa serta Berakhlak Mulia, Berkebinekaan Global).
          </div>
        </div>
      `
      : '';

    if (showKokurikuler) sectionIdx++;

    const ekskul1 = student.ekskul_1 || '-';
    const ekskul2 = student.ekskul_2 || '-';
    const ekskulTitle = `${showKokurikuler ? 'III' : 'II'}. EKSTRA KURIKULER`;
    const ekskulRowsHtml = `
      <tr>
        <td style="text-align: center; width: 6%;">1.</td>
        <td style="width: 34%; font-weight: 500;">${ekskul1 !== '-' ? ekskul1 : 'Sepak bola'}</td>
        <td style="width: 60%; font-size: 10.5px;">Melaksanakan kegiatan ekstrakurikuler dengan baik dan disiplin.</td>
      </tr>
      <tr>
        <td style="text-align: center;">2.</td>
        <td style="font-weight: 500;">${ekskul2 !== '-' ? ekskul2 : '-'}</td>
        <td style="font-size: 10.5px;">${ekskul2 !== '-' ? 'Melaksanakan kegiatan ekstrakurikuler dengan baik.' : '-'}</td>
      </tr>
    `;

    const presensiTitle = `${showKokurikuler ? 'IV' : 'III'}. KETIDAKHADIRAN`;
    const presensiTableHtml = `
      <div style="margin-bottom: 14px;">
        <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px;">${presensiTitle}</div>
        <table class="data-table" style="margin-bottom: 0;">
          <thead>
            <tr>
              <th colspan="2" style="width: 36%;">Ketidakhadiran</th>
              <th style="width: 64%;">Catatan Wali Kelas</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="width: 24%; padding: 4px 8px;">Sakit</td>
              <td style="width: 12%; text-align: center; font-weight: bold;">${data.absensi.sakit || '-'} Hari</td>
              <td rowspan="3" style="vertical-align: top; padding: 8px 10px; font-size: 10.5px; text-align: justify; line-height: 1.45;">
                ${data.catatan_wali || 'Harus tetap rajin belajar dan tingkatkan prestasimu agar lebih baik dari sebelumnya.'}
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 8px;">Izin</td>
              <td style="text-align: center; font-weight: bold;">${data.absensi.izin || '-'} Hari</td>
            </tr>
            <tr>
              <td style="padding: 4px 8px;">Tanpa Keterangan</td>
              <td style="text-align: center; font-weight: bold;">${data.absensi.alpa || 2} Hari</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    // Kenaikan Kelas (Khusus Semester Genap)
    let kenaikanKelasHtml = '';
    if (isGenap) {
      const kenaikanTitle = `${showKokurikuler ? 'V' : 'IV'}. KENAIKAN KELAS`;
      const tingkat = student.Kelas?.tingkat || 10;
      const targetNext = tingkat === 10 ? 'XI (Sebelas)' : tingkat === 11 ? 'XII (Dua Belas)' : 'Lulus';
      const keputusanDesc = data.keputusan_transisi
        ? data.keputusan_transisi.replace(/_/g, ' ')
        : `Naik ke kelas ${targetNext}`;

      kenaikanKelasHtml = `
        <div style="margin-bottom: 14px; page-break-inside: avoid;">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px;">${kenaikanTitle}</div>
          <div style="border: 1px solid #111; padding: 8px 12px; font-size: 10.5px; line-height: 1.5;">
            <div>Berdasarkan hasil yang dicapai pada semester 1 dan 2, peserta didik ditetapkan:</div>
            <div style="font-weight: bold; margin-top: 3px;">
              ${keputusanDesc}
            </div>
          </div>
        </div>
      `;
    }

    const signaturesHtml = renderSignaturesBlock({
      includeOrtu: true,
      walas: schoolMeta.walas,
      kepsek: schoolMeta.kepsek,
      titimangsaDate: schoolMeta.dateStr,
      isGenap,
      orientation: 'portrait',
    });

    const page2Html = `
      <div class="page-break">
        ${renderStudentReportHeader(studentCtx, academicCtx, { compact: true })}

        ${kokurikulerSectionHtml}

        <div style="margin-bottom: 12px;">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px;">${ekskulTitle}</div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 6%;">No</th>
                <th style="width: 34%;">Ekstrakurikuler</th>
                <th style="width: 60%;">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${ekskulRowsHtml}
            </tbody>
          </table>
        </div>

        ${presensiTableHtml}

        ${kenaikanKelasHtml}

        ${signaturesHtml}
      </div>
    `;

    const fullHtml = wrapWithPdfLayout(`${page1Html}\n${page2Html}`, {
      title: `Rapor Semester - ${student.nama_siswa}`,
      margin: '10mm 14mm',
    });

    return this.renderHtmlToPdf(fullHtml, 'portrait', paperSize);
  }

  // 4. GENERATE LAPORAN PENILAIAN SUMATIF SISWA (ARSIP TERDAHULU) PDF (A4 PORTRAIT)
  static async generateRaporSumatifPdf(
    tenantId: string,
    params: {
      siswa_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
    }
  ) {
    const [data, student, semester, tp] = await Promise.all([
      RaporService.getRaporDetail(tenantId, params),
      prisma.siswa.findFirst({
        where: { id: params.siswa_id, tenant_id: tenantId },
        include: { Kelas: { include: { Jurusan: true } } },
      }),
      prisma.semester.findFirst({ where: { id: params.semester_id } }),
      prisma.tahunPelajaran.findFirst({ where: { id: params.tahun_pelajaran_id } }),
    ]);

    if (!student) {
      throw new Error('Siswa tidak ditemukan');
    }

    const schoolMeta = await this.getSchoolAndSignatories(tenantId, student.kelas_id, params);
    const semesterName = semester?.nama_semester || 'Ganjil';
    const tpYearStr = tp?.tahun || '2024 / 2025';

    // Grouping A. Kelompok Umum vs B. Kelompok Kejuruan
    const listMapel = data.nilai_akademik || [];
    const mapelUmum: any[] = [];
    const mapelKejuruan: any[] = [];

    listMapel.forEach((m: any) => {
      const g = (m.kelompok_mapel || '').toUpperCase();
      const n = (m.mapel_name || '').toUpperCase();

      if (
        g.includes('KEJURUAN') ||
        n.includes('MATEMATIKA') ||
        n.includes('INGGRIS') ||
        n.includes('INFORMATIKA') ||
        n.includes('IPAS') ||
        n.includes('DASAR') ||
        n.includes('KODING')
      ) {
        mapelKejuruan.push(m);
      } else {
        mapelUmum.push(m);
      }
    });

    const renderSumatifRows = (items: any[]) => {
      let rows = '';
      items.forEach((item, idx) => {
        // Build sumatif details string: "Nilai : 78 , Nilai : 81 , Nilai : 82"
        let rincianText = '';
        if (item.nilai_components && item.nilai_components.length > 0) {
          rincianText = item.nilai_components
            .map((c: any) => `Nilai &nbsp;:&nbsp; ${c.nilai}`)
            .join(' &nbsp; , &nbsp; ');
        } else {
          rincianText = `Nilai &nbsp;:&nbsp; ${item.nilai_akhir || 80}`;
        }

        rows += `
          <tr>
            <td style="text-align: center; vertical-align: middle; width: 6%;">${idx + 1}</td>
            <td style="vertical-align: middle; width: 34%; font-weight: 500;">${item.mapel_name}</td>
            <td style="text-align: center; vertical-align: middle; width: 12%; font-weight: bold; font-size: 12px;">${item.nilai_akhir || '-'}</td>
            <td style="vertical-align: middle; width: 48%; font-size: 10.5px; padding-left: 10px;">${rincianText}</td>
          </tr>
        `;
      });
      return rows;
    };

    const tableContent = `
      <tr style="background-color: #f3f4f6; font-weight: bold;">
        <td colspan="4" style="padding: 4px 8px;">A. Kelompok Umum</td>
      </tr>
      ${renderSumatifRows(mapelUmum)}
      <tr style="background-color: #f3f4f6; font-weight: bold;">
        <td colspan="4" style="padding: 4px 8px;">B. Kelompok Kejuruan</td>
      </tr>
      ${renderSumatifRows(mapelKejuruan)}
    `;

    const html = `
      <div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px;">
          <tr>
            <td style="width: 15%; padding: 1.5px 0;">Nama</td>
            <td style="width: 2%;">:</td>
            <td style="width: 43%; font-weight: bold; text-transform: uppercase;">${student.nama_siswa}</td>
            <td style="width: 15%; padding: 1.5px 0;">Kelas</td>
            <td style="width: 2%;">:</td>
            <td style="width: 23%; font-weight: bold;">${student.Kelas?.nama_kelas || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 1.5px 0;">NIS/NISN</td>
            <td>:</td>
            <td>${student.nis} / ${student.nisn || '-'}</td>
            <td style="padding: 1.5px 0;">Fase</td>
            <td>:</td>
            <td>${student.Kelas?.tingkat === 10 ? 'E' : 'F'}</td>
          </tr>
          <tr>
            <td style="padding: 1.5px 0;">Nama Sekolah</td>
            <td>:</td>
            <td style="font-weight: bold; text-transform: uppercase;">${schoolMeta.schoolName}</td>
            <td style="padding: 1.5px 0;">Semester</td>
            <td>:</td>
            <td>${semesterName}</td>
          </tr>
          <tr>
            <td style="padding: 1.5px 0;">Alamat</td>
            <td>:</td>
            <td>${schoolMeta.schoolAddress}</td>
            <td style="padding: 1.5px 0;">Tahun Pelajaran</td>
            <td>:</td>
            <td>${tpYearStr}</td>
          </tr>
        </table>

        <div style="text-align: center; font-size: 12.5px; font-weight: bold; margin: 15px 0 10px 0; text-transform: uppercase; border-top: 1px solid #111; padding-top: 10px;">
          LAPORAN HASIL PENILAIAN SUMATIF SISWA
        </div>

        <table class="data-table">
          <thead>
            <tr style="background-color: #86efac;">
              <th style="width: 6%; background-color: #86efac; border: 1px solid #111;">No</th>
              <th style="width: 34%; background-color: #86efac; border: 1px solid #111;">Mata Pelajaran</th>
              <th style="width: 12%; background-color: #86efac; border: 1px solid #111;">Rerata Nilai</th>
              <th style="width: 48%; background-color: #86efac; border: 1px solid #111;">Rincian Nilai Sumatif</th>
            </tr>
          </thead>
          <tbody>
            ${tableContent}
          </tbody>
        </table>

        <!-- Presensi Box -->
        <table style="width: 45%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px;">
          <tr>
            <td style="border: 1px solid #111; padding: 3px 6px; width: 45%;">Sakit</td>
            <td style="border: 1px solid #111; padding: 3px 6px; width: 10%; text-align: center;">:</td>
            <td style="border: 1px solid #111; padding: 3px 6px; text-align: center;">${data.absensi.sakit || '-'} hari</td>
          </tr>
          <tr>
            <td style="border: 1px solid #111; padding: 3px 6px;">Izin</td>
            <td style="border: 1px solid #111; padding: 3px 6px; text-align: center;">:</td>
            <td style="border: 1px solid #111; padding: 3px 6px; text-align: center;">${data.absensi.izin || '-'} hari</td>
          </tr>
          <tr>
            <td style="border: 1px solid #111; padding: 3px 6px;">Tanpa Keterangan</td>
            <td style="border: 1px solid #111; padding: 3px 6px; text-align: center;">:</td>
            <td style="border: 1px solid #111; padding: 3px 6px; text-align: center;">${data.absensi.alpa || '-'} hari</td>
          </tr>
        </table>

        <!-- Catatan Walas Box -->
        <div style="margin-bottom: 20px;">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px;">Catatan Wali kelas</div>
          <div style="border: 1px solid #111; padding: 12px 14px; font-size: 11px; min-height: 40px;">
            ${data.catatan_wali || 'Pertahankan semangat belajarnya'}
          </div>
        </div>

        ${renderSignaturesBlock({
          includeOrtu: true,
          walas: schoolMeta.walas,
          kepsek: schoolMeta.kepsek,
          titimangsaDate: schoolMeta.dateStr,
          orientation: 'portrait',
        })}
      </div>
    `;

    const paperSize = (schoolMeta.raporSettings?.ukuran_kertas || 'A4') as 'A4' | 'F4';
    return this.renderHtmlToPdf(wrapWithPdfLayout(html, { title: `Rapor Sumatif - ${student.nama_siswa}`, margin: '10mm 15mm' }), 'portrait', paperSize);
  }

  // 5. GENERATE BUKU LEGER KELAS (LANDSCAPE A4)
  static async generateLegerPdf(
    tenantId: string,
    params: {
      kelas_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
    }
  ) {
    const [legerData, kelas, semester, tp] = await Promise.all([
      RaporService.getLegerData(tenantId, params),
      prisma.kelas.findFirst({ where: { id: params.kelas_id, tenant_id: tenantId } }),
      prisma.semester.findFirst({ where: { id: params.semester_id } }),
      prisma.tahunPelajaran.findFirst({ where: { id: params.tahun_pelajaran_id } }),
    ]);

    const schoolMeta = await this.getSchoolAndSignatories(tenantId, params.kelas_id, params);
    const kelasNama = kelas?.nama_kelas || 'X TE 3';
    const semesterNama = (semester?.nama_semester || 'GANJIL').toUpperCase();
    const tpNama = tp?.tahun || '2025 / 2026';

    const mapelColumns = legerData.mapel_list || [];
    const siswaRows = legerData.students || [];

    // Header cells for mapel
    let mapelHeaderTh = '';
    mapelColumns.forEach((m: any) => {
      const shortCode = m.kode_mapel || m.nama_mapel.substring(0, 5).toUpperCase();
      mapelHeaderTh += `
        <th style="border: 1px solid #111; padding: 4px 2px; font-size: 8px; writing-mode: vertical-lr; transform: rotate(180deg); min-width: 22px; max-width: 26px; height: 75px; text-align: left; background-color: #f1f5f9;">
          ${shortCode}
        </th>
      `;
    });

    let dataRowsHtml = '';
    siswaRows.forEach((s: any, idx: number) => {
      let mapelTd = '';
      mapelColumns.forEach((m: any) => {
        const val = s.grades?.[m.id];
        mapelTd += `
          <td style="border: 1px solid #111; text-align: center; font-size: 8.5px; padding: 2px 1px;">
            ${val !== undefined && val !== null ? val : '-'}
          </td>
        `;
      });

      const sakit = s.sakit || '-';
      const izin = s.izin || '-';
      const alpa = s.alpa || '-';

      dataRowsHtml += `
        <tr style="height: 18px;">
          <td style="border: 1px solid #111; text-align: center; font-size: 8.5px;">${idx + 1}</td>
          <td style="border: 1px solid #111; font-size: 8.5px; padding: 2px 4px; white-space: nowrap; overflow: hidden; max-width: 140px; font-weight: 500;">${s.nama_siswa}</td>
          <td style="border: 1px solid #111; text-align: center; font-size: 8.5px;">${kelasNama}</td>
          <td style="border: 1px solid #111; text-align: center; font-size: 8.5px;">${semester?.nama_semester || 'Ganjil'}</td>
          ${mapelTd}
          <td style="border: 1px solid #111; font-size: 8px; text-align: center; padding: 1px 3px;">-</td>
          <td style="border: 1px solid #111; font-size: 8px; text-align: center; padding: 1px 3px;">-</td>
          <td style="border: 1px solid #111; text-align: center; font-size: 8.5px;">${sakit}</td>
          <td style="border: 1px solid #111; text-align: center; font-size: 8.5px;">${izin}</td>
          <td style="border: 1px solid #111; text-align: center; font-size: 8.5px;">${alpa}</td>
          <td style="border: 1px solid #111; text-align: center; font-size: 8.5px; font-weight: bold; background: #fef08a;">${s.total || 0}</td>
          <td style="border: 1px solid #111; text-align: center; font-size: 8.5px; font-weight: bold; background: #fed7aa;">${s.rata_rata || 0}</td>
          <td style="border: 1px solid #111; text-align: center; font-size: 8.5px; font-weight: bold; background: #bbf7d0;">${s.rank || '-'}</td>
        </tr>
      `;
    });

    const html = `
      <div style="font-size: 10px;">
        <!-- Header Banner -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div style="text-align: center; flex: 1;">
            <div style="font-size: 13px; font-weight: bold; text-transform: uppercase;">LEGER SEMESTER ${semesterNama}</div>
            <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #1e293b;">${schoolMeta.schoolName}</div>
            <div style="font-size: 11px; font-weight: bold;">TAHUN PELAJARAN ${tpNama}</div>
          </div>
          <div style="background-color: #f97316; color: #fff; font-weight: bold; padding: 6px 16px; border-radius: 4px; font-size: 13px; letter-spacing: 1px;">
            ${kelasNama}
          </div>
        </div>

        <!-- Matriks Leger Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
          <thead>
            <tr style="background-color: #e2e8f0; text-align: center;">
              <th rowspan="2" style="border: 1px solid #111; width: 22px; font-size: 8.5px;">NO</th>
              <th rowspan="2" style="border: 1px solid #111; min-width: 130px; font-size: 8.5px;">NAMA</th>
              <th rowspan="2" style="border: 1px solid #111; width: 45px; font-size: 8.5px;">KELAS</th>
              <th rowspan="2" style="border: 1px solid #111; width: 45px; font-size: 8.5px;">SEMESTER</th>
              <th colspan="${mapelColumns.length}" style="border: 1px solid #111; font-size: 8.5px; background: #bae6fd;">MATA PELAJARAN</th>
              <th colspan="2" style="border: 1px solid #111; font-size: 8.5px; background: #e0e7ff;">EKSTRAKURIKULER</th>
              <th colspan="3" style="border: 1px solid #111; font-size: 8.5px; background: #fce7f3;">PRESENSI</th>
              <th rowspan="2" style="border: 1px solid #111; width: 35px; font-size: 8px; background: #fef08a;">JUMLAH</th>
              <th rowspan="2" style="border: 1px solid #111; width: 35px; font-size: 8px; background: #fed7aa;">RATA-RATA</th>
              <th rowspan="2" style="border: 1px solid #111; width: 30px; font-size: 8px; background: #bbf7d0;">RANKING</th>
            </tr>
            <tr>
              ${mapelHeaderTh}
              <th style="border: 1px solid #111; width: 50px; font-size: 8px;">EKSKUL-1</th>
              <th style="border: 1px solid #111; width: 50px; font-size: 8px;">EKSKUL-2</th>
              <th style="border: 1px solid #111; width: 22px; font-size: 8px;">SAKIT</th>
              <th style="border: 1px solid #111; width: 22px; font-size: 8px;">IZIN</th>
              <th style="border: 1px solid #111; width: 26px; font-size: 8px;">TANPA KET</th>
            </tr>
          </thead>
          <tbody>
            ${dataRowsHtml}
          </tbody>
        </table>

        <!-- Signatures (Landscape) -->
        ${renderSignaturesBlock({
          walas: schoolMeta.walas,
          kepsek: schoolMeta.kepsek,
          titimangsaDate: schoolMeta.dateStr,
          orientation: 'landscape',
        })}
      </div>
    `;

    const paperSize = (schoolMeta.raporSettings?.ukuran_kertas || 'A4') as 'A4' | 'F4';
    return this.renderHtmlToPdf(wrapWithPdfLayout(html, { title: `Buku Leger - ${kelasNama}`, orientation: 'landscape', margin: '8mm 10mm' }), 'landscape', paperSize);
  }


  // 2. GENERATE SURAT KETERANGAN LULUS (SKL) PDF
  static async generateSklPdf(tenantId: string, siswaId: string) {
    let skl: any = await prisma.kelulusanSiswa.findFirst({
      where: { siswa_id: siswaId, tenant_id: tenantId },
      include: { Siswa: { include: { Kelas: true } } }
    });

    if (!skl) {
      const student = await prisma.siswa.findFirst({
        where: { id: siswaId, tenant_id: tenantId },
        include: { Kelas: true }
      });
      if (!student) {
        throw new Error('Siswa tidak ditemukan');
      }
      skl = {
        id: 'draft',
        tenant_id: tenantId,
        siswa_id: siswaId,
        nomor_skl: `SKL/${new Date().getFullYear()}/${student.nis}`,
        status: 'LULUS',
        rata_rata_nilai: '85.00',
        keterangan: 'Memenuhi Kriteria Kelulusan Satuan Pendidikan',
        created_at: new Date(),
        updated_at: new Date(),
        Siswa: student
      };
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const schoolName = tenant?.name || 'Sekolah Mitra Absenta';
    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4 portrait; margin: 20mm 20mm; }
          body { font-family: 'Times New Roman', Times, serif; font-size: 14px; line-height: 1.6; color: #000; margin: 0; }
          .kop { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 25px; text-transform: uppercase; }
          .kop-school { font-size: 18px; font-weight: bold; }
          .kop-desc { font-size: 12px; font-style: italic; }
          .title { text-align: center; font-size: 16px; font-weight: bold; text-decoration: underline; margin-bottom: 5px; text-transform: uppercase; }
          .doc-num { text-align: center; font-size: 13px; margin-bottom: 25px; }
          .opening { text-align: justify; margin-bottom: 20px; }
          .meta-table { width: 90%; margin: 0 auto 25px auto; border-collapse: collapse; }
          .meta-table td { padding: 5px 10px; vertical-align: top; }
          .verdict { text-align: justify; margin-bottom: 25px; }
          .score-box { border: 1px solid #000; padding: 15px; margin: 0 auto 30px auto; width: 60%; text-align: center; font-weight: bold; font-size: 16px; background-color: #f9f9f9; }
          .signature-box { float: right; text-align: center; width: 70mm; margin-top: 30px; }
          .sig-space { height: 25mm; }
        </style>
      </head>
      <body>
        <div class="kop">
          <div class="kop-school">${schoolName}</div>
          <div class="kop-desc">Kabupaten Purwakarta - Provinsi Jawa Barat</div>
          <div style="font-size: 10px;">Email: info@sekolah.sch.id | Web: www.sekolah.sch.id</div>
        </div>

        <div class="title">Surat Keterangan Lulus</div>
        <div class="doc-num">Nomor: ${skl.nomor_skl}</div>

        <div class="opening">
          Yang bertanda tangan di bawah ini, Kepala Sekolah ${schoolName}, menerangkan bahwa siswa berikut:
        </div>

        <table class="meta-table">
          <tr><td style="width: 30%;">Nama Lengkap</td><td style="width: 3%;">:</td><td style="font-weight: bold; text-transform: uppercase;">${skl.Siswa.nama_siswa}</td></tr>
          <tr><td>Nomor Induk Siswa (NIS)</td><td>:</td><td>${skl.Siswa.nis}</td></tr>
          <tr><td>NISN</td><td>:</td><td>${skl.Siswa.nisn || '-'}</td></tr>
          <tr><td>Kelas / Tingkat</td><td>:</td><td>${skl.Siswa.Kelas?.nama_kelas || '-'} / ${skl.Siswa.Kelas?.tingkat || '-'}</td></tr>
        </table>

        <div class="verdict">
          Berdasarkan Kriteria Kelulusan Siswa yang telah ditetapkan oleh satuan pendidikan dan hasil rapat pleno dewan guru, dinyatakan:
        </div>

        <div style="text-align: center; font-size: 24px; font-weight: bold; color: #155724; background-color: #d4edda; border: 1px solid #c3e6cb; padding: 10px 0; margin-bottom: 25px; text-transform: uppercase;">
          L U L U S
        </div>

        <div class="opening">
          Dengan perolehan rata-rata nilai Ujian / Rapor sekolah sebagai berikut:
        </div>

        <div class="score-box">
          RATA-RATA NILAI AKHIR: ${skl.rata_rata_nilai}
        </div>

        <div class="opening" style="font-style: italic;">
          Surat keterangan ini diterbitkan secara resmi sebagai pengganti Ijazah sementara untuk digunakan sebagaimana mestinya.
        </div>

        <div class="signature-box">
          <div>Purwakarta, ${dateStr}</div>
          <div>Kepala Sekolah,</div>
          <div class="sig-space"></div>
          <div style="font-weight: bold; text-decoration: underline;">........................................</div>
          <div>NIP. ........................................</div>
        </div>
      </body>
      </html>
    `;

    return this.renderHtmlToPdf(html, 'portrait');
  }

  // 3. GENERATE SERTIFIKAT UKK PDF (LANDSCAPE)
  static async generateUkkPdf(tenantId: string, siswaId: string) {
    let ukk: any = await prisma.sertifikatUkk.findFirst({
      where: { siswa_id: siswaId, tenant_id: tenantId },
      include: { Siswa: { include: { Kelas: true } }, MitraIndustri: true }
    });

    if (!ukk) {
      const student = await prisma.siswa.findFirst({
        where: { id: siswaId, tenant_id: tenantId },
        include: { Kelas: true }
      });
      if (!student) {
        throw new Error('Siswa tidak ditemukan');
      }
      ukk = {
        id: 'draft',
        tenant_id: tenantId,
        siswa_id: siswaId,
        nomor_sertifikat: `UKK/${new Date().getFullYear()}/${student.nis}`,
        predikat: 'SANGAT BAIK',
        asesor_internal: 'Tim Asesor Sekolah',
        asesor_eksternal: 'Penguji Asosiasi Industri',
        Siswa: student,
        MitraIndustri: { nama: 'Mitra Industri / DU-DI' }
      };
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const schoolName = tenant?.name || 'Sekolah Mitra Absenta';
    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4 landscape; margin: 0; }
          body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 0; background: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; }
          .border-double { width: 277mm; height: 190mm; padding: 15mm; border: 12px double #c5a059; background: #fff; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: space-between; }
          .header { text-align: center; }
          .logo { font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #555; text-transform: uppercase; }
          .title { font-size: 32px; font-weight: bold; color: #1c2d42; margin: 3mm 0; letter-spacing: 3px; }
          .doc-num { font-size: 13px; font-style: italic; color: #444; }
          .content-text { text-align: center; font-size: 15px; max-width: 210mm; margin: 10px 0; line-height: 1.6; }
          .name { font-size: 26px; font-weight: bold; border-bottom: 2px solid #c5a059; padding-bottom: 1mm; margin: 5px 0; font-family: 'Georgia', serif; color: #111; }
          .table-score { width: 50%; border-collapse: collapse; margin: 15px 0; }
          .table-score th, .table-score td { border: 1px solid #000; padding: 6px 12px; text-align: center; font-size: 13px; }
          .table-score th { background-color: #f5f5f5; }
          .footer { width: 100%; display: flex; justify-content: space-between; padding: 0 10mm; box-sizing: border-box; margin-top: 15px; }
          .sig-box { text-align: center; width: 65mm; font-size: 13px; }
          .sig-space { height: 18mm; }
        </style>
      </head>
      <body>
        <div class="border-double">
          <div class="header">
            <div class="logo">${schoolName}</div>
            <div class="title">SERTIFIKAT KOMPETENSI KEAHLIAN</div>
            <div class="doc-num">Nomor: ${ukk.nomor_sertifikat}</div>
          </div>

          <div class="content-text">
            Kepala Sekolah ${schoolName} menyatakan bahwa:
          </div>

          <div class="name">${ukk.Siswa.nama_siswa}</div>
          <div style="font-size: 13px; color: #555; margin-bottom: 5px;">NIS: ${ukk.Siswa.nis} / NISN: ${ukk.Siswa.nisn || '-'} | Kelas: ${ukk.Siswa.Kelas?.nama_kelas || '-'}</div>

          <div class="content-text" style="font-weight: bold;">
            Telah mengikuti Uji Kompetensi Keahlian (UKK) dan dinyatakan berkualifikasi:
            <br>
            <span style="font-size: 20px; color: #c5a059; text-transform: uppercase;">"${ukk.predikat}"</span>
          </div>

          <table class="table-score">
            <thead>
              <tr><th>Aspek Pengujian</th><th>Nilai</th></tr>
            </thead>
            <tbody>
              <tr><td>Nilai Praktik Kejuruan</td><td style="font-weight: bold;">${ukk.nilai_praktik}</td></tr>
              ${ukk.nilai_teori ? `<tr><td>Nilai Teori Kejuruan</td><td style="font-weight: bold;">${ukk.nilai_teori}</td></tr>` : ''}
            </tbody>
          </table>

          <div class="footer">
            <div class="sig-box">
              <div>Asesor Internal (Sekolah),</div>
              <div class="sig-space"></div>
              <div style="font-weight: bold; text-decoration: underline;">${ukk.asesor_internal || '........................................'}</div>
              <div>Penguji Kejuruan</div>
            </div>
            <div style="text-align: center; font-size: 12px; align-self: flex-end; margin-bottom: 5px;">
              Diterbitkan di: Purwakarta
              <br>
              Tanggal: ${dateStr}
            </div>
            <div class="sig-box">
              <div>Asesor Eksternal (${ukk.MitraIndustri?.nama || 'Dunia Industri'}),</div>
              <div class="sig-space"></div>
              <div style="font-weight: bold; text-decoration: underline;">${ukk.asesor_eksternal}</div>
              <div>Penguji Eksternal / Asosiasi</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.renderHtmlToPdf(html, 'landscape');
  }

  // 4. GENERATE RAPOR / SERTIFIKAT PKL PDF
  static async generatePklPdf(tenantId: string, siswaPklId: string) {
    const pkl = await prisma.siswaPkl.findFirst({
      where: { id: siswaPklId, tenant_id: tenantId },
      include: { Siswa: { include: { Kelas: true } }, Mitra: true, Pembimbing: true }
    });

    if (!pkl) {
      throw new Error('Data penempatan PKL tidak ditemukan');
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const schoolName = tenant?.name || 'Sekolah Mitra Absenta';
    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    // Parse nilai PKL dari JSON
    const scoresRaw: any = pkl.nilai_json || {};
    let scoreRowsHtml = '';
    let totalScore = 0;
    let aspectCount = 0;

    Object.keys(scoresRaw).forEach((aspect) => {
      const score = Number(scoresRaw[aspect]);
      if (!isNaN(score)) {
        scoreRowsHtml += `
          <tr>
            <td>${aspect}</td>
            <td style="text-align: center; font-weight: bold;">${score}</td>
          </tr>
        `;
        totalScore += score;
        aspectCount++;
      }
    });

    const averageScore = aspectCount > 0 ? (totalScore / aspectCount).toFixed(2) : '-';

    if (aspectCount === 0) {
      scoreRowsHtml = `<tr><td colspan="2" style="text-align: center; font-style: italic; padding: 10px;">Nilai PKL belum diinputkan oleh pembimbing industri</td></tr>`;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4 portrait; margin: 15mm 20mm; }
          body { font-family: 'Arial', sans-serif; font-size: 13px; line-height: 1.5; color: #333; margin: 0; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 20px; }
          .school-name { font-size: 16px; font-weight: bold; }
          .title { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; text-transform: uppercase; }
          .meta-table { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
          .meta-table td { padding: 4px 8px; vertical-align: top; }
          .score-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .score-table th, .score-table td { border: 1px solid #000; padding: 8px; }
          .score-table th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
          .footer { display: flex; justify-content: space-between; margin-top: 50px; }
          .sig-box { text-align: center; width: 65mm; }
          .sig-space { height: 20mm; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="school-name">RAPOR PKL SISWA</div>
            <div>Praktek Kerja Lapangan (Magang)</div>
          </div>
          <div style="text-align: right; font-weight: bold;">
            ${schoolName}
          </div>
        </div>

        <div class="title">Laporan Penilaian Kinerja Industri</div>

        <table class="meta-table">
          <tr>
            <td style="width: 20%;">Nama Siswa</td><td style="width: 2%;">:</td><td style="width: 28%; font-weight: bold;">${pkl.Siswa.nama_siswa}</td>
            <td style="width: 20%;">Mitra DU/DI</td><td style="width: 2%;">:</td><td style="width: 28%;">${pkl.Mitra.nama}</td>
          </tr>
          <tr>
            <td>Kelas</td><td>:</td><td>${pkl.Siswa.Kelas?.nama_kelas || '-'}</td>
            <td>Alamat Industri</td><td>:</td><td>${pkl.Mitra.alamat || '-'}</td>
          </tr>
          <tr>
            <td>NIS</td><td>:</td><td>${pkl.Siswa.nis}</td>
            <td>Periode Magang</td><td>:</td><td>${new Date(pkl.tanggal_mulai).toLocaleDateString('id-ID')} s.d ${pkl.tanggal_selesai ? new Date(pkl.tanggal_selesai).toLocaleDateString('id-ID') : 'Selesai'}</td>
          </tr>
        </table>

        <table class="score-table">
          <thead>
            <tr>
              <th style="width: 70%;">Aspek Penilaian (Teknis & Kepribadian)</th>
              <th style="width: 30%;">Nilai Akhir (0-100)</th>
            </tr>
          </thead>
          <tbody>
            ${scoreRowsHtml}
            ${
              aspectCount > 0
                ? `
              <tr style="background-color: #fafafa; font-weight: bold;">
                <td style="text-align: right;">RATA-RATA NILAI PKL</td>
                <td style="text-align: center; font-size: 14px; color: #1c2d42;">${averageScore}</td>
              </tr>
              `
                : ''
            }
          </tbody>
        </table>

        <div class="footer">
          <div class="sig-box">
            <div>Pembimbing Sekolah,</div>
            <div class="sig-space"></div>
            <div style="font-weight: bold; text-decoration: underline;">${pkl.Pembimbing?.nama_guru || '........................................'}</div>
            <div>Guru Pembimbing</div>
          </div>
          <div class="sig-box">
            <div>Purwakarta, ${dateStr}</div>
            <div>Pembimbing DU/DI (Industri),</div>
            <div class="sig-space"></div>
            <div style="font-weight: bold; text-decoration: underline;">${pkl.Mitra.pic_nama || '........................................'}</div>
            <div>${pkl.Mitra.pic_jabatan || 'Supervisor / Instruktur'}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.renderHtmlToPdf(html, 'portrait');
  }

  static async generateP5RaporPdf(
    tenantId: string,
    params: {
      siswa_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
    }
  ) {
    const [student, semester, sekolah, raporSettings] = await Promise.all([
      prisma.siswa.findFirst({
        where: { id: params.siswa_id, tenant_id: tenantId },
        include: { 
          Kelas: {
            include: {
              Jurusan: true,
            }
          }
        }
      }),
      prisma.semester.findFirst({
        where: { id: params.semester_id }
      }),
      prisma.sekolah.findFirst({
        where: { tenant_id: tenantId }
      }),
      RaporService.getSettings(tenantId, {
        tahun_pelajaran_id: params.tahun_pelajaran_id,
        semester_id: params.semester_id,
      })
    ]);

    if (!student) {
      throw new Error('Siswa tidak ditemukan');
    }

    const schoolName = sekolah?.nama || 'SMK';
    const effectiveDate = raporSettings?.tanggal_rapor_p5 || raporSettings?.tanggal_rapor;
    const dateStr = effectiveDate
      ? new Date(effectiveDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const listNilai = await prisma.p5NilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        siswa_id: params.siswa_id,
        Projek: {
          tahun_pelajaran_id: params.tahun_pelajaran_id,
          semester_id: params.semester_id,
        },
      },
      include: { Projek: true },
    });

    const projekMap = new Map<string, {
      judul: string;
      deskripsi: string | null;
      scores: Array<{ dimensi: string; sub_elemen: string; kualifikasi: string; catatan: string | null }>;
    }>();

    listNilai.forEach((n) => {
      if (!projekMap.has(n.projek_id)) {
        projekMap.set(n.projek_id, {
          judul: n.Projek.judul,
          deskripsi: n.Projek.deskripsi,
          scores: [],
        });
      }
      projekMap.get(n.projek_id)!.scores.push({
        dimensi: n.dimensi,
        sub_elemen: n.sub_elemen,
        kualifikasi: n.kualifikasi,
        catatan: n.catatan_proses,
      });
    });

    const projekList = Array.from(projekMap.values());

    const kualifikasiFullText: Record<string, string> = {
      'SB': 'Sangat Berkembang',
      'BSH': 'Berkembang Sesuai Harapan',
      'MB': 'Mulai Berkembang',
      'BB': 'Belum Berkembang'
    };

    const defaultNotes: Record<string, string> = {
      'SB': 'Siswa mengembangkan kemampuannya melampaui harapan',
      'BSH': 'Siswa telah mengembangkan kemampuan hingga berada dalam tahap ajek',
      'MB': 'Siswa mulai menunjukkan peningkatan kemampuan pada aspek ini',
      'BB': 'Siswa masih membutuhkan bimbingan dalam mengembangkan kemampuannya'
    };

    const P5_STANDARD_SUB_ELEMEN: Record<string, string[]> = {
      'Mandiri': [
        'Mengenali kualitas dan minat diri serta tantangan yang dihadapi & Mengembangkan refleksi diri',
        'Regulasi emosi, penetapan tujuan dan rencana strategis pengembangan diri dan prestasi serta memiliki inisiatif dan bekerja secara mandiri, mengembangkan kendali dan disiplin diri, percaya diri, resilien dan adaptif'
      ],
      'Kreatif': [
        'Menghasilkan gagasan yang beragam dan tepat sesuai dengan kebutuhan masyarakat terhadap sebuah permasalahan yang ada.',
        'Mengeksplorasi dan mengekspresikan pikiran dan perasaannya kedalam sebuah karya.',
        'Mampu mengevaluasi tindakan dan gagasan yang sudah dimiliki serta mengetahui kesesuaian dengan kebutuhan masyarakat umum'
      ],
      'Gotong Royong': [
        'Kerjasama, komunikasi untuk mencapai tujuan bersama, saling ketergantungan positif dan koordinasi sosial',
        'Tanggap terhadap lingkungan, persepsi sosial',
        'Membagi peran dan menyelaraskan tindakan dalam kelompok supaya tercipta keselarasan dan keterbukaan dalam berbagi dengan kelompok.'
      ],
      'Bergotong Royong': [
        'Kerjasama, komunikasi untuk mencapai tujuan bersama, saling ketergantungan positif dan koordinasi sosial',
        'Tanggap terhadap lingkungan, persepsi sosial',
        'Membagi peran dan menyelaraskan tindakan dalam kelompok supaya tercipta keselarasan dan keterbukaan dalam berbagi dengan kelompok.'
      ],
      'Bernalar Kritis': [
        'Mengajukan pertanyaan, mengidentifikasi, mengklarifikasi, dan mengolah informasi dan gagasan',
        'Menganalisis dan mengevaluasi penalaran serta prosedur yang digunakan dalam penyelesaian masalah',
        'Merefleksi dan mengevaluasi pemikirannya sendiri serta mempertimbangkan berbagai perspektif'
      ],
      'Berkebinekaan Global': [
        'Mendalami budaya dan identitas budaya serta mengeksplorasi dinamika budaya yang majemuk',
        'Berkomunikasi dan berinteraksi secara efektif dan santun dengan orang dari latar budaya yang berbeda',
        'Menghilangkan stereotip, prasangka, dan menyelaraskan perbedaan dalam pergaulan sosial'
      ],
      'Beriman & Bertakwa': [
        'Memahami nilai-nilai agama dan mempraktikkannya dalam kehidupan sehari-hari dengan akhlak mulia',
        'Integritas dan merawat diri secara fisik, mental, dan spiritual dengan penuh rasa syukur',
        'Mengutamakan persamaan dengan orang lain dan menghargai perbedaan demi persatuan bangsa',
        'Menjaga kelestarian lingkungan hidup dan alam sekitar sebagai amanah Tuhan'
      ]
    };

    let projekHtml = '';

    projekList.forEach((p) => {
      // Parse metadata from deskripsi
      let tema = 'Kewirausahaan';
      let fase = student.Kelas?.tingkat === 10 ? 'E' : 'F';
      let cleanDesc = p.deskripsi || '';

      const temaMatch = cleanDesc.match(/\[Tema:\s*([^\]]+)\]/i);
      if (temaMatch && temaMatch[1]) {
        tema = temaMatch[1].trim();
        cleanDesc = cleanDesc.replace(temaMatch[0], '');
      }

      const faseMatch = cleanDesc.match(/\[Fase:\s*([^\]]+)\]/i);
      if (faseMatch && faseMatch[1]) {
        fase = faseMatch[1].replace(/Fase\s*/i, '').trim();
        cleanDesc = cleanDesc.replace(faseMatch[0], '');
      }

      const dimensiMatch = cleanDesc.match(/\[Dimensi:\s*([^\]]+)\]/i);
      if (dimensiMatch) {
        cleanDesc = cleanDesc.replace(dimensiMatch[0], '');
      }

      // Group scores by dimension
      const dimMap = new Map<string, Array<{ sub_elemen: string; kualifikasi: string; catatan: string | null }>>();
      p.scores.forEach((s) => {
        if (!dimMap.has(s.dimensi)) {
          dimMap.set(s.dimensi, []);
        }
        dimMap.get(s.dimensi)!.push({
          sub_elemen: s.sub_elemen,
          kualifikasi: s.kualifikasi,
          catatan: s.catatan
        });
      });

      let rowsHtml = '';
      dimMap.forEach((subItems, dimName) => {
        // Dimension Header Row
        rowsHtml += `
          <tr style="background-color: #f3f4f6;">
            <td colspan="4" style="font-weight: bold; font-size: 11px; padding: 6px 10px; border: 1px solid #1f2937; text-transform: uppercase;">
              ${dimName}
            </td>
          </tr>
        `;

        const standardSubs = P5_STANDARD_SUB_ELEMEN[dimName] || P5_STANDARD_SUB_ELEMEN[dimName.replace(/^Ber/i, '')];
        const subElementsToRender: string[] = (subItems.length > 1 || !standardSubs)
          ? subItems.map(item => item.sub_elemen)
          : standardSubs;

        // Sub elements list with letters a., b., c.
        const subListHtml = subElementsToRender.map((subText, idx) => {
          const letter = String.fromCharCode(97 + idx);
          return `
            <div style="display: flex; gap: 6px; margin-bottom: 6px; font-size: 10px; line-height: 1.4;">
              <span style="font-weight: bold; min-width: 14px;">${letter}.</span>
              <span style="text-align: justify;">${subText}</span>
            </div>
          `;
        }).join('');

        // Pick representative kualifikasi & note for this dimension
        const primaryScore = subItems[0];
        const kode = primaryScore?.kualifikasi || 'BSH';
        const fullDesc = primaryScore?.catatan || defaultNotes[kode] || '-';

        rowsHtml += `
          <tr>
            <td style="width: 40%; vertical-align: top; padding: 8px 10px; border: 1px solid #1f2937;">
              ${subListHtml}
            </td>
            <td style="width: 8%; text-align: center; font-weight: bold; font-size: 12px; vertical-align: middle; border: 1px solid #1f2937;">
              ${kode}
            </td>
            <td style="width: 22%; text-align: center; font-size: 11px; vertical-align: middle; border: 1px solid #1f2937; padding: 6px;">
              ${kualifikasiFullText[kode] || kode}
            </td>
            <td style="width: 30%; font-size: 10.5px; line-height: 1.4; vertical-align: middle; border: 1px solid #1f2937; padding: 8px 10px; text-align: justify;">
              ${fullDesc}
            </td>
          </tr>
        `;
      });

      projekHtml += `
        <div style="margin-bottom: 25px; page-break-inside: avoid;">
          <!-- Top Information Box -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px;">
            <tr>
              <td style="width: 18%; padding: 2px 0;">Nama Peserta Didik</td>
              <td style="width: 2%;">:</td>
              <td style="width: 38%; font-weight: bold; text-transform: uppercase;">${student.nama_siswa}</td>
              <td style="width: 18%; padding: 2px 0;">Fase</td>
              <td style="width: 2%;">:</td>
              <td style="width: 22%; font-weight: bold;">${fase}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0;">NIS/NISN</td>
              <td>:</td>
              <td>${student.nis} / ${student.nisn || '-'}</td>
              <td style="padding: 2px 0;">Satuan Pendidikan</td>
              <td>:</td>
              <td>${schoolName}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0;">Kelas</td>
              <td>:</td>
              <td>${student.Kelas?.nama_kelas || '-'}</td>
              <td style="padding: 2px 0;">Program Keahlian</td>
              <td>:</td>
              <td>${student.Kelas?.Jurusan?.nama || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0;">Semester</td>
              <td>:</td>
              <td>${semester?.nama_semester || 'Ganjil'}</td>
              <td style="padding: 2px 0;">Konsentrasi Keahlian</td>
              <td>:</td>
              <td>${student.Kelas?.Jurusan?.nama || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0 2px 0; font-weight: bold;">Tema Projek</td>
              <td style="padding-top: 6px;">:</td>
              <td style="padding-top: 6px; font-weight: bold;">${tema}</td>
              <td colspan="3"></td>
            </tr>
            <tr>
              <td style="padding: 2px 0; font-weight: bold;">Judul Projek</td>
              <td>:</td>
              <td colspan="4" style="font-weight: bold;">${p.judul}</td>
            </tr>
          </table>

          <!-- Matrix Table -->
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #1f2937; margin-bottom: 15px;">
            <thead>
              <tr style="background-color: #d1d5db; font-size: 11px; font-weight: bold;">
                <th style="width: 40%; text-align: left; padding: 8px 10px; border: 1px solid #1f2937;">
                  ${cleanDesc.trim() || p.judul}
                </th>
                <th colspan="3" style="width: 60%; text-align: center; padding: 8px 10px; border: 1px solid #1f2937;">
                  Keterangan
                </th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    });

    if (projekList.length === 0) {
      projekHtml = `<div style="text-align: center; font-style: italic; padding: 40px; border: 1px dashed #777; border-radius: 8px; margin: 30px 0;">Siswa belum memiliki penilaian Projek P5 pada semester ini</div>`;
    }

    let waliKelasNama = '...................................................';
    let waliKelasNip = 'NIP. ...................................................';
    if (student.kelas_id) {
      const waliAssignment = await prisma.organizationalAssignment.findFirst({
        where: {
          tenant_id: tenantId,
          kelas_id: student.kelas_id,
          is_active: true,
          Position: { code: 'WALIKELAS' }
        },
        include: {
          User: {
            include: {
              Guru: true
            }
          }
        }
      });
      if (waliAssignment?.User?.Guru) {
        waliKelasNama = waliAssignment.User.Guru.nama_guru;
        waliKelasNip = waliAssignment.User.Guru.nip ? `NIP. ${waliAssignment.User.Guru.nip}` : 'NIP. -';
      } else if (waliAssignment?.User?.full_name) {
        waliKelasNama = waliAssignment.User.full_name;
        waliKelasNip = 'NIP. -';
      }
    }

    const kepsekNama = raporSettings?.kepsek_nama || sekolah?.kepala_sekolah || '...................................................';
    const kepsekNip = raporSettings?.kepsek_nip ? `NIP. ${raporSettings.kepsek_nip}` : (sekolah?.nip_kepala ? `NIP. ${sekolah.nip_kepala}` : 'NIP. ...................................................');
    const kepsekJabatan = raporSettings?.kepsek_status === 'PLT' ? 'Plt. Kepala Sekolah,' : 'Kepala Sekolah,';
    const tempatTanggal = `${raporSettings?.tempat_terbit || sekolah?.kota || 'Purwakarta'}, ${dateStr}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          body { font-family: 'Arial', sans-serif; font-size: 11px; line-height: 1.4; color: #111; margin: 0; }
          .main-title { text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
          .footer-container { margin-top: 30px; page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div class="main-title">PROJEK PENGUATAN PROFIL PELAJAR PANCASILA (P5)</div>

        ${projekHtml}

        <div class="footer-container">
          <div style="text-align: right; margin-bottom: 10px; font-size: 11px; padding-right: 20px;">
            ${tempatTanggal}
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: center;">
            <tr>
              <td style="width: 50%; padding-bottom: 60px;">Orang Tua/Wali Siswa,</td>
              <td style="width: 50%; padding-bottom: 60px;">Wali Kelas,</td>
            </tr>
            <tr>
              <td>...................................................</td>
              <td style="font-weight: bold; text-decoration: underline;">${waliKelasNama}</td>
            </tr>
            <tr>
              <td></td>
              <td style="font-size: 10px; color: #444;">${waliKelasNip}</td>
            </tr>
          </table>

          <div style="margin-top: 25px; text-align: center; font-size: 11px;">
            <div>Mengetahui;</div>
            <div style="margin-bottom: 60px;">${kepsekJabatan}</div>
            <div style="font-weight: bold; text-decoration: underline;">${kepsekNama}</div>
            <div style="font-size: 10px; color: #444;">${kepsekNip}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.renderHtmlToPdf(html, 'portrait');
  }
}

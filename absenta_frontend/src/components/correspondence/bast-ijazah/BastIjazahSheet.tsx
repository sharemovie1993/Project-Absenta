import React from 'react';
import { PrintDocumentSheet, PrintHeader } from '@/components/ui/PrintHeader';
import type { PreviewBastResponse } from '@/api/correspondence/bastIjazah.api';

interface BastIjazahSheetProps {
  data: PreviewBastResponse;
  tenantInfo?: any;
}

export const BastIjazahSheet: React.FC<BastIjazahSheetProps> = ({ data, tenantInfo }) => {
  const {
    siswa,
    penandatangan,
    nomor_bast,
    nomor_seri_ijazah,
    nomor_skl,
    nomor_sertifikat_ukk,
    tanggal_serah_terima,
    dokumen_diserahkan,
    penerima,
    diserahkan_oleh,
  } = data;

  const formatDate = (val?: string | null) => {
    if (!val) return '-';
    try {
      return new Date(val).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return val;
    }
  };

  const formattedDate = formatDate(tanggal_serah_terima);

  return (
    <PrintDocumentSheet
      orientation="portrait"
      footerText="Platform Absenta - Berita Acara Resmi Dokumen Negara / Akreditasi"
      className="text-slate-900"
    >
      {/* 1. KOP DINAS RESMI */}
      <PrintHeader
        tenantInfo={tenantInfo}
        variant="portrait"
        showLogoDaerah={true}
        showLogoSekolah={true}
        showDivider={true}
      />

      <div style={{ fontFamily: "'Book Antiqua', 'Bookman Old Style', 'Times New Roman', serif", color: '#000000', fontSize: '10pt', lineHeight: 1.4 }}>
        {/* 2. JUDUL DOKUMEN & NOMOR DINAS */}
        <div style={{ textAlign: 'center', marginBottom: '14px', marginTop: '2px' }}>
          <h2
            style={{
              fontSize: '12pt',
              fontWeight: 'bold',
              textDecoration: 'underline',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: '0 0 2px 0',
            }}
          >
            BERITA ACARA SERAH TERIMA IJAZAH & SERTIFIKAT
          </h2>
          <p style={{ fontSize: '9.5pt', fontWeight: 'bold', margin: 0, fontFamily: 'monospace' }}>
            Nomor : {nomor_bast}
          </p>
        </div>

        {/* 3. PARAGRAF PEMBUKA */}
        <p style={{ textAlign: 'justify', marginBottom: '10px' }}>
          Pada hari ini <b>{formattedDate}</b>, bertempat di Kantor Tata Usaha {tenantInfo?.name || penandatangan.nama_sekolah}, telah dilaksanakan serah terima dokumen kelulusan peserta didik oleh dan antara :
        </p>

        {/* 4. PIHAK PERTAMA & KEDUA */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', marginLeft: '12px' }}>
          <tbody>
            <tr>
              <td style={{ width: '4%', verticalAlign: 'top', fontWeight: 'bold' }}>I.</td>
              <td style={{ width: '26%', padding: '1px 4px', verticalAlign: 'top' }}>Nama Petugas</td>
              <td style={{ width: '3%', padding: '1px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '1px 4px', fontWeight: 'bold', verticalAlign: 'top' }}>
                {diserahkan_oleh.nama}
              </td>
            </tr>
            <tr>
              <td></td>
              <td style={{ padding: '1px 4px', verticalAlign: 'top' }}>Jabatan / Tugas</td>
              <td style={{ padding: '1px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '1px 4px', verticalAlign: 'top' }}>
                {diserahkan_oleh.jabatan} — disebut <b>PIHAK PERTAMA</b> (Yang Menyerahkan).
              </td>
            </tr>
            <tr>
              <td style={{ verticalAlign: 'top', fontWeight: 'bold' }}>II.</td>
              <td style={{ padding: '1px 4px', verticalAlign: 'top' }}>Nama Penerima</td>
              <td style={{ padding: '1px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '1px 4px', fontWeight: 'bold', verticalAlign: 'top', textTransform: 'uppercase' }}>
                {penerima.nama}
              </td>
            </tr>
            <tr>
              <td></td>
              <td style={{ padding: '1px 4px', verticalAlign: 'top' }}>Status Hubungan</td>
              <td style={{ padding: '1px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '1px 4px', verticalAlign: 'top' }}>
                {penerima.hubungan} (NIK: {penerima.nik || '-'}) — disebut <b>PIHAK KEDUA</b> (Yang Menerima).
              </td>
            </tr>
          </tbody>
        </table>

        {/* 5. RINCIAN DOKUMEN YANG DISERAHKAN */}
        <p style={{ marginBottom: '6px' }}>
          PIHAK PERTAMA menyerahkan kepada PIHAK KEDUA, dan PIHAK KEDUA menyatakan telah menerima dengan baik dan lengkap dokumen asli peserta didik atas nama <b>{siswa.nama_siswa}</b> (NIS: {siswa.nis} | NISN: {siswa.nisn || '-'} | Rombel: {siswa.kelas}), berupa:
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '6%' }}>No</th>
              <th style={{ border: '1px solid #000', padding: '3px 8px', textAlign: 'left', width: '44%' }}>Jenis Dokumen Negara / Kelulusan</th>
              <th style={{ border: '1px solid #000', padding: '3px 8px', textAlign: 'left', width: '35%' }}>Nomor Seri / Keterangan</th>
              <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '15%' }}>Kondisi</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'center' }}>1</td>
              <td style={{ border: '1px solid #000', padding: '4px 8px', fontWeight: 'bold' }}>Ijazah Asli SMK Kemendikbudristek</td>
              <td style={{ border: '1px solid #000', padding: '4px 8px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                {nomor_seri_ijazah}
              </td>
              <td style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'center' }}>Asli / Baik</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'center' }}>2</td>
              <td style={{ border: '1px solid #000', padding: '4px 8px' }}>Buku Rapor Asli Semester 1 s.d. 6</td>
              <td style={{ border: '1px solid #000', padding: '4px 8px' }}>Lengkap bertanda tangan</td>
              <td style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'center' }}>Asli / Baik</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'center' }}>3</td>
              <td style={{ border: '1px solid #000', padding: '4px 8px' }}>Sertifikat Uji Kompetensi Keahlian (UKK)</td>
              <td style={{ border: '1px solid #000', padding: '4px 8px', fontFamily: 'monospace' }}>
                {nomor_sertifikat_ukk || '-'}
              </td>
              <td style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'center' }}>Asli / Baik</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'center' }}>4</td>
              <td style={{ border: '1px solid #000', padding: '4px 8px' }}>Surat Keterangan Lulus (SKL)</td>
              <td style={{ border: '1px solid #000', padding: '4px 8px', fontFamily: 'monospace' }}>
                {nomor_skl || '-'}
              </td>
              <td style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'center' }}>Asli / Baik</td>
            </tr>
          </tbody>
        </table>

        {/* 6. KLAUSUL TANGGUNG JAWAB DOKUMEN */}
        <p style={{ textAlign: 'justify', marginBottom: '12px' }}>
          Dengan ditandatanganinya Berita Acara ini, maka seluruh dokumen asli tersebut telah beralih tanggung jawab pemeliharaannya kepada PIHAK KEDUA. Satuan pendidikan tidak melayani penerbitan blangko ijazah kedua apabila terjadi kehilangan atau kerusakan di kemudian hari.
        </p>

        {/* 7. BLOK TANDA TANGAN 2 PIHAK + CAP 3 JARI + KEPALA SEKOLAH */}
        <div style={{ marginTop: '14px', pageBreakInside: 'avoid' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            {/* Sisi Kiri: PIHAK KEDUA + KOTAK CAP 3 JARI */}
            <div style={{ width: '48%', textAlign: 'center', border: '1px dashed #cbd5e1', padding: '8px', borderRadius: '8px' }}>
              <div style={{ fontWeight: 'bold' }}>PIHAK KEDUA (Yang Menerima)</div>
              <div style={{ fontSize: '8.5pt', color: '#555', marginBottom: '6px' }}>Cap 3 Jari Tengah Tangan Kiri di kotak ini :</div>

              {/* KOTAK CAP 3 JARI */}
              <div
                style={{
                  width: '130px',
                  height: '65px',
                  border: '1.5px solid #000',
                  margin: '0 auto 6px auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8pt',
                  color: '#94a3b8',
                  backgroundColor: '#fafafa',
                }}
              >
                Cap 3 Jari Kiri
              </div>

              <div style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
                {penerima.nama}
              </div>
              <div style={{ fontSize: '8.5pt' }}>Penerima / {penerima.hubungan}</div>
            </div>

            {/* Sisi Kanan: PIHAK PERTAMA (PETUGAS TU) */}
            <div style={{ width: '45%', textAlign: 'center', padding: '8px' }}>
              <div style={{ fontWeight: 'bold' }}>PIHAK PERTAMA (Yang Menyerahkan)</div>
              <div style={{ fontSize: '8.5pt', color: '#555', marginBottom: '6px' }}>Pengelola Ijazah / Tata Usaha</div>
              <div style={{ height: '65px' }}></div>
              <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                {diserahkan_oleh.nama}
              </div>
              <div style={{ fontSize: '8.5pt' }}>{diserahkan_oleh.jabatan}</div>
            </div>
          </div>

          {/* Mengetahui Kepala Sekolah */}
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <div>Mengetahui,</div>
            <div style={{ fontWeight: 'bold', marginTop: '2px' }}>Kepala Sekolah,</div>
            <div
              style={{
                height: '65px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  width: '60px',
                  height: '60px',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '7.5pt',
                  color: '#94a3b8',
                  transform: 'rotate(-15deg)',
                }}
              >
                Cap Dinas
              </div>
            </div>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
              {penandatangan.nama_kepala_sekolah}
            </div>
            <div style={{ fontSize: '9pt', fontFamily: 'monospace' }}>
              NIP. {penandatangan.nip_kepala_sekolah}
            </div>
          </div>
        </div>
      </div>
    </PrintDocumentSheet>
  );
};

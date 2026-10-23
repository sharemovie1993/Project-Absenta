import React from 'react';
import { PrintDocumentSheet, PrintHeader } from '@/components/ui/PrintHeader';
import type { PreviewSuratKeteranganResponse } from '@/api/correspondence/suratKeterangan.api';

interface SuratKeteranganSheetProps {
  data: PreviewSuratKeteranganResponse;
  tenantInfo?: any;
}

export const SuratKeteranganSheet: React.FC<SuratKeteranganSheetProps> = ({ data, tenantInfo }) => {
  const { siswa, penandatangan, judul_surat, nomor_surat, tanggal_surat_formatted, kota_sekolah, klausul_pernyataan } = data;

  return (
    <PrintDocumentSheet
      orientation="portrait"
      footerText="Platform Absenta - Layanan Persuratan & Tata Usaha Sekolah"
      className="text-slate-900"
    >
      {/* 1. KOP SURAT RESMI DINAS */}
      <PrintHeader
        tenantInfo={tenantInfo}
        variant="portrait"
        showLogoDaerah={true}
        showLogoSekolah={true}
        showDivider={true}
      />

      <div style={{ fontFamily: "'Book Antiqua', 'Bookman Old Style', 'Times New Roman', serif", color: '#000000', fontSize: '11pt', lineHeight: 1.5 }}>
        {/* 2. JUDUL DOKUMEN & NOMOR SURAT */}
        <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '6px' }}>
          <h2
            style={{
              fontSize: '13pt',
              fontWeight: 'bold',
              textDecoration: 'underline',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: '0 0 2px 0',
            }}
          >
            {judul_surat}
          </h2>
          <p style={{ fontSize: '10.5pt', fontWeight: 'bold', margin: 0, fontFamily: 'monospace' }}>
            Nomor : {nomor_surat}
          </p>
        </div>

        {/* 3. PARAGRAF PEMBUKA */}
        <p style={{ textAlign: 'justify', marginBottom: '14px', textIndent: '32px' }}>
          Yang bertanda tangan di bawah ini, Kepala Sekolah {tenantInfo?.name || 'SMK Negeri 1 Plered'} menerangkan dengan sesungguhnya bahwa :
        </p>

        {/* 4. DATA IDENTITAS SISWA */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', marginLeft: '16px' }}>
          <tbody>
            <tr>
              <td style={{ width: '32%', padding: '2px 4px', verticalAlign: 'top' }}>Nama Lengkap</td>
              <td style={{ width: '3%', padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', fontWeight: 'bold', textTransform: 'uppercase', verticalAlign: 'top' }}>
                {siswa.nama_siswa}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>Nomor Induk Siswa (NIS)</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', fontFamily: 'monospace', verticalAlign: 'top' }}>{siswa.nis}</td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>NISN</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', fontFamily: 'monospace', verticalAlign: 'top' }}>{siswa.nisn || '-'}</td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>Tempat, Tanggal Lahir</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>{siswa.ttl}</td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>Jenis Kelamin</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>{siswa.jenis_kelamin}</td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>Tingkat / Kelas</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', fontWeight: 'bold', verticalAlign: 'top' }}>{siswa.kelas}</td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>Nama Orang Tua / Wali</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>{siswa.nama_ortu}</td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>Pekerjaan Orang Tua</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>{siswa.pekerjaan_ortu}</td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>Alamat Tempat Tinggal</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>{siswa.alamat}</td>
            </tr>
          </tbody>
        </table>

        {/* 5. KLAUSUL PERNYATAAN RESMI */}
        {klausul_pernyataan.split('\n\n').map((paragraph, idx) => (
          <p key={idx} style={{ textAlign: 'justify', marginBottom: '12px', textIndent: '32px' }}>
            {paragraph}
          </p>
        ))}

        {/* 6. PARAGRAF PENUTUP */}
        <p style={{ textAlign: 'justify', marginBottom: '28px', textIndent: '32px' }}>
          Demikian surat keterangan ini kami buat dengan sebenarnya, agar dapat dipergunakan sebagaimana mestinya.
        </p>

        {/* 7. BLOK TANDA TANGAN BASAH & STEMPEL RESMI KEPALA SEKOLAH */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <div style={{ width: '260px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 2px 0' }}>
              {kota_sekolah}, {tanggal_surat_formatted}
            </p>
            <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>
              {penandatangan.jabatan},
            </p>

            {/* Ruang Cap Stempel Basah & Tanda Tangan Basah Fisik (Tinggi 70px / ~28mm) */}
            <div
              style={{
                height: '75px',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '8pt', color: '#94a3b8', fontStyle: 'italic', border: '1px dashed #cbd5e1', padding: '2px 8px', borderRadius: '4px' }}>
                [ Tanda Tangan & Cap Stempel Basah ]
              </span>
            </div>

            <p style={{ fontWeight: 'bold', textDecoration: 'underline', margin: '0 0 2px 0', fontSize: '11pt' }}>
              {penandatangan.nama}
            </p>
            <p style={{ fontSize: '10pt', margin: 0, fontFamily: 'monospace' }}>
              NIP. {penandatangan.nip}
            </p>
          </div>
        </div>
      </div>
    </PrintDocumentSheet>
  );
};

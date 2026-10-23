import React from 'react';
import { PrintDocumentSheet, PrintHeader } from '@/components/ui/PrintHeader';
import type { PreviewMutasiMasukResponse } from '@/api/correspondence/mutasi.api';

interface SuratDiterimaSheetProps {
  data: PreviewMutasiMasukResponse;
  tenantInfo?: any;
}

export const SuratDiterimaSheet: React.FC<SuratDiterimaSheetProps> = ({ data, tenantInfo }) => {
  const { siswa, penandatangan, nomor_surat, sekolah_asal, target_kelas, tingkat, tanggal_surat, no_rekomendasi_dinas } = data;

  const formatDate = (val?: string | null) => {
    if (!val) return '-';
    try {
      return new Date(val).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return val;
    }
  };

  const tanggalSuratFormatted = formatDate(tanggal_surat);

  return (
    <PrintDocumentSheet
      orientation="portrait"
      footerText="Platform Absenta - Administrasi Kesiswaan & Mutasi Siswa"
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

      <div style={{ fontFamily: "'Book Antiqua', 'Bookman Old Style', 'Times New Roman', serif", color: '#000000', fontSize: '10.5pt', lineHeight: 1.5 }}>
        {/* 2. JUDUL DOKUMEN & NOMOR SURAT */}
        <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '6px' }}>
          <h2
            style={{
              fontSize: '12.5pt',
              fontWeight: 'bold',
              textDecoration: 'underline',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: '0 0 2px 0',
            }}
          >
            SURAT KETERANGAN PENERIMAAN SISWA PINDAHAN
          </h2>
          <p style={{ fontSize: '10pt', fontWeight: 'bold', margin: 0, fontFamily: 'monospace' }}>
            Nomor : {nomor_surat}
          </p>
        </div>

        {/* 3. PARAGRAF PEMBUKA */}
        <p style={{ textAlign: 'justify', marginBottom: '12px', textIndent: '28px' }}>
          Menindaklanjuti permohonan pindah sekolah dari Kepala Sekolah {sekolah_asal}, yang bertanda tangan di bawah ini Kepala Sekolah {tenantInfo?.name || penandatangan.nama_sekolah} menerangkan bahwa satuan pendidikan kami pada prinsipnya :
        </p>

        {/* 4. PERNYATAAN PENERIMAAN */}
        <div style={{ textAlign: 'center', margin: '14px 0', padding: '6px 0', fontWeight: 'bold', fontSize: '12pt', textTransform: 'uppercase', letterSpacing: '1px' }}>
          -- DAPAT MENERIMA --
        </div>

        <p style={{ textAlign: 'justify', marginBottom: '12px' }}>
          Sebagai peserta didik baru pindahan pada satuan pendidikan kami, kepada :
        </p>

        {/* 5. DATA IDENTITAS SISWA */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', marginLeft: '16px' }}>
          <tbody>
            <tr>
              <td style={{ width: '30%', padding: '2px 4px', verticalAlign: 'top' }}>Nama Peserta Didik</td>
              <td style={{ width: '3%', padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', fontWeight: 'bold', textTransform: 'uppercase', verticalAlign: 'top' }}>
                {siswa.nama_siswa}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>NISN</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', fontFamily: 'monospace', verticalAlign: 'top' }}>{siswa.nisn || '-'}</td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>Sekolah Asal</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>{sekolah_asal}</td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>Ditempatkan Pada Kelas</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', fontWeight: 'bold', verticalAlign: 'top' }}>
                {target_kelas} (Tingkat {tingkat})
              </td>
            </tr>
            {no_rekomendasi_dinas && (
              <tr>
                <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>Rekomendasi Dinas</td>
                <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
                <td style={{ padding: '2px 4px', fontFamily: 'monospace', verticalAlign: 'top' }}>{no_rekomendasi_dinas}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 6. PERSYARATAN BERKAS */}
        <p style={{ textAlign: 'justify', marginBottom: '10px' }}>
          Penerimaan tersebut didasarkan atas ketersediaan daya tampung rombongan belajar dan pemenuhan syarat administratif. Yang bersangkutan dapat segera aktif mengikuti kegiatan pembelajaran setelah seluruh kelengkapan berkas resmi (Surat Keterangan Pindah Sekolah asal dan Buku Rapor Asli) telah diserahkan kepada Bagian Tata Usaha.
        </p>

        <p style={{ textAlign: 'justify', marginBottom: '20px' }}>
          Demikian surat keterangan penerimaan ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.
        </p>

        {/* 7. BLOK TANDA TANGAN MANUAL BASAH KEPALA SEKOLAH */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', pageBreakInside: 'avoid' }}>
          <div style={{ width: '260px', textAlign: 'left', fontSize: '10.5pt' }}>
            <div>
              {penandatangan.kota}, {tanggalSuratFormatted}
            </div>
            <div style={{ marginTop: '2px' }}>Kepala Sekolah,</div>

            {/* Ruang stempel & tanda tangan manual basah berjarak 28 mm */}
            <div
              style={{
                height: '75px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '-48px',
                  width: '68px',
                  height: '68px',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8pt',
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
            <div style={{ fontSize: '9.5pt', marginTop: '2px', fontFamily: 'monospace' }}>
              NIP. {penandatangan.nip_kepala_sekolah}
            </div>
          </div>
        </div>
      </div>
    </PrintDocumentSheet>
  );
};

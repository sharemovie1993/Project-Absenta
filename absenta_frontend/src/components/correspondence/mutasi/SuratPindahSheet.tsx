import React from 'react';
import { PrintDocumentSheet, PrintHeader } from '@/components/ui/PrintHeader';
import type { PreviewMutasiKeluarResponse } from '@/api/correspondence/mutasi.api';

interface SuratPindahSheetProps {
  data: PreviewMutasiKeluarResponse;
  tenantInfo?: any;
}

export const SuratPindahSheet: React.FC<SuratPindahSheetProps> = ({ data, tenantInfo }) => {
  const { siswa, penandatangan, nomor_surat, sekolah_tujuan, alasan, no_rekomendasi_dinas, tanggal_surat } = data;

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

  const ttlFormatted = [siswa.tempat_lahir, formatDate(siswa.tanggal_lahir)].filter(Boolean).join(', ');
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

      <div style={{ fontFamily: "'Book Antiqua', 'Bookman Old Style', 'Times New Roman', serif", color: '#000000', fontSize: '10.5pt', lineHeight: 1.45 }}>
        {/* 2. JUDUL DOKUMEN & NOMOR SURAT */}
        <div style={{ textAlign: 'center', marginBottom: '16px', marginTop: '4px' }}>
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
            SURAT KETERANGAN PINDAH SEKOLAH
          </h2>
          <p style={{ fontSize: '10pt', fontWeight: 'bold', margin: 0, fontFamily: 'monospace' }}>
            Nomor : {nomor_surat}
          </p>
        </div>

        {/* 3. PARAGRAF PEMBUKA */}
        <p style={{ textAlign: 'justify', marginBottom: '10px', textIndent: '28px' }}>
          Yang bertanda tangan di bawah ini, Kepala Sekolah {tenantInfo?.name || penandatangan.nama_sekolah} menerangkan bahwa :
        </p>

        {/* 4. FORM 8 BUTIR KESISWAAN MUTASI */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', marginLeft: '12px' }}>
          <tbody>
            <tr>
              <td style={{ width: '34%', padding: '2px 4px', verticalAlign: 'top' }}>1. Nama Peserta Didik</td>
              <td style={{ width: '2%', padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', fontWeight: 'bold', textTransform: 'uppercase', verticalAlign: 'top' }}>
                {siswa.nama_siswa}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>2. NIS / NISN</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', fontFamily: 'monospace', verticalAlign: 'top' }}>
                {siswa.nis} / {siswa.nisn || '-'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>3. Tempat, Tanggal Lahir</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>{ttlFormatted}</td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>4. Jenis Kelamin</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>{siswa.gender}</td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>5. Kelas / Tingkat Terakhir</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', fontWeight: 'bold', verticalAlign: 'top' }}>
                {siswa.kelas} (Tingkat {siswa.tingkat})
              </td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>6. Sesuai Permohonan Orang Tua</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}></td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px 2px 24px', verticalAlign: 'top', color: '#333' }}>a. Nama Orang Tua / Wali</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>{siswa.nama_orang_tua}</td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px 2px 24px', verticalAlign: 'top', color: '#333' }}>b. Pekerjaan</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>{siswa.pekerjaan_orang_tua}</td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px 2px 24px', verticalAlign: 'top', color: '#333' }}>c. Alamat Domisili</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>{siswa.alamat_orang_tua}</td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>7. Pindah ke Sekolah Tujuan</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', fontWeight: 'bold', textTransform: 'uppercase', verticalAlign: 'top' }}>
                {sekolah_tujuan}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>8. Alasan Kepindahan</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>{alasan}</td>
            </tr>
            {no_rekomendasi_dinas && (
              <tr>
                <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>Surat Rekomendasi Dinas</td>
                <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
                <td style={{ padding: '2px 4px', fontFamily: 'monospace', verticalAlign: 'top' }}>{no_rekomendasi_dinas}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 5. KLAUSUL BERKAS */}
        <p style={{ textAlign: 'justify', marginBottom: '8px' }}>
          Bersama surat ini kami serahkan Buku Laporan Hasil Belajar (Rapor) peserta didik yang bersangkutan. Surat keterangan pindah sekolah ini diberikan kepada yang bersangkutan untuk dipergunakan sebagaimana mestinya.
        </p>
        <p style={{ textAlign: 'justify', marginBottom: '16px', fontSize: '9.5pt', fontStyle: 'italic', color: '#444' }}>
          *Catatan: Setelah peserta didik tersebut diterima secara resmi di sekolah tujuan, lembar konfirmasi tanda terima mohon dikirimkan kembali ke sekolah asal.
        </p>

        {/* 6. BLOK TANDA TANGAN KEPALA SEKOLAH MANUAL BASAH */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', pageBreakInside: 'avoid' }}>
          <div style={{ width: '260px', textAlign: 'left', fontSize: '10.5pt' }}>
            <div>
              {penandatangan.kota}, {tanggalSuratFormatted}
            </div>
            <div style={{ marginTop: '2px' }}>Kepala Sekolah,</div>

            {/* Ruang stempel & tanda tangan manual basah berjarak 28 mm (~90px) */}
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

import React from 'react';
import { PrintDocumentSheet, PrintHeader } from '@/components/ui/PrintHeader';
import type { PreviewSuratPengantarResponse } from '@/api/correspondence/dkn.api';

interface SuratPengantarDknSheetProps {
  data: PreviewSuratPengantarResponse['data'];
  tenantInfo?: any;
}

export const SuratPengantarDknSheet: React.FC<SuratPengantarDknSheetProps> = ({ data, tenantInfo }) => {
  const {
    nomor_surat,
    lampiran,
    perihal,
    tanggal_surat,
    tujuan_dinas,
    alamat_dinas,
    tahun_pelajaran,
    program_keahlian,
    rekapitulasi,
    pejabat,
    catatan_pengantar,
  } = data;

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

  return (
    <PrintDocumentSheet
      orientation="portrait"
      pageNumber={1}
      totalPages={1}
      footerText="Surat Pengantar Dinas Penyerahan Berkas Kelulusan & DKN"
      className="text-slate-900"
    >
      {/* 1. KOP DINAS RESMI PORTRAIT */}
      <PrintHeader
        tenantInfo={tenantInfo}
        variant="portrait"
        showLogoDaerah={true}
        showLogoSekolah={true}
        showDivider={true}
      />

      <div style={{ fontFamily: "'Times New Roman', serif", fontSize: '10.5pt', lineHeight: 1.45, marginTop: '8px' }}>
        {/* 2. ATRIBUT PERSURATAN (NOMOR, LAMPIRAN, PERIHAL, TANGGAL) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <table style={{ width: '60%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '80px', verticalAlign: 'top' }}>Nomor</td>
                <td style={{ width: '10px', verticalAlign: 'top' }}>:</td>
                <td style={{ fontWeight: 'bold' }}>{nomor_surat}</td>
              </tr>
              <tr>
                <td style={{ verticalAlign: 'top' }}>Sifat</td>
                <td style={{ verticalAlign: 'top' }}>:</td>
                <td>Penting / Resmi</td>
              </tr>
              <tr>
                <td style={{ verticalAlign: 'top' }}>Lampiran</td>
                <td style={{ verticalAlign: 'top' }}>:</td>
                <td>{lampiran}</td>
              </tr>
              <tr>
                <td style={{ verticalAlign: 'top' }}>Perihal</td>
                <td style={{ verticalAlign: 'top' }}>:</td>
                <td style={{ fontWeight: 'bold' }}>{perihal}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ textAlign: 'right', width: '35%' }}>
            <div>{pejabat.kota}, {formatDate(tanggal_surat)}</div>
          </div>
        </div>

        {/* 3. TUJUAN SURAT DINAS */}
        <div style={{ marginBottom: '18px' }}>
          <div>Kepada Yth.</div>
          <div style={{ fontWeight: 'bold' }}>{tujuan_dinas}</div>
          <div>{alamat_dinas}</div>
        </div>

        {/* 4. ISI SURAT DINAS */}
        <div style={{ textAlign: 'justify', marginBottom: '12px', textIndent: '30px' }}>
          Dengan hormat, sehubungan telah diselesaikannya seluruh rangkaian proses pembelajaran, Asesmen Akhir Jenjang, Uji Kompetensi Keahlian (UKK), serta Rapat Pleno Penetapan Kelulusan Peserta Didik SMK Tahun Pelajaran <b>{tahun_pelajaran}</b>, bersama surat ini kami sampaikan berkas laporan kelulusan dan dokumen <b>Daftar Kolektif Nilai (DKN)</b> untuk diverifikasi dan dijadikan dasar penerbitan Ijazah.
        </div>

        {/* 5. TABEL LAMPIRAN BERKAS RESMI */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Adapun rincian berkas yang kami lampirkan adalah sebagai berikut:</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginTop: '4px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <th style={{ border: '0.5px solid #000', padding: '4px 6px', textAlign: 'center', width: '30px' }}>No.</th>
                <th style={{ border: '0.5px solid #000', padding: '4px 8px', textAlign: 'left' }}>Jenis Dokumen / Berkas</th>
                <th style={{ border: '0.5px solid #000', padding: '4px 8px', textAlign: 'center', width: '90px' }}>Jumlah</th>
                <th style={{ border: '0.5px solid #000', padding: '4px 8px', textAlign: 'left', width: '160px' }}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '0.5px solid #000', padding: '4px 6px', textAlign: 'center' }}>1</td>
                <td style={{ border: '0.5px solid #000', padding: '4px 8px' }}>
                  <b>Daftar Kolektif Nilai (DKN) Asli</b>
                  <div style={{ fontSize: '8.5pt', color: '#475569' }}>Program Keahlian: {program_keahlian}</div>
                </td>
                <td style={{ border: '0.5px solid #000', padding: '4px 8px', textAlign: 'center' }}>2 Rangkap</td>
                <td style={{ border: '0.5px solid #000', padding: '4px 8px' }}>Asli Cap Basah & Legalitas</td>
              </tr>
              <tr>
                <td style={{ border: '0.5px solid #000', padding: '4px 6px', textAlign: 'center' }}>2</td>
                <td style={{ border: '0.5px solid #000', padding: '4px 8px' }}>
                  <b>Berita Acara Rapat Kelulusan Satuan Pendidikan</b>
                </td>
                <td style={{ border: '0.5px solid #000', padding: '4px 8px', textAlign: 'center' }}>1 Berkas</td>
                <td style={{ border: '0.5px solid #000', padding: '4px 8px' }}>Dilengkapi Daftar Hadir Dewan Guru</td>
              </tr>
              <tr>
                <td style={{ border: '0.5px solid #000', padding: '4px 6px', textAlign: 'center' }}>3</td>
                <td style={{ border: '0.5px solid #000', padding: '4px 8px' }}>
                  <b>Rekapitulasi Daya Tampung & Kelulusan</b>
                </td>
                <td style={{ border: '0.5px solid #000', padding: '4px 8px', textAlign: 'center' }}>1 Lembar</td>
                <td style={{ border: '0.5px solid #000', padding: '4px 8px' }}>
                  Total: {rekapitulasi.total_siswa} Siswa (Lulus: {rekapitulasi.total_lulus})
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* CATATAN PENGANTAR OPSIONAL */}
        {catatan_pengantar && (
          <div style={{ marginBottom: '14px', borderLeft: '3px solid #64748b', paddingLeft: '8px', fontSize: '9.5pt', fontStyle: 'italic' }}>
            Catatan Tambahan: {catatan_pengantar}
          </div>
        )}

        <div style={{ textAlign: 'justify', marginBottom: '24px', textIndent: '30px' }}>
          Demikian surat pengantar ini kami sampaikan. Atas perhatian, bimbingan, dan kerja sama yang baik dari Bapak/Ibu Kepala Cabang Dinas Pendidikan Wilayah, kami ucapkan terima kasih.
        </div>

        {/* 6. TANDA TANGAN KEPALA SEKOLAH RESMI */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <div style={{ width: '45%', textAlign: 'center', position: 'relative' }}>
            <div>Kepala Sekolah,</div>

            {/* Cap Stempel Lingkaran 28mm wet signature area */}
            <div style={{ height: '56px', position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '6px',
                  width: '46px',
                  height: '46px',
                  border: '1.5px dashed #94a3b8',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '6.5pt',
                  color: '#94a3b8',
                  textAlign: 'center',
                  transform: 'rotate(-12deg)',
                }}
              >
                Cap Stempel Sekolah
              </div>
            </div>

            <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
              {pejabat.kepala_sekolah.nama}
            </div>
            <div>NIP. {pejabat.kepala_sekolah.nip}</div>
          </div>
        </div>
      </div>
    </PrintDocumentSheet>
  );
};

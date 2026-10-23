import React from 'react';
import { PrintDocumentSheet, PrintHeader } from '@/components/ui/PrintHeader';
import type { PreviewBebasAdministrasiResponse } from '@/api/correspondence/bastIjazah.api';

interface SuratBebasAdministrasiSheetProps {
  data: PreviewBebasAdministrasiResponse;
  tenantInfo?: any;
}

export const SuratBebasAdministrasiSheet: React.FC<SuratBebasAdministrasiSheetProps> = ({
  data,
  tenantInfo,
}) => {
  const { siswa, penandatangan, nomor_surat, tanggal_surat, keperluan, pos_clearance } = data;

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

  const posList = [
    {
      no: 1,
      unit: 'Perpustakaan Sekolah',
      detail: 'Pengembalian buku paket KBM & bebas denda',
      item: pos_clearance.perpustakaan,
    },
    {
      no: 2,
      unit: 'Bagian Keuangan / TU',
      detail: 'Lunas iuran komite / administrasi sekolah',
      item: pos_clearance.keuangan,
    },
    {
      no: 3,
      unit: 'Bengkel Kejuruan / Lab',
      detail: 'Alat praktek tuntas & laporan PKL',
      item: pos_clearance.bengkel_jurusan,
    },
    {
      no: 4,
      unit: 'Bimbingan Konseling (BK)',
      detail: 'Bebas sanksi kedisiplinan (0 poin pelanggaran)',
      item: pos_clearance.bk,
    },
    {
      no: 5,
      unit: 'Wali Kelas',
      detail: 'Penyerahan pasfoto ijazah 3x4 dop & rapor tuntas',
      item: pos_clearance.wali_kelas,
    },
  ];

  return (
    <PrintDocumentSheet
      orientation="portrait"
      footerText="Platform Absenta - Administrasi Pelepasan & Kelulusan Siswa"
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

      <div style={{ fontFamily: "'Book Antiqua', 'Bookman Old Style', 'Times New Roman', serif", color: '#000000', fontSize: '10.5pt', lineHeight: 1.45 }}>
        {/* 2. JUDUL DOKUMEN & NOMOR DINAS */}
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
            SURAT KETERANGAN BEBAS ADMINISTRASI SEKOLAH
          </h2>
          <p style={{ fontSize: '10pt', fontWeight: 'bold', margin: 0, fontFamily: 'monospace' }}>
            Nomor : {nomor_surat}
          </p>
        </div>

        {/* 3. PARAGRAF PEMBUKA */}
        <p style={{ textAlign: 'justify', marginBottom: '10px', textIndent: '28px' }}>
          Yang bertanda tangan di bawah ini, Kepala Sekolah {tenantInfo?.name || penandatangan.nama_sekolah} menerangkan bahwa peserta didik :
        </p>

        {/* 4. BIODATA SISWA */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', marginLeft: '12px' }}>
          <tbody>
            <tr>
              <td style={{ width: '28%', padding: '2px 4px', verticalAlign: 'top' }}>Nama Lengkap</td>
              <td style={{ width: '3%', padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', fontWeight: 'bold', textTransform: 'uppercase', verticalAlign: 'top' }}>
                {siswa.nama_siswa}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>NIS / NISN</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', fontFamily: 'monospace', verticalAlign: 'top' }}>
                {siswa.nis} / {siswa.nisn || '-'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>Kelas / Rombel</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', fontWeight: 'bold', verticalAlign: 'top' }}>
                {siswa.kelas} (Tahun Pelajaran {siswa.tahun_pelajaran})
              </td>
            </tr>
            <tr>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>Keperluan</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>{keperluan}</td>
            </tr>
          </tbody>
        </table>

        {/* 5. TABEL 5 POS VERIFIKASI CLEARANCE */}
        <p style={{ marginBottom: '6px' }}>
          Telah menyelesaikan seluruh kewajiban tanggungan administrasi pada pos-pos verifikasi sebagai berikut:
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', marginBottom: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'center', width: '6%' }}>No</th>
              <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'left', width: '32%' }}>Unit / Pos Verifikasi</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', width: '16%' }}>Status</th>
              <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'left', width: '26%' }}>Petugas Verifikator</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', width: '16%' }}>Paraf</th>
            </tr>
          </thead>
          <tbody>
            {posList.map((p) => {
              const isBebas = p.item?.status === 'BEBAS';
              return (
                <tr key={p.no}>
                  <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>{p.no}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                    <div style={{ fontWeight: 'bold' }}>{p.unit}</div>
                    <div style={{ fontSize: '8pt', color: '#444' }}>{p.detail}</div>
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'center', fontWeight: 'bold' }}>
                    {isBebas ? 'LUNAS / BEBAS' : 'BELUM BEBAS'}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                    <div>{p.item?.petugas || '-'}</div>
                    {p.item?.catatan && <div style={{ fontSize: '8pt', color: '#555', fontStyle: 'italic' }}>Ket: {p.item.catatan}</div>}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'center' }}>
                    <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isBebas ? <span style={{ fontSize: '11pt' }}>✓</span> : '-'}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 6. KLAUSUL KELAYAKAN */}
        <p style={{ textAlign: 'justify', marginBottom: '14px' }}>
          Dengan diterbitkannya surat keterangan ini, maka yang bersangkutan dinyatakan <b>BERSIH DAN BEBAS</b> dari seluruh tanggungan fasilitas, sarana, dan keuangan sekolah, serta berhak untuk menerima penyerahan Ijazah Asli, Rapor, dan Sertifikat Kelulusan.
        </p>

        {/* 7. BLOK TANDA TANGAN MANUAL BASAH KEPALA SEKOLAH */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', pageBreakInside: 'avoid' }}>
          <div style={{ width: '260px', textAlign: 'left', fontSize: '10.5pt' }}>
            <div>
              {penandatangan.kota}, {formatDate(tanggal_surat)}
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

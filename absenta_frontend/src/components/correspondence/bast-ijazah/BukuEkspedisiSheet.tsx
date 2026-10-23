import React from 'react';
import { PrintDocumentSheet, PrintHeader } from '@/components/ui/PrintHeader';
import type { BukuEkspedisiResponse } from '@/api/correspondence/bastIjazah.api';

interface BukuEkspedisiSheetProps {
  data: BukuEkspedisiResponse;
  tahunPelajaran?: string;
  tenantInfo?: any;
}

export const BukuEkspedisiSheet: React.FC<BukuEkspedisiSheetProps> = ({
  data,
  tahunPelajaran,
  tenantInfo,
}) => {
  const { entries, rekap, penandatangan } = data;

  const formatDate = (val?: string | null) => {
    if (!val) return '-';
    try {
      return new Date(val).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return val;
    }
  };

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <PrintDocumentSheet
      orientation="landscape"
      footerText="Buku Register Ekspedisi Ijazah - Instrumen Standar Akreditasi BAN-PDM / Kemendikbudristek"
      className="text-slate-900"
    >
      {/* 1. KOP DINAS RESMI LANDSCAPE */}
      <PrintHeader
        tenantInfo={tenantInfo}
        variant="landscape"
        showLogoDaerah={true}
        showLogoSekolah={true}
        showDivider={true}
      />

      <div style={{ fontFamily: "'Times New Roman', serif", fontSize: '9pt', lineHeight: 1.35 }}>
        {/* 2. JUDUL DOKUMEN */}
        <div style={{ textAlign: 'center', marginBottom: '10px', marginTop: '2px' }}>
          <h2 style={{ fontSize: '11.5pt', fontWeight: 'bold', margin: '0 0 2px 0', letterSpacing: '0.5px' }}>
            BUKU REGISTER EKSPEDISI PENYERAHAN IJAZAH & SERTIFIKAT
          </h2>
          <p style={{ fontSize: '9pt', margin: 0 }}>
            Tahun Pelajaran / Kelulusan: <b>{tahunPelajaran || 'Semua Tahun Kelulusan'}</b>
          </p>
        </div>

        {/* 3. REKAPITULASI SUMMARY BRANKAS */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', fontSize: '8.5pt' }}>
          <div style={{ border: '1px solid #000', padding: '3px 8px', borderRadius: '3px' }}>
            Total Ijazah Terbit : <b>{rekap.total_lulusan} Blangko</b>
          </div>
          <div style={{ border: '1px solid #000', padding: '3px 8px', borderRadius: '3px', backgroundColor: '#f0fdf4' }}>
            Sudah Diserahkan (BAST) : <b>{rekap.total_sudah_diambil} Ijazah</b>
          </div>
          <div style={{ border: '1px solid #000', padding: '3px 8px', borderRadius: '3px', backgroundColor: '#fffbeb', fontWeight: 'bold' }}>
            Sisa di Brankas Sekolah : {rekap.total_di_brankas} Ijazah
          </div>
        </div>

        {/* 4. TABEL REGISTER RESMI EKSPEDISI */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '3%' }}>No</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left', width: '18%' }}>Nama Peserta Didik</th>
              <th style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'left', width: '11%' }}>NIS / NISN</th>
              <th style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'center', width: '8%' }}>Kelas</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left', width: '15%' }}>No. Seri Ijazah Asli</th>
              <th style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'center', width: '8%' }}>Tgl Ambil</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left', width: '16%' }}>Penerima / Hubungan</th>
              <th style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'center', width: '9%' }}>Status</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', width: '8%' }}>Paraf</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ border: '1px solid #000', padding: '16px', textAlign: 'center', color: '#666' }}>
                  Belum ada data ekspedisi penyerahan ijazah yang tercatat.
                </td>
              </tr>
            ) : (
              entries.map((entry, idx) => {
                const isDiambil = entry.status_ambil === 'DIAMBIL';
                return (
                  <tr key={entry.siswa_id || idx}>
                    <td style={{ border: '1px solid #000', padding: '3px 2px', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 6px', fontWeight: 600 }}>{entry.nama_siswa}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 4px', fontFamily: 'monospace', fontSize: '8pt' }}>
                      {entry.nis} / {entry.nisn || '-'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center' }}>{entry.kelas}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 6px', fontFamily: 'monospace', fontWeight: isDiambil ? 'bold' : 'normal' }}>
                      {entry.nomor_seri_ijazah}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {formatDate(entry.tanggal_ambil)}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3px 6px' }}>
                      {isDiambil ? (
                        <div>
                          <div><b>{entry.penerima_nama}</b></div>
                          <div style={{ fontSize: '7.5pt', color: '#555' }}>({entry.penerima_hubungan || 'Siswa'})</div>
                        </div>
                      ) : (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>Belum diambil</span>
                      )}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: 'bold' }}>
                      <span style={{ color: isDiambil ? '#15803d' : '#b45309' }}>
                        {isDiambil ? 'SUDAH' : 'BRANKAS'}
                      </span>
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center' }}>
                      {isDiambil ? '✓' : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* 5. TANDA TANGAN KOORDINATOR TU & KEPALA SEKOLAH */}
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', pageBreakInside: 'avoid', fontSize: '9pt' }}>
          <div style={{ width: '220px', textAlign: 'center' }}>
            <div>Pengelola Ijazah,</div>
            <div style={{ marginTop: '2px' }}>Koordinator Tata Usaha,</div>
            <div style={{ height: '48px' }}></div>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>..........................................</div>
            <div style={{ fontSize: '8pt' }}>NIP. .....................................</div>
          </div>

          <div style={{ width: '240px', textAlign: 'center' }}>
            <div>{penandatangan.kota}, {today}</div>
            <div style={{ marginTop: '2px' }}>Kepala Sekolah,</div>
            <div style={{ height: '48px' }}></div>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
              {penandatangan.nama_kepala_sekolah}
            </div>
            <div style={{ fontSize: '8pt' }}>NIP. {penandatangan.nip_kepala_sekolah}</div>
          </div>
        </div>
      </div>
    </PrintDocumentSheet>
  );
};

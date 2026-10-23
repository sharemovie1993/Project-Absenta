import React from 'react';
import { PrintDocumentSheet, PrintHeader } from '@/components/ui/PrintHeader';
import type { BukuRegisterResponse } from '@/api/correspondence/mutasi.api';

interface BukuRegisterMutasiSheetProps {
  data: BukuRegisterResponse;
  tahunPelajaran?: string;
  semester?: string;
  tenantInfo?: any;
}

export const BukuRegisterMutasiSheet: React.FC<BukuRegisterMutasiSheetProps> = ({
  data,
  tahunPelajaran,
  semester,
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
      footerText="Buku Register Mutasi Peserta Didik - Standar Akreditasi BAN-PDM / Kemendikbudristek"
      className="text-slate-900"
    >
      {/* 1. KOP RESMI DINAS */}
      <PrintHeader
        tenantInfo={tenantInfo}
        variant="landscape"
        showLogoDaerah={true}
        showLogoSekolah={true}
        showDivider={true}
      />

      <div style={{ fontFamily: "'Times New Roman', serif", fontSize: '9.5pt', lineHeight: 1.35 }}>
        {/* 2. JUDUL DOKUMEN */}
        <div style={{ textAlign: 'center', marginBottom: '12px', marginTop: '2px' }}>
          <h2 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '0 0 2px 0', letterSpacing: '0.5px' }}>
            BUKU REGISTER MUTASI PESERTA DIDIK
          </h2>
          <p style={{ fontSize: '9.5pt', margin: 0 }}>
            Tahun Pelajaran: <b>{tahunPelajaran || 'Semua Tahun'}</b> | Semester: <b>{semester || 'Semua Semester'}</b>
          </p>
        </div>

        {/* 3. REKAPITULASI SUMMARY BADGES */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', fontSize: '9pt' }}>
          <div style={{ border: '1px solid #000', padding: '3px 8px', borderRadius: '3px' }}>
            Mutasi Masuk : <b>{rekap.total_masuk} Siswa</b>
          </div>
          <div style={{ border: '1px solid #000', padding: '3px 8px', borderRadius: '3px' }}>
            Mutasi Keluar : <b>{rekap.total_keluar} Siswa</b>
          </div>
          <div style={{ border: '1px solid #000', padding: '3px 8px', borderRadius: '3px', fontWeight: 'bold' }}>
            Total Mutasi : {rekap.total_mutasi} Siswa
          </div>
        </div>

        {/* 4. TABEL REGISTER RESMI AKREDITASI */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center', width: '3%' }}>No</th>
              <th style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'center', width: '8%' }}>Tanggal</th>
              <th style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'center', width: '8%' }}>Jenis</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left', width: '18%' }}>Nama Siswa</th>
              <th style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'left', width: '11%' }}>NIS / NISN</th>
              <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '3%' }}>L/P</th>
              <th style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'center', width: '7%' }}>Kelas</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left', width: '16%' }}>Mutasi Masuk (Asal)</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left', width: '16%' }}>Mutasi Keluar (Tujuan)</th>
              <th style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'left', width: '10%' }}>No. Surat</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ border: '1px solid #000', padding: '16px', textAlign: 'center', color: '#666' }}>
                  Belum ada data mutasi peserta didik yang tercatat pada periode ini.
                </td>
              </tr>
            ) : (
              entries.map((entry, idx) => {
                const isKeluar = entry.tipe === 'MUTASI_KELUAR';
                return (
                  <tr key={entry.id || idx}>
                    <td style={{ border: '1px solid #000', padding: '3px 2px', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {formatDate(entry.tanggal)}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: 'bold' }}>
                      {isKeluar ? 'KELUAR' : 'MASUK'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3px 6px', fontWeight: 600 }}>{entry.nama_siswa}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 4px', fontFamily: 'monospace', fontSize: '8.5pt' }}>
                      {entry.nis} / {entry.nisn || '-'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3px 2px', textAlign: 'center' }}>{entry.gender?.[0] || '-'}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center' }}>{entry.kelas}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 6px' }}>
                      {!isKeluar ? entry.sekolah_asal || '-' : '-'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3px 6px' }}>
                      {isKeluar ? (
                        <div>
                          <div><b>{entry.sekolah_tujuan || '-'}</b></div>
                          <div style={{ fontSize: '8pt', color: '#444' }}>Ket: {entry.alasan}</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3px 4px', fontSize: '8pt', fontFamily: 'monospace' }}>
                      {entry.nomor_surat}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* 5. TANDA TANGAN KEPALA SEKOLAH & WAKA KESISWAAN */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', pageBreakInside: 'avoid', fontSize: '9.5pt' }}>
          <div style={{ width: '220px', textAlign: 'center' }}>
            <div>Mengetahui,</div>
            <div style={{ marginTop: '2px' }}>Koordinator Tata Usaha,</div>
            <div style={{ height: '50px' }}></div>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>..........................................</div>
            <div style={{ fontSize: '8.5pt' }}>NIP. .....................................</div>
          </div>

          <div style={{ width: '240px', textAlign: 'center' }}>
            <div>{penandatangan.kota}, {today}</div>
            <div style={{ marginTop: '2px' }}>Kepala Sekolah,</div>
            <div style={{ height: '50px' }}></div>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
              {penandatangan.nama_kepala_sekolah}
            </div>
            <div style={{ fontSize: '8.5pt' }}>NIP. {penandatangan.nip_kepala_sekolah}</div>
          </div>
        </div>
      </div>
    </PrintDocumentSheet>
  );
};

import React from 'react';

interface BukuIndukSheet2Props {
  siswa: any;
}

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <div
    style={{
      fontWeight: 'bold',
      textTransform: 'uppercase',
      borderBottom: '1px solid #000',
      marginBottom: '6px',
      marginTop: '16px',
      fontSize: '10.5pt',
      letterSpacing: '0.5px',
    }}
  >
    {title}
  </div>
);

function formatTanggal(val: string | null | undefined): string {
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
}

interface RowProps {
  label: string;
  value: React.ReactNode;
}

const Row: React.FC<RowProps> = ({ label, value }) => (
  <tr>
    <td style={{ width: '40%', padding: '1.5px 4px', verticalAlign: 'top', fontWeight: 500 }}>{label}</td>
    <td style={{ width: '2%', padding: '1.5px 2px', verticalAlign: 'top' }}>:</td>
    <td style={{ padding: '1.5px 4px', verticalAlign: 'top' }}>{value || '-'}</td>
  </tr>
);

export const BukuIndukSheet2: React.FC<BukuIndukSheet2Props> = ({ siswa }) => {
  const akademikList: any[] = siswa?.SiswaAkademik || [];
  const sortedAkademik = [...akademikList].sort((a, b) => {
    const tpA = a?.TahunPelajaran?.tahun || '';
    const tpB = b?.TahunPelajaran?.tahun || '';
    return tpA.localeCompare(tpB);
  });

  const kelasAwal = sortedAkademik[0]?.Kelas?.nama_kelas || '-';

  const prestasiList: any[] = siswa?.PrestasiSiswa || [];

  return (
    <div style={{ fontFamily: "'Times New Roman', serif", fontSize: '11pt', lineHeight: 1.4 }}>
      {/* Section 1: Data Masuk / Keluar Sekolah */}
      <SectionHeader title="Data Masuk / Keluar Sekolah" />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt' }}>
        <tbody>
          <Row label="Tanggal Masuk" value={formatTanggal(siswa?.tanggal_masuk)} />
          <Row label="Kelas Awal Masuk" value={kelasAwal} />
          <Row label="Tanggal Keluar" value={formatTanggal(siswa?.tanggal_keluar)} />
          <Row label="Alasan Keluar" value={siswa?.alasan_keluar} />
        </tbody>
      </table>

      {/* Section 2: Riwayat Kelas */}
      <SectionHeader title="Riwayat Kelas (Rekap Tahunan)" />
      {sortedAkademik.length === 0 ? (
        <p style={{ fontSize: '10pt', color: '#666', fontStyle: 'italic', paddingLeft: '4px' }}>
          Tidak ada data riwayat kelas.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginTop: '6px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'center', width: '5%' }}>No.</th>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'left' }}>Tahun Pelajaran</th>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'left' }}>Semester</th>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'left' }}>Kelas</th>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedAkademik.map((ak: any, i: number) => (
              <tr key={i}>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px' }}>
                  {ak?.TahunPelajaran?.tahun || '-'}
                </td>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px' }}>
                  {ak?.Semester?.nama_semester || '-'}
                </td>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px' }}>
                  {ak?.Kelas?.nama_kelas || '-'}
                </td>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px', textAlign: 'center' }}>
                  {ak?.status || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Section 3: Prestasi Siswa */}
      <SectionHeader title="Prestasi Siswa" />
      {prestasiList.length === 0 ? (
        <p style={{ fontSize: '10pt', color: '#666', fontStyle: 'italic', paddingLeft: '4px' }}>
          Tidak ada data prestasi.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginTop: '6px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'center', width: '5%' }}>No.</th>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'left' }}>Nama Kegiatan</th>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'center' }}>Tingkat</th>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'center' }}>Juara/Peringkat</th>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'center' }}>Tahun</th>
            </tr>
          </thead>
          <tbody>
            {prestasiList.map((p: any, i: number) => (
              <tr key={i}>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px' }}>
                  {p?.nama_kegiatan || '-'}
                </td>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px', textAlign: 'center' }}>
                  {p?.tingkat || '-'}
                </td>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px', textAlign: 'center' }}>
                  {p?.peringkat || '-'}
                </td>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px', textAlign: 'center' }}>
                  {p?.tahun || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

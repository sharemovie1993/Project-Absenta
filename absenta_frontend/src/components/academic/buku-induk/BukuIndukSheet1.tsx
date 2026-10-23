import React from 'react';

interface BukuIndukSheet1Props {
  siswa: any; // full 360° data from detail endpoint
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

export const BukuIndukSheet1: React.FC<BukuIndukSheet1Props> = ({ siswa }) => {
  const genderLabel =
    siswa?.gender === 'L' ? 'Laki-laki' : siswa?.gender === 'P' ? 'Perempuan' : '-';

  const alamatParts = [
    siswa?.alamat_jalan,
    siswa?.rt ? `RT ${siswa.rt}` : null,
    siswa?.rw ? `RW ${siswa.rw}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const orangTuaList: any[] = siswa?.OrangTuaSiswa || [];

  return (
    <div style={{ fontFamily: "'Times New Roman', serif", fontSize: '11pt', lineHeight: 1.4 }}>
      {/* Section 1: Identitas Pribadi */}
      <SectionHeader title="Identitas Pribadi" />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt' }}>
        <tbody>
          <Row label="Nama Lengkap" value={siswa?.nama_siswa} />
          <Row label="NIS" value={siswa?.nis} />
          <Row label="NISN" value={siswa?.nisn} />
          <Row label="No. Akta Kelahiran" value={siswa?.no_akta_lahir} />
          <Row label="Tempat Lahir" value={siswa?.tempat_lahir} />
          <Row label="Tanggal Lahir" value={formatTanggal(siswa?.tanggal_lahir)} />
          <Row label="Jenis Kelamin" value={genderLabel} />
          <Row label="Agama" value={siswa?.agama} />
          <Row label="Kewarganegaraan" value={siswa?.kewarganegaraan} />
          <Row label="Anak ke-" value={siswa?.anak_ke} />
          <Row label="Alamat Jalan" value={alamatParts || '-'} />
          <Row label="Kelurahan / Desa" value={siswa?.kelurahan} />
          <Row label="Kecamatan" value={siswa?.kecamatan} />
          <Row label="Kota / Kabupaten" value={siswa?.kota} />
          <Row label="Kode Pos" value={siswa?.kode_pos} />
          <Row label="No. HP" value={siswa?.no_hp} />
          <Row label="Email" value={siswa?.email} />
          <Row label="Asal Sekolah" value={siswa?.sekolah_asal} />
          <Row label="No. Ijazah SMP" value={siswa?.no_ijazah_smp} />
        </tbody>
      </table>

      {/* Section 2: Data Fisik */}
      <SectionHeader title="Data Fisik" />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt' }}>
        <tbody>
          <Row
            label="Tinggi Badan"
            value={siswa?.tinggi_badan ? `${siswa.tinggi_badan} cm` : '-'}
          />
          <Row
            label="Berat Badan"
            value={siswa?.berat_badan ? `${siswa.berat_badan} kg` : '-'}
          />
          <Row label="Golongan Darah" value={siswa?.golongan_darah} />
        </tbody>
      </table>

      {/* Section 3: Data Orang Tua / Wali */}
      <SectionHeader title="Data Orang Tua / Wali" />
      {orangTuaList.length === 0 ? (
        <p style={{ fontSize: '10pt', color: '#666', fontStyle: 'italic', paddingLeft: '4px' }}>
          Tidak ada data orang tua/wali.
        </p>
      ) : (
        orangTuaList.map((ot: any, idx: number) => {
          const data = ot?.OrangTua || ot;
          return (
            <div key={idx} style={{ marginBottom: '8px' }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '10pt',
                  color: '#444',
                  marginBottom: '2px',
                  paddingLeft: '4px',
                }}
              >
                {data?.hubungan || `Orang Tua ${idx + 1}`}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt' }}>
                <tbody>
                  <Row label="Nama" value={data?.nama} />
                  <Row label="Hubungan" value={data?.hubungan} />
                  <Row label="No. HP" value={data?.no_hp} />
                  <Row label="Email" value={data?.email} />
                  <Row label="Pekerjaan" value={data?.pekerjaan} />
                </tbody>
              </table>
            </div>
          );
        })
      )}
    </div>
  );
};

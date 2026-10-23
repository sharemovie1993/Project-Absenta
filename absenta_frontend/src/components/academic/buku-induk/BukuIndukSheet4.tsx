import React from 'react';

interface BukuIndukSheet4Props {
  siswa: any;
  tenantInfo?: any;
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

interface NilaiTableProps {
  nilaiList: any[];
  semLabel: string;
}

const NilaiTable: React.FC<NilaiTableProps> = ({ nilaiList, semLabel }) => (
  <div style={{ marginBottom: '12px' }}>
    <div style={{ fontWeight: 600, fontSize: '10pt', marginBottom: '4px', color: '#333' }}>
      {semLabel}
    </div>
    {nilaiList.length === 0 ? (
      <p style={{ fontSize: '9.5pt', color: '#888', fontStyle: 'italic', paddingLeft: '4px' }}>
        Tidak ada data nilai.
      </p>
    ) : (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9' }}>
            <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'left' }}>
              Mata Pelajaran
            </th>
            <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'center', width: '12%' }}>
              Nilai
            </th>
            <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'center', width: '12%' }}>
              Predikat
            </th>
          </tr>
        </thead>
        <tbody>
          {nilaiList.map((n: any, i: number) => (
            <tr key={i}>
              <td style={{ border: '0.5px solid #000', padding: '2px 6px' }}>
                {n?.Mapel?.nama_mapel || n?.nama_mapel || '-'}
              </td>
              <td style={{ border: '0.5px solid #000', padding: '2px 6px', textAlign: 'center' }}>
                {n?.nilai_akhir ?? '-'}
              </td>
              <td style={{ border: '0.5px solid #000', padding: '2px 6px', textAlign: 'center' }}>
                {n?.predikat || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

export const BukuIndukSheet4: React.FC<BukuIndukSheet4Props> = ({ siswa, tenantInfo }) => {
  const akademikList: any[] = siswa?.SiswaAkademik || [];
  const sem4 = akademikList[3];
  const sem5 = akademikList[4];
  const sem6 = akademikList[5];

  const nilaiSem4: any[] = sem4?.NilaiSiswa || [];
  const nilaiSem5: any[] = sem5?.NilaiSiswa || [];
  const nilaiSem6: any[] = sem6?.NilaiSiswa || [];

  const semLabel4 = sem4
    ? `Semester 4 — ${sem4?.TahunPelajaran?.tahun || ''} (${sem4?.Kelas?.nama_kelas || ''})`
    : 'Semester 4';
  const semLabel5 = sem5
    ? `Semester 5 — ${sem5?.TahunPelajaran?.tahun || ''} (${sem5?.Kelas?.nama_kelas || ''})`
    : 'Semester 5';
  const semLabel6 = sem6
    ? `Semester 6 — ${sem6?.TahunPelajaran?.tahun || ''} (${sem6?.Kelas?.nama_kelas || ''})`
    : 'Semester 6';

  // PKL
  const pklList: any[] = Array.isArray(siswa?.SiswaPkl)
    ? siswa.SiswaPkl
    : siswa?.SiswaPkl
    ? [siswa.SiswaPkl]
    : [];

  // UKK
  const ukkList: any[] = siswa?.SertifikatUkk || [];

  // Kelulusan
  const kelulusan = Array.isArray(siswa?.KelulusanSiswa)
    ? siswa.KelulusanSiswa[0]
    : siswa?.KelulusanSiswa || null;

  // Tracer
  const tracer = Array.isArray(siswa?.HubinTracerStudy)
    ? siswa.HubinTracerStudy[0]
    : siswa?.HubinTracerStudy || null;

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // City from tenant name (last 2 words) or fallback
  const cityName = (() => {
    const name = tenantInfo?.name || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return parts.slice(-2).join(' ');
    return name || 'Purwakarta';
  })();

  return (
    <div style={{ fontFamily: "'Times New Roman', serif", fontSize: '11pt', lineHeight: 1.4 }}>
      {/* Section 1: Nilai Akademik Sem 4–6 */}
      <SectionHeader title="Nilai Akademik Semester 4 – 6" />
      <NilaiTable nilaiList={nilaiSem4} semLabel={semLabel4} />
      <NilaiTable nilaiList={nilaiSem5} semLabel={semLabel5} />
      <NilaiTable nilaiList={nilaiSem6} semLabel={semLabel6} />

      {/* Section 2: PKL */}
      <SectionHeader title="Praktik Kerja Lapangan (PKL)" />
      {pklList.length === 0 ? (
        <p style={{ fontSize: '10pt', color: '#666', fontStyle: 'italic', paddingLeft: '4px' }}>
          Tidak ada data PKL.
        </p>
      ) : (
        pklList.map((pkl: any, idx: number) => (
          <div key={idx} style={{ marginBottom: '8px' }}>
            {pklList.length > 1 && (
              <div style={{ fontWeight: 600, fontSize: '10pt', color: '#444', paddingLeft: '4px', marginBottom: '2px' }}>
                PKL {idx + 1}
              </div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt' }}>
              <tbody>
                <Row label="Nama DUDI / Mitra" value={pkl?.nama_mitra || pkl?.nama_dudi} />
                <Row label="Bidang Keahlian" value={pkl?.bidang_keahlian} />
                <Row label="Tanggal Mulai" value={formatTanggal(pkl?.tanggal_mulai)} />
                <Row label="Tanggal Selesai" value={formatTanggal(pkl?.tanggal_selesai)} />
                <Row label="Nilai PKL" value={pkl?.nilai_pkl} />
                <Row label="Predikat PKL" value={pkl?.predikat_pkl} />
              </tbody>
            </table>
          </div>
        ))
      )}

      {/* Section 3: UKK */}
      <SectionHeader title="Uji Kompetensi Keahlian (UKK)" />
      {ukkList.length === 0 ? (
        <p style={{ fontSize: '10pt', color: '#666', fontStyle: 'italic', paddingLeft: '4px' }}>
          Tidak ada data UKK.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginTop: '6px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'center', width: '5%' }}>No.</th>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'left' }}>No. Sertifikat</th>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'center' }}>Tahun</th>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'center' }}>Nilai</th>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'center' }}>Predikat</th>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {ukkList.map((ukk: any, i: number) => (
              <tr key={i}>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px' }}>{ukk?.no_sertifikat || '-'}</td>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px', textAlign: 'center' }}>{ukk?.tahun_ukk || '-'}</td>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px', textAlign: 'center' }}>{ukk?.nilai_ukk ?? '-'}</td>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px', textAlign: 'center' }}>{ukk?.predikat || '-'}</td>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px', textAlign: 'center' }}>{ukk?.status_kelulusan_ukk || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Section 4: Kelulusan / SKL */}
      <SectionHeader title="Kelulusan / SKL" />
      {kelulusan ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt' }}>
          <tbody>
            <Row label="Nomor SKL" value={kelulusan?.nomor_skl} />
            <Row label="Tanggal Lulus" value={formatTanggal(kelulusan?.tanggal_lulus)} />
            <Row label="Status Kelulusan" value={kelulusan?.status_kelulusan} />
            <Row label="Rata-rata Nilai" value={kelulusan?.rata_rata_nilai} />
            <Row label="Keterangan" value={kelulusan?.keterangan_kelulusan} />
          </tbody>
        </table>
      ) : (
        <p style={{ fontSize: '10pt', color: '#666', fontStyle: 'italic', paddingLeft: '4px' }}>
          Tidak ada data kelulusan.
        </p>
      )}

      {/* Section 5: Tracer Study / Alumni */}
      <SectionHeader title="Tracer Study / Alumni" />
      {tracer ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt' }}>
          <tbody>
            <Row label="Status Alumni" value={tracer?.status_alumni} />
            <Row label="Nama Instansi / Kampus" value={tracer?.nama_instansi} />
            <Row label="Jurusan / Posisi" value={tracer?.jurusan} />
            <Row label="Tahun Masuk" value={tracer?.tahun_masuk} />
            <Row label="Keterangan" value={tracer?.keterangan} />
          </tbody>
        </table>
      ) : (
        <p style={{ fontSize: '10pt', color: '#666', fontStyle: 'italic', paddingLeft: '4px' }}>
          Tidak ada data tracer study.
        </p>
      )}

      {/* Section 6: Tanda Tangan */}
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', fontSize: '10.5pt' }}>
        <div style={{ textAlign: 'center', width: '40%' }}>
          <div>Wali Kelas,</div>
          <div style={{ marginTop: '48px', borderBottom: '1px solid black', width: '100%' }}></div>
          <div style={{ fontWeight: 'bold' }}>(...............................)</div>
          <div style={{ fontSize: '9pt' }}>NIP. ................................</div>
        </div>
        <div style={{ textAlign: 'center', width: '40%' }}>
          <div>{cityName}, {today}</div>
          <div style={{ marginTop: '4px' }}>Kepala Sekolah,</div>
          <div style={{ marginTop: '48px', borderBottom: '1px solid black', width: '100%' }}></div>
          <div style={{ fontWeight: 'bold' }}>(...............................)</div>
          <div style={{ fontSize: '9pt' }}>NIP. ................................</div>
        </div>
      </div>
    </div>
  );
};

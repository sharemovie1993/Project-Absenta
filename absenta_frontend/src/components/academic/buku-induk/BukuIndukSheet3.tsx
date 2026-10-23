import React from 'react';

interface BukuIndukSheet3Props {
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

interface P5TableProps {
  p5List: any[];
  semLabel: string;
}

const P5Table: React.FC<P5TableProps> = ({ p5List, semLabel }) => (
  <div style={{ marginBottom: '10px' }}>
    <div style={{ fontWeight: 600, fontSize: '10pt', marginBottom: '4px', color: '#333' }}>
      {semLabel}
    </div>
    {p5List.length === 0 ? (
      <p style={{ fontSize: '9.5pt', color: '#888', fontStyle: 'italic', paddingLeft: '4px' }}>
        Tidak ada data P5.
      </p>
    ) : (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9' }}>
            <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'left' }}>Tema P5</th>
            <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'center', width: '18%' }}>
              Nilai/Predikat
            </th>
          </tr>
        </thead>
        <tbody>
          {p5List.map((p: any, i: number) => (
            <tr key={i}>
              <td style={{ border: '0.5px solid #000', padding: '2px 6px' }}>
                {p?.tema_p5 || p?.tema || '-'}
              </td>
              <td style={{ border: '0.5px solid #000', padding: '2px 6px', textAlign: 'center' }}>
                {p?.predikat || p?.nilai || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

export const BukuIndukSheet3: React.FC<BukuIndukSheet3Props> = ({ siswa }) => {
  const akademikList: any[] = siswa?.SiswaAkademik || [];
  const sem1 = akademikList[0];
  const sem2 = akademikList[1];
  const sem3 = akademikList[2];

  const nilaiSem1: any[] = sem1?.NilaiSiswa || [];
  const nilaiSem2: any[] = sem2?.NilaiSiswa || [];
  const nilaiSem3: any[] = sem3?.NilaiSiswa || [];

  const p5Sem1: any[] = sem1?.P5NilaiSiswa || [];
  const p5Sem2: any[] = sem2?.P5NilaiSiswa || [];
  const p5Sem3: any[] = sem3?.P5NilaiSiswa || [];

  // Flatten all eskul across all semesters
  const eskulList: any[] = akademikList.flatMap((ak: any) => {
    const nilaiEskul: any[] = ak?.NilaiEskul || [];
    return nilaiEskul.map((e: any) => ({
      ...e,
      tahunPelajaran: ak?.TahunPelajaran?.tahun || '-',
    }));
  });

  const semLabel1 = sem1
    ? `Semester 1 — ${sem1?.TahunPelajaran?.tahun || ''} (${sem1?.Kelas?.nama_kelas || ''})`
    : 'Semester 1';
  const semLabel2 = sem2
    ? `Semester 2 — ${sem2?.TahunPelajaran?.tahun || ''} (${sem2?.Kelas?.nama_kelas || ''})`
    : 'Semester 2';
  const semLabel3 = sem3
    ? `Semester 3 — ${sem3?.TahunPelajaran?.tahun || ''} (${sem3?.Kelas?.nama_kelas || ''})`
    : 'Semester 3';

  return (
    <div style={{ fontFamily: "'Times New Roman', serif", fontSize: '11pt', lineHeight: 1.4 }}>
      {/* Section 1: Nilai Akademik Sem 1–3 */}
      <SectionHeader title="Nilai Akademik Semester 1 – 3" />
      <NilaiTable nilaiList={nilaiSem1} semLabel={semLabel1} />
      <NilaiTable nilaiList={nilaiSem2} semLabel={semLabel2} />
      <NilaiTable nilaiList={nilaiSem3} semLabel={semLabel3} />

      {/* Section 2: P5 */}
      <SectionHeader title="Projek Penguatan Profil Pelajar Pancasila (P5)" />
      <P5Table p5List={p5Sem1} semLabel={semLabel1} />
      <P5Table p5List={p5Sem2} semLabel={semLabel2} />
      <P5Table p5List={p5Sem3} semLabel={semLabel3} />

      {/* Section 3: Ekstrakurikuler */}
      <SectionHeader title="Ekstrakurikuler" />
      {eskulList.length === 0 ? (
        <p style={{ fontSize: '10pt', color: '#666', fontStyle: 'italic', paddingLeft: '4px' }}>
          Tidak ada data ekstrakurikuler.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginTop: '6px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'center', width: '5%' }}>No.</th>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'left' }}>Nama Eskul</th>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'center', width: '14%' }}>Predikat</th>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'left' }}>Keterangan</th>
              <th style={{ border: '0.5px solid #000', padding: '3px 6px', textAlign: 'center', width: '18%' }}>Tahun Pelajaran</th>
            </tr>
          </thead>
          <tbody>
            {eskulList.map((e: any, i: number) => (
              <tr key={i}>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px' }}>
                  {e?.JenisKegiatanMaster?.nama || e?.nama_eskul || '-'}
                </td>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px', textAlign: 'center' }}>
                  {e?.predikat || '-'}
                </td>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px' }}>
                  {e?.keterangan || '-'}
                </td>
                <td style={{ border: '0.5px solid #000', padding: '2px 6px', textAlign: 'center' }}>
                  {e?.tahunPelajaran || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

import React from 'react';
import { PrintDocumentSheet, PrintHeader } from '@/components/ui/PrintHeader';
import type { DknMatriksData, DknSiswaRow } from '@/api/correspondence/dkn.api';

interface DknSheetProps {
  data: DknMatriksData;
  tahunPelajaran?: string;
  tenantInfo?: any;
}

export const DknSheet: React.FC<DknSheetProps> = ({ data, tahunPelajaran, tenantInfo }) => {
  const { pejabat, program_keahlian, kelas_terpilih, columns_mapel, rekapitulasi, rows } = data;

  const mapelA = columns_mapel.filter((m) => m.kelompok_mapel === 'A');
  const mapelB = columns_mapel.filter((m) => m.kelompok_mapel === 'B');
  const mapelC = columns_mapel.filter((m) => m.kelompok_mapel === 'C');

  // Chunking 12 baris per lembar landscape agar muat presisi dengan kop dinas dan TTD
  const ROWS_PER_PAGE = 12;
  const pages: DknSiswaRow[][] = [];
  if (rows.length === 0) {
    pages.push([]);
  } else {
    for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) {
      pages.push(rows.slice(i, i + ROWS_PER_PAGE));
    }
  }

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      {pages.map((pageRows, pageIdx) => {
        const isLastPage = pageIdx === pages.length - 1;

        return (
          <PrintDocumentSheet
            key={pageIdx}
            orientation="landscape"
            pageNumber={pageIdx + 1}
            totalPages={pages.length}
            footerText="Daftar Kolektif Nilai (DKN) Kelulusan - Dokumen Arsip Resmi Dinas Pendidikan"
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

            <div style={{ fontFamily: "'Times New Roman', serif", fontSize: '8pt', lineHeight: 1.3 }}>
              {/* 2. JUDUL DOKUMEN & SUB-INFO */}
              <div style={{ textAlign: 'center', marginBottom: '8px', marginTop: '2px' }}>
                <h2 style={{ fontSize: '11pt', fontWeight: 'bold', margin: '0 0 2px 0', letterSpacing: '0.5px' }}>
                  DAFTAR KOLEKTIF NILAI (DKN) KELULUSAN PESERTA DIDIK
                </h2>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '8.5pt' }}>
                  <span>Tahun Pelajaran: <b>{tahunPelajaran || 'Semua'}</b></span>
                  <span>Program Keahlian: <b>{program_keahlian}</b></span>
                  <span>Rombel/Kelas: <b>{kelas_terpilih}</b></span>
                </div>
              </div>

              {/* 3. REKAPITULASI SUMMARY BOX */}
              {pageIdx === 0 && (
                <div style={{ display: 'flex', gap: '14px', marginBottom: '8px', fontSize: '8pt' }}>
                  <div style={{ border: '1px solid #000', padding: '2px 6px', borderRadius: '2px' }}>
                    Total Peserta: <b>{rekapitulasi.total_siswa} Siswa</b>
                  </div>
                  <div style={{ border: '1px solid #000', padding: '2px 6px', borderRadius: '2px', backgroundColor: '#f0fdf4' }}>
                    Dinyatakan Lulus: <b>{rekapitulasi.total_lulus} Siswa</b>
                  </div>
                  {rekapitulasi.total_tidak_lulus > 0 && (
                    <div style={{ border: '1px solid #000', padding: '2px 6px', borderRadius: '2px', backgroundColor: '#fef2f2' }}>
                      Tidak Lulus: <b>{rekapitulasi.total_tidak_lulus} Siswa</b>
                    </div>
                  )}
                  <div style={{ border: '1px solid #000', padding: '2px 6px', borderRadius: '2px' }}>
                    Rata-rata Kelulusan: <b>{rekapitulasi.rata_rata_angkatan}</b>
                  </div>
                </div>
              )}

              {/* 4. TABEL MATRIKS NILAI DKN */}
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '7.5pt' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th rowSpan={2} style={{ border: '0.5px solid #000', padding: '3px 2px', width: '25px' }}>No.</th>
                    <th rowSpan={2} style={{ border: '0.5px solid #000', padding: '3px 2px', width: '55px' }}>NIS / NISN</th>
                    <th rowSpan={2} style={{ border: '0.5px solid #000', padding: '3px 4px', textAlign: 'left', minWidth: '130px' }}>Nama Peserta Didik</th>
                    <th rowSpan={2} style={{ border: '0.5px solid #000', padding: '3px 2px', width: '22px' }}>L/P</th>
                    
                    {/* Kelompok A */}
                    {mapelA.length > 0 && (
                      <th colSpan={mapelA.length} style={{ border: '0.5px solid #000', padding: '2px 4px', backgroundColor: '#e2e8f0' }}>
                        Muatan Nasional (A)
                      </th>
                    )}

                    {/* Kelompok B */}
                    {mapelB.length > 0 && (
                      <th colSpan={mapelB.length} style={{ border: '0.5px solid #000', padding: '2px 4px', backgroundColor: '#e2e8f0' }}>
                        Kewilayahan (B)
                      </th>
                    )}

                    {/* Kelompok C */}
                    {mapelC.length > 0 && (
                      <th colSpan={mapelC.length} style={{ border: '0.5px solid #000', padding: '2px 4px', backgroundColor: '#e2e8f0' }}>
                        Kejuruan (C)
                      </th>
                    )}

                    {/* UKK */}
                    <th colSpan={2} style={{ border: '0.5px solid #000', padding: '2px 4px', backgroundColor: '#fed7aa' }}>
                      UKK
                    </th>

                    <th rowSpan={2} style={{ border: '0.5px solid #000', padding: '3px 2px', width: '38px', backgroundColor: '#fef08a' }}>Rata-Rata</th>
                    <th rowSpan={2} style={{ border: '0.5px solid #000', padding: '3px 2px', width: '28px' }}>Rank</th>
                    <th rowSpan={2} style={{ border: '0.5px solid #000', padding: '3px 2px', width: '45px' }}>Status</th>
                  </tr>

                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    {/* Kolom individual Mapel A */}
                    {mapelA.map((m) => (
                      <th key={m.id} style={{ border: '0.5px solid #000', padding: '2px 1px', fontSize: '6.5pt', maxWidth: '32px' }} title={m.nama_mapel}>
                        {m.kode_mapel || m.nama_mapel.substring(0, 5)}
                      </th>
                    ))}
                    {/* Kolom individual Mapel B */}
                    {mapelB.map((m) => (
                      <th key={m.id} style={{ border: '0.5px solid #000', padding: '2px 1px', fontSize: '6.5pt', maxWidth: '32px' }} title={m.nama_mapel}>
                        {m.kode_mapel || m.nama_mapel.substring(0, 5)}
                      </th>
                    ))}
                    {/* Kolom individual Mapel C */}
                    {mapelC.map((m) => (
                      <th key={m.id} style={{ border: '0.5px solid #000', padding: '2px 1px', fontSize: '6.5pt', maxWidth: '32px' }} title={m.nama_mapel}>
                        {m.kode_mapel || m.nama_mapel.substring(0, 5)}
                      </th>
                    ))}
                    {/* UKK */}
                    <th style={{ border: '0.5px solid #000', padding: '2px 1px', fontSize: '6.5pt', width: '30px' }}>Nilai</th>
                    <th style={{ border: '0.5px solid #000', padding: '2px 1px', fontSize: '6.5pt', width: '32px' }}>Predikat</th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={7 + columns_mapel.length} style={{ border: '0.5px solid #000', padding: '16px', textAlign: 'center', color: '#64748b' }}>
                        Belum ada data peserta didik pada filter terpilih.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((row) => (
                      <tr key={row.id}>
                        <td style={{ border: '0.5px solid #000', padding: '2px' }}>{row.nomor_urut}</td>
                        <td style={{ border: '0.5px solid #000', padding: '2px', fontSize: '7pt' }}>
                          <div>{row.nis}</div>
                          <div style={{ color: '#475569', fontSize: '6.5pt' }}>{row.nisn}</div>
                        </td>
                        <td style={{ border: '0.5px solid #000', padding: '2px 4px', textAlign: 'left', fontWeight: 'bold' }}>
                          {row.nama_siswa}
                        </td>
                        <td style={{ border: '0.5px solid #000', padding: '2px' }}>{row.gender}</td>

                        {/* Nilai Mapel A */}
                        {mapelA.map((m) => (
                          <td key={m.id} style={{ border: '0.5px solid #000', padding: '2px 1px' }}>
                            {row.nilai_per_mapel[m.id] !== undefined ? row.nilai_per_mapel[m.id] : '-'}
                          </td>
                        ))}

                        {/* Nilai Mapel B */}
                        {mapelB.map((m) => (
                          <td key={m.id} style={{ border: '0.5px solid #000', padding: '2px 1px' }}>
                            {row.nilai_per_mapel[m.id] !== undefined ? row.nilai_per_mapel[m.id] : '-'}
                          </td>
                        ))}

                        {/* Nilai Mapel C */}
                        {mapelC.map((m) => (
                          <td key={m.id} style={{ border: '0.5px solid #000', padding: '2px 1px' }}>
                            {row.nilai_per_mapel[m.id] !== undefined ? row.nilai_per_mapel[m.id] : '-'}
                          </td>
                        ))}

                        {/* UKK */}
                        <td style={{ border: '0.5px solid #000', padding: '2px 1px', fontWeight: 'bold' }}>
                          {row.nilai_ukk !== null ? row.nilai_ukk : '-'}
                        </td>
                        <td style={{ border: '0.5px solid #000', padding: '2px 1px', fontSize: '6.5pt' }}>
                          {row.predikat_ukk || '-'}
                        </td>

                        {/* Rata-rata & Rank & Status */}
                        <td style={{ border: '0.5px solid #000', padding: '2px 1px', fontWeight: 'bold', backgroundColor: '#fefce8' }}>
                          {row.rata_rata_nilai}
                        </td>
                        <td style={{ border: '0.5px solid #000', padding: '2px 1px' }}>{row.rank}</td>
                        <td style={{ border: '0.5px solid #000', padding: '2px 1px', fontWeight: 'bold', color: row.status_kelulusan === 'LULUS' ? '#166534' : '#991b1b' }}>
                          {row.status_kelulusan}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* 5. BLOK 3 TANDA TANGAN RESMI (HANYA PADA LEMBAR TERAKHIR) */}
              {isLastPage && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '12px',
                    marginTop: '16px',
                    fontSize: '8.5pt',
                    pageBreakInside: 'avoid',
                  }}
                >
                  {/* KIRI: WAKA KURIKULUM */}
                  <div style={{ textAlign: 'center' }}>
                    <div>Mengetahui,</div>
                    <div style={{ fontWeight: 'bold' }}>Wakil Kepala Sekolah Bidang Kurikulum</div>
                    <div style={{ height: '42px' }} />
                    <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                      {pejabat.waka_kurikulum.nama}
                    </div>
                    <div>NIP. {pejabat.waka_kurikulum.nip}</div>
                  </div>

                  {/* TENGAH: PENGAWAS PEMBINA DINAS */}
                  <div style={{ textAlign: 'center' }}>
                    <div>Mengetahui,</div>
                    <div style={{ fontWeight: 'bold' }}>Pengawas Pembina Cabang Dinas</div>
                    <div style={{ height: '42px' }} />
                    <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                      ( ............................................................ )
                    </div>
                    <div>NIP. .......................................................</div>
                  </div>

                  {/* KANAN: KEPALA SEKOLAH + STEMPEL RESMI */}
                  <div style={{ textAlign: 'center', position: 'relative' }}>
                    <div>{pejabat.kota}, {today}</div>
                    <div style={{ fontWeight: 'bold' }}>Kepala Sekolah,</div>
                    
                    {/* Cap Stempel 28mm wet indicator */}
                    <div style={{ height: '42px', position: 'relative' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: '10px',
                          top: '2px',
                          width: '40px',
                          height: '40px',
                          border: '1px dashed #94a3b8',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '6pt',
                          color: '#94a3b8',
                          textAlign: 'center',
                          transform: 'rotate(-10deg)',
                        }}
                      >
                        Cap Sekolah
                      </div>
                    </div>

                    <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                      {pejabat.kepala_sekolah.nama}
                    </div>
                    <div>NIP. {pejabat.kepala_sekolah.nip}</div>
                  </div>
                </div>
              )}
            </div>
          </PrintDocumentSheet>
        );
      })}
    </>
  );
};

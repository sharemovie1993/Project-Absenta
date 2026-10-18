/**
 * 📄 PDF Rapor Printing Module (Barrel Re-Export)
 *
 * Catatan Refactoring:
 * File ini sebelumnya adalah God File (~2.900 baris) yang kini telah didekomposisi
 * secara modular ke dalam direktori `src/utils/print/rapor/`:
 * - `raporShared.ts`      : Interfaces, utilitas font Cambria, format tanggal, alamat, jenjang, image downscaler
 * - `renderCover.ts`      : Render & generator Cover Rapor (single & batch)
 * - `renderBiodata.ts`    : Render & generator Lembar Biodata Siswa (single & batch)
 * - `renderRaporCk.ts`    : Render & generator Rapor Capaian Kompetensi Semester CK1/CK2 (single & batch)
 * - `renderRaporP5.ts`    : Render & generator Rapor Projek P5 (single & batch)
 * - `renderRaporSumatif.ts`: Render & generator Laporan Penilaian Sumatif Siswa (single & batch)
 * - `renderLeger.ts`      : Render & generator Buku Leger Nilai Siswa (Landscape A4)
 * - `renderTranskrip.ts`  : Render & generator Lembar Transkrip Nilai Siswa
 * - `renderBundel.ts`     : Generator Bundel Lengkap Rapor Sekelas (Cover + Biodata + Rapor)
 *
 * Semua export dipertahankan dengan re-export utuh demi backward compatibility 100%.
 */

export * from '../rapor';

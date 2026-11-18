import { prisma } from '@/utils/prisma';
import * as XLSX from 'xlsx-js-style';
import { getTenantTimezone, getTenantOffsetString } from '@/utils/timezone.utils';

export interface GenerateTemplateParams {
  kelasId: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  bulan?: number; // 1-12 (opsional, jika ingin per bulan, contoh 8 untuk Agustus)
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export interface AttendanceRecordPayload {
  nis: string;
  nama_siswa?: string;
  statusMap: Record<string, string>; // { "2026-08-01": "H", "2026-08-02": "S" }
}

export class HistoricalBackfillService {
  /**
   * 1. GENERATE PRE-FILLED SMART EXCEL TEMPLATE
   * Menghasilkan file Excel (.xlsx) dengan styling profesional yang sudah terisi
   * daftar siswa kelas dan kolom tanggal efektif KBM.
   */
  async generateTemplate(tenantId: string, params: GenerateTemplateParams): Promise<{ buffer: Buffer; fileName: string }> {
    const { kelasId } = params;

    // 1. Ambil data sekolah
    const sekolah = await prisma.sekolah.findFirst({
      where: { tenant_id: tenantId },
      select: { nama: true, npsn: true, kota: true },
    });

    // 2. Ambil data kelas
    const kelas = await prisma.kelas.findFirst({
      where: { id: kelasId, tenant_id: tenantId },
      select: { id: true, nama_kelas: true, tingkat: true },
    });

    if (!kelas) {
      throw new Error('Data kelas tidak ditemukan.');
    }

    // 3. Resolve Tahun Pelajaran & Semester Ganjil
    let tpId = params.tahunPelajaranId;
    let semId = params.semesterId;

    let tpObj: any = null;
    let semObj: any = null;

    if (tpId) {
      tpObj = await prisma.tahunPelajaran.findFirst({ where: { id: tpId, tenant_id: tenantId } });
    }
    if (!tpObj) {
      tpObj = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } })
        || await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' } });
      tpId = tpObj?.id;
    }

    if (semId) {
      semObj = await prisma.semester.findFirst({ where: { id: semId, tenant_id: tenantId } });
    }
    if (!semObj) {
      // Prioritaskan Semester Ganjil
      semObj = await prisma.semester.findFirst({
        where: { tenant_id: tenantId, nama_semester: { contains: 'Ganjil', mode: 'insensitive' } }
      }) || await prisma.semester.findFirst({ where: { tenant_id: tenantId } });
      semId = semObj?.id;
    }

    // 4. Ambil Daftar Siswa Aktif di Kelas & Semester tersebut
    const akademikList = await prisma.siswaAkademik.findMany({
      where: {
        kelas_id: kelasId,
        ...(tpId ? { tahun_pelajaran_id: tpId } : {}),
        ...(semId ? { semester_id: semId } : {}),
        status: 'AKTIF',
        kelas: { tenant_id: tenantId },
      },
      include: {
        siswa: {
          select: {
            id: true,
            nis: true,
            nisn: true,
            nama_siswa: true,
            jenis_kelamin: true,
          },
        },
      },
      orderBy: {
        siswa: {
          nama_siswa: 'asc',
        },
      },
    });

    // Fallback: Jika di SiswaAkademik belum terdaftar pada TP tersebut, ambil siswa yang memiliki kelas_id saat ini
    let studentRows = akademikList.map((a, idx) => ({
      no: idx + 1,
      nis: a.siswa?.nis || '-',
      nisn: a.siswa?.nisn || '-',
      nama: a.siswa?.nama_siswa || 'Siswa Tanpa Nama',
      gender: a.siswa?.jenis_kelamin || '-',
      siswa_id: a.siswa?.id,
      siswa_akademik_id: a.id,
    }));

    if (studentRows.length === 0) {
      const fallbackSiswa = await prisma.siswa.findMany({
        where: { tenant_id: tenantId, kelas_id: kelasId, status: 'AKTIF' },
        orderBy: { nama_siswa: 'asc' },
        select: { id: true, nis: true, nisn: true, nama_siswa: true, jenis_kelamin: true },
      });
      studentRows = fallbackSiswa.map((s, idx) => ({
        no: idx + 1,
        nis: s.nis || '-',
        nisn: s.nisn || '-',
        nama: s.nama_siswa,
        gender: s.jenis_kelamin || '-',
        siswa_id: s.id,
        siswa_akademik_id: '',
      }));
    }

    // 5. Generate Kolom Tanggal Efektif KBM Semester Ganjil
    // Ekstrak tahun awal dari string `tahun` (contoh "2026/2027" -> 2026)
    let startYear = new Date().getFullYear();
    if (tpObj?.tahun && typeof tpObj.tahun === 'string') {
      const match = tpObj.tahun.match(/(\d{4})/);
      if (match) startYear = parseInt(match[1], 10);
    }

    let computedStartDate: Date;
    let computedEndDate: Date;

    if (params.startDate && params.endDate) {
      computedStartDate = new Date(params.startDate);
      computedEndDate = new Date(params.endDate);
    } else if (params.bulan) {
      const year = params.bulan >= 7 ? startYear : startYear + 1;
      computedStartDate = new Date(year, params.bulan - 1, 1);
      computedEndDate = new Date(year, params.bulan, 0);
    } else {
      // Default 1 Semester Ganjil penuh (Juli - Desember)
      computedStartDate = new Date(startYear, 6, 15); // 15 Juli
      computedEndDate = new Date(startYear, 11, 20);  // 20 Desember
    }

    // Filter hari sekolah aktif (Senin - Jumat / Sabtu, lewati hari Minggu = 0)
    const effectiveDates: { dateStr: string; dayName: string; dayNum: number }[] = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    const curr = new Date(computedStartDate);
    while (curr <= computedEndDate) {
      const dayOfWeek = curr.getDay();
      if (dayOfWeek !== 0) { // Lewati hari Minggu
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const d = String(curr.getDate()).padStart(2, '0');
        effectiveDates.push({
          dateStr: `${y}-${m}-${d}`,
          dayName: dayNames[dayOfWeek],
          dayNum: curr.getDate(),
        });
      }
      curr.setDate(curr.getDate() + 1);
    }

    // 6. Bangun Lembar Kerja Excel Menggunakan xlsx-js-style
    const wb = XLSX.utils.book_new();

    // Data AOA (Array of Arrays)
    const aoa: any[][] = [];

    // Header Judul Dokumen
    const namaSekolahStr = (sekolah?.nama || 'SEKOLAH').toUpperCase();
    aoa.push([`REKAP PRESENSI HARIAN SISWA (SEMESTER GANJIL) — ${namaSekolahStr}`]);
    aoa.push([`KELAS: ${kelas.nama_kelas}   |   TAHUN PELAJARAN: ${tpObj?.tahun || `${startYear}/${startYear + 1}`}   |   SEMESTER: ${semObj?.nama_semester || 'GANJIL'}`]);
    aoa.push([`PETUNJUK: Cukup ketik huruf S (Sakit), I (Izin), A (Alpa), D (Dispen). Sel KOSONG atau H otomatis dihitung HADIR.`]);
    aoa.push([]); // baris kosong pemisah

    // Baris Header Tabel (Row 4 & 5)
    // Row 4: Label Utama (Header Atas)
    const headerRow1: any[] = ['NO', 'NIS', 'NISN', 'NAMA LENGKAP SISWA', 'JK'];
    // Row 5: Sub-header Tanggal (Format: YYYY-MM-DD)
    const headerRow2: any[] = ['', '', '', '', ''];

    effectiveDates.forEach((ed) => {
      headerRow1.push(`${ed.dayName} (${ed.dayNum})`);
      headerRow2.push(ed.dateStr); // Tanggal ISO dijadikan identitas kolom teknis
    });

    // Tambahkan kolom ringkasan rekap kalkulasi di kanan
    headerRow1.push('TOTAL H', 'TOTAL S', 'TOTAL I', 'TOTAL A');
    headerRow2.push('H', 'S', 'I', 'A');

    aoa.push(headerRow1);
    aoa.push(headerRow2);

    // Baris Siswa (Mulai Row 6)
    studentRows.forEach((s) => {
      const row: any[] = [s.no, s.nis, s.nisn, s.nama, s.gender];
      // Kolom tanggal diisi kosong (default Hadir)
      effectiveDates.forEach(() => {
        row.push('');
      });
      // Kolom total H, S, I, A
      row.push('', '', '', '');
      aoa.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // 7. Styling Cell & Lebar Kolom
    const colWidths: any[] = [
      { wch: 5 },  // NO
      { wch: 12 }, // NIS
      { wch: 14 }, // NISN
      { wch: 32 }, // NAMA LENGKAP
      { wch: 5 },  // JK
    ];
    effectiveDates.forEach(() => {
      colWidths.push({ wch: 8 }); // Tanggal
    });
    colWidths.push({ wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }); // Rekap H, S, I, A
    ws['!cols'] = colWidths;

    // Tambahkan styling border, fill color, dan alignment
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellAddress];
        if (!cell) continue;

        // Styling Banner Judul (Baris 0, 1, 2)
        if (R === 0) {
          cell.s = { font: { bold: true, sz: 13, color: { rgb: '1E3A8A' } } };
        } else if (R === 1) {
          cell.s = { font: { bold: true, sz: 10, color: { rgb: '334155' } } };
        } else if (R === 2) {
          cell.s = { font: { italic: true, sz: 9, color: { rgb: '64748B' } } };
        } else if (R === 4 || R === 5) {
          // Header Tabel
          cell.s = {
            font: { bold: true, sz: 9, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: R === 4 ? '1E40AF' : '2563EB' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: '94A3B8' } },
              bottom: { style: 'thin', color: { rgb: '94A3B8' } },
              left: { style: 'thin', color: { rgb: '94A3B8' } },
              right: { style: 'thin', color: { rgb: '94A3B8' } },
            },
          };
        } else if (R >= 6) {
          // Body Data Siswa
          const isMetadataCol = C <= 4;
          cell.s = {
            font: { sz: 9 },
            alignment: {
              horizontal: C === 3 ? 'left' : 'center',
              vertical: 'center',
            },
            border: {
              top: { style: 'thin', color: { rgb: 'E2E8F0' } },
              bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
              left: { style: 'thin', color: { rgb: 'E2E8F0' } },
              right: { style: 'thin', color: { rgb: 'E2E8F0' } },
            },
            ...(isMetadataCol ? {} : { fill: { fgColor: { rgb: 'FAFAFA' } } }),
          };
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, `Presensi_${kelas.nama_kelas.replace(/\s+/g, '_')}`);

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const cleanKelas = kelas.nama_kelas.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Format_Backfill_Presensi_${cleanKelas}_Semester_Ganjil.xlsx`;

    return { buffer, fileName };
  }

  /**
   * 2. PREVIEW EXCEL UPLOAD
   * Membaca berkas Excel hasil pengisian sekolah tanpa menulis ke DB.
   * Menampilkan ringkasan: Total Siswa, Total Hari KBM, Jumlah H/S/I/A, dan validasi NIS.
   */
  async previewExcel(tenantId: string, kelasId: string, fileBuffer: Buffer): Promise<any> {
    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error('File Excel tidak memiliki lembar data (sheet).');

    const ws = wb.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

    if (rawData.length < 6) {
      throw new Error('Format file Excel tidak sesuai standar template backfill Absenta.');
    }

    // Baris 4 (Index 4) & Baris 5 (Index 5) adalah baris header tanggal
    const headerRow1 = rawData[4] || [];
    const headerRow2 = rawData[5] || [];

    // Deteksi kolom-kolom tanggal (Mulai dari Column Index 5)
    const dateColumns: { colIndex: number; dateStr: string; label: string }[] = [];
    for (let c = 5; c < headerRow2.length; c++) {
      const val2 = String(headerRow2[c] || '').trim();
      const val1 = String(headerRow1[c] || '').trim();
      // Format tanggal ISO YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(val2)) {
        dateColumns.push({ colIndex: c, dateStr: val2, label: val1 || val2 });
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(val1)) {
        dateColumns.push({ colIndex: c, dateStr: val1, label: val1 });
      }
    }

    if (dateColumns.length === 0) {
      throw new Error('Tidak ditemukan kolom tanggal KBM yang valid pada template Excel.');
    }

    // Ambil data siswa database di kelas ini untuk pencocokan NIS
    const dbStudents = await prisma.siswa.findMany({
      where: { tenant_id: tenantId, kelas_id: kelasId },
      select: { id: true, nis: true, nisn: true, nama_siswa: true },
    });

    const dbStudentMap = new Map<string, typeof dbStudents[0]>();
    dbStudents.forEach((s) => {
      if (s.nis) dbStudentMap.set(s.nis.trim().toLowerCase(), s);
    });

    let totalHadir = 0;
    let totalSakit = 0;
    let totalIzin = 0;
    let totalAlpa = 0;
    let totalDispen = 0;

    const parsedStudents: any[] = [];
    const warnings: string[] = [];

    // Baca baris siswa mulai dari Index 6
    for (let r = 6; r < rawData.length; r++) {
      const row = rawData[r];
      if (!row || row.length === 0) continue;

      const nisRaw = String(row[1] || '').trim();
      const namaRaw = String(row[3] || '').trim();
      if (!nisRaw && !namaRaw) continue;

      const matchedStudent = dbStudentMap.get(nisRaw.toLowerCase());
      if (!matchedStudent) {
        warnings.push(`Baris ${r + 1}: Siswa dengan NIS "${nisRaw}" (${namaRaw}) tidak ditemukan di kelas ini.`);
      }

      const statusMap: Record<string, string> = {};
      let sH = 0;
      let sS = 0;
      let sI = 0;
      let sA = 0;
      let sD = 0;

      dateColumns.forEach((dc) => {
        const rawStatus = String(row[dc.colIndex] || '').trim().toUpperCase();
        let status = 'HADIR';
        if (rawStatus === 'S' || rawStatus === 'SAKIT') {
          status = 'SAKIT';
          sS++;
          totalSakit++;
        } else if (rawStatus === 'I' || rawStatus === 'IZIN') {
          status = 'IZIN';
          sI++;
          totalIzin++;
        } else if (rawStatus === 'A' || rawStatus === 'ALPA') {
          status = 'ALPA';
          sA++;
          totalAlpa++;
        } else if (rawStatus === 'D' || rawStatus === 'DISPEN') {
          status = 'DISPEN';
          sD++;
          totalDispen++;
        } else {
          // Kosong atau H -> Hadir
          status = 'HADIR';
          sH++;
          totalHadir++;
        }
        statusMap[dc.dateStr] = status;
      });

      parsedStudents.push({
        nis: nisRaw,
        nama: namaRaw,
        matched: Boolean(matchedStudent),
        studentId: matchedStudent?.id || null,
        counts: { H: sH, S: sS, I: sI, A: sA, D: sD },
        statusMap,
      });
    }

    return {
      success: true,
      summary: {
        totalSiswa: parsedStudents.length,
        totalHariKbm: dateColumns.length,
        startDate: dateColumns[0]?.dateStr,
        endDate: dateColumns[dateColumns.length - 1]?.dateStr,
        counts: {
          totalHadir,
          totalSakit,
          totalIzin,
          totalAlpa,
          totalDispen,
          grandTotal: totalHadir + totalSakit + totalIzin + totalAlpa + totalDispen,
        },
      },
      dateList: dateColumns.map((d) => d.dateStr),
      students: parsedStudents,
      warnings,
    };
  }

  /**
   * 3. EXECUTE BACKFILL KE DATABASE
   * Membuat / Menyinkronkan SesiAbsensi historis dan upsert AbsenSiswa secara batch.
   */
  async executeBackfill(
    tenantId: string,
    userId: string,
    payload: {
      kelasId: string;
      tahunPelajaranId?: string;
      semesterId?: string;
      dateList: string[]; // ['2026-08-01', '2026-08-02', ...]
      students: {
        nis: string;
        studentId?: string;
        statusMap: Record<string, string>; // { '2026-08-01': 'HADIR', ... }
      }[];
    }
  ): Promise<any> {
    const { kelasId, dateList, students } = payload;

    const kelas = await prisma.kelas.findFirst({
      where: { id: kelasId, tenant_id: tenantId },
      select: { id: true, nama_kelas: true, tingkat: true },
    });
    if (!kelas) throw new Error('Kelas tidak ditemukan.');

    // 1. Resolve Tahun Pelajaran & Semester
    let tpId = payload.tahunPelajaranId;
    let semId = payload.semesterId;

    if (!tpId) {
      const activeTp = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } })
        || await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId } });
      tpId = activeTp?.id;
    }

    if (!semId) {
      const ganjilSem = await prisma.semester.findFirst({
        where: { tenant_id: tenantId, nama_semester: { contains: 'Ganjil', mode: 'insensitive' } }
      }) || await prisma.semester.findFirst({ where: { tenant_id: tenantId } });
      semId = ganjilSem?.id;
    }

    if (!tpId || !semId) {
      throw new Error('Tahun Pelajaran atau Semester tidak terkonfigurasi dengan benar.');
    }

    // 2. Ambil Peta SiswaAkademik untuk seluruh siswa di kelas ini
    const allAkademik = await prisma.siswaAkademik.findMany({
      where: {
        kelas_id: kelasId,
        tahun_pelajaran_id: tpId,
        semester_id: semId,
        kelas: { tenant_id: tenantId },
      },
      include: {
        siswa: { select: { id: true, nis: true } },
      },
    });

    const akademikMapBySiswaId = new Map<string, string>();
    const akademikMapByNis = new Map<string, { akademikId: string; siswaId: string }>();

    allAkademik.forEach((a) => {
      if (a.siswa_id) akademikMapBySiswaId.set(a.siswa_id, a.id);
      if (a.siswa?.nis) {
        akademikMapByNis.set(a.siswa.nis.trim().toLowerCase(), {
          akademikId: a.id,
          siswaId: a.siswa.id,
        });
      }
    });

    // Fallback: Jika ada siswa yang belum punya SiswaAkademik di semester tersebut, auto-register ke SiswaAkademik
    for (const st of students) {
      const nisKey = st.nis?.trim().toLowerCase();
      if (nisKey && !akademikMapByNis.has(nisKey)) {
        const foundSiswa = await prisma.siswa.findFirst({
          where: { tenant_id: tenantId, nis: st.nis },
          select: { id: true, nis: true },
        });
        if (foundSiswa) {
          const newAkademik = await prisma.siswaAkademik.upsert({
            where: {
              siswa_id_tahun_pelajaran_id_semester_id: {
                siswa_id: foundSiswa.id,
                tahun_pelajaran_id: tpId,
                semester_id: semId,
              },
            },
            create: {
              siswa_id: foundSiswa.id,
              kelas_id: kelasId,
              tahun_pelajaran_id: tpId,
              semester_id: semId,
              status: 'AKTIF',
            },
            update: {
              kelas_id: kelasId,
              status: 'AKTIF',
            },
          });
          akademikMapBySiswaId.set(foundSiswa.id, newAkademik.id);
          akademikMapByNis.set(nisKey, { akademikId: newAkademik.id, siswaId: foundSiswa.id });
        }
      }
    }

    const tz = await getTenantTimezone(tenantId);
    const tzOffset = getTenantOffsetString(tz);

    let totalSesiCreated = 0;
    let totalSesiReused = 0;
    let totalAbsenUpserted = 0;

    // 3. Proses Per Tanggal secara Berurutan (Sequential Batch)
    for (const dateStr of dateList) {
      const startOfDay = new Date(`${dateStr}T00:00:00.000${tzOffset}`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999${tzOffset}`);
      const startTimeTarget = new Date(`${dateStr}T07:15:00.000${tzOffset}`);
      const endTimeTarget = new Date(`${dateStr}T15:00:00.000${tzOffset}`);

      // Cek apakah sudah ada SesiAbsensi di tanggal ini untuk kelas tersebut
      let sesi = await prisma.sesiAbsensi.findFirst({
        where: {
          tenant_id: tenantId,
          kelas_id: kelasId,
          tanggal: { gte: startOfDay, lte: endOfDay },
        },
      });

      if (!sesi) {
        sesi = await prisma.sesiAbsensi.create({
          data: {
            tenant_id: tenantId,
            kelas_id: kelasId,
            tahun_pelajaran_id: tpId,
            semester_id: semId,
            tanggal: startOfDay,
            waktu_mulai: startTimeTarget,
            waktu_selesai: endTimeTarget,
            status: 'SELESAI',
            jenis_kegiatan: 'KBM',
            sumber_sesi: 'MANUAL',
            keterangan: '[BACKFILL_SEMESTER_GANJIL] Inisialisasi rekap presensi historis',
            created_by_user_id: userId,
          },
        });
        totalSesiCreated++;
      } else {
        totalSesiReused++;
      }

      const sesiId = sesi.id;

      // 4. Upsert Data Absen Siswa untuk Sesi ini
      for (const st of students) {
        const nisKey = st.nis?.trim().toLowerCase();
        const mapping = akademikMapByNis.get(nisKey);
        if (!mapping) continue;

        const rawStatus = (st.statusMap[dateStr] || 'HADIR').toUpperCase();
        const status = ['HADIR', 'SAKIT', 'IZIN', 'ALPA', 'DISPEN'].includes(rawStatus) ? rawStatus : 'HADIR';
        const isHadir = status === 'HADIR';

        // Poin kehadiran standar
        const poinMap: Record<string, number> = { HADIR: 100, SAKIT: 100, IZIN: 100, DISPEN: 100, ALPA: 0 };
        const poin = poinMap[status] ?? 100;

        // Upsert AbsenSiswa (unique constraint: sesi_id + siswa_akademik_id)
        const existingAbsen = await prisma.absenSiswa.findFirst({
          where: {
            sesi_id: sesiId,
            siswa_akademik_id: mapping.akademikId,
          },
        });

        if (existingAbsen) {
          await prisma.absenSiswa.update({
            where: {
              id_created_at: {
                id: existingAbsen.id,
                created_at: existingAbsen.created_at,
              },
            },
            data: {
              status,
              waktu_tap: isHadir ? startTimeTarget : null,
              poin_kehadiran: poin,
              catatan: `[BACKFILL] Presensi semester ganjil (${status})`,
              updated_at: new Date(),
            },
          });
        } else {
          await prisma.absenSiswa.create({
            data: {
              tenant_id: tenantId,
              sesi_id: sesiId,
              siswa_id: mapping.siswaId,
              siswa_akademik_id: mapping.akademikId,
              status,
              waktu_tap: isHadir ? startTimeTarget : null,
              is_terlambat: false,
              poin_kehadiran: poin,
              asal_gerbang: false,
              kelas_id_snapshot: kelas.id,
              kelas_nama_snapshot: kelas.nama_kelas,
              tingkat_snapshot: kelas.tingkat,
              tahun_pelajaran_id_snapshot: tpId,
              catatan: `[BACKFILL] Presensi semester ganjil (${status})`,
            },
          });
        }
        totalAbsenUpserted++;
      }
    }

    return {
      success: true,
      message: 'Backfill presensi semester ganjil berhasil dieksekusi.',
      result: {
        kelasNama: kelas.nama_kelas,
        totalSesiCreated,
        totalSesiReused,
        totalTanggal: dateList.length,
        totalAbsenUpserted,
      },
    };
  }
}

export const historicalBackfillService = new HistoricalBackfillService();

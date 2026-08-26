// @ts-nocheck
import { smartReadSheet } from '@/utils/excel-import.utils';
import { findBestMatch } from '@/utils/normalization';
import { prisma } from '@/utils/prisma';
import * as XLSX from 'xlsx-js-style';
import { SiswaService } from '../../services/siswa.service';
import { storageService } from '@/infra/storage/storage.service';
import { kelasService } from '../../../kelas/services/kelas.service';
import { getPaginationParams } from '@/utils/pagination';
import { RoleName } from '@/constants/enums';
import { authorizationService } from '@/modules/auth/services/authorization.service';

const siswaService = new SiswaService();

export const siswaExcelController = {
  async getImportTemplate(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      
      if (!tenantId) {
         return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });
      }

      // Fetch sekolah to check jenjang
      const sekolah = await prisma.sekolah.findFirst({ where: { tenant_id: tenantId } });
      const isSmkMak = ['SMK', 'MAK'].includes(sekolah?.jenjang?.toUpperCase() || '');

      // --- SISWA SHEET ---
      const headers = isSmkMak
        ? [
            'NAMA LENGKAP', 'NIS', 'NISN', 'NIK', 'EMAIL', 'JK (L/P)', 'TEMPAT LAHIR', 
            'TANGGAL LAHIR (YYYY-MM-DD)', 'TANGGAL MASUK (YYYY-MM-DD)', 'TANGGAL KELUAR (YYYY-MM-DD)',
            'ALAMAT', 'NO. HP', 'NAMA KELAS', 'JURUSAN', 'STATUS', 'NO. RFID'
          ]
        : [
            'NAMA LENGKAP', 'NIS', 'NISN', 'NIK', 'EMAIL', 'JK (L/P)', 'TEMPAT LAHIR', 
            'TANGGAL LAHIR (YYYY-MM-DD)', 'TANGGAL MASUK (YYYY-MM-DD)', 'TANGGAL KELUAR (YYYY-MM-DD)',
            'ALAMAT', 'NO. HP', 'NAMA KELAS', 'STATUS', 'NO. RFID'
          ];

      const quickPetunjuk = isSmkMak
        ? '1. Kolom BERWARNA EMAS wajib diisi (Nama, Kelas, Jurusan). Untuk PPDB, kosongkan Kelas, set status CALON.'
        : '1. Kolom BERWARNA EMAS wajib diisi (Nama & Kelas).';

      // Add helper rows at the top for better UX
      const dataWithHints = [
        ['PETUNJUK CEPAT:', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [quickPetunjuk, '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['2. Agar angka NOL tidak hilang di NO HP/NISN, awali dengan tanda PETIK SATU (\'). Contoh: \'0812345678', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['3. JK (Jenis Kelamin): Isi L untuk Laki-laki, P untuk Perempuan.', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['4. Format Tanggal: YYYY-MM-DD (Contoh: 2021-07-15). TANGGAL MASUK/KELUAR opsional untuk riwayat historis.', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', ''], // Spacer
        headers
      ];

      const ws = XLSX.utils.aoa_to_sheet(dataWithHints);

      // Styles
      const hintStyle = {
        font: { bold: true, color: { rgb: "4F46E5" } },
        alignment: { horizontal: "left" }
      };

      const warningStyle = {
        font: { bold: true, color: { rgb: "B91C1C" } },
        alignment: { horizontal: "left" }
      };

      const reqHeaderStyle = {
        font: { bold: true, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: "FFD700" } }, // Gold for Required
        alignment: { horizontal: "center" },
        border: { 
          bottom: { style: "medium", color: { rgb: "000000" } },
          top: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };

      const optHeaderStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E293B" } }, // Slate-800 for Optional
        alignment: { horizontal: "center" },
        border: { 
          bottom: { style: "medium", color: { rgb: "000000" } },
          top: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };

      // Apply Styles to Hints (First 5 rows)
      for (let i = 0; i < 5; i++) {
        const cell = ws[XLSX.utils.encode_cell({ r: i, c: 0 })];
        if (cell) cell.s = i === 2 ? warningStyle : hintStyle;
      }

      const requiredCols = isSmkMak
        ? ['NAMA LENGKAP', 'NAMA KELAS', 'JURUSAN']
        : ['NAMA LENGKAP', 'NAMA KELAS'];

      // Apply Styles to Header (Row 6, index 6)
      headers.forEach((h, i) => {
        const cell = ws[XLSX.utils.encode_cell({ r: 6, c: i })];
        if (cell) {
          if (requiredCols.includes(h)) {
            cell.s = reqHeaderStyle;
          } else {
            cell.s = optHeaderStyle;
          }
        }
      });

      ws['!cols'] = headers.map(() => ({ wch: 25 }));
      ws['!rows'] = Array(7).fill({ hpt: 20 });
      ws['!rows'][6] = { hpt: 30 }; // Header row taller

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Siswa');

      // --- PETUNJUK SHEET ---
      const instructions = [
        ['PETUNJUK PENGISIAN IMPORT SISWA'],
        [''],
        ['1. KOLOM BERWARNA EMAS WAJIB DIISI'],
        ['2. nama_siswa: Nama lengkap siswa'],
        ['3. kelas_id / NAMA KELAS: Bisa diisi ID Kelas atau Nama Kelas (Lihat sheet Referensi). Kosongkan jika PPDB (CALON).'],
        isSmkMak ? ['3b. JURUSAN: WAJIB diisi untuk sekolah SMK/MAK (contoh: RPL, TKJ, Akuntansi)'] : null,
        ['4. jenis_kelamin: Isi dengan "L" (Laki-laki) atau "P" (Perempuan)'],
        ['5. tanggal_lahir / tanggal_masuk / tanggal_keluar: Format YYYY-MM-DD (Contoh: 2021-07-15). TANGGAL MASUK opsional (default: tanggal hari ini/impor). TANGGAL KELUAR diisi jika status LULUS/ALUMNI/PINDAH.'],
        ['6. status: Isi dengan "AKTIF", "CALON" (untuk PPDB belum dipetakan), "TIDAK_AKTIF", "LULUS", "PINDAH"'],
        [''],
        ['Tips: Gunakan sheet "Referensi Kelas" untuk mempermudah mencari nama/id kelas.'],
        isSmkMak ? ['Tips SMK/MAK: Nama kelas boleh sama jika jurusannya berbeda.'] : null,
      ].filter(Boolean) as string[][];

      const petunjukWs = XLSX.utils.aoa_to_sheet(instructions);
      
      // Style Title
      petunjukWs['A1'].s = { font: { bold: true, sz: 16, color: { rgb: "4F46E5" } } };
      petunjukWs['A3'].s = { font: { bold: true, color: { rgb: "B91C1C" } } };

      XLSX.utils.book_append_sheet(wb, petunjukWs, 'Petunjuk');

      // --- REFERENSI SHEET ---
      const kelasRef = await kelasService.getKelasReference(tenantId, scope);
      const refData = kelasRef.map(k => {
        if (isSmkMak) {
          return {
            'ID Kelas': k.id,
            'Nama Kelas': k.nama_kelas,
            'Jurusan ⭐ (Wajib)': k.jurusan,
            'Tingkat': k.tingkat
          };
        } else {
          return {
            'ID Kelas (Sangat Disarankan)': k.id,
            'Nama Kelas': k.nama_kelas,
            'Tingkat': k.tingkat,
            'Jurusan': k.jurusan
          };
        }
      });
      const refWs = XLSX.utils.json_to_sheet(refData);
      
      if (isSmkMak) {
        refWs['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 10 }];
        // Highlight Jurusan column header
        const jurCell = refWs[XLSX.utils.encode_cell({ r: 0, c: 2 })];
        if (jurCell) {
          jurCell.s = reqHeaderStyle;
        }
      } else {
        refWs['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 10 }, { wch: 20 }];
      }
      
      XLSX.utils.book_append_sheet(wb, refWs, 'Referensi Kelas');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', 'attachment; filename="import_siswa_template.xlsx"');
      return reply.send(buffer);
    } catch (error) {
      console.error('Error template:', error);
      return reply.status(500).send({ success: false, message: 'Failed to generate template' });
    }
  },
async importFromExcel(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });
      }

      const part = await request.file();
      if (!part) {
        return reply.status(400).send({ success: false, message: 'No file uploaded' });
      }

      const buffer = await part.toBuffer();
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const data: any[] = smartReadSheet(ws);

      if (data.length === 0) {
        return reply.status(400).send({ success: false, message: 'Excel file is empty' });
      }

      const [ref, jurusans, sekolah] = await Promise.all([
        siswaService.getImportReferenceData(tenantId),
        prisma.jurusan.findMany({ where: { tenant_id: tenantId } }),
        prisma.sekolah.findFirst({ where: { tenant_id: tenantId } })
      ]);
      const isSmkMak = ['SMK', 'MAK'].includes(sekolah?.jenjang?.toUpperCase() || '') || jurusans.length > 0;
      const kelasList = ref.kelasList as any[];
      const kelasIdSet = new Set(kelasList.map(k => k.id));
      const jurusanNames = jurusans.map(j => j.nama);

      // Attempt to get active academic year/semester if not provided
      // Use query params if provided (for importing into past periods)
      const query = request.query as any;
      const activeYear = query.tahun_pelajaran_id 
        ? { id: query.tahun_pelajaran_id } 
        : ref.activeYear as any;
      const activeSemester = query.semester_id 
        ? { id: query.semester_id } 
        : ref.activeSemester as any;

      if (!activeYear || !activeSemester) {
        return reply.status(400).send({ 
          success: false, 
          message: 'Gagal Impor: Tahun Pelajaran atau Semester Aktif tidak ditemukan. Silakan pilih periode target atau aktifkan terlebih dahulu di menu Pengaturan Akademik.' 
        });
      }

      // Increase request timeout to 30 minutes for large imports
      request.raw.setTimeout(30 * 60 * 1000);

      // Smart Tenant Subscription Limit Check
      // Instead of blocking by total rows in Excel, we only count "Truly New" students.
      // This prevents blocking when the admin is just updating existing records.
      /* Core Platform: Quota check bypassed for students */
      
      // Extract NIS for matching
      const nisList = data
        .map(d => String(d.nis || '').trim())
        .filter(nis => nis.length > 0);

      // Extract Name + Kelas for matching rows without NIS
      const nameKelasPairs = data
        .filter(d => !d.nis)
        .map(d => {
          const nama = String(d.nama_siswa || '').trim();
          // Resolve kelas_id from nama_kelas or use kelas_id directly
          const kName = String(d.nama_kelas || '').trim();
          const kelas = kelasList.find(k => k.nama_kelas === kName || k.id === d.kelas_id);
          return { nama, kelas_id: kelas?.id };
        })
        .filter(p => p.nama && p.kelas_id);

      // Count existing students using both criteria
      let existingIds = new Set<string>();

      // 1. Match by NIS
      if (nisList.length > 0) {
        const matches = await prisma.siswa.findMany({
          where: { tenant_id: tenantId, nis: { in: nisList } },
          select: { id: true }
        });
        matches.forEach((m: any) => existingIds.add(m.id));
      }

      // 2. Match by Nama + Kelas (for rows that didn't have NIS or NIS didn't match)
      // To avoid expensive OR queries, we only check if we have few enough pairs or use a batch approach
      // For quota check, we can just do a few chunks or a composite check if Prisma supports it
      if (nameKelasPairs.length > 0) {
        // Simple heuristic: check first 500 to keep it fast, or use a composite OR
        const matches = await prisma.siswa.findMany({
          where: {
            tenant_id: tenantId,
            OR: nameKelasPairs.slice(0, 1000).map(p => ({
              nama_siswa: p.nama,
              kelas_id: p.kelas_id
            }))
          },
          select: { id: true }
        });
        matches.forEach((m: any) => existingIds.add(m.id));
      }

      const existingInDb = existingIds.size;

      // Net increment calculation for logging
      const netIncrement = Math.max(0, data.length - existingInDb);
      
      console.log(`[Import Siswa] Core Platform - Unlimited Students. Total Rows: ${data.length}, Existing Match: ${existingInDb}, Net New: ${netIncrement}`);
      
      /* Core Platform: Quota check bypassed for students */
      /*
      try {
        await subscriptionService.checkTenantLimit(scope.tenantId, 'students', netIncrement);
      } catch (err: any) {
        ...
      }
      */

      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let failCount = 0;
      const errors: any[] = [];

      // Process in batches to handle large datasets (e.g. 3000 rows)
      // Reduced batch size to 10 to prevent connection pool exhaustion and timeouts
      const BATCH_SIZE = 10; 
      
      // Get IO instances (support both /socket.io and /api/socket.io)
      const io = request.server.io;
      const ioApi = request.server.ioApi;
      const userId = request.user?.id;
      const clientSocketId = request.headers['x-socket-id'];
      
      console.log(`[Import Siswa] Starting import. UserId: ${userId}, SocketId from header: ${clientSocketId}`);

      if (!io && !ioApi) console.warn('Warning: No Socket IO instance found on request.server');

      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (row, batchIndex) => {
          const index = i + batchIndex;
          const rowNumber = row.__rowNum || (index + 2);
          try {
            const getVal = (...keys: string[]) => {
              for (const k of keys) {
                if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
                  return String(row[k]).trim();
                }
              }
              return undefined;
            };

            // Map row to CreateSiswaInput with robust Excel header alias matching
            const input: any = {
              ...row,
              nama_siswa: getVal('nama_siswa', 'NAMA LENGKAP', 'Nama Lengkap', 'NAMA SISWA', 'Nama Siswa', 'Nama', 'NAMA'),
              nis: getVal('nis', 'NIS'),
              nisn: getVal('nisn', 'NISN'),
              nik: getVal('nik', 'NIK'),
              jenis_kelamin: getVal('jenis_kelamin', 'JK (L/P)', 'JK', 'Jenis Kelamin', 'JENIS KELAMIN'),
              tempat_lahir: getVal('tempat_lahir', 'TEMPAT LAHIR', 'Tempat Lahir'),
              tanggal_lahir: getVal('tanggal_lahir', 'TANGGAL LAHIR (YYYY-MM-DD)', 'Tanggal Lahir (YYYY-MM-DD)', 'Tanggal Lahir', 'TANGGAL LAHIR'),
              tanggal_masuk: getVal('tanggal_masuk', 'TANGGAL MASUK (YYYY-MM-DD)', 'Tanggal Masuk (YYYY-MM-DD)', 'Tanggal Masuk', 'TANGGAL MASUK'),
              tanggal_keluar: getVal('tanggal_keluar', 'TANGGAL KELUAR (YYYY-MM-DD)', 'Tanggal Keluar (YYYY-MM-DD)', 'Tanggal Keluar', 'TANGGAL KELUAR'),
              alamat: getVal('alamat', 'ALAMAT', 'Alamat', 'Alamat Lengkap', 'ALAMAT LENGKAP', 'Alamat Lengkap (Jl/Rt/Rw/Kel/Kec)', 'alamat_lengkap'),
              dusun: getVal('dusun', 'DUSUN', 'Dusun', 'Kampung'),
              kelurahan: getVal('kelurahan', 'KELURAHAN', 'Kelurahan', 'Kelurahan/Desa', 'Desa'),
              kecamatan: getVal('kecamatan', 'KECAMATAN', 'Kecamatan'),
              kabupaten: getVal('kabupaten', 'KABUPATEN', 'Kabupaten', 'Kab/Kota', 'Kota', 'Kabupaten/Kota'),
              provinsi: getVal('provinsi', 'PROVINSI', 'Provinsi'),
              rt: getVal('rt', 'RT'),
              rw: getVal('rw', 'RW'),
              kode_pos: getVal('kode_pos', 'KODE POS', 'Kode Pos', 'KODE_POS'),
              no_hp: getVal('no_hp', 'NO. HP', 'No. HP', 'No HP', 'NO HP', 'HP', 'Telepon'),
              transportasi: getVal('transportasi', 'TRANSPORTASI', 'Transportasi', 'Moda Transportasi'),
              sekolah_asal: getVal('sekolah_asal', 'SEKOLAH ASAL', 'Sekolah Asal'),
              no_ijazah_smp: getVal('no_ijazah_smp', 'NO. IJAZAH SMP', 'No. Ijazah SMP', 'No Ijazah SMP'),
              no_rfid: getVal('no_rfid', 'NO. RFID', 'No. RFID', 'No RFID', 'RFID'),
              tinggi_badan: getVal('tinggi_badan', 'TINGGI BADAN (CM)', 'Tinggi Badan (cm)', 'Tinggi Badan', 'TB'),
              berat_badan: getVal('berat_badan', 'BERAT BADAN (KG)', 'Berat Badan (kg)', 'Berat Badan', 'BB'),
              nama_ayah: getVal('nama_ayah', 'NAMA AYAH', 'Nama Ayah', 'Ayah'),
              nik_ayah: getVal('nik_ayah', 'NIK AYAH', 'NIK Ayah'),
              no_hp_ayah: getVal('no_hp_ayah', 'NO. HP AYAH', 'No. HP Ayah', 'No HP Ayah', 'HP Ayah'),
              nama_ibu: getVal('nama_ibu', 'NAMA IBU', 'Nama Ibu', 'Ibu'),
              nik_ibu: getVal('nik_ibu', 'NIK IBU', 'NIK Ibu'),
              no_hp_ibu: getVal('no_hp_ibu', 'NO. HP IBU', 'No. HP Ibu', 'No HP Ibu', 'HP Ibu'),
              nama_wali: getVal('nama_wali', 'NAMA WALI', 'Nama Wali', 'Wali'),
              nik_wali: getVal('nik_wali', 'NIK WALI', 'NIK Wali'),
              no_hp_wali: getVal('no_hp_wali', 'NO. HP WALI', 'No. HP Wali', 'No HP Wali', 'HP Wali'),
              status: getVal('status', 'STATUS', 'Status'),
              email: getVal('email', 'EMAIL', 'Email'),
            };

            // 1. Validate Required Fields (Nama & Kelas) per user request
            if (!input.nama_siswa || String(input.nama_siswa).trim() === '') {
               throw new Error('Nama Siswa is required');
            }

            const scenario = String(query.scenario || query.type || '').toUpperCase();
            const defaultStatus = scenario === 'HISTORIS' 
              ? 'LULUS' 
              : scenario === 'PPDB' 
                ? 'CALON' 
                : String(query.status || 'AKTIF').trim().toUpperCase();

            const statusInput = String(input.status || input.Status || defaultStatus).trim().toUpperCase();
            const isCalon = statusInput === 'CALON' || scenario === 'PPDB';
            const isHistoris = ['LULUS', 'MUTASI', 'TIDAK_AKTIF'].includes(statusInput) || scenario === 'HISTORIS';

            const inputJurusan = input.JURUSAN || input.jurusan || input.Jurusan || input.nama_jurusan;
            if (isSmkMak && isCalon && !inputJurusan) {
              throw new Error('Kolom JURUSAN wajib diisi untuk siswa CALON (PPDB) di sekolah SMK/MAK');
            }

            // Resolve Jurusan if provided
            let matchedJurusanId: string | undefined = undefined;
            if (inputJurusan) {
              const matchJurusan = findBestMatch(String(inputJurusan), jurusanNames);
              if (matchJurusan.match) {
                matchedJurusanId = jurusans.find(j => j.nama === matchJurusan.match)?.id;
              } else if (isSmkMak && isCalon) {
                throw new Error(`Jurusan "${inputJurusan}" tidak ditemukan`);
              }
            }
            input.jurusan_id = matchedJurusanId;

            // Resolve kelas_id
            let kelasId = input.kelas_id || input.nama_kelas || input.Kelas;
            if (!isCalon && !isHistoris) {
              if (kelasId) {
                 const kelasIdStr = String(kelasId).trim();
                 // check if it's an ID
                 if (kelasIdSet.has(kelasIdStr)) {
                    kelasId = kelasIdStr;
                 } else {
                    // Filter candidate kelas berdasarkan jurusan jika disediakan
                    let candidateKelas = kelasList;
                    if (inputJurusan) {
                      const matchJurusan = findBestMatch(String(inputJurusan), jurusanNames);
                      if (matchJurusan.match) {
                        const targetJurusanId = jurusans.find(j => j.nama === matchJurusan.match)?.id;
                        candidateKelas = kelasList.filter(k => k.jurusan_id === targetJurusanId);
                      }
                    }

                    const candidateNames = candidateKelas.map(k => k.nama_kelas);
                    const match = findBestMatch(kelasIdStr, candidateNames);
                    if (match.match) {
                       // Deteksi ambiguitas
                       const matchedKelasAll = candidateKelas.filter(k => k.nama_kelas === match.match);
                       if (matchedKelasAll.length > 1) {
                         const list = matchedKelasAll.map(k => k.Jurusan?.nama || 'tanpa jurusan').join(', ');
                         throw new Error(
                           `Kelas "${match.match}" ambigu — ditemukan di beberapa jurusan: ${list}. ` +
                           `Sertakan kolom JURUSAN di Excel untuk menentukan kelas yang tepat.`
                         );
                       }
                       kelasId = matchedKelasAll[0].id;
                    } else {
                       throw new Error(`Kelas '${kelasId}' tidak ditemukan`);
                    }
                 }
              } else {
                 throw new Error('Kolom Kelas wajib diisi untuk siswa aktif');
              }
              input.kelas_id = kelasId;
            } else if (isHistoris && kelasId) {
              const kelasIdStr = String(kelasId).trim();
              if (kelasIdSet.has(kelasIdStr)) {
                input.kelas_id = kelasIdStr;
              } else {
                const match = findBestMatch(kelasIdStr, kelasList.map(k => k.nama_kelas));
                if (match.match) {
                  const matchedK = kelasList.find(k => k.nama_kelas === match.match);
                  if (matchedK) input.kelas_id = matchedK.id;
                }
              }
            } else {
              input.kelas_id = undefined;
            }
            input.status = statusInput;

            // 2. Default academic period if missing
            if (!input.tahun_pelajaran_id && activeYear) {
              input.tahun_pelajaran_id = activeYear.id;
            }
            if (!input.semester_id && activeSemester) {
              input.semester_id = activeSemester.id;
            }

            // 3. Date parsing
            const dateFields = ['tanggal_lahir', 'tanggal_masuk', 'tanggal_keluar'];
            dateFields.forEach(field => {
               if (input[field]) {
                 // XLSX might return number for dates, or string
                 if (typeof input[field] === 'number') {
                   // Excel date serial number to JS Date
                   // (value - 25569) * 86400 * 1000
                   input[field] = new Date((input[field] - 25569) * 86400 * 1000);
                 } else {
                   input[field] = new Date(input[field]);
                 }
               }
            });
            
            // 4. Handle OrangTua fields if flattened in Excel
            // ... (rest of logic)

            // 5. Create Siswa
            input.skipQuotaCheck = true; // Skip per-row check, we checked bulk
            const result: any = await siswaService.createSiswa(input, tenantId, scope);
            
            // Check operation type from metadata
            if (result._op === 'CREATED') {
               createdCount++;
            } else if (result._op === 'UPDATED') {
               updatedCount++;
            } else if (result._op === 'SKIPPED') {
               skippedCount++;
            }
          } catch (error: any) {
            failCount++;
            errors.push({ row: rowNumber, name: row.nama_siswa || 'Unknown', message: error.message });
          }
        }));

        // Emit progress event
        if (userId) {
             const currentProcessed = Math.min(data.length, i + BATCH_SIZE);
             const progress = Math.round((currentProcessed / data.length) * 100);
             
             const payload = {
                type: 'siswa',
                progress,
                created: createdCount,
                updated: updatedCount,
                skipped: skippedCount,
                failed: failCount
             };

             const roomName = `user:${userId}`;
             // Debug log for progress emission
             if (i === 0 || i % (BATCH_SIZE * 5) === 0) { // Log every 5th batch or first
                console.log(`[Import Siswa] Emitting progress to ${roomName} ${clientSocketId ? `& socket:${clientSocketId}` : ''}: ${progress}%`);
             }

             // Emit to user room (legacy/multi-tab support)
             if (io) io.to(roomName).emit('import_progress', payload);
             if (ioApi) ioApi.to(roomName).emit('import_progress', payload);

             // Emit to specific socket (if provided, guarantees delivery to requester)
             if (clientSocketId) {
                if (io) io.to(clientSocketId).emit('import_progress', payload);
                if (ioApi) ioApi.to(clientSocketId).emit('import_progress', payload);
             }
        } else {
             console.warn('[Import Siswa] Warning: No userId found in request, skipping progress emission');
        }
      }

      return reply.status(200).send({
        success: true,
        message: `Import completed. Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Failed: ${failCount}`,
        data: { 
          created: createdCount, 
          updated: updatedCount, 
          skipped: skippedCount,
          failed: failCount, 
          errors 
        }
      });

    } catch (error: any) {
      console.error('Import error:', error);
      
      // Handle subscription quota errors specifically
      if (error.message && (error.message.includes('Batas kuota') || error.message.includes('quota exceeded'))) {
         return reply.status(400).send({ success: false, message: error.message });
      }

      return reply.status(500).send({ success: false, message: 'Failed to import siswa', error: error.message });
    }
  },
async exportToExcel(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      // Get all students with query filters applied (large limit for full export)
      const queryParams = { ...(request.query || {}), page: 1, limit: 100000 };
      const result = await siswaService.getAllSiswa(tenantId, scope, queryParams);

      const rawData = [...(result.data || [])];

      // Sort Standar Sekolah: 1. Kelas (nama_kelas), 2. Nama Siswa (A-Z)
      rawData.sort((a: any, b: any) => {
        const kelasA = (a.Kelas?.nama_kelas || '').trim();
        const kelasB = (b.Kelas?.nama_kelas || '').trim();

        if (kelasA && !kelasB) return -1;
        if (!kelasA && kelasB) return 1;

        if (kelasA !== kelasB) {
          const kComp = kelasA.localeCompare(kelasB, 'id', { numeric: true, sensitivity: 'base' });
          if (kComp !== 0) return kComp;
        }

        const namaA = String(a.nama_siswa || '').trim();
        const namaB = String(b.nama_siswa || '').trim();
        return namaA.localeCompare(namaB, 'id', { sensitivity: 'base' });
      });

      const data = rawData.map((s, index) => ({
        No: index + 1,
        'Nama Siswa': s.nama_siswa,
        NIS: s.nis || '',
        NISN: s.nisn || '',
        'Jenis Kelamin': s.jenis_kelamin === 'L' ? 'L' : 'P',
        Kelas: s.Kelas?.nama_kelas || '',
        Tingkat: s.Kelas?.tingkat || '',
        Email: s.User?.email || '',
        'Tempat Lahir': s.tempat_lahir || '',
        'Tanggal Lahir': s.tanggal_lahir ? new Date(s.tanggal_lahir).toLocaleDateString('id-ID') : '',
        'Alamat Lengkap': s.alamat || '',
        'No HP': s.no_hp || '',
        Status: s.status,
        'No RFID': s.no_rfid || ''
      }));

      if (data.length === 0) {
        data.push({ No: 1, 'Nama Siswa': 'Belum ada data', NIS: '', NISN: '', 'Jenis Kelamin': '', Kelas: '', Tingkat: '', Email: '', 'Tempat Lahir': '', 'Tanggal Lahir': '', 'Alamat Lengkap': '', 'No HP': '', Status: '', 'No RFID': '' } as any);
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      // --- STYLING ---
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      
      // Header Style
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
        fill: { fgColor: { rgb: "4F46E5" } }, // Indigo 600
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };

      // Cell Style
      const cellStyle = {
        alignment: { vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "CCCCCC" } },
          bottom: { style: "thin", color: { rgb: "CCCCCC" } },
          left: { style: "thin", color: { rgb: "CCCCCC" } },
          right: { style: "thin", color: { rgb: "CCCCCC" } }
        }
      };

      // Apply Styles
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cell_address]) continue;
          
          if (R === 0) {
            ws[cell_address].s = headerStyle;
          } else {
            ws[cell_address].s = cellStyle;
            // Center align specific columns
            if ([0, 4, 5, 6, 12].includes(C)) {
              ws[cell_address].s = { ...cellStyle, alignment: { horizontal: "center", vertical: "center" } };
            }
          }
        }
      }

      // Auto-width columns
      const colWidths = [
        { wch: 5 },  // No
        { wch: 25 }, // Nama
        { wch: 15 }, // NIS
        { wch: 15 }, // NISN
        { wch: 5 },  // JK
        { wch: 15 }, // Kelas
        { wch: 10 }, // Tingkat
        { wch: 25 }, // Email
        { wch: 15 }, // Tempat Lahir
        { wch: 15 }, // Tanggal Lahir
        { wch: 30 }, // Alamat
        { wch: 15 }, // No HP
        { wch: 12 }, // Status
        { wch: 15 }  // RFID
      ];
      ws['!cols'] = colWidths;
      ws['!rows'] = [{ hpt: 30 }]; // Header height

      XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="siswa_export_${new Date().toISOString().split('T')[0]}.xlsx"`);

      return reply.send(buffer);
    } catch (error) {
      console.error('Export error:', error);
      return reply.status(500).send({ success: false, message: 'Export failed' });
    }
  }
};

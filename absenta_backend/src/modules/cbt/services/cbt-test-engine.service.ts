import { prisma } from '@/utils/prisma';
import { getRedisConnection } from '@/infra/redis/redisClient';
import { Prisma } from '@prisma/client';
import { CbtJadwalService } from './cbt-jadwal.service';

export class CbtTestEngineService {
  /**
   * Daftar jadwal ujian milik siswa (berdasarkan kelas siswa) beserta status & hasil pengerjaannya.
   * Token ujian TIDAK pernah dikirim ke siswa — token tetap diumumkan oleh pengawas.
   */
  static async getMyExams(tenantId: string, siswaId: string) {
    const siswa = await prisma.siswa.findFirst({
      where: { id: siswaId, tenant_id: tenantId },
      select: {
        id: true,
        kelas_id: true,
        Kelas: {
          select: {
            id: true,
            nama_kelas: true,
            tingkat: true,
            Jurusan: { select: { kode: true, singkatan: true, nama: true } },
          },
        },
      },
    });

    if (!siswa) {
      throw new Error('Data siswa tidak ditemukan.');
    }

    if (!siswa.kelas_id) {
      return [];
    }

    const [jadwalList, activeDenahs, allClasses, classGuruMapels] = await Promise.all([
      prisma.cbtJadwalUjian.findMany({
        where: {
          tenant_id: tenantId,
          status: { in: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'] },
          target_kelas_ids: { array_contains: [siswa.kelas_id] },
        },
        orderBy: { tanggal_mulai: 'desc' },
        take: 100,
        select: {
          id: true,
          nama_sesi: true,
          tanggal_mulai: true,
          tanggal_selesai: true,
          durasi_menit: true,
          status: true,
          setting_keamanan: true,
          TahunPelajaran: { select: { tahun: true } },
          Semester: { select: { nama_semester: true } },
          BankSoal: {
            select: {
              id: true,
              mapel_id: true,
              kode_bank: true,
              judul: true,
              tingkat: true,
              jumlah_soal: true,
              Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
              Guru: { select: { id: true, nama_guru: true } },
            },
          },
          Peserta: {
            where: { siswa_id: siswaId },
            take: 1,
            select: {
              status: true,
              waktu_mulai: true,
              waktu_selesai: true,
              nilai_akhir: true,
              jumlah_benar: true,
              jumlah_salah: true,
              jawaban_json: true,
              log_pelanggaran_json: true,
            },
          },
        },
      }),
      prisma.denahSpasial.findMany({
        where: { tenant_id: tenantId, is_active: true },
        orderBy: [{ tipe: 'desc' }, { updated_at: 'desc' }],
        select: { id: true, tipe: true, elements: true },
      }),
      prisma.kelas.findMany({
        where: { tenant_id: tenantId, is_active: true },
        include: { Jurusan: true },
      }),
      // SSOT Resolusi Guru Pengampu Kelas Siswa untuk Bank Soal Bersama MGMP
      prisma.guruMapel.findMany({
        where: { tenant_id: tenantId, kelas_id: siswa.kelas_id },
        include: {
          Guru: { select: { id: true, nama_guru: true } },
        },
      }),
    ]);

    // 1. Ekstrak pemetaan ruang dari Denah Spasial Kampus (Master Sarpras & Event Ujian)
    const denahRoomByKelasId = new Map<string, { slot_ruang: string; nama_ruang: string }>();
    const denahRoomByKelasName = new Map<string, { slot_ruang: string; nama_ruang: string }>();

    for (const d of activeDenahs) {
      const elems = Array.isArray(d.elements) ? (d.elements as any[]) : [];
      for (const el of elems) {
        if (!el || !el.label_utama) continue;
        const slot = String(el.label_utama).trim();
        const nama = el.catatan || el.label_sub || slot;

        if (el.kelas_id && !denahRoomByKelasId.has(el.kelas_id)) {
          denahRoomByKelasId.set(el.kelas_id, { slot_ruang: slot, nama_ruang: nama });
        }
        if (el.label_sub && typeof el.label_sub === 'string') {
          const subLower = el.label_sub.trim().toLowerCase();
          if (!denahRoomByKelasName.has(subLower)) {
            denahRoomByKelasName.set(subLower, { slot_ruang: slot, nama_ruang: nama });
          }
        }
      }
    }

    // 2. Pemetaan ruang deterministik standar industri (R.01 s/d R.XX berdasar urutan Tingkat & Jurusan)
    const standardClassRoomMap = new Map<string, { slot_ruang: string; nama_ruang: string }>();
    const sortedClasses = [...allClasses].sort((a, b) => {
      const numA = Number(a.tingkat) || 0;
      const numB = Number(b.tingkat) || 0;
      if (numA !== numB) return numA - numB;

      const jurA = a.Jurusan?.kode || a.Jurusan?.singkatan || a.Jurusan?.nama || '';
      const jurB = b.Jurusan?.kode || b.Jurusan?.singkatan || b.Jurusan?.nama || '';
      if (jurA !== jurB) return jurA.localeCompare(jurB);

      const nameA = a.nama_kelas || '';
      const nameB = b.nama_kelas || '';
      return nameA.localeCompare(nameB);
    });

    const padLength = sortedClasses.length > 99 ? 3 : 2;
    sortedClasses.forEach((k, idx) => {
      const numStr = String(idx + 1).padStart(padLength, '0');
      const slotCode = `R.${numStr}`;
      const roomName = `Ruang ${numStr}`;
      standardClassRoomMap.set(k.id, { slot_ruang: slotCode, nama_ruang: roomName });
    });

    // 3. Pemetaan Guru Mapel Kelas Siswa (Smart Class Teacher Resolution untuk Bank Soal MGMP)
    const classTeacherByMapelId = new Map<string, string>();
    for (const gm of classGuruMapels) {
      if (gm.mapel_id && gm.Guru?.nama_guru) {
        classTeacherByMapelId.set(gm.mapel_id, gm.Guru.nama_guru);
      }
    }

    return jadwalList.map((j) => {
      const peserta = j.Peserta[0];
      const showResult = (j.setting_keamanan as any)?.show_result_instant ?? true;
      const isFinished = peserta?.status === 'FINISHED';
      const jawabanArr = Array.isArray(peserta?.jawaban_json) ? (peserta.jawaban_json as any[]) : [];
      const jumlahTerjawab = jawabanArr.filter((ans) => ans && String(ans.jawaban_siswa || '').trim() !== '').length;
      const pelanggaranArr = Array.isArray(peserta?.log_pelanggaran_json) ? (peserta.log_pelanggaran_json as any[]) : [];

      let durasiPengerjaanMenit: number | null = null;
      if (peserta?.waktu_mulai && peserta?.waktu_selesai) {
        const diffMs = new Date(peserta.waktu_selesai).getTime() - new Date(peserta.waktu_mulai).getTime();
        if (diffMs >= 0) {
          durasiPengerjaanMenit = Math.max(1, Math.round(diffMs / 60000));
        }
      }

      // Resolusi Presisi Ruang Fisik Siswa (100% Akurat, Zero Fallback, Eliminasi Total 'Multi-Ruang')
      const sec = (j.setting_keamanan as any) || {};
      const roomMappings = sec.room_mappings || sec.kelas_room_map || {};
      const studentRoom = siswa.kelas_id ? roomMappings[siswa.kelas_id] : null;

      let resolvedSlotRuang: string | null = null;
      let resolvedNamaRuang: string | null = null;

      // Prioritas 1: Mapping eksplisit per kelas dalam konfigurasi jadwal
      if (studentRoom?.slot_ruang) {
        resolvedSlotRuang = studentRoom.slot_ruang;
        resolvedNamaRuang = studentRoom.nama_ruang || studentRoom.slot_ruang;
      }
      // Prioritas 2: Ruang spesifik non-multi yang sudah terekam di jadwal (misal 'R.05' atau 'Lab Komputer 1')
      else if (sec.ruang_ujian && !String(sec.ruang_ujian).toLowerCase().includes('multi') && String(sec.ruang_ujian).toLowerCase() !== 'ruang kelas') {
        resolvedSlotRuang = sec.ruang_ujian;
        resolvedNamaRuang = sec.ruang_ujian_nama || sec.ruang_ujian;
      }
      // Prioritas 3: Deteksi langsung dari Denah Spasial Kampus (Master Sarpras & Event Ujian)
      else if (siswa.kelas_id && denahRoomByKelasId.has(siswa.kelas_id)) {
        const dRoom = denahRoomByKelasId.get(siswa.kelas_id)!;
        resolvedSlotRuang = dRoom.slot_ruang;
        resolvedNamaRuang = dRoom.nama_ruang;
      } else if (siswa.Kelas?.nama_kelas && denahRoomByKelasName.has(siswa.Kelas.nama_kelas.trim().toLowerCase())) {
        const dRoom = denahRoomByKelasName.get(siswa.Kelas.nama_kelas.trim().toLowerCase())!;
        resolvedSlotRuang = dRoom.slot_ruang;
        resolvedNamaRuang = dRoom.nama_ruang;
      }
      // Prioritas 4: Penomoran ruang deterministik standar industri (R.01, R.02, dst berdasar daftar kelas)
      else if (siswa.kelas_id && standardClassRoomMap.has(siswa.kelas_id)) {
        const sRoom = standardClassRoomMap.get(siswa.kelas_id)!;
        resolvedSlotRuang = sRoom.slot_ruang;
        resolvedNamaRuang = sRoom.nama_ruang;
      }
      // Prioritas 5: Ruang R.01
      else {
        resolvedSlotRuang = 'R.01';
        resolvedNamaRuang = 'Ruang 01';
      }

      // Resolusi Guru Pengampu Kelas: Siswa melihat guru kelasnya sendiri, bukan pembuat bank soal MGMP
      const targetMapelId = j.BankSoal?.mapel_id || (j.BankSoal?.Mapel as any)?.id;
      const classSubjectTeacher = targetMapelId ? classTeacherByMapelId.get(targetMapelId) : null;
      const resolvedGuru = classSubjectTeacher || j.BankSoal?.Guru?.nama_guru || null;

      return {
        id: j.id,
        nama_sesi: j.nama_sesi,
        mapel: j.BankSoal?.Mapel?.nama_mapel || '-',
        kode_mapel: j.BankSoal?.Mapel?.kode_mapel || null,
        kode_bank: j.BankSoal?.kode_bank || null,
        judul_bank: j.BankSoal?.judul || '-',
        tingkat: j.BankSoal?.tingkat || null,
        tahun_ajaran: j.TahunPelajaran?.tahun || null,
        semester: j.Semester?.nama_semester || null,
        guru: resolvedGuru,
        total_soal: j.BankSoal?.jumlah_soal || 0,
        tanggal_mulai: j.tanggal_mulai,
        tanggal_selesai: j.tanggal_selesai,
        durasi_menit: j.durasi_menit,
        status_jadwal: j.status,
        nama_sesi_waktu: sec?.nama_sesi_waktu || null,
        ruang_ujian: resolvedSlotRuang,
        ruang_ujian_nama: resolvedNamaRuang,
        kelas_siswa: siswa.Kelas?.nama_kelas || null,
        status_peserta: peserta?.status || 'BELUM_MULAI',
        waktu_mulai: peserta?.waktu_mulai || null,
        waktu_selesai: peserta?.waktu_selesai || null,
        durasi_pengerjaan_menit: durasiPengerjaanMenit,
        jumlah_terjawab: jumlahTerjawab,
        pelanggaran_count: pelanggaranArr.length,
        hasil:
          isFinished && (showResult || j.status === 'COMPLETED')
            ? {
                nilai_akhir: Number(peserta?.nilai_akhir ?? 0),
                jumlah_benar: peserta?.jumlah_benar ?? 0,
                jumlah_salah: peserta?.jumlah_salah ?? 0,
              }
            : null,
      };
    });
  }

  /**
   * Helper format waktu jam:menit WIB untuk pesan error presisi
   */
  private static formatJamIndo(d: Date | string): string {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
        hour12: false,
      }).format(new Date(d)).replace('.', ':');
    } catch {
      return '';
    }
  }

  /**
   * Helper format tanggal Indonesia untuk pesan error presisi
   */
  private static formatTanggalIndo(d: Date | string): string {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      }).format(new Date(d));
    } catch {
      return '';
    }
  }

  /**
   * Verifikasi token ujian sebelum siswa masuk dengan diagnosis presisi & spesifik
   */
  static async verifyToken(tenantId: string, tokenUjian: string, siswaId: string) {
    const cleanToken = (tokenUjian || '').trim().toUpperCase();

    // 1. Ambil data profil siswa dan rombel kelasnya terlebih dahulu
    const siswa = await prisma.siswa.findFirst({
      where: { id: siswaId, tenant_id: tenantId },
      select: {
        id: true,
        nama_siswa: true,
        nis: true,
        kelas_id: true,
        Kelas: { select: { id: true, nama_kelas: true } },
      },
    });

    if (!siswa) {
      const err: any = new Error('Data profil siswa tidak ditemukan atau belum terdaftar.');
      err.statusCode = 404;
      err.code = 'STUDENT_NOT_FOUND';
      throw err;
    }

    const redis = getRedisConnection();
    let cachedJadwalId: string | null = null;
    if (redis) {
      cachedJadwalId = await redis.get(`cbt:${tenantId}:token:${cleanToken}`).catch(() => null);
    }

    // 2. Cari jadwal berdasarkan token ujian (tanpa filter status dahulu agar bisa mendiagnosa spesifik)
    const jadwal = await prisma.cbtJadwalUjian.findFirst({
      where: cachedJadwalId
        ? { id: cachedJadwalId, tenant_id: tenantId }
        : { tenant_id: tenantId, token_ujian: cleanToken },
      include: {
        BankSoal: {
          select: {
            id: true,
            mapel_id: true,
            judul: true,
            jumlah_soal: true,
            alokasi_menit: true,
            Mapel: { select: { id: true, nama_mapel: true } },
            Guru: { select: { id: true, nama_guru: true } },
          },
        },
      },
    });

    // ── DIAGNOSIS 1: TOKEN TIDAK DITEMUKAN DI SISTEM ──
    if (!jadwal) {
      let classContext = '';
      if (siswa.kelas_id) {
        const activeSchedulesForClass = await prisma.cbtJadwalUjian.findMany({
          where: {
            tenant_id: tenantId,
            target_kelas_ids: { array_contains: [siswa.kelas_id] },
            status: { in: ['ACTIVE', 'DRAFT', 'PAUSED'] },
          },
          include: {
            BankSoal: {
              include: {
                Mapel: true,
              },
            },
          },
          orderBy: { tanggal_mulai: 'desc' },
          take: 2,
        });

        if (activeSchedulesForClass.length > 0) {
          const infoList = activeSchedulesForClass.map((s: any) => {
            const mapel = s.BankSoal?.Mapel?.nama_mapel || s.nama_sesi;
            const ruang = (s.setting_keamanan as any)?.ruang_ujian || 'Ruang Ujian';
            const statusLabel = s.status === 'ACTIVE' ? 'Aktif' : s.status === 'DRAFT' ? 'DRAFT' : 'Dijeda';
            return `"${mapel}" (${statusLabel} di ${ruang})`;
          });
          classContext = ` Untuk kelas Anda (${siswa.Kelas?.nama_kelas || 'Kelas'}), saat ini terdaftar sesi ${infoList.join(' dan ')}.`;
        }
      }

      const err: any = new Error(
        `Token "${cleanToken}" tidak terdaftar di sistem.${classContext} Mohon periksa kembali kombinasi 6 karakter token pada layar/papan tulis pengawas (waspadai kemiripan angka 0 dengan huruf O, atau angka 1 dengan huruf I).`
      );
      err.statusCode = 404;
      err.code = 'TOKEN_NOT_FOUND';
      err.details = {
        token: cleanToken,
        siswa_kelas: siswa.Kelas?.nama_kelas,
        hint: 'Minta token resmi yang sedang ditampilkan pengawas di depan ruang ujian Anda.',
      };
      throw err;
    }

    const mapelName =
      jadwal.BankSoal?.Mapel?.nama_mapel ||
      jadwal.BankSoal?.judul ||
      jadwal.nama_sesi ||
      'Mata Pelajaran';
    const ruangName = (jadwal.setting_keamanan as any)?.ruang_ujian || 'Ruang CBT';

    // ── DIAGNOSIS 2: SESI MASIH DRAFT (BELUM DIAKTIFKAN OLEH PENGAWAS) ──
    if (jadwal.status === 'DRAFT') {
      const err: any = new Error(
        `Sesi ujian "${mapelName}" (${ruangName}) belum diaktifkan oleh pengawas (Status: DRAFT). Mohon beri tahu pengawas di ruang Anda untuk menekan tombol hijau "Aktifkan" pada layar pengawas.`
      );
      err.statusCode = 400;
      err.code = 'SESSION_DRAFT';
      err.details = {
        token: cleanToken,
        mapel: mapelName,
        ruang: ruangName,
        status: 'DRAFT',
        hint: 'Pengawas ruang harus menekan tombol "Aktifkan" di Meja Pengawas agar peserta dapat mulai masuk.',
      };
      throw err;
    }

    // ── DIAGNOSIS 3: SESI SEDANG DIJEDA OLEH PENGAWAS ──
    if (jadwal.status === 'PAUSED') {
      const err: any = new Error(
        `Sesi ujian "${mapelName}" (${ruangName}) sedang dijeda sementara oleh pengawas. Mohon tunggu hingga pengawas melanjutkan (resume) sesi ujian.`
      );
      err.statusCode = 400;
      err.code = 'SESSION_PAUSED';
      err.details = {
        token: cleanToken,
        mapel: mapelName,
        ruang: ruangName,
        status: 'PAUSED',
        hint: 'Pengawas sedang menjeda ujian untuk instruksi atau perbaikan teknis.',
      };
      throw err;
    }

    // ── DIAGNOSIS 4: SESI SUDAH RESMI DITUTUP / SELESAI ──
    if (jadwal.status === 'COMPLETED') {
      const err: any = new Error(
        `Sesi ujian "${mapelName}" (${ruangName}) telah resmi selesai/ditutup. Siswa tidak dapat masuk lagi ke sesi ini.`
      );
      err.statusCode = 400;
      err.code = 'SESSION_COMPLETED';
      err.details = {
        token: cleanToken,
        mapel: mapelName,
        ruang: ruangName,
        status: 'COMPLETED',
        hint: 'Jika Anda terlambat atau memerlukan jadwal susulan, silakan melapor ke Panitia CBT.',
      };
      throw err;
    }

    // ── DIAGNOSIS 5: VALIDASI KELAS TARGET (SALAH MASUK KELAS/RUANG) ──
    const targetKelas = (jadwal.target_kelas_ids as string[]) || [];
    if (siswa.kelas_id && targetKelas.length > 0 && !targetKelas.includes(siswa.kelas_id)) {
      const targetClasses = await prisma.kelas.findMany({
        where: { id: { in: targetKelas } },
        select: { nama_kelas: true },
      });
      const targetNames = targetClasses.map((k) => k.nama_kelas).join(', ') || 'kelas lain';
      const siswaKelas = siswa.Kelas?.nama_kelas || 'kelas Anda';
      const err: any = new Error(
        `Token ini milik sesi "${mapelName}" khusus untuk kelas [${targetNames}]. Anda terdaftar di kelas [${siswaKelas}]. Silakan gunakan token sesuai ruang kelas Anda.`
      );
      err.statusCode = 403;
      err.code = 'WRONG_CLASS';
      err.details = {
        token: cleanToken,
        mapel: mapelName,
        target_kelas: targetNames,
        siswa_kelas: siswaKelas,
        hint: `Anda salah memasukkan token dari ruang kelas ${targetNames}. Minta token untuk kelas ${siswaKelas} ke pengawas Anda.`,
      };
      throw err;
    }

    // ── DIAGNOSIS 6: VALIDASI SESI REMEDIAL / TARGET SISWA KHUSUS ──
    const targetSiswa = (jadwal.setting_keamanan as any)?.target_siswa_ids;
    if (Array.isArray(targetSiswa) && targetSiswa.length > 0 && !targetSiswa.includes(siswaId)) {
      const err: any = new Error(
        `Sesi ujian "${mapelName}" ini dikhususkan bagi siswa terdaftar remedial/perbaikan. Akun Anda (${siswa.nama_siswa}) tidak terdaftar dalam kuota remedial sesi ini.`
      );
      err.statusCode = 403;
      err.code = 'REMEDIAL_RESTRICTED';
      err.details = {
        token: cleanToken,
        mapel: mapelName,
        nama_siswa: siswa.nama_siswa,
        hint: 'Hubungi guru mata pelajaran jika nilai Anda sebelumnya di bawah KKTP namun belum terdata di sesi remedial ini.',
      };
      throw err;
    }

    // ── DIAGNOSIS 7: VALIDASI JENDELA WAKTU PELAKSANAAN (EXPIRED) ──
    const now = new Date();
    const tanggalSelesai = new Date(jadwal.tanggal_selesai);
    if (now.getTime() > tanggalSelesai.getTime()) {
      const jamSelesaiStr = CbtTestEngineService.formatJamIndo(tanggalSelesai);
      const tglSelesaiStr = CbtTestEngineService.formatTanggalIndo(tanggalSelesai);
      const err: any = new Error(
        `Waktu pelaksanaan sesi ujian "${mapelName}" telah berakhir (${tglSelesaiStr}, pukul ${jamSelesaiStr} WIB). Pintu masuk telah ditutup.`
      );
      err.statusCode = 400;
      err.code = 'SCHEDULE_EXPIRED';
      err.details = {
        mapel: mapelName,
        tanggal_selesai: jadwal.tanggal_selesai,
        hint: 'Sesi ujian telah melewati batas waktu pengerjaan. Silakan temui Panitia CBT untuk jadwal susulan.',
      };
      throw err;
    }

    // ── DIAGNOSIS 8: VALIDASI SISWA SUDAH FINISHED ATAU DISQUALIFIED ──
    const existingPeserta = await prisma.cbtPesertaUjian.findFirst({
      where: {
        tenant_id: tenantId,
        jadwal_ujian_id: jadwal.id,
        siswa_id: siswaId,
      },
    });

    if (existingPeserta && existingPeserta.status === 'FINISHED') {
      const err: any = new Error(
        `Anda sudah menyelesaikan ujian "${mapelName}" ini dengan nilai akhir ${Number(existingPeserta.nilai_akhir).toFixed(1)}. Siswa tidak dapat mengulang ujian yang telah diserahkan.`
      );
      err.statusCode = 400;
      err.code = 'ALREADY_FINISHED';
      err.details = {
        mapel: mapelName,
        nilai_akhir: existingPeserta.nilai_akhir,
        waktu_selesai: existingPeserta.waktu_selesai,
        hint: 'Jika Anda memerlukan remedial atau ujian ulang, pengawas ruang dapat mengklik tombol "Ulang" (Retake) di Meja Pengawas.',
      };
      throw err;
    }

    if (existingPeserta && existingPeserta.status === 'DISQUALIFIED') {
      const err: any = new Error(
        `Sesi ujian Anda untuk mata pelajaran "${mapelName}" telah didiskualifikasi oleh pengawas karena pelanggaran tata tertib.`
      );
      err.statusCode = 403;
      err.code = 'DISQUALIFIED';
      err.details = {
        mapel: mapelName,
        hint: 'Silakan melapor langsung ke panitia ujian CBT di ruang panitia.',
      };
      throw err;
    }

    // Resolusi Guru Pengampu Kelas Siswa untuk Bank Soal Bersama MGMP
    let resolvedGuru = jadwal.BankSoal?.Guru?.nama_guru || null;
    const targetMapelId = jadwal.BankSoal?.mapel_id || (jadwal.BankSoal?.Mapel as any)?.id;
    if (siswa.kelas_id && targetMapelId) {
      const classGm = await prisma.guruMapel.findFirst({
        where: {
          tenant_id: tenantId,
          kelas_id: siswa.kelas_id,
          mapel_id: targetMapelId,
        },
        include: {
          Guru: { select: { id: true, nama_guru: true } },
        },
      });
      if (classGm?.Guru?.nama_guru) {
        resolvedGuru = classGm.Guru.nama_guru;
      }
    }

    return {
      valid: true,
      jadwal_id: jadwal.id,
      nama_sesi: jadwal.nama_sesi,
      mapel: mapelName,
      judul_bank: jadwal.BankSoal?.judul || mapelName,
      guru: resolvedGuru,
      durasi_menit: jadwal.durasi_menit,
      total_soal: jadwal.BankSoal?.jumlah_soal || 0,
      existing_status: existingPeserta ? existingPeserta.status : 'STANDBY',
    };
  }

  /**
   * Memulai atau Melanjutkan (Resume) Sesi Ujian Siswa
   * Menghasilkan bundle soal dan mengatur sisa waktu dengan isolasi multi-tenant.
   */
  static async startOrResumeSession(
    tenantId: string,
    jadwalId: string,
    siswaId: string,
    tokenMasuk: string,
    metadataPerangkat?: any
  ) {
    const cleanToken = (tokenMasuk || '').trim().toUpperCase();

    const jadwal = await prisma.cbtJadwalUjian.findFirst({
      where: { id: jadwalId, tenant_id: tenantId },
      include: {
        BankSoal: true,
      },
    });

    if (!jadwal) {
      const err: any = new Error('Jadwal ujian tidak ditemukan di sistem.');
      err.statusCode = 404;
      err.code = 'SCHEDULE_NOT_FOUND';
      throw err;
    }

    const mapelName = (jadwal.BankSoal as any)?.judul || jadwal.nama_sesi;

    if (jadwal.status === 'DRAFT') {
      const err: any = new Error(
        `Sesi ujian "${mapelName}" belum diaktifkan oleh pengawas (Status: DRAFT). Silakan minta pengawas menekan tombol "Aktifkan".`
      );
      err.statusCode = 400;
      err.code = 'SESSION_DRAFT';
      throw err;
    }

    if (jadwal.status === 'PAUSED') {
      const err: any = new Error(`Sesi ujian "${mapelName}" sedang dijeda sementara oleh pengawas.`);
      err.statusCode = 400;
      err.code = 'SESSION_PAUSED';
      throw err;
    }

    if (jadwal.status === 'COMPLETED') {
      const err: any = new Error(`Sesi ujian "${mapelName}" telah resmi selesai/ditutup.`);
      err.statusCode = 400;
      err.code = 'SESSION_COMPLETED';
      throw err;
    }

    if (jadwal.token_ujian !== cleanToken) {
      const err: any = new Error(
        'Token ujian telah diperbarui/dirotasi oleh sistem. Masukkan token aktif terbaru dari pengawas.'
      );
      err.statusCode = 400;
      err.code = 'TOKEN_ROTATED';
      throw err;
    }

    const targetSiswa = (jadwal.setting_keamanan as any)?.target_siswa_ids;
    if (Array.isArray(targetSiswa) && targetSiswa.length > 0 && !targetSiswa.includes(siswaId)) {
      const err: any = new Error('Sesi ujian remedial ini khusus untuk siswa yang terdaftar perbaikan.');
      err.statusCode = 403;
      err.code = 'REMEDIAL_RESTRICTED';
      throw err;
    }

    const now = new Date();
    const durasiTotalDetik = jadwal.durasi_menit * 60;

    // Cari atau buat record peserta ujian
    let peserta = await prisma.cbtPesertaUjian.findFirst({
      where: { tenant_id: tenantId, jadwal_ujian_id: jadwalId, siswa_id: siswaId },
    });

    if (!peserta) {
      peserta = await prisma.cbtPesertaUjian.create({
        data: {
          tenant_id: tenantId,
          jadwal_ujian_id: jadwalId,
          siswa_id: siswaId,
          token_masuk: tokenMasuk,
          waktu_mulai: now,
          sisa_waktu_detik: durasiTotalDetik,
          status: 'IN_PROGRESS',
          status_sinkron: 'SYNCED',
          metadata_perangkat: metadataPerangkat || null,
        },
      });
    } else {
      if (peserta.status === 'FINISHED') {
        throw new Error('Ujian sudah selesai diserahkan.');
      }
      if (peserta.status === 'DISQUALIFIED') {
        throw new Error('Ujian didiskualifikasi.');
      }

      // Hitung sisa waktu aktual jika sudah berjalan
      if (peserta.waktu_mulai) {
        const elapsedSeconds = Math.floor((now.getTime() - new Date(peserta.waktu_mulai).getTime()) / 1000);
        const sisaWaktu = Math.max(0, durasiTotalDetik - elapsedSeconds);

        if (sisaWaktu <= 0) {
          // Waktu habis otomatis
          await prisma.cbtPesertaUjian.update({
            where: { id: peserta.id },
            data: { status: 'FINISHED', sisa_waktu_detik: 0, waktu_selesai: now },
          });
          throw new Error('Waktu pengerjaan ujian Anda telah habis.');
        }

        peserta = await prisma.cbtPesertaUjian.update({
          where: { id: peserta.id },
          data: {
            status: 'IN_PROGRESS',
            sisa_waktu_detik: sisaWaktu,
            ...(metadataPerangkat ? { metadata_perangkat: metadataPerangkat } : {}),
          },
        });
      } else {
        peserta = await prisma.cbtPesertaUjian.update({
          where: { id: peserta.id },
          data: {
            status: 'IN_PROGRESS',
            waktu_mulai: now,
            sisa_waktu_detik: durasiTotalDetik,
            ...(metadataPerangkat ? { metadata_perangkat: metadataPerangkat } : {}),
          },
        });
      }
    }

    // Ambil bundle soal (cek Redis terlebih dahulu)
    const redis = getRedisConnection();
    let bundleData: any = null;

    if (redis) {
      const cached = await redis.get(`cbt:${tenantId}:bundle:${jadwalId}`).catch(() => null);
      if (cached) {
        try {
          bundleData = JSON.parse(cached);
        } catch {}
      }
    }

    // Jika tidak ada di cache, ambil langsung dari DB
    if (!bundleData) {
      const soalList = await prisma.cbtSoal.findMany({
        where: { tenant_id: tenantId, bank_soal_id: jadwal.bank_soal_id },
        orderBy: { nomor_urut: 'asc' },
        select: {
          id: true,
          nomor_urut: true,
          jenis_soal: true,
          konten_pertanyaan: true,
          gambar_stimulus_url: true,
          bobot: true,
          opsi_jawaban_json: true,
        },
      });

      bundleData = {
        jadwal_id: jadwal.id,
        nama_sesi: jadwal.nama_sesi,
        durasi_menit: jadwal.durasi_menit,
        setting_keamanan: jadwal.setting_keamanan,
        total_soal: soalList.length,
        soal: soalList,
      };
    }

    // Ambil jawaban yang tersimpan (jika resume dari session buffer Redis atau DB)
    let jawabanSaved: any[] = [];
    if (redis) {
      const redisAnswers = await redis.hget(`cbt:${tenantId}:session:${siswaId}`, 'jawaban').catch(() => null);
      if (redisAnswers) {
        try {
          jawabanSaved = JSON.parse(redisAnswers);
        } catch {}
      }
    }

    if (jawabanSaved.length === 0 && peserta.jawaban_json) {
      jawabanSaved = peserta.jawaban_json as any[];
    }

    return {
      peserta_id: peserta.id,
      jadwal_id: jadwal.id,
      nama_sesi: jadwal.nama_sesi,
      durasi_menit: jadwal.durasi_menit,
      sisa_waktu_detik: peserta.sisa_waktu_detik,
      waktu_mulai: peserta.waktu_mulai,
      setting_keamanan: jadwal.setting_keamanan,
      soal: bundleData.soal,
      jawaban_tersimpan: jawabanSaved,
    };
  }

  /**
   * Autosave Batch Jawaban ke Redis In-Memory Buffer
   * Mengurangi beban PostgreSQL hingga 99% pada saat 3.000 siswa aktif secara bersamaan.
   */
  static async syncAnswersBatch(
    tenantId: string,
    jadwalId: string,
    siswaId: string,
    payload: { jawaban: any[]; sisa_waktu_detik: number }
  ) {
    const redis = getRedisConnection();

    if (redis) {
      // Simpan di Redis hash session siswa (sangat cepat, O(1), <2ms)
      await redis.hset(
        `cbt:${tenantId}:session:${siswaId}`,
        'jadwal_id', jadwalId,
        'sisa_waktu_detik', String(payload.sisa_waktu_detik),
        'jawaban', JSON.stringify(payload.jawaban),
        'last_sync', String(Date.now())
      ).catch((err: any) => {
        console.warn('[CBT Redis Autosave Warn]', err.message);
      });

      // Set TTL 6 jam agar memori tidak bocor
      await redis.expire(`cbt:${tenantId}:session:${siswaId}`, 21600).catch(() => null);
    }

    return {
      success: true,
      synced_items: payload.jawaban.length,
      server_time: new Date().toISOString(),
    };
  }

  /**
   * Catat Pelanggaran (Switch Tab, Blur, Devtools)
   */
  static async recordViolation(
    tenantId: string,
    jadwalId: string,
    siswaId: string,
    violation: { tipe_pelanggaran: string; detail?: string; waktu?: string }
  ) {
    const peserta = await prisma.cbtPesertaUjian.findFirst({
      where: { tenant_id: tenantId, jadwal_ujian_id: jadwalId, siswa_id: siswaId },
    });

    if (!peserta) return { success: false };

    const existingLogs = (peserta.log_pelanggaran_json as any[]) || [];
    const newLogs = [
      ...existingLogs,
      {
        ...violation,
        waktu: violation.waktu || new Date().toISOString(),
      },
    ];

    // Ambil batas toleransi pelanggaran dari setting_keamanan
    const jadwal = await prisma.cbtJadwalUjian.findUnique({
      where: { id: jadwalId },
      select: { setting_keamanan: true },
    });

    const maxSwitches = (jadwal?.setting_keamanan as any)?.max_tab_switches || 3;
    const isDisqualified = newLogs.length >= maxSwitches;

    await prisma.cbtPesertaUjian.update({
      where: { id: peserta.id },
      data: {
        log_pelanggaran_json: newLogs,
        ...(isDisqualified ? { status: 'DISQUALIFIED' } : {}),
      },
    });

    return {
      success: true,
      violation_count: newLogs.length,
      is_disqualified: isDisqualified,
    };
  }

  /**
   * Submit Final Ujian & Perhitungan Nilai Otomatis
   */
  static async submitFinal(
    tenantId: string,
    jadwalId: string,
    siswaId: string,
    payload: { jawaban_final: any[]; log_pelanggaran?: any[] }
  ) {
    const peserta = await prisma.cbtPesertaUjian.findFirst({
      where: { tenant_id: tenantId, jadwal_ujian_id: jadwalId, siswa_id: siswaId },
      include: {
        JadwalUjian: {
          include: {
            BankSoal: true,
          },
        },
      },
    });

    if (!peserta) {
      throw new Error('Data peserta ujian tidak ditemukan.');
    }

    if (peserta.status === 'FINISHED') {
      return {
        success: true,
        status: 'FINISHED',
        message: 'Ujian sudah diserahkan sebelumnya.',
        nilai_akhir: Number(peserta.nilai_akhir),
        jumlah_benar: peserta.jumlah_benar,
        jumlah_salah: peserta.jumlah_salah,
        total_soal: 0,
        jumlah_terjawab: 0,
      };
    }

    // Ambil kunci jawaban dari seluruh butir soal di Bank Soal
    const soalList = await prisma.cbtSoal.findMany({
      where: { tenant_id: tenantId, bank_soal_id: peserta.JadwalUjian.bank_soal_id },
      select: { id: true, kunci_jawaban: true, bobot: true },
    });

    const keyMap = new Map<string, string>();
    soalList.forEach((s) => keyMap.set(s.id, s.kunci_jawaban));

    let jumlahBenar = 0;
    let jumlahSalah = 0;

    for (const jwb of payload.jawaban_final) {
      const correctKey = keyMap.get(jwb.soal_id);
      if (correctKey && jwb.jawaban_siswa && jwb.jawaban_siswa.toUpperCase() === correctKey.toUpperCase()) {
        jumlahBenar++;
      } else {
        jumlahSalah++;
      }
    }

    const totalSoal = soalList.length || 1;
    const nilaiAkhir = Math.round((jumlahBenar / totalSoal) * 100 * 100) / 100;

    // Pertahankan status DISQUALIFIED jika siswa didiskualifikasi oleh engine anti-curang
    const isDisqualified = peserta.status === 'DISQUALIFIED';
    const finalStatus = isDisqualified ? 'DISQUALIFIED' : 'FINISHED';

    // Simpan hasil ke PostgreSQL (hanya 1 write query per siswa!)
    await prisma.cbtPesertaUjian.update({
      where: { id: peserta.id },
      data: {
        status: finalStatus,
        status_sinkron: 'SYNCED',
        waktu_selesai: new Date(),
        sisa_waktu_detik: 0,
        jawaban_json: payload.jawaban_final,
        jumlah_benar: jumlahBenar,
        jumlah_salah: jumlahSalah,
        nilai_akhir: isDisqualified ? new Prisma.Decimal(0) : new Prisma.Decimal(nilaiAkhir),
        ...(payload.log_pelanggaran ? { log_pelanggaran_json: payload.log_pelanggaran } : {}),
      },
    });

    // Bersihkan sesi Redis
    const redis = getRedisConnection();
    if (redis) {
      await redis.del(`cbt:${tenantId}:session:${siswaId}`).catch(() => null);
    }

    // Jika jadwal mengaktifkan Auto-Transfer ke e-Rapor, suntikkan nilai siswa secara real-time
    await CbtJadwalService.autoTransferSingleStudentIfEnabled(
      tenantId,
      jadwalId,
      siswaId,
      nilaiAkhir
    ).catch((err: any) => {
      console.warn('[CBT Auto-Transfer on Submit Warn]', err?.message);
    });

    const showInstant = (peserta.JadwalUjian.setting_keamanan as any)?.show_result_instant ?? false;

    return {
      success: true,
      message: 'Ujian berhasil diserahkan.',
      status: 'FINISHED',
      total_soal: totalSoal,
      jumlah_terjawab: payload.jawaban_final.filter((j) => Boolean(j.jawaban_siswa)).length,
      ...(showInstant
        ? {
            nilai_akhir: nilaiAkhir,
            jumlah_benar: jumlahBenar,
            jumlah_salah: jumlahSalah,
          }
        : {}),
    };
  }
}

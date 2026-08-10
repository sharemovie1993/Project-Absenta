import { userService } from '@/modules/user/services/user.service';
import { parentAuthService } from '@/modules/parent-app/services/parent-auth.service';
import { normalizePhone } from '@/utils/normalization';
import { siswaDb } from '../repositories/siswa.db';
import type { CreateSiswaInput, SiswaResponse } from '../siswa.types';
import { updateSiswaCommand } from './update-siswa.command';
import { createSiswaSchema } from '../siswa.schema';

export async function createSiswaCommand(
  input: CreateSiswaInput,
  scope: { tenantId: string; org: any }
): Promise<SiswaResponse> {
  const { tenantId, org } = scope;
  if (!tenantId) {
    throw new Error('Tenant ID is required for creating siswa');
  }

  // Validate input with Zod
  const validatedInput = createSiswaSchema.parse(input);

  /* Core Platform: Students are now unlimited and free */
  /* if (!validatedInput.skipQuotaCheck) {
    const { subscriptionService } = await import('../../../../billing/services/subscription.service');
    await subscriptionService.checkTenantLimit(tenantId, 'students');
  } */

  const isCalon = validatedInput.status === 'CALON';

  if (!isCalon) {
    if (!validatedInput.kelas_id) {
      throw new Error('Kelas wajib diisi');
    }
    const kelas = await siswaDb.kelas.findFirst({
      where: {
        id: validatedInput.kelas_id,
        tenant_id: tenantId,
      },
    });

    if (!kelas) {
      throw new Error('Kelas not found or not in the same tenant');
    }

    // Apply Isolate/Scope filter from Organization Engine
    if (org && org.tenant_wide !== true) {
      const allowed = Array.isArray(org.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
      if (!allowed.includes(String(validatedInput.kelas_id))) {
        throw new Error('Anda tidak memiliki akses untuk mendaftarkan siswa ke kelas ini');
      }
    }
  }

  // Validate Jurusan if provided
  if (validatedInput.jurusan_id) {
    const jurusan = await siswaDb.jurusan.findFirst({
      where: {
        id: validatedInput.jurusan_id,
        tenant_id: tenantId,
      },
    });

    if (!jurusan) {
      throw new Error('Jurusan not found or not in the same tenant');
    }
  }

  if (validatedInput.tahun_pelajaran_id) {
    const tahunPelajaran = await siswaDb.tahunPelajaran.findFirst({
      where: {
        id: validatedInput.tahun_pelajaran_id,
        tenant_id: tenantId,
      },
    });

    if (!tahunPelajaran) {
      throw new Error('Tahun pelajaran not found or not in the same tenant');
    }
  }

  if (validatedInput.semester_id) {
    const semester = await siswaDb.semester.findFirst({
      where: {
        id: validatedInput.semester_id,
        tenant_id: tenantId,
      },
    });

    if (!semester) {
      throw new Error('Semester not found or not in the same tenant');
    }
  }

  let nisToUse = String(validatedInput.nis ?? '').trim();
  let nisnInput = validatedInput.nisn ? String(validatedInput.nisn).trim() : '';
  let nikInput = validatedInput.nik ? String(validatedInput.nik).trim() : '';
  let existingSiswa: any = null;

  // 1. Try matching by NIS if provided
  if (nisToUse) {
    existingSiswa = await siswaDb.siswa.findFirst({
      where: { tenant_id: tenantId, nis: nisToUse },
    });
  }

  // 2. Try matching by NISN if provided (and not a temp 9999 string)
  if (!existingSiswa && nisnInput && !nisnInput.startsWith('9999')) {
    existingSiswa = await siswaDb.siswa.findFirst({
      where: { tenant_id: tenantId, nisn: nisnInput },
    });
  }

  // 3. Try matching by NIK if provided
  if (!existingSiswa && nikInput) {
    existingSiswa = await siswaDb.siswa.findFirst({
      where: { tenant_id: tenantId, nik: nikInput },
    });
  }

  // 4. Try matching by Nama + Kelas (case insensitive)
  if (!existingSiswa && validatedInput.nama_siswa) {
    existingSiswa = await siswaDb.siswa.findFirst({
      where: {
        tenant_id: tenantId,
        kelas_id: validatedInput.kelas_id || null,
        nama_siswa: { equals: String(validatedInput.nama_siswa).trim(), mode: 'insensitive' },
      } as any,
    });
  }

  // IF AN EXISTING SISWA RECORD IS FOUND, UPDATE IT (IDEMPOTENT UPSERT)
  if (existingSiswa) {
    return updateSiswaCommand(existingSiswa.id, {
      ...(validatedInput as any),
      nis: nisToUse || existingSiswa.nis,
    }, scope);
  }

  // IF NEW STUDENT: Generate temporary NIS if empty
  if (!nisToUse) {
    const generateTempNis = () => {
      let s = '1111';
      for (let i = 0; i < 6; i++) s += Math.floor(Math.random() * 10).toString();
      return s;
    };

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateTempNis();
      const exists = await siswaDb.siswa.findFirst({
        where: { tenant_id: tenantId, nis: candidate },
      });
      if (!exists) {
        nisToUse = candidate;
        break;
      }
    }
    if (!nisToUse) {
      nisToUse = '1111' + Date.now().toString().slice(-6);
    }
  }

  // Generate temporary NISN starting with 9999 if empty/null/invalid
  let nisn = validatedInput.nisn ? String(validatedInput.nisn).trim() : '';
  if (!nisn || nisn === '-' || nisn === 'KOSONG') {
    const generateTempNisn = () => {
      let s = '9999';
      for (let i = 0; i < 6; i++) s += Math.floor(Math.random() * 10).toString();
      return s;
    };

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateTempNisn();
      const exists = await siswaDb.siswa.findFirst({
        where: { tenant_id: tenantId, nisn: candidate },
      });
      if (!exists) {
        nisn = candidate;
        break;
      }
    }
    if (!nisn) {
      nisn = '9999' + Date.now().toString().slice(-6);
    }
  }

  let associatedUserId: string | undefined = validatedInput.user_id || undefined;

  if (associatedUserId) {
    const user = await siswaDb.user.findFirst({
      where: {
        id: associatedUserId,
        tenant_id: tenantId,
      },
    });

    if (!user) {
      throw new Error('User not found or not in the same tenant');
    }

    const existingSiswa = await siswaDb.siswa.findFirst({
      where: {
        user_id: associatedUserId,
        tenant_id: tenantId,
      },
    });

    if (existingSiswa) {
      throw new Error('User already has a siswa profile');
    }
  } else {
    const fullName = validatedInput.nama_siswa;
    const cleanNisn = nisn ? String(nisn).trim().replace(/[^a-z0-9]+/gi, '') : '';
    const cleanNis = nisToUse ? String(nisToUse).trim().replace(/[^a-z0-9]+/gi, '') : '';
    const cleanName = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');

    // Default email is constructed from NISN@absenta.id (fallback to NIS or sanitized name if missing)
    const baseLocalPart = (cleanNisn || cleanNis || cleanName || 'siswa').slice(0, 32);
    const generatedEmail = `${baseLocalPart}@absenta.id`;

    let emailToUse = validatedInput.email && validatedInput.email.trim().length > 0 ? validatedInput.email.trim() : generatedEmail;

    const existingUserByEmail = await siswaDb.user.findFirst({
      where: { email: emailToUse, tenant_id: tenantId },
    });

    if (existingUserByEmail) {
      const suffix = Math.floor(Math.random() * 10000).toString();
      const parts = emailToUse.split('@');
      emailToUse = `${parts[0]}.${suffix}@${parts[1] || 'absenta.id'}`;
    }

    const genStrongPassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
      let s = '';
      for (let i = 0; i < 14; i++) s += chars[Math.floor(Math.random() * chars.length)];
      return s;
    };
    const defaultPassword =
      process.env.DEFAULT_SISWA_PASSWORD && process.env.DEFAULT_SISWA_PASSWORD.trim().length >= 8
        ? process.env.DEFAULT_SISWA_PASSWORD
        : genStrongPassword();

    const createdUser = await userService.createUser({
      email: emailToUse,
      password: defaultPassword,
      full_name: fullName,
      role: 'SISWA',
      tenant_id: tenantId,
    });

    associatedUserId = createdUser.id;
  }

  // --- SANITIZATION & AUTO-FIX ---
  const nik = validatedInput.nik ? String(validatedInput.nik).trim() : null;
  const rfid = validatedInput.no_rfid ? String(validatedInput.no_rfid).trim() : null;

  // Phone Number Auto-Fix: Normalize human format to E.164
  let phone = validatedInput.no_hp ? normalizePhone(validatedInput.no_hp) : null;

  const genderToUse = validatedInput.jenis_kelamin && String(validatedInput.jenis_kelamin).trim() ? validatedInput.jenis_kelamin : '';

  let tanggalMasukToUse: Date = new Date();
  const rawMasuk = validatedInput.tanggal_masuk ?? input.tanggal_masuk;
  if (rawMasuk) {
    const d = new Date(rawMasuk);
    if (!isNaN(d.getTime())) {
      tanggalMasukToUse = d;
    }
  }

  let tanggalKeluarToUse: Date | null = null;
  const rawKeluar = validatedInput.tanggal_keluar ?? input.tanggal_keluar;
  if (rawKeluar) {
    const d = new Date(rawKeluar);
    if (!isNaN(d.getTime())) {
      tanggalKeluarToUse = d;
    }
  }

  const siswa = await siswaDb.siswa.create({
    data: {
      tenant_id: tenantId,
      user_id: associatedUserId || null,
      nis: nisToUse,
      nisn: nisn,
      nik: nik,
      nama_siswa: input.nama_siswa,
      jenis_kelamin: genderToUse,
      tempat_lahir: input.tempat_lahir || null,
      tanggal_lahir: input.tanggal_lahir || null,
      alamat: input.alamat || null,
      dusun: input.dusun || null,
      kelurahan: input.kelurahan || null,
      kecamatan: input.kecamatan || null,
      kabupaten: input.kabupaten || null,
      provinsi: input.provinsi || null,
      rt: input.rt || null,
      rw: input.rw || null,
      kode_pos: input.kode_pos || null,
      no_hp: phone,
      transportasi: input.transportasi || null,
      nama_ayah: input.nama_ayah || null,
      nik_ayah: input.nik_ayah || null,
      pekerjaan_ayah: input.pekerjaan_ayah || null,
      pendidikan_ayah: input.pendidikan_ayah || null,
      penghasilan_ayah: input.penghasilan_ayah || null,
      nama_ibu: input.nama_ibu || null,
      nik_ibu: input.nik_ibu || null,
      pekerjaan_ibu: input.pekerjaan_ibu || null,
      pendidikan_ibu: input.pendidikan_ibu || null,
      penghasilan_ibu: input.penghasilan_ibu || null,
      nama_wali: input.nama_wali || null,
      hubungan_wali: input.hubungan_wali || null,
      pekerjaan_wali: input.pekerjaan_wali || null,
      penghasilan_wali: input.penghasilan_wali || null,
      anak_ke: input.anak_ke || null,
      penerima_kps: input.penerima_kps || null,
      penerima_kip: input.penerima_kip || null,
      no_kip: input.no_kip || null,
      kelas_id: input.kelas_id || null,
      jurusan_id: input.jurusan_id || null,
      tahun_pelajaran_id: input.tahun_pelajaran_id || null,
      semester_id: input.semester_id || null,
      tanggal_masuk: tanggalMasukToUse,
      tanggal_keluar: tanggalKeluarToUse,
      alasan_keluar: input.alasan_keluar || null,
      status: input.status || 'AKTIF',
      no_rfid: rfid,
      foto: input.foto || null,
      sekolah_asal: input.sekolah_asal || null,
      no_ijazah_smp: input.no_ijazah_smp || null,
    } as any,
  });

  // Auto-sync to SiswaAkademik upon creation (Solusi Redundansi Sempurna!)
  if (siswa.kelas_id && siswa.tahun_pelajaran_id && siswa.semester_id) {
    try {
      await siswaDb.siswaAkademik.upsert({
        where: {
          siswa_id_tahun_pelajaran_id_semester_id: {
            siswa_id: (siswa as any).id,
            tahun_pelajaran_id: siswa.tahun_pelajaran_id,
            semester_id: siswa.semester_id,
          },
        },
        update: {
          kelas_id: siswa.kelas_id,
          status: (siswa.status || 'AKTIF') as any,
        },
        create: {
          siswa_id: (siswa as any).id,
          kelas_id: siswa.kelas_id,
          tahun_pelajaran_id: siswa.tahun_pelajaran_id,
          semester_id: siswa.semester_id,
          status: (siswa.status || 'AKTIF') as any,
        },
      });
      console.log(`[AUTO-SYNC] Successfully synced SiswaAkademik for new student: ${siswa.nama_siswa}`);
    } catch (e: any) {
      console.error('[AUTO-SYNC] Failed to sync SiswaAkademik upon creation:', e.message || e);
    }
  }

  if (input.orang_tua && Array.isArray(input.orang_tua)) {
    for (const ot of input.orang_tua as any[]) {
      const { id, ...otData } = ot;
      let parentId = id;
      if (otData.no_hp) {
        otData.no_hp = normalizePhone(otData.no_hp);
      }

      if (!parentId && otData.no_hp) {
        const existingParent = await siswaDb.orangTua.findFirst({
          where: {
            tenant_id: tenantId,
            no_hp: otData.no_hp,
          },
        });
        if (existingParent) {
          parentId = (existingParent as any).id;
        }
      }

      if (!parentId) {
        const newParent = await siswaDb.orangTua.create({
          data: {
            ...otData,
            tenant_id: tenantId,
          },
        });
        parentId = (newParent as any).id;
      }

      await siswaDb.orangTuaSiswa.create({
        data: {
          orang_tua_id: parentId,
          siswa_id: (siswa as any).id,
        },
      });

      await parentAuthService.ensureToken(parentId);
    }
  }

  const createdSiswaWithRelations: any = await siswaDb.siswa.findFirst({
    where: { id: (siswa as any).id },
    include: {
      User: {
        select: {
          id: true,
          email: true,
          full_name: true,
        },
      },
      Kelas: {
        select: {
          id: true,
          nama_kelas: true,
          tingkat: true,
        },
      },
      TahunPelajaran: {
        select: {
          id: true,
          tahun: true,
        },
      },
      Semester: {
        select: {
          id: true,
          nama_semester: true,
        },
      },
      OrangTuaSiswa: {
        select: {
          OrangTua: {
            select: {
              id: true,
              nama: true,
              hubungan: true,
              no_hp: true,
              email: true,
            },
          },
        },
      },
    },
  });

  const formattedSiswa = {
    ...createdSiswaWithRelations,
    OrangTua: createdSiswaWithRelations?.OrangTuaSiswa.map((ots: any) => ots.OrangTua),
    OrangTuaSiswa: undefined,
    _op: 'CREATED'
  };

  return formattedSiswa as any;
}

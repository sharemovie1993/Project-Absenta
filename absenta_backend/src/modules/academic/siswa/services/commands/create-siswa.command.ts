import { userService } from '@/modules/user/services/user.service';
import { parentAuthService } from '@/modules/parent-app/services/parent-auth.service';
import { siswaDb } from '../repositories/siswa.db';
import type { CreateSiswaInput, SiswaResponse } from '../siswa.types';
import { updateSiswaCommand } from './update-siswa.command';

export async function createSiswaCommand(
  input: CreateSiswaInput,
  scope: { tenantId: string; org: any }
): Promise<SiswaResponse> {
  const { tenantId, org } = scope;
  if (!tenantId) {
    throw new Error('Tenant ID is required for creating siswa');
  }

  /* Core Platform: Students are now unlimited and free */
  /* if (!input.skipQuotaCheck) {
    const { subscriptionService } = await import('../../../../billing/services/subscription.service');
    await subscriptionService.checkTenantLimit(tenantId, 'students');
  } */

  const kelas = await siswaDb.kelas.findFirst({
    where: {
      id: input.kelas_id,
      tenant_id: tenantId,
    },
  });

  if (!kelas) {
    throw new Error('Kelas not found or not in the same tenant');
  }

  // Apply Isolate/Scope filter from Organization Engine
  if (org && org.tenant_wide !== true) {
    const allowed = Array.isArray(org.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
    if (!allowed.includes(String(input.kelas_id))) {
      throw new Error('Anda tidak memiliki akses untuk mendaftarkan siswa ke kelas ini');
    }
  }

  if (input.tahun_pelajaran_id) {
    const tahunPelajaran = await siswaDb.tahunPelajaran.findFirst({
      where: {
        id: input.tahun_pelajaran_id,
        tenant_id: tenantId,
      },
    });

    if (!tahunPelajaran) {
      throw new Error('Tahun pelajaran not found or not in the same tenant');
    }
  }

  if (input.semester_id) {
    const semester = await siswaDb.semester.findFirst({
      where: {
        id: input.semester_id,
        tenant_id: tenantId,
      },
    });

    if (!semester) {
      throw new Error('Semester not found or not in the same tenant');
    }
  }

  let nisToUse = String(input.nis ?? '').trim();
  let existingSiswaByNis: any = null;

  if (nisToUse) {
    existingSiswaByNis = await siswaDb.siswa.findFirst({
      where: { tenant_id: tenantId, nis: nisToUse },
    });

    if (existingSiswaByNis) {
      if (String(existingSiswaByNis.nama_siswa || '').toLowerCase().trim() === String(input.nama_siswa || '').toLowerCase().trim()) {
        return updateSiswaCommand(existingSiswaByNis.id, { ...(input as any), nis: nisToUse }, scope);
      } else {
        const suffix = Math.floor(Math.random() * 10000).toString();
        nisToUse = `${nisToUse}-${suffix}`;
      }
    }
  } else {
    const existingSiswaByName = await siswaDb.siswa.findFirst({
      where: {
        tenant_id: tenantId,
        kelas_id: input.kelas_id,
        nama_siswa: { equals: input.nama_siswa, mode: 'insensitive' },
      } as any,
    });

    if (existingSiswaByName) {
      return updateSiswaCommand((existingSiswaByName as any).id, input as any, scope);
    }

    const generateRandomNis = () => {
      let s = '';
      for (let i = 0; i < 10; i++) s += Math.floor(Math.random() * 10).toString();
      return s;
    };

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateRandomNis();
      const exists = await siswaDb.siswa.findFirst({
        where: { tenant_id: tenantId, nis: candidate },
      });
      if (!exists) {
        nisToUse = candidate;
        break;
      }
    }
    if (!nisToUse) {
      nisToUse = Date.now().toString().slice(-10).padStart(10, '0');
    }
  }

  let associatedUserId: string | undefined = input.user_id;

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
    const fullName = input.nama_siswa;
    const baseLocalPart = (input.nis
      ? String(input.nis)
      : fullName.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')).slice(0, 32);
    const uniqueSuffix = Math.random().toString(36).slice(2, 6);
    const generatedEmail = `${baseLocalPart}.${uniqueSuffix}@siswa.local`;

    let emailToUse = input.email && input.email.trim().length > 0 ? input.email.trim() : generatedEmail;

    const existingUserByEmail = await siswaDb.user.findFirst({
      where: { email: emailToUse, tenant_id: tenantId },
    });

    if (existingUserByEmail) {
      const suffix = Math.floor(Math.random() * 10000).toString();
      const parts = emailToUse.split('@');
      emailToUse = `${parts[0]}.${suffix}@${parts[1] || 'siswa.local'}`;
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
  // Ensure string fields are strings (Excel often sends numbers)
  const nisn = input.nisn ? String(input.nisn).trim() : null;
  const nik = input.nik ? String(input.nik).trim() : null;
  const rfid = input.no_rfid ? String(input.no_rfid).trim() : null;

  // Phone Number Auto-Fix: Ensure it's a string and starts with '0'
  let phone = input.no_hp ? String(input.no_hp).trim() : null;
  if (phone && /^\d+$/.test(phone) && !phone.startsWith('0')) {
    phone = '0' + phone;
  }

  const genderToUse = input.jenis_kelamin && String(input.jenis_kelamin).trim() ? input.jenis_kelamin : '';

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
      kelas_id: input.kelas_id,
      tahun_pelajaran_id: input.tahun_pelajaran_id || null,
      semester_id: input.semester_id || null,
      tanggal_masuk: input.tanggal_masuk || new Date(),
      status: input.status || 'AKTIF',
      no_rfid: rfid,
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

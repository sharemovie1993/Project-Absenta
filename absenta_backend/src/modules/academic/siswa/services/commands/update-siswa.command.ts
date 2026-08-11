import bcrypt from 'bcryptjs';
import { parentAuthService } from '@/modules/parent-app/services/parent-auth.service';
import { activityLogService } from '@/modules/activity/services/activity-log.service';
import { normalizePhone } from '@/utils/normalization';
import { siswaDb } from '../repositories/siswa.db';
import type { SiswaResponse, UpdateSiswaInput } from '../siswa.types';
import { updateSiswaSchema } from '../siswa.schema';
import { organizationalContextCache } from '@/modules/auth/services/organizational-context-cache';

export async function updateSiswaCommand(
  siswaId: string,
  input: UpdateSiswaInput,
  scope: { tenantId: string; org: any; userId?: string }
): Promise<SiswaResponse> {
  const { tenantId, org, userId } = scope;
  
  // Validate input with Zod
  const validatedInput = updateSiswaSchema.parse(input);

  const whereClause: any = { id: siswaId, tenant_id: tenantId };

  // Apply Isolate/Scope filter from Organization Engine
  if (org && org.tenant_wide !== true) {
    const allowed = Array.isArray(org.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
    if (allowed.length > 0) {
      whereClause.kelas_id = { in: allowed };
    } else {
      throw new Error('Siswa not found');
    }
  }

  const existingSiswa: any = await siswaDb.siswa.findFirst({
    where: whereClause,
  });

  if (!existingSiswa) {
    throw new Error('Siswa not found');
  }

  const { orang_tua, email, ...restOfInput } = validatedInput;
  
  // Whitelist of valid Siswa schema fields to prevent Prisma crashes from extra Excel columns
  const validFields = [
    'user_id', 'nis', 'nisn', 'nik', 'nama_siswa', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir',
    'alamat', 'dusun', 'kelurahan', 'kecamatan', 'kabupaten', 'provinsi', 'rt', 'rw', 'kode_pos',
    'no_hp', 'transportasi', 'nama_ayah', 'nik_ayah', 'no_hp_ayah', 'pekerjaan_ayah', 'pendidikan_ayah', 'penghasilan_ayah',
    'nama_ibu', 'nik_ibu', 'no_hp_ibu', 'pekerjaan_ibu', 'pendidikan_ibu', 'penghasilan_ibu',
    'nama_wali', 'nik_wali', 'no_hp_wali', 'hubungan_wali', 'pekerjaan_wali', 'penghasilan_wali', 'no_hp_ortu',
    'anak_ke', 'tinggi_badan', 'berat_badan', 'agama', 'hobi', 'cita_cita', 'is_osis', 'is_mpk', 'ekskul_1', 'ekskul_2',
    'kebutuhan_khusus', 'penerima_kps', 'penerima_kip', 'no_kip', 'kelas_id', 'jurusan_id',
    'tahun_pelajaran_id', 'semester_id', 'tanggal_masuk', 'tanggal_keluar', 'alasan_keluar', 'status', 'no_rfid', 'foto',
    'sekolah_asal', 'no_ijazah_smp'
  ];

  const dataToUpdate: any = {};
  
  Object.keys(restOfInput).forEach(key => {
    if (validFields.includes(key)) {
      dataToUpdate[key] = (restOfInput as any)[key];
    }
  });

  if (dataToUpdate.no_hp) {
    dataToUpdate.no_hp = normalizePhone(dataToUpdate.no_hp);
  }

  if (validatedInput.user_id && validatedInput.user_id !== existingSiswa.user_id) {
    const user = await siswaDb.user.findFirst({
      where: {
        id: validatedInput.user_id,
        tenant_id: existingSiswa.tenant_id,
      },
    });

    if (!user) {
      throw new Error('New user not found or not in the same tenant');
    }

    const otherSiswa = await siswaDb.siswa.findFirst({
      where: {
        user_id: validatedInput.user_id,
        tenant_id: existingSiswa.tenant_id,
        id: { not: siswaId },
      },
    });

    if (otherSiswa) {
      throw new Error('New user is already linked to another siswa profile');
    }

    dataToUpdate.user_id = validatedInput.user_id;
  }

  // Handle email synchronization with User record
  if (email && email.trim() !== '') {
    const targetEmail = email.trim().toLowerCase();
    
    if (existingSiswa.user_id) {
      const linkedUser = await siswaDb.user.findUnique({
        where: { id: existingSiswa.user_id },
      });
      if (linkedUser && targetEmail !== linkedUser.email.toLowerCase()) {
        const existingUserWithEmail = await siswaDb.user.findFirst({
          where: {
            email: targetEmail,
            id: { not: existingSiswa.user_id }
          }
        });
        if (existingUserWithEmail) {
          throw new Error('Email sudah digunakan oleh pengguna lain');
        }
        await siswaDb.user.update({
          where: { id: existingSiswa.user_id },
          data: { email: targetEmail }
        });
        console.log(`[SYNC-USER] Successfully updated linked User email to: ${targetEmail}`);
      }
    } else {
      // Create user account if it doesn't exist
      const existingUserWithEmail = await siswaDb.user.findFirst({
        where: { email: targetEmail }
      });
      if (existingUserWithEmail) {
        throw new Error('Email sudah digunakan oleh pengguna lain');
      }
      
      const siswaRole = await siswaDb.role.findFirst({
        where: { name: 'SISWA' }
      });
      if (!siswaRole) {
        throw new Error('Role SISWA tidak ditemukan');
      }
      
      const defaultPass = validatedInput.nisn || validatedInput.nis || existingSiswa.nisn || existingSiswa.nis || '123456';
      const hashedPassword = await bcrypt.hash(defaultPass, 12);
      
      const newUser = await siswaDb.user.create({
        data: {
          email: targetEmail,
          password: hashedPassword,
          full_name: validatedInput.nama_siswa || existingSiswa.nama_siswa,
          role_id: siswaRole.id,
          tenant_id: existingSiswa.tenant_id,
          email_verified: false,
        }
      });
      
      dataToUpdate.user_id = newUser.id;
      console.log(`[SYNC-USER] Created new linked User account for student with email: ${targetEmail}`);
    }
  } else if (!email && validatedInput.nisn) {
    // Auto-sync User.email when NISN is updated via Quick Update, Inline Edit, or Form Edit
    const cleanNewNisn = String(validatedInput.nisn).trim();
    const cleanOldNisn = String(existingSiswa.nisn || '').trim();
    
    if (cleanNewNisn && cleanNewNisn !== cleanOldNisn && !cleanNewNisn.startsWith('9999') && cleanNewNisn !== '-' && cleanNewNisn !== 'KOSONG') {
      const targetEmail = `${cleanNewNisn}@absenta.id`;

      if (existingSiswa.user_id) {
        // ✅ Siswa SUDAH punya user — cukup update email jika berubah, JANGAN buat user baru
        const linkedUser = await siswaDb.user.findUnique({
          where: { id: existingSiswa.user_id },
        });

        if (linkedUser && linkedUser.email.toLowerCase() !== targetEmail.toLowerCase()) {
          const emailConflict = await siswaDb.user.findFirst({
            where: { email: targetEmail, id: { not: existingSiswa.user_id } }
          });
          if (!emailConflict) {
            await siswaDb.user.update({
              where: { id: existingSiswa.user_id },
              data: { email: targetEmail }
            });
            console.log(`[SYNC-USER] QuickUpdate: Auto-updated User email from ${linkedUser.email} to: ${targetEmail}`);
          } else {
            console.warn(`[SYNC-USER] QuickUpdate: Skipping email update — ${targetEmail} already used by another user.`);
          }
        }
      } else {
        // ⚠️ Siswa BELUM punya user — cek dulu apakah user dengan email ini sudah ada
        // (idempotent: jika sudah ada, link saja, jangan buat baru)
        const existingUserWithEmail = await siswaDb.user.findFirst({
          where: { email: targetEmail, tenant_id: existingSiswa.tenant_id }
        });

        if (existingUserWithEmail) {
          // User sudah ada (mungkin dari import sebelumnya) → link saja
          const alreadyLinked = await siswaDb.siswa.findFirst({
            where: { user_id: existingUserWithEmail.id, tenant_id: existingSiswa.tenant_id, id: { not: siswaId } }
          });
          if (!alreadyLinked) {
            dataToUpdate.user_id = existingUserWithEmail.id;
            console.log(`[SYNC-USER] QuickUpdate: Linked existing user (${targetEmail}) to siswa — no new user created.`);
          } else {
            console.warn(`[SYNC-USER] QuickUpdate: User ${targetEmail} already linked to another siswa — skipping.`);
          }
        } else {
          // User belum ada sama sekali → buat baru
          const siswaRole = await siswaDb.role.findFirst({
            where: { name: 'SISWA' }
          });
          if (siswaRole) {
            const defaultPass = cleanNewNisn;
            const hashedPassword = await bcrypt.hash(defaultPass, 12);
            const newUser = await siswaDb.user.create({
              data: {
                email: targetEmail,
                password: hashedPassword,
                full_name: validatedInput.nama_siswa || existingSiswa.nama_siswa,
                role_id: siswaRole.id,
                tenant_id: existingSiswa.tenant_id,
                email_verified: false,
              }
            });
            dataToUpdate.user_id = newUser.id;
            console.log(`[SYNC-USER] QuickUpdate: Created new linked User for student (${targetEmail}).`);
          }
        }
      }
    }
  } // If reverting to CALON, explicitly clear class and active year/semester assignments
  
  if (dataToUpdate.status === 'CALON') {
    dataToUpdate.kelas_id = null;
    dataToUpdate.tahun_pelajaran_id = null;
    dataToUpdate.semester_id = null;
  }

  // Sanitize data: don't overwrite with null/empty for important fields
  const protectedFields = ['nama_siswa', 'jenis_kelamin', 'kelas_id', 'nis', 'nisn', 'nik', 'no_rfid'];
  protectedFields.forEach(field => {
    // Allow null for kelas_id if status is CALON
    if (field === 'kelas_id' && dataToUpdate.status === 'CALON' && dataToUpdate[field] === null) {
      return;
    }
    if (dataToUpdate[field] === null || dataToUpdate[field] === undefined || String(dataToUpdate[field]).trim() === '') {
       delete dataToUpdate[field];
    }
  });

  // Check if any field actually changed before calling DB update
  let hasChanges = false;
  const skipFields = ['id', 'created_at', 'updated_at', 'tenant_id', 'user_id'];
  
  for (const key of Object.keys(dataToUpdate)) {
    if (skipFields.includes(key)) continue;
    
    let newValue = dataToUpdate[key];
    let oldValue = existingSiswa[key];
    
    // Normalize values for comparison
    let normalizedNew = (newValue === null || newValue === undefined) ? '' : String(newValue).trim();
    let normalizedOld = (oldValue === null || oldValue === undefined) ? '' : String(oldValue).trim();
    
    if (['nis', 'nisn', 'nik', 'no_rfid'].includes(key)) {
      if (normalizedNew !== normalizedOld) {
        hasChanges = true;
      }
    } else if (['nama_siswa', 'nama_ayah', 'nama_ibu', 'alamat', 'tempat_lahir'].includes(key)) {
      if (normalizedNew.toLowerCase() !== normalizedOld.toLowerCase()) {
        hasChanges = true;
      }
    } else if (normalizedNew !== normalizedOld) {
       hasChanges = true;
    }

    if (!hasChanges && newValue instanceof Date && oldValue instanceof Date) {
      if (Math.abs(newValue.getTime() - oldValue.getTime()) > 1000) {
        hasChanges = true;
      }
    }
    
    if (hasChanges) break;
  }

  if (hasChanges) {
    const stringFields = ['nis', 'nisn', 'nik', 'no_hp', 'no_rfid', 'nama_siswa', 'alamat', 'tempat_lahir'];
    stringFields.forEach(field => {
      if (dataToUpdate[field] !== undefined && dataToUpdate[field] !== null) {
        let val = String(dataToUpdate[field]).trim();
        if (field === 'no_hp' && val.startsWith('8') && val.length >= 9) {
          val = '0' + val;
        }
        dataToUpdate[field] = val;
      }
    });

    await siswaDb.siswa.update({
      where: { id: siswaId },
      data: dataToUpdate,
    });

    if (existingSiswa.user_id) {
      await organizationalContextCache.invalidateUser(String(existingSiswa.user_id));
    }

    // Enforce User account business contract (LULUS keeps ACTIVE for Tracer Study, others frozen)
    if (existingSiswa.user_id && dataToUpdate.status) {
      try {
        const userLoginStatus = ['PINDAH', 'KELUAR', 'DO', 'MENINGGAL', 'NON_AKTIF'].includes(dataToUpdate.status) ? 'INACTIVE' : 'ACTIVE';
        await siswaDb.user.update({
          where: { id: existingSiswa.user_id },
          data: { status: userLoginStatus }
        });
        console.log(`[USER-SYNC] Updated student user account status to: ${userLoginStatus}`);
      } catch (err: any) {
        console.error('[USER-SYNC] Failed to update user login status:', err.message || err);
      }
    }

    const oldKelasId = existingSiswa.kelas_id;
    const newKelasId = dataToUpdate.kelas_id;
    const kelasChanged = newKelasId !== undefined && String(newKelasId) !== String(oldKelasId);

    if (kelasChanged && userId) {
      try {
        const oldKelas = oldKelasId ? await siswaDb.kelas.findUnique({ where: { id: oldKelasId }, select: { nama_kelas: true } }) : null;
        const newKelas = newKelasId ? await siswaDb.kelas.findUnique({ where: { id: newKelasId }, select: { nama_kelas: true } }) : null;

        activityLogService.logEvent({
          event_type: 'ACADEMIC_STUDENT_CLASS_CHANGED',
          tenant_id: tenantId,
          user_id: userId,
          entity: 'Siswa',
          entity_id: siswaId,
          metadata: {
            nama_siswa: existingSiswa.nama_siswa,
            old_kelas_id: oldKelasId,
            old_kelas_name: oldKelas?.nama_kelas || null,
            new_kelas_id: newKelasId,
            new_kelas_name: newKelas?.nama_kelas || null,
          }
        });
      } catch (err) {
        console.error('Failed to log student class change event:', err);
      }
    }
  }

  // Auto-sync to SiswaAkademik upon update
  const currentSiswa: any = await siswaDb.siswa.findUnique({
    where: { id: siswaId },
    select: { kelas_id: true, tahun_pelajaran_id: true, semester_id: true, status: true, nama_siswa: true }
  });

  if (currentSiswa && currentSiswa.status === 'CALON') {
    try {
      await siswaDb.siswaAkademik.deleteMany({
        where: { siswa_id: siswaId }
      });
      console.log(`[AUTO-SYNC] Deleted SiswaAkademik records for reverted student: ${siswaId}`);
    } catch (e: any) {
      console.error('[AUTO-SYNC] Failed to clean SiswaAkademik upon revert:', e.message || e);
    }
  }

  if (currentSiswa && currentSiswa.kelas_id && currentSiswa.tahun_pelajaran_id && currentSiswa.semester_id) {
    try {
      await siswaDb.siswaAkademik.upsert({
        where: {
          siswa_id_tahun_pelajaran_id_semester_id: {
            siswa_id: siswaId,
            tahun_pelajaran_id: currentSiswa.tahun_pelajaran_id,
            semester_id: currentSiswa.semester_id,
          },
        },
        update: {
          kelas_id: currentSiswa.kelas_id,
          status: (currentSiswa.status || 'AKTIF') as any,
        },
        create: {
          siswa_id: siswaId,
          kelas_id: currentSiswa.kelas_id,
          tahun_pelajaran_id: currentSiswa.tahun_pelajaran_id,
          semester_id: currentSiswa.semester_id,
          status: (currentSiswa.status || 'AKTIF') as any,
        },
      });
    } catch (e: any) {
      console.error('[AUTO-SYNC] Failed to sync SiswaAkademik upon update:', e.message || e);
    }
  }

  if (validatedInput.orang_tua && Array.isArray(validatedInput.orang_tua)) {
    const currentLinks = await siswaDb.orangTuaSiswa.findMany({
      where: { siswa_id: siswaId },
      select: { id: true, orang_tua_id: true },
    });

    const processedParentIds: string[] = [];

    for (const ot of validatedInput.orang_tua) {
      let parentId = (ot as any).id;
      const { id, ...otData } = ot as any;
      if (otData.no_hp) {
        otData.no_hp = normalizePhone(otData.no_hp);
      }

      if (parentId) {
        const existing = await siswaDb.orangTua.findUnique({ where: { id: parentId } });
        if (existing) {
          await siswaDb.orangTua.update({
            where: { id: parentId },
            data: { ...otData, tenant_id: existingSiswa.tenant_id },
          });
        }
      } else if (otData.no_hp) {
        const existing = await siswaDb.orangTua.findFirst({
          where: { tenant_id: existingSiswa.tenant_id, no_hp: otData.no_hp },
        });
        if (existing) {
          parentId = (existing as any).id;
          await siswaDb.orangTua.update({
            where: { id: parentId },
            data: { ...otData },
          });
        } else {
          const newParent = await siswaDb.orangTua.create({
            data: { ...otData, tenant_id: existingSiswa.tenant_id },
          });
          parentId = (newParent as any).id;
        }
      } else {
        const newParent = await siswaDb.orangTua.create({
          data: { ...otData, tenant_id: existingSiswa.tenant_id },
        });
        parentId = (newParent as any).id;
      }

      if (parentId) {
        processedParentIds.push(parentId);
        const linkExists = await siswaDb.orangTuaSiswa.findUnique({
          where: {
            orang_tua_id_siswa_id: {
              orang_tua_id: parentId,
              siswa_id: siswaId,
            },
          } as any,
        });
        if (!linkExists) {
          await siswaDb.orangTuaSiswa.create({
            data: {
              orang_tua_id: parentId,
              siswa_id: siswaId,
            },
          });
        }

        await parentAuthService.ensureToken(parentId);
      }
    }

    const linksToRemove = currentLinks.filter((l: any) => !processedParentIds.includes(l.orang_tua_id));
    for (const link of linksToRemove) {
      await siswaDb.orangTuaSiswa.delete({
        where: { id: link.id },
      });
    }
  } else if (Object.prototype.hasOwnProperty.call(validatedInput, 'orang_tua')) {
    await siswaDb.orangTuaSiswa.deleteMany({
      where: { siswa_id: siswaId },
    });
  }

  const updatedSiswaWithRelations: any = await siswaDb.siswa.findFirst({
    where: { id: siswaId },
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
    ...updatedSiswaWithRelations,
    OrangTua: updatedSiswaWithRelations?.OrangTuaSiswa.map((ots: any) => ots.OrangTua),
    OrangTuaSiswa: undefined,
    _op: hasChanges ? 'UPDATED' : 'SKIPPED'
  };

  return formattedSiswa as any;
}

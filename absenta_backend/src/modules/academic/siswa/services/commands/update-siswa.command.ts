import bcrypt from 'bcryptjs';
import { parentAuthService } from '@/modules/parent-app/services/parent-auth.service';
import { activityLogService } from '@/modules/activity/services/activity-log.service';
import { siswaDb } from '../repositories/siswa.db';
import type { SiswaResponse, UpdateSiswaInput } from '../siswa.types';

export async function updateSiswaCommand(
  siswaId: string,
  input: UpdateSiswaInput,
  scope: { tenantId: string; org: any; userId?: string }
): Promise<SiswaResponse> {
  const { tenantId, org, userId } = scope;
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

  const { orang_tua, ...restOfInput } = input;
  
  // Whitelist of valid Siswa schema fields to prevent Prisma crashes from extra Excel columns
  const validFields = [
    'user_id', 'nis', 'nisn', 'nik', 'nama_siswa', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir',
    'alamat', 'dusun', 'kelurahan', 'kecamatan', 'kabupaten', 'provinsi', 'rt', 'rw', 'kode_pos',
    'no_hp', 'transportasi', 'nama_ayah', 'nik_ayah', 'pekerjaan_ayah', 'pendidikan_ayah', 'penghasilan_ayah',
    'nama_ibu', 'nik_ibu', 'pekerjaan_ibu', 'pendidikan_ibu', 'penghasilan_ibu', 'nama_wali', 'hubungan_wali',
    'pekerjaan_wali', 'penghasilan_wali', 'anak_ke', 'kebutuhan_khusus', 'penerima_kps', 'penerima_kip', 'no_kip', 'kelas_id',
    'tahun_pelajaran_id', 'semester_id', 'tanggal_masuk', 'tanggal_keluar', 'alasan_keluar', 'status', 'no_rfid', 'foto'
  ];

  const dataToUpdate: any = {};
  
  Object.keys(restOfInput).forEach(key => {
    if (validFields.includes(key)) {
      dataToUpdate[key] = (restOfInput as any)[key];
    }
  });

  if (input.user_id && input.user_id !== existingSiswa.user_id) {
    const user = await siswaDb.user.findFirst({
      where: {
        id: input.user_id,
        tenant_id: existingSiswa.tenant_id,
      },
    });

    if (!user) {
      throw new Error('New user not found or not in the same tenant');
    }

    const otherSiswa = await siswaDb.siswa.findFirst({
      where: {
        user_id: input.user_id,
        tenant_id: existingSiswa.tenant_id,
        id: { not: siswaId },
      },
    });

    if (otherSiswa) {
      throw new Error('New user is already linked to another siswa profile');
    }

    dataToUpdate.user_id = input.user_id;
  }

  // Handle email synchronization with User record
  if (input.email && input.email.trim() !== '') {
    const targetEmail = input.email.trim().toLowerCase();
    
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
      
      const defaultPass = input.nisn || input.nis || existingSiswa.nisn || existingSiswa.nis || '123456';
      const hashedPassword = await bcrypt.hash(defaultPass, 12);
      
      const newUser = await siswaDb.user.create({
        data: {
          email: targetEmail,
          password: hashedPassword,
          full_name: input.nama_siswa || existingSiswa.nama_siswa,
          role_id: siswaRole.id,
          tenant_id: existingSiswa.tenant_id,
          email_verified: false,
        }
      });
      
      dataToUpdate.user_id = newUser.id;
      console.log(`[SYNC-USER] Created new linked User account for student with email: ${targetEmail}`);
    }
  }

  // Sanitize data: don't overwrite with null/empty for important fields
  // This prevents accidental clearing of identity data if the admin leaves columns empty in Excel
  const protectedFields = ['nama_siswa', 'jenis_kelamin', 'kelas_id', 'nis', 'nisn', 'nik', 'no_rfid'];
  protectedFields.forEach(field => {
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
    
    // Strictly compare IDs and identity fields (Don't ignore leading zeros!)
    if (['nis', 'nisn', 'nik', 'no_rfid'].includes(key)) {
      if (normalizedNew !== normalizedOld) {
        hasChanges = true;
      }
    } else if (['nama_siswa', 'nama_ayah', 'nama_ibu', 'alamat', 'tempat_lahir'].includes(key)) {
      // For names or addresses, be case-insensitive to avoid redundant updates
      if (normalizedNew.toLowerCase() !== normalizedOld.toLowerCase()) {
        hasChanges = true;
      }
    } else if (normalizedNew !== normalizedOld) {
       // Default comparison for other fields
       hasChanges = true;
    }

    // Date comparison
    if (!hasChanges && newValue instanceof Date && oldValue instanceof Date) {
      if (Math.abs(newValue.getTime() - oldValue.getTime()) > 1000) {
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      console.log(`[DIFF] Field "${key}" changed: "${normalizedOld}" -> "${normalizedNew}"`);
      break;
    }
  }



  if (hasChanges) {
    // Final Type Conversion to satisfy Prisma (especially for numbers from Excel)
    const stringFields = ['nis', 'nisn', 'nik', 'no_hp', 'no_rfid', 'nama_siswa', 'alamat', 'tempat_lahir'];
    stringFields.forEach(field => {
      if (dataToUpdate[field] !== undefined && dataToUpdate[field] !== null) {
        let val = String(dataToUpdate[field]).trim();
        
        // Smart Fix for Phone Numbers: If starts with 8, prepend 0
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

  // Auto-sync to SiswaAkademik upon update (Solusi Redundansi Sempurna!)
  const currentSiswa: any = await siswaDb.siswa.findUnique({
    where: { id: siswaId },
    select: { kelas_id: true, tahun_pelajaran_id: true, semester_id: true, status: true, nama_siswa: true }
  });

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
      console.log(`[AUTO-SYNC] Successfully synced SiswaAkademik upon update for student: ${currentSiswa.nama_siswa}`);
    } catch (e: any) {
      console.error('[AUTO-SYNC] Failed to sync SiswaAkademik upon update:', e.message || e);
    }
  }

  if (input.orang_tua && Array.isArray(input.orang_tua)) {
    const currentLinks = await siswaDb.orangTuaSiswa.findMany({
      where: { siswa_id: siswaId },
      select: { id: true, orang_tua_id: true },
    });

    const processedParentIds: string[] = [];

    for (const ot of input.orang_tua) {
      let parentId = (ot as any).id;
      const { id, ...otData } = ot as any;

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
  } else if (Object.prototype.hasOwnProperty.call(input, 'orang_tua')) {
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


import { useEffect, useMemo, useState } from 'react';
import { getIntegrationStatus, isPetugasActiveForKelas, isPetugasActive } from '../../api/attendanceGerbang.api';
import { getMyTenant, type AbsensiMode } from '../../api/tenants.api';
import { useAuthStore } from '../../store/authStore';

type PetugasVariant = 'success' | 'destructive' | 'outline';

interface Params {
  user: any;
  tenantId?: string | null;
  selectedKelasId?: string;
}

export function useGerbangModeAndRole({ user, tenantId, selectedKelasId }: Params) {
  const { token, tenantMode: storeTenantModeFromStore } = useAuthStore();
  const storeTenantMode = storeTenantModeFromStore || (user as any)?.tenant?.absensi_mode || null;
  const [absensiMode, setAbsensiMode] = useState<AbsensiMode | null>(storeTenantMode);
  const [petugasActive, setPetugasActive] = useState<boolean>(false);
  const [petugasActiveGlobal, setPetugasActiveGlobal] = useState<boolean>(false);
  const [petugasChecked, setPetugasChecked] = useState<boolean>(false);
  const [kelasNama, setKelasNama] = useState<string>('');
  const [managedKelasIds, setManagedKelasIds] = useState<string[]>([]);

  useEffect(() => {
    if (storeTenantMode) {
      setAbsensiMode(storeTenantMode);
    }
  }, [storeTenantMode]);

  useEffect(() => {
    if (!token) return;
    const role = user?.role?.name || '';
    if (role === 'ADMIN') {
      getMyTenant()
        .then(res => setAbsensiMode(res.data?.absensi_mode || null))
        .catch(() => {
          if (storeTenantMode) setAbsensiMode(storeTenantMode);
        });
      return;
    }
    if (role === 'SUPERADMIN') {
      return;
    }
    getIntegrationStatus()
      .then(() => setAbsensiMode('MULTI_SESI'))
      .catch((e: any) => {
        const status = e?.response?.status;
        if (status === 403) {
          setAbsensiMode('SIMPLE');
        } else {
          setAbsensiMode(storeTenantMode || null);
        }
      });
  }, [tenantId, user?.tenant_id, user?.role?.name, token, storeTenantMode]);

  useEffect(() => {
    let mounted = true;
    async function checkPetugas() {
      if (!token) return;
      try {
        if (user?.role?.name === 'SISWA') {
          if (selectedKelasId) {
            const res = await isPetugasActiveForKelas(selectedKelasId);
            const active = !!res?.data?.active;
            if (mounted) {
              setPetugasActive(active);
              if (res?.data?.managed_kelas_names) setKelasNama(res.data.managed_kelas_names);
              if ((res?.data as any)?.managed_kelas_ids) setManagedKelasIds((res.data as any).managed_kelas_ids);
            }
          } else {
            const resAny = await isPetugasActive();
            const activeAny = !!resAny?.data?.active;
            if (mounted) {
              setPetugasActiveGlobal(activeAny);
              if (resAny?.data?.managed_kelas_names) setKelasNama(resAny.data.managed_kelas_names);
              if ((resAny?.data as any)?.managed_kelas_ids) setManagedKelasIds((resAny.data as any).managed_kelas_ids);
            }
          }
          if (mounted) setPetugasChecked(true);
          return;
        }
        // GURU check is now handled via capabilities in useMemo below
        if (user?.role?.name === 'GURU') {
           if (mounted) setPetugasChecked(true); // GURU check is synchronous via capabilities
           return;
        }
        setPetugasActive(false); setPetugasActiveGlobal(false);
      } catch {
        if (mounted) { setPetugasActive(false); setPetugasActiveGlobal(false); }
      }
      if (mounted) setPetugasChecked(true);
    }
    checkPetugas();
    return () => { mounted = false; };
  }, [user?.role?.name, user?.id, selectedKelasId, token]);

  // Short-circuit: if SISWA already has petugas capabilities in their token, consider them active
  // without waiting for the async API check (eliminates race condition)
  const hasPetugasCap = useMemo(() => {
    if (user?.role?.name !== 'SISWA') return false;
    const caps: string[] = user?.capabilities || [];
    return caps.includes('attendance.sessions.create') ||
      caps.includes('attendance.scan') ||
      caps.includes('attendance.sessions.update.attendance');
  }, [user?.role?.name, user?.capabilities]);

  const isPetugasSiswa = useMemo(() => (
    user?.role?.name === 'SISWA' && (hasPetugasCap || petugasActive || petugasActiveGlobal)
  ), [user?.role?.name, hasPetugasCap, petugasActive, petugasActiveGlobal]);
  
  // Use capability 'attendance.scan' to determine if GURU is a petugas gerbang
  const isPetugasGuru = useMemo(() => {
    if (user?.role?.name === 'GURU') {
      return user?.capabilities?.includes('attendance.scan') ?? false;
    }
    return false;
  }, [user?.role?.name, user?.capabilities]);

  const petugasGuruChecked = user?.role?.name === 'GURU';

  const roleLabel = user?.role?.name || '-';
  const petugasLabel = (user?.role?.name === 'SISWA') ? (isPetugasSiswa ? 'Aktif' : 'Tidak Aktif') : (user?.role?.name === 'GURU') ? (isPetugasGuru ? 'Aktif' : 'Tidak Aktif') : '—';
  const petugasVariant: PetugasVariant = (user?.role?.name === 'SISWA') ? (isPetugasSiswa ? 'success' : 'destructive') : (user?.role?.name === 'GURU') ? (isPetugasGuru ? 'success' : 'destructive') : 'outline';

  return {
    absensiMode: absensiMode || storeTenantMode,
    roleLabel,
    isPetugasSiswa,
    isPetugasGuru,
    petugasLabel,
    petugasVariant,
    petugasChecked,
    petugasGuruChecked,
    managedKelasIds,
    kelasLabel: kelasNama || user?.Kelas?.nama_kelas || user?.Siswa?.Kelas?.nama_kelas || '-'
  };
}



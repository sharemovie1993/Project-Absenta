import { useEffect, useMemo, useState } from 'react';
import { getIntegrationStatus, isPetugasActiveForKelas, isPetugasActive } from '../../api/attendanceGerbang.api';
import { getMyTenant, type AbsensiMode } from '../../api/tenants.api';
import { guruApi } from '../../api/academic.api';
import { useAuthStore } from '../../store/authStore';
type PetugasVariant = 'success' | 'destructive' | 'outline';

interface Params {
  user: any;
  tenantId?: string | null;
  selectedKelasId?: string;
}

export function useGerbangModeAndRole({ user, tenantId, selectedKelasId }: Params) {
  const { token } = useAuthStore();
  const [absensiMode, setAbsensiMode] = useState<AbsensiMode | null>(null);
  const [petugasActive, setPetugasActive] = useState<boolean>(false);
  const [petugasActiveGlobal, setPetugasActiveGlobal] = useState<boolean>(false);
  const [petugasChecked, setPetugasChecked] = useState<boolean>(false);
  const [kelasNama, setKelasNama] = useState<string>('');

  useEffect(() => {
    if (!token) return;
    const role = user?.role?.name || '';
    if (role === 'ADMIN') {
      getMyTenant()
        .then(res => setAbsensiMode(res.data?.absensi_mode || null))
        .catch(() => {});
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
          setAbsensiMode(null);
        }
      });
  }, [tenantId, user?.tenant_id, user?.role?.name, token]);

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
            }
          } else {
            const resAny = await isPetugasActive();
            const activeAny = !!resAny?.data?.active;
            if (mounted) {
              setPetugasActiveGlobal(activeAny);
              if (resAny?.data?.managed_kelas_names) setKelasNama(resAny.data.managed_kelas_names);
            }
          }
          if (mounted) setPetugasChecked(true);
          return;
        }
        // GURU check is now handled via capabilities in useMemo below
        if (user?.role?.name === 'GURU') {
           // No async check needed for capabilities
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

  const isPetugasSiswa = useMemo(() => (user?.role?.name === 'SISWA' && (petugasActive || petugasActiveGlobal)), [user?.role?.name, petugasActive, petugasActiveGlobal]);
  
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
    absensiMode,
    roleLabel,
    isPetugasSiswa,
    isPetugasGuru,
    petugasLabel,
    petugasVariant,
    petugasChecked,
    petugasGuruChecked,
    kelasLabel: kelasNama || user?.Kelas?.nama_kelas || user?.Siswa?.Kelas?.nama_kelas || '-'
  };
}



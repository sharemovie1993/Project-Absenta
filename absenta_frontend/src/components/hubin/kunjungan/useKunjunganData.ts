import { useMemo } from 'react';
import type { SiswaPkl } from '@/api/hubin.api';
import type { KunjunganItemDetail, MitraTargetGroup, SiswaTargetItem, KunjunganStats } from './types';

export function useKunjunganData(rawList: SiswaPkl[]) {
  // 1. Flatten all visits from rawList
  const allVisits = useMemo<KunjunganItemDetail[]>(() => {
    const list: KunjunganItemDetail[] = [];
    rawList.forEach((p) => {
      let kList: any[] = [];
      if (Array.isArray(p.kunjungan_json)) {
        kList = p.kunjungan_json;
      } else if (typeof p.kunjungan_json === 'string') {
        try {
          kList = JSON.parse(p.kunjungan_json);
        } catch {
          kList = [];
        }
      }

      kList.forEach((k: any, idx: number) => {
        list.push({
          id: k.id || `visit-${p.id}-${idx}`,
          rawKunjunganId: k.id ? String(k.id) : String(idx),
          penempatan_id: p.id,
          siswa_id: p.Siswa?.id || p.siswa_id,
          nama_siswa: p.Siswa?.nama_siswa || 'Siswa Magang',
          nis: p.Siswa?.nis || '-',
          foto_siswa: p.Siswa?.foto,
          kelas: p.Siswa?.Kelas?.nama_kelas || 'Kelas XII',
          mitra_id: p.Mitra?.id || p.mitra_id,
          nama_mitra: p.Mitra?.nama || 'Mitra DU/DI',
          alamat_mitra: p.Mitra?.alamat,
          pembimbing_nama: p.Pembimbing?.nama_guru,
          tanggal: k.tanggal || new Date().toISOString(),
          catatan: k.catatan || '',
          catatan_dudi: k.catatan_dudi,
          foto_url: k.foto_url,
          latitude: k.latitude !== undefined && k.latitude !== null ? Number(k.latitude) : undefined,
          longitude: k.longitude !== undefined && k.longitude !== null ? Number(k.longitude) : undefined,
          created_at: k.created_at,
          created_by: k.created_by,
        });
      });
    });

    list.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    return list;
  }, [rawList]);

  // 2. Build Grouped Targets (Mitra -> Siswa)
  const targetGroups = useMemo<MitraTargetGroup[]>(() => {
    const groupMap = new Map<string, MitraTargetGroup>();

    rawList.forEach((p) => {
      const mId = p.mitra_id || 'unassigned';
      const mNama = p.Mitra?.nama || 'Mitra DU/DI Belum Ditentukan';
      const mAlamat = p.Mitra?.alamat;

      let kList: any[] = [];
      if (Array.isArray(p.kunjungan_json)) {
        kList = p.kunjungan_json;
      } else if (typeof p.kunjungan_json === 'string') {
        try {
          kList = JSON.parse(p.kunjungan_json);
        } catch {
          kList = [];
        }
      }

      const latestVisit = kList.length > 0 ? kList[kList.length - 1] : null;

      const siswaItem: SiswaTargetItem = {
        penempatan_id: p.id,
        siswa_id: p.Siswa?.id || p.siswa_id,
        nama_siswa: p.Siswa?.nama_siswa || 'Siswa Magang',
        nis: p.Siswa?.nis || '-',
        foto_siswa: p.Siswa?.foto,
        kelas: p.Siswa?.Kelas?.nama_kelas || 'Kelas XII',
        mitra_id: mId,
        nama_mitra: mNama,
        alamat_mitra: mAlamat,
        pembimbing_nama: p.Pembimbing?.nama_guru,
        visitsCount: kList.length,
        lastVisitDate: latestVisit?.tanggal,
        lastVisitNote: latestVisit?.catatan,
        rawPkl: p,
      };

      if (!groupMap.has(mId)) {
        groupMap.set(mId, {
          mitra_id: mId,
          nama_mitra: mNama,
          alamat_mitra: mAlamat,
          siswaList: [siswaItem],
          totalVisits: kList.length,
          lastVisitDate: latestVisit?.tanggal,
          isAllVisited: kList.length > 0,
          hasUnvisited: kList.length === 0,
        });
      } else {
        const existing = groupMap.get(mId)!;
        existing.siswaList.push(siswaItem);
        existing.totalVisits += kList.length;
        if (latestVisit?.tanggal && (!existing.lastVisitDate || new Date(latestVisit.tanggal) > new Date(existing.lastVisitDate))) {
          existing.lastVisitDate = latestVisit.tanggal;
        }
        existing.isAllVisited = existing.siswaList.every((s) => s.visitsCount > 0);
        existing.hasUnvisited = existing.siswaList.some((s) => s.visitsCount === 0);
      }
    });

    return Array.from(groupMap.values());
  }, [rawList]);

  // 3. Compute Stats
  const stats: KunjunganStats = useMemo(() => {
    const visitedMitraIds = new Set(allVisits.map((v) => v.mitra_id).filter(Boolean));
    const visitedSiswaIds = new Set(allVisits.map((v) => v.siswa_id).filter(Boolean));
    const totalMitra = new Set(rawList.map((p) => p.mitra_id).filter(Boolean)).size;
    const persentase = totalMitra > 0 ? Math.min(100, Math.round((visitedMitraIds.size / totalMitra) * 100)) : 0;
    const unvisited = rawList.length - visitedSiswaIds.size;

    return {
      totalKunjungan: allVisits.length,
      totalMitraTerkunjungi: visitedMitraIds.size,
      totalSiswaTerkunjungi: visitedSiswaIds.size,
      persentaseKunjungan: persentase,
      unvisitedSiswaCount: Math.max(0, unvisited),
    };
  }, [allVisits, rawList]);

  // 4. Distinct Mitra Options for filter
  const mitraFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    rawList.forEach((p) => {
      if (p.mitra_id && p.Mitra?.nama) {
        map.set(p.mitra_id, p.Mitra.nama);
      }
    });
    return Array.from(map.entries()).map(([id, nama]) => ({ id, nama }));
  }, [rawList]);

  return {
    allVisits,
    targetGroups,
    stats,
    mitraFilterOptions,
  };
}

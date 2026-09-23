import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { hubinApi } from '../../../api/hubin.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { getMyTenant } from '../../../api/tenants.api';
import { generateRaporPklSinglePdf, generateRaporPklBatchPdf, RaporPklItemData } from '../../../utils/print/modules/pdfRaporPkl';
import { LegerStudent, AcademicYear, Semester } from '../../../types/cetakRapor.types';
import { User } from '../../../store/authStore';

export interface KelasOptionItem {
  id: string;
  nama_kelas?: string;
  nama?: string;
  nama_lengkap?: string;
  tingkat?: number | string;
  jurusan_id?: string;
  kode_jurusan?: string;
  jurusan?: {
    id?: string;
    kode_jurusan?: string;
  };
}

export interface SiswaPlacementData {
  id?: string;
  nama_siswa?: string;
  nis?: string;
  nisn?: string;
  Kelas?: {
    nama_kelas?: string;
  };
  Jurusan?: {
    nama?: string;
    ProgramKeahlian?: {
      nama?: string;
    };
  };
}

export interface MitraPlacementData {
  nama?: string;
  alamat?: string;
  pic_nama?: string;
  deskripsi_tp?: string;
  SettingDeskripsiPkl?: Array<{ deskripsi_tp?: string }>;
}

export interface PembimbingPlacementData {
  nama_guru?: string;
  nama?: string;
  nip?: string;
}

export interface PlacementRecord {
  id?: string;
  siswa_id?: string;
  Siswa?: SiswaPlacementData;
  Mitra?: MitraPlacementData;
  Pembimbing?: PembimbingPlacementData;
  mitra_nama?: string;
  alamat_dudi?: string;
  tanggal_mulai?: string | Date;
  tanggal_selesai?: string | Date;
  instruktur_nama?: string;
  penanggung_jawab_nama?: string;
  catatan_pkl?: string;
  deskripsi_tp?: string;
  sakit_pkl?: number;
  izin_pkl?: number;
  alpa_pkl?: number;
  auto_sakit?: number;
  auto_izin?: number;
  auto_alpa?: number;
  hard_kompetensi_teknis?: number | null;
  hard_sop_k3lh?: number | null;
  hard_alur_bisnis?: number | null;
  soft_kedisiplinan?: number | null;
  soft_kerajinan_inisiatif?: number | null;
  soft_kerjasama?: number | null;
  soft_kejujuran?: number | null;
  soft_tanggung_jawab?: number | null;
  nilai_akhir_pkl?: number | null;
  predikat_pkl?: string | null;
}

interface HubinPlacementResponse {
  list?: PlacementRecord[];
  data?: PlacementRecord[] | { list?: PlacementRecord[] };
}

interface ExtendedUserContext {
  nama?: string;
  name?: string;
  full_name?: string;
  nip?: string;
}

export interface UseRaporPklPrintProps {
  selectedKelas: string;
  classList: KelasOptionItem[];
  activeYear: AcademicYear | null;
  activeSemester: Semester | null;
  user: User | null;
  setPdfLoading: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function useRaporPklPrint({
  selectedKelas,
  classList,
  activeYear,
  activeSemester,
  user,
  setPdfLoading,
}: UseRaporPklPrintProps) {
  const [isBatchPklPrinting, setIsBatchPklPrinting] = useState(false);

  const handlePrintRaporPkl = useCallback(
    async (student: LegerStudent) => {
      const key = `pkl_${student.id}`;
      setPdfLoading((prev) => ({ ...prev, [key]: true }));
      try {
        const res = (await hubinApi.getPenempatan({
          search: student.nis || student.nama_siswa,
          kelas_id: selectedKelas,
          limit: 20,
        })) as unknown as HubinPlacementResponse;

        const rawList = res?.list || (Array.isArray(res?.data) ? res.data : (res?.data as { list?: PlacementRecord[] })?.list) || [];
        const placementList: PlacementRecord[] = Array.isArray(rawList) ? rawList : [];

        const placement = placementList.find(
          (p: PlacementRecord) =>
            p.siswa_id === student.id ||
            p.Siswa?.id === student.id ||
            p.Siswa?.nis === student.nis
        );

        if (!placement) {
          toast.warning(`Siswa ${student.nama_siswa} belum memiliki data penempatan PKL di modul Hubin.`);
          return;
        }

        const [sekolahRes, tenantRes] = await Promise.allSettled([
          sekolahApi.getProfile(),
          getMyTenant().catch(() => null),
        ]);
        const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
        const tenantInfo = tenantRes.status === 'fulfilled' ? tenantRes.value : null;
        const currentKelasObj = (classList ?? []).find((k) => k.id === selectedKelas);
        const extUser = user as unknown as ExtendedUserContext | null;

        const raporItem: RaporPklItemData = {
          siswa: {
            id: student.id,
            nama_siswa: student.nama_siswa,
            nis: student.nis || placement.Siswa?.nis || '-',
            nisn: placement.Siswa?.nisn || '-',
            nama_kelas: currentKelasObj?.nama_kelas || currentKelasObj?.nama || placement.Siswa?.Kelas?.nama_kelas || '',
            program_keahlian: placement.Siswa?.Jurusan?.ProgramKeahlian?.nama || 'Teknik Kejuruan',
            konsentrasi_keahlian: placement.Siswa?.Jurusan?.nama || currentKelasObj?.nama_kelas || '',
          },
          pkl: {
            mitra_nama: placement.Mitra?.nama || placement.mitra_nama || 'DUDI MITRA',
            mitra_alamat: placement.alamat_dudi || placement.Mitra?.alamat || '',
            tanggal_mulai: placement.tanggal_mulai,
            tanggal_selesai: placement.tanggal_selesai,
            instruktur_nama: placement.instruktur_nama || placement.Mitra?.pic_nama || placement.penanggung_jawab_nama || '',
            pembimbing_nama: placement.Pembimbing?.nama_guru || placement.Pembimbing?.nama || '',
            pembimbing_nip: placement.Pembimbing?.nip || '',
            catatan_pkl: placement.catatan_pkl || '',
            deskripsi_tp: placement.deskripsi_tp || placement.Mitra?.SettingDeskripsiPkl?.[0]?.deskripsi_tp || placement.Mitra?.deskripsi_tp || '',
            sakit_pkl: placement.sakit_pkl ?? (placement.auto_sakit ?? (student.sakit ?? 0)),
            izin_pkl: placement.izin_pkl ?? (placement.auto_izin ?? (student.izin ?? 0)),
            alpa_pkl: placement.alpa_pkl ?? (placement.auto_alpa ?? (student.alpa ?? 0)),
          },
          penilaian: {
            hard_kompetensi_teknis: placement.hard_kompetensi_teknis ?? null,
            hard_sop_k3lh: placement.hard_sop_k3lh ?? null,
            hard_alur_bisnis: placement.hard_alur_bisnis ?? null,
            soft_kedisiplinan: placement.soft_kedisiplinan ?? null,
            soft_kerajinan_inisiatif: placement.soft_kerajinan_inisiatif ?? null,
            soft_kerjasama: placement.soft_kerjasama ?? null,
            soft_kejujuran: placement.soft_kejujuran ?? null,
            soft_tanggung_jawab: placement.soft_tanggung_jawab ?? null,
            nilai_akhir_pkl: placement.nilai_akhir_pkl ?? null,
            predikat_pkl: placement.predikat_pkl || null,
          },
          sekolah: {
            nama: sekolah?.nama || tenantInfo?.name || 'SMK NEGERI 1 PLERED',
            kota: sekolah?.kota || 'Purwakarta',
            kepala_sekolah: sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'Wahyu Tamimbarkah, S.Pd.',
            nip_kepala: sekolah?.nip_kepala || tenantInfo?.nip_kepala || '197111022008011001',
          },
          wali_kelas: {
            nama: extUser?.nama || extUser?.name || extUser?.full_name || 'Wali Kelas',
            nip: extUser?.nip || '',
          },
          tahun_pelajaran: activeYear?.nama || '',
          semester: activeSemester?.nama || '',
        };

        const { blobUrl } = await generateRaporPklSinglePdf(raporItem);
        window.open(blobUrl, '_blank');
        toast.success(`Pratinjau Rapor PKL ${student.nama_siswa} (2 Halaman) dibuka di tab baru`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Gagal membuat PDF Rapor PKL: ${msg}`);
      } finally {
        setPdfLoading((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [selectedKelas, classList, activeYear, activeSemester, user, setPdfLoading]
  );

  const handleBatchPrintRaporPkl = useCallback(async () => {
    if (!selectedKelas) {
      toast.error('Pilih rombel / kelas terlebih dahulu');
      return;
    }
    setIsBatchPklPrinting(true);
    toast.info('Menyiapkan kompilasi Rapor PKL Sekelas...');
    try {
      const res = (await hubinApi.getPenempatan({
        kelas_id: selectedKelas,
        limit: 200,
      })) as unknown as HubinPlacementResponse;

      const rawList = res?.list || (Array.isArray(res?.data) ? res.data : (res?.data as { list?: PlacementRecord[] })?.list) || [];
      const placementList: PlacementRecord[] = Array.isArray(rawList) ? rawList : [];

      if (!placementList || placementList.length === 0) {
        toast.warning('Tidak ada siswa di kelas ini yang memiliki data penempatan PKL.');
        return;
      }

      const [sekolahRes, tenantRes] = await Promise.allSettled([
        sekolahApi.getProfile(),
        getMyTenant().catch(() => null),
      ]);
      const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
      const tenantInfo = tenantRes.status === 'fulfilled' ? tenantRes.value : null;
      const currentKelasObj = (classList ?? []).find((k) => k.id === selectedKelas);
      const extUser = user as unknown as ExtendedUserContext | null;

      const raporItems: RaporPklItemData[] = (placementList ?? []).map((placement: PlacementRecord) => {
        const s = placement.Siswa || {};
        return {
          siswa: {
            id: s.id || placement.siswa_id || '',
            nama_siswa: s.nama_siswa || 'Siswa',
            nis: s.nis || '-',
            nisn: s.nisn || '-',
            nama_kelas: currentKelasObj?.nama_kelas || currentKelasObj?.nama || s.Kelas?.nama_kelas || '',
            program_keahlian: s.Jurusan?.ProgramKeahlian?.nama || 'Teknik Kejuruan',
            konsentrasi_keahlian: s.Jurusan?.nama || currentKelasObj?.nama_kelas || '',
          },
          pkl: {
            mitra_nama: placement.Mitra?.nama || placement.mitra_nama || 'DUDI MITRA',
            mitra_alamat: placement.alamat_dudi || placement.Mitra?.alamat || '',
            tanggal_mulai: placement.tanggal_mulai,
            tanggal_selesai: placement.tanggal_selesai,
            instruktur_nama: placement.instruktur_nama || placement.Mitra?.pic_nama || placement.penanggung_jawab_nama || '',
            pembimbing_nama: placement.Pembimbing?.nama_guru || placement.Pembimbing?.nama || '',
            pembimbing_nip: placement.Pembimbing?.nip || '',
            catatan_pkl: placement.catatan_pkl || '',
            deskripsi_tp: placement.deskripsi_tp || placement.Mitra?.SettingDeskripsiPkl?.[0]?.deskripsi_tp || placement.Mitra?.deskripsi_tp || '',
            sakit_pkl: placement.sakit_pkl ?? 0,
            izin_pkl: placement.izin_pkl ?? 0,
            alpa_pkl: placement.alpa_pkl ?? 0,
          },
          penilaian: {
            hard_kompetensi_teknis: placement.hard_kompetensi_teknis ?? null,
            hard_sop_k3lh: placement.hard_sop_k3lh ?? null,
            hard_alur_bisnis: placement.hard_alur_bisnis ?? null,
            soft_kedisiplinan: placement.soft_kedisiplinan ?? null,
            soft_kerajinan_inisiatif: placement.soft_kerajinan_inisiatif ?? null,
            soft_kerjasama: placement.soft_kerjasama ?? null,
            soft_kejujuran: placement.soft_kejujuran ?? null,
            soft_tanggung_jawab: placement.soft_tanggung_jawab ?? null,
            nilai_akhir_pkl: placement.nilai_akhir_pkl ?? null,
            predikat_pkl: placement.predikat_pkl || null,
          },
          sekolah: {
            nama: sekolah?.nama || tenantInfo?.name || 'SMK NEGERI 1 PLERED',
            kota: sekolah?.kota || 'Purwakarta',
            kepala_sekolah: sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'Wahyu Tamimbarkah, S.Pd.',
            nip_kepala: sekolah?.nip_kepala || tenantInfo?.nip_kepala || '197111022008011001',
          },
          wali_kelas: {
            nama: extUser?.nama || extUser?.name || extUser?.full_name || 'Wali Kelas',
            nip: extUser?.nip || '',
          },
          tahun_pelajaran: activeYear?.nama || '',
          semester: activeSemester?.nama || '',
        };
      });

      const { blobUrl } = await generateRaporPklBatchPdf(raporItems, currentKelasObj?.nama_kelas || 'Kelas');
      window.open(blobUrl, '_blank');
      toast.success(`Pratinjau Rapor PKL Sekelas (${raporItems.length} Siswa, 2 Halaman per Siswa) dibuka di tab baru`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Gagal membuat PDF Batch Rapor PKL: ${msg}`);
    } finally {
      setIsBatchPklPrinting(false);
    }
  }, [selectedKelas, classList, activeYear, activeSemester, user]);

  return {
    handlePrintRaporPkl,
    handleBatchPrintRaporPkl,
    isBatchPklPrinting,
  };
}

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { hubinApi } from '../../../api/hubin.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { getMyTenant } from '../../../api/tenants.api';
import { generateRaporPklSinglePdf, generateRaporPklBatchPdf, RaporPklItemData } from '../../../utils/print/modules/pdfRaporPkl';
import {
  generateSertifikatSinglePdf,
  generateSertifikatBatchPdf,
  SertifikatPklPrintData,
  formatTanggalIndonesia,
} from '../../../utils/print/modules/pdfSertifikatPkl';
import { resolveCoverImageBase64 } from '../../../utils/print/rapor/raporShared';
import { LegerStudent, AcademicYear, Semester } from '../../../types/cetakRapor.types';
import { User, useAuthStore } from '../../../store/authStore';
import { useRaporRenderStore } from '../../../store/raporRenderStore';

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
  tempat_lahir?: string;
  tanggal_lahir?: string | Date;
  foto?: string | null;
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
  pic_jabatan?: string;
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
  nomor_sertifikat?: string;
  tanggal_mulai?: string | Date;
  tanggal_selesai?: string | Date;
  instruktur_nama?: string;
  penanggung_jawab_nama?: string;
  penanggung_jawab_jabatan?: string;
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

/**
 * Helper to build SertifikatPklPrintData accurately matching Hubin backend schema
 */
function buildCertPrintData(
  placement: PlacementRecord,
  certDetail: any,
  sekolah: any,
  tenantInfo: any,
  currentKelasObj: KelasOptionItem | undefined,
  activeYear: AcademicYear | null,
  activeSemester: Semester | null
): SertifikatPklPrintData {
  const rawSiswa = certDetail?.Siswa || placement.Siswa || {};
  const rawMitra = certDetail?.Mitra || placement.Mitra || {};
  const rawSekolah = certDetail?.sekolah || sekolah || {};

  const hardTeknis = certDetail?.hard_kompetensi_teknis ?? placement.hard_kompetensi_teknis ?? 88;
  const hardK3lh = certDetail?.hard_sop_k3lh ?? placement.hard_sop_k3lh ?? 89;
  const hardBisnis = certDetail?.hard_alur_bisnis ?? placement.hard_alur_bisnis ?? 87;

  const softDisiplin = certDetail?.soft_kedisiplinan ?? placement.soft_kedisiplinan ?? 83;
  const softInisiatif = certDetail?.soft_kerajinan_inisiatif ?? placement.soft_kerajinan_inisiatif ?? 84;
  const softKerjasama = certDetail?.soft_kerjasama ?? placement.soft_kerjasama ?? 86;
  const softJujur = certDetail?.soft_kejujuran ?? placement.soft_kejujuran ?? 88;
  const softTanggungJawab = certDetail?.soft_tanggung_jawab ?? placement.soft_tanggung_jawab ?? 85;

  const scores = [hardTeknis, hardK3lh, hardBisnis, softDisiplin, softInisiatif, softKerjasama, softJujur, softTanggungJawab];
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  const refSertifikat = certDetail?.referensi_sertifikat;
  const nomorResmi = certDetail?.nomor_sertifikat || refSertifikat?.nomor_surat || placement.nomor_sertifikat || '425.1/0630/SMKN1PLD-KCD Wil.IV';
  const durasiResmi = String(refSertifikat?.durasi_jp || '792');
  const tempatResmi = refSertifikat?.tempat_terbit || rawSekolah.kota || sekolah?.kota || tenantInfo?.city || 'Purwakarta';
  const rawTanggalTerbit = refSertifikat?.tanggal_terbit;
  const formattedTanggal = rawTanggalTerbit ? formatTanggalIndonesia(rawTanggalTerbit) : '22 Desember 2025';
  const tanggalResmi = `${tempatResmi}, ${formattedTanggal}`;
  const kepalaResmi = refSertifikat?.penandatangan_nama || rawSekolah.kepala_sekolah || sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'Wahyu Tamimbarkah, S.Pd.';
  const nipResmi = refSertifikat?.penandatangan_nip || rawSekolah.nip_kepala || sekolah?.nip_kepala || tenantInfo?.nip_kepala || '197111022008011001';

  return {
    nomor_sertifikat: nomorResmi,
    durasi_jp: durasiResmi,
    tanggal_terbit: tanggalResmi,
    assessment_mode: (certDetail?.assessment_mode || 'DUDI_ONLY') as 'DUDI_ONLY' | 'COMPOSITE',
    weight_dudi: certDetail?.weight_dudi ?? 70,
    weight_laporan: certDetail?.weight_laporan ?? 15,
    weight_sidang: certDetail?.weight_sidang ?? 15,
    sekolah: {
      nama: rawSekolah.nama || sekolah?.nama || tenantInfo?.name || 'SEKOLAH MENENGAH KEJURUAN NEGERI 1 PLERED',
      alamat: rawSekolah.alamat || sekolah?.alamat || tenantInfo?.address || 'Jl. Raya Rawasari Kec. Plered Kab. Purwakarta Telp. (0264) 7504001',
      kota: tempatResmi,
      kode_pos: rawSekolah.kode_pos || sekolah?.kode_pos || tenantInfo?.kode_pos || '41162',
      telepon: rawSekolah.telepon || sekolah?.telepon || tenantInfo?.phone || '(0264) 7504001',
      email: rawSekolah.email || sekolah?.email || tenantInfo?.email || 'smkneple@gmail.com',
      website: rawSekolah.website || sekolah?.website || tenantInfo?.website || 'smknegeri1plered.sch.id',
      kepala_sekolah: kepalaResmi,
      nip_kepala: nipResmi,
      logo_url: tenantInfo?.logo_url || rawSekolah.logo_url || sekolah?.logo_url || undefined,
      logo_daerah: tenantInfo?.logo_daerah_url || rawSekolah.logo_daerah || sekolah?.logo_daerah || undefined,
      nama_dinas_atas: tenantInfo?.nama_dinas_atas || rawSekolah.nama_dinas_atas || undefined,
      nama_dinas_bawah: tenantInfo?.nama_dinas_bawah || rawSekolah.nama_dinas_bawah || undefined,
      nama_cabang_dinas: tenantInfo?.nama_cabang_dinas || rawSekolah.nama_cabang_dinas || undefined,
      print_header_lines: tenantInfo?.print_header_lines || rawSekolah.print_header_lines || undefined,
    },
    siswa: {
      nama_siswa: rawSiswa.nama_siswa || 'Siswa',
      nis: rawSiswa.nis || placement.Siswa?.nis || '-',
      nisn: rawSiswa.nisn || placement.Siswa?.nisn || '-',
      tempat_lahir: rawSiswa.tempat_lahir || 'Purwakarta',
      tanggal_lahir: rawSiswa.tanggal_lahir || new Date('2008-10-15'),
      foto: rawSiswa.foto || null,
      program_keahlian: rawSiswa.Jurusan?.ProgramKeahlian?.nama || 'Teknik Kejuruan',
      konsentrasi_keahlian: rawSiswa.Jurusan?.nama || currentKelasObj?.nama_kelas || '',
      nama_kelas: currentKelasObj?.nama_kelas || rawSiswa.Kelas?.nama_kelas || '',
    },
    mitra: {
      nama: rawMitra.nama || placement.Mitra?.nama || placement.mitra_nama || 'DUDI MITRA',
      alamat: certDetail?.alamat_dudi || rawMitra.alamat || placement.Mitra?.alamat || '',
      penanggung_jawab_nama: certDetail?.penanggung_jawab_nama || rawMitra.pic_nama || placement.penanggung_jawab_nama || placement.Mitra?.pic_nama || '',
      penanggung_jawab_jabatan: certDetail?.penanggung_jawab_jabatan || rawMitra.pic_jabatan || placement.penanggung_jawab_jabatan || 'Pimpinan / Pembimbing Lapangan',
      instruktur_nama: certDetail?.instruktur_nama || placement.instruktur_nama || '',
    },
    pembimbing: {
      nama: certDetail?.pembimbing_nama || placement.Pembimbing?.nama_guru || null,
      nip: certDetail?.pembimbing_nip || placement.Pembimbing?.nip || null,
    },
    penilaian: {
      hard_kompetensi_teknis: hardTeknis,
      hard_sop_k3lh: hardK3lh,
      hard_alur_bisnis: hardBisnis,
      soft_kedisiplinan: softDisiplin,
      soft_kerajinan_inisiatif: softInisiatif,
      soft_kerjasama: softKerjasama,
      soft_kejujuran: softJujur,
      soft_tanggung_jawab: softTanggungJawab,
      nilai_akhir_pkl: certDetail?.nilai_akhir_pkl ?? placement.nilai_akhir_pkl ?? Math.round(avg * 100) / 100,
      predikat_pkl: certDetail?.predikat_pkl || placement.predikat_pkl || 'BAIK',
      nilai_laporan: certDetail?.nilai_laporan ?? null,
      nilai_sidang: certDetail?.nilai_sidang ?? null,
    },
  };
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
  const [isBatchSertifikatPrinting, setIsBatchSertifikatPrinting] = useState(false);
  const [showLogoKananSertifikat, setShowLogoKananSertifikat] = useState<boolean>(() => {
    try {
      return localStorage.getItem('absenta_sertifikat_logo_kanan') === 'true';
    } catch {
      return false;
    }
  });

  const toggleShowLogoKananSertifikat = useCallback(() => {
    setShowLogoKananSertifikat((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('absenta_sertifikat_logo_kanan', String(next));
      } catch {}
      toast.info(`Logo Kanan Sertifikat PKL: ${next ? 'AKTIF (ON)' : 'NONAKTIF (OFF)'}`);
      return next;
    });
  }, []);

  // ── 1. Cetak Rapor PKL Single (2 Halaman) ──
  const handlePrintRaporPkl = useCallback(
    async (student: LegerStudent) => {
      const key = `pkl_${student.id}`;
      const { startRender, updateProgress, finishRender, failRender } = useRaporRenderStore.getState();
      setPdfLoading((prev) => ({ ...prev, [key]: true }));
      startRender(`Rapor PKL - ${student.nama_siswa}`, 1, `Mengambil data penempatan PKL ${student.nama_siswa}...`);
      updateProgress({ stage: 'fetching', progressPercent: 25 });
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
          const warningMsg = `Siswa ${student.nama_siswa} belum memiliki data penempatan PKL di modul Hubin.`;
          failRender(warningMsg);
          toast.warning(warningMsg);
          return;
        }

        updateProgress({
          stage: 'processing',
          stageText: 'Menyusun nilai pembimbing, instruktur DUDI & kompetensi...',
          progressPercent: 60,
        });

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

        updateProgress({
          stage: 'rendering',
          stageText: 'Merender tata letak 2 halaman Rapor PKL & tanda tangan...',
          progressPercent: 90,
        });

        const { blobUrl, filename } = await generateRaporPklSinglePdf(raporItem);
        finishRender(blobUrl, filename, `Rapor PKL ${student.nama_siswa} berhasil dibuat!`);
        toast.success(`Pratinjau Rapor PKL ${student.nama_siswa} (2 Halaman) dibuka di tab baru`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failRender(msg);
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

  // ── 2. Cetak Rapor PKL Batch Sekelas ──
  const handleBatchPrintRaporPkl = useCallback(async () => {
    if (!selectedKelas) {
      toast.error('Pilih rombel / kelas terlebih dahulu');
      return;
    }
    const { startRender, updateProgress, finishRender, failRender } = useRaporRenderStore.getState();
    setIsBatchPklPrinting(true);
    startRender('Kompilasi Rapor PKL Sekelas', 1, 'Menghubungkan ke pangkalan data Hubin...');
    updateProgress({ stage: 'fetching', progressPercent: 15 });
    toast.info('Menyiapkan kompilasi Rapor PKL Sekelas...');
    try {
      const res = (await hubinApi.getPenempatan({
        kelas_id: selectedKelas,
        limit: 200,
      })) as unknown as HubinPlacementResponse;

      const rawList = res?.list || (Array.isArray(res?.data) ? res.data : (res?.data as { list?: PlacementRecord[] })?.list) || [];
      const placementList: PlacementRecord[] = Array.isArray(rawList) ? rawList : [];

      if (!placementList || placementList.length === 0) {
        const warningMsg = 'Tidak ada siswa di kelas ini yang memiliki data penempatan PKL.';
        failRender(warningMsg);
        toast.warning(warningMsg);
        return;
      }

      updateProgress({
        stage: 'processing',
        stageText: `Mengumpulkan profil mitra & penempatan ${placementList.length} siswa...`,
        progressPercent: 35,
        total: placementList.length,
      });

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

      updateProgress({
        stage: 'rendering',
        stageText: `Merender dokumen Rapor PKL Sekelas (${raporItems.length} siswa)...`,
        progressPercent: 40,
        total: raporItems.length,
      });

      const { blobUrl, filename } = await generateRaporPklBatchPdf(
        raporItems,
        currentKelasObj?.nama_kelas || 'Kelas',
        (current, total, studentName) => {
          const percent = Math.min(99, 40 + Math.round((current / total) * 58));
          updateProgress({
            stage: 'rendering',
            stageText: `Merender Rapor PKL Siswa (${current}/${total})...`,
            progressPercent: percent,
            current,
            total,
            detail: `Siswa: ${studentName}`,
          });
        }
      );

      finishRender(blobUrl, filename, `Kompilasi Rapor PKL Sekelas (${raporItems.length} Siswa) berhasil dibuat!`);
      toast.success(`Pratinjau Rapor PKL Sekelas (${raporItems.length} Siswa, 2 Halaman per Siswa) dibuka di tab baru`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failRender(msg);
      toast.error(`Gagal membuat PDF Batch Rapor PKL: ${msg}`);
    } finally {
      setIsBatchPklPrinting(false);
    }
  }, [selectedKelas, classList, activeYear, activeSemester, user]);

  // ── 3. Cetak Sertifikat PKL Single (Langsung ke PDF Viewer / Tab Baru) ──
  const handlePrintSertifikatPkl = useCallback(
    async (student: LegerStudent) => {
      const key = `cert_${student.id}`;
      const { startRender, updateProgress, finishRender, failRender } = useRaporRenderStore.getState();
      setPdfLoading((prev) => ({ ...prev, [key]: true }));
      startRender(`Sertifikat PKL - ${student.nama_siswa}`, 1, `Mengambil data penempatan PKL ${student.nama_siswa}...`);
      updateProgress({ stage: 'fetching', progressPercent: 20 });
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

        if (!placement?.id) {
          const warningMsg = `Siswa ${student.nama_siswa} belum memiliki data penempatan PKL di modul Hubin.`;
          failRender(warningMsg);
          toast.warning(warningMsg);
          return;
        }

        updateProgress({
          stage: 'processing',
          stageText: 'Mengambil data nilai sertifikat & pangkalan DUDI...',
          progressPercent: 50,
        });

        const [certRes, sekolahRes, tenantRes] = await Promise.allSettled([
          hubinApi.getSertifikatPklData(placement.id),
          sekolahApi.getProfile(),
          getMyTenant().catch(() => null),
        ]);

        const certDetail = certRes.status === 'fulfilled' ? (certRes.value?.data || certRes.value) : null;
        const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
        const rawTenant = tenantRes.status === 'fulfilled' ? tenantRes.value : null;
        const tenantData = (rawTenant as any)?.data?.data || (rawTenant as any)?.data || rawTenant || null;
        const authTenant = (user as any)?.tenant || useAuthStore.getState().user?.tenant;
        const tenantInfo = { ...(authTenant || {}), ...(tenantData || {}) };
        const currentKelasObj = (classList ?? []).find((k) => k.id === selectedKelas);

        const certData = buildCertPrintData(
          placement,
          certDetail,
          sekolah,
          tenantInfo,
          currentKelasObj,
          activeYear,
          activeSemester
        );

        const logoDaerahUrl = certData.sekolah?.logo_daerah || null;
        const logoSekolahUrl = certData.sekolah?.logo_url || null;

        const [logoDaerahBase64, logoSekolahBase64] = await Promise.all([
          resolveCoverImageBase64(logoDaerahUrl),
          showLogoKananSertifikat ? resolveCoverImageBase64(logoSekolahUrl) : Promise.resolve(null),
        ]);

        updateProgress({
          stage: 'rendering',
          stageText: 'Merender piagam depan & daftar nilai PKL resmi...',
          progressPercent: 85,
        });

        const { blobUrl, filename } = await generateSertifikatSinglePdf(certData, {
          logoDaerahBase64,
          logoSekolahBase64,
          showDudiName: true,
        });

        finishRender(blobUrl, filename, `Sertifikat PKL ${student.nama_siswa} berhasil dibuat!`);
        toast.success(`Pratinjau Sertifikat PKL ${student.nama_siswa} (2 Halaman) dibuka di tab baru`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failRender(msg);
        toast.error(`Gagal membuat PDF Sertifikat PKL: ${msg}`);
      } finally {
        setPdfLoading((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [selectedKelas, classList, activeYear, activeSemester, showLogoKananSertifikat, setPdfLoading]
  );

  // ── 4. Cetak Sertifikat PKL Batch Sekelas (Gabungan 1 File PDF) ──
  const handleBatchPrintSertifikatPkl = useCallback(async () => {
    if (!selectedKelas) {
      toast.error('Pilih rombel / kelas terlebih dahulu');
      return;
    }
    const { startRender, updateProgress, finishRender, failRender } = useRaporRenderStore.getState();
    setIsBatchSertifikatPrinting(true);
    startRender('Kompilasi Sertifikat PKL Sekelas', 1, 'Menghubungkan ke pangkalan data Hubin...');
    updateProgress({ stage: 'fetching', progressPercent: 15 });
    toast.info('Menyiapkan kompilasi Sertifikat PKL Sekelas...');
    try {
      const res = (await hubinApi.getPenempatan({
        kelas_id: selectedKelas,
        limit: 200,
      })) as unknown as HubinPlacementResponse;

      const rawList = res?.list || (Array.isArray(res?.data) ? res.data : (res?.data as { list?: PlacementRecord[] })?.list) || [];
      const placementList: PlacementRecord[] = Array.isArray(rawList) ? rawList : [];

      if (!placementList || placementList.length === 0) {
        const warningMsg = 'Tidak ada siswa di kelas ini yang memiliki data penempatan PKL.';
        failRender(warningMsg);
        toast.warning(warningMsg);
        return;
      }

      updateProgress({
        stage: 'processing',
        stageText: `Mengumpulkan profil mitra & data sertifikat ${placementList.length} siswa...`,
        progressPercent: 30,
        total: placementList.length,
      });

      const [sekolahRes, tenantRes] = await Promise.allSettled([
        sekolahApi.getProfile(),
        getMyTenant().catch(() => null),
      ]);
      const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
      const rawTenant = tenantRes.status === 'fulfilled' ? tenantRes.value : null;
      const tenantData = (rawTenant as any)?.data?.data || (rawTenant as any)?.data || rawTenant || null;
      const authTenant = (user as any)?.tenant || useAuthStore.getState().user?.tenant;
      const tenantInfo = { ...(authTenant || {}), ...(tenantData || {}) };
      const currentKelasObj = (classList ?? []).find((k) => k.id === selectedKelas);

      const logoSekolahUrl = tenantInfo?.logo_url || sekolah?.logo_url || null;
      const logoDaerahUrl = tenantInfo?.logo_daerah_url || sekolah?.logo_daerah || null;

      const [logoDaerahBase64, logoSekolahBase64] = await Promise.all([
        resolveCoverImageBase64(logoDaerahUrl),
        showLogoKananSertifikat ? resolveCoverImageBase64(logoSekolahUrl) : Promise.resolve(null),
      ]);

      // Fetch detailed cert data in parallel
      const certPromises = placementList.map(async (placement) => {
        try {
          if (!placement.id) return null;
          const certRes = await hubinApi.getSertifikatPklData(placement.id);
          const certDetail = certRes?.data || certRes;
          return buildCertPrintData(
            placement,
            certDetail,
            sekolah,
            tenantInfo,
            currentKelasObj,
            activeYear,
            activeSemester
          );
        } catch {
          return buildCertPrintData(
            placement,
            null,
            sekolah,
            tenantInfo,
            currentKelasObj,
            activeYear,
            activeSemester
          );
        }
      });

      const certItemsRaw = await Promise.all(certPromises);
      const certItems = certItemsRaw.filter((c): c is SertifikatPklPrintData => Boolean(c));

      if (certItems.length === 0) {
        const warningMsg = 'Gagal memuat data sertifikat siswa.';
        failRender(warningMsg);
        toast.warning(warningMsg);
        return;
      }

      updateProgress({
        stage: 'rendering',
        stageText: `Merender dokumen Sertifikat PKL Sekelas (${certItems.length} siswa)...`,
        progressPercent: 50,
        total: certItems.length,
      });

      const { blobUrl, filename } = await generateSertifikatBatchPdf(
        certItems,
        currentKelasObj?.nama_kelas || 'Kelas',
        (current, total, studentName) => {
          const percent = Math.min(99, 50 + Math.round((current / total) * 48));
          updateProgress({
            stage: 'rendering',
            stageText: `Merender Sertifikat PKL Siswa (${current}/${total})...`,
            progressPercent: percent,
            current,
            total,
            detail: `Siswa: ${studentName}`,
          });
        },
        {
          logoDaerahBase64,
          logoSekolahBase64,
          showDudiName: true,
        }
      );

      finishRender(blobUrl, filename, `Kompilasi Sertifikat PKL Sekelas (${certItems.length} Siswa) berhasil dibuat!`);
      toast.success(`Pratinjau Sertifikat PKL Sekelas (${certItems.length} Siswa, 2 Halaman per Siswa) dibuka di tab baru`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failRender(msg);
      toast.error(`Gagal membuat PDF Batch Sertifikat PKL: ${msg}`);
    } finally {
      setIsBatchSertifikatPrinting(false);
    }
  }, [selectedKelas, classList, activeYear, activeSemester, showLogoKananSertifikat]);

  // Legacy helper
  const handleOpenSertifikatPkl = useCallback(
    async (student: LegerStudent): Promise<string | null> => {
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

        if (!placement?.id) {
          toast.warning(`Siswa ${student.nama_siswa} belum memiliki data penempatan PKL di modul Hubin.`);
          return null;
        }

        return placement.id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Gagal memeriksa data penempatan PKL: ${msg}`);
        return null;
      }
    },
    [selectedKelas]
  );

  return {
    handlePrintRaporPkl,
    handleBatchPrintRaporPkl,
    handlePrintSertifikatPkl,
    handleBatchPrintSertifikatPkl,
    handleOpenSertifikatPkl,
    isBatchPklPrinting,
    isBatchSertifikatPrinting,
    showLogoKananSertifikat,
    toggleShowLogoKananSertifikat,
  };
}

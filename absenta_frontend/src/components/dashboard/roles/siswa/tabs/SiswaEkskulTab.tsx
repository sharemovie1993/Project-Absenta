import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Compass,
  Calendar,
  Sparkles,
  Users,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Shield,
  Info,
  Clock,
  Award,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getAnggotaKegiatanEskul, type AnggotaKegiatanEskulItem } from '@/api/attendance/anggotaKegiatanEskul.api';
import { getPembinaKegiatanEskul, type PembinaKegiatanEskulItem } from '@/api/attendance/pembinaKegiatanEskul.api';
import { jenisKegiatanMasterApi, type JenisKegiatanMasterItem } from '@/api/academic/jenisKegiatanMaster.api';
import { getJadwalKegiatan, type JadwalKegiatanItem } from '@/api/attendance/jadwalKegiatan.api';
import { EskulWorkspaceHub } from '../../ekskul/components/EskulWorkspaceHub';
import { Loader } from '@/components/ui';
import { cn } from '@/lib/utils';

interface SiswaEkskulTabProps {
  studentProfile?: {
    id?: string;
    nis?: string;
    nisn?: string;
    nama?: string;
    nama_siswa?: string;
    kelas_id?: string;
    kelas_nama?: string;
    foto?: string;
    foto_url?: string;
    ekskul_1?: string;
    ekskul_2?: string;
    ekskuls?: string[];
  };
}

interface EnrolledEskulInfo {
  id: string;
  nama: string;
  kategori: string;
  deskripsi?: string;
  pembinaList: Array<{
    id: string;
    nama_guru: string;
    nip?: string;
    eskul_nama?: string;
  }>;
  jadwalList: JadwalKegiatanItem[];
  members: AnggotaKegiatanEskulItem[];
  memberCount: number;
}

export const SiswaEkskulTab: React.FC<SiswaEkskulTabProps> = ({ studentProfile }) => {
  const { user } = useAuthStore();
  const [selectedEskulIndex, setSelectedEskulIndex] = useState(0);

  // 1. Fetch data master dan keanggotaan
  const { data: anggotaList = [], isLoading: loadingAnggota } = useQuery({
    queryKey: ['siswa-ekskul-anggota-all'],
    queryFn: () => getAnggotaKegiatanEskul('ALL'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: pembinaList = [], isLoading: loadingPembina } = useQuery({
    queryKey: ['siswa-ekskul-pembina-all'],
    queryFn: () => getPembinaKegiatanEskul('ALL'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: eskulMasters = [], isLoading: loadingMasters } = useQuery({
    queryKey: ['siswa-ekskul-masters'],
    queryFn: async () => {
      const all = await jenisKegiatanMasterApi.getAll();
      return (all || []).filter((item: JenisKegiatanMasterItem) => item.kategori === 'ESKUL');
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: jadwalList = [], isLoading: loadingJadwal } = useQuery({
    queryKey: ['siswa-ekskul-jadwal-all'],
    queryFn: async () => {
      const res = await getJadwalKegiatan({ aktif: true });
      return (res || []).filter((j: JadwalKegiatanItem) => j.kategori === 'ESKUL');
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingAnggota || loadingPembina || loadingMasters || loadingJadwal;

  // 2. Deteksi eskul yang diikuti siswa
  const enrolledEskuls = useMemo<EnrolledEskulInfo[]>(() => {
    const studentId = studentProfile?.id || (user as any)?.siswa_id;
    const studentNis = studentProfile?.nis || (user as any)?.username || (user as any)?.nis;
    const studentName = (studentProfile?.nama || studentProfile?.nama_siswa || user?.full_name || '').toLowerCase();

    // Eskul dari tabel AnggotaKegiatanEskul
    const myMemberships = anggotaList.filter((m) => {
      if (studentId && m.siswa_akademik_id === studentId) return true;
      if (studentNis && m.nis && m.nis === studentNis) return true;
      if (studentName && m.nama_siswa && m.nama_siswa.toLowerCase() === studentName) return true;
      return false;
    });

    // Eskul dari studentProfile (ekskul_1, ekskul_2, ekskuls array)
    const profileEskulNames = new Set<string>();
    if (studentProfile?.ekskul_1) profileEskulNames.add(studentProfile.ekskul_1.trim().toLowerCase());
    if (studentProfile?.ekskul_2) profileEskulNames.add(studentProfile.ekskul_2.trim().toLowerCase());
    if (Array.isArray(studentProfile?.ekskuls)) {
      studentProfile.ekskuls.forEach((e) => e && profileEskulNames.add(e.trim().toLowerCase()));
    }

    const enrolledMap = new Map<string, EnrolledEskulInfo>();

    // Tambahkan dari membership
    myMemberships.forEach((m) => {
      const eskulKey = (m.eskul_id || m.eskul_nama || 'unknown').toLowerCase();
      if (!enrolledMap.has(eskulKey)) {
        const master = eskulMasters.find((mas) => mas.id === m.eskul_id || mas.nama.toLowerCase() === (m.eskul_nama || '').toLowerCase());
        const eskulNama = m.eskul_nama || master?.nama || 'Ekstrakurikuler';
        const eskulId = m.eskul_id || master?.id || eskulKey;

        // Ambil pembina untuk eskul ini
        const pembinas = pembinaList
          .filter((p) => p.jenis_kegiatan_id === eskulId || (p.eskul_nama && p.eskul_nama.toLowerCase() === eskulNama.toLowerCase()))
          .map((p) => ({
            id: p.id,
            nama_guru: p.nama_guru || p.guru?.nama || 'Guru Pembina',
            nip: p.nip || p.guru?.nip,
            eskul_nama: eskulNama,
          }));

        // Ambil jadwal untuk eskul ini
        const jadwals = jadwalList.filter(
          (j) => j.jenis_kegiatan_id === eskulId || j.nama.toLowerCase().includes(eskulNama.toLowerCase())
        );

        // Ambil sesama anggota eskul ini
        const groupMembers = anggotaList.filter(
          (item) => (item.eskul_id && item.eskul_id === eskulId) || (item.eskul_nama && item.eskul_nama.toLowerCase() === eskulNama.toLowerCase())
        );

        enrolledMap.set(eskulKey, {
          id: eskulId,
          nama: eskulNama,
          kategori: master?.tipe || 'Ekstrakurikuler Pilihan',
          deskripsi: master?.deskripsi,
          pembinaList: pembinas,
          jadwalList: jadwals,
          members: groupMembers,
          memberCount: groupMembers.length,
        });
      }
    });

    // Tambahkan jika ada di profil tetapi belum tercatat di membership table
    eskulMasters.forEach((mas) => {
      const masKey = mas.id.toLowerCase();
      const masNameKey = mas.nama.trim().toLowerCase();
      if (profileEskulNames.has(masNameKey) && !enrolledMap.has(masKey) && !enrolledMap.has(masNameKey)) {
        const pembinas = pembinaList
          .filter((p) => p.jenis_kegiatan_id === mas.id || (p.eskul_nama && p.eskul_nama.toLowerCase() === mas.nama.toLowerCase()))
          .map((p) => ({
            id: p.id,
            nama_guru: p.nama_guru || p.guru?.nama || 'Guru Pembina',
            nip: p.nip || p.guru?.nip,
            eskul_nama: mas.nama,
          }));

        const jadwals = jadwalList.filter(
          (j) => j.jenis_kegiatan_id === mas.id || j.nama.toLowerCase().includes(mas.nama.toLowerCase())
        );

        const groupMembers = anggotaList.filter(
          (item) => (item.eskul_id && item.eskul_id === mas.id) || (item.eskul_nama && item.eskul_nama.toLowerCase() === mas.nama.toLowerCase())
        );

        enrolledMap.set(masKey, {
          id: mas.id,
          nama: mas.nama,
          kategori: mas.tipe || 'Ekstrakurikuler Pilihan',
          deskripsi: mas.deskripsi,
          pembinaList: pembinas,
          jadwalList: jadwals,
          members: groupMembers,
          memberCount: groupMembers.length,
        });
      }
    });

    return Array.from(enrolledMap.values());
  }, [studentProfile, user, anggotaList, pembinaList, eskulMasters, jadwalList]);

  // Handle fallback jika selected index di luar batas
  const safeIndex = selectedEskulIndex < enrolledEskuls.length ? selectedEskulIndex : 0;
  const activeEskul = enrolledEskuls[safeIndex];

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <Loader size="lg" />
        <span className="text-xs font-semibold text-slate-500">Memuat Ekosistem Ekstrakurikuler Siswa...</span>
      </div>
    );
  }

  // JIKA SISWA BELUM TERDAFTAR DI EKSTRAKURIKULER MANAPUN
  if (enrolledEskuls.length === 0) {
    return (
      <div className="space-y-6">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/30 border border-indigo-100 dark:border-indigo-950/80 shadow-xs text-center max-w-3xl mx-auto space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
            <Compass size={32} />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 px-3 py-1 bg-indigo-50 dark:bg-indigo-950 rounded-full border border-indigo-200 dark:border-indigo-900">
              Eskul Workspace
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Anda Belum Terdaftar di Ekstrakurikuler
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
              Bergabunglah dengan salah satu ekstrakurikuler untuk mengembangkan minat, bakat, kepemimpinan, dan meraih poin prestasi di rapor kesiswaan.
            </p>
          </div>

          {/* Daftar Rekomendasi Eskul yang Tersedia di Sekolah */}
          {eskulMasters.length > 0 && (
            <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800 text-left space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500" />
                <span>Pilihan Ekstrakurikuler di Sekolah:</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {eskulMasters.map((mas) => {
                  const pembinas = pembinaList.filter(
                    (p) => p.jenis_kegiatan_id === mas.id || (p.eskul_nama && p.eskul_nama.toLowerCase() === mas.nama.toLowerCase())
                  );
                  return (
                    <div
                      key={mas.id}
                      className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 transition-all flex items-start gap-3 shadow-2xs"
                    >
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Award size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {mas.nama}
                        </h5>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {pembinas.length > 0 ? `Pembina: ${pembinas.map(p => p.nama_guru).join(', ')}` : 'Pembina Pembimbing'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                <Info size={14} className="shrink-0" />
                <span>
                  Hubungi Guru Pembina atau Staf Kesiswaan untuk mendaftarkan nama Anda ke dalam sistem anggota eskul.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Jika Siswa Mengikuti Lebih Dari 1 Eskul: Tab Switcher */}
      {enrolledEskuls.length > 1 && (
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 shrink-0">
            Eskul Saya ({enrolledEskuls.length}):
          </span>
          {enrolledEskuls.map((esk, idx) => {
            const isSelected = idx === safeIndex;
            return (
              <button
                key={esk.id || idx}
                type="button"
                onClick={() => setSelectedEskulIndex(idx)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer',
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700/60'
                )}
              >
                <Compass size={14} />
                <span>{esk.nama}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Eskul Workspace Hub Terpadu (Universal Role-Ready View untuk Siswa) */}
      {activeEskul && (
        <EskulWorkspaceHub
          key={activeEskul.id}
          role="SISWA"
          eskulId={activeEskul.id}
          eskulNama={activeEskul.nama}
          eskulKategori={activeEskul.kategori}
          pembinaList={activeEskul.pembinaList}
          jadwalList={activeEskul.jadwalList}
          members={activeEskul.members.map((m) => ({
            id: m.id,
            nis: m.nis,
            nama_siswa: m.nama_siswa,
            kelas: m.kelas,
            joined_at: m.joined_at,
          }))}
          memberCount={activeEskul.memberCount}
          studentProfile={{
            id: studentProfile?.id || (user as any)?.siswa_id,
            nis: studentProfile?.nis || (user as any)?.username,
            nisn: studentProfile?.nisn,
            nama_siswa: studentProfile?.nama || studentProfile?.nama_siswa || user?.full_name,
            kelas: studentProfile?.kelas_nama,
            foto_url: studentProfile?.foto || studentProfile?.foto_url,
          }}
          raporGrade={{
            predikat: 'A',
            keterangan: 'Aktif dan berkontribusi secara konsisten dalam seluruh latihan dan kegiatan.',
          }}
        />
      )}
    </div>
  );
};

import React, { useMemo } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
  PrintHeader,
  usePrintHeaderData,
  normalizeTeacherIdentity,
} from '@/components/ui/PrintHeader';
import { useQuery } from '@tanstack/react-query';
import { listGuruMapel } from '@/api/kurikulum/guru-mapel.api';
import { guruApi } from '@/api/academic.api';
import { safeArr } from '@/components/kurikulum/dashboard/DashboardComponents';

interface BebanMengajarPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  tahunPelajaranId?: string;
  tahunPelajaranNama?: string;
  semesterNama?: string;
}

export const BebanMengajarPrintModal: React.FC<BebanMengajarPrintModalProps> = ({
  isOpen,
  onClose,
  tahunPelajaranId,
  tahunPelajaranNama = '2026/2027',
  semesterNama = 'Ganjil',
}) => {
  const { tenantInfo, logoDaerahBase64, logoSekolahBase64 } = usePrintHeaderData();

  // Query Guru & GuruMapel
  const { data: rawGurus, isLoading: lGuru } = useQuery({
    queryKey: ['guru-for-print-sk'],
    queryFn: () => guruApi.getAll({ limit: 1000, jenis_ptk: 'PENDIDIK' }),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const { data: rawMapelList, isLoading: lMapel } = useQuery({
    queryKey: ['guru-mapel-for-print-sk'],
    queryFn: () => listGuruMapel({ limit: 2000 }),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const guruMapelData = useMemo(() => {
    const gurus = safeArr<any>(rawGurus?.data || rawGurus);
    const mappings = safeArr<any>(rawMapelList?.data || rawMapelList);

    // Map teacher workloads
    return gurus.map((g, idx) => {
      const teacherMappings = mappings.filter(
        (m: any) => m.guru_id === g.id || m.Guru?.id === g.id
      );

      const mapelList = Array.from(
        new Set(
          teacherMappings
            .map((m: any) => m.MataPelajaran?.nama_mapel || m.nama_mapel)
            .filter(Boolean)
        )
      );

      const kelasList = Array.from(
        new Set(
          teacherMappings
            .map((m: any) => m.Kelas?.nama_kelas || m.nama_kelas)
            .filter(Boolean)
        )
      );

      const totalJp = teacherMappings.reduce(
        (acc: number, curr: any) => acc + (curr.total_jam || curr.MataPelajaran?.jam_pelajaran || 2),
        0
      );

      const teacherIdentity = normalizeTeacherIdentity(g);

      return {
        no: idx + 1,
        id: g.id,
        nama: teacherIdentity.namaLengkapGelar,
        nip: teacherIdentity.nipClean || '-',
        golongan: teacherIdentity.pangkatGolongan,
        mapel: mapelList.join(', ') || '-',
        kelas: kelasList.join(', ') || '-',
        totalJp,
      };
    }).filter(g => g.totalJp > 0 || g.mapel !== '-');
  }, [rawGurus, rawMapelList]);

  const titimangsa = useMemo(() => {
    const kota = tenantInfo?.kabupaten || tenantInfo?.kota || 'Bandung';
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `${kota}, ${today}`;
  }, [tenantInfo]);

  const totalAllJp = useMemo(() => {
    return guruMapelData.reduce((acc, curr) => acc + curr.totalJp, 0);
  }, [guruMapelData]);

  const isLoading = lGuru || lMapel;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak SK & Lampiran Pembagian Tugas Mengajar"
      subtitle={`Distribusi Beban Mengajar Guru TP ${tahunPelajaranNama} Semester ${semesterNama}`}
      allowLogoToggles={true}
      orientation="landscape"
    >
      <div className="flex flex-col items-center justify-center p-2 sm:p-4">
        <PrintDocumentSheet pageNumber={1} totalPages={1} orientation="landscape">
          {/* 1. KOP SURAT RESMI */}
          <PrintHeader
            sekolah={tenantInfo as any}
            tenantInfo={tenantInfo}
            logoDaerahBase64={logoDaerahBase64}
            logoSekolahBase64={logoSekolahBase64}
          />

          {/* 2. JUDUL DOKUMEN */}
          <div className="text-center my-4 space-y-0.5">
            <h1 className="text-sm font-black uppercase tracking-wider text-black">
              LAMPIRAN SURAT KEPUTUSAN KEPALA SEKOLAH
            </h1>
            <p className="text-xs font-bold text-black uppercase">
              TENTANG PEMBAGIAN TUGAS GURU DALAM PROSES BELAJAR MENGAJAR
            </p>
            <p className="text-[11px] text-slate-800 font-medium">
              TAHUN PELAJARAN {tahunPelajaranNama} — SEMESTER {semesterNama.toUpperCase()}
            </p>
          </div>

          {/* 3. TABEL DISTRIBUSI BEBAN GURU */}
          <div className="my-4">
            {isLoading ? (
              <div className="text-center py-12 text-xs text-slate-500">
                Menghitung rekapitulasi beban mengajar guru...
              </div>
            ) : guruMapelData.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 italic border border-dashed border-slate-300 rounded-lg">
                Belum ada data penugasan guru mapel yang tercatat.
              </div>
            ) : (
              <table className="w-full text-[10px] border-collapse border border-black/50">
                <thead>
                  <tr className="bg-slate-100 text-black border-b border-black/40">
                    <th className="p-1.5 text-center w-8 border-r border-black/30">No</th>
                    <th className="p-1.5 text-left border-r border-black/30">Nama Guru</th>
                    <th className="p-1.5 text-center w-36 border-r border-black/30">NIP / NUPTK</th>
                    <th className="p-1.5 text-center w-24 border-r border-black/30">Gol / Ruang</th>
                    <th className="p-1.5 text-left border-r border-black/30">Mata Pelajaran Diampu</th>
                    <th className="p-1.5 text-left border-r border-black/30">Kelas Mengajar</th>
                    <th className="p-1.5 text-center w-16">Total JP</th>
                  </tr>
                </thead>
                <tbody>
                  {guruMapelData.map((item, idx) => (
                    <tr key={item.id} className="border-b border-black/15 text-black">
                      <td className="p-1 text-center border-r border-black/15">{idx + 1}</td>
                      <td className="p-1 border-r border-black/15 font-bold">{item.nama}</td>
                      <td className="p-1 text-center border-r border-black/15 font-mono">{item.nip}</td>
                      <td className="p-1 text-center border-r border-black/15">{item.golongan}</td>
                      <td className="p-1 border-r border-black/15 font-medium">{item.mapel}</td>
                      <td className="p-1 border-r border-black/15">{item.kelas}</td>
                      <td className="p-1 text-center font-black">
                        {item.totalJp}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-black border-t-2 border-black/40 text-black">
                    <td colSpan={6} className="p-1.5 text-right uppercase tracking-wider border-r border-black/30">
                      Total Alokasi Beban Mengajar Keseluruhan:
                    </td>
                    <td className="p-1.5 text-center text-xs">
                      {totalAllJp} JP
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* 4. TANDA TANGAN DINAS MENGGUNAKAN UNIVERSAL SIGNATURE ENGINE */}
          <div className="mt-6 pt-2 break-inside-avoid w-full">
            <UniversalDocumentSignatures
              layout="dual_unit_kepsek"
              tahunPelajaranId={tahunPelajaranId}
              titimangsaDate={titimangsa}
              showTitimangsa={false}
              overrideSignerLeft={{
                roleTitle: 'Mengetahui / Memeriksa,\nWakasek Bidang Kurikulum',
                personName: tenantInfo?.waka_kurikulum_nama,
                nip: tenantInfo?.waka_kurikulum_nip,
              }}
              overrideSignerRight={{
                roleTitle: `${titimangsa}\nKepala Sekolah`,
                personName: tenantInfo?.kepsek_nama,
                nip: tenantInfo?.kepsek_nip,
              }}
              spacingHeightMm={18}
            />
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};

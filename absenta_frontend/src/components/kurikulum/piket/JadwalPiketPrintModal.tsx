import React, { useMemo } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import { JadwalPiketGuru } from '@/api/piketGuru.api';

interface JadwalPiketPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: JadwalPiketGuru[];
  tahunPelajaranNama?: string;
  semesterNama?: string;
}

const HARI_ORDER = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

export const JadwalPiketPrintModal: React.FC<JadwalPiketPrintModalProps> = ({
  isOpen,
  onClose,
  schedules = [],
  tahunPelajaranNama = '2026/2027',
  semesterNama = 'Ganjil',
}) => {
  const { tenantInfo, logoDaerahBase64, logoSekolahBase64 } = usePrintHeaderData();

  const groupedByHari = useMemo(() => {
    const map = new Map<string, JadwalPiketGuru[]>();
    HARI_ORDER.forEach((h) => map.set(h, []));

    schedules.forEach((item) => {
      const h = (item.hari || '').toUpperCase();
      if (map.has(h)) {
        map.get(h)!.push(item);
      }
    });

    return map;
  }, [schedules]);

  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }, []);

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Cetak Jadwal Piket Guru"
      documentTitle={`Jadwal Piket Guru - ${tahunPelajaranNama}`}
      maxWidthClass="max-w-5xl"
    >
      <PrintDocumentSheet
        orientation="portrait"
        sheetId="sheet-jadwal-piket"
        className="p-8 text-black bg-white"
      >
        {/* Header Dinas & Sekolah */}
        <PrintHeader
          title="JADWAL PENUGASAN GURU PIKET HARIAN"
          subtitle={`SEMESTER ${semesterNama.toUpperCase()} TAHUN AJARAN ${tahunPelajaranNama.toUpperCase()}`}
          logoKiri={logoDaerahBase64 || undefined}
          logoKanan={logoSekolahBase64 || undefined}
        />

        {/* Sub Header Information */}
        <div className="my-3 text-xs font-medium flex justify-between items-center border-b border-black pb-2">
          <div>
            <span className="font-bold">Lampiran:</span> SK Kepala Sekolah tentang Pembagian Tugas Guru Piket
          </div>
          <div>
            <span className="font-bold">Semester / T.A:</span> {semesterNama} / {tahunPelajaranNama}
          </div>
        </div>

        {/* Schedule Table grouped by Hari */}
        <table className="w-full border-collapse border border-black text-[11px] my-3">
          <thead>
            <tr className="bg-slate-100 border-b border-black text-center font-bold">
              <th className="border border-black p-1.5 w-12">Hari</th>
              <th className="border border-black p-1.5 w-8">No</th>
              <th className="border border-black p-1.5 text-left">Nama Pendidik & NIP</th>
              <th className="border border-black p-1.5 w-24">Waktu Tugas</th>
              <th className="border border-black p-1.5 w-36">Pos / Lokasi</th>
            </tr>
          </thead>
          <tbody>
            {HARI_ORDER.map((hari) => {
              const list = groupedByHari.get(hari) || [];
              if (list.length === 0) {
                return (
                  <tr key={hari} className="border-b border-black">
                    <td className="border border-black font-bold p-1.5 text-center bg-slate-50 uppercase">
                      {hari}
                    </td>
                    <td colSpan={4} className="border border-black p-1.5 text-center text-slate-400 italic">
                      Tidak ada penugasan piket
                    </td>
                  </tr>
                );
              }

              return list.map((item, idx) => (
                <tr key={`${hari}-${item.id || idx}`} className="border-b border-black">
                  {idx === 0 && (
                    <td
                      rowSpan={list.length}
                      className="border border-black font-bold p-1.5 text-center bg-slate-50 uppercase align-middle"
                    >
                      {hari}
                    </td>
                  )}
                  <td className="border border-black p-1 text-center font-medium">{idx + 1}</td>
                  <td className="border border-black p-1 font-medium">
                    <div className="font-bold text-slate-900">{item.Guru?.nama_guru || '-'}</div>
                    {item.Guru?.nip && (
                      <div className="text-[10px] text-slate-600 font-mono">NIP: {item.Guru.nip}</div>
                    )}
                  </td>
                  <td className="border border-black p-1 text-center text-[10.5px]">
                    {item.jam_mulai && item.jam_selesai
                      ? `${item.jam_mulai.slice(0, 5)} - ${item.jam_selesai.slice(0, 5)}`
                      : 'Sepanjang KBM'}
                  </td>
                  <td className="border border-black p-1 text-center font-medium">
                    {item.pos_piket || 'Pos Utama'}
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>

        {/* 2-Tier Signature */}
        <div className="mt-8 flex justify-between items-start text-xs text-black page-break-inside-avoid">
          {/* Signature 1: Waka Kurikulum */}
          <div className="text-center w-64">
            <div>Mengetahui,</div>
            <div className="font-bold">Waka Bidang Kurikulum</div>
            <div className="h-20" />
            <div className="font-bold underline">
              {tenantInfo?.waka_kurikulum_nama || '(..................................................)'}
            </div>
            <div className="text-[11px] font-mono">
              NIP. {tenantInfo?.waka_kurikulum_nip || '................................'}
            </div>
          </div>

          {/* Signature 2: Kepala Sekolah */}
          <div className="text-center w-64">
            <div>
              {tenantInfo?.kabupaten || 'Bandung'}, {todayStr}
            </div>
            <div className="font-bold">Kepala Sekolah</div>
            <div className="h-20" />
            <div className="font-bold underline">
              {tenantInfo?.kepala_sekolah_nama || '(..................................................)'}
            </div>
            <div className="text-[11px] font-mono">
              NIP. {tenantInfo?.kepala_sekolah_nip || '................................'}
            </div>
          </div>
        </div>
      </PrintDocumentSheet>
    </UniversalDocumentModal>
  );
};

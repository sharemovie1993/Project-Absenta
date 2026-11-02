import React, { useMemo } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import type { CalendarEvent } from './EventFormModal';
import { formatDate } from '@/utils/layoutUtils';

interface KalenderAkademikPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  tahunPelajaranNama?: string;
}

export const KalenderAkademikPrintModal: React.FC<KalenderAkademikPrintModalProps> = ({
  isOpen,
  onClose,
  events = [],
  tahunPelajaranNama = '2026/2027',
}) => {
  const { tenantInfo, logoDaerahBase64, logoSekolahBase64 } = usePrintHeaderData();

  // Group events by month
  const groupedEvents = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const sorted = [...events].sort(
      (a, b) => new Date(a.tanggal_mulai).getTime() - new Date(b.tanggal_mulai).getTime()
    );

    sorted.forEach((ev) => {
      const d = new Date(ev.tanggal_mulai);
      if (!isNaN(d.getTime())) {
        const monthKey = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        if (!map.has(monthKey)) map.set(monthKey, []);
        map.get(monthKey)!.push(ev);
      }
    });

    return Array.from(map.entries());
  }, [events]);

  const titimangsa = useMemo(() => {
    const kota = tenantInfo?.kabupaten || tenantInfo?.kota || 'Bandung';
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `${kota}, ${today}`;
  }, [tenantInfo]);

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Kalender Akademik Sekolah"
      subtitle={`Kalender Pendidikan & Agenda Kegiatan Resmi TP ${tahunPelajaranNama}`}
      allowLogoToggles={true}
      orientation="portrait"
    >
      <div className="flex flex-col items-center justify-center p-2 sm:p-4">
        <PrintDocumentSheet pageNumber={1} totalPages={1} orientation="portrait">
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
              KALENDER AKADEMIK & AGENDA KEGIATAN SEKOLAH
            </h1>
            <p className="text-xs font-bold text-black uppercase">
              TAHUN PELAJARAN {tahunPelajaranNama}
            </p>
          </div>

          {/* 3. DAFTAR AGENDA PER BULAN */}
          <div className="space-y-4 my-4">
            {groupedEvents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 italic border border-dashed border-slate-300 rounded-lg">
                Belum ada agenda atau event kalender akademik yang tercatat pada tahun pelajaran ini.
              </div>
            ) : (
              <div className="space-y-3">
                {groupedEvents.map(([monthName, monthEvents]) => (
                  <div key={monthName} className="border border-black/40 rounded overflow-hidden">
                    <div className="bg-slate-100 px-3 py-1 text-xs font-bold text-black border-b border-black/30 flex items-center justify-between">
                      <span className="uppercase">{monthName}</span>
                      <span className="text-[10px] font-normal">{monthEvents.length} Kegiatan</span>
                    </div>
                    <table className="w-full text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-black border-b border-black/20">
                          <th className="p-1.5 text-center w-8 border-r border-black/20">No</th>
                          <th className="p-1.5 text-left w-36 border-r border-black/20">Tanggal</th>
                          <th className="p-1.5 text-left border-r border-black/20">Nama Agenda / Kegiatan</th>
                          <th className="p-1.5 text-center w-28 border-r border-black/20">Kategori</th>
                          <th className="p-1.5 text-left w-44">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthEvents.map((ev, idx) => (
                          <tr key={ev.id} className="border-b border-black/10 text-black">
                            <td className="p-1.5 text-center border-r border-black/10">{idx + 1}</td>
                            <td className="p-1.5 border-r border-black/10 font-medium">
                              {formatDate(ev.tanggal_mulai)}
                              {ev.tanggal_selesai && ev.tanggal_selesai !== ev.tanggal_mulai
                                ? ` s.d. ${formatDate(ev.tanggal_selesai)}`
                                : ''}
                            </td>
                            <td className="p-1.5 border-r border-black/10 font-bold">{ev.judul}</td>
                            <td className="p-1.5 text-center border-r border-black/10 text-[10px] uppercase">
                              {ev.jenis}
                            </td>
                            <td className="p-1.5 text-slate-700">{ev.keterangan || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. TANDA TANGAN DINAS 2-TIER (Anti-Cutoff Compliant) */}
          <div className="mt-8 pt-4 break-inside-avoid text-black text-xs">
            <div className="grid grid-cols-2 gap-4">
              {/* Kolom Kiri: Verifikator Wakasek Kurikulum */}
              <div className="space-y-16">
                <div>
                  <p className="font-normal">Mengetahui,</p>
                  <p className="font-bold">Wakasek Bidang Kurikulum</p>
                </div>
                <div>
                  <p className="font-bold underline">
                    {tenantInfo?.waka_kurikulum_nama || '( .................................................... )'}
                  </p>
                  <p className="text-[10px] text-slate-800">
                    NIP. {tenantInfo?.waka_kurikulum_nip || '....................................................'}
                  </p>
                </div>
              </div>

              {/* Kolom Kanan: Titimangsa & Kepala Sekolah */}
              <div className="space-y-16">
                <div>
                  <p className="font-normal">{titimangsa}</p>
                  <p className="font-bold">Kepala Sekolah</p>
                </div>
                <div>
                  <p className="font-bold underline">
                    {tenantInfo?.kepsek_nama || '( .................................................... )'}
                  </p>
                  <p className="text-[10px] text-slate-800">
                    NIP. {tenantInfo?.kepsek_nip || '....................................................'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};

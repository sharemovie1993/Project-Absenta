import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '../../ui';
import { Printer, Copy, Check, BookOpen, Users, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axiosInstance';
import toast from 'react-hot-toast';
import { CoopDocumentKop } from '../shared/CoopDocumentKop';
import { ResolutionTextRenderer } from './ResolutionTextRenderer';
import { getAgendaMinuteRequirement, cleanAgendaTitle } from './ratAgendaClassifier';

interface RatProceedingsPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  coopName?: string;
  meetingLocation?: string | null;
  meetingDate?: string | null;
}

export const RatProceedingsPrintModal: React.FC<RatProceedingsPrintModalProps> = React.memo(({
  isOpen,
  onClose,
  meetingId,
  coopName = 'KOPERASI KONSUMEN / SIMPAN PINJAM',
  meetingLocation,
  meetingDate,
}) => {
  const [copied, setCopied] = useState(false);
  const [presidium, setPresidium] = useState({
    chairperson: '',
    secretary: '',
    member: '',
  });

  // Load presidium from local storage
  useEffect(() => {
    if (meetingId && isOpen) {
      try {
        const saved = localStorage.getItem(`absenta_rat_presidium_${meetingId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setPresidium({
            chairperson: parsed.chairperson || '',
            secretary: parsed.secretary || '',
            member: parsed.member || '',
          });
        }
      } catch {
        // ignore storage error
      }
    }
  }, [meetingId, isOpen]);

  const handlePresidiumChange = (field: 'chairperson' | 'secretary' | 'member', value: string) => {
    const updated = { ...presidium, [field]: value };
    setPresidium(updated);
    try {
      localStorage.setItem(`absenta_rat_presidium_${meetingId}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Fetch full proceedings
  const { data: docData, isLoading } = useQuery({
    queryKey: ['coop-rat-proceedings', meetingId],
    queryFn: async () => {
      const res = await api.get(`/cooperative/rat/${meetingId}/proceedings-document`);
      return res.data?.data || null;
    },
    enabled: isOpen && !!meetingId,
    staleTime: 30 * 1000,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const el = document.getElementById('printable-rat-proceedings');
    if (!el) return;
    const text = el.innerText;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Naskah Berita Acara & Risalah berhasil disalin');
    setTimeout(() => setCopied(false), 2500);
  };

  const formattedDate = meetingDate ? new Date(meetingDate).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) : 'Hari ini';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Salinan Berita Acara & Risalah Resmi Sidang RAT"
      size="4xl"
    >
      <div className="space-y-6">
        {/* ACTION TOOLBAR (HIDDEN ON PRINT) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Dokumen Otentik Risalah Pleno RAT
            </span>
            <Badge variant="success" className="text-[10px] whitespace-nowrap">Lengkap & Otentik</Badge>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="toolbar"
              variant="toolbarOutline"
              onClick={handleCopy}
              className="gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Naskah'}</span>
            </Button>
            <Button
              type="button"
              size="toolbar"
              variant="toolbarPrimary"
              onClick={handlePrint}
              className="gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Risalah (PDF)</span>
            </Button>
          </div>
        </div>

        {/* PRESIDIUM INTEGRATION BAR (HIDDEN ON PRINT) */}
        <div className="p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 space-y-2.5 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Nama Presidium Sidang / Notulis (Tercetak di Lembar Pengesahan):
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                Ketua Presidium
              </label>
              <input
                type="text"
                value={presidium.chairperson}
                onChange={(e) => handlePresidiumChange('chairperson', e.target.value)}
                placeholder="Contoh: Drs. H. Ahmad Fauzi"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                Sekretaris Presidium / Notulis
              </label>
              <input
                type="text"
                value={presidium.secretary}
                onChange={(e) => handlePresidiumChange('secretary', e.target.value)}
                placeholder="Contoh: Dra. Siti Rahmawati"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                Anggota Presidium
              </label>
              <input
                type="text"
                value={presidium.member}
                onChange={(e) => handlePresidiumChange('member', e.target.value)}
                placeholder="Contoh: Budi Santoso, S.Kom."
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* PRINTABLE OFFICIAL PROCEEDINGS CONTAINER */}
        <div
          id="printable-rat-proceedings"
          className="p-8 md:p-12 rounded-xl bg-white text-slate-900 border border-slate-200 shadow-sm font-serif space-y-6 print:shadow-none print:border-none print:p-0"
        >
          {/* KOP SURAT RESMI KOPERASI */}
          <CoopDocumentKop
            coopNameFallback={coopName}
            subtitle="RAPAT ANGGOTA TAHUNAN (RAT)"
            subtext="Berdasarkan Undang-Undang Nomor 25 Tahun 1992 tentang Perkoperasian"
            showDoubleBorder={true}
          />

          {/* DOKUMEN TITLE */}
          <div className="text-center space-y-1 pt-1">
            <h3 className="text-base md:text-lg font-black underline uppercase tracking-wider">
              BERITA ACARA & RISALAH LENGKAP SIDANG RAT
            </h3>
            <p className="font-mono text-xs md:text-sm font-bold text-slate-700">
              NOMOR: BA/RAT-{docData?.meeting?.fiscalYear || new Date().getFullYear()}/01
            </p>
          </div>

          {/* DASAR PEMBUKAAN PERSIDANGAN */}
          <div className="text-xs sm:text-sm leading-relaxed space-y-2 text-justify">
            <p>
              Pada hari ini, <strong>{formattedDate}</strong>, bertempat di <strong>{meetingLocation || docData?.meeting?.location || 'Aula Pertemuan Utama'}</strong>, telah diselenggarakan Rapat Anggota Tahunan (RAT) Tahun Buku {docData?.meeting?.fiscalYear || new Date().getFullYear()} yang dihadiri secara sah oleh anggota koperasi:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Jumlah Peserta Hadir Fisik / Online: <strong>{docData?.meeting?.actualAttendance || 0} orang</strong></li>
              <li>Jumlah Seluruh Anggota Terdaftar: <strong>{docData?.meeting?.totalActiveMembers || 0} orang</strong></li>
              <li>Status Kuorum Sidang: <strong>{docData?.meeting?.isQuorumReached ? 'SAH & MEMENUHI KUORUM (50% + 1)' : 'BELUM KUORUM'}</strong></li>
            </ul>
          </div>

          {/* KRONOLOGI PER-AGENDA & NOTULENSI */}
          <div className="space-y-6 pt-4 border-t border-slate-900">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
              KRONOLOGI JALANNYA PERSIDANGAN & NOTULENSI BUTIR ACARA
            </h4>

            {isLoading ? (
              <div className="py-8 text-center text-slate-400">Memuat risalah lengkap...</div>
            ) : (docData?.minutesByAgenda || []).map((item: any, idx: number) => {
              const req = getAgendaMinuteRequirement(item.agenda?.title || '');
              return (
                <div key={item.agenda.id} className="space-y-2.5 pb-4 border-b border-dashed border-slate-200">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-xs sm:text-sm uppercase text-slate-900">
                        Acara {idx + 1}: {cleanAgendaTitle(item.agenda.title)}
                      </h5>
                      <span className="text-[9px] font-sans font-semibold px-1.5 py-0.5 rounded border text-slate-600 border-slate-300">
                        {req.label}
                      </span>
                    </div>
                    <span className="text-[10px] font-sans font-semibold text-slate-500 uppercase">
                      Status: {item.agenda.status || 'COMPLETED'}
                    </span>
                  </div>

                  {/* Notulensi Dinamika */}
                  {(item.minutes || []).length > 0 ? (
                    <div className="space-y-2 pl-4 border-l-2 border-slate-300">
                      {item.minutes.map((m: any, mIdx: number) => (
                        <div key={m.id || mIdx} className="text-xs space-y-0.5">
                          <div className="font-semibold text-slate-800">
                            • [{m.timeRecord || 'Waktu Sidang'}] {m.speakerName ? `${m.speakerName} (${m.speakerRole || 'Peserta'}): ` : ''}
                            <span className="font-bold underline">{m.topic}</span>
                          </div>
                          <p className="text-slate-700 pl-3 leading-relaxed whitespace-pre-wrap">
                            {m.content}
                          </p>
                          {m.actionItem && (
                            <p className="text-slate-600 pl-3 italic text-[11px]">
                              ↳ Tindak Lanjut: {m.actionItem}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic pl-4">
                      {req.obligation === 'CEREMONIAL'
                        ? '(Diselenggarakan secara khidmat dan tertib sesuai tata tertib protokoler sidang RAT).'
                        : req.obligation === 'ADVISORY'
                        ? '(Penyampaian arahan dan amanat pembinaan koperasi telah disampaikan dan disimak oleh seluruh peserta sidang).'
                        : '(Materi acara substantif telah dibahas dan disahkan secara bulat/aklamasi oleh peserta sidang pleno).'}
                    </p>
                  )}

                {/* TAP RAT Terkait */}
                {item.resolution && (
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-bold text-slate-900 block">
                      Ketetapan Hukum Terbit: {item.resolution.number || item.resolution.resolutionNo}
                    </span>
                    <span className="text-slate-700">{item.resolution.title || item.resolution.subject}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

          {/* PENGESAHAN PRESIDIUM & PENGURUS */}
          <div className="pt-6 space-y-6">
            <p className="text-xs leading-relaxed text-justify">
              Demikian Berita Acara dan Risalah Resmi ini dibuat dengan sebenarnya sesuai jalannya musyawarah persidangan yang sah, tertib, dan berkekuatan hukum mengikat seluruh jajaran koperasi.
            </p>

            <div className="text-center font-bold text-xs uppercase pt-2">
              PRESIDIUM SIDANG RAT TAHUN BUKU {docData?.meeting?.fiscalYear || new Date().getFullYear()}
            </div>

            <div className="grid grid-cols-3 gap-4 text-center text-xs pt-2">
              <div className="space-y-16">
                <p className="font-bold">Ketua Presidium,</p>
                <div>
                  <p className="font-bold underline">{presidium.chairperson || '....................................'}</p>
                  <p className="text-[10px] text-slate-500">Pimpinan Sidang Pleno</p>
                </div>
              </div>

              <div className="space-y-16">
                <p className="font-bold">Sekretaris / Notulis,</p>
                <div>
                  <p className="font-bold underline">{presidium.secretary || '....................................'}</p>
                  <p className="text-[10px] text-slate-500">Pencatat Risalah Sidang</p>
                </div>
              </div>

              <div className="space-y-16">
                <p className="font-bold">Anggota Presidium,</p>
                <div>
                  <p className="font-bold underline">{presidium.member || '....................................'}</p>
                  <p className="text-[10px] text-slate-500">Anggota Presidium</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
});

RatProceedingsPrintModal.displayName = 'RatProceedingsPrintModal';

export default RatProceedingsPrintModal;

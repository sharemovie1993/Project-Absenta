import React from 'react';
import { Button } from '../../../components/ui/Button';
import {
  Check, Clock, Printer, FileText, Award,
  Paperclip, Edit2, Trash2, Send, ChevronRight, User, BookOpen
} from 'lucide-react';
import type { PemanggilanOrangTua } from '../../../api/bpbk.api';
import { bpbkApi } from '../../../api/bpbk.api';
import { toast } from 'sonner';

/* ── helpers ──────────────────────────────────────────────── */
type Status = PemanggilanOrangTua['status'];

function stepIndex(status: Status) {
  if (status === 'BARU')                              return 0;
  if (status === 'DIKIRIM')                           return 1;
  if (status === 'HADIR' || status === 'TIDAK_HADIR') return 2;
  return 0;
}

function fmtDate(val?: string | null) {
  if (!val) return null;
  return new Date(val).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

/* ── props ────────────────────────────────────────────────── */
export interface PemanggilanCardProps {
  item: PemanggilanOrangTua;
  requireApproval?: boolean;
  onMarkSent:  (id: string) => Promise<void>;
  onEdit:      (item: PemanggilanOrangTua) => void;
  onDelete:    (id: string) => void;
  onPrint:     (item: PemanggilanOrangTua, type: string) => void;
  onOpenDoc:   (siswaId: string, docId: string, fileName: string) => Promise<void>;
  onNavigate:  (siswaId: string) => void;
}

/* ── component ────────────────────────────────────────────── */
export const PemanggilanCard: React.FC<PemanggilanCardProps> = ({
  item, requireApproval = true, onMarkSent, onEdit, onDelete, onPrint, onOpenDoc, onNavigate
}) => {
  const status  = item.status;
  const current = stepIndex(status);
  const isFinal = status === 'HADIR';
  const [sending, setSending] = React.useState(false);
  const [sendingWa, setSendingWa] = React.useState(false);

  const handleSendWa = async () => {
    setSendingWa(true);
    const toastId = toast.loading('Mengirim surat panggilan ke WhatsApp Orang Tua...');
    try {
      const res = await bpbkApi.sendWhatsAppParent(item.id);
      if (res.success) {
        toast.success(res.message || 'Surat panggilan berhasil dikirim via WhatsApp ke Orang Tua!', { id: toastId });
      } else {
        toast.error(res.message || 'Gagal mengirim WhatsApp.', { id: toastId });
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Gagal mengirim WhatsApp.', { id: toastId });
    } finally {
      setSendingWa(false);
    }
  };

  const handleMarkSent = async () => {
    setSending(true);
    try { await onMarkSent(item.id); }
    finally { setSending(false); }
  };

  /* Helper to check status of each step */
  const getStepStatus = (idx: number) => {
    if (idx < current || (idx === 2 && isFinal)) {
      return { label: 'Selesai', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500' };
    }
    if (idx === current && !isFinal) {
      if (status === 'TIDAK_HADIR' && idx === 2) {
        return { label: 'Tidak Hadir', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-500' };
      }
      return { label: 'Perlu Tindakan', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500 ring-4 ring-indigo-100 dark:ring-indigo-950/20' };
    }
    return { label: 'Belum Mulai', color: 'text-slate-400', bg: 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' };
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-sm">
      
      {/* Profil Ringkas Siswa */}
      <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <button
          onClick={() => item.Siswa?.id && onNavigate(item.Siswa.id)}
          className="group flex items-center gap-2.5 text-left"
          title="Klik untuk membuka profil lengkap siswa"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <User size={16} />
          </div>
          <div>
            <div className="font-bold text-xs text-slate-500 uppercase tracking-widest leading-none">Nama Siswa</div>
            <div className="font-black text-sm text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors group-hover:underline mt-0.5">
              {item.Siswa?.nama_siswa || '—'}
            </div>
          </div>
        </button>

        <div className="text-right">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Kelas / NIS</div>
          <div className="font-bold text-xs text-slate-700 dark:text-slate-300 mt-0.5">
            {item.Siswa?.Kelas?.nama_kelas || '—'} • {item.Siswa?.nis || '—'}
          </div>
        </div>
      </div>

      {/* Alasan Pemanggilan */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-1.5">
        <div className="flex items-center gap-1.5 text-slate-400">
          <BookOpen size={13} />
          <span className="text-[10px] font-black uppercase tracking-wider">Alasan Pemanggilan Orang Tua</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60">
          {item.alasan}
        </p>
      </div>

      {/* Alur Progres Langkah Demi Langkah */}
      <div className="p-5 space-y-6">
        
        {/* Langkah 1: Surat Dibuat */}
        {(() => {
          const s = getStepStatus(0);
          return (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black text-xs transition-all ${s.bg} ${s.color}`}>
                  {current > 0 ? <Check size={14} strokeWidth={3} /> : '1'}
                </div>
                <div className={`w-0.5 h-12 my-1 ${current > 0 ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-800'}`} />
              </div>
              <div className="space-y-1 pt-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Langkah 1: Pembuatan Surat Panggilan</h4>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${s.color}`}>{s.label}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Surat resmi panggilan orang tua telah berhasil dibuat di sistem pada rencana tanggal: <strong>{fmtDate(item.tanggal_pemanggilan)}</strong>.
                </p>
                <div className="pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => onPrint(item, 'letter_bk_call')}
                    className="h-8 text-[10px] font-bold gap-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-emerald-200/50"
                  >
                    <Printer size={12} />
                    Cetak Surat Panggilan Fisik
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Langkah 2: Persetujuan Kepala Sekolah & Pengiriman */}
        {(() => {
          const s = getStepStatus(1);
          const done = current > 1;
          const active = current === 1;

          // Parse phone numbers
          const parentPhones = item.Siswa?.OrangTuaSiswa?.map(o => o.OrangTua?.no_hp).filter(Boolean) || [];
          const studentPhone = item.Siswa?.no_hp;
          const hasNumber = parentPhones.length > 0 || !!studentPhone;

          return (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black text-xs transition-all ${s.bg} ${s.color}`}>
                  {done ? <Check size={14} strokeWidth={3} /> : '2'}
                </div>
                <div className={`w-0.5 h-12 my-1 ${done ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-800'}`} />
              </div>
              <div className="space-y-1 pt-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                    {requireApproval ? 'Langkah 2: Persetujuan Kepala Sekolah & Pengiriman' : 'Langkah 2: Pengiriman Surat'}
                  </h4>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${active && status === 'BARU' && requireApproval ? 'text-amber-600' : s.color}`}>
                    {active && status === 'BARU' && requireApproval ? 'Menunggu Persetujuan' : s.label}
                  </span>
                </div>
                
                {status === 'BARU' && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/30 p-2.5 rounded-xl">
                      ⏳ Draf surat panggilan otomatis terdaftar di menu <strong>Surat Keluar</strong>. Surat akan aktif setelah disetujui & ditandatangani oleh Kepala Sekolah.
                    </p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <Button
                        variant="toolbarPrimary"
                        onClick={handleMarkSent}
                        disabled={sending}
                        className="h-8 text-[10px] font-black gap-1.5"
                      >
                        <Send size={11} />
                        {sending ? 'Memproses...' : 'Setujui Manual & Kirim (Bypass)'}
                        <ChevronRight size={11} />
                      </Button>
                    </div>
                  </div>
                )}

                {status === 'DIKIRIM' && (
                  <div className="space-y-2.5">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {requireApproval 
                        ? '✓ Surat telah disetujui oleh Kepala Sekolah (atau ditandai terkirim manual) dan siap diserahkan ke wali murid.'
                        : '✓ Surat langsung terbit tanpa perlu persetujuan Kepala Sekolah.'}
                    </p>

                    {hasNumber ? (
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex flex-col gap-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-2 rounded-lg">
                          {parentPhones.length > 0 ? (
                            <span>🎯 Target WhatsApp: <strong>Orang Tua ({parentPhones.join(', ')})</strong></span>
                          ) : (
                            <span>🎯 Target WhatsApp: <strong>Siswa ({studentPhone}) (Fallback)</strong></span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="toolbarPrimary"
                            onClick={handleSendWa}
                            disabled={sendingWa}
                            className="h-8 text-[10px] font-black gap-1.5"
                          >
                            <Send size={11} />
                            {sendingWa ? 'Mengirim...' : 'Kirim Surat via WhatsApp'}
                            <ChevronRight size={11} />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 rounded-xl text-[11px] text-rose-600 dark:text-rose-400 leading-normal">
                          ⚠️ Nomor WhatsApp Orang Tua & Siswa belum diisi di database kesiswaan. Pengiriman digital tidak dapat dilakukan.
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            onClick={() => onPrint(item, 'letter_bk_call')}
                            className="h-8 text-[10px] font-bold gap-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-emerald-200/50 px-3"
                          >
                            <Printer size={12} />
                            Cetak Surat Panggilan Fisik
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {status !== 'BARU' && status !== 'DIKIRIM' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    ✓ Surat telah disetujui, dikirimkan ke orang tua, dan proses kehadiran telah dicatat.
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Langkah 3: Pertemuan & Catatan Hasil */}
        {(() => {
          const s = getStepStatus(2);
          return (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black text-xs transition-all ${s.bg} ${s.color}`}>
                  {isFinal ? <Check size={14} strokeWidth={3} /> : '3'}
                </div>
              </div>
              <div className="space-y-1 pt-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Langkah 3: Pertemuan Wali Murid & Hasil</h4>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${s.color}`}>{s.label}</span>
                </div>
                
                {status === 'BARU' && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Menunggu proses persetujuan Langkah 2 selesai terlebih dahulu.
                  </p>
                )}

                {status === 'DIKIRIM' && (
                  <div className="space-y-2.5">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      📬 Surat disetujui. Tunggu kehadiran orang tua siswa di sekolah sesuai tanggal rencana pertemuan, kemudian catat komitmen & hasil di sini.
                    </p>
                    <Button
                      variant="toolbarPrimary"
                      onClick={() => onEdit(item)}
                      className="h-8 text-[10px] font-black gap-1.5"
                    >
                      <Edit2 size={11} />
                      Catat Hasil Pertemuan
                      <ChevronRight size={11} />
                    </Button>
                  </div>
                )}

                {status === 'HADIR' && (
                  <div className="space-y-2.5">
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-xl space-y-1">
                      <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Hasil Keputusan:</div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                        {item.keterangan_pertemuan || 'Tidak ada keterangan tambahan.'}
                      </p>
                      <div className="text-[9px] text-slate-400 mt-1">
                        Hadir pada tanggal: <strong>{fmtDate(item.tanggal_pertemuan)}</strong>
                      </div>
                    </div>

                    {/* Dokumen Lampiran */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <Button
                        variant="ghost"
                        onClick={() => onPrint(item, 'bk_minutes')}
                        className="h-8 text-[10px] font-bold gap-1 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/20 border border-teal-200/50"
                      >
                        <FileText size={12} />
                        Cetak Berita Acara
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => onPrint(item, 'bk_statement')}
                        className="h-8 text-[10px] font-bold gap-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 border border-amber-200/50"
                      >
                        <Award size={12} />
                        Cetak Surat Pernyataan
                      </Button>
                      {item.Dokumen && (
                        <Button
                          variant="ghost"
                          onClick={() => onOpenDoc(item.Siswa?.id || item.siswa_id, item.Dokumen!.id, item.Dokumen!.file_original_name)}
                          className="h-8 text-[10px] font-bold gap-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 border border-blue-200/50"
                        >
                          <Paperclip size={12} />
                          Buka Berita Acara Digital
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {status === 'TIDAK_HADIR' && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                    Orang tua terkonfirmasi Mangkir / Tidak Hadir dari rencana pertemuan.
                  </p>
                )}
              </div>
            </div>
          );
        })()}

      </div>

      {/* Footer Aksi Hapus (Hanya jika belum final/HADIR) */}
      {!isFinal && (
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button
            variant="ghost"
            onClick={() => onDelete(item.id)}
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1 text-[10px] font-bold h-8"
          >
            <Trash2 size={12} />
            Batalkan Panggilan Ini
          </Button>
        </div>
      )}

    </div>
  );
};


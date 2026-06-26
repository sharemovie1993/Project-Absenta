import React from 'react';
import { Calendar, CheckCircle, MessageSquare, MailOpen, Home, Send } from 'lucide-react';
import { Modal, Badge, Button } from '@/components/ui';
import { type KasusBK, type KonselingSiswa, type PemanggilanOrangTua, type HomeVisit, type AsesmenSiswa, type RujukanKasus } from '@/api/bpbk.api';

interface CaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCase: KasusBK | null;
  getKategoriColor: (kat: string) => string;
  getStatusColor: (status: string) => string;
  getPrioritasColor: (prio: string) => string;
  getVisibilityColor: (vis: string) => string;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({
  isOpen,
  onClose,
  selectedCase,
  getKategoriColor,
  getStatusColor,
  getPrioritasColor,
  getVisibilityColor
}) => {
  if (!selectedCase) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rincian Kasus BK & Layanan Terintegrasi"
      size="3xl"
    >
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* Header profile */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 flex items-center justify-center font-black text-rose-500 text-sm">
              {selectedCase.Siswa?.nama_siswa?.charAt(0)}
            </div>
            <div>
              <div className="font-black text-slate-800 dark:text-white text-xs">{selectedCase.Siswa?.nama_siswa}</div>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">NIS: {selectedCase.Siswa?.nis} • Kelas: {selectedCase.Siswa?.Kelas?.nama_kelas || '-'}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={`text-[8px] font-black uppercase ${getKategoriColor(selectedCase.kategori)}`}>
              KATEGORI: {selectedCase.kategori}
            </Badge>
            <Badge variant="outline" className={`text-[8px] font-black uppercase ${getPrioritasColor(selectedCase.prioritas)}`}>
              PRIORITAS: {selectedCase.prioritas}
            </Badge>
            <Badge variant="outline" className={`text-[8px] font-black uppercase ${getStatusColor(selectedCase.status)}`}>
              STATUS: {selectedCase.status}
            </Badge>
            <Badge variant="outline" className={`text-[8px] font-black uppercase ${getVisibilityColor(selectedCase.visibility)}`}>
              PRIVASI: {selectedCase.visibility}
            </Badge>
          </div>
        </div>

        {/* Case details text */}
        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">{selectedCase.judul}</div>
          <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
            <Calendar size={12} /> Terdaftar Tanggal: {new Date(selectedCase.tanggal_kasus).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {selectedCase.keterangan || 'Tidak ada catatan kronologi detail.'}
          </div>
        </div>

        {selectedCase.status === 'SELESAI' && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl space-y-2">
            <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle size={14} className="text-emerald-500" />
              <span>Resolusi Kasus Selesai</span>
            </div>
            {selectedCase.closed_at && (
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                Tanggal Selesai: {new Date(selectedCase.closed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}
            {selectedCase.catatan_selesai && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold leading-relaxed whitespace-pre-line italic">
                &ldquo;{selectedCase.catatan_selesai}&rdquo;
              </p>
            )}
          </div>
        )}

        {/* Linked sub-components */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Layanan & Rekaman Terintegrasi</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Layanan Konseling */}
            <div className="p-4 border border-slate-200/40 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <MessageSquare size={14} className="text-emerald-500" />
                <span>Layanan Konseling ({selectedCase.KonselingSiswa?.length || 0})</span>
              </div>
              {selectedCase.KonselingSiswa && selectedCase.KonselingSiswa.length > 0 ? (
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {selectedCase.KonselingSiswa.map((c: KonselingSiswa) => (
                    <div key={c.id} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-xl text-[11px]">
                      <div className="flex justify-between font-bold text-slate-500 mb-0.5">
                        <span>{new Date(c.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                        <Badge variant="outline" className="text-[7px] uppercase font-black">{c.tipe}</Badge>
                      </div>
                      <p className="font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">{c.masalah}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] font-bold text-slate-400 italic py-2 uppercase tracking-wide">Belum ada sesi konseling.</p>
              )}
            </div>

            {/* Pemanggilan Ortu */}
            <div className="p-4 border border-slate-200/40 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <MailOpen size={14} className="text-rose-500" />
                <span>Pemanggilan Orang Tua ({selectedCase.PemanggilanOrangTua?.length || 0})</span>
              </div>
              {selectedCase.PemanggilanOrangTua && selectedCase.PemanggilanOrangTua.length > 0 ? (
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {selectedCase.PemanggilanOrangTua.map((p: PemanggilanOrangTua) => (
                    <div key={p.id} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-xl text-[11px]">
                      <div className="flex justify-between font-bold text-slate-500 mb-0.5">
                        <span>{new Date(p.tanggal_pemanggilan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                        <Badge variant={p.status === 'HADIR' ? 'success' : 'warning'} className="text-[7px] uppercase font-black">{p.status}</Badge>
                      </div>
                      <p className="font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">{p.alasan}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] font-bold text-slate-400 italic py-2 uppercase tracking-wide">Belum ada pemanggilan ortu.</p>
              )}
            </div>

            {/* Home Visit */}
            <div className="p-4 border border-slate-200/40 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <Home size={14} className="text-violet-500" />
                <span>Kunjungan Rumah / Home Visit ({selectedCase.HomeVisit?.length || 0})</span>
              </div>
              {selectedCase.HomeVisit && selectedCase.HomeVisit.length > 0 ? (
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {selectedCase.HomeVisit.map((hv: HomeVisit) => (
                    <div key={hv.id} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-xl text-[11px]">
                      <div className="font-bold text-slate-500 mb-0.5">
                        {new Date(hv.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <p className="font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">{hv.alasan}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] font-bold text-slate-400 italic py-2 uppercase tracking-wide">Belum ada kunjungan rumah.</p>
              )}
            </div>

            {/* Rujukan & Asesmen */}
            <div className="p-4 border border-slate-200/40 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <Send size={14} className="text-cyan-500" />
                <span>Rujukan & Angket ({ (selectedCase.RujukanKasus?.length || 0) + (selectedCase.AsesmenSiswa?.length || 0) })</span>
              </div>
              <div className="space-y-2 max-h-36 overflow-y-auto text-[11px]">
                {selectedCase.RujukanKasus?.map((r: RujukanKasus) => (
                  <div key={r.id} className="p-2.5 bg-white dark:bg-slate-900 border border-cyan-100 dark:border-cyan-950 rounded-xl">
                    <div className="flex justify-between font-bold text-cyan-600 dark:text-cyan-400 mb-0.5">
                      <span>RUJUKAN: {r.rujukan_ke}</span>
                      <span>{new Date(r.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">{r.alasan}</p>
                  </div>
                ))}
                {selectedCase.AsesmenSiswa?.map((a: AsesmenSiswa) => (
                  <div key={a.id} className="p-2.5 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950 rounded-xl">
                    <div className="flex justify-between font-bold text-purple-600 dark:text-purple-400 mb-0.5">
                      <span>ASESMEN: {a.nama_asesmen}</span>
                      <span>{new Date(a.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">Hasil: {a.hasil_skor || '-'}</p>
                  </div>
                ))}
                {(!selectedCase.RujukanKasus?.length && !selectedCase.AsesmenSiswa?.length) && (
                  <p className="text-[10px] font-bold text-slate-400 italic py-2 uppercase tracking-wide">Belum ada rujukan atau asesmen.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} className="text-xs font-bold h-10 px-6 rounded-xl">
            Tutup Detail
          </Button>
        </div>
      </div>
    </Modal>
  );
};

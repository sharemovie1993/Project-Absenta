import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Award, 
  Save, 
  X, 
  UserPlus, 
  FileCheck2, 
  Sparkles,
  Info
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useGuruOptions } from '@/hooks/useGuruOptions';
import toast from 'react-hot-toast';
import { assignKetarunaanPanitia, type KetarunaanPanitiaMember } from '@/api/kesiswaan/programKetarunaan.api';

interface KetarunaanPanitiaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: KetarunaanPanitiaMember | null;
}

export const KETARUNAAN_ROLES = [
  { value: 'KETUA', label: 'Ketua Pembina Taruna', defaultTitle: 'Ketua Pembina Taruna', icon: '👑', desc: 'Koordinator utama seluruh rangkaian kegiatan Ketarunaan' },
  { value: 'WAKIL_KETUA', label: 'Wakil Ketua / Koordinator Operasional', defaultTitle: 'Wakil Ketua Pembina Taruna', icon: '⭐', desc: 'Membantu ketua dalam koordinasi lapangan harian' },
  { value: 'SEKRETARIS', label: 'Sekretaris & Administrasi', defaultTitle: 'Sekretaris Kepanitiaan Taruna', icon: '📝', desc: 'Pencatatan data taruna, presensi, sertifikat & surat tugas' },
  { value: 'BENDAHARA', label: 'Bendahara & Logistik', defaultTitle: 'Bendahara Kepanitiaan Taruna', icon: '💰', desc: 'Pengelolaan anggaran operasional dan perlengkapan taruna' },
  { value: 'KORLAP', label: 'Koordinator Lapangan & Pelatih PBB', defaultTitle: 'Koordinator Pelatih PBB & Lapangan', icon: '📢', desc: 'Memimpin baris-berbaris, apel, tata upacara & instruktur' },
  { value: 'SEKSI_DISIPLIN', label: 'Seksi Kedisiplinan & Tata Tertib', defaultTitle: 'Seksi Kedisiplinan & Tata Tertib', icon: '🛡️', desc: 'Pemeriksaan atribut seragam, razia ketertiban & sanksi taruna' },
  { value: 'PENGUJI_FISIK', label: 'Seksi Kesamaptaan & Penguji Fisik', defaultTitle: 'Penguji Kesamaptaan Jasmani', icon: '🏃', desc: 'Penguji 4 pilar fisik taruna (lari, push-up, sit-up, pull-up)' },
  { value: 'PEMBINA_POS', label: 'Pembina & Instruktur Posko', defaultTitle: 'Pembina Pos Lapangan Taruna', icon: '🚩', desc: 'Pendamping taruna di posko lapangan dan binaan peleton' },
];

export const KetarunaanPanitiaFormModal: React.FC<KetarunaanPanitiaFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const { rawList: guruList = [], isLoading: isLoadingGurus } = useGuruOptions({ jenisPtk: 'ALL' });
  
  const [selectedGuruId, setSelectedGuruId] = useState<string>('');
  const [roleType, setRoleType] = useState<string>('PEMBINA_POS');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [searchGuruTerm, setSearchGuruTerm] = useState<string>('');

  useEffect(() => {
    if (initialData) {
      setSelectedGuruId(initialData.guru_id || '');
      setRoleType(initialData.assignment_flag || (initialData.is_leader ? 'KETUA' : 'PEMBINA_POS'));
      setCustomTitle(initialData.custom_title || '');
    } else {
      setSelectedGuruId('');
      setRoleType('PEMBINA_POS');
      setCustomTitle('Pembina Pos Lapangan Taruna');
      setSearchGuruTerm('');
    }
  }, [initialData, isOpen]);

  const handleRoleChange = (newRole: string) => {
    setRoleType(newRole);
    const matched = KETARUNAAN_ROLES.find(r => r.value === newRole);
    if (matched && (!customTitle || KETARUNAAN_ROLES.some(r => r.defaultTitle === customTitle))) {
      setCustomTitle(matched.defaultTitle);
    }
  };

  const filteredGurus = useMemo(() => {
    if (!searchGuruTerm.trim()) return guruList.slice(0, 50);
    const term = searchGuruTerm.toLowerCase().trim();
    return guruList.filter(g => 
      (g.nama_guru || '').toLowerCase().includes(term) ||
      (g.nip || '').toLowerCase().includes(term)
    ).slice(0, 50);
  }, [guruList, searchGuruTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuruId) {
      toast.error('Pilih salah satu guru pembina.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await assignKetarunaanPanitia({
        guru_id: selectedGuruId,
        role_type: roleType,
        custom_title: customTitle.trim() || undefined,
        is_leader: roleType === 'KETUA',
      });

      toast.success(res?.message || 'Ploting panitia berhasil disimpan!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan ploting panitia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center">
            <Award size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {initialData ? 'Ubah Penugasan Panitia' : 'Ploting Panitia Ketarunaan Baru'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Alokasikan peran guru dalam struktur kepanitiaan korps ketarunaan
            </p>
          </div>
        </div>
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Info Alert RBAC */}
        <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
          <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="font-bold">Otomatis Terhubung ke RBAC & Navigasi:</span>
            <p className="text-[11px] opacity-90">
              Guru yang diploting otomatis memperoleh hak akses dan tombol menu <strong className="font-semibold">"Dashboard Ketarunaan"</strong> di portal beranda guru mereka.
            </p>
          </div>
        </div>

        {/* 1. Pilih Guru */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Pilih Guru / Pembina *</span>
            {selectedGuruId && (
              <span className="text-[11px] text-teal-600 font-semibold font-mono">
                Terpilih: {guruList.find(g => g.id === selectedGuruId)?.nama_guru}
              </span>
            )}
          </label>
          
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Cari nama guru atau NIP..."
              value={searchGuruTerm}
              onChange={(e) => setSearchGuruTerm(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            
            <select
              value={selectedGuruId}
              onChange={(e) => setSelectedGuruId(e.target.value)}
              required
              disabled={isLoadingGurus || Boolean(initialData)}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 disabled:opacity-60"
            >
              <option value="">-- Klik untuk memilih guru dari daftar ({filteredGurus.length} ditampilkan) --</option>
              {filteredGurus.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nama_guru} {g.nip ? `(NIP: ${g.nip})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. Pilih Jabatan / Peran Kepanitiaan */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Peran / Seksi dalam Kepanitiaan *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto no-scrollbar pr-1">
            {KETARUNAAN_ROLES.map((r) => {
              const isSelected = roleType === r.value;
              return (
                <div
                  key={r.value}
                  onClick={() => handleRoleChange(r.value)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 shadow-2xs'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span className="text-base select-none">{r.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate leading-tight">{r.label}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">{r.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Custom Title / Nama Jabatan Resmi */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Nama Jabatan / Penugasan di Dokumen / SK
          </label>
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="Contoh: Koordinator Pelatih PBB & Lapangan"
            className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
          <p className="text-[10px] text-slate-400">
            Nama ini akan dicetak pada Sertifikat Taruna, Berita Acara, dan tabel presensi pendamping.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl text-xs"
          >
            Batal
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !selectedGuruId}
            className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>Menyimpan...</>
            ) : (
              <>
                <Save size={14} />
                <span>Simpan Penugasan Panitia</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

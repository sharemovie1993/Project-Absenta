import React from 'react';
import { Building2, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DeskripsiTpItem, deskripsiTpSchema } from './types';
import toast from 'react-hot-toast';

export interface PklDeskripsiTpTabProps {
  mitraOptions: { value: string; label: string }[];
  selectedMitra: string;
  setSelectedMitra: (val: string) => void;
  deskripsiTpText: string;
  setDeskripsiTpText: (val: string) => void;
  onSave: (payload: { mitra_id: string; deskripsi_tp: string }) => void;
  isSaving: boolean;
  deskripsiListData: DeskripsiTpItem[];
  isLoadingDeskripsi: boolean;
}

export const PklDeskripsiTpTab: React.FC<PklDeskripsiTpTabProps> = ({
  mitraOptions,
  selectedMitra,
  setSelectedMitra,
  deskripsiTpText,
  setDeskripsiTpText,
  onSave,
  isSaving,
  deskripsiListData,
  isLoadingDeskripsi,
}) => {
  const handleSave = () => {
    const parsed = deskripsiTpSchema.safeParse({
      mitra_id: selectedMitra,
      deskripsi_tp: deskripsiTpText,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Data TP belum lengkap');
      return;
    }
    onSave({
      mitra_id: selectedMitra,
      deskripsi_tp: deskripsiTpText,
    });
  };

  return (
    <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-6">
      <div>
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
          <Building2 size={18} className="text-indigo-500" />
          Pengaturan Deskripsi Tujuan Pembelajaran (TP) PKL
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Diisi oleh Ketua Program Keahlian untuk narasi kompetensi yang dicetak pada sertifikat PKL.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="tp-mitra-select" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Pilih Perusahaan / Mitra DUDI
            </label>
            <SearchableSelect
              id="tp-mitra-select"
              aria-label="Pilih mitra DUDI untuk deskripsi TP"
              value={selectedMitra}
              onValueChange={setSelectedMitra}
              options={[
                { value: '', label: '-- Semua Mitra DUDI --' },
                ...(mitraOptions?.map((m) => ({ value: m.value, label: m.label })) || []),
              ]}
              placeholder="Pilih Mitra DUDI"
            />
          </div>

          <div>
            <label htmlFor="tp-deskripsi-text" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Deskripsi Capaian Pembelajaran PKL
            </label>
            <textarea
              id="tp-deskripsi-text"
              aria-label="Deskripsi capaian pembelajaran PKL"
              rows={6}
              value={deskripsiTpText}
              onChange={(e) => setDeskripsiTpText(e.target.value)}
              placeholder="Peserta didik mampu memahami dan mempraktikkan SOP industri..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-medium"
            />
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full font-bold rounded-xl text-xs"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {isSaving ? 'Menyimpan...' : 'Simpan Deskripsi TP DUDI'}
          </Button>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
            Daftar Deskripsi TP DUDI Tersimpan
          </h4>
          {isLoadingDeskripsi ? (
            <div className="text-center py-10 text-slate-400 text-xs">Memuat deskripsi...</div>
          ) : deskripsiListData?.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs italic">Belum ada deskripsi TP tersimpan.</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {deskripsiListData?.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-xs">
                  <div className="font-bold text-indigo-600 dark:text-indigo-400">🏢 {item.Mitra?.nama}</div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {item.deskripsi_tp}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default PklDeskripsiTpTab;

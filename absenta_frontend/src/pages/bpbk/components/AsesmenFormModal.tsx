import React, { useState, useEffect, lazy, Suspense } from 'react';
import { z } from 'zod';
import { Label } from '../../../components/ui/Label';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import toast from 'react-hot-toast';
import { uploadSiswaDocument } from '../../../api/academic/siswa.api';
import { bpbkApi, type AsesmenSiswa } from '../../../api/bpbk.api';
import { ASESMEN_PRESETS } from '../data/asesmenConstants';
import { AsesmenCalculator } from './AsesmenCalculator';

const Modal = lazy(() => import('../../../components/ui/Modal').then(m => ({ default: m.Modal })));
const SmartStudentPicker = lazy(() => import('../../../components/common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));

interface Student {
  id: string;
  nama_siswa?: string;
  nis?: string;
  Kelas?: {
    nama_kelas: string;
  };
}

interface AsesmenFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedId: string | null;
  editingItem: AsesmenSiswa | null;
}

// Zod Validation Schema matching all BK Assessment input fields
const asesmenFormSchema = z.object({
  siswa_id: z.string().min(1, 'Harap pilih siswa terlebih dahulu'),
  tanggal: z.string().refine(val => !isNaN(Date.parse(val)), 'Format tanggal tidak valid'),
  nama_asesmen: z.string().trim().min(1, 'Nama / tipe asesmen wajib diisi'),
  hasil_skor: z.string().optional(),
  keterangan: z.string().optional()
});

export const AsesmenFormModal: React.FC<AsesmenFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedId,
  editingItem
}) => {
  const [selectedSiswa, setSelectedSiswa] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    siswa_id: '',
    tanggal: new Date().toISOString().split('T')[0],
    nama_asesmen: '',
    hasil_skor: '',
    keterangan: '',
    file: null as File | null
  });

  const [saving, setSaving] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcPreset, setCalcPreset] = useState('VAK');

  useEffect(() => {
    if (editingItem) {
      setSelectedSiswa(editingItem.Siswa || null);
      setFormData({
        siswa_id: editingItem.siswa_id,
        tanggal: new Date(editingItem.tanggal).toISOString().split('T')[0],
        nama_asesmen: editingItem.nama_asesmen,
        hasil_skor: editingItem.hasil_skor || '',
        keterangan: editingItem.keterangan || '',
        file: null
      });
    } else {
      setSelectedSiswa(null);
      setFormData({
        siswa_id: '',
        tanggal: new Date().toISOString().split('T')[0],
        nama_asesmen: '',
        hasil_skor: '',
        keterangan: '',
        file: null
      });
    }
  }, [editingItem, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Zod Validation Guard
    const validation = asesmenFormSchema.safeParse({
      siswa_id: formData.siswa_id,
      tanggal: formData.tanggal,
      nama_asesmen: formData.nama_asesmen,
      hasil_skor: formData.hasil_skor,
      keterangan: formData.keterangan
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Isian formulir tidak valid';
      toast.error(firstError);
      return;
    }

    try {
      setSaving(true);
      let docId = undefined;

      if (formData.file) {
        const uploadRes = (await uploadSiswaDocument(
          formData.siswa_id,
          formData.file,
          `Hasil Asesmen: ${formData.nama_asesmen} - ${selectedSiswa?.nama_siswa || 'Siswa'}`,
          'LAPORAN_BK'
        )) as any;
        docId = uploadRes.data?.id;
      }

      const payload = {
        siswa_id: formData.siswa_id,
        tanggal: new Date(formData.tanggal),
        nama_asesmen: formData.nama_asesmen,
        hasil_skor: formData.hasil_skor || undefined,
        keterangan: formData.keterangan || undefined,
        dokumen_id: docId
      };

      if (selectedId) {
        await bpbkApi.updateAsesmen(selectedId, payload);
        toast.success('Catatan asesmen berhasil diperbarui');
      } else {
        await bpbkApi.createAsesmen(payload);
        toast.success('Hasil asesmen baru berhasil disimpan');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan hasil asesmen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Suspense fallback={null}>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={selectedId ? 'Perbarui Hasil Asesmen' : 'Catat Asesmen BK Baru'}
        size="5xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Form Fields */}
            <div className="lg:col-span-5 space-y-4 lg:border-r lg:border-slate-200/60 dark:lg:border-slate-800/60 lg:pr-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Siswa</Label>
                {selectedSiswa ? (
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/50 rounded-xl">
                    <div>
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{selectedSiswa.nama_siswa}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                        {(selectedSiswa as any).Kelas?.nama_kelas || (selectedSiswa as any).kelas_name || '-'} • NIS: {selectedSiswa.nis || '-'}
                      </div>
                    </div>
                    {!selectedId && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => {
                          setSelectedSiswa(null);
                          setFormData(prev => ({ ...prev, siswa_id: '' }));
                        }}
                        className="text-xs font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 py-1.5 rounded-lg"
                      >
                        UBAH
                      </Button>
                    )}
                  </div>
                ) : (
                  <Suspense fallback={<div className="h-10 bg-slate-100 animate-pulse rounded-xl" />}>
                    <SmartStudentPicker
                      scope="global"
                      onSelect={(s) => {
                        setSelectedSiswa(s);
                        setFormData(prev => ({ ...prev, siswa_id: s.id }));
                      }}
                      mode="siswa"
                      placeholder="Cari nama atau NIS siswa..."
                    />
                  </Suspense>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Tes</Label>
                  <Input
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                    className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Hasil / Kategori Skor</Label>
                  <Input
                    placeholder="Contoh: Sangat Kritis, Gaya Visual, dll"
                    value={formData.hasil_skor}
                    onChange={(e) => setFormData(prev => ({ ...prev, hasil_skor: e.target.value }))}
                    className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nama / Tipe Asesmen</Label>
                <Input
                  placeholder="Contoh: Angket Sosiometri Hubungan Sosial Kelas X-1"
                  value={formData.nama_asesmen}
                  onChange={(e) => setFormData(prev => ({ ...prev, nama_asesmen: e.target.value }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deskripsi-asesmen" className="text-xs font-bold uppercase tracking-wider text-slate-500">Deskripsi / Analisis Konselor</Label>
                <textarea
                  id="deskripsi-asesmen"
                  aria-label="Deskripsi / Analisis Konselor"
                  value={formData.keterangan}
                  onChange={(e) => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                  placeholder="Tulis analisis singkat hasil kuesioner..."
                  className="w-full min-h-[120px] p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Unggah Berkas Laporan Hasil Tes (Opsional)</Label>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFormData(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                  className="text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
            </div>

            {/* Right Column: Presets and Calculator */}
            <div className="lg:col-span-7 space-y-4">
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Preset Asesmen BK (Pilih untuk isi otomatis)</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Asesmen Massal (Klasikal / Semua Siswa)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ASESMEN_PRESETS.filter(p => p.kategori === 'Massal').map(preset => (
                        <button
                          key={preset.nama}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              nama_asesmen: preset.nama,
                              keterangan: preset.keterangan
                            }));
                            let mappedCalc = '';
                            if (preset.singkatan.includes('AKPD')) mappedCalc = 'AKPD';
                            else if (preset.singkatan.includes('Gaya Belajar') || preset.nama.includes('Gaya Belajar')) mappedCalc = 'VAK';
                            else if (preset.singkatan.includes('AUM Umum')) mappedCalc = 'AUM_UMUM';
                            else if (preset.singkatan.includes('AUM PTSDL')) mappedCalc = 'AUM_PTSDL';
                            else if (preset.singkatan.includes('DCM')) mappedCalc = 'DCM';
                            else if (preset.singkatan.includes('Sosiometri')) mappedCalc = 'Sosiometri';
                            else if (preset.singkatan.includes('RIASEC')) mappedCalc = 'RIASEC';
                            else if (preset.singkatan.includes('ITP')) mappedCalc = 'ITP';

                            if (mappedCalc) {
                              setCalcPreset(mappedCalc);
                              setShowCalculator(true);
                            }
                          }}
                          className="px-2 py-1 text-[9px] font-black rounded-lg border border-emerald-200/50 dark:border-emerald-900/30 hover:border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 transition-all cursor-pointer"
                        >
                          {preset.singkatan}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Asesmen Khusus (Fokus Masalah / Kasus)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ASESMEN_PRESETS.filter(p => p.kategori === 'Khusus').map(preset => (
                        <button
                          key={preset.nama}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              nama_asesmen: preset.nama,
                              keterangan: preset.keterangan
                            }));
                            let mappedCalc = '';
                            if (preset.singkatan.includes('AKPD')) mappedCalc = 'AKPD';
                            else if (preset.singkatan.includes('Gaya Belajar') || preset.nama.includes('Gaya Belajar')) mappedCalc = 'VAK';
                            else if (preset.singkatan.includes('AUM Umum')) mappedCalc = 'AUM_UMUM';
                            else if (preset.singkatan.includes('AUM PTSDL')) mappedCalc = 'AUM_PTSDL';
                            else if (preset.singkatan.includes('DCM')) mappedCalc = 'DCM';
                            else if (preset.singkatan.includes('Sosiometri')) mappedCalc = 'Sosiometri';
                            else if (preset.singkatan.includes('RIASEC')) mappedCalc = 'RIASEC';
                            else if (preset.singkatan.includes('ITP')) mappedCalc = 'ITP';

                            if (mappedCalc) {
                              setCalcPreset(mappedCalc);
                              setShowCalculator(true);
                            }
                          }}
                          className="px-2 py-1 text-[9px] font-black rounded-lg border border-amber-200/50 dark:border-amber-900/30 hover:border-amber-500 bg-amber-50/20 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-600 dark:text-amber-400 transition-all cursor-pointer"
                        >
                          {preset.singkatan}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* BK Scoring Calculator Tool */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Kalkulator Penskoran BK (Instan)</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowCalculator(!showCalculator)}
                    className="text-[10px] font-black h-7 px-2.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                  >
                    {showCalculator ? 'TUTUP KALKULATOR' : 'BUKA KALKULATOR'}
                  </Button>
                </div>

                {showCalculator && (
                  <AsesmenCalculator
                    calcPreset={calcPreset}
                    setCalcPreset={setCalcPreset}
                    onApply={(data) => {
                      setFormData(prev => ({
                        ...prev,
                        hasil_skor: data.hasil_skor,
                        keterangan: data.keterangan
                      }));
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
            <Button
              type="button"
              variant="toolbarOutline"
              onClick={onClose}
              className="text-xs h-9 rounded-lg"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="toolbarPrimary"
              disabled={saving}
              className="text-xs h-9 rounded-lg"
            >
              {saving ? 'Menyimpan...' : selectedId ? 'Simpan Perubahan' : 'Catat Asesmen'}
            </Button>
          </div>
        </form>
      </Modal>
    </Suspense>
  );
};

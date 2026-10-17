import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Button } from '../../ui';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { coopAccountApi } from '@/api/coopAccount.api';
import type { SavingCategory } from './types';

interface CatFormData {
  code: string;
  name: string;
  description: string;
  color: string;
  order: number;
  isMandatory: boolean;
  isWithdrawable: boolean;
  withdrawRule: string;
  defaultAmount: string;
  isIncludedInShu: boolean;
  accountCode: string;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCategory: SavingCategory | null;
  catFormData: CatFormData;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onPresetColorSelect: (color: string) => void;
  onWithdrawRuleChange: (value: string) => void;
  onAccountCodeChange?: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  savingCat: boolean;
  presetColors: string[];
}

const withdrawRuleOptions = [
  { label: 'Kapan Saja (Bebas)', value: 'ANYTIME' },
  { label: 'Hanya Saat Mengundurkan Diri', value: 'RESIGN_ONLY' },
  { label: 'Hanya di Akhir Tahun Buku', value: 'YEAR_END' },
  { label: 'Hanya Menjelang Hari Raya (SHR)', value: 'HOLIDAY' }
];

export const CategoryModal = React.memo<CategoryModalProps>(({
  isOpen,
  onClose,
  editingCategory,
  catFormData,
  onInputChange,
  onPresetColorSelect,
  onWithdrawRuleChange,
  onAccountCodeChange,
  onSubmit,
  savingCat,
  presetColors
}) => {
  const { data: coaAccounts } = useQuery({
    queryKey: ['cooperative-coa-accounts', 'flat'],
    queryFn: () => coopAccountApi.getAccounts({ tree: false }),
    staleTime: 60 * 1000,
    enabled: isOpen,
  });

  const liabilityAccountOptions = useMemo(() => {
    const list = Array.isArray(coaAccounts) ? coaAccounts : (coaAccounts?.flat || []);
    if (list.length === 0) {
      return [
        { value: '2010', label: '2010 - Tabungan Sukarela Anggota' },
        { value: '2020', label: '2020 - Simpanan Pokok & Wajib' },
        { value: '2030', label: '2030 - Simpanan Berjangka' },
      ];
    }
    return list
      .filter((a) => !a.isHeader && (a.type === 'LIABILITY' || a.type === 'EQUITY' || a.code.startsWith('2')))
      .map((a) => ({
        value: a.code,
        label: `${a.code} - ${a.name}`,
      }));
  }, [coaAccounts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-955/80 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Modal Container */}
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              {editingCategory ? 'Edit Jenis Simpanan' : 'Tambah Jenis Simpanan'}
            </h3>
            <p className="text-[10px] text-slate-400">Konfigurasi parameter bisnis dan akuntansi simpanan</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={onSubmit}>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              {/* Category Code */}
              <div className="space-y-1.5">
                <label htmlFor="cat-code" className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Kode Jenis Simpanan <span className="text-red-500">*</span>
                </label>
                <input
                  id="cat-code"
                  type="text"
                  name="code"
                  value={catFormData.code}
                  onChange={onInputChange}
                  disabled={!!editingCategory}
                  placeholder="Misal: SHR, POKOK, WAJIB"
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-950 font-mono font-bold text-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              {/* Account Code */}
              <div className="space-y-1.5">
                <label htmlFor="cat-account-code" className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Kode Akun Jurnal (Chart of Account) <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  id="cat-account-code"
                  value={catFormData.accountCode}
                  onChange={(val) => {
                    if (onAccountCodeChange) {
                      onAccountCodeChange(String(val));
                    } else {
                      onInputChange({
                        target: { name: 'accountCode', value: String(val), type: 'text' }
                      } as unknown as React.ChangeEvent<HTMLInputElement>);
                    }
                  }}
                  options={liabilityAccountOptions}
                  placeholder="Pilih Akun Liabilitas / Simpanan..."
                  aria-label="Pilih Akun Jurnal Simpanan"
                />
              </div>
            </div>

            {/* Category Name */}
            <div className="space-y-1.5">
              <label htmlFor="cat-name-input" className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                Nama Simpanan <span className="text-red-500">*</span>
              </label>
              <input
                id="cat-name-input"
                type="text"
                name="name"
                value={catFormData.name}
                onChange={onInputChange}
                placeholder="Misal: Simpanan Hari Raya (SHR)"
                className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800 dark:text-slate-105"
                required
              />
            </div>

            {/* Category Description */}
            <div className="space-y-1.5">
              <label htmlFor="cat-desc-input" className="text-[10px] font-black text-slate-505 uppercase tracking-wider">
                Deskripsi / Aturan Simpanan
              </label>
              <textarea
                id="cat-desc-input"
                name="description"
                value={catFormData.description}
                onChange={onInputChange}
                rows={2}
                placeholder="Misal: Tabungan khusus persiapan Idul Fitri, dicairkan setahun sekali."
                className="w-full p-3 text-xs bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800 dark:text-slate-105 resize-none"
              />
            </div>

            {/* Preset Color Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                Pilih Warna Badge Visual
              </label>
              <div className="flex flex-wrap gap-2.5">
                {(presetColors || []).map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onPresetColorSelect(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                      catFormData.color === color
                        ? 'border-indigo-650 scale-110 shadow-sm'
                        : 'border-transparent opacity-75 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {catFormData.color === color && (
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Default Amount */}
              <div className="space-y-1.5">
                <label htmlFor="cat-default-amount" className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  {catFormData.code?.trim().toUpperCase() === 'POKOK' ? 'Nominal Setoran Awal 1x (Rp)' : 'Nominal Setoran Default (Rp)'}
                </label>
                <input
                  id="cat-default-amount"
                  type="number"
                  name="defaultAmount"
                  value={catFormData.defaultAmount}
                  onChange={onInputChange}
                  placeholder={catFormData.code?.trim().toUpperCase() === 'POKOK' ? 'Misal: 100000' : 'Kosongkan jika bebas'}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Order */}
              <div className="space-y-1.5">
                <label htmlFor="cat-order" className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Urutan Tampilan
                </label>
                <input
                  id="cat-order"
                  type="number"
                  name="order"
                  value={catFormData.order}
                  onChange={onInputChange}
                  placeholder="0"
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Banner Edukasi Regulasi Berdasarkan Kategori */}
            {(() => {
              const code = catFormData.code?.trim().toUpperCase();
              if (code === 'POKOK') {
                return (
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed flex items-start gap-2.5">
                    <span className="text-base leading-none select-none">🏛️</span>
                    <div>
                      <strong className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-0.5">
                        Edukasi Simpanan Pokok (Modal Dasar Koperasi)
                      </strong>
                      <span>
                        Simpanan Pokok adalah ekuitas awal anggota yang disetorkan <strong>hanya 1 (satu) kali saat mendaftar</strong>. Sesuai UU Perkoperasian, simpanan ini <em>dilarang ditagihkan bulanan</em> dan tidak dapat ditarik selama masih aktif menjadi anggota. Berkontribusi penuh dalam pembagian SHU Jasa Modal.
                      </span>
                    </div>
                  </div>
                );
              }
              if (code === 'WAJIB') {
                return (
                  <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 rounded-xl text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed flex items-start gap-2.5">
                    <span className="text-base leading-none select-none">📅</span>
                    <div>
                      <strong className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-200 mb-0.5">
                        Edukasi Simpanan Wajib (Iuran Rutin Anggota)
                      </strong>
                      <span>
                        Simpanan Wajib adalah kewajiban anggota yang disetor secara <strong>rutin setiap bulan</strong> dengan nominal yang sama sesuai kesepakatan RAT. Simpanan ini tidak dapat ditarik sewaktu-waktu (hanya saat keluar/berhenti) dan menjadi instrumen utama pemupukan modal kerja koperasi serta penghitungan SHU.
                      </span>
                    </div>
                  </div>
                );
              }
              if (code === 'SUKARELA') {
                return (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed flex items-start gap-2.5">
                    <span className="text-base leading-none select-none">💳</span>
                    <div>
                      <strong className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-200 mb-0.5">
                        Edukasi Simpanan Sukarela (Tabungan Fleksibel)
                      </strong>
                      <span>
                        Simpanan Sukarela berfungsi seperti tabungan rekening giro/harian. <strong>Tidak ada kewajiban setoran rutin bulanan</strong> (nominal bebas) dan <strong>dapat disetor maupun ditarik kapan saja</strong> sesuai kebutuhan likuiditas anggota tanpa harus mengundurkan diri dari koperasi.
                      </span>
                    </div>
                  </div>
                );
              }
              if (code === 'SHR' || code.includes('RAYA') || catFormData.name?.toLowerCase().includes('hari raya')) {
                return (
                  <div className="p-3.5 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50 rounded-xl text-[11px] text-teal-800 dark:text-teal-300 leading-relaxed flex items-start gap-2.5">
                    <span className="text-base leading-none select-none">🕌</span>
                    <div>
                      <strong className="block text-[11px] font-bold text-teal-900 dark:text-teal-200 mb-0.5">
                        Edukasi Simpanan Hari Raya / SHR (Simpanan Berjangka Khusus)
                      </strong>
                      <span>
                        SHR adalah simpanan terencana yang dikumpulkan anggota sepanjang tahun dan <strong>hanya dapat ditarik/dicairkan menjelang Hari Raya Idul Fitri</strong>. Membantu anggota mempersiapkan dana perayaan hari raya tanpa membebani keuangan bulanan secara mendadak.
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Boolean Rules */}
            <div className="p-4 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[11px] font-extrabold text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
                    Simpanan Wajib Bulanan?
                    {catFormData.code?.trim().toUpperCase() === 'POKOK' && (
                      <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-normal">
                        Terkunci OFF
                      </span>
                    )}
                  </p>
                  <p className="text-[9px] text-slate-400">
                    {catFormData.code?.trim().toUpperCase() === 'POKOK'
                      ? 'Dilarang untuk Simpanan Pokok (hanya 1x saat bergabung)'
                      : 'Anggota wajib menyetor nominal tertentu tiap bulan'
                    }
                  </p>
                </div>
                <label className={`relative inline-flex items-center ${catFormData.code?.trim().toUpperCase() === 'POKOK' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                  <input 
                    type="checkbox" 
                    name="isMandatory"
                    checked={catFormData.code?.trim().toUpperCase() === 'POKOK' ? false : catFormData.isMandatory}
                    onChange={onInputChange}
                    disabled={catFormData.code?.trim().toUpperCase() === 'POKOK'}
                    className="sr-only peer" 
                  />
                  <div className="w-8 h-4 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all dark:border-gray-650 peer-checked:bg-indigo-600" />
                </label>
              </div>

              <div className="flex justify-between items-center border-t border-dashed border-slate-200 dark:border-slate-800/60 pt-3">
                <div>
                  <p className="text-[11px] font-extrabold text-slate-850 dark:text-slate-200">Dapat Ditarik Anggota?</p>
                  <p className="text-[9px] text-slate-400">Apakah tabungan ini bisa ditarik sewaktu-waktu</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="isWithdrawable"
                    checked={catFormData.isWithdrawable}
                    onChange={onInputChange}
                    className="sr-only peer" 
                  />
                  <div className="w-8 h-4 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all dark:border-gray-650 peer-checked:bg-indigo-600" />
                </label>
              </div>

              {catFormData.isWithdrawable && (
                <div className="space-y-1.5 pt-1 border-t border-dashed border-slate-200 dark:border-slate-800/60">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    Aturan Penarikan
                  </label>
                  <SearchableSelect
                    value={catFormData.withdrawRule}
                    onValueChange={onWithdrawRuleChange}
                    options={withdrawRuleOptions}
                    placeholder="Pilih aturan penarikan..."
                  />
                </div>
              )}

              <div className="flex justify-between items-center border-t border-dashed border-slate-200 dark:border-slate-800/60 pt-3">
                <div>
                  <p className="text-[11px] font-extrabold text-slate-850 dark:text-slate-200">Dihitung Untuk Alokasi SHU?</p>
                  <p className="text-[9px] text-slate-400">Saldo jenis simpanan ini dihitung sebagai kontribusi Jasa Modal</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="isIncludedInShu"
                    checked={catFormData.isIncludedInShu}
                    onChange={onInputChange}
                    className="sr-only peer" 
                  />
                  <div className="w-8 h-4 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all dark:border-gray-650 peer-checked:bg-indigo-600" />
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-5 border-t border-slate-100 dark:border-slate-855 bg-slate-50/50 dark:bg-slate-950/20 flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs font-bold text-slate-500"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={savingCat}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
            >
              {savingCat ? 'Menyimpan...' : 'Simpan Kategori'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
});

CategoryModal.displayName = 'CategoryModal';

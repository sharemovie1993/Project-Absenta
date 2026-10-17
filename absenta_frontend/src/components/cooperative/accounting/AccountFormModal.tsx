import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { FolderTree, FileText, AlertCircle, Info } from 'lucide-react';
import type { 
  AccountNode, 
  AccountCategoryType, 
  CreateAccountPayload, 
  UpdateAccountPayload 
} from './types';

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAccountPayload | UpdateAccountPayload) => Promise<void>;
  editingAccount?: AccountNode | null;
  defaultParentId?: string | null;
  allAccounts: AccountNode[];
  isSubmitting?: boolean;
}

const ACCOUNT_TYPE_OPTIONS: Array<{ value: AccountCategoryType; label: string; description: string }> = [
  { value: 'ASSET', label: '1 - AKTIVA (Aset / Kas / Piutang)', description: 'Kas, bank, piutang anggota, persediaan toko, aktiva tetap' },
  { value: 'LIABILITY', label: '2 - KEWAJIBAN (Hutang / Simpanan)', description: 'Simpanan pokok/wajib/sukarela anggota, hutang operasional' },
  { value: 'EQUITY', label: '3 - EKUITAS (Modal / Dana Cadangan)', description: 'Modal koperasi, dana cadangan, donasi/hibah' },
  { value: 'REVENUE', label: '4 - PENDAPATAN (Penjualan / Jasa)', description: 'Penjualan toko, jasa pinjaman/bunga, pendapatan sewa' },
  { value: 'EXPENSE', label: '5 - BEBAN & BIAYA (Operasional)', description: 'Beban administrasi, listrik, ATK, pemeliharaan sarana' },
];

export const AccountFormModal: React.FC<AccountFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingAccount,
  defaultParentId,
  allAccounts,
  isSubmitting = false,
}) => {
  const isEdit = Boolean(editingAccount);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountCategoryType>('ASSET');
  const [isHeader, setIsHeader] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inisialisasi form state saat modal dibuka atau editingAccount berubah
  useEffect(() => {
    if (editingAccount) {
      setCode(editingAccount.code);
      setName(editingAccount.name);
      setType(editingAccount.type);
      setIsHeader(editingAccount.isHeader);
      setParentId(editingAccount.parentId);
      setErrorMsg(null);
    } else {
      setCode('');
      setName('');
      setType('ASSET');
      setIsHeader(false);
      setParentId(defaultParentId || null);
      setErrorMsg(null);

      // Jika ada defaultParentId, otomatis set tipe sesuai parent
      if (defaultParentId) {
        const parent = allAccounts.find(a => a.id === defaultParentId);
        if (parent) {
          setType(parent.type);
        }
      }
    }
  }, [editingAccount, defaultParentId, isOpen, allAccounts]);

  // Saat parent dipilih, otomatis sinkronkan tipe akun anak dengan tipe parent
  const handleParentChange = (newParentId: string | null) => {
    setParentId(newParentId);
    if (newParentId) {
      const parent = allAccounts.find(a => a.id === newParentId);
      if (parent) {
        setType(parent.type);
      }
    }
  };

  // Filter daftar akun induk yang valid (hanya akun dari tipe yang sama & bukan diri sendiri)
  const parentOptions = useMemo(() => {
    return allAccounts
      .filter(a => {
        // Tidak bisa memilih diri sendiri
        if (isEdit && a.id === editingAccount?.id) return false;
        // Hanya tipe yang sama
        if (a.type !== type) return false;
        return true;
      })
      .map(a => ({
        value: a.id,
        label: `${a.code} - ${a.name} ${a.isHeader ? '(Induk)' : ''}`.trim()
      }));
  }, [allAccounts, type, isEdit, editingAccount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCode = code.trim();
    const cleanName = name.trim();

    if (!cleanCode) {
      setErrorMsg('Kode akun wajib diisi');
      return;
    }
    if (!cleanName) {
      setErrorMsg('Nama akun wajib diisi');
      return;
    }

    try {
      if (isEdit) {
        await onSubmit({
          code: editingAccount?.isSystem ? undefined : cleanCode,
          name: cleanName,
          isHeader,
          parentId,
        });
      } else {
        await onSubmit({
          code: cleanCode,
          name: cleanName,
          type,
          isHeader,
          parentId: parentId || null,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal menyimpan akun');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Akun: ${editingAccount?.code} - ${editingAccount?.name}` : 'Tambah Akun Baru (COA)'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Klasifikasi Akun (Tipe) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Klasifikasi Golongan Akun <span className="text-rose-500">*</span>
          </label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as AccountCategoryType);
              setParentId(null); // Reset parent jika tipe diubah
            }}
            disabled={isEdit || Boolean(parentId)}
            className="w-full text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {ACCOUNT_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            {ACCOUNT_TYPE_OPTIONS.find(o => o.value === type)?.description}
          </p>
        </div>

        {/* Akun Induk (Parent) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Akun Induk / Header (Opsional)
          </label>
          <select
            value={parentId || ''}
            onChange={(e) => handleParentChange(e.target.value ? e.target.value : null)}
            className="w-full text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Tanpa Induk (Akun Tingkat Teratas) --</option>
            {parentOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            Pilih akun induk jika akun ini merupakan sub-rekening (anak).
          </p>
        </div>

        {/* Baris Kode & Nama Akun */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Kode Akun <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isEdit && editingAccount?.isSystem}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Misal: 1011-01"
              className="w-full text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Akun <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Misal: Bank Mandiri Rek Operasional Koperasi"
              className="w-full text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Pilihan Akun Induk (Header) vs Akun Detail (Posting) */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isHeader}
              onChange={(e) => setIsHeader(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <FolderTree size={14} className="text-indigo-600 shrink-0" />
                Jadikan Akun Induk (Header / Summary Account)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Akun Induk hanya berfungsi sebagai penampung sub-akun dan <strong>tidak dapat dipilih langsung</strong> saat posting jurnal atau kasir POS. Saldo otomatis dijumlahkan dari anak-anaknya.
              </p>
            </div>
          </label>
        </div>

        {isEdit && editingAccount?.isSystem && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <span>
              Ini adalah <strong>Akun Bawaan Sistem</strong>. Kode dan Golongan dikunci untuk menjaga integritas transaksi otomasi koperasi, namun Anda tetap dapat mengubah nama akun ini.
            </span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isSubmitting ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Buat Akun')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

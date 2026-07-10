import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, Loader2, Search, BookMarked, Building2, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ProgramKeahlian } from '../../../types/academic';
import {
  getProgramKeahlianList,
  createProgramKeahlian,
  updateProgramKeahlian,
  deleteProgramKeahlian,
} from '../../../api/academic/program-keahlian.api';
import { Button } from '../../ui';
import { SPEKTRUM_SMK_2024 } from '../../../utils/nomenklaturSMK';

interface FormState {
  nama: string;
  kode: string;
  singkatan: string;
  bidang_keahlian: string;
  isKustom: boolean;
}

const EMPTY_FORM: FormState = {
  nama: '',
  kode: '',
  singkatan: '',
  bidang_keahlian: '',
  isKustom: false,
};

export const ProgramKeahlianPanel: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const [list, setList] = useState<ProgramKeahlian[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProgramKeahlianList(1, 200, search);
      setList(res.data);
    } catch {
      toast.error('Gagal memuat data Program Keahlian');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (pk: ProgramKeahlian) => {
    // Cek apakah data ini kustom atau ada di spektrum nasional
    const bidangMatch = SPEKTRUM_SMK_2024.find(b => b.bidang === pk.bidang_keahlian);
    const existsInSpektrum = bidangMatch?.programs.some(p => p.nama === pk.nama) ?? false;

    setEditingId(pk.id);
    setForm({
      nama: pk.nama,
      kode: pk.kode || '',
      singkatan: pk.singkatan || '',
      bidang_keahlian: pk.bidang_keahlian || '',
      isKustom: !existsInSpektrum,
    });
    setShowForm(true);
  };

  // List program keahlian terfilter berdasarkan bidang keahlian terpilih
  const availablePrograms = useMemo(() => {
    if (!form.bidang_keahlian) return [];
    const bidangMatch = SPEKTRUM_SMK_2024.find(b => b.bidang === form.bidang_keahlian);
    return bidangMatch ? bidangMatch.programs : [];
  }, [form.bidang_keahlian]);

  const handleBidangChange = (bidang: string) => {
    setForm(f => {
      const bidangMatch = SPEKTRUM_SMK_2024.find(b => b.bidang === bidang);
      const firstProgram = bidangMatch?.programs[0];

      return {
        ...f,
        bidang_keahlian: bidang,
        nama: firstProgram ? firstProgram.nama : '',
        kode: firstProgram ? firstProgram.kode : '',
        singkatan: firstProgram ? firstProgram.singkatan : '',
        isKustom: !bidangMatch,
      };
    });
  };

  const handleProgramSelectChange = (val: string) => {
    if (val === 'KUSTOM') {
      setForm(f => ({ ...f, nama: '', kode: '', singkatan: '', isKustom: true }));
    } else {
      const match = availablePrograms.find(p => p.nama === val);
      if (match) {
        setForm(f => ({
          ...f,
          nama: match.nama,
          kode: match.kode,
          singkatan: match.singkatan,
          isKustom: false,
        }));
      }
    }
  };

  const handleSave = async () => {
    if (!form.nama.trim()) {
      toast.error('Nama Program Keahlian wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nama: form.nama.trim(),
        kode: form.kode.trim() || null,
        singkatan: form.singkatan.trim() || null,
        bidang_keahlian: form.bidang_keahlian.trim() || null,
      };
      if (editingId) {
        await updateProgramKeahlian(editingId, payload);
        toast.success('Program Keahlian diperbarui');
      } else {
        await createProgramKeahlian(payload);
        toast.success('Program Keahlian ditambahkan');
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pk: ProgramKeahlian) => {
    if ((pk._count?.Jurusan || 0) > 0) {
      toast.error(`Tidak bisa dihapus: masih ada ${pk._count?.Jurusan} Konsentrasi Keahlian terhubung`);
      return;
    }
    if (!confirm(`Hapus "${pk.nama}"?`)) return;
    setDeletingId(pk.id);
    try {
      await deleteProgramKeahlian(pk.id);
      toast.success('Program Keahlian dihapus');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = list.filter(pk =>
    !search || pk.nama.toLowerCase().includes(search.toLowerCase()) ||
    (pk.kode || '').toLowerCase().includes(search.toLowerCase()) ||
    (pk.bidang_keahlian || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari Program Keahlian..."
            className="w-full pl-8 pr-3 py-2 text-[12px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
        </div>
        {canEdit && (
          <Button
            size="sm"
            onClick={openAdd}
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-[12px] font-semibold px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Program Keahlian
          </Button>
        )}
      </div>

      {/* Info banner */}
      <div className="px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 text-[11px] text-violet-700 dark:text-violet-300">
        <strong>Program Keahlian</strong> adalah induk dari <strong>Konsentrasi Keahlian (Jurusan)</strong>. 
        Contoh: <em>Teknik Elektronika</em> → Konsentrasi: <em>TOI, TAV</em>. 
        Data ini wajib ada agar Pemetaan Kelas berjalan cerdas dan muncul di Ijazah.
      </div>

      {/* Inline Add/Edit Form */}
      {showForm && (
        <div className="rounded-2xl border-2 border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-violet-700 dark:text-violet-300">
              {editingId ? '✏️ Edit Program Keahlian' : '➕ Tambah Program Keahlian'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bidang Keahlian */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Bidang Keahlian <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.bidang_keahlian}
                onChange={e => handleBidangChange(e.target.value)}
                className="w-full h-10 px-3 text-[12px] font-semibold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="">— Pilih Bidang Keahlian —</option>
                {SPEKTRUM_SMK_2024.map(b => (
                  <option key={b.bidang} value={b.bidang}>{b.bidang}</option>
                ))}
              </select>
            </div>

            {/* Nama Program Keahlian (Dropdown Nomenklatur Nasional / Input Text) */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Nama Program Keahlian <span className="text-rose-500">*</span>
              </label>
              
              {!form.isKustom && form.bidang_keahlian ? (
                <select
                  value={form.nama}
                  onChange={e => handleProgramSelectChange(e.target.value)}
                  className="w-full h-10 px-3 text-[12px] font-semibold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  {availablePrograms.map(p => (
                    <option key={p.nama} value={p.nama}>{p.nama}</option>
                  ))}
                  <option value="KUSTOM">🛠️ [Entry Manual / Kustom]</option>
                </select>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={form.nama}
                    onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                    placeholder="Contoh: Teknik Kustom Daerah"
                    className="w-full h-10 px-3 text-[12px] font-semibold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  {form.bidang_keahlian && (
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, isKustom: false, nama: availablePrograms[0]?.nama || '' }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-violet-500 hover:underline"
                    >
                      Kembali ke Spektrum Nasional
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Kode */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Kode Program
              </label>
              <input
                type="text"
                value={form.kode}
                onChange={e => setForm(f => ({ ...f, kode: e.target.value.toUpperCase() }))}
                placeholder="Contoh: TE, TO, TKJ"
                maxLength={10}
                className="w-full h-10 px-3 text-[12px] font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>

            {/* Singkatan */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Singkatan (opsional)
              </label>
              <input
                type="text"
                value={form.singkatan}
                onChange={e => setForm(f => ({ ...f, singkatan: e.target.value.toUpperCase() }))}
                placeholder="Opsional..."
                maxLength={10}
                className="w-full h-10 px-3 text-[12px] font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-[12px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 text-[12px] font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-xl transition shadow-sm disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <BookMarked className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-[13px] font-semibold text-slate-400">Belum ada Program Keahlian</p>
          <p className="text-[11px] text-slate-400">Tambahkan Program Keahlian terlebih dahulu</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(pk => (
            <div
              key={pk.id}
              className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-violet-300 dark:hover:border-violet-700 transition group"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">{pk.nama}</p>
                  {pk.kode && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                      {pk.kode}
                    </span>
                  )}
                </div>
                {pk.bidang_keahlian && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{pk.bidang_keahlian}</p>
                )}
              </div>

              {/* Badge count */}
              <div className="text-center flex-shrink-0">
                <p className="text-[18px] font-black text-violet-600 dark:text-violet-400">{pk._count?.Jurusan || 0}</p>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Konsentrasi</p>
              </div>

              {/* Actions */}
              {canEdit && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => openEdit(pk)}
                    className="p-2 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/40 text-slate-400 hover:text-violet-600 transition"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(pk)}
                    disabled={deletingId === pk.id || (pk._count?.Jurusan || 0) > 0}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    title={(pk._count?.Jurusan || 0) > 0 ? 'Tidak bisa dihapus: masih ada konsentrasi terhubung' : 'Hapus'}
                  >
                    {deletingId === pk.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

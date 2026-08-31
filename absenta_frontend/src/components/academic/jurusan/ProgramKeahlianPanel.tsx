import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, Search, BookMarked, Building2, X, Check, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ProgramKeahlian } from '../../../types/academic';
import {
  getProgramKeahlianList,
  createProgramKeahlian,
  updateProgramKeahlian,
  deleteProgramKeahlian,
} from '../../../api/academic/program-keahlian.api';
import { Button, Input, Label } from '../../ui';
import { SPEKTRUM_SMK_2024 } from '../../../utils/nomenklaturSMK';
import { MobileAcademicList } from '../shared/MobileAcademicList';
import { useIsMobile } from '../../../hooks/useIsMobile';

// Lazy load Table
const Table = lazy(() => import('../../ui/Table').then(module => ({ default: module.Table })));

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
  const queryClient = useQueryClient();
  const invalidateProgramKeahlianCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['program-keahlian-options-list'] });
    queryClient.invalidateQueries({ queryKey: ['jurusan-options-list'] });
    queryClient.invalidateQueries({ queryKey: ['kurikulum-struktur'] });
  }, [queryClient]);

  const [list, setList] = useState<ProgramKeahlian[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const isMobile = useIsMobile();

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
      invalidateProgramKeahlianCache();
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
      invalidateProgramKeahlianCache();
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const items = list.filter(pk => selectedIds.has(pk.id));
    const withJurusans = items.filter(pk => (pk._count?.Jurusan || 0) > 0);
    
    if (withJurusans.length > 0) {
      toast.error(`Tidak bisa menghapus: ada ${withJurusans.length} Program Keahlian yang masih memiliki Konsentrasi/Jurusan terhubung.`);
      return;
    }

    if (!confirm(`Hapus ${selectedIds.size} Program Keahlian terpilih?`)) return;

    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      let successCount = 0;
      let failCount = 0;

      for (const id of ids) {
        try {
          await deleteProgramKeahlian(id);
          successCount++;
        } catch {
          failCount++;
        }
      }

      if (failCount > 0) {
        toast(`Berhasil menghapus ${successCount} program, ${failCount} gagal.`, { icon: '⚠️' });
      } else {
        toast.success(`Berhasil menghapus ${successCount} Program Keahlian`);
      }

      setSelectedIds(new Set());
      invalidateProgramKeahlianCache();
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus secara massal');
    } finally {
      setBulkDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    return list.filter(pk =>
      !search || pk.nama.toLowerCase().includes(search.toLowerCase()) ||
      (pk.kode || '').toLowerCase().includes(search.toLowerCase()) ||
      (pk.bidang_keahlian || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [list, search]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filtered.length / itemsPerPage);
  }, [filtered.length, itemsPerPage]);

  // Columns for the Table component
  const columns = useMemo(() => [
    { 
      key: 'nama', 
      label: 'Nama Program Keahlian',
      sortable: true,
      render: (value: string, pk: ProgramKeahlian) => (
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-200">{value}</div>
          {pk.kode && (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Kode: {pk.kode}</div>
          )}
        </div>
      )
    },
    { 
      key: 'bidang_keahlian', 
      label: 'Bidang Keahlian',
      sortable: true,
      render: (value: string | null) => value || '-'
    },
    { 
      key: 'singkatan', 
      label: 'Singkatan',
      render: (value: string | null) => value || '-'
    },
    { 
      key: 'jurusans_count', 
      label: 'Jurusan Terhubung',
      render: (_: any, pk: ProgramKeahlian) => (
        <div className="font-black text-violet-600 dark:text-violet-400">
          {pk._count?.Jurusan || 0} Jurusan
        </div>
      )
    },
    { 
      key: 'actions', 
      label: 'Aksi', 
      render: (_: any, pk: ProgramKeahlian) => (
        <div className="flex items-center gap-1">
          {canEdit && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                onClick={() => openEdit(pk)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => handleDelete(pk)}
                disabled={deletingId === pk.id || (pk._count?.Jurusan || 0) > 0}
                title={(pk._count?.Jurusan || 0) > 0 ? 'Tidak bisa dihapus: masih ada konsentrasi terhubung' : 'Hapus'}
              >
                {deletingId === pk.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </>
          )}
        </div>
      )
    },
  ], [canEdit, deletingId]);

  const renderProgramKeahlianMobileCard = useCallback((pk: ProgramKeahlian) => {
    const totalKonsentrasi = pk._count?.Jurusan || 0;
    const subText = [
      `${totalKonsentrasi} Konsentrasi Keahlian`,
      pk.bidang_keahlian
    ].filter(Boolean).join(' • ');

    return (
      <div 
        key={pk.id}
        role="button"
        tabIndex={0}
        onClick={() => openEdit(pk)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openEdit(pk);
          }
        }}
        aria-label={`Detail program keahlian ${pk.nama}`}
        className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3"
      >
        <div className="min-w-0 flex-1">
          <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-snug">
            {pk.nama}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">
            {subText}
          </p>
        </div>

        <Button
          size="xs"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            openEdit(pk);
          }}
          aria-label={`Detail ${pk.nama}`}
          className="rounded-xl px-3.5 py-1.5 font-bold text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
        >
          Detail
        </Button>
      </div>
    );
  }, []);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 px-1 flex-wrap">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari Program Keahlian..."
              className="w-full pl-8 pr-3 py-2 text-[12px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
          </div>
          {canEdit && filtered.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const allSelected = filtered.every(pk => selectedIds.has(pk.id));
                setSelectedIds(prev => {
                  const next = new Set<string>();
                  if (!allSelected) {
                    filtered.forEach(pk => next.add(pk.id));
                  }
                  return next;
                });
              }}
              className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
            >
              {filtered.every(pk => selectedIds.has(pk.id)) ? 'Batal Pilih Semua' : 'Pilih Semua'}
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && canEdit && (
            <Button
              size="sm"
              variant="toolbarDanger"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="text-[12px] font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus Terpilih ({selectedIds.size})
            </Button>
          )}
          {canEdit && (
            <Button
              size="sm"
              onClick={openAdd}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-[12px] font-semibold px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Program Keahlian
            </Button>
          )}
        </div>
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
                  className="w-full h-10 px-3.5 text-xs sm:text-[13px] font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 focus:outline-none focus:border-emerald-500"
                >
                  {availablePrograms.map(p => (
                    <option key={p.nama} value={p.nama}>{p.nama}</option>
                  ))}
                  <option value="KUSTOM">🛠️ [Entry Manual / Kustom]</option>
                </select>
              ) : (
                <div className="relative">
                  <Input
                    type="text"
                    value={form.nama}
                    onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                    placeholder="Contoh: Teknik Kustom Daerah"
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
              <Label htmlFor="kodeProgram">
                Kode Program
              </Label>
              <Input
                id="kodeProgram"
                type="text"
                value={form.kode}
                onChange={e => setForm(f => ({ ...f, kode: e.target.value.toUpperCase() }))}
                placeholder="Contoh: TE, TO, TKJ"
                maxLength={10}
              />
            </div>

            {/* Singkatan */}
            <div className="space-y-1">
              <Label htmlFor="singkatanProgram">
                Singkatan (opsional)
              </Label>
              <Input
                id="singkatanProgram"
                type="text"
                value={form.singkatan}
                onChange={e => setForm(f => ({ ...f, singkatan: e.target.value.toUpperCase() }))}
                placeholder="Opsional..."
                maxLength={10}
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
        <div className="text-center py-12 space-y-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <BookMarked className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-[13px] font-semibold text-slate-400">Belum ada Program Keahlian</p>
          <p className="text-[11px] text-slate-400">Tambahkan Program Keahlian terlebih dahulu</p>
        </div>
      ) : (
        <div className="bg-transparent overflow-hidden">
          {isMobile ? (
            <div className="space-y-4">
              <MobileAcademicList
                title="Daftar Program Keahlian"
                data={paginatedData}
                loading={loading}
                totalItems={filtered.length}
                onRefresh={load}
                onAdd={canEdit ? openAdd : undefined}
                canManage={canEdit}
                emptyMessage="Tidak ada data program keahlian ditemukan"
                pagination={{
                  currentPage,
                  totalPages: totalPages || 1,
                  totalItems: filtered.length,
                  itemsPerPage,
                  onPageChange: (page) => setCurrentPage(page),
                  onLimitChange: (limit) => {
                    setItemsPerPage(limit);
                    setCurrentPage(1);
                  }
                }}
                renderCard={renderProgramKeahlianMobileCard}
              />
            </div>
          ) : (
            <div className="hidden md:block">
              <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="animate-spin text-violet-400" /></div>}>
                <Table
                  columns={columns}
                  data={paginatedData}
                  loading={loading}
                  emptyMessage="Tidak ada data program keahlian ditemukan"
                  className="border-none"
                  selectedRowKeys={selectedIds}
                  onSelectedRowKeysChange={setSelectedIds}
                  pagination={{
                    currentPage,
                    totalPages: totalPages || 1,
                    totalItems: filtered.length,
                    itemsPerPage,
                    onPageChange: (page) => setCurrentPage(page),
                    onLimitChange: (limit) => {
                      setItemsPerPage(limit);
                      setCurrentPage(1);
                    }
                  }}
                />
              </Suspense>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

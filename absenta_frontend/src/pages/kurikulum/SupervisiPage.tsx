import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Card, Button, Input, Badge, Label, Loader, SectionCard } from '../../components/ui';
import type { Column } from '../../components/ui/Table';
import toast from 'react-hot-toast';
import useConfirm from '../../hooks/useConfirm';
import { useDebounce } from '../../hooks/useDebounce';
import { kurikulumApi } from '../../api/kurikulum.api';
import type { Supervisi } from '../../api/kurikulum.api';
import { guruApi, kelasApi, mapelApi } from '../../api/academic.api';
import type { Guru, Kelas, Mapel } from '../../types/academic';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { cn } from '../../lib/utils';
import { ClipboardList, Plus, Clock, Award, BookOpen, User, Calendar, ChevronRight } from 'lucide-react';

// Lazy load komponen berat (Pillar 11 – Optimasi Pemuatan)
const SearchableSelect = lazy(() => import('../../components/ui/SearchableSelect').then(m => ({ default: m.SearchableSelect })));
const Table = lazy(() => import('../../components/ui/Table').then(m => ({ default: m.Table })));
const Modal = lazy(() => import('../../components/ui/Modal').then(m => ({ default: m.Modal })));type FormState = {
  guru_id: string;
  tanggal: string;
  jam_ke: number;
  kelas: string;
  mapel: string;
  catatan: string;
  nilai: number | '';
  status: string;
};

const DEFAULT_FORM: FormState = {
  guru_id: '',
  tanggal: new Date().toISOString().split('T')[0],
  jam_ke: 1,
  kelas: '',
  mapel: '',
  catatan: '',
  nilai: '',
  status: 'SCHEDULED'
};

export default function SupervisiPage() {
  const [data, setData] = useState<Supervisi[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [formData, setFormData] = useState<FormState>(DEFAULT_FORM);
  const [guruItems, setGuruItems] = useState<Guru[]>([]);
  const [kelasItems, setKelasItems] = useState<Kelas[]>([]);
  const [mapelItems, setMapelItems] = useState<Mapel[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(10);
  const [totalData, setTotalData] = useState(0);
  const [selectedSupervisiId, setSelectedSupervisiId] = useState<string | null>(null);

  const selectedSupervisi = useMemo(() => {
    if (data.length === 0) return null;
    if (!selectedSupervisiId) return data[0];
    return data.find((s: Supervisi) => s.id === selectedSupervisiId) || data[0];
  }, [data, selectedSupervisiId]);

  const confirm = useConfirm();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await kurikulumApi.getSupervisi({ limit: pageLimit, page: currentPage, search: debouncedSearch });
      setData(result.data?.list ?? []);
      setTotalData(result.data?.total ?? 0);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil data supervisi');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, currentPage, pageLimit]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [guruRes, kelasRes, mapelRes] = await Promise.all([
        guruApi.getAll({ limit: 1000 }),
        kelasApi.getAll({ limit: 1000 }),
        mapelApi.getAll({ limit: 1000 })
      ]);
      setGuruItems(guruRes.data ?? []);
      setKelasItems(kelasRes.data ?? []);
      setMapelItems(mapelRes.data ?? []);
    } catch (err) {
      console.error('Gagal mengambil data referensi', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        nilai: formData.nilai === '' ? null : Number(formData.nilai),
      };
      if (selectedId) {
        await kurikulumApi.updateSupervisi(selectedId, payload);
        toast.success('Jadwal supervisi berhasil diperbarui');
      } else {
        await kurikulumApi.createSupervisi(payload);
        toast.success('Jadwal supervisi berhasil disimpan');
      }
      setModalOpen(false);
      setFormData(DEFAULT_FORM);
      setSelectedId(null);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan data');
    }
  }, [selectedId, formData, fetchData]);

  const handleEdit = useCallback((item: Supervisi) => {
    setFormData({
      guru_id: item.guru_id,
      tanggal: new Date(item.tanggal).toISOString().split('T')[0],
      jam_ke: item.jam_ke ?? 1,
      kelas: item.kelas ?? '',
      mapel: item.mapel ?? '',
      catatan: item.catatan ?? '',
      nilai: item.nilai ?? '',
      status: item.status
    });
    setSelectedId(item.id);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (item: Supervisi) => {
    const ok = await confirm({
      title: 'Hapus Jadwal Supervisi',
      description: `Apakah Anda yakin ingin menghapus jadwal supervisi untuk ${item.Guru?.nama_guru ?? 'guru ini'}?`,
      confirmText: 'Hapus',
      style: 'danger'
    });
    if (!ok) return;
    try {
      await kurikulumApi.deleteSupervisi(item.id);
      toast.success('Jadwal supervisi berhasil dihapus');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus jadwal');
    }
  }, [confirm, fetchData]);

  const guruOptions = useMemo(() => (guruItems ?? [])?.map(g => ({ label: g.nama_guru, value: g.id })), [guruItems]);
  const kelasOptions = useMemo(() => (kelasItems ?? [])?.map(k => ({ label: k.nama_kelas, value: k.nama_kelas })), [kelasItems]);
  const mapelOptions = useMemo(() => (mapelItems ?? [])?.map(m => ({ label: m.nama_mapel, value: m.nama_mapel })), [mapelItems]);

  const columns: Column[] = useMemo(() => [
    {
      key: 'tanggal',
      label: 'Tanggal',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('id-ID')
    },
    {
      key: 'guru',
      label: 'Guru',
      sortable: true,
      render: (_: unknown, item: Supervisi) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-200">{item.Guru?.nama_guru}</div>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{item.Guru?.nip || '-'}</div>
        </div>
      )
    },
    {
      key: 'mapel',
      label: 'Mapel / Kelas',
      render: (_: unknown, item: Supervisi) => (
        <div>
          <div className="font-semibold text-slate-700 dark:text-slate-350">{item.mapel || '-'}</div>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{item.kelas || '-'}</div>
        </div>
      )
    },
    { key: 'jam_ke', label: 'Jam Ke', sortable: true },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge variant={value === 'COMPLETED' ? 'success' : 'default'}>
          {value === 'COMPLETED' ? 'SELESAI' : 'TERJADWAL'}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_: unknown, item: Supervisi) => (
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
            className="text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Edit
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
            className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-55/10 dark:hover:bg-rose-950/20"
          >
            Hapus
          </Button>
        </div>
      )
    }
  ], [handleEdit, handleDelete]);

  const stats = useMemo(() => {
    const total = data.length;
    const completed = data.filter(s => s.status === 'COMPLETED').length;
    const scheduled = data.filter(s => s.status === 'SCHEDULED').length;
    const graded = data.filter(s => s.status === 'COMPLETED' && s.nilai !== undefined && s.nilai !== null && s.nilai !== 0);
    const avg = graded.length > 0 
      ? Math.round(graded.reduce((acc, curr) => acc + (curr.nilai ?? 0), 0) / graded.length) 
      : 0;

    return [
      {
        title: 'Total Supervisi',
        value: total,
        icon: <ClipboardList size={14} />,
        gradient: 'from-blue-500 to-indigo-650',
        subtitle: 'Jadwal terdaftar'
      },
      {
        title: 'Supervisi Selesai',
        value: completed,
        icon: <Badge variant="success">✓</Badge>,
        gradient: 'from-emerald-500 to-teal-650',
        subtitle: 'Sudah diobservasi'
      },
      {
        title: 'Dijadwalkan',
        value: scheduled,
        icon: <Clock size={14} />,
        gradient: 'from-indigo-500 to-indigo-650',
        subtitle: 'Menunggu pelaksanaan'
      },
      {
        title: 'Rata-rata Nilai',
        value: avg > 0 ? `${avg}/100` : '-',
        icon: <Award size={14} />,
        gradient: 'from-amber-500 to-orange-650',
        subtitle: 'Kinerja mengajar guru'
      }
    ];
  }, [data]);

  const toolbarLeft = (
    <Input
      placeholder="Cari supervisi..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-64"
      aria-label="Cari jadwal supervisi"
    />
  );

  const toolbarRight = (
    <Button
      variant="toolbarPrimary"
      size="toolbar"
      onClick={() => { setFormData(DEFAULT_FORM); setSelectedId(null); setModalOpen(true); }}
    >
      <Plus size={14} className="mr-1" /> Tambah Jadwal
    </Button>
  );

  return (
    <AcademicPageLayout
      title="Jadwal Supervisi Guru"
      description="Kelola jadwal supervisi pembelajaran guru di setiap kelas dan mata pelajaran."
      stats={stats}
      hardeningModuleKey="supervisipage"
      breadcrumbs={[
        { label: 'Akademik', path: '/academic' },
        { label: 'Kurikulum', path: '/kurikulum' },
        { label: 'Supervisi Guru' }
      ]}
      instruction={{
        title: 'Panduan Supervisi Guru',
        description: 'Supervisi adalah kegiatan monitoring kualitas pembelajaran oleh kepala sekolah atau wakil kurikulum.',
        items: [
          { text: 'Tambahkan jadwal supervisi dengan memilih guru, tanggal, dan kelas yang akan disupervisi.' },
          { text: 'Status SCHEDULED berarti supervisi dijadwalkan, COMPLETED berarti sudah dilakukan.' },
          { text: 'Gunakan kolom catatan untuk mencatat hasil observasi pembelajaran.' }
        ]
      }}
    >
      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Table Container (Kiri) */}
          <div className="lg:col-span-7 flex">
            <Card className="p-6 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm flex flex-col justify-between w-full">
              <Suspense fallback={<div className="flex items-center justify-center py-10"><Loader /></div>}>
                <Table
                  columns={columns}
                  data={data ?? []}
                  loading={loading}
                  emptyMessage="Belum ada jadwal supervisi"
                  toolbarLeft={toolbarLeft}
                  toolbarRight={toolbarRight}
                  onRowClick={(row: any) => setSelectedSupervisiId(row.id)}
                  rowClassName={(row: any) => cn(
                    "cursor-pointer transition-all duration-200",
                    selectedSupervisi?.id === row.id ? "bg-indigo-50/40 dark:bg-indigo-950/20 font-medium" : ""
                  )}
                  pagination={{
                    currentPage: currentPage,
                    totalPages: Math.ceil(totalData / pageLimit),
                    totalItems: totalData,
                    itemsPerPage: pageLimit,
                    onPageChange: setCurrentPage,
                    onLimitChange: setPageLimit
                  }}
                />
              </Suspense>
            </Card>
          </div>

          {/* Details & Coaching Panel (Kanan) */}
          <div className="lg:col-span-5 flex">
            <Card className="p-6 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm flex flex-col justify-between w-full min-h-[500px]">
              {selectedSupervisi ? (
                <div className="space-y-6">
                  {/* Header: Teacher Profile */}
                  <div className="flex items-center gap-4 pb-4 border-b border-slate-50 dark:border-slate-850">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-lg shadow-inner">
                      {selectedSupervisi.Guru?.nama_guru?.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-base text-slate-850 dark:text-white uppercase leading-none">{selectedSupervisi.Guru?.nama_guru}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">NIP: {selectedSupervisi.Guru?.nip || '-'}</p>
                    </div>
                  </div>

                  {/* Observasi Details */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Detail Observasi</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl space-y-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-1">
                          <BookOpen size={10} /> Mapel
                        </span>
                        <p className="text-xs font-black text-slate-850 dark:text-slate-200">{selectedSupervisi.mapel || '-'}</p>
                      </div>
                      <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl space-y-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-1">
                          <User size={10} /> Kelas
                        </span>
                        <p className="text-xs font-black text-slate-850 dark:text-slate-200">{selectedSupervisi.kelas || '-'}</p>
                      </div>
                      <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl space-y-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-1">
                          <Calendar size={10} /> Tanggal
                        </span>
                        <p className="text-xs font-black text-slate-850 dark:text-slate-200">
                          {new Date(selectedSupervisi.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl space-y-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-1">
                          <Clock size={10} /> Jam Ke-
                        </span>
                        <p className="text-xs font-black text-slate-850 dark:text-slate-200">{selectedSupervisi.jam_ke || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Score & Evaluation */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hasil Kinerja Observasi</h4>
                    {selectedSupervisi.status === 'COMPLETED' ? (
                      <div className="flex items-center gap-5 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                        <div className={cn(
                          "w-16 h-16 rounded-full flex flex-col items-center justify-center font-black text-xl border-4 shadow-inner shrink-0",
                          (selectedSupervisi.nilai ?? 0) >= 85 ? "border-emerald-500 bg-emerald-50/10 text-emerald-600" :
                          (selectedSupervisi.nilai ?? 0) >= 70 ? "border-blue-500 bg-blue-50/10 text-blue-600" :
                          (selectedSupervisi.nilai ?? 0) >= 55 ? "border-amber-500 bg-amber-50/10 text-amber-600" :
                          "border-rose-500 bg-rose-50/10 text-rose-600"
                        )}>
                          {selectedSupervisi.nilai ?? '-'}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-850 dark:text-slate-200">
                            {(selectedSupervisi.nilai ?? 0) >= 85 ? "SANGAT BAIK" :
                             (selectedSupervisi.nilai ?? 0) >= 70 ? "BAIK" :
                             (selectedSupervisi.nilai ?? 0) >= 55 ? "CUKUP" :
                             "PERLU PEMBINAAN"}
                          </p>
                          <p className="text-[10px] text-gray-450 leading-relaxed">
                            {(selectedSupervisi.nilai ?? 0) >= 85 ? "Guru menunjukkan kompetensi profesional yang luar biasa dalam pengelolaan kelas." :
                             (selectedSupervisi.nilai ?? 0) >= 70 ? "Kombinasi instruksi dan penyampaian materi sudah berjalan baik dan terstruktur." :
                             (selectedSupervisi.nilai ?? 0) >= 55 ? "Beberapa aspek pedagogis seperti interaksi siswa dan asesmen masih dapat ditingkatkan." :
                             "Membutuhkan pendampingan intensif (coaching) guna menyelaraskan kembali modul ajar dengan implementasi kelas."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-center border-2 border-dashed border-slate-100 dark:border-slate-850">
                        <Clock size={24} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-350">Supervisi Belum Terlaksana</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">Nilai dan rekomendasi tindak lanjut akan tampil setelah status diubah menjadi SELESAI.</p>
                      </div>
                    )}
                  </div>

                  {/* Catatan */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Catatan Penilai (Supervisor)</h4>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100/50 dark:border-slate-850 min-h-[80px]">
                      <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed whitespace-pre-wrap italic">
                        {selectedSupervisi.catatan ? `"${selectedSupervisi.catatan}"` : "Tidak ada catatan tambahan."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="my-auto text-center space-y-3">
                  <ClipboardList size={40} className="mx-auto text-slate-200" />
                  <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Pilih Jadwal Supervisi</p>
                  <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto">Klik salah satu baris jadwal supervisi di tabel untuk melihat detail observasi, nilai kinerja, dan rekomendasi tindak lanjut.</p>
                </div>
              )}

              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                <p className="text-[9px] text-slate-500 dark:text-slate-450 leading-relaxed font-semibold italic">
                  * Indikator penilaian berdasarkan Standar Proses Kurikulum Merdeka: pembelajaran interaktif, asesmen otentik, dan diferensiasi materi.
                </p>
              </div>
            </Card>
          </div>
        </div>

        <Suspense fallback={null}>
          <Modal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title={selectedId ? 'Edit Jadwal Supervisi' : 'Tambah Jadwal Supervisi'}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="guru-select">Guru</Label>
                <SearchableSelect
                  id="guru-select"
                  value={formData.guru_id}
                  onValueChange={(val) => setFormData({ ...formData, guru_id: val })}
                  options={guruOptions}
                  placeholder="Pilih Guru"
                  searchPlaceholder="Cari Guru..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tanggal-input">Tanggal</Label>
                  <Input
                    id="tanggal-input"
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    required
                    aria-label="Tanggal supervisi"
                  />
                </div>
                <div>
                  <Label htmlFor="jam-ke-input">Jam Ke</Label>
                  <Input
                    id="jam-ke-input"
                    type="number"
                    min="1"
                    max="15"
                    value={formData.jam_ke}
                    onChange={(e) => setFormData({ ...formData, jam_ke: Number(e.target.value) })}
                    required
                    aria-label="Jam ke berapa"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="mapel-select">Mata Pelajaran</Label>
                <SearchableSelect
                  id="mapel-select"
                  value={formData.mapel}
                  onValueChange={(val) => setFormData({ ...formData, mapel: val })}
                  options={mapelOptions}
                  placeholder="Pilih Mata Pelajaran"
                />
              </div>
              <div>
                <Label htmlFor="kelas-select">Kelas</Label>
                <SearchableSelect
                  id="kelas-select"
                  value={formData.kelas}
                  onValueChange={(val) => setFormData({ ...formData, kelas: val })}
                  options={kelasOptions}
                  placeholder="Pilih Kelas"
                />
              </div>
              <div>
                <Label htmlFor="catatan-input">Catatan Observasi (Opsional)</Label>
                <Input
                  id="catatan-input"
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  aria-label="Catatan hasil supervisi"
                  placeholder="Contoh: Pembelajaran interaktif, perlu peningkatan manajemen kelas."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status-select">Status</Label>
                  <SearchableSelect
                    id="status-select"
                    value={formData.status}
                    onValueChange={(val) => setFormData({ ...formData, status: val })}
                    options={[
                      { label: 'SCHEDULED (Terjadwal)', value: 'SCHEDULED' },
                      { label: 'COMPLETED (Selesai)', value: 'COMPLETED' }
                    ]}
                    placeholder="Pilih Status"
                  />
                </div>
                <div>
                  <Label htmlFor="nilai-input">Nilai Kinerja (0-100)</Label>
                  <Input
                    id="nilai-input"
                    type="number"
                    min="0"
                    max="100"
                    disabled={formData.status !== 'COMPLETED'}
                    value={formData.nilai}
                    onChange={(e) => setFormData({ ...formData, nilai: e.target.value === '' ? '' : Number(e.target.value) })}
                    placeholder={formData.status !== 'COMPLETED' ? "Set SELESAI dulu" : "Skor 0-100"}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
                <Button type="submit">Simpan</Button>
              </div>
            </form>
          </Modal>
        </Suspense>
      </div>
    </AcademicPageLayout>
  );
}

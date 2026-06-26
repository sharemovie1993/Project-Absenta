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
import { ClipboardList, Plus } from 'lucide-react';

// Lazy load komponen berat (Pillar 11 – Optimasi Pemuatan)
const SearchableSelect = lazy(() => import('../../components/ui/SearchableSelect').then(m => ({ default: m.SearchableSelect })));
const Table = lazy(() => import('../../components/ui/Table').then(m => ({ default: m.Table })));
const Modal = lazy(() => import('../../components/ui/Modal').then(m => ({ default: m.Modal })));

type FormState = {
  guru_id: string;
  tanggal: string;
  jam_ke: number;
  kelas: string;
  mapel: string;
  catatan: string;
  status: string;
};

const DEFAULT_FORM: FormState = {
  guru_id: '',
  tanggal: new Date().toISOString().split('T')[0],
  jam_ke: 1,
  kelas: '',
  mapel: '',
  catatan: '',
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
      if (selectedId) {
        await kurikulumApi.updateSupervisi(selectedId, formData);
        toast.success('Jadwal supervisi berhasil diperbarui');
      } else {
        await kurikulumApi.createSupervisi(formData);
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
          <div className="font-medium">{item.Guru?.nama_guru}</div>
          <div className="text-xs text-gray-500">{item.Guru?.nip}</div>
        </div>
      )
    },
    {
      key: 'mapel',
      label: 'Mapel / Kelas',
      render: (_: unknown, item: Supervisi) => (
        <div>
          <div>{item.mapel}</div>
          <div className="text-xs text-gray-500">{item.kelas}</div>
        </div>
      )
    },
    { key: 'jam_ke', label: 'Jam Ke', sortable: true },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge variant={value === 'COMPLETED' ? 'success' : 'default'}>{value}</Badge>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_: unknown, item: Supervisi) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>Edit</Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(item)}>Hapus</Button>
        </div>
      )
    }
  ], [handleEdit, handleDelete]);

  const dummyStats = useMemo(() => [
    {
      title: 'Total Supervisi',
      value: data.length,
      icon: <ClipboardList size={14} />,
      gradient: 'from-blue-500 to-indigo-600',
      subtitle: 'Jadwal terdaftar'
    }
  ], [data.length]);

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
      stats={dummyStats}
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
        <SectionCard noPadding>
          <Suspense fallback={<div className="flex items-center justify-center py-10"><Loader /></div>}>
            <Table
              columns={columns}
              data={data ?? []}
              loading={loading}
              emptyMessage="Belum ada jadwal supervisi"
              toolbarLeft={toolbarLeft}
              toolbarRight={toolbarRight}
              onSort={(key, direction) => {
                // Client-side sort sudah di-handle oleh Table component
                console.debug('Sort:', key, direction);
              }}
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
        </SectionCard>

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
                <Label htmlFor="catatan-input">Catatan (Opsional)</Label>
                <Input
                  id="catatan-input"
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  aria-label="Catatan hasil supervisi"
                />
              </div>
              {selectedId && (
                <div>
                  <Label htmlFor="status-select">Status</Label>
                  <SearchableSelect
                    id="status-select"
                    value={formData.status}
                    onValueChange={(val) => setFormData({ ...formData, status: val })}
                    options={[
                      { label: 'SCHEDULED', value: 'SCHEDULED' },
                      { label: 'COMPLETED', value: 'COMPLETED' }
                    ]}
                    placeholder="Pilih Status"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 mt-4">
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

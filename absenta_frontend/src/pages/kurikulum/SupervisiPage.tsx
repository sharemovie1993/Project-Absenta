import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Table, Badge, Modal, Label, SearchableSelect } from '../../components/ui';
import type { Column } from '../../components/ui/Table';
import { useToast } from '../../hooks/useToast';
import { useDebounce } from '../../hooks/useDebounce';
import { kurikulumApi } from '../../api/kurikulum.api';
import type { Supervisi } from '../../api/kurikulum.api';
import { guruApi, kelasApi, mapelApi } from '../../api/academic.api';
import type { Guru, Kelas, Mapel } from '../../types/academic';
import { Loader } from 'lucide-react';

export default function SupervisiPage() {
  const [data, setData] = useState<Supervisi[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [formData, setFormData] = useState({
    guru_id: '',
    tanggal: new Date().toISOString().split('T')[0],
    jam_ke: 1,
    kelas: '',
    mapel: '',
    catatan: '',
    status: 'SCHEDULED'
  });
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [mapelList, setMapelList] = useState<Mapel[]>([]);
  const { success, error } = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await kurikulumApi.getSupervisi({ limit: 100, search: debouncedSearch });
      setData(result.data?.list || []);
    } catch (err) {
      console.error(err);
      error('Gagal mengambil data supervisi');
    } finally {
      setLoading(false);
    }
  };

  const fetchGuru = async () => {
    try {
      const result = await guruApi.getAll({ limit: 1000 });
      setGuruList(result.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [kelasRes, mapelRes] = await Promise.all([
        kelasApi.getAll({ limit: 1000 }),
        mapelApi.getAll({ limit: 1000 })
      ]);
      setKelasList(kelasRes.data || []);
      setMapelList(mapelRes.data || []);
    } catch (error) {
      console.error("Gagal mengambil data referensi", error);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    fetchGuru();
    fetchReferenceData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedId) {
        await kurikulumApi.updateSupervisi(selectedId, formData);
        success('Jadwal supervisi berhasil diperbarui');
      } else {
        await kurikulumApi.createSupervisi(formData);
        success('Jadwal supervisi berhasil disimpan');
      }
      setModalOpen(false);
      fetchData();
      resetForm();
    } catch (err) {
        console.error(err);
      error('Gagal menyimpan data');
    }
  };

  const resetForm = () => {
    setFormData({
      guru_id: '',
      tanggal: new Date().toISOString().split('T')[0],
      jam_ke: 1,
      kelas: '',
      mapel: '',
      catatan: '',
      status: 'SCHEDULED'
    });
    setSelectedId(null);
  };

  const handleEdit = (item: Supervisi) => {
    setFormData({
      guru_id: item.guru_id,
      tanggal: new Date(item.tanggal).toISOString().split('T')[0],
      jam_ke: item.jam_ke || 1,
      kelas: item.kelas || '',
      mapel: item.mapel || '',
      catatan: item.catatan || '',
      status: item.status
    });
    setSelectedId(item.id);
    setModalOpen(true);
  };

  const columns: Column[] = [
    {
      key: 'tanggal',
      label: 'Tanggal',
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      key: 'guru',
      label: 'Guru',
      render: (_, item: Supervisi) => (
        <div>
          <div className="font-medium">{item.Guru?.nama_guru}</div>
          <div className="text-xs text-gray-500">{item.Guru?.nip}</div>
        </div>
      )
    },
    {
      key: 'mapel',
      label: 'Mapel / Kelas',
      render: (_, item: Supervisi) => (
        <div>
          <div>{item.mapel}</div>
          <div className="text-xs text-gray-500">{item.kelas}</div>
        </div>
      )
    },
    { key: 'jam_ke', label: 'Jam Ke' },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'COMPLETED' ? 'success' : 'default'}>{value}</Badge>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, item: Supervisi) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>Edit</Button>
          <Button variant="ghost" size="sm" onClick={() => {
              if (confirm('Hapus data ini?')) {
                  kurikulumApi.deleteSupervisi(item.id).then(() => fetchData());
              }
          }}>Hapus</Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Jadwal Supervisi Guru</h1>
        <Button onClick={() => { resetForm(); setModalOpen(true); }}>+ Tambah Jadwal</Button>
      </div>

      <Card>
        <Table
          columns={columns}
          data={data}
          loading={loading}
          emptyMessage="Belum ada jadwal supervisi"
        />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Jadwal Supervisi">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Guru</Label>
            <SearchableSelect
                value={formData.guru_id}
                onValueChange={(val) => setFormData({...formData, guru_id: val})}
                options={guruList.map(g => ({ label: g.nama_guru, value: g.id }))}
                placeholder="Pilih Guru"
                searchPlaceholder="Cari Guru..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
                <Label>Tanggal</Label>
                <Input 
                    type="date"
                    value={formData.tanggal} 
                    onChange={(e) => setFormData({...formData, tanggal: e.target.value})} 
                    required 
                />
            </div>
            <div>
                <Label>Jam Ke</Label>
                <Input 
                    type="number"
                    min="1"
                    max="15"
                    value={formData.jam_ke} 
                    onChange={(e) => setFormData({...formData, jam_ke: Number(e.target.value)})} 
                    required 
                />
            </div>
          </div>
          <div>
            <Label>Mata Pelajaran</Label>
            <SearchableSelect
                value={formData.mapel}
                onValueChange={(val) => setFormData({...formData, mapel: val})}
                options={mapelList.map(m => ({ label: m.nama_mapel, value: m.nama_mapel }))}
                placeholder="Pilih Mata Pelajaran"
            />
          </div>
          <div>
            <Label>Kelas</Label>
            <SearchableSelect
                value={formData.kelas}
                onValueChange={(val) => setFormData({...formData, kelas: val})}
                options={kelasList.map(k => ({ label: k.nama_kelas, value: k.nama_kelas }))}
                placeholder="Pilih Kelas"
            />
          </div>
          <div>
            <Label>Catatan (Opsional)</Label>
            <Input 
                value={formData.catatan} 
                onChange={(e) => setFormData({...formData, catatan: e.target.value})} 
            />
          </div>
          {selectedId && (
            <div>
              <Label>Status</Label>
              <SearchableSelect
                  value={formData.status}
                  onValueChange={(val) => setFormData({...formData, status: val})}
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
    </div>
  );
}

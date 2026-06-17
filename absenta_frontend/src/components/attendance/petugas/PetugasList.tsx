import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { Button, Modal, ModalFooter, Table, Pagination, Badge, Input } from '../../ui';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { Plus, Trash2, Search } from 'lucide-react';
import useConfirm from '../../../hooks/useConfirm';
import { useToast } from '../../../hooks/useToast';
import { getPetugasList, assignPetugas, unassignPetugas } from '../../../api/attendance/petugas.api';
import type { PetugasResponse } from '../../../api/attendance/petugas.api';
import { getSiswaList } from '../../../api/academic/siswa.api';
import { getKelasList } from '../../../api/academic/kelas.api';
import type { Siswa } from '../../../types/academic';
import type { Column } from '../../ui/Table';
import { useDebounce } from '../../../hooks/useDebounce';

export default function PetugasList() {
  const { user } = useAuthStore();
  const confirm = useConfirm();
  const { showToast } = useToast();

  // State for Petugas List
  const [petugas, setPetugas] = useState<PetugasResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;

  // State for Assignment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [kelasOptions, setKelasOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [selectedSiswa, setSelectedSiswa] = useState<string>('');
  const [loadingSiswa, setLoadingSiswa] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [siswaSearch, setSiswaSearch] = useState('');
  const debouncedSiswaSearch = useDebounce(siswaSearch, 500);

  // Check Permissions
  const canManage = useMemo(() => {
    const role = user?.role?.name;
    if (role === 'SUPERADMIN' || role === 'ADMIN') return true;
    return user?.capabilities?.includes('attendance.officers.manage') || false;
  }, [user]);

  // Fetch Petugas List
  const fetchPetugas = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPetugasList(page, limit, debouncedSearch);
      if (res.success) {
        setPetugas(res.data);
        setTotalPages(res.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch petugas:', error);
      showToast('Gagal memuat daftar petugas', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchPetugas();
  }, [fetchPetugas]);

  // Fetch Kelas List for Modal
  const fetchKelas = async () => {
    try {
      const res = await getKelasList(1, 100); // Fetch enough classes
      if (res.success) {
        const options = res.data.map((k) => ({
          label: k.nama_kelas,
          value: k.id
        }));
        setKelasOptions(options);
      }
    } catch (error) {
      console.error('Failed to fetch kelas:', error);
      showToast('Gagal memuat daftar kelas', 'error');
    }
  };

  // Fetch Siswa List for Modal
  const fetchSiswa = async (query = '', kelasId = '') => {
    if (!kelasId) {
      setSiswaList([]);
      return;
    }
    try {
      setLoadingSiswa(true);
      // Fetch active siswa filtered by class
      const res = await getSiswaList(1, 50, query, kelasId, 'AKTIF'); 
      if (res.success) {
        setSiswaList(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch siswa:', error);
      showToast('Gagal memuat daftar siswa', 'error');
    } finally {
      setLoadingSiswa(false);
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      fetchKelas();
      setSelectedKelas('');
      setSelectedSiswa('');
      setSiswaSearch('');
      setSiswaList([]);
    }
  }, [isModalOpen]);

  // Update siswa list when class or search changes
  useEffect(() => {
    if (!isModalOpen || !selectedKelas) return;
    
    fetchSiswa(debouncedSiswaSearch, selectedKelas);
  }, [debouncedSiswaSearch, selectedKelas, isModalOpen]);

  // Handle Assign
  const handleAssign = async () => {
    if (!selectedSiswa || !selectedKelas) return;
    try {
      setSubmitting(true);
      const res = await assignPetugas({ 
        siswa_id: selectedSiswa,
        kelas_id: selectedKelas
      });
      if (res.success) {
        showToast('Petugas berhasil ditambahkan', 'success');
        setIsModalOpen(false);
        fetchPetugas();
      } else {
        showToast(res.message || 'Gagal menambahkan petugas', 'error');
      }
    } catch (error: any) {
      showToast(error?.message || 'Terjadi kesalahan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Unassign
  const handleUnassign = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Hapus Petugas',
      description: `Apakah Anda yakin ingin menghapus petugas ${name}?`,
      confirmText: 'Hapus',
      style: 'danger',
    });

    if (ok) {
      try {
        const res = await unassignPetugas(id);
        if (res.success) {
          showToast('Petugas berhasil dihapus', 'success');
          fetchPetugas();
        }
      } catch (error: any) {
        showToast(error?.message || 'Gagal menghapus petugas', 'error');
      }
    }
  };



  const columns = useMemo<Column[]>(() => {
    const cols: Column[] = [
      {
        key: 'nama',
        label: 'Nama Siswa',
        render: (_: any, item: any) => (
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {item.Siswa?.nama_siswa}
          </div>
        )
      },
      {
        key: 'nis',
        label: 'NIS / NISN',
        render: (_: any, item: any) => (
          <div className="text-sm text-gray-500">
            {item.Siswa?.nis}
            {item.Siswa?.nisn && <span className="text-xs ml-1 text-gray-400">({item.Siswa.nisn})</span>}
          </div>
        )
      },
      {
        key: 'kelas',
        label: 'Kelas',
        render: (_: any, item: any) => item.Siswa?.Kelas?.nama_kelas || '-'
      },
      {
        key: 'status',
        label: 'Status',
        render: (_: any, item: any) => (
          <Badge variant={item.is_active ? 'success' : 'secondary'}>
            {item.is_active ? 'Aktif' : 'Non-Aktif'}
          </Badge>
        )
      }
    ];

    if (canManage) {
      cols.push({
        key: 'actions',
        label: 'Aksi',
        className: 'text-right',
        render: (_: any, item: any) => (
          <div className="flex justify-end">
             <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => handleUnassign(item.id, item.Siswa?.nama_siswa)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
          </div>
        )
      });
    }
    return cols;
  }, [canManage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Daftar Petugas Kelas
        </h2>
        {canManage && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Petugas
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cari petugas..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden dark:border-gray-700">
        <Table
          columns={columns}
          data={petugas}
          loading={loading}
          emptyMessage="Belum ada petugas kelas."
        />
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Assign Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tambah Petugas Kelas"
        description="Pilih kelas dan siswa untuk dijadikan petugas kelas."
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pilih Kelas
            </label>
            <SearchableSelect
              value={selectedKelas}
              onValueChange={(val) => {
                setSelectedKelas(val);
                setSelectedSiswa('');
                setSiswaSearch('');
              }}
              options={kelasOptions}
              placeholder="Pilih kelas..."
              searchPlaceholder="Cari kelas..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pilih Siswa
            </label>
            <SearchableSelect
              value={selectedSiswa}
              onValueChange={setSelectedSiswa}
              options={siswaList.map(s => ({
                label: `${s.nama_siswa} (${s.Kelas?.nama_kelas || 'No Kelas'})`,
                value: s.id
              }))}
              placeholder={!selectedKelas ? "Pilih kelas terlebih dahulu" : "Pilih siswa..."}
              searchPlaceholder="Cari siswa..."
              disabled={!selectedKelas}
              isLoading={loadingSiswa}
              onSearch={setSiswaSearch}
              emptyMessage={!selectedKelas ? "Silakan pilih kelas" : "Tidak ada siswa ditemukan"}
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitting}>
            Batal
          </Button>
          <Button onClick={handleAssign} disabled={!selectedSiswa || !selectedKelas || submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { Button, Modal, ModalFooter, Table, Pagination, Badge, Input } from '../../ui';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { Plus, Trash2, Search, ShieldCheck } from 'lucide-react';
import useConfirm from '../../../hooks/useConfirm';
import { toast } from 'react-hot-toast';
import { getPetugasList, assignPetugas, unassignPetugas } from '../../../api/attendance/petugas.api';
import type { PetugasResponse } from '../../../api/attendance/petugas.api';
import { getSiswaList } from '../../../api/academic/siswa.api';
import { getKelasList } from '../../../api/academic/kelas.api';
import type { Siswa } from '../../../types/academic';
import type { Column } from '../../ui/Table';
import { useDebounce } from '../../../hooks/useDebounce';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileAcademicList } from '../../academic/shared/MobileAcademicList';
import { cn } from '@/lib/utils';

export default React.memo(function PetugasList() {
  const { user } = useAuthStore();
  const confirm = useConfirm();

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

  const { isAdmin, can } = useCapabilities();
  const canManage = useMemo(() => {
    return isAdmin || can('attendance.officers.manage');
  }, [isAdmin, can]);

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
      toast.error('Gagal memuat daftar petugas');
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
      toast.error('Gagal memuat daftar kelas');
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
      toast.error('Gagal memuat daftar siswa');
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
        toast.success('Petugas berhasil ditambahkan');
        setIsModalOpen(false);
        fetchPetugas();
      } else {
        toast.error(res.message || 'Gagal menambahkan petugas');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Terjadi kesalahan');
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
          toast.success('Petugas berhasil dihapus');
          fetchPetugas();
        }
      } catch (error: any) {
        toast.error(error?.message || 'Gagal menghapus petugas');
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
  }, [canManage, handleUnassign]);

  const isMobile = useIsMobile();

  const renderPetugasMobileCard = useCallback((item: PetugasResponse) => {
    const siswa = item.Siswa;
    const kelas = siswa?.Kelas?.nama_kelas || '-';
    const isActive = item.is_active;

    return (
      <div
        key={item.id}
        className={cn(
          "relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-200 space-y-3",
          isActive 
            ? "bg-gradient-to-br from-emerald-500/5 via-white to-emerald-500/10 dark:from-emerald-950/30 dark:via-slate-900 dark:to-emerald-950/20 border-emerald-300/80 dark:border-emerald-700/60 ring-1 ring-emerald-500/20"
            : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
        )}
      >
        {/* Top Accent Strip for Active */}
        {isActive && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
        )}

        {/* Header: Icon + Siswa Name + Status Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
              isActive 
                ? "bg-emerald-500 text-white shadow-emerald-500/30" 
                : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
            )}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                {siswa?.nama_siswa || '-'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium font-mono mt-0.5">
                NIS: {siswa?.nis || '-'} {siswa?.nisn ? `(${siswa.nisn})` : ''}
              </p>
            </div>
          </div>

          <Badge variant={isActive ? 'success' : 'secondary'} className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
            {isActive ? 'Aktif' : 'Non-Aktif'}
          </Badge>
        </div>

        {/* Details: Kelas & Penugasan */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Kelas / Rombel</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {kelas}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Peran Petugas</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              Petugas Presensi
            </span>
          </div>
        </div>

        {/* Actions */}
        {canManage && (
          <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleUnassign(item.id, siswa?.nama_siswa || '')}
              className="text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus Penugasan
            </Button>
          </div>
        )}
      </div>
    );
  }, [canManage, handleUnassign]);

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

      {isMobile ? (
        <div className="space-y-4">
          <MobileAcademicList
            title="Daftar Petugas"
            data={petugas}
            loading={loading}
            totalItems={petugas.length}
            onRefresh={fetchPetugas}
            onAdd={canManage ? () => setIsModalOpen(true) : undefined}
            canManage={canManage}
            emptyMessage="Belum ada petugas kelas."
            pagination={{
              currentPage: page,
              totalPages: totalPages,
              onPageChange: setPage
            }}
            renderCard={renderPetugasMobileCard}
          />
        </div>
      ) : (
        <>
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
        </>
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
});

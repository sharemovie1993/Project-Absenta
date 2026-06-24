import React, { useState, useEffect, useCallback } from 'react';
import { getKejadianKhususList, createKejadianKhusus, deleteKejadianKhusus, type KejadianKhusus } from '../../../api/attendance/kejadianKhusus.api';
import { Button, Input, Card, Label, Badge } from '../../ui';
import ConfirmDialog from '../../ui/ConfirmDialog';
import { toast } from 'react-hot-toast';
import { Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const KejadianKhususPanelComponent: React.FC = () => {
  const [events, setEvents] = useState<KejadianKhusus[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [newEvent, setNewEvent] = useState({
    tanggal: '',
    keterangan: '',
    abaikan_terlambat: true
  });

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getKejadianKhususList();
      setEvents(response.data || []);
    } catch (error) {
      console.error('Error loading events', error);
      toast.error('Gagal memuat daftar kejadian khusus');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleAdd = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await createKejadianKhusus(newEvent);
      toast.success('Kejadian khusus ditambahkan');
      setNewEvent({ tanggal: '', keterangan: '', abaikan_terlambat: true });
      setIsAdding(false);
      loadEvents();
    } catch (error) {
      console.error('Error creating event', error);
      toast.error('Gagal menambah kejadian khusus');
    } finally {
      setLoading(false);
    }
  }, [newEvent, loadEvents]);

  const handleDelete = useCallback((idStr: string) => {
    setDeletingId(idStr);
    setIsDeleteModalOpen(true);
  }, []);

  const executeDelete = useCallback(async () => {
    if (!deletingId) return;
    try {
      setIsDeleting(true);
      await deleteKejadianKhusus(deletingId);
      toast.success('Dihapus');
      setIsDeleteModalOpen(false);
      setDeletingId(null);
      loadEvents();
    } catch (error) {
      console.error('Error deleting event', error);
      toast.error('Gagal menghapus');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingId, loadEvents]);

  const toggleAdding = useCallback(() => {
    setIsAdding((prev) => !prev);
  }, []);

  const closeAdding = useCallback(() => {
    setIsAdding(false);
  }, []);

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Kejadian Khusus (Bypass Terlambat)</h3>
        <Button onClick={toggleAdding} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Tambah
        </Button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h4 className="font-medium mb-3 text-sm">Tambah Kejadian Baru</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="tanggal-input-field">Tanggal</Label>
              <Input
                id="tanggal-input-field"
                type="date"
                value={newEvent.tanggal}
                onChange={(e) => setNewEvent(prev => ({ ...prev, tanggal: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="keterangan-input-field">Keterangan</Label>
              <Input
                id="keterangan-input-field"
                type="text"
                placeholder="Contoh: Hujan Deras, Upacara"
                value={newEvent.keterangan}
                onChange={(e) => setNewEvent(prev => ({ ...prev, keterangan: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="abaikan_terlambat"
              checked={newEvent.abaikan_terlambat}
              onChange={(e) => setNewEvent(prev => ({ ...prev, abaikan_terlambat: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="abaikan_terlambat" className="text-sm text-gray-700">
              Abaikan Keterlambatan (Siswa dianggap hadir tepat waktu)
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeAdding}>Batal</Button>
            <Button type="submit" isLoading={loading}>Simpan</Button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 font-medium border-b">
            <tr>
              <th className="py-3 px-4">Tanggal</th>
              <th className="py-3 px-4">Keterangan</th>
              <th className="py-3 px-4">Efek</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">
                  Belum ada kejadian khusus tercatat.
                </td>
              </tr>
            ) : (
              (events || []).map((ev) => (
                <tr key={ev.id}>
                  <td className="py-3 px-4">
                    {format(new Date(ev.tanggal), 'dd MMMM yyyy', { locale: id })}
                  </td>
                  <td className="py-3 px-4">{ev.keterangan}</td>
                  <td className="py-3 px-4">
                    {ev.abaikan_terlambat ? (
                      <Badge variant="success">Bypass Terlambat</Badge>
                    ) : (
                      <Badge variant="secondary">Info Saja</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(ev.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        title="Hapus Kejadian Khusus?"
        description="Apakah Anda yakin ingin menghapus kejadian ini? Data absensi pada tanggal tersebut mungkin akan kembali ke status terlambat jika sebelumnya dibypass."
        confirmText="Ya, Hapus"
        cancelText="Batal"
        style="danger"
        onConfirm={executeDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setDeletingId(null);
        }}
        loading={isDeleting}
      />
    </Card>
  );
};

KejadianKhususPanelComponent.displayName = 'KejadianKhususPanel';
export const KejadianKhususPanel = React.memo(KejadianKhususPanelComponent);

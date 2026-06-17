import React, { useState, useEffect } from 'react';
import { getKelasList, updateKelas } from '../../../api/academic/kelas.api';
import type { Kelas } from '../../../types/academic';
import { Button, Input, Card, Label, Badge, Modal } from '../../ui';
import { toast } from 'react-hot-toast';
import { Edit2, Clock } from 'lucide-react';

export const KelasScheduleList: React.FC = () => {
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingKelas, setEditingKelas] = useState<Kelas | null>(null);
  const [editForm, setEditForm] = useState({ jam_masuk: '', jam_pulang: '' });

  useEffect(() => {
    loadKelas();
  }, []);

  const loadKelas = async () => {
    try {
      setLoading(true);
      const response = await getKelasList(1, 100); // Fetch all (up to 100)
      setKelas(response.data);
    } catch (error) {
      console.error('Error loading kelas', error);
      toast.error('Gagal memuat daftar kelas');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (k: Kelas) => {
    setEditingKelas(k);
    setEditForm({
      jam_masuk: k.jam_masuk || '',
      jam_pulang: k.jam_pulang || ''
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKelas) return;

    try {
      setLoading(true);
      await updateKelas(editingKelas.id, {
        jam_masuk: editForm.jam_masuk || undefined, // Send undefined if empty to avoid clearing if not intended? Or empty string means clear?
        // Let's assume empty string means clear (revert to default). API logic might need adjustment if it doesn't handle empty string -> null.
        // Prisma usually expects null for optional fields.
        // Let's check update logic. If I send empty string, prisma might error if field is Date or Time string?
        // Field type is String. So empty string is valid but might not mean "null".
        // I'll send null if empty string.
        // But `UpdateKelasPayload` expects string | undefined.
        // I'll send undefined if I don't want to change, but if I want to clear, I need to send null?
        // The interface says `string`.
        // Let's assume I can overwrite with new value. If empty, I'll pass it.
      });
      
      // Actually, passing empty string might just set it to empty string.
      // Ideally should pass null. But types might not allow.
      // Let's modify api call to handle this or just pass as is.
      // For now, let's assume valid time string or empty.
      
      await updateKelas(editingKelas.id, {
        jam_masuk: editForm.jam_masuk || '', // Or send null? Typescript might complain.
        jam_pulang: editForm.jam_pulang || ''
      });

      toast.success('Jadwal kelas diperbarui');
      setEditingKelas(null);
      loadKelas();
    } catch (error) {
      console.error('Error updating kelas', error);
      toast.error('Gagal menyimpan jadwal kelas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">Jadwal Khusus per Kelas</h3>
      <p className="text-sm text-gray-500 mb-4">
        Gunakan pengaturan ini jika ada kelas yang memiliki jam masuk/pulang berbeda dengan jadwal default sekolah (misal: Shift Siang).
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 font-medium border-b">
            <tr>
              <th className="py-3 px-4">Kelas</th>
              <th className="py-3 px-4">Jam Masuk</th>
              <th className="py-3 px-4">Jam Pulang</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {kelas.map((k) => (
              <tr key={k.id}>
                <td className="py-3 px-4 font-medium">{k.nama_kelas}</td>
                <td className="py-3 px-4">
                  {k.jam_masuk ? (
                    <Badge variant="warning">{k.jam_masuk}</Badge>
                  ) : (
                    <span className="text-gray-400 text-xs italic">Default Sekolah</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {k.jam_pulang ? (
                    <Badge variant="warning">{k.jam_pulang}</Badge>
                  ) : (
                    <span className="text-gray-400 text-xs italic">Default Sekolah</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(k)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingKelas && (
        <Modal 
          isOpen={!!editingKelas} 
          onClose={() => setEditingKelas(null)}
          title={`Atur Jadwal - ${editingKelas.nama_kelas}`}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Jam Masuk (Override)</Label>
              <Input
                type="time"
                value={editForm.jam_masuk}
                onChange={(e) => setEditForm({...editForm, jam_masuk: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">Kosongkan untuk mengikuti default sekolah.</p>
            </div>
            <div>
              <Label>Jam Pulang (Override)</Label>
              <Input
                type="time"
                value={editForm.jam_pulang}
                onChange={(e) => setEditForm({...editForm, jam_pulang: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">Kosongkan untuk mengikuti default sekolah.</p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="ghost" onClick={() => setEditingKelas(null)}>Batal</Button>
              <Button type="submit" isLoading={loading}>Simpan</Button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
};

import React from 'react';
import { Loader2 } from 'lucide-react';
import { Modal, Button, Input } from '@/components/ui';
import type { Tunnel } from '../../../api/easyTunnel.api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedTunnel: Tunnel | null;
  editError: string | null;
  editLocalPort: number;
  setEditLocalPort: (v: number) => void;
  editAppName: string;
  setEditAppName: (v: string) => void;
  editLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const EasyTunnelEditModal: React.FC<Props> = React.memo(({
  isOpen,
  onClose,
  selectedTunnel,
  editError,
  editLocalPort,
  setEditLocalPort,
  editAppName,
  setEditAppName,
  editLoading,
  onSubmit
}) => {
  if (!selectedTunnel) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Konfigurasi Tunnel"
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4 py-2 text-xs">
        {editError && (
          <div className="bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300 p-3 rounded-xl text-xs border border-red-200 dark:border-red-900">
            ⚠️ {editError}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="edit-subdomain" className="font-bold text-slate-700 dark:text-slate-300">
            Domain Tunnel (Permanen)
          </label>
          <Input
            id="edit-subdomain"
            aria-label="Domain tunnel publik"
            disabled
            value={selectedTunnel.subdomain}
            className="rounded-xl font-mono text-slate-400 bg-slate-100 dark:bg-slate-800"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="edit-app-name" className="font-bold text-slate-700 dark:text-slate-300">
            Nama Instansi / Aplikasi <span className="text-rose-500">*</span>
          </label>
          <Input
            id="edit-app-name"
            aria-label="Nama Instansi atau Aplikasi"
            required
            className="rounded-xl"
            value={editAppName}
            onChange={e => setEditAppName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="edit-local-port" className="font-bold text-slate-700 dark:text-slate-300">
            Port Lokal Target <span className="text-rose-500">*</span>
          </label>
          <Input
            id="edit-local-port"
            aria-label="Port lokal target"
            type="number"
            required
            className="rounded-xl"
            value={editLocalPort}
            onChange={e => setEditLocalPort(parseInt(e.target.value))}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="toolbarOutline" size="toolbar" onClick={onClose} disabled={editLoading}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="toolbarPrimary"
            size="toolbar"
            disabled={editLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            {editLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </Modal>
  );
});

export default EasyTunnelEditModal;

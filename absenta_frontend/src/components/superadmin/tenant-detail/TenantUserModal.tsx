import React from 'react';
import { Modal, Button, SearchableSelect, Loader } from '@/components/ui';
import type { TenantUser } from '@/api/tenant-detail.api';
import type { RoleItem } from '@/api/user.api';

interface TenantUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser: TenantUser | null;
  userFormData: {
    full_name: string;
    email: string;
    password: string;
    role_id: string;
    status: 'ACTIVE' | 'INACTIVE';
  };
  setUserFormData: React.Dispatch<React.SetStateAction<{
    full_name: string;
    email: string;
    password: string;
    role_id: string;
    status: 'ACTIVE' | 'INACTIVE';
  }>>;
  onSubmit: () => Promise<void>;
  loading: boolean;
  roles: RoleItem[];
  rolesLoading: boolean;
}

export const TenantUserModal: React.FC<TenantUserModalProps> = ({
  isOpen,
  onClose,
  selectedUser,
  userFormData,
  setUserFormData,
  onSubmit,
  loading,
  roles,
  rolesLoading
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedUser ? 'Edit Pengguna' : 'Tambah Pengguna'}
    >
      <div className="p-6">
        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="user-fullname" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nama Lengkap *
            </label>
            <input
              id="user-fullname"
              type="text"
              value={userFormData.full_name}
              onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Masukkan nama lengkap"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="user-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email *
            </label>
            <input
              id="user-email"
              type="email"
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Masukkan email"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="user-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password {!selectedUser && '*'}
            </label>
            <input
              id="user-password"
              type="password"
              value={userFormData.password}
              onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={selectedUser ? "Kosongkan jika tidak ingin mengubah password" : "Masukkan password"}
            />
          </div>

          {/* Role */}
          <div>
            <label htmlFor="user-role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role *
            </label>
            <SearchableSelect
              id="user-role"
              value={userFormData.role_id}
              onValueChange={(val) => setUserFormData({ ...userFormData, role_id: val })}
              options={[
                { value: "", label: "Pilih Role" },
                ...(roles || []).map((role) => ({ value: role.id, label: role.name }))
              ]}
              placeholder="Pilih Role"
              searchPlaceholder="Cari role..."
              disabled={rolesLoading}
              triggerClassName="w-full"
            />
            {rolesLoading && (
              <p className="text-sm text-gray-500 mt-1">Memuat daftar role...</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label htmlFor="user-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <SearchableSelect
              id="user-status"
              value={userFormData.status}
              onValueChange={(val) => setUserFormData({ ...userFormData, status: val as 'ACTIVE' | 'INACTIVE' })}
              options={[
                { value: "ACTIVE", label: "Aktif" },
                { value: "INACTIVE", label: "Tidak Aktif" }
              ]}
              placeholder="Pilih Status"
              searchPlaceholder="Cari status..."
              triggerClassName="w-full"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={loading}
          >
            Batal
          </Button>
          <Button 
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                {selectedUser ? 'Menyimpan...' : 'Menambahkan...'}
              </>
            ) : (
              selectedUser ? 'Simpan' : 'Tambah'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

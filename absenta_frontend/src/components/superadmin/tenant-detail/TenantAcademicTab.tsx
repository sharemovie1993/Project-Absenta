import React from 'react';
import { GraduationCap, Users, Building2, BookOpen, Eye } from 'lucide-react';
import { 
  SectionCard,
  Button,
  Table,
  Badge,
  Loader
} from '@/components/ui';
import type { AcademicData } from '@/api/tenant-detail.api';
import { formatDateTime } from '@/utils/layoutUtils';

interface TenantAcademicTabProps {
  academicData: AcademicData | null;
  academicLoading: boolean;
  onExport: (format: 'JSON' | 'CSV' | 'EXCEL') => Promise<void>;
  isExporting: boolean;
}

export const TenantAcademicTab: React.FC<TenantAcademicTabProps> = ({
  academicData,
  academicLoading,
  onExport,
  isExporting
}) => {
  return (
    <div className="space-y-6">
      {/* Academic Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Data Akademik & Master
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport('EXCEL')}
            disabled={isExporting || !academicData}
            className="flex items-center gap-2"
          >
            {isExporting ? <Loader className="h-4 w-4 animate-spin" /> : <Eye size={14} />}
            Export Data Akademik
          </Button>
        </div>
      </div>

      {academicLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Memuat data akademik...</span>
        </div>
      ) : academicData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Guru Table */}
          <SectionCard
            title="Daftar Guru"
            icon={GraduationCap}
            fullWidth
            noPadding
          >
            <div className="p-4">
              <Table
                columns={[
                  { key: 'nama', label: 'Nama Guru' },
                  { key: 'email', label: 'Email' },
                  { 
                    key: 'last_login', 
                    label: 'Login Terakhir',
                    render: (val: unknown) => val ? formatDateTime(String(val)) : '-'
                  }
                ]}
                data={academicData.guru?.slice(0, 10) || []}
                emptyMessage="Belum ada data guru"
              />
              {(academicData.guru?.length || 0) > 10 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">Menampilkan 10 dari {academicData.guru?.length} guru</p>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Kelas Table */}
          <SectionCard
            title="Daftar Kelas"
            icon={Building2}
            fullWidth
            noPadding
          >
            <div className="p-4">
              <Table
                columns={[
                  { key: 'nama', label: 'Nama Kelas' },
                  { key: 'tingkat', label: 'Tingkat' },
                  { 
                    key: 'totalSiswa', 
                    label: 'Jumlah Siswa',
                    render: (val: unknown) => <Badge variant="secondary">{String(val || 0)}</Badge>
                  }
                ]}
                data={academicData.kelas?.slice(0, 10) || []}
                emptyMessage="Belum ada data kelas"
              />
              {(academicData.kelas?.length || 0) > 10 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">Menampilkan 10 dari {academicData.kelas?.length} kelas</p>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Siswa Table (Full Width) */}
          <div className="lg:col-span-2">
            <SectionCard
              title="Siswa Terbaru"
              icon={Users}
              fullWidth
              noPadding
            >
              <div className="p-4">
                <Table
                  columns={[
                    { key: 'nama', label: 'Nama Siswa' },
                    { key: 'nis', label: 'NIS' },
                    { 
                      key: 'kelas', 
                      label: 'Kelas',
                      render: (val: any) => val?.nama || '-'
                    },
                    { 
                      key: 'status', 
                      label: 'Status',
                      render: (val: unknown) => (
                        <Badge variant={val === 'ACTIVE' ? 'success' : 'secondary'}>
                          {String(val || 'ACTIVE')}
                        </Badge>
                      )
                    }
                  ]}
                  data={academicData.siswa?.slice(0, 10) || []}
                  emptyMessage="Belum ada data siswa"
                />
              </div>
            </SectionCard>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed">
          <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Data akademik tidak tersedia</p>
        </div>
      )}
    </div>
  );
};

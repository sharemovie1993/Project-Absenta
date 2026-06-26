import { useState } from 'react';
import { 
  exportToCSV, 
  exportToExcel,
  formatDateForExport,
  formatCurrencyForExport,
  formatStatusForExport
} from '../utils/exportUtils';
import type { ExportOptions } from '../utils/exportUtils';
import toast from 'react-hot-toast';

export interface UseExportOptions {
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: Error) => void;
}

export const useExport = (options: UseExportOptions = {}) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportData = async <T extends Record<string, unknown>>(exportOptions: ExportOptions<T>) => {
    try {
      setIsExporting(true);
      options.onExportStart?.();

      // Add small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));

      if (exportOptions.format === 'CSV') {
        exportToCSV(exportOptions);
      } else if (exportOptions.format === 'EXCEL') {
        exportToExcel(exportOptions);
      }

      toast.success(`Data berhasil diekspor ke ${exportOptions.format.toUpperCase()}`);
      options.onExportComplete?.();
    } catch (error) {
      console.error('Export error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengekspor data';
      toast.error(`Gagal mengekspor data: ${errorMessage}`);
      options.onExportError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsExporting(false);
    }
  };

  // Pre-configured export functions for common data types
  const exportUsers = (users: any[], format: 'CSV' | 'EXCEL' = 'CSV') => {
    const filename = `users_${new Date().toISOString().split('T')[0]}`;
    
    exportData({
      filename,
      format,
      data: users,
      columns: [
        { key: 'full_name', label: 'Nama Lengkap' },
        { key: 'email', label: 'Email' },
        { key: 'role_name', label: 'Role' },
        { 
          key: 'status', 
          label: 'Status',
          formatter: formatStatusForExport
        },
        { 
          key: 'created_at', 
          label: 'Tanggal Dibuat',
          formatter: formatDateForExport
        },
        { 
          key: 'last_login', 
          label: 'Login Terakhir',
          formatter: (value: any) => value ? formatDateForExport(value) : 'Belum pernah login'
        }
      ]
    });
  };

  const exportActivities = (activities: any[], format: 'CSV' | 'EXCEL' = 'CSV') => {
    const filename = `activities_${new Date().toISOString().split('T')[0]}`;
    
    exportData({
      filename,
      format,
      data: activities,
      columns: [
        { 
          key: 'created_at', 
          label: 'Tanggal & Waktu',
          formatter: formatDateForExport
        },
        { key: 'user_name', label: 'Pengguna' },
        { key: 'description', label: 'Deskripsi Aktivitas' },
        { key: 'ip_address', label: 'IP Address' },
        { key: 'user_agent', label: 'User Agent' }
      ]
    });
  };

  const exportLogs = (logs: any[], format: 'CSV' | 'EXCEL' = 'CSV') => {
    const filename = `activity_logs_${new Date().toISOString().split('T')[0]}`;
    
    exportData({
      filename,
      format,
      data: logs,
      columns: [
        { 
          key: 'timestamp', 
          label: 'Waktu',
          formatter: formatDateForExport
        },
        { 
          key: 'user', 
          label: 'Pengguna',
          formatter: (user: any) => user ? `${user.full_name} (${user.email})` : 'System'
        },
        { 
          key: 'action', 
          label: 'Aksi',
          formatter: formatStatusForExport
        },
        { key: 'entity', label: 'Entitas' },
        { key: 'entity_id', label: 'ID Entitas' },
        { 
          key: 'metadata', 
          label: 'Detail',
          formatter: (metadata: any) => {
            if (!metadata) return '';
            return typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
          }
        }
      ]
    });
  };

  const exportAcademicData = (academicData: any, format: 'CSV' | 'EXCEL' = 'CSV') => {
    const filename = `academic_data_${new Date().toISOString().split('T')[0]}`;
    
    // Flatten academic data for export
    const flattenedData = [
      {
        category: 'Jurusan',
        total: academicData?.jurusan?.length || 0,
        details: academicData?.jurusan?.map((j: any) => j.nama).join(', ') || ''
      },
      {
        category: 'Kelas',
        total: academicData?.kelas?.length || 0,
        details: academicData?.kelas?.map((k: any) => k.nama).join(', ') || ''
      },
      {
        category: 'Guru',
        total: academicData?.guru?.length || 0,
        details: academicData?.guru?.map((g: any) => g.nama).join(', ') || ''
      },
      {
        category: 'Siswa',
        total: academicData?.siswa?.length || 0,
        details: `${academicData?.siswa?.length || 0} siswa terdaftar`
      }
    ];
    
    exportData({
      filename,
      format,
      data: flattenedData,
      columns: [
        { key: 'category', label: 'Kategori' },
        { key: 'total', label: 'Total' },
        { key: 'details', label: 'Detail' }
      ]
    });
  };

  const exportAttendanceData = (attendanceData: any, format: 'CSV' | 'EXCEL' = 'CSV') => {
    const filename = `attendance_data_${new Date().toISOString().split('T')[0]}`;
    
    // Flatten attendance data for export
    const flattenedData = [
      {
        metric: 'Total Kehadiran',
        value: attendanceData?.summary?.totalAttendance || 0,
        percentage: attendanceData?.summary?.attendanceRate ? `${attendanceData.summary.attendanceRate}%` : '0%'
      },
      {
        metric: 'Hadir',
        value: attendanceData?.summary?.present || 0,
        percentage: attendanceData?.summary?.presentRate ? `${attendanceData.summary.presentRate}%` : '0%'
      },
      {
        metric: 'Tidak Hadir',
        value: attendanceData?.summary?.absent || 0,
        percentage: attendanceData?.summary?.absentRate ? `${attendanceData.summary.absentRate}%` : '0%'
      },
      {
        metric: 'Izin',
        value: attendanceData?.summary?.permission || 0,
        percentage: attendanceData?.summary?.permissionRate ? `${attendanceData.summary.permissionRate}%` : '0%'
      },
      {
        metric: 'Sakit',
        value: attendanceData?.summary?.sick || 0,
        percentage: attendanceData?.summary?.sickRate ? `${attendanceData.summary.sickRate}%` : '0%'
      }
    ];
    
    exportData({
      filename,
      format,
      data: flattenedData,
      columns: [
        { key: 'metric', label: 'Metrik' },
        { key: 'value', label: 'Nilai' },
        { key: 'percentage', label: 'Persentase' }
      ]
    });
  };

  return {
    isExporting,
    exportData,
    exportUsers,
    exportActivities,
    exportLogs,
    exportAcademicData,
    exportAttendanceData,
    // Utility formatters
    formatters: {
      date: formatDateForExport,
      currency: formatCurrencyForExport,
      status: formatStatusForExport
    }
  };
};

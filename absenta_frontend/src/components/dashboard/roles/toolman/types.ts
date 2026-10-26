import React from 'react';

export type ToolmanTabId = 'ringkasan' | 'pinjam' | 'servis' | 'alat' | 'rekap';

export interface ToolmanNavTabItem {
  id: ToolmanTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string | number | null;
  badgeColor?: string;
}

export interface ToolmanStats {
  tools_borrowed?: number;
  tools_available?: number;
  damaged_reports?: number;
  total_tools?: number;
  active_loans?: Array<{
    id: string;
    nama_peminjam: string;
    nama_alat: string;
    kode_alat?: string;
    tanggal_pinjam: string;
    status: string;
  }>;
  pending_maintenance?: Array<{
    id: string;
    nama_alat: string;
    teknisi?: string;
    status: string;
    tanggal_mulai: string;
  }>;
}

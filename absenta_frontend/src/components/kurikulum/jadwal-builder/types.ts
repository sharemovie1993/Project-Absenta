import { DropdownOption } from '../../../api/dropdown.api';
import { JadwalKBM } from '../../../api/attendance/jadwalKBM.api';

export type ViewMode = 'KELAS' | 'GURU' | 'MASTER_GURU' | 'MASTER_KELAS';
export type ToolMode = 'PAINT' | 'ERASER';
export type ColorByMode = 'MAPEL' | 'GURU';

export interface JadwalBuilderProps {
  tahunPelajaranId?: string;
  semesterId?: string;
  onRefresh?: () => void;
  onOpenPrintPreview?: () => void;
}

export interface TeacherBebanItem {
  id: string;
  nama_guru: string;
  nip?: string;
  max_jp: number;
  current_jp: number;
  ekuivalen_position_jp?: number;
  total_calculated_jp?: number;
  positions?: Array<{ name: string; ekuivalen_jp: number }>;
}

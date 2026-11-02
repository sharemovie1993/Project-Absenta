/**
 * Universal Role-Ready View: Radar Remedial & Ketuntasan Siswa
 * 
 * Standar Industri Reusable Component (Skill: universal-role-ready-view).
 * Memungkinkan pemanggilan tab/modal radar remedial dari berbagai dashboard role:
 * - Guru Mata Pelajaran (Role Mode: 'guru') -> Membedah nilai & submit remedial per mapel
 * - Wali Kelas (Role Mode: 'walas') -> Memantau ketuntasan seluruh mapel siswa di rombel binaan (Read-Only)
 * - Kurikulum / Kaprog / Kepsek (Role Mode: 'view') -> Monitoring menyeluruh
 */

export { TeacherRadarRemedialSubTab as RadarRemedialView } from '../../dashboard/staff/beranda/TeacherRadarRemedialSubTab';
export type { UniversalRadarRemedialProps } from '../../dashboard/staff/beranda/TeacherRadarRemedialSubTab';

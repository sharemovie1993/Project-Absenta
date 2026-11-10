/**
 * dapodikAuditTemplates.ts
 * Standar Template & Skenario Audit Komparasi Data Dapodik vs Database Absenta.
 */

import { CompareOptions } from '@/api/dapodik.api';

export interface DapodikAuditTemplate {
  id: string;
  name: string;
  badge: string;
  description: string;
  scenario: string;
  options: CompareOptions;
}

export const DAPODIK_AUDIT_TEMPLATES: DapodikAuditTemplate[] = [
  {
    id: 'ppdb_kelas_x',
    name: 'PPDB & Siswa Baru (Kelas X)',
    badge: 'PPDB',
    description: 'Pencocokan identitas pokok fisik & kependudukan peserta didik baru tanpa terikat NIS lokal.',
    scenario: 'Gunakan saat awal tahun ajaran untuk memverifikasi data siswa baru hasil penarikan Dapodik.',
    options: {
      checkNama: true,
      checkNis: false,
      checkNisn: true,
      checkNik: true,
      checkKelas: false,
      checkJenisKelamin: true,
      checkTanggalLahir: true,
      checkTempatLahir: true,
      ignoreClassWhitespace: true,
      onlyActiveStudents: true,
    },
  },
  {
    id: 'ijazah_kelulusan',
    name: 'Validasi Ijazah & Kelulusan (Kelas XII)',
    badge: 'Ijazah / DKN',
    description: 'Verifikasi ketat 100% untuk nominasi ANBK, DKN, dan penulisan blangko Ijazah resmi.',
    scenario: 'Gunakan menjelang kelulusan kelas XII untuk mencegah salah ketik nama, NIK, dan NISN.',
    options: {
      checkNama: true,
      checkNis: true,
      checkNisn: true,
      checkNik: true,
      checkKelas: true,
      checkJenisKelamin: true,
      checkTanggalLahir: true,
      checkTempatLahir: true,
      ignoreClassWhitespace: true,
      onlyActiveStudents: true,
    },
  },
  {
    id: 'rolling_rombel',
    name: 'Kenaikan Kelas & Rolling Rombel',
    badge: 'Rombel',
    description: 'Pencocokan penempatan rombongan belajar aktif antara Dapodik dan Absenta.',
    scenario: 'Gunakan saat pergantian semester / tahun ajaran untuk mendeteksi siswa yang salah kelas.',
    options: {
      checkNama: true,
      checkNis: false,
      checkNisn: true,
      checkNik: false,
      checkKelas: true,
      checkJenisKelamin: false,
      checkTanggalLahir: false,
      checkTempatLahir: false,
      ignoreClassWhitespace: true,
      onlyActiveStudents: true,
    },
  },
  {
    id: 'cutoff_bosp',
    name: 'Kesiapan Cut-Off Dana BOS / BOSP',
    badge: 'BOSP / BOS',
    description: 'Validasi residu NISN dan NIK kependudukan 16 digit menjelang cut-off Dapodik.',
    scenario: 'Gunakan sebelum 31 Agustus atau 31 Januari agar penyaluran dana BOS tepat sasaran.',
    options: {
      checkNama: true,
      checkNis: false,
      checkNisn: true,
      checkNik: true,
      checkKelas: true,
      checkJenisKelamin: true,
      checkTanggalLahir: true,
      checkTempatLahir: false,
      ignoreClassWhitespace: true,
      onlyActiveStudents: true,
    },
  },
  {
    id: 'full_audit',
    name: 'Audit Lengkap (Full Compliance)',
    badge: 'Lengkap',
    description: 'Pemeriksaan menyeluruh seluruh 8 atribut data siswa secara serentak.',
    scenario: 'Gunakan untuk audit bulanan berkala kepatuhan data sekolah.',
    options: {
      checkNama: true,
      checkNis: true,
      checkNisn: true,
      checkNik: true,
      checkKelas: true,
      checkJenisKelamin: true,
      checkTanggalLahir: true,
      checkTempatLahir: true,
      ignoreClassWhitespace: true,
      onlyActiveStudents: true,
    },
  },
];

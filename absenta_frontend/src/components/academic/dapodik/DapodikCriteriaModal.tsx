/**
 * DapodikCriteriaModal.tsx
 * Modal Pengaturan Bidang Pencocokan & Template Skenario Audit Dapodik
 * Memusatkan pemilihan kriteria verifikasi data tanpa membuat halaman utama bising (zero noise).
 */

import React from 'react';
import { 
  SlidersHorizontal, Bookmark, Check, Sparkles, CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';

import { Modal, Button, Badge } from '@/components/ui';
import type { CompareOptions } from '@/api/dapodik.api';
import { DAPODIK_AUDIT_TEMPLATES, type DapodikAuditTemplate } from './dapodikAuditTemplates';

interface DapodikCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTemplateId: string;
  onApplyTemplate: (tmpl: DapodikAuditTemplate) => void;
  compareOptions: CompareOptions;
  setCompareOptions: React.Dispatch<React.SetStateAction<CompareOptions>>;
}

export const DapodikCriteriaModal: React.FC<DapodikCriteriaModalProps> = ({
  isOpen,
  onClose,
  activeTemplateId,
  onApplyTemplate,
  compareOptions,
  setCompareOptions,
}) => {
  const activeCount = Object.entries(compareOptions).filter(
    ([k, v]) => k.startsWith('check') && Boolean(v)
  ).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Kriteria Pencocokan &amp; Template Audit
            </h3>
            <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
              Atur bidang data yang menjadi tolak ukur penentuan status Selaras (Match) vs Selisih (Mismatch)
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Skenario Template Audit */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
              Template Skenario Audit Instan:
            </span>
            <span className="text-[11px] text-slate-400">Klik untuk menerapkan aturan otomatis</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DAPODIK_AUDIT_TEMPLATES.map((tmpl) => {
              const isSelected = activeTemplateId === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => onApplyTemplate(tmpl)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 shadow-xs ring-1 ring-indigo-500/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      {tmpl.name}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    {tmpl.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pemilihan Bidang Atribut Detail */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Bidang Atribut yang Diperiksa ({activeCount} Aktif):
            </span>
            <span className="text-[11px] text-slate-400">Centang bidang yang ingin dievaluasi</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={compareOptions.checkNama}
                onChange={(e) => setCompareOptions({ ...compareOptions, checkNama: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Nama Siswa</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={compareOptions.checkNisn}
                onChange={(e) => setCompareOptions({ ...compareOptions, checkNisn: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">NISN</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={compareOptions.checkNis}
                onChange={(e) => setCompareOptions({ ...compareOptions, checkNis: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">NIS (NIPD)</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={compareOptions.checkNik}
                onChange={(e) => setCompareOptions({ ...compareOptions, checkNik: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">NIK (KTP)</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={compareOptions.checkKelas}
                onChange={(e) => setCompareOptions({ ...compareOptions, checkKelas: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Rombongan Belajar</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={compareOptions.checkJenisKelamin}
                onChange={(e) => setCompareOptions({ ...compareOptions, checkJenisKelamin: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Jenis Kelamin</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={compareOptions.checkTanggalLahir}
                onChange={(e) => setCompareOptions({ ...compareOptions, checkTanggalLahir: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Tanggal Lahir</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={compareOptions.checkTempatLahir}
                onChange={(e) => setCompareOptions({ ...compareOptions, checkTempatLahir: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Tempat Lahir</span>
            </label>
          </div>

          {/* Opsi Khusus Normalisasi Spasi */}
          {compareOptions.checkKelas && (
            <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compareOptions.ignoreClassWhitespace}
                  onChange={(e) => setCompareOptions({ ...compareOptions, ignoreClassWhitespace: e.target.checked })}
                  className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold text-indigo-900 dark:text-indigo-200 text-xs">
                  Abaikan Perbedaan Spasi Rombel (Contoh: "XI TAV2" selaras dengan "XI TAV 2")
                </span>
              </label>
            </div>
          )}

          {/* Presets Cepat */}
          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500">Pilihan Cepat:</span>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2"
              onClick={() => setCompareOptions({
                checkNama: true, checkNis: true, checkNisn: true, checkNik: true,
                checkKelas: true, checkJenisKelamin: true, checkTanggalLahir: true,
                checkTempatLahir: false, ignoreClassWhitespace: true
              })}
            >
              Standar (Semua)
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2"
              onClick={() => setCompareOptions({
                checkNama: true, checkNis: true, checkNisn: true, checkNik: true,
                checkKelas: false, checkJenisKelamin: true, checkTanggalLahir: true,
                checkTempatLahir: false, ignoreClassWhitespace: true
              })}
            >
              Biodata Saja (Abaikan Kelas)
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2"
              onClick={() => setCompareOptions({
                checkNama: false, checkNis: false, checkNisn: false, checkNik: false,
                checkKelas: true, checkJenisKelamin: false, checkTanggalLahir: false,
                checkTempatLahir: false, ignoreClassWhitespace: true
              })}
            >
              Rombel / Kelas Saja
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2"
              onClick={() => setCompareOptions({
                checkNama: true, checkNis: false, checkNisn: true, checkNik: false,
                checkKelas: false, checkJenisKelamin: false, checkTanggalLahir: false,
                checkTempatLahir: false, ignoreClassWhitespace: true
              })}
            >
              Hanya Nama &amp; NISN
            </Button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              onClose();
              toast.success('Kriteria pencocokan aktif diperbarui.');
            }}
            className="h-8 text-xs font-semibold px-4 gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Terapkan Kriteria
          </Button>
        </div>
      </div>
    </Modal>
  );
};

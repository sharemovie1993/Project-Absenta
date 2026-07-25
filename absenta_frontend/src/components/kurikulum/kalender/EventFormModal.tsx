import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import { 
  Button, 
  Input, 
  Modal, 
  ModalFooter, 
  DatePicker, 
  Textarea, 
  SearchableSelect, 
  SimpleFormField 
} from '../../ui';
import { JENIS_OPTIONS } from './constants';

export interface CalendarEvent {
  id: string;
  tenant_id: string;
  tahun_pelajaran_id: string;
  judul: string;
  jenis: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  keterangan?: string | null;
  TahunPelajaran?: { nama: string };
  CreatedBy?: { full_name: string };
}

export interface CalendarPreset {
  id: string;
  judul: string;
  jenis: string;
  keterangan?: string | null;
}

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTarget: CalendarEvent | null;
  tahunOptions: { value: string; label: string }[];
  dbPresets: CalendarPreset[];
  onSubmit: (data: z.infer<typeof eventSchema>) => void;
  isPending: boolean;
  defaultTahunPelajaranId?: string;
  defaultDateStr?: string;
}

const eventSchema = z.object({
  judul: z.string().min(3, 'Judul minimal 3 karakter'),
  jenis: z.string().min(1, 'Jenis event wajib dipilih'),
  tahun_pelajaran_id: z.string().min(1, 'Tahun pelajaran wajib dipilih'),
  tanggal_mulai: z.string().min(1, 'Tanggal mulai wajib diisi'),
  tanggal_selesai: z.string().min(1, 'Tanggal selesai wajib diisi'),
  keterangan: z.string().optional(),
}).refine(d => d.tanggal_selesai >= d.tanggal_mulai, {
  message: 'Tanggal selesai tidak boleh sebelum tanggal mulai',
  path: ['tanggal_selesai'],
});

export const EventFormModal: React.FC<EventFormModalProps> = ({
  isOpen,
  onClose,
  editTarget,
  tahunOptions,
  dbPresets,
  onSubmit,
  isPending,
  defaultTahunPelajaranId = '',
  defaultDateStr = ''
}) => {
  const [form, setForm] = useState<z.infer<typeof eventSchema>>({
    judul: '',
    jenis: 'KEGIATAN',
    tahun_pelajaran_id: defaultTahunPelajaranId,
    tanggal_mulai: defaultDateStr,
    tanggal_selesai: defaultDateStr,
    keterangan: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (editTarget) {
        setForm({
          judul: editTarget.judul,
          jenis: editTarget.jenis,
          tahun_pelajaran_id: editTarget.tahun_pelajaran_id,
          tanggal_mulai: editTarget.tanggal_mulai?.split('T')[0] ?? '',
          tanggal_selesai: editTarget.tanggal_selesai?.split('T')[0] ?? '',
          keterangan: editTarget.keterangan ?? '',
        });
      } else {
        setForm({
          judul: '',
          jenis: 'KEGIATAN',
          tahun_pelajaran_id: defaultTahunPelajaranId,
          tanggal_mulai: defaultDateStr,
          tanggal_selesai: defaultDateStr,
          keterangan: '',
        });
      }
      setFormErrors({});
      setSelectedPreset('');
    }
  }, [isOpen, editTarget, defaultTahunPelajaranId, defaultDateStr]);

  const handleSelectPreset = useCallback((val: string) => {
    setSelectedPreset(val);
    if (!val) return;
    const preset = dbPresets.find(p => p.id === val);
    if (preset) {
      setForm(f => ({
        ...f,
        judul: preset.judul,
        jenis: preset.jenis,
        keterangan: preset.keterangan ?? ''
      }));
    }
  }, [dbPresets]);

  const handleFormSubmit = useCallback(() => {
    const parsed = eventSchema.safeParse(form);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((e: z.ZodIssue) => {
        if (e.path[0]) errors[String(e.path[0])] = e.message;
      });
      setFormErrors(errors);
      return;
    }
    onSubmit(parsed.data);
  }, [form, onSubmit]);

  const presetOptions = useMemo(() => {
    return dbPresets?.map(p => {
      const j = JENIS_OPTIONS.find(o => o.value === p.jenis);
      const labelSuffix = j ? ` (${j.label})` : '';
      return {
        value: p.id,
        label: `${p.judul}${labelSuffix}`
      };
    }) ?? [];
  }, [dbPresets]);

  const mappedJenisOptions = useMemo(() => {
    return JENIS_OPTIONS?.map(j => ({ value: j.value, label: j.label })) ?? [];
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editTarget ? 'Edit Event Kalender' : 'Tambah Event Kalender'}
      size="lg"
    >
      <div className="flex flex-col gap-3.5">
        <SimpleFormField label="Tahun Pelajaran" required error={formErrors.tahun_pelajaran_id}>
          <SearchableSelect
            options={tahunOptions}
            value={form.tahun_pelajaran_id}
            onValueChange={v => setForm(f => ({ ...f, tahun_pelajaran_id: v }))}
            placeholder="Pilih tahun pelajaran"
            aria-label="Pilih Tahun Pelajaran"
          />
        </SimpleFormField>

        {!editTarget && presetOptions.length > 0 && (
          <SimpleFormField 
            label="Pilih dari Preset Event (Autofill Cepat)"
            description="* Memilih salah satu preset akan mengisi otomatis field di bawah. Anda tetap dapat mengeditnya secara manual."
          >
            <SearchableSelect
              options={presetOptions}
              value={selectedPreset}
              onValueChange={handleSelectPreset}
              placeholder="Pilih Preset Event Kalender SMK"
              clearable
              aria-label="Pilih Preset Event Kalender"
            />
          </SimpleFormField>
        )}

        <SimpleFormField label="Nama / Judul Event" required error={formErrors.judul}>
          <Input 
            id="kal-judul" 
            value={form.judul} 
            onChange={e => setForm(f => ({ ...f, judul: e.target.value }))} 
            placeholder="cth. Libur Idul Fitri, STS Semester Ganjil" 
            aria-label="Nama atau Judul Event"
          />
        </SimpleFormField>

        <SimpleFormField label="Jenis Event" required error={formErrors.jenis}>
          <SearchableSelect
            options={mappedJenisOptions}
            value={form.jenis}
            onValueChange={v => setForm(f => ({ ...f, jenis: v }))}
            placeholder="Pilih jenis event"
            aria-label="Pilih Jenis Event"
          />
        </SimpleFormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SimpleFormField label="Tanggal Mulai" required error={formErrors.tanggal_mulai}>
            <DatePicker
              value={form.tanggal_mulai}
              onChange={v => setForm(f => ({ ...f, tanggal_mulai: v }))}
              placeholder="Pilih tanggal mulai"
              aria-label="Tanggal Mulai"
            />
          </SimpleFormField>

          <SimpleFormField label="Tanggal Selesai" required error={formErrors.tanggal_selesai}>
            <DatePicker
              value={form.tanggal_selesai}
              onChange={v => setForm(f => ({ ...f, tanggal_selesai: v }))}
              placeholder="Pilih tanggal selesai"
              aria-label="Tanggal Selesai"
            />
          </SimpleFormField>
        </div>

        <SimpleFormField label="Keterangan (opsional)" error={formErrors.keterangan}>
          <Textarea 
            id="kal-ket" 
            value={form.keterangan} 
            onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} 
            placeholder="Informasi tambahan..." 
            rows={3}
            aria-label="Keterangan opsional"
          />
        </SimpleFormField>

        <ModalFooter>
          <Button
            type="button"
            variant="toolbarOutline"
            size="toolbar"
            onClick={onClose}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="toolbarPrimary"
            size="toolbar"
            onClick={handleFormSubmit}
            disabled={isPending}
          >
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
};

export default EventFormModal;

import React from 'react';
import { Label, Input, Checkbox } from '@/components/ui';
import { SettingsGroup } from '@/components/academic/student-card/SettingsGroup';
import { FontSizeInput } from '@/components/academic/student-card/FontSizeInput';
import type { StudentCardConfig } from '@/components/academic/student-card/types';

interface SchoolIdentitySettingsProps {
  config: StudentCardConfig;
  setConfig: React.Dispatch<React.SetStateAction<StudentCardConfig>>;
  cardTargetMode: 'SISWA' | 'GURU';
}

export const SchoolIdentitySettings: React.FC<SchoolIdentitySettingsProps> = React.memo(({
  config,
  setConfig,
  cardTargetMode
}) => {
  return (
    <SettingsGroup title="Identitas Sekolah" defaultOpen={true}>
      <div className="space-y-4">
        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">Ukuran Logo Sekolah</Label>
          <FontSizeInput
            value={config.logo_size || 24}
            onChange={(v: number) => setConfig({ ...config, logo_size: v })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="show-header-1"
                checked={config.show_header_text !== false}
                onCheckedChange={(c: boolean) => setConfig({ ...config, show_header_text: c })}
              />
              <Label htmlFor="show-header-1" className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight cursor-pointer font-semibold">Nama Instansi (Header 1)</Label>
            </div>
            <FontSizeInput
              value={config.header_font_size}
              onChange={(v: number) => setConfig({ ...config, header_font_size: v })}
            />
          </div>
          <Input
            id="header-text-input"
            value={config.header_text}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, header_text: e.target.value })}
            placeholder="PEMERINTAH KABUPATEN..."
            className="h-8 text-[11px] font-medium rounded-lg dark:bg-slate-955 dark:border-slate-800"
            disabled={config.show_header_text === false}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="show-header-2"
                checked={config.show_subheader_text !== false}
                onCheckedChange={(c: boolean) => setConfig({ ...config, show_subheader_text: c })}
              />
              <Label htmlFor="show-header-2" className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider cursor-pointer whitespace-nowrap font-semibold">Sub Instansi (Header 2)</Label>
            </div>
            <FontSizeInput
              value={config.subheader_font_size}
              onChange={(v: number) => setConfig({ ...config, subheader_font_size: v })}
            />
          </div>
          <Input
            id="subheader-text-input"
            value={config.subheader_text}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, subheader_text: e.target.value })}
            placeholder="DINAS PENDIDIKAN..."
            className="h-8 text-[11px] font-medium rounded-lg dark:bg-slate-955 dark:border-slate-800"
            disabled={config.show_subheader_text === false}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="show-school-name"
                checked={config.show_school_name !== false}
                onCheckedChange={(c: boolean) => setConfig({ ...config, show_school_name: c })}
              />
              <Label htmlFor="show-school-name" className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider cursor-pointer whitespace-nowrap font-semibold">Nama Sekolah</Label>
            </div>
            <FontSizeInput
              value={config.school_name_font_size}
              onChange={(v: number) => setConfig({ ...config, school_name_font_size: v })}
            />
          </div>
          <Input
            id="school-name-input"
            value={config.school_name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, school_name: e.target.value })}
            placeholder="SMK NEGERI 1..."
            className="h-8 text-[11px] font-bold rounded-lg dark:bg-slate-955 dark:border-slate-800"
            disabled={config.show_school_name === false}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="show-school-address"
                checked={config.show_school_address !== false}
                onCheckedChange={(c: boolean) => setConfig({ ...config, show_school_address: c })}
              />
              <Label htmlFor="show-school-address" className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider cursor-pointer whitespace-nowrap font-semibold">Alamat Sekolah</Label>
            </div>
            <FontSizeInput
              value={config.school_address_font_size}
              onChange={(v: number) => setConfig({ ...config, school_address_font_size: v })}
            />
          </div>
          <Input
            id="school-address-input"
            value={config.school_address}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, school_address: e.target.value })}
            placeholder="Jl. Pendidikan No. 1..."
            className="h-8 text-[11px] font-medium rounded-lg dark:bg-slate-955 dark:border-slate-800"
            disabled={config.show_school_address === false}
          />
        </div>

        {/* Judul Kartu */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">Judul Utama Kartu</Label>
            <FontSizeInput
              value={config.card_title_font_size || 14}
              onChange={(v: number) => setConfig({ ...config, card_title_font_size: v })}
            />
          </div>
          <Input
            id="card-title-input"
            value={config.card_title ?? (cardTargetMode === 'GURU' ? 'KARTU PEGAWAI' : 'KARTU PELAJAR')}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, card_title: e.target.value })}
            placeholder="KARTU PELAJAR / KARTU PEGAWAI..."
            className="h-8 text-[11px] font-black tracking-wide rounded-lg dark:bg-slate-955 dark:border-slate-800 uppercase"
          />
        </div>
      </div>
    </SettingsGroup>
  );
});

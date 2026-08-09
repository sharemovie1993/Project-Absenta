import React from 'react';
import { 
  Button, 
  Label, 
  Input, 
  Switch,
  Textarea
} from '@/components/ui';
import { 
  Upload, 
  Loader2 
} from 'lucide-react';
import type { StudentCardConfig } from '@/components/academic/student-card/types';

interface BackSettingsPanelProps {
  config: StudentCardConfig;
  setConfig: React.Dispatch<React.SetStateAction<StudentCardConfig>>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'stamp' | 'signature') => Promise<void>;
  uploadingStamp: boolean;
  uploadingSign: boolean;
  setPreviewSide: (side: 'front' | 'back') => void;
}

export const BackSettingsPanel: React.FC<BackSettingsPanelProps> = React.memo(({
  config,
  setConfig,
  handleImageUpload,
  uploadingStamp,
  uploadingSign,
  setPreviewSide
}) => {
  return (
    <div className="space-y-4" onFocusCapture={() => setPreviewSide('back')}>
      <div className="flex items-center justify-between">
        <Label htmlFor="back-side-switch" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Aktifkan Cetak Dua Sisi</Label>
        <Switch
          id="back-side-switch"
          checked={!!config.show_back_side}
          onCheckedChange={(c: boolean) => setConfig({ ...config, show_back_side: c })}
          className="scale-90"
        />
      </div>

      {config.show_back_side && (
        <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight mb-2 block">Varian Desain Sisi Belakang</Label>
            <div className="grid grid-cols-2 gap-2">
              {( [
                { id: 'default', label: 'Header Strip' },
                { id: 'minimal', label: 'Minimalis' },
                { id: 'full-header', label: 'Full Header Bar' },
                { id: 'accent-border', label: 'Bingkai Aksen' },
                { id: 'split-gradient', label: 'Gradasi Halus' }
              ] as const)?.map((styleOpt) => (
                <Button
                  key={styleOpt.id}
                  type="button"
                  variant={(config.back_style || 'default') === styleOpt.id ? 'primary' : 'outline'}
                  onClick={() => setConfig({ ...config, back_style: styleOpt.id })}
                  className="h-9 text-[10px] font-bold rounded-xl"
                >
                  {styleOpt.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Warna Latar</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={config.back_bg_color || '#ffffff'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, back_bg_color: e.target.value })}
                  className="w-8 h-8 p-1 rounded-lg cursor-pointer"
                />
                <Input
                  value={config.back_bg_color || '#ffffff'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, back_bg_color: e.target.value })}
                  className="h-8 text-[10px] font-mono flex-1 rounded-lg"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Warna Teks</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={config.back_text_color || '#1e293b'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, back_text_color: e.target.value })}
                  className="w-8 h-8 p-1 rounded-lg cursor-pointer"
                />
                <Input
                  value={config.back_text_color || '#1e293b'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, back_text_color: e.target.value })}
                  className="h-8 text-[10px] font-mono flex-1 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="back-header-text" className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Judul Sisi Belakang</Label>
            <Input
              id="back-header-text"
              value={config.back_header_text || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, back_header_text: e.target.value })}
              placeholder="TATA TERTIB KARTU..."
              className="h-8 text-[11px] rounded-lg dark:bg-slate-950 dark:border-slate-800"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="back-rules-textarea" className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Tata Tertib (Baris Baru = Poin Baru)</Label>
            <Textarea
              id="back-rules-textarea"
              value={config.back_rules || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setConfig({ ...config, back_rules: e.target.value })}
              placeholder="Tulis aturan di sini..."
              rows={5}
              className="text-xs rounded-lg min-h-[100px] dark:bg-slate-950 dark:border-slate-800"
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-sig-switch" className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap cursor-pointer">Tampilkan Tanda Tangan & Stempel</Label>
              <Switch
                id="show-sig-switch"
                checked={!!config.back_show_signature}
                onCheckedChange={(c: boolean) => setConfig({ ...config, back_show_signature: c })}
                className="scale-90"
              />
            </div>

            {config.back_show_signature && (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-955/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <Label htmlFor="sig-title" className="text-[10px] font-bold text-slate-500 uppercase">Jabatan Penandatangan</Label>
                  <Input
                    id="sig-title"
                    value={config.back_signature_title || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, back_signature_title: e.target.value })}
                    placeholder="Kepala Sekolah / Kepala Perpustakaan"
                    className="h-8 text-xs rounded-lg bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sig-name" className="text-[10px] font-bold text-slate-500 uppercase">Nama Lengkap</Label>
                  <Input
                    id="sig-name"
                    value={config.back_principal_name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, back_principal_name: e.target.value })}
                    placeholder="Nama Lengkap Penandatangan"
                    className="h-8 text-xs rounded-lg bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sig-nip" className="text-[10px] font-bold text-slate-500 uppercase">NIP / Identifikasi</Label>
                  <Input
                    id="sig-nip"
                    value={config.back_principal_nip || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, back_principal_nip: e.target.value })}
                    placeholder="NIP. 1980..."
                    className="h-8 text-xs rounded-lg bg-white"
                  />
                </div>

                {/* Upload Tanda Tangan & Stempel */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/50">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-slate-400 uppercase">File TTD</Label>
                    <div className="relative">
                      <input
                        type="file"
                        id="upload-signature-input"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'signature')}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('upload-signature-input')?.click()}
                        disabled={uploadingSign}
                        className="w-full h-8 text-[9px] font-black uppercase tracking-wider rounded-lg"
                      >
                        {uploadingSign ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} className="mr-1" />}
                        {config.back_signature_image_url ? 'TTD Terunggah' : 'Pilih TTD'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-slate-400 uppercase">File Stempel</Label>
                    <div className="relative">
                      <input
                        type="file"
                        id="upload-stamp-input"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'stamp')}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('upload-stamp-input')?.click()}
                        disabled={uploadingStamp}
                        className="w-full h-8 text-[9px] font-black uppercase tracking-wider rounded-lg"
                      >
                        {uploadingStamp ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} className="mr-1" />}
                        {config.back_stamp_image_url ? 'Stempel Terunggah' : 'Pilih Stempel'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

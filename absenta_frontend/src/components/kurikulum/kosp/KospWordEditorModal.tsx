import React from 'react';
import WordEditorModal, { WordEditorPage, WordEditorConfig } from '../../common/WordEditorModal';

interface KospWordEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tahunPelajaranNama: string;
  pages: WordEditorPage[];
  config?: WordEditorConfig;
  onSavePages: (pages: WordEditorPage[], config?: WordEditorConfig) => Promise<void>;
  isSaving?: boolean;
}

export const KospWordEditorModal: React.FC<KospWordEditorModalProps> = ({
  isOpen,
  onClose,
  tahunPelajaranNama,
  pages,
  config,
  onSavePages,
  isSaving
}) => {
  return (
    <WordEditorModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Live Word Editor — Dokumen KOSP TP ${tahunPelajaranNama}`}
      printTitle={`Dokumen KOSP TP ${tahunPelajaranNama}`}
      printButtonLabel="🖨️ Cetak KOSP (PDF)"
      saveButtonLabel={isSaving ? 'Menyimpan KOSP...' : '💾 Simpan Dokumen KOSP'}
      initialPages={pages}
      initialConfig={config}
      allowExtraPages={true}
      orientation="portrait"
      readOnly={false}
      onSave={onSavePages}
    />
  );
};

export default KospWordEditorModal;

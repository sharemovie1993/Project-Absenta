import React from 'react';
import WordEditorModal, { WordEditorPage, WordEditorConfig } from '../../common/WordEditorModal';

interface KospWordEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle?: string;
  pages: WordEditorPage[];
  initialConfig?: WordEditorConfig;
  onSavePages: (pages: WordEditorPage[], config?: WordEditorConfig) => Promise<void>;
  isSaving?: boolean;
}

export const KospWordEditorModal: React.FC<KospWordEditorModalProps> = ({
  isOpen,
  onClose,
  documentTitle = 'Dokumen KOSP',
  pages,
  initialConfig,
  onSavePages,
  isSaving
}) => {
  return (
    <WordEditorModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Live Word Editor — ${documentTitle}`}
      printTitle={documentTitle}
      printButtonLabel="🖨️ Cetak KOSP (PDF)"
      saveButtonLabel={isSaving ? 'Menyimpan KOSP...' : '💾 Simpan Dokumen KOSP'}
      initialPages={pages}
      initialConfig={initialConfig}
      allowExtraPages={true}
      orientation="portrait"
      readOnly={false}
      onSave={onSavePages}
    />
  );
};

export default KospWordEditorModal;

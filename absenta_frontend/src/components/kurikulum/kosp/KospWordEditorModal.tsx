import React from 'react';
import WordEditorModal, { WordEditorPage, WordEditorConfig } from '../../common/WordEditorModal';

interface KospWordEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle?: string;
  pages: WordEditorPage[];
  initialPageIndex?: number;
  initialConfig?: WordEditorConfig;
  onSavePages: (pages: WordEditorPage[], config?: WordEditorConfig) => Promise<void>;
  isSaving?: boolean;
}

export const KospWordEditorModal: React.FC<KospWordEditorModalProps> = React.memo(({
  isOpen,
  onClose,
  documentTitle = 'Dokumen KOSP',
  pages,
  initialPageIndex = 0,
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
      initialPageIndex={initialPageIndex}
      initialConfig={initialConfig}
      allowExtraPages={true}
      orientation="portrait"
      readOnly={false}
      onSave={onSavePages}
    />
  );
});

export default KospWordEditorModal;

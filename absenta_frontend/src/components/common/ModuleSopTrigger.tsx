import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { ModuleSopModal } from './ModuleSopModal';

interface ModuleSopTriggerProps {
  moduleKey: string;
  buttonLabel?: string;
  className?: string;
}

export const ModuleSopTrigger: React.FC<ModuleSopTriggerProps> = ({
  moduleKey,
  buttonLabel = '📜 SOP & Aturan Perizinan',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 text-xs font-black uppercase tracking-wider transition-all border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm ${className}`}
      >
        <BookOpen size={14} />
        <span>{buttonLabel}</span>
      </button>

      <ModuleSopModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        moduleKey={moduleKey}
      />
    </>
  );
};

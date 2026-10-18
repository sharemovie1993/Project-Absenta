import React, { createContext, useContext, useState, type ReactNode } from 'react';

export interface InstructionItem {
  text: string;
  icon?: React.ReactNode;
  path?: string;
  completed?: boolean;
}

export interface InstructionData {
  title?: string;
  description?: React.ReactNode;
  items?: InstructionItem[];
  tips?: string[];
}

interface InstructionContextType {
  instructionData: InstructionData | null;
  setInstructionData: (data: InstructionData | null) => void;
}

const InstructionContext = createContext<InstructionContextType | undefined>(undefined);

export const InstructionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [instructionData, setInstructionDataState] = useState<InstructionData | null>(null);

  const setInstructionData = React.useCallback((nextData: InstructionData | null) => {
    setInstructionDataState((prev) => {
      if (prev === nextData) return prev;
      if (!prev && !nextData) return null;
      if (prev && nextData) {
        const isSameTitle = prev.title === nextData.title;
        const isSameDesc = typeof prev.description === 'string' && typeof nextData.description === 'string'
          ? prev.description === nextData.description
          : prev.description === nextData.description;
        const isSameItems = JSON.stringify(prev.items) === JSON.stringify(nextData.items);
        const isSameTips = JSON.stringify(prev.tips) === JSON.stringify(nextData.tips);

        if (isSameTitle && isSameDesc && isSameItems && isSameTips) {
          return prev;
        }
      }
      return nextData;
    });
  }, []);

  const value = React.useMemo(() => ({ instructionData, setInstructionData }), [instructionData, setInstructionData]);

  return (
    <InstructionContext.Provider value={value}>
      {children}
    </InstructionContext.Provider>
  );
};

export const useInstruction = () => {
  const context = useContext(InstructionContext);
  if (context === undefined) {
    // Return a dummy context to avoid crashing when components are rendered outside an InstructionProvider
    return {
      instructionData: null,
      setInstructionData: () => {}
    };
  }
  return context;
};

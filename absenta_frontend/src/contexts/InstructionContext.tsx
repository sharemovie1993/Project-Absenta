import React, { createContext, useContext, useState, type ReactNode } from 'react';

export interface InstructionItem {
  text: string;
  icon?: React.ReactNode;
  path?: string;
  completed?: boolean;
}

export interface InstructionData {
  title?: string;
  description?: string;
  items?: InstructionItem[];
  tips?: string[];
}

interface InstructionContextType {
  instructionData: InstructionData | null;
  setInstructionData: (data: InstructionData | null) => void;
}

const InstructionContext = createContext<InstructionContextType | undefined>(undefined);

export const InstructionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [instructionData, setInstructionData] = useState<InstructionData | null>(null);

  return (
    <InstructionContext.Provider value={{ instructionData, setInstructionData }}>
      {children}
    </InstructionContext.Provider>
  );
};

export const useInstruction = () => {
  const context = useContext(InstructionContext);
  if (context === undefined) {
    throw new Error('useInstruction must be used within an InstructionProvider');
  }
  return context;
};

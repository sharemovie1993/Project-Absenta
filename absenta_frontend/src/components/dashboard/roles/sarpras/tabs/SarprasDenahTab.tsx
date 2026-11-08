import React from 'react';
import { DenahSpasialView } from '@/components/spasial/DenahSpasialView';

export const SarprasDenahTab: React.FC = () => {
  return (
    <div className="w-full h-full min-h-[700px]">
      <DenahSpasialView hideLayout={true} tipe="MASTER_SARPRAS" readOnly={false} />
    </div>
  );
};

export default SarprasDenahTab;

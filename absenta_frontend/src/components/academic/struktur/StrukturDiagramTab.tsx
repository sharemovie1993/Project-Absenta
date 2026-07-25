import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { StrukturDiagram } from '@/components/academic/struktur/StrukturDiagram';

interface StrukturDiagramTabProps {
  onOpenAssignment: (id: string) => void;
  refreshKey?: number;
}

export const StrukturDiagramTab = React.memo<StrukturDiagramTabProps>(({ onOpenAssignment, refreshKey }) => {
  return (
    <SectionCard noPadding fullWidth title="Visualisasi Hirarki Organisasi" icon={LayoutGrid}>
      <div className="p-4 md:p-8">
        <StrukturDiagram onNodeClick={onOpenAssignment} refreshKey={refreshKey} />
      </div>
    </SectionCard>
  );
});

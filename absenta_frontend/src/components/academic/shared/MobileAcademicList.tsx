import React from 'react';
import { MobileDataList, type MobileDataListProps } from '@/components/ui';

export interface MobileAcademicListProps<T> extends Omit<MobileDataListProps<T>, 'renderCard'> {
  title: string;
  data: T[];
  loading: boolean;
  totalItems: number;
  renderCard?: (item: T) => React.ReactNode;
}

export const MobileAcademicList = React.memo(function MobileAcademicList<T>({
  renderCard,
  className,
  ...props
}: MobileAcademicListProps<T>) {
  return (
    <div className="md:hidden">
      <MobileDataList
        {...props}
        className={className}
        renderCard={renderCard ? (item) => renderCard(item) : undefined}
      />
    </div>
  );
});

export default MobileAcademicList;

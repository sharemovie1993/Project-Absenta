import React from 'react';

export interface SpreadsheetColumnGroup {
  key: string;
  title: string;
  colSpan?: number;
  className?: string;
  badge?: string;
  badgeClassName?: string;
}

export interface SpreadsheetColumn<T> {
  key: string;
  header: React.ReactNode;
  subHeader?: React.ReactNode;
  width?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  align?: 'left' | 'center' | 'right';
  freeze?: 'left' | 'right';
  freezeOffset?: number; // CSS left offset in px
  groupKey?: string;
  isEditable?: boolean;
  className?: string;
  headerClassName?: string;
  renderCell: (item: T, rowIndex: number, colIndex: number) => React.ReactNode;
}

export interface SpreadsheetGridTableProps<T> {
  data: T[];
  columns: SpreadsheetColumn<T>[];
  columnGroups?: SpreadsheetColumnGroup[];
  rowKey: (item: T, index: number) => string;
  isLoading?: boolean;
  emptyMessage?: React.ReactNode;
  density?: 'compact' | 'normal';
  enableFullscreen?: boolean;
  enableKeyboardNavigation?: boolean;
  maxContainerHeight?: string;
  className?: string;
  headerTitle?: React.ReactNode;
  headerActions?: React.ReactNode;
  footerActions?: React.ReactNode;
}

import { useCallback } from 'react';

export interface UseSpreadsheetNavigationOptions {
  totalRows: number;
  totalCols: number;
  idPrefix?: string;
}

export function useSpreadsheetNavigation({
  totalRows,
  totalCols,
  idPrefix = 'ss-input',
}: UseSpreadsheetNavigationOptions) {
  const getCellElement = useCallback(
    (rowIndex: number, colIndex: number): HTMLInputElement | HTMLTextAreaElement | null => {
      return document.getElementById(`${idPrefix}-${rowIndex}-${colIndex}`) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
    },
    [idPrefix]
  );

  const focusCell = useCallback(
    (rowIndex: number, colIndex: number) => {
      const target = getCellElement(rowIndex, colIndex);
      if (target) {
        target.focus();
        target.select?.();
      }
    },
    [getCellElement]
  );

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
      rowIndex: number,
      colIndex: number
    ) => {
      const input = e.currentTarget;

      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        if (rowIndex < totalRows - 1) {
          e.preventDefault();
          focusCell(rowIndex + 1, colIndex);
        }
      } else if (e.key === 'ArrowUp') {
        if (rowIndex > 0) {
          e.preventDefault();
          focusCell(rowIndex - 1, colIndex);
        }
      } else if (e.key === 'ArrowRight') {
        if (input.selectionStart === input.selectionEnd && input.selectionEnd === input.value.length) {
          if (colIndex < totalCols - 1) {
            e.preventDefault();
            focusCell(rowIndex, colIndex + 1);
          }
        }
      } else if (e.key === 'ArrowLeft') {
        if (input.selectionStart === input.selectionEnd && input.selectionStart === 0) {
          if (colIndex > 0) {
            e.preventDefault();
            focusCell(rowIndex, colIndex - 1);
          }
        }
      } else if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (colIndex > 0) {
            e.preventDefault();
            focusCell(rowIndex, colIndex - 1);
          } else if (rowIndex > 0) {
            e.preventDefault();
            focusCell(rowIndex - 1, totalCols - 1);
          }
        } else {
          if (colIndex < totalCols - 1) {
            e.preventDefault();
            focusCell(rowIndex, colIndex + 1);
          } else if (rowIndex < totalRows - 1) {
            e.preventDefault();
            focusCell(rowIndex + 1, 0);
          }
        }
      }
    },
    [totalRows, totalCols, focusCell]
  );

  return {
    handleKeyDown,
    focusCell,
    getCellElement,
  };
}

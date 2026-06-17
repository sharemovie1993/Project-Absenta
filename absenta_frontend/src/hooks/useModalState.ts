import { useState, useCallback } from 'react';

export type ModalMode = 'create' | 'edit' | 'view' | null;

export interface ModalState<T = string> {
  mode: ModalMode;
  isOpen: boolean;
  selectedId?: T;
}

/**
 * Custom hook to manage standard CRUD modal states (create, edit, view, close).
 * Usage:
 * const { modal, openCreate, openEdit, openView, close } = useModalState();
 */
export function useModalState<T = string>(initialMode: ModalMode = null) {
  const [modal, setModal] = useState<ModalState<T>>({
    mode: initialMode,
    isOpen: initialMode !== null,
    selectedId: undefined,
  });

  const openCreate = useCallback(() => {
    setModal({ mode: 'create', isOpen: true, selectedId: undefined });
  }, []);

  const openEdit = useCallback((id: T) => {
    setModal({ mode: 'edit', isOpen: true, selectedId: id });
  }, []);

  const openView = useCallback((id: T) => {
    setModal({ mode: 'view', isOpen: true, selectedId: id });
  }, []);

  const close = useCallback(() => {
    setModal({ mode: null, isOpen: false, selectedId: undefined });
  }, []);

  return {
    modal,
    openCreate,
    openEdit,
    openView,
    close,
  };
}

import { useState, useEffect } from 'react';

export function useSidebar() {
  // Default ke true untuk desktop, false untuk mobile
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar-open');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    // Default berdasarkan ukuran layar
    return window.innerWidth >= 1024;
  });

  // Simpan state ke localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-open', JSON.stringify(isOpen));
  }, [isOpen]);

  // Handle resize untuk auto-collapse di mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggle = () => setIsOpen(!isOpen);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return { 
    isOpen, 
    toggle, 
    open, 
    close 
  };
}
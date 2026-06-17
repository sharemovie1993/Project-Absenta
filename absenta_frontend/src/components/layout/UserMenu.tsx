import React, { useRef, useState, useEffect } from 'react';
import { User, Settings, LogOut, ChevronDown, Loader } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isLoading } = useAuthStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" className="px-3" disabled>
        <Loader className="w-4 h-4 animate-spin mr-2" />
        <span className="hidden md:inline">Loading...</span>
      </Button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* User Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu Pengguna"
        aria-expanded={isOpen}
        className="flex items-center space-x-2 px-3"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-slate-900 dark:text-white">
            {user?.full_name || 'User'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {user?.role?.name || 'SISWA'}
          </div>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800 py-1 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <div className="text-sm font-medium text-slate-900 dark:text-white">
              {user?.full_name || 'User'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {user?.role?.name || 'SISWA'}
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={() => { setIsOpen(false); navigate('/profile'); }}
              className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <User className="w-4 h-4 mr-3" />
              Profile
            </button>
            
            <button
              onClick={() => { setIsOpen(false); navigate('/settings'); }}
              className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Settings className="w-4 h-4 mr-3" />
              Settings
            </button>

            <div className="border-t border-slate-200 dark:border-slate-800 my-1"></div>

            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

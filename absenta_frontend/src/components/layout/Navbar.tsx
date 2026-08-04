import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveSystemConfig } from '@/services/systemConfig';
import absentaLogo from '@/assets/absenta-logo.svg';
import { Button } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronRight } from 'lucide-react';
import axiosInstance from '@/lib/axiosInstance';

import { resolveProfilePhotoUrl } from '@/lib/utils';

export const Navbar: React.FC = () => {
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config','active','public'],
    queryFn: fetchActiveSystemConfig,
  });
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSingleTenant, setIsSingleTenant] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const appName = systemConfig?.app_name || 'Absenta';
  const rawLogoUrl = (systemConfig as any)?.logo_url;
  const resolvedLogoUrl = rawLogoUrl ? resolveProfilePhotoUrl(rawLogoUrl) : null;

  useEffect(() => {
    const checkPreset = async () => {
      try {
        const res = await axiosInstance.get('/auth/registration-preset');
        if (res.data?.success) {
          setIsSingleTenant(!!res.data.data?.is_single_tenant);
        }
      } catch {}
    };
    checkPreset();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/home' },
    { name: 'Fitur', path: '/learn-more' },
    { name: 'Harga', path: '/pricing' },
    { name: 'Tentang', path: '/about' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register-tenant';
  const hideAllLinks = isSingleTenant || isLoginPage || isRegisterPage;

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
        isScrolled 
        ? 'py-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-lg shadow-slate-200/20 dark:shadow-none border-b border-slate-100 dark:border-slate-800' 
        : 'py-6 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo Section */}
          <div 
             className="flex items-center space-x-3 cursor-pointer group"
             onClick={() => navigate(isSingleTenant ? '/login' : '/home')}
          >
            <div className="relative">
               {resolvedLogoUrl && !logoError ? (
                 <img 
                   src={resolvedLogoUrl} 
                   alt={appName} 
                   className="h-10 w-auto group-hover:scale-110 transition-transform duration-300 object-contain" 
                   onError={() => setLogoError(true)}
                 />
               ) : (
                 <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md border border-blue-400/30 group-hover:scale-110 transition-transform duration-300">
                   <span className="text-white font-black text-sm tracking-wider">
                     {appName.slice(0, 2).toUpperCase()}
                   </span>
                 </div>
               )}
               <div className="absolute -inset-2 bg-blue-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
              {appName}<span className="text-blue-600">.</span>
            </h1>
          </div>

          {/* Desktop Navigation */}
          {!hideAllLinks && (
            <nav className="hidden md:flex items-center bg-slate-100/50 dark:bg-slate-900/50 rounded-full px-2 py-1 border border-slate-200/50 dark:border-slate-800/50">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => navigate(link.path)}
                  className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                    isActive(link.path)
                    ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {link.name}
                </button>
              ))}
            </nav>
          )}

          {/* Action Buttons */}
          {!hideAllLinks && (
            <div className="hidden md:flex items-center space-x-3">
               <Button 
                 variant="ghost"
                 onClick={() => navigate('/login')}
                 className="text-sm font-bold text-slate-600 hover:text-slate-900 px-6 rounded-full"
               >
                 Login
               </Button>
               <Button 
                 variant="primary"
                 onClick={() => navigate('/register-tenant')}
                 className="px-8 py-2.5 rounded-full text-[15px] font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 transition-all active:scale-95 border-none"
               >
                 Mulai Gratis
               </Button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          {!hideAllLinks && (
            <div className="md:hidden">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {!hideAllLinks && isMobileMenuOpen && (
          <motion.div
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             className="absolute top-full left-0 right-0 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 p-6 space-y-4 md:hidden shadow-2xl"
          >
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => {
                  navigate(link.path);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-4 rounded-xl font-bold ${
                  isActive(link.path) ? 'bg-blue-50 text-blue-600' : 'text-slate-600'
                }`}
              >
                {link.name}
                <ChevronRight size={18} opacity={0.5} />
              </button>
            ))}
            <div className="pt-4 grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate('/login')}
                className="rounded-xl py-4 h-auto font-bold"
              >
                Login
              </Button>
               <Button 
                 variant="primary" 
                 onClick={() => {
                   navigate('/register-tenant');
                   setIsMobileMenuOpen(false);
                 }}
                 className="rounded-xl py-4 h-auto font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
               >
                 Mulai Gratis
               </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};


import React from 'react';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { Facebook, Twitter, Instagram, Linkedin, Phone, Mail, ArrowRight, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { DEFAULT_SUPPORT_EMAIL } from '@/config/env-config';

export const Footer: React.FC = () => {
  const { systemConfig } = useSystemConfig();
  const appName = systemConfig?.app_name || 'Absenta';
  const supportEmail = (systemConfig as any)?.support_email || DEFAULT_SUPPORT_EMAIL;
  const supportPhone = (systemConfig as any)?.support_phone || '';
  const year = new Date().getFullYear();

  return (
    <footer id="kontak" className="relative bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px]" />
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16">
          {/* Brand Column */}
          <div className="md:col-span-4 space-y-8">
            <div className="flex items-center space-x-2">
               <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <span className="font-black text-xl">{appName[0]}</span>
               </div>
               <span className="text-2xl font-black tracking-tighter">{appName}<span className="text-blue-600">.</span></span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-lg max-w-sm">
              Empowering Indonesian schools with state-of-the-art attendance and management technology.
            </p>
            <div className="flex items-center space-x-4">
               {[
                  { icon: <Facebook size={20} />, color: 'hover:text-blue-600' },
                  { icon: <Twitter size={20} />, color: 'hover:text-blue-400' },
                  { icon: <Instagram size={20} />, color: 'hover:text-pink-500' },
                  { icon: <Linkedin size={20} />, color: 'hover:text-blue-700' }
               ].map((social, i) => (
                  <a 
                    key={i} 
                    href="#" 
                    className={`w-10 h-10 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 transition-all ${social.color} hover:bg-slate-50 dark:hover:bg-slate-900`}
                  >
                    {social.icon}
                  </a>
               ))}
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-6">Solutions</h4>
              <ul className="space-y-4">
                <li><a href="/learn-more" className="text-slate-500 hover:text-blue-600 transition-colors">Absensi Cerdas</a></li>
                <li><a href="/learn-more" className="text-slate-500 hover:text-blue-600 transition-colors">Monitoring KBM</a></li>
                <li><a href="/learn-more" className="text-slate-500 hover:text-blue-600 transition-colors">Koperasi Digital</a></li>
                <li><a href="/pricing" className="text-slate-500 hover:text-blue-600 transition-colors">Paket Harga</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-6">Company</h4>
              <ul className="space-y-4">
                <li><a href="/about" className="text-slate-500 hover:text-blue-600 transition-colors">Tim Kami</a></li>
                <li><a href="/privacy" className="text-slate-500 hover:text-blue-600 transition-colors">Kebijakan Privasi</a></li>
                <li><a href="/terms" className="text-slate-500 hover:text-blue-600 transition-colors">Syarat Layanan</a></li>
                <li><a href="#" className="text-slate-500 hover:text-blue-600 transition-colors">Bantuan</a></li>
              </ul>
            </div>

            <div className="col-span-2 md:col-span-1">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-6">Support</h4>
              <ul className="space-y-6">
                <li className="flex flex-col space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Email Support</span>
                  <a href={`mailto:${supportEmail}`} className="text-slate-600 dark:text-gray-300 font-bold hover:text-blue-600 transition-colors flex items-center gap-2 group">
                    {supportEmail}
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </a>
                </li>
                {supportPhone && (
                  <li className="flex flex-col space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">WhatsApp Center</span>
                    <a 
                      href={`https://wa.me/${supportPhone.replace(/[^0-9]/g, '')}`} 
                      target="_blank" 
                      className="text-slate-600 dark:text-gray-300 font-bold hover:text-green-600 transition-colors flex items-center gap-2 group"
                    >
                      {supportPhone}
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-20 pt-8 border-t border-slate-100 dark:border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            © {year} <span className="text-slate-900 dark:text-white font-bold">{appName}</span>. All rights reserved.
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            Projected with <Heart size={14} className="text-red-500 fill-red-500" /> for Pendidikan Indonesia
          </div>
        </div>
      </div>
    </footer>
  );
};


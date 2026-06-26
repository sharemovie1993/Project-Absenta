import React from 'react';
import { Button } from '@/components/ui';

interface HomeCTAProps {
  onLearnMore: () => void;
  onContactSales: () => void;
}

export const HomeCTA: React.FC<HomeCTAProps> = ({ onLearnMore, onContactSales }) => {
  return (
    <section className="py-24">
       <div className="container mx-auto px-4">
          <div className="rounded-[3rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]" />
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]" />
             
             <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-extrabold mb-8">Siap Transformasi Sekolah Anda?</h2>
                <p className="text-slate-400 dark:text-slate-500 mb-10 text-lg">Bergabunglah dengan ratusan sekolah lainnya. Mulai uji coba gratis atau hubungi tim konsultan kami.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                   <Button 
                      variant="primary" 
                      size="lg"
                      onClick={onLearnMore}
                      className="w-full sm:w-auto px-10 py-5 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/10"
                   >
                      Coba Gratis Sekarang
                   </Button>
                   <Button 
                      variant="outline" 
                      size="lg"
                      onClick={onContactSales}
                      className="w-full sm:w-auto px-10 py-5 rounded-xl border-slate-700 dark:border-slate-200"
                   >
                      Hubungi Sales
                   </Button>
                </div>
             </div>
          </div>
       </div>
    </section>
  );
};

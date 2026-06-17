import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Button } from '@/components/ui';
import { Lightbulb, Plus, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface DashboardTipsBannerProps {
  hasClasses: boolean;
  hasSessions: boolean;
  onDismiss: () => void;
}

export default function DashboardTipsBanner({ 
  hasClasses, 
  hasSessions, 
  onDismiss 
}: DashboardTipsBannerProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isVisible, setIsVisible] = useState(true);

  // If both conditions are met (has classes AND has sessions), hide automatically
  // But the parent logic should handle this. 
  // We keep this check just in case props update dynamically.
  useEffect(() => {
    if (hasClasses && hasSessions) {
      setIsVisible(false);
    }
  }, [hasClasses, hasSessions]);

  if (!isVisible) return null;
  if (hasClasses && hasSessions) return null;

  return (
    <Card className="mb-6 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-2">
        <button 
          onClick={() => {
            setIsVisible(false);
            onDismiss();
          }}
          className="text-indigo-400 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-200 transition-colors p-1 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
        >
          <X size={16} />
        </button>
      </div>
      
      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-4">
        <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-full text-indigo-600 dark:text-indigo-400 shrink-0 mt-1">
          <Lightbulb className="w-5 h-5" />
        </div>
        
        <div className="flex-1">
          <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
            Tips Memulai 🚀
          </h4>
          <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-3 max-w-2xl">
            {!hasClasses 
              ? "Tambahkan data kelas terlebih dahulu agar Anda bisa mulai menginput data siswa dan guru."
              : !hasSessions
              ? "Data kelas sudah siap! Sekarang coba buat 1 sesi absensi untuk melihat bagaimana sistem mencatat kehadiran."
              : "Tambahkan 1 kelas dan buat 1 sesi absensi untuk melihat alur sistem bekerja."}
          </p>
          
          <div className="flex flex-wrap gap-2">
            {!hasClasses && (
              <Button 
                size="sm" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white border-none h-8 text-xs sm:text-sm"
                onClick={() => navigate('/academic/kelas')}
              >
                <Plus className="w-3 h-3 mr-1.5" />
                Tambah Kelas
              </Button>
            )}
            
            {!hasSessions && (
              <Button 
                size="sm" 
                variant={!hasClasses ? "outline" : "primary"}
                className={!hasClasses 
                  ? "bg-white dark:bg-transparent border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 h-8 text-xs sm:text-sm"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white border-none h-8 text-xs sm:text-sm"
                }
                onClick={() => navigate('/attendance/sesi')}
                disabled={!hasClasses} // Cannot create session without class usually
              >
                <Plus className="w-3 h-3 mr-1.5" />
                Buat Sesi
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

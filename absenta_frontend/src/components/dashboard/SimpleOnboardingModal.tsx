import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui';
import { Button } from '@/components/ui';
import { School, Users, CalendarCheck, Settings, ClipboardList, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface SimpleOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isTrial: boolean;
  trialDays?: number;
  roleName?: string;
  isPetugasActive?: boolean;
}

export default function SimpleOnboardingModal({ 
  isOpen, 
  onClose, 
  isTrial, 
  trialDays = 14,
  roleName,
  isPetugasActive = false
}: SimpleOnboardingModalProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const role = roleName || user?.role?.name;

  const content = useMemo(() => {
    if (role === 'ADMIN') {
      return {
        title: 'Langkah awal yang disarankan:',
        steps: [
          { icon: Settings, color: 'text-blue-600', title: '1. Update Profile Sekolah', desc: 'Atur informasi sekolah di Settings.', actionTo: '/settings?tab=sekolah' },
          { icon: ClipboardList, color: 'text-indigo-600', title: '2. Penginputan Data Academic', desc: 'Tahun Pelajaran → Semester → Jurusan → Kelas → Guru → Siswa', actionTo: '/academic/tahun-pelajaran' },
          { icon: CalendarCheck, color: 'text-purple-600', title: '3. Persiapan Absensi', desc: 'Set Jenis Kegiatan → Set Petugas → Absensi Siap Digunakan', actionTo: '/attendance/jenis-kegiatan' },
        ]
      };
    }
    if (role === 'SISWA' && isPetugasActive) {
      return {
        title: 'Langkah awal untuk Petugas Absensi:',
        steps: [
          { icon: Users, color: 'text-green-600', title: '1. Update Profile Pribadi', desc: 'Lengkapi data profil Anda.', actionTo: '/profile' },
          { icon: CalendarCheck, color: 'text-purple-600', title: '2. Pembuatan Jadwal', desc: 'Buat jadwal berdasarkan kebutuhan kelas/gerbang.', actionTo: '/attendance/sesi' },
          { icon: School, color: 'text-blue-600', title: '3. Siap Rekam Absensi', desc: 'Mulai rekam absensi sesuai jadwal.', actionTo: '/attendance/gerbang' },
        ]
      };
    }
    if (role === 'SISWA') {
      return {
        title: 'Langkah awal untuk Siswa:',
        steps: [
          { icon: Users, color: 'text-green-600', title: '1. Update Profile Pribadi', desc: 'Lengkapi data profil Anda.', actionTo: '/profile' },
          { icon: School, color: 'text-blue-600', title: '2. Buka Dashboard', desc: 'Lihat informasi kelas dan absensi.', actionTo: '/dashboard' },
        ]
      };
    }
    if (role === 'GURU') {
      return {
        title: 'Langkah awal untuk Guru:',
        steps: [
          { icon: Users, color: 'text-green-600', title: '1. Update Profile Pribadi', desc: 'Lengkapi data profil Anda.', actionTo: '/profile' },
          { icon: School, color: 'text-blue-600', title: '2. Buka Dashboard', desc: 'Pantau kelas dan aktivitas absensi.', actionTo: '/dashboard' },
        ]
      };
    }
    return {
      title: 'Langkah awal yang disarankan:',
      steps: [
        { icon: School, color: 'text-blue-600', title: 'Mulai dari Dashboard', desc: 'Jelajahi fitur yang tersedia.', actionTo: '/dashboard' },
      ]
    };
  }, [role, isPetugasActive]);

  const handleStart = () => {
    const firstStep = content.steps[0];
    navigate(firstStep.actionTo);
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="2xl"
      className="p-0 overflow-hidden" // Remove default padding if any, handled inside
    >
      <div className="flex flex-col h-full">
        {/* Custom Header */}
        <div className="bg-blue-600 p-6 text-white text-center relative">
          <h2 className="text-2xl font-bold mb-2">Selamat Datang di Absenta.id 👋</h2>
          <p className="text-blue-100">
            Platform absensi modern untuk sekolah Anda.
            {isTrial && (
              <span className="block mt-2 bg-blue-700/50 py-1 px-3 rounded-full text-sm inline-block border border-blue-500">
                {trialDays > 0 ? `Anda sedang menggunakan Trial (Sisa ${trialDays} hari masa trial)` : 'Anda sedang menggunakan Trial'}
              </span>
            )}
          </p>
        </div>
        
        <div className="p-6 space-y-6">
          {isTrial && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              <p className="font-medium flex items-center gap-2">
                💡 Tips Trial:
              </p>
              <p className="mt-1 text-yellow-700">
                Coba aktifkan <strong>1 kelas</strong> dan <strong>1 sesi absensi</strong> untuk melihat alur lengkap sistem.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{content.title}</h3>
            <div className="grid gap-4">
              {content.steps.map((s, idx) => (
                <div key={idx} className="flex items-start gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className={`p-2 rounded-lg shrink-0 bg-gray-100 dark:bg-gray-900/30 ${s.color}`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{s.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{s.desc}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { navigate(s.actionTo); onClose(); }}>
                    Buka
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Lewati (nanti)
          </Button>
          <Button onClick={handleStart} className="gap-2">
            Mulai Sekarang <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}

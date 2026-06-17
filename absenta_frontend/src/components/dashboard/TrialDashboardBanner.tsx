import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getMySubscription } from '@/api/mySubscription.api';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Clock, Rocket } from 'lucide-react';

export function TrialDashboardBanner() {
  const { token } = useAuthStore();
  const [trialSubscription, setTrialSubscription] = useState<any | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;

    const fetchTrial = async () => {
      try {
        const res = await getMySubscription();
        if (res.success && res.data) {
          const now = new Date();
          if (res.data.status === 'TRIAL' && new Date(res.data.end_date) > now) {
            setTrialSubscription(res.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch trial subscription:', error);
      }
    };

    fetchTrial();
  }, [token]);

  if (!trialSubscription) {
    return null;
  }

  const endDate = new Date(trialSubscription.end_date);
  const daysLeft = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="mb-4">
      <div className="p-4 rounded-md border border-blue-200 bg-blue-50 text-blue-900 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-sm mb-2">
        <div className="flex items-start gap-3">
          <div className="mt-1 bg-blue-100 p-2 rounded-full">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-blue-900">
              Masa coba layanan {trialSubscription.service_code} akan berakhir dalam {daysLeft} hari.
            </p>
            <p className="text-sm text-blue-800 mt-1">
              Upgrade paket Anda untuk melanjutkan penggunaan fitur dan menghindari gangguan layanan.
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            className="bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm flex items-center gap-2"
            onClick={() => navigate('/services')}
          >
            <Rocket className="w-4 h-4" />
            Upgrade Sekarang
          </Button>
        </div>
      </div>
    </div>
  );
}

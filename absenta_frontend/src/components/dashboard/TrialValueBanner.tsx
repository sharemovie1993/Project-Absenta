import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Button } from '@/components/ui';
import { Crown, ArrowRight } from 'lucide-react';

interface TrialValueBannerProps {
  trialDaysLeft: number;
  onDismiss?: () => void;
}

export default function TrialValueBanner({ trialDaysLeft, onDismiss }: TrialValueBannerProps) {
  const navigate = useNavigate();

  return (
    <Card className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 border-orange-100 dark:border-orange-800 shadow-sm">
      <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-orange-400 to-amber-500 p-2 rounded-lg text-white shadow-sm shrink-0">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              Anda sudah mencoba fitur inti Absenta ✨
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              <span className="font-bold text-orange-600 dark:text-orange-400">Sisa {trialDaysLeft} hari masa trial</span>. 
              Pastikan layanan tetap aktif dengan melanjutkan langganan.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => navigate('/settings/billing')}
            className="bg-orange-600 hover:bg-orange-700 text-white border-none w-full sm:w-auto shadow-sm whitespace-nowrap"
          >
            Lihat Paket <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ParentNotificationSound } from '../components/ParentNotificationSound';

export default function ParentLayout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans relative">
      <ParentNotificationSound />
      
      <Outlet />
      <Toaster position="top-center" richColors style={{ zIndex: 99999 }} />
    </div>
  );
}

import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import type { NotificationRecord } from '../../../api/parent.api';

export default function ParentNotificationDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id } = useParams();
  
  // In a real app, if state is missing (direct link), we'd fetch by ID. 
  // For now, assuming navigation comes from list.
  const notif = location.state?.notif as NotificationRecord | undefined;

  if (!notif) {
     return (
       <div className="p-4 text-center min-h-screen flex flex-col justify-center items-center bg-gray-50">
         <p className="text-gray-500 mb-4">Notifikasi tidak ditemukan.</p>
         <button onClick={() => navigate('/parent-app/dashboard')} className="text-blue-600 font-bold">Kembali ke Dashboard</button>
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10 flex items-center border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="mr-3 p-1 rounded-full hover:bg-gray-100">
           <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-bold text-lg text-gray-800">Detail Notifikasi</h1>
      </div>

      <div className="p-6">
         <h2 className="text-xl font-bold text-gray-900 mb-4 leading-snug">{notif.title}</h2>
         
         <div className="flex items-center space-x-4 text-gray-400 text-xs mb-6 border-b border-gray-100 pb-4">
            <div className="flex items-center">
               <Calendar className="w-3 h-3 mr-1" />
               {new Date(notif.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div className="flex items-center">
               <Clock className="w-3 h-3 mr-1" />
               {new Date(notif.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
         </div>

         <div className="prose prose-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
           {notif.message}
         </div>
      </div>
    </div>
  );
}

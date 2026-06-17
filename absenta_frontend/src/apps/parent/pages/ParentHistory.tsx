import { useEffect, useState, useCallback } from 'react';
import { useParentAuthStore } from '../../../store/parentAuthStore';
import { getStudentAttendanceHistory, type AttendanceRecord } from '../../../api/parent.api';
import { useParentSocket } from '../hooks/useParentSocket';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';

export default function ParentHistory() {
  const { selectedStudentId, getSelectedStudent } = useParentAuthStore();
  const { socket } = useParentSocket();
  const navigate = useNavigate();
  const student = getSelectedStudent();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(() => {
    if (!student) return;
    
    setLoading(true);
    getStudentAttendanceHistory(student.siswa_id, 1, 50)
      .then((res: any) => setHistory(res.data))
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  }, [student]);
  
  useEffect(() => {
    if (!student) {
        navigate('/parent-app/dashboard');
        return;
    }
    fetchHistory();
  }, [student?.siswa_id, navigate, fetchHistory]);

  // Real-time listener
  useEffect(() => {
    if (!socket || !student) return;

    const handleUpdate = (payload: any) => {
      if (payload?.data?.siswa_id === student.siswa_id) {
        console.log('[ParentHistory] Realtime update:', payload);
        fetchHistory();
      }
    };

    socket.on('attendance_update', handleUpdate);
    return () => {
      socket.off('attendance_update', handleUpdate);
    };
  }, [socket, student?.siswa_id, fetchHistory]);

  if (!student) return null;

  const getStatusColor = (status: string, isTerlambat?: boolean) => {
    if (status === 'HADIR' && isTerlambat) return 'text-orange-600 bg-orange-50 border-orange-100';
    switch(status) {
      case 'HADIR': return 'text-green-600 bg-green-50 border-green-100';
      case 'SAKIT': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'IZIN': return 'text-purple-600 bg-purple-50 border-purple-100';
      case 'ALPA': return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  const getFriendlyStatus = (status: string, isTerlambat?: boolean) => {
    if (status === 'HADIR' && isTerlambat) return 'Terlambat';
    switch (status) {
      case 'ALPA': return 'Tidak Hadir';
      case 'PULANG_CEPAT': return 'Pulang Lebih Awal';
      case 'HADIR': return 'Hadir';
      case 'SAKIT': return 'Sakit';
      case 'IZIN': return 'Izin';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10 flex items-center">
        <button onClick={() => navigate('/parent-app/dashboard')} className="mr-3 p-1 rounded-full hover:bg-gray-100">
           <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-bold text-lg text-gray-800">Riwayat Kehadiran</h1>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Memuat riwayat...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Belum ada data kehadiran.</div>
        ) : (
          history.map((record: any) => (
            <div key={record.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <div className="flex items-center text-gray-500 text-xs mb-1">
                   <Calendar className="w-3 h-3 mr-1" />
                   {new Date(record.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="flex items-center space-x-2">
                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(record.status)}`}>
                     {getFriendlyStatus(record.status)}
                   </span>
                   {record.jenis && (
                     <span className="text-xs text-gray-400">({record.jenis})</span>
                   )}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end text-gray-800 font-mono font-bold">
                   <Clock className="w-3 h-3 mr-1 text-gray-400" />
                   {new Date(record.waktu_tap).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
       {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 flex justify-around items-center z-20 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => navigate('/parent-app/dashboard')}
          className="flex flex-col items-center text-gray-400 hover:text-gray-600 p-2"
        >
          <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-medium">Beranda</span>
        </button>
        <button className="flex flex-col items-center text-blue-600 p-2">
          <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] font-bold">Riwayat</span>
        </button>
      </div>
    </div>
  );
}

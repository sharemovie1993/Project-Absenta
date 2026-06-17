import { useEffect, useState } from 'react';
import { useParentAuthStore } from '../../../store/parentAuthStore';
import { getStudentDailyTracking, type TrackingHarianResponse } from '../../../api/parent.api';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Activity } from 'lucide-react';
import { format, isToday, addDays, subDays } from 'date-fns';
import { id } from 'date-fns/locale';

export default function ParentTracking() {
  const { selectedStudentId, getSelectedStudent } = useParentAuthStore();
  const navigate = useNavigate();
  const student = getSelectedStudent();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<TrackingHarianResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format YYYY-MM-DD for API
  const getDateStr = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  };

  const loadData = () => {
    if (!student) return;
    
    setLoading(true);
    setError(null);
    getStudentDailyTracking(student.siswa_id, getDateStr(currentDate))
      .then((res: any) => setData(res))
      .catch((err: any) => {
        console.error(err);
        setError('Gagal memuat data tracking harian.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!student) {
      navigate('/parent-app/dashboard');
      return;
    }
    loadData();
  }, [student?.siswa_id, currentDate, navigate]);

  const handlePrevDay = () => {
    setCurrentDate(subDays(currentDate, 1));
  };

  const handleNextDay = () => {
    const nextDay = addDays(currentDate, 1);
    if (nextDay <= new Date()) {
      setCurrentDate(nextDay);
    }
  };

  if (!student) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Tracking Harian</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Date Selector */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <button 
            onClick={handlePrevDay}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900">
              {format(currentDate, 'EEEE, d MMMM yyyy', { locale: id })}
            </div>
            {isToday(currentDate) && (
              <div className="text-xs text-blue-600 font-medium mt-0.5">Hari Ini</div>
            )}
          </div>

          <button 
            onClick={handleNextDay}
            disabled={isToday(currentDate)}
            className={`p-2 rounded-lg ${isToday(currentDate) ? 'text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center text-sm">
            {error}
          </div>
        ) : !data || data.kegiatan.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Activity className="w-12 h-12 mb-3 opacity-20" />
            <p>Tidak ada aktivitas tercatat</p>
          </div>
        ) : (
          <div className="space-y-4">
             {/* Timeline */}
             <div className="relative pl-4 border-l-2 border-gray-200 ml-2 space-y-8 py-2">
                {data.kegiatan.map((item: any, index: number) => (
                  <div key={index} className="relative">
                    {/* Dot */}
                    <div className={`absolute -left-[21px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                      item.status === 'HADIR' ? 'bg-green-500' :
                      item.status === 'TERLAMBAT' ? 'bg-orange-500' :
                      item.status === 'PULANG' ? 'bg-blue-500' :
                      'bg-gray-400'
                    }`}></div>
                    
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-gray-900">{item.jenis_kegiatan}</h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            item.status === 'HADIR' ? 'bg-green-100 text-green-700' :
                            item.status === 'TERLAMBAT' ? 'bg-orange-100 text-orange-700' :
                            item.status === 'PULANG' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-500 text-sm font-medium">
                          <Clock className="w-4 h-4 mr-1" />
                          {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: student?.timezone || 'Asia/Jakarta',
                              hour12: false
                            }).replace('.', ':') : item.waktu}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

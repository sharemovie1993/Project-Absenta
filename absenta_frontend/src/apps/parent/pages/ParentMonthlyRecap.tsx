import { useEffect, useState } from 'react';
import { useParentAuthStore } from '../../../store/parentAuthStore';
import { getStudentMonthlyRecap, type MonthlyRecapResponse } from '../../../api/parent.api';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight, List, Check } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from 'date-fns';
import { id } from 'date-fns/locale';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';

export default function ParentMonthlyRecap() {
  const { selectedStudentId, getSelectedStudent } = useParentAuthStore();
  const navigate = useNavigate();
  const student = getSelectedStudent();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<MonthlyRecapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');

  // Format YYYY-MM for API
  const getMonthStr = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const loadData = () => {
    if (!student) return;
    
    setLoading(true);
    setError(null);
    getStudentMonthlyRecap(student.siswa_id, getMonthStr(currentDate))
      .then((res: any) => setData(res))
      .catch((err: any) => {
        console.error(err);
        setError('Gagal memuat data rekap bulanan.');
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

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    if (nextMonth <= new Date()) {
      setCurrentDate(nextMonth);
    }
  };

  if (!student) return null;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'HADIR': return 'text-green-600 bg-green-50 border-green-100';
      case 'TERLAMBAT': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'SAKIT': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'IZIN': return 'text-purple-600 bg-purple-50 border-purple-100';
      case 'ALPA': return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  const CalendarView = () => {
    if (!data) return null;

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Calculate starting day offset (Monday start)
    // getDay returns 0 for Sunday, 1 for Monday.
    // We want Monday=0, ..., Sunday=6
    const startDay = getDay(monthStart); // 0-6 (Sun-Sat)
    const paddingDays = (startDay + 6) % 7; 

    const weekDays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

    const getDayStatus = (date: Date) => {
      const record = data.detail.find(d => isSameDay(new Date(d.tanggal), date));
      return record ? record.status : null;
    };

    const getCalendarDayColor = (status: string | null) => {
      switch(status) {
        case 'HADIR': return 'bg-green-100 text-green-700 border-green-200';
        case 'TERLAMBAT': return 'bg-orange-100 text-orange-700 border-orange-200';
        case 'SAKIT': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'IZIN': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'ALPA': return 'bg-red-100 text-red-700 border-red-200';
        default: return 'bg-white text-gray-700 hover:bg-gray-50';
      }
    };

    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-bold text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square"></div>
          ))}
          {daysInMonth.map((date) => {
            const status = getDayStatus(date);
            const isTodayDate = isToday(date);
            return (
              <div 
                key={date.toString()} 
                className={`
                  aspect-square rounded-lg flex flex-col items-center justify-center border text-xs relative
                  ${getCalendarDayColor(status)}
                  ${isTodayDate ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                `}
              >
                <span className="font-medium">{format(date, 'd')}</span>
                {status && (
                  <div className="mt-0.5">
                    {status === 'HADIR' ? (
                      <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </div>
                    ) : status === 'TERLAMBAT' ? (
                      <span className="text-[10px] font-bold text-orange-600">T</span>
                    ) : status === 'SAKIT' ? (
                      <span className="text-[10px] font-bold text-blue-600">S</span>
                    ) : status === 'IZIN' ? (
                      <span className="text-[10px] font-bold text-purple-600">I</span>
                    ) : status === 'ALPA' ? (
                      <span className="text-[10px] font-bold text-red-600">A</span>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 justify-center">
            <div className="flex items-center text-xs text-gray-500">
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center mr-1">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </div> Hadir
            </div>
            <div className="flex items-center text-xs text-gray-500">
                <span className="font-bold text-orange-600 mr-1">T</span> Terlambat
            </div>
            <div className="flex items-center text-xs text-gray-500">
                <span className="font-bold text-blue-600 mr-1">S</span> Sakit
            </div>
            <div className="flex items-center text-xs text-gray-500">
                <span className="font-bold text-purple-600 mr-1">I</span> Izin
            </div>
            <div className="flex items-center text-xs text-gray-500">
                <span className="font-bold text-red-600 mr-1">A</span> Alpa
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => navigate('/parent-app/dashboard')} className="mr-3 p-1 rounded-full hover:bg-gray-100">
             <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="font-bold text-lg text-gray-800">Rekap Bulanan</h1>
        </div>
        
        {/* View Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
            >
                <List className="w-4 h-4" />
            </button>
            <button 
                onClick={() => setViewMode('calendar')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
            >
                <CalendarIcon className="w-4 h-4" />
            </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Month Selector */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-50 rounded-full">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="font-bold text-gray-800 text-lg">
            {format(currentDate, 'MMMM yyyy', { locale: id })}
          </div>
          <button 
            onClick={handleNextMonth} 
            disabled={new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1) > new Date()}
            className={`p-2 rounded-full ${new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1) > new Date() ? 'text-gray-300' : 'hover:bg-gray-50 text-gray-600'}`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Memuat data...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : data ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <AnalyticsCard title="Hadir" value={data.statistik.HADIR} gradient="from-green-500 to-emerald-600" />
              <AnalyticsCard title="Izin" value={data.statistik.IZIN} gradient="from-purple-500 to-indigo-600" />
              <AnalyticsCard title="Sakit" value={data.statistik.SAKIT} gradient="from-blue-500 to-cyan-600" />
              <AnalyticsCard title="Alpa" value={data.statistik.ALPA} gradient="from-red-500 to-pink-600" />
            </div>

            {/* Total Point Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 shadow-lg text-white flex items-center justify-between">
                <div>
                    <h3 className="text-blue-100 text-sm font-medium mb-1">Total Poin Kehadiran</h3>
                    <p className="text-xs text-blue-200">Akumulasi poin kehadiran bulan ini</p>
                </div>
                <div className="text-3xl font-bold">
                    {data.total_poin} <span className="text-sm font-normal text-blue-200">Poin</span>
                </div>
            </div>

            {/* Late Count if any */}
            {data.statistik.TERLAMBAT > 0 && (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
                <span className="text-orange-800 text-sm">
                  Tercatat <strong>{data.statistik.TERLAMBAT}x</strong> keterlambatan bulan ini.
                </span>
              </div>
            )}

            {/* Content based on View Mode */}
            {viewMode === 'list' ? (
                <div className="space-y-3 mt-6">
                <h3 className="font-bold text-gray-700 px-1">Detail Harian</h3>
                {data.detail.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-gray-100 border-dashed">
                    Belum ada data absensi bulan ini.
                    </div>
                ) : (
                    data.detail.map((item: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex justify-between items-center">
                        <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 text-gray-400 mr-3" />
                        <span className="text-gray-700 text-sm font-medium">
                            {format(new Date(item.tanggal), 'eeee, d MMMM', { locale: id })}
                        </span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusColor(item.status)}`}>
                        {item.status}
                        </span>
                    </div>
                    ))
                )}
                </div>
            ) : (
                <div className="mt-6">
                    <h3 className="font-bold text-gray-700 px-1 mb-3">Kalender Kehadiran</h3>
                    <CalendarView />
                </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

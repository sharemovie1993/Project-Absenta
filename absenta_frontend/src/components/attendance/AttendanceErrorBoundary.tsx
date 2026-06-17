import React from 'react';
import Card from '../ui/Card';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
/**
 * Komponen presentational.
 * Tidak mengandung logic bisnis atau fetch data.
 */
export class AttendanceErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error('[ATTENDANCE_UI_ERROR]', error);
  }
  render() {
    if (this.state.hasError) {
      return <FallbackAttendanceError />;
    }
    return this.props.children as any;
  }
}

function FallbackAttendanceError() {
  const navigate = useNavigate();
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <div className="p-6 text-center space-y-4">
          <div className="text-lg font-semibold dark:text-white">Terjadi kesalahan pada UI Attendance</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Silakan muat ulang atau kembali ke dashboard.</div>
          <div className="flex items-center justify-center gap-2">
            <Button onClick={() => window.location.reload()}>Muat Ulang</Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">Kembali ke Dashboard</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

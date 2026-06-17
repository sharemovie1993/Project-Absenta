import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '../../ui';
import { SearchableSelect } from '../../ui/SearchableSelect';
import type { DropdownOption } from '../../../api/dropdown.api';

type Props = {
  selectedKelasId: string;
  kelasOptions: DropdownOption[];
  tanggal: string;
  onChangeKelas: (id: string) => void;
  onChangeTanggal: (v: string) => void;
  onSetToday: () => void;
  isGuru: boolean;
  kelasLabel: (id?: string) => string;
};

export function SesiFilterPanel({
  selectedKelasId,
  kelasOptions,
  tanggal,
  onChangeKelas,
  onChangeTanggal,
  onSetToday,
  isGuru,
  kelasLabel,
}: Props) {
  const fmtTanggal = (() => {
    try {
      const [y,m,d] = (tanggal || '').split('-');
      const dt = new Date(Number(y), Number(m) - 1, Number(d));
      return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return tanggal;
    }
  })();
  const shiftTanggal = (deltaDays: number) => {
    try {
      const [y,m,d] = (tanggal || '').split('-');
      const base = new Date(Number(y), Number(m) - 1, Number(d));
      base.setDate(base.getDate() + deltaDays);
      const yy = base.getFullYear();
      const mm = String(base.getMonth() + 1).padStart(2, '0');
      const dd = String(base.getDate()).padStart(2, '0');
      onChangeTanggal(`${yy}-${mm}-${dd}`);
    } catch {
      onSetToday();
    }
  };
  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="dark:text-white">Panel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {!isGuru && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Kelas Aktif:</span>
              <div className="text-sm font-semibold">
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
                  {kelasLabel(selectedKelasId)}
                </span>
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center justify-between sm:justify-start gap-2">
               <Button variant="outline" size="sm" onClick={() => shiftTanggal(-1)} className="flex-1 sm:flex-none">← Kemarin</Button>
               <Button variant="outline" size="sm" onClick={onSetToday} className="flex-1 sm:flex-none">Hari Ini</Button>
               <Button variant="outline" size="sm" onClick={() => shiftTanggal(1)} className="flex-1 sm:flex-none">Besok →</Button>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 sm:pt-0">
               <span className="text-sm text-gray-600 dark:text-gray-400">Tanggal:</span>
               <span className="text-sm font-semibold dark:text-gray-200">{fmtTanggal}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

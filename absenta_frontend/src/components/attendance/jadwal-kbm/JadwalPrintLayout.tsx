import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { type JadwalKBM } from '../../../api/attendance/jadwalKBM.api';
import { getMyTenant } from '../../../api/tenants.api';

interface JadwalPrintLayoutProps {
  jadwal: JadwalKBM[];
  guruName?: string;
  subjectName?: string;
  isPrinting: boolean;
  selectedKelasId?: string;
}

const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
const DAY_ABBR: Record<string, string> = {
  'SENIN': 'Se',
  'SELASA': 'Se',
  'RABU': 'Ra',
  'KAMIS': 'Ka',
  'JUMAT': 'Ju',
  'SABTU': 'Sa',
};

const SLOTS = Array.from({ length: 12 }, (_, i) => i + 1);

const SLOT_TIME: Record<number, string> = {
  1: "07:00 - 07:45",
  2: "07:45 - 08:30",
  3: "08:30 - 09:15",
  4: "09:35 - 10:20",
  5: "10:20 - 11:05",
  6: "11:05 - 11:50",
  7: "12:30 - 13:15",
  8: "13:15 - 14:00",
  9: "14:00 - 14:45",
  10: "14:45 - 15:30",
  11: "15:30 - 16:15",
  12: "16:15 - 17:00",
};

export const JadwalPrintLayout: React.FC<JadwalPrintLayoutProps> = ({
  jadwal,
  guruName,
  subjectName,
  isPrinting,
  selectedKelasId
}) => {
  // Shift config states
  const [shiftJamPelajaran, setShiftJamPelajaran] = useState<any>(null);
  const [hariSekolah, setHariSekolah] = useState<string[]>(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']);

  useEffect(() => {
    if (!isPrinting) return;
    const fetchTenantShift = async () => {
      try {
        const tenantRes = await getMyTenant();
        if (tenantRes?.success) {
          if (tenantRes.data?.shift_jam_pelajaran) {
            setShiftJamPelajaran(tenantRes.data.shift_jam_pelajaran);
          }
          if (Array.isArray(tenantRes.data?.hari_sekolah) && tenantRes.data.hari_sekolah.length > 0) {
            const order = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
            const sortedDays = [...tenantRes.data.hari_sekolah].sort((a, b) => order.indexOf(a) - order.indexOf(b));
            setHariSekolah(sortedDays);
          }
        }
      } catch (err) {
        console.error('Failed to load shift jam pelajaran config:', err);
      }
    };
    fetchTenantShift();
  }, [isPrinting]);

  // Resolve slot time dynamically based on the class shift assignment
  const resolveSlotTime = (targetKelasId: string, slotIndex: number): { start: string; end: string } => {
    if (shiftJamPelajaran) {
      const assignedShiftId = shiftJamPelajaran.class_assignments?.[targetKelasId] || 'pagi';
      const shift = shiftJamPelajaran.shifts?.find((s: any) => s.id === assignedShiftId) || shiftJamPelajaran.shifts?.[0];
      if (shift) {
        const slot = shift.slots?.find((sl: any) => sl.slot === slotIndex);
        if (slot) {
          return { start: slot.start, end: slot.end };
        }
      }
    }
    const mockVal = SLOT_TIME[slotIndex] || "07:00 - 07:45";
    const parts = mockVal.split(' - ');
    return { start: parts[0], end: parts[1] };
  };

  if (!isPrinting) return null;

  const getSlotData = (day: string, slotIndex: number) => {
    if (selectedKelasId) {
      const targetSlot = resolveSlotTime(selectedKelasId, slotIndex);
      return jadwal.find(j => 
        j.hari === day && 
        j.jam_mulai && j.jam_mulai.startsWith(targetSlot.start) &&
        j.kelas_id === selectedKelasId
      );
    } else {
      return jadwal.find(j => {
        if (j.hari !== day) return false;
        if (j.kelas_id) {
          const classSlot = resolveSlotTime(j.kelas_id, slotIndex);
          return j.jam_mulai && j.jam_mulai.startsWith(classSlot.start);
        }
        return false;
      });
    }
  };

  const getMergedSlotsForDay = (day: string) => {
    const cells: { slot: number; colSpan: number; item: any }[] = [];
    let skipCount = 0;

    for (let i = 0; i < SLOTS.length; i++) {
      if (skipCount > 0) {
        skipCount--;
        continue;
      }

      const slot = SLOTS[i];
      const item = getSlotData(day, slot);

      if (!item) {
        cells.push({ slot, colSpan: 1, item: null });
        continue;
      }

      // Look ahead to see how many consecutive slots have the same class, teacher, subject
      let colSpan = 1;
      let nextIdx = i + 1;
      while (nextIdx < SLOTS.length) {
        const nextSlot = SLOTS[nextIdx];
        const nextItem = getSlotData(day, nextSlot);

        if (
          nextItem &&
          String(nextItem.kelas_id || '') === String(item.kelas_id || '') &&
          String(nextItem.guru_id || '') === String(item.guru_id || '') &&
          String(nextItem.mapel_id || '') === String(item.mapel_id || '') &&
          String(nextItem.jenis_kegiatan || '').toUpperCase() === String(item.jenis_kegiatan || '').toUpperCase()
        ) {
          colSpan++;
          nextIdx++;
        } else {
          break;
        }
      }

      skipCount = colSpan - 1;
      cells.push({ slot, colSpan, item });
    }

    return cells;
  };

  const derivedSubject = subjectName || Array.from(new Set(jadwal.map(j => j.Mapel?.nama_mapel).filter(Boolean)))[0] || '-';
  const derivedGuru = guruName || Array.from(new Set(jadwal.map(j => j.Guru?.User?.full_name).filter(Boolean)))[0] || '-';

  const content = (
    <div className="absenta-print-container">
      <style>
        {`
          /* Sembunyikan kontainer di layar biasa */
          .absenta-print-container {
            display: none;
          }

          @media print {
            /* Pengaturan Kertas */
            @page {
              size: landscape;
              margin: 10mm;
            }

            /* Sembunyikan elemen utama aplikasi (di luar Portal) */
            body > *:not(.absenta-print-container) {
              display: none !important;
            }

            /* Tampilkan kontainer print */
            .absenta-print-container {
              display: block !important;
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              background: white !important;
              color: black !important;
            }

            body {
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .asc-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              border: 2px solid #000;
              background: white !important;
            }
            .asc-table th, .asc-table td {
              border: 1px solid #000;
              padding: 2px;
              height: 60px;
              position: relative;
              background: white !important;
            }
            .asc-table th {
              height: 35px;
              font-weight: bold;
            }
            .slot-num {
              font-size: 12px;
              font-weight: bold;
            }
            .slot-time {
              font-size: 8px;
              font-weight: normal;
            }
            .day-col {
              width: 50px;
              font-size: 20px;
              font-weight: bold;
              text-align: center;
            }
            .cell-initials {
              position: absolute;
              top: 1px;
              left: 1px;
              font-size: 7px;
              font-weight: bold;
            }
            .cell-class {
              font-size: 14px;
              font-weight: bold;
              text-align: center;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100%;
            }
            .header-text {
              font-size: 28px;
              font-weight: normal;
              text-align: center;
              margin-bottom: 15px;
              font-family: sans-serif;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              margin-top: 10px;
              font-family: sans-serif;
            }
          }
        `}
      </style>

      <div className="p-4 bg-white">
        <h1 className="header-text">
          Teacher {derivedGuru} ( {derivedSubject} )
        </h1>

        <table className="asc-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}></th>
              {SLOTS.map(slot => (
                <th key={slot}>
                  <div className="slot-num">{slot}</div>
                  <div className="slot-time">
                    {selectedKelasId 
                      ? (() => {
                          const t = resolveSlotTime(selectedKelasId, slot);
                          return `${t.start} - ${t.end}`;
                        })()
                      : 'Dinamis'
                    }
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hariSekolah.map(day => (
              <tr key={day}>
                <td className="day-col">{DAY_ABBR[day]}</td>
                {getMergedSlotsForDay(day).map(({ slot, colSpan, item }) => {
                  const teacherInitials = item?.Guru?.User?.full_name 
                    ? item.Guru.User.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
                    : '';
                  
                  return (
                    <td key={slot} colSpan={colSpan}>
                      {item && (
                        <>
                          <div className="cell-initials">{teacherInitials}</div>
                          <div className="cell-class">{item.Kelas?.nama_kelas}</div>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="footer">
          <div>Menghasilkan jadwal: {format(new Date(), 'dd/MM/yyyy', { locale: id })}</div>
          <div>aSc Timetables</div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

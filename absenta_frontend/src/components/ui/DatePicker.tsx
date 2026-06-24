import React, { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DatePickerProps {
  id?: string;
  value?: string | Date;
  onChange?: (date: string) => void; // Returns YYYY-MM-DD string
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  id,
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  disabled = false,
  className,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse value to Date object
  const selectedDate = value ? new Date(value) : undefined;

  useEffect(() => {
    if (selectedDate && !isNaN(selectedDate.getTime())) {
      setCurrentMonth(selectedDate);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (day: Date) => {
    if (disabled) return;
    const formattedDate = format(day, 'yyyy-MM-dd');
    onChange?.(formattedDate);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.('');
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        id={id}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full h-8 px-2.5 py-1.5 text-sm rounded-md border bg-white dark:bg-slate-800 dark:text-gray-300 cursor-pointer transition-colors",
          error ? "border-red-500 focus-within:ring-red-500" : "border-gray-300 dark:border-gray-700 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500",
          disabled && "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-900",
          className
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <CalendarIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 shrink-0" />
          <span className={cn("truncate", !selectedDate && "text-gray-400 dark:text-gray-500")}>
            {selectedDate && !isNaN(selectedDate.getTime()) 
              ? format(selectedDate, 'd MMMM yyyy', { locale: localeID }) 
              : placeholder}
          </span>
        </div>
        {!disabled && value && (
          <div 
            role="button"
            onClick={handleClear}
            className="hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full p-0.5 transition-colors"
          >
            <X className="h-3 w-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" />
          </div>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md text-gray-600 dark:text-gray-400"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {format(currentMonth, 'MMMM yyyy', { locale: localeID })}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md text-gray-600 dark:text-gray-400"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs text-gray-400 font-medium py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    "h-8 w-8 text-xs rounded-md flex items-center justify-center transition-colors",
                    !isCurrentMonth && "text-gray-300 dark:text-slate-700",
                    isCurrentMonth && !isSelected && "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800",
                    isSelected && "bg-blue-600 text-white hover:bg-blue-700",
                    isTodayDate && !isSelected && "border border-blue-200 dark:border-blue-900 font-semibold text-blue-600 dark:text-blue-400"
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

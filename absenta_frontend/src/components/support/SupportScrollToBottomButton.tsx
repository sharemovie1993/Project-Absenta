import React from 'react';

export interface SupportScrollToBottomButtonProps {
  show: boolean;
  unreadCount: number;
  onClick: () => void;
}

export default function SupportScrollToBottomButton({
  show,
  unreadCount,
  onClick
}: SupportScrollToBottomButtonProps) {
  if (!show) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute bottom-4 right-4 p-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-full shadow-lg border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all duration-200 active:scale-95 group z-10 flex items-center justify-center"
      title="Scroll ke bawah"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 20 20" 
        fill="currentColor" 
        className="w-5.5 h-5.5 animate-bounce"
      >
        <path 
          fillRule="evenodd" 
          d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3z" 
          clipRule="evenodd" 
        />
      </svg>
      
      {/* Badge Pesan Baru */}
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-1 bg-emerald-500 text-white text-[9px] font-black rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-md animate-scale-in">
          {unreadCount}
        </span>
      )}
    </button>
  );
}

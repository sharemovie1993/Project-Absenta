import React from 'react';
import { type SupportTicketPriority } from '../../api/support-ticket.api';

interface SupportPriorityBadgeProps {
  priority: SupportTicketPriority;
}

export default function SupportPriorityBadge({ priority }: SupportPriorityBadgeProps) {
  switch (priority) {
    case 'LOW':
      return <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-extrabold border border-slate-200">Low</span>;
    case 'MEDIUM':
      return <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-extrabold border border-blue-200">Medium</span>;
    case 'HIGH':
      return <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-50 text-orange-700 font-extrabold border border-orange-200">High</span>;
    case 'URGENT':
      return <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 font-extrabold border border-rose-200 animate-bounce">URGENT</span>;
    default:
      return null;
  }
}

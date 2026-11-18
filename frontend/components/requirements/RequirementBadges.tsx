'use client';

import { RequirementPriority, RequirementStatus, RequirementType } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle, Ban, FileEdit, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: RequirementStatus;
  className?: string;
  size?: 'sm' | 'md';
}

export function RequirementStatusBadge({ status, className, size = 'sm' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  switch (status) {
    case 'APPROVED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 font-semibold rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
            sizeClasses,
            className
          )}
        >
          <CheckCircle2 className="w-3 h-3" />
          APPROVED
        </span>
      );
    case 'IN_REVIEW':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 font-semibold rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/30',
            sizeClasses,
            className
          )}
        >
          <Clock className="w-3 h-3" />
          IN_REVIEW
        </span>
      );
    case 'REJECTED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 font-semibold rounded-full border bg-rose-500/10 text-rose-400 border-rose-500/30',
            sizeClasses,
            className
          )}
        >
          <XCircle className="w-3 h-3" />
          REJECTED
        </span>
      );
    case 'DEPRECATED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 font-semibold rounded-full border bg-zinc-700/30 text-zinc-400 border-zinc-600/40',
            sizeClasses,
            className
          )}
        >
          <Ban className="w-3 h-3" />
          DEPRECATED
        </span>
      );
    case 'DRAFT':
    default:
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 font-semibold rounded-full border bg-slate-500/10 text-slate-300 border-slate-500/30',
            sizeClasses,
            className
          )}
        >
          <FileEdit className="w-3 h-3" />
          DRAFT
        </span>
      );
  }
}

interface PriorityBadgeProps {
  priority: RequirementPriority;
  className?: string;
  size?: 'sm' | 'md';
}

export function RequirementPriorityBadge({ priority, className, size = 'sm' }: PriorityBadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  switch (priority) {
    case 'CRITICAL':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 font-semibold rounded-full border bg-red-500/15 text-red-400 border-red-500/40 shadow-sm shadow-red-500/10',
            sizeClasses,
            className
          )}
        >
          <AlertCircle className="w-3 h-3 text-red-400" />
          CRITICAL
        </span>
      );
    case 'HIGH':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 font-semibold rounded-full border bg-orange-500/15 text-orange-400 border-orange-500/30',
            sizeClasses,
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
          HIGH
        </span>
      );
    case 'MEDIUM':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 font-semibold rounded-full border bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
            sizeClasses,
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-300" />
          MEDIUM
        </span>
      );
    case 'LOW':
    default:
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 font-semibold rounded-full border bg-sky-500/10 text-sky-400 border-sky-500/30',
            sizeClasses,
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          LOW
        </span>
      );
  }
}

interface TypeBadgeProps {
  type: RequirementType;
  className?: string;
}

export function RequirementTypeBadge({ type, className }: TypeBadgeProps) {
  if (type === 'NON_FUNCTIONAL') {
    return (
      <span
        className={cn(
          'inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-purple-500/10 text-purple-300 border-purple-500/30',
          className
        )}
      >
        NFR
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-blue-500/10 text-blue-300 border-blue-500/30',
        className
      )}
    >
      FR
    </span>
  );
}

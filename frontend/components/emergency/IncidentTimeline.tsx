'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { IncidentStatus } from '@/types';
import { useTranslation } from '@/lib/i18n';

const STATUS_ORDER: IncidentStatus[] = [
  'reported', 'ai_analyzed', 'prioritized', 'assigned', 'en_route', 'responding', 'resolved',
];

interface IncidentTimelineProps {
  currentStatus: IncidentStatus;
  updates?: { status: IncidentStatus; message: string; updatedAt: string; isAI?: boolean }[];
  compact?: boolean;
}

export function IncidentTimeline({ currentStatus, updates = [], compact = false }: IncidentTimelineProps) {
  const { t, statusLabel, localize } = useTranslation();
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="space-y-1">
      {STATUS_ORDER.map((statusKey, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isPending = idx > currentIndex;
        const update = updates.find((u) => u.status === statusKey);

        return (
          <motion.div
            key={statusKey}
            className="flex items-start gap-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all',
                  isCompleted && 'bg-nova-low border-nova-low text-nova-bg',
                  isCurrent && 'bg-nova-cyan/20 border-nova-cyan text-nova-cyan animate-pulse-slow',
                  isPending && 'bg-nova-surface border-nova-border text-nova-text-muted'
                )}
              >
                {isCompleted ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isCurrent ? (
                  <div className="w-2 h-2 rounded-full bg-nova-cyan" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-nova-border" />
                )}
              </div>
              {idx < STATUS_ORDER.length - 1 && (
                <div
                  className={cn(
                    'w-0.5 flex-1 mt-1',
                    idx < currentIndex ? 'bg-nova-low/60 min-h-[16px]' : 'bg-nova-border min-h-[16px]'
                  )}
                />
              )}
            </div>

            {/* Step content */}
            <div className={cn('pb-3', compact ? 'pt-0.5' : 'pt-1')}>
              <p
                className={cn(
                  'text-sm font-medium',
                  isCompleted && 'text-nova-low',
                  isCurrent && 'text-nova-cyan',
                  isPending && 'text-nova-text-muted'
                )}
              >
                {statusLabel(statusKey)}
                {isCurrent && (
                  <span className="ml-2 text-[10px] font-bold text-nova-cyan bg-nova-cyan/10 px-1.5 py-0.5 rounded-full border border-nova-cyan/30">
                    {t('common.current')}
                  </span>
                )}
                {statusKey === 'ai_analyzed' && update?.isAI && (
                  <span className="ml-2 text-[10px] font-bold text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded-full border border-purple-400/30">
                    AI
                  </span>
                )}
              </p>
              {!compact && update && (
                <p className="text-xs text-nova-text-dim mt-0.5">{localize(update.message)}</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

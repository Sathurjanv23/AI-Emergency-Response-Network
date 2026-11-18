'use client';

import { useState } from 'react';
import {
  RequirementItem,
  RequirementStatus,
  requirementsApi,
} from '@/lib/api/client';
import { RequirementStatusBadge } from './RequirementBadges';
import { mapRequirementApiError } from '@/lib/project-validation';
import {
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  FileEdit,
  ArrowRight,
} from 'lucide-react';

interface StatusTransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  requirement: RequirementItem;
  targetStatus: RequirementStatus;
  onSuccess: (updated: RequirementItem) => void;
}

export function StatusTransitionModal({
  isOpen,
  onClose,
  projectId,
  requirement,
  targetStatus,
  onSuccess,
}: StatusTransitionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getStatusIcon = (status: RequirementStatus) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="w-6 h-6 text-emerald-400" />;
      case 'REJECTED':
        return <XCircle className="w-6 h-6 text-rose-400" />;
      case 'IN_REVIEW':
        return <Clock className="w-6 h-6 text-amber-400" />;
      case 'DEPRECATED':
        return <Ban className="w-6 h-6 text-zinc-400" />;
      case 'DRAFT':
      default:
        return <FileEdit className="w-6 h-6 text-slate-300" />;
    }
  };

  const getStatusDescription = (status: RequirementStatus) => {
    switch (status) {
      case 'APPROVED':
        return 'Approving this requirement marks it as verified and ready for architecture tracing and implementation.';
      case 'REJECTED':
        return 'Rejecting this requirement indicates it did not meet quality standards or business feasibility.';
      case 'IN_REVIEW':
        return 'Submitting for review locks editing consideration and flags it for stakeholder evaluation.';
      case 'DEPRECATED':
        return 'Deprecating this requirement removes it from active sprint objectives while preserving audit history.';
      case 'DRAFT':
      default:
        return 'Returning to draft reopens editing and refinement for the requirement owner.';
    }
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await requirementsApi.updateStatus(projectId, requirement.id, targetStatus);

      if (res.success && res.data) {
        onSuccess(res.data);
        onClose();
      } else {
        setError(res.message || `Failed to transition requirement status to ${targetStatus}.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while updating status.';
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        setError(mapRequirementApiError(401).userMessage);
      } else if (msg.includes('403') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('forbidden')) {
        setError(mapRequirementApiError(403).userMessage);
      } else if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        setError(mapRequirementApiError(404).userMessage);
      } else if (msg.includes('409') || msg.toLowerCase().includes('conflict')) {
        setError(mapRequirementApiError(409).userMessage);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
    >
      <div className="w-full max-w-md bg-nova-surface border border-nova-border rounded-2xl shadow-2xl p-6 text-nova-text animate-in fade-in zoom-in-95 duration-150 space-y-4">
        {/* Header Icon & Title */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-nova-surface2 border border-nova-border">
            {getStatusIcon(targetStatus)}
          </div>
          <div>
            <h3 id="status-modal-title" className="text-lg font-bold font-display text-nova-text">
              Confirm Status Transition
            </h3>
            <p className="text-xs text-nova-text-dim">
              Requirement <span className="font-mono text-nova-cyan">{requirement.requirementKey}</span>
            </p>
          </div>
        </div>

        {/* Transition Visualizer */}
        <div className="p-3.5 bg-nova-bg rounded-xl border border-nova-border flex items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-nova-text-muted">Current</span>
            <div>
              <RequirementStatusBadge status={requirement.status} />
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-nova-cyan shrink-0" />

          <div className="space-y-1 text-right">
            <span className="text-[10px] uppercase font-semibold text-nova-text-muted">Target</span>
            <div>
              <RequirementStatusBadge status={targetStatus} />
            </div>
          </div>
        </div>

        {/* Explanation text */}
        <p className="text-xs text-nova-text-dim leading-relaxed">
          {getStatusDescription(targetStatus)}
        </p>

        {/* Error notification */}
        {error && (
          <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-xs text-red-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-nova-border">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-nova-border hover:bg-nova-surface2 transition text-nova-text-dim hover:text-nova-text disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-nova-cyan text-nova-bg hover:bg-nova-cyan-dim transition shadow-md shadow-nova-cyan/20 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Updating Status...
              </>
            ) : (
              <>Confirm Transition</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

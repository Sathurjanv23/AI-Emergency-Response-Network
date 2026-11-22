'use client';

import { useState } from 'react';
import {
  RequirementVersionItem,
  requirementVersionsApi,
} from '@/lib/api/requirementVersions';
import { mapRequirementApiError } from '@/lib/project-validation';
import {
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Lock,
  MessageSquare,
  FileCheck,
  ShieldAlert,
} from 'lucide-react';

export interface RequirementVersionReviewActionsProps {
  projectId: string;
  requirementId: string;
  version: RequirementVersionItem;
  requirementTitle?: string;
  onActionSuccess: (
    action: 'submit' | 'approve' | 'reject',
    updatedVersion: RequirementVersionItem
  ) => void;
  onError?: (error: string) => void;
}

export function RequirementVersionReviewActions({
  projectId,
  requirementId,
  version,
  requirementTitle,
  onActionSuccess,
  onError,
}: RequirementVersionReviewActionsProps) {
  // Modal states
  const [activeModal, setActiveModal] = useState<'submit' | 'approve' | 'reject' | null>(null);

  // Form input states
  const [reviewComment, setReviewComment] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const resetModalState = () => {
    setActiveModal(null);
    setReviewComment('');
    setCommentError(null);
    setActionError(null);
    setSubmitting(false);
  };

  const handleApiError = (err: unknown, defaultMessage: string) => {
    const rawMsg = err instanceof Error ? err.message : String(err || defaultMessage);
    let userMsg = rawMsg;

    if (rawMsg.includes('401') || rawMsg.toLowerCase().includes('unauthorized') || rawMsg.toLowerCase().includes('authentication required')) {
      userMsg = mapRequirementApiError(401).userMessage;
    } else if (rawMsg.includes('403') || rawMsg.toLowerCase().includes('access denied') || rawMsg.toLowerCase().includes('forbidden')) {
      userMsg = mapRequirementApiError(403).userMessage;
    } else if (rawMsg.includes('404') || rawMsg.toLowerCase().includes('not found')) {
      userMsg = mapRequirementApiError(404).userMessage;
    } else if (rawMsg.includes('409') || rawMsg.toLowerCase().includes('conflict') || rawMsg.toLowerCase().includes('already')) {
      userMsg = rawMsg.includes(':') ? rawMsg : `Conflict: ${rawMsg}. The version status may have changed; please refresh.`;
    }

    setActionError(userMsg);
    if (onError) onError(userMsg);
  };

  // 1. Submit for Review
  const handleSubmitForReview = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      setActionError(null);

      const res = await requirementVersionsApi.submitForReview(
        projectId,
        requirementId,
        version.versionNumber
      );

      if (res.success && res.data) {
        resetModalState();
        onActionSuccess('submit', res.data);
      } else {
        handleApiError(new Error(res.message || 'Failed to submit version for review.'), 'Submission failed.');
      }
    } catch (err: unknown) {
      handleApiError(err, 'Failed to submit version for review.');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Approve Version
  const handleApproveVersion = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      setActionError(null);

      const payload = reviewComment.trim() ? { reviewComment: reviewComment.trim() } : undefined;
      const res = await requirementVersionsApi.approveVersion(
        projectId,
        requirementId,
        version.versionNumber,
        payload
      );

      if (res.success && res.data) {
        resetModalState();
        onActionSuccess('approve', res.data);
      } else {
        handleApiError(new Error(res.message || 'Failed to approve version.'), 'Approval failed.');
      }
    } catch (err: unknown) {
      handleApiError(err, 'Failed to approve version.');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Reject Version
  const handleRejectVersion = async () => {
    if (submitting) return;

    const trimmedComment = reviewComment.trim();
    if (!trimmedComment) {
      setCommentError('Rejection comment explaining the reasons and required changes is required.');
      return;
    }

    if (trimmedComment.length > 1000) {
      setCommentError('Rejection comment must not exceed 1000 characters.');
      return;
    }

    try {
      setSubmitting(true);
      setActionError(null);
      setCommentError(null);

      const res = await requirementVersionsApi.rejectVersion(
        projectId,
        requirementId,
        version.versionNumber,
        { reviewComment: trimmedComment }
      );

      if (res.success && res.data) {
        resetModalState();
        onActionSuccess('reject', res.data);
      } else {
        handleApiError(new Error(res.message || 'Failed to reject version.'), 'Rejection failed.');
      }
    } catch (err: unknown) {
      handleApiError(err, 'Failed to reject version.');
    } finally {
      setSubmitting(false);
    }
  };

  // Status: APPROVED (Read-only)
  if (version.reviewStatus === 'APPROVED') {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Approved Version (Read-only)</span>
      </div>
    );
  }

  // Status: REJECTED (Read-only)
  if (version.reviewStatus === 'REJECTED') {
    return (
      <div className="flex items-center gap-2 text-xs text-rose-400 font-medium">
        <XCircle className="w-3.5 h-3.5" />
        <span>Rejected Version (Read-only)</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-nova-border/40">
      {/* Action Buttons for DRAFT */}
      {version.reviewStatus === 'DRAFT' && (
        <button
          type="button"
          onClick={() => {
            setActionError(null);
            setActiveModal('submit');
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-nova-cyan/20 text-nova-cyan border border-nova-cyan/40 hover:bg-nova-cyan/30 transition shadow-sm"
          title={`Submit version v${version.versionNumber} for review`}
        >
          <Send className="w-3 h-3" />
          <span>Submit for Review</span>
        </button>
      )}

      {/* Action Buttons for IN_REVIEW */}
      {version.reviewStatus === 'IN_REVIEW' && (
        <>
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setReviewComment('');
              setActiveModal('approve');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 transition shadow-sm"
            title={`Approve version v${version.versionNumber}`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Approve Version</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setReviewComment('');
              setCommentError(null);
              setActiveModal('reject');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 transition shadow-sm"
            title={`Reject version v${version.versionNumber}`}
          >
            <XCircle className="w-3 h-3" />
            <span>Reject Version</span>
          </button>
        </>
      )}

      {/* ─── MODAL 1: Submit for Review Confirmation ─── */}
      {activeModal === 'submit' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !submitting) resetModalState();
          }}
        >
          <div className="relative w-full max-w-md bg-nova-surface border border-nova-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-nova-cyan/15 text-nova-cyan border border-nova-cyan/30 shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 id="submit-modal-title" className="text-base font-bold text-nova-text">
                  Submit Version v{version.versionNumber} for Review
                </h3>
                <p className="text-xs text-nova-text-muted">
                  Requirement: <span className="text-nova-text-dim font-medium">{requirementTitle || version.title}</span>
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-nova-surface2/60 border border-nova-border text-xs text-nova-text-dim space-y-2">
              <p>
                Submitting this draft moves version <span className="font-mono font-bold text-nova-cyan">v{version.versionNumber}</span> into <span className="font-bold text-amber-300">IN_REVIEW</span> status.
              </p>
              <p className="text-[11px] text-nova-text-muted">
                The project owner will review the specification before it can be approved as the active baseline.
              </p>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/70 text-xs text-red-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="flex-1">{actionError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={resetModalState}
                disabled={submitting}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-nova-border bg-nova-surface2 hover:bg-nova-surface2/80 text-nova-text transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitForReview}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-nova-cyan text-nova-bg hover:bg-nova-cyan-dim transition shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & Submit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: Approve Version Confirmation ─── */}
      {activeModal === 'approve' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="approve-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !submitting) resetModalState();
          }}
        >
          <div className="relative w-full max-w-lg bg-nova-surface border border-nova-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 id="approve-modal-title" className="text-base font-bold text-nova-text">
                  Approve Requirement Version v{version.versionNumber}
                </h3>
                <p className="text-xs text-nova-text-muted">
                  Requirement: <span className="text-nova-text-dim font-medium">{requirementTitle || version.title}</span>
                </p>
              </div>
            </div>

            {/* Impact Warning Banner */}
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-xs text-emerald-200 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-emerald-300">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Authoritative Baseline Promotion</span>
              </div>
              <p className="text-emerald-200/90 leading-relaxed">
                Approving version <span className="font-mono font-bold">v{version.versionNumber}</span> immediately promotes its snapshot to become the active approved specification for this requirement. Active title, description, and status will synchronize to this version.
              </p>
            </div>

            {/* Optional Approval Comment */}
            <div className="space-y-1.5">
              <label htmlFor="approve-comment" className="block text-xs font-semibold text-nova-text">
                Review Comment (Optional)
              </label>
              <textarea
                id="approve-comment"
                rows={3}
                maxLength={1000}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Optional notes regarding approval rationale or sign-off details..."
                disabled={submitting}
                className="w-full px-3 py-2 text-xs rounded-xl bg-nova-surface2 border border-nova-border text-nova-text placeholder:text-nova-text-muted focus:outline-none focus:border-nova-cyan transition disabled:opacity-50"
              />
              <div className="flex justify-end text-[10px] text-nova-text-muted font-mono">
                {reviewComment.length} / 1000 characters
              </div>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/70 text-xs text-red-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="flex-1">{actionError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-nova-border/40">
              <button
                type="button"
                onClick={resetModalState}
                disabled={submitting}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-nova-border bg-nova-surface2 hover:bg-nova-surface2/80 text-nova-text transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveVersion}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Approving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Approval</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: Reject Version Confirmation ─── */}
      {activeModal === 'reject' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !submitting) resetModalState();
          }}
        >
          <div className="relative w-full max-w-lg bg-nova-surface border border-nova-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 id="reject-modal-title" className="text-base font-bold text-nova-text">
                  Reject Requirement Version v{version.versionNumber}
                </h3>
                <p className="text-xs text-nova-text-muted">
                  Requirement: <span className="text-nova-text-dim font-medium">{requirementTitle || version.title}</span>
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/60 text-xs text-rose-200 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-rose-300">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Rejection Audit Trail</span>
              </div>
              <p className="text-rose-200/90 leading-relaxed">
                Rejected snapshots are permanently retained in history for audit traceability. The current approved requirement will remain unaffected.
              </p>
            </div>

            {/* Mandatory Rejection Reason */}
            <div className="space-y-1.5">
              <label htmlFor="reject-comment" className="block text-xs font-semibold text-nova-text">
                Reviewer Feedback / Rejection Reason <span className="text-rose-400">*</span>
              </label>
              <textarea
                id="reject-comment"
                rows={3}
                maxLength={1000}
                value={reviewComment}
                onChange={(e) => {
                  setReviewComment(e.target.value);
                  if (commentError && e.target.value.trim()) setCommentError(null);
                }}
                placeholder="Explain why this version is rejected and what corrective adjustments are required..."
                disabled={submitting}
                className={`w-full px-3 py-2 text-xs rounded-xl bg-nova-surface2 border text-nova-text placeholder:text-nova-text-muted focus:outline-none transition disabled:opacity-50 ${
                  commentError ? 'border-rose-500 focus:border-rose-400' : 'border-nova-border focus:border-nova-cyan'
                }`}
              />
              <div className="flex items-center justify-between text-[10px]">
                {commentError ? (
                  <span className="text-rose-400 font-medium">{commentError}</span>
                ) : (
                  <span className="text-nova-text-muted">Mandatory feedback recorded in version audit log</span>
                )}
                <span className="text-nova-text-muted font-mono">{reviewComment.length} / 1000</span>
              </div>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/70 text-xs text-red-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="flex-1">{actionError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-nova-border/40">
              <button
                type="button"
                onClick={resetModalState}
                disabled={submitting}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-nova-border bg-nova-surface2 hover:bg-nova-surface2/80 text-nova-text transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectVersion}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

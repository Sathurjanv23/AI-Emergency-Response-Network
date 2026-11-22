'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  requirementVersionsApi,
  RequirementVersionItem,
  VersionChangeType,
  VersionReviewStatus,
} from '@/lib/api/requirementVersions';
import { formatRequirementDate, mapRequirementApiError } from '@/lib/project-validation';
import { RequirementItem, requirementsApi } from '@/lib/api/client';
import { CreateRequirementVersionForm } from './CreateRequirementVersionForm';
import { RequirementVersionReviewActions } from './RequirementVersionReviewActions';
import { RequirementVersionComparison } from './RequirementVersionComparison';
import {
  Clock,
  History,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileEdit,
  ChevronDown,
  ChevronUp,
  Lock,
  User,
  MessageSquare,
  Sparkles,
  Layers,
  Calendar,
  PlusCircle,
  GitCompare,
} from 'lucide-react';

interface RequirementVersionTimelineProps {
  projectId: string;
  requirementId: string;
  requirement?: RequirementItem;
  currentVersionId?: string | null;
  onSelectVersion?: (version: RequirementVersionItem) => void;
  onVersionCreated?: (version: RequirementVersionItem) => void;
  onRequirementUpdated?: (updated: RequirementItem) => void;
}

export function VersionReviewStatusBadge({ status }: { status: VersionReviewStatus }) {
  switch (status) {
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" />
          APPROVED
        </span>
      );
    case 'IN_REVIEW':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-amber-500/15 text-amber-400 border-amber-500/30">
          <Clock className="w-3 h-3" />
          IN_REVIEW
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-rose-500/15 text-rose-400 border-rose-500/30">
          <XCircle className="w-3 h-3" />
          REJECTED
        </span>
      );
    case 'DRAFT':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-slate-500/15 text-slate-300 border-slate-500/30">
          <FileEdit className="w-3 h-3" />
          DRAFT
        </span>
      );
  }
}

export function VersionChangeTypeBadge({ changeType }: { changeType: VersionChangeType }) {
  switch (changeType) {
    case 'CREATED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-nova-cyan/10 text-nova-cyan border border-nova-cyan/20">
          CREATED
        </span>
      );
    case 'UPDATED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          UPDATED
        </span>
      );
    case 'CLARIFIED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
          CLARIFIED
        </span>
      );
    case 'CORRECTED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          CORRECTED
        </span>
      );
    default:
      return null;
  }
}

export function RequirementVersionTimeline({
  projectId,
  requirementId,
  requirement,
  currentVersionId,
  onSelectVersion,
  onVersionCreated,
  onRequirementUpdated,
}: RequirementVersionTimelineProps) {
  const [versions, setVersions] = useState<RequirementVersionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<Record<number, boolean>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdNotice, setCreatedNotice] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compareFromVersion, setCompareFromVersion] = useState<number | undefined>(undefined);
  const [compareToVersion, setCompareToVersion] = useState<number | undefined>(undefined);

  const fetchVersions = useCallback(async () => {
    if (!projectId || !requirementId) return;

    try {
      setLoading(true);
      setError(null);

      const res = await requirementVersionsApi.getVersionHistory(projectId, requirementId);

      if (res.success && Array.isArray(res.data)) {
        // Ensure sorted by versionNumber descending
        const sorted = [...res.data].sort((a, b) => b.versionNumber - a.versionNumber);
        setVersions(sorted);
        // By default, auto-expand the newest version
        if (sorted.length > 0) {
          setExpandedVersions({ [sorted[0].versionNumber]: true });
        }
      } else {
        setError(res.message || 'Failed to retrieve requirement version history.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while fetching versions.';
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        setError(mapRequirementApiError(401).userMessage);
      } else if (msg.includes('403') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('forbidden')) {
        setError(mapRequirementApiError(403).userMessage);
      } else if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        setError(mapRequirementApiError(404).userMessage);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, requirementId]);

  const handleReviewActionSuccess = async (
    action: 'submit' | 'approve' | 'reject',
    updatedVersion: RequirementVersionItem
  ) => {
    if (action === 'submit') {
      setCreatedNotice(`Version v${updatedVersion.versionNumber} successfully submitted for review!`);
    } else if (action === 'approve') {
      setCreatedNotice(`Version v${updatedVersion.versionNumber} successfully approved! Promoted to active specification.`);
      // Refresh parent requirement details to synchronize active specification tab
      try {
        const refreshedReq = await requirementsApi.getById(projectId, requirementId);
        if (refreshedReq.success && refreshedReq.data && onRequirementUpdated) {
          onRequirementUpdated(refreshedReq.data);
        }
      } catch {
        // Non-fatal, version history will still reload
      }
    } else if (action === 'reject') {
      setCreatedNotice(`Version v${updatedVersion.versionNumber} rejected with reviewer feedback.`);
    }

    // Refresh version timeline to reflect updated reviewStatus, audit timestamps, and comments
    fetchVersions();
  };

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const toggleExpand = (versionNumber: number) => {
    setExpandedVersions((prev) => ({
      ...prev,
      [versionNumber]: !prev[versionNumber],
    }));
  };

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="p-6 bg-nova-surface border border-nova-border rounded-2xl shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-nova-border/60">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-nova-cyan animate-spin" />
            <span className="text-sm font-semibold text-nova-text uppercase tracking-wider">
              Loading Version Timeline...
            </span>
          </div>
        </div>

        <div className="space-y-4 py-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-nova-surface2/50 border border-nova-border/80 animate-pulse space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 bg-nova-border rounded w-28" />
                <div className="h-4 bg-nova-border rounded w-20" />
              </div>
              <div className="h-4 bg-nova-border/70 rounded w-3/4" />
              <div className="h-3 bg-nova-border/50 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="p-6 bg-nova-surface border border-nova-border rounded-2xl shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-nova-border/60">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-nova-cyan" />
            <h2 className="text-sm font-semibold text-nova-text uppercase tracking-wider">
              Version History
            </h2>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/70 text-xs sm:text-sm text-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <p className="font-semibold text-red-300">Failed to Load Version History</p>
            <p className="text-red-300/80">{error}</p>
            <button
              type="button"
              onClick={fetchVersions}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-red-900/60 hover:bg-red-800/70 text-red-100 border border-red-700/60 transition mt-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty State
  if (versions.length === 0) {
    return (
      <div className="p-6 bg-nova-surface border border-nova-border rounded-2xl shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-nova-border/60">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-nova-cyan" />
            <h2 className="text-sm font-semibold text-nova-text uppercase tracking-wider">
              Version History
            </h2>
          </div>

          {requirement && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-nova-cyan text-nova-bg hover:bg-nova-cyan-dim transition shadow-sm shadow-nova-cyan/20"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create New Version</span>
            </button>
          )}
        </div>

        <div className="p-8 text-center rounded-xl bg-nova-surface2/30 border border-dashed border-nova-border space-y-3">
          <History className="w-8 h-8 text-nova-text-muted mx-auto mb-2 opacity-60" />
          <p className="text-sm font-semibold text-nova-text">No Version Snapshots Recorded</p>
          <p className="text-xs text-nova-text-muted max-w-sm mx-auto">
            Version history will be recorded as requirement specifications evolve through draft creation and review.
          </p>

          {requirement && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-nova-cyan text-nova-bg hover:bg-nova-cyan-dim transition shadow-sm shadow-nova-cyan/20 mt-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Propose Baseline Version</span>
            </button>
          )}
        </div>

        {showCreateModal && requirement && (
          <CreateRequirementVersionForm
            projectId={projectId}
            requirement={requirement}
            approvedVersion={null}
            onCancel={() => setShowCreateModal(false)}
            onSuccess={(created) => {
              setShowCreateModal(false);
              setCreatedNotice(`Version v${created.versionNumber} successfully created in DRAFT status!`);
              fetchVersions();
              if (onVersionCreated) onVersionCreated(created);
            }}
          />
        )}
      </div>
    );
  }

  if (isComparing) {
    return (
      <RequirementVersionComparison
        projectId={projectId}
        requirementId={requirementId}
        versions={versions}
        initialFromVersion={compareFromVersion}
        initialToVersion={compareToVersion}
        requirementTitle={requirement?.title}
        onClose={() => setIsComparing(false)}
      />
    );
  }

  const approvedVersion = versions.find((v) => v.reviewStatus === 'APPROVED');

  return (
    <section
      aria-label="Requirement Version History"
      className="p-6 bg-nova-surface border border-nova-border rounded-2xl shadow-lg space-y-4"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-nova-border/60">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-nova-cyan" />
          <h2 className="text-sm font-semibold text-nova-text uppercase tracking-wider">
            Version History
          </h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-mono font-bold bg-nova-surface2 text-nova-cyan border border-nova-border">
            {versions.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {versions.length >= 2 && (
            <button
              type="button"
              onClick={() => {
                setCompareFromVersion(undefined);
                setCompareToVersion(undefined);
                setIsComparing(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-nova-surface2 border border-nova-border hover:bg-nova-surface2/80 text-nova-text transition shadow-sm"
              title="Compare two versions side by side"
            >
              <GitCompare className="w-3.5 h-3.5 text-nova-cyan" />
              <span>Compare Versions</span>
            </button>
          )}

          {requirement && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-nova-cyan text-nova-bg hover:bg-nova-cyan-dim transition shadow-sm shadow-nova-cyan/20"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create New Version</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchVersions}
            className="p-1.5 rounded-lg text-nova-text-muted hover:text-nova-cyan hover:bg-nova-surface2 transition"
            title="Refresh version timeline"
            aria-label="Refresh version timeline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Creation Success Notice Banner */}
      {createdNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/70 text-xs text-emerald-200 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{createdNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setCreatedNotice(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs font-bold px-1.5 py-0.5"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      <p className="text-xs text-nova-text-muted">
        Chronological audit trail of specification snapshots and review decisions (newest first).
      </p>

      {/* Vertical Timeline */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-2.5 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-nova-border/80">
        {versions.map((ver) => {
          const isExpanded = !!expandedVersions[ver.versionNumber];
          const isCurrentLinked = currentVersionId && ver.id === currentVersionId;
          const isApproved = ver.reviewStatus === 'APPROVED';

          return (
            <div key={ver.id || ver.versionNumber} className="relative group">
              {/* Timeline Node Marker */}
              <div
                className={`absolute -left-6 sm:-left-8 top-3.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                  isApproved
                    ? 'bg-emerald-950 border-emerald-400 text-emerald-400'
                    : ver.reviewStatus === 'IN_REVIEW'
                    ? 'bg-amber-950 border-amber-400 text-amber-400'
                    : ver.reviewStatus === 'REJECTED'
                    ? 'bg-rose-950 border-rose-400 text-rose-400'
                    : 'bg-nova-surface border-nova-cyan text-nova-cyan'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    isApproved
                      ? 'bg-emerald-400'
                      : ver.reviewStatus === 'IN_REVIEW'
                      ? 'bg-amber-400'
                      : ver.reviewStatus === 'REJECTED'
                      ? 'bg-rose-400'
                      : 'bg-nova-cyan'
                  }`}
                />
              </div>

              {/* Version Card */}
              <div
                className={`rounded-xl border transition p-4 sm:p-5 space-y-3 ${
                  isCurrentLinked
                    ? 'bg-nova-surface2/80 border-nova-cyan/40 shadow-sm shadow-nova-cyan/10'
                    : 'bg-nova-surface2/40 border-nova-border hover:border-nova-border2'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-nova-cyan/15 text-nova-cyan border border-nova-cyan/30">
                      v{ver.versionNumber}
                    </span>

                    <VersionReviewStatusBadge status={ver.reviewStatus} />
                    <VersionChangeTypeBadge changeType={ver.changeType} />

                    {/* Active Pointer Distinction (Truthful status representation) */}
                    {isCurrentLinked && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                          isApproved
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                        }`}
                        title={
                          isApproved
                            ? 'This snapshot is the authoritative active approved specification.'
                            : 'This snapshot is the current active baseline pointer (Draft).'
                        }
                      >
                        {isApproved ? '★ Active Approved' : '● Current Draft Pointer'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {(() => {
                      const prevVersion = versions.find((v) => v.versionNumber < ver.versionNumber);
                      if (!prevVersion) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setCompareFromVersion(prevVersion.versionNumber);
                            setCompareToVersion(ver.versionNumber);
                            setIsComparing(true);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-nova-cyan hover:text-nova-cyan-dim px-2 py-1 rounded bg-nova-surface border border-nova-border/60 hover:border-nova-cyan/40 transition"
                          title={`Compare version v${ver.versionNumber} with previous version v${prevVersion.versionNumber}`}
                        >
                          <GitCompare className="w-3 h-3" />
                          <span>Diff vs v{prevVersion.versionNumber}</span>
                        </button>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={() => {
                        toggleExpand(ver.versionNumber);
                        if (onSelectVersion) onSelectVersion(ver);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-nova-text-dim hover:text-nova-text px-2 py-1 rounded bg-nova-surface border border-nova-border/60 transition"
                      aria-expanded={isExpanded}
                      aria-label={`Toggle details for version ${ver.versionNumber}`}
                    >
                      <span>{isExpanded ? 'Collapse' : 'Inspect'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Title & Summary */}
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-nova-text break-words">
                    {ver.title}
                  </h3>
                  {ver.changeSummary && (
                    <p className="text-xs text-nova-text-dim mt-1 italic break-words flex items-start gap-1.5">
                      <Sparkles className="w-3 h-3 text-nova-cyan shrink-0 mt-0.5" />
                      <span>{ver.changeSummary}</span>
                    </p>
                  )}
                </div>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-nova-text-muted pt-1 border-t border-nova-border/40">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-nova-text-dim" />
                    <span>Created: {formatRequirementDate(ver.createdAt)}</span>
                  </span>

                  {ver.createdBy && (
                    <span className="flex items-center gap-1 font-mono truncate max-w-[180px]" title={ver.createdBy}>
                      <User className="w-3 h-3 text-nova-text-dim" />
                      <span>Author: {ver.createdBy}</span>
                    </span>
                  )}

                  {ver.reviewedBy && (
                    <span className="flex items-center gap-1 font-mono truncate max-w-[180px]" title={ver.reviewedBy}>
                      <User className="w-3 h-3 text-nova-text-dim" />
                      <span>Reviewer: {ver.reviewedBy}</span>
                    </span>
                  )}
                </div>

                {/* Review Comment Box if present */}
                {ver.reviewComment && (
                  <div className="p-3 rounded-lg bg-nova-surface/70 border border-nova-border/80 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-nova-text-dim font-medium text-[11px]">
                      <MessageSquare className="w-3 h-3 text-nova-cyan" />
                      <span>Reviewer Feedback</span>
                      {ver.reviewedAt && (
                        <span className="text-[10px] text-nova-text-muted">
                          ({formatRequirementDate(ver.reviewedAt)})
                        </span>
                      )}
                    </div>
                    <p className="text-nova-text leading-relaxed whitespace-pre-wrap pl-4 border-l-2 border-nova-cyan/40">
                      {ver.reviewComment}
                    </p>
                  </div>
                )}

                {/* Review Workflow Actions (Draft submit, In-Review approve/reject, Read-only badge) */}
                <RequirementVersionReviewActions
                  projectId={projectId}
                  requirementId={requirementId}
                  version={ver}
                  requirementTitle={requirement?.title || ver.title}
                  onActionSuccess={handleReviewActionSuccess}
                />

                {/* Expandable Historical Snapshot Section */}
                {isExpanded && (
                  <div className="pt-3 border-t border-nova-border/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-nova-text-dim flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-nova-text-muted" />
                        Historical Specification Snapshot (Read-only)
                      </span>
                      <span className="text-[10px] font-mono text-nova-text-muted">
                        Snapshot ID: {ver.id}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-nova-surface border border-nova-border/80 text-xs text-nova-text leading-relaxed whitespace-pre-wrap font-sans break-words max-h-80 overflow-y-auto">
                      {ver.description}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Version Modal */}
      {showCreateModal && requirement && (
        <CreateRequirementVersionForm
          projectId={projectId}
          requirement={requirement}
          approvedVersion={approvedVersion}
          onCancel={() => setShowCreateModal(false)}
          onSuccess={(created) => {
            setShowCreateModal(false);
            setCreatedNotice(`Version v${created.versionNumber} successfully created in DRAFT status!`);
            fetchVersions();
            if (onVersionCreated) onVersionCreated(created);
          }}
        />
      )}
    </section>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RequirementItem, RequirementStatus } from '@/lib/api/client';
import {
  RequirementPriorityBadge,
  RequirementStatusBadge,
  RequirementTypeBadge,
} from './RequirementBadges';
import { StatusTransitionModal } from './StatusTransitionModal';
import {
  formatRequirementDate,
  getAllowedStatusTransitions,
} from '@/lib/project-validation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  FileCode,
  FileText,
  Hash,
  Layers,
  Edit3,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Ban,
  FileEdit,
} from 'lucide-react';

interface RequirementDetailsViewProps {
  requirement: RequirementItem;
  projectId: string;
  projectName?: string;
  onStatusUpdated?: (updated: RequirementItem) => void;
}

export function RequirementDetailsView({
  requirement,
  projectId,
  projectName,
  onStatusUpdated,
}: RequirementDetailsViewProps) {
  // Modal state for status transitions
  const [targetStatus, setTargetStatus] = useState<RequirementStatus | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const allowedTransitions = getAllowedStatusTransitions(requirement.status) as RequirementStatus[];

  const getTransitionLabel = (status: RequirementStatus) => {
    switch (status) {
      case 'IN_REVIEW':
        return 'Submit for Review';
      case 'APPROVED':
        return 'Approve Requirement';
      case 'REJECTED':
        return 'Reject Requirement';
      case 'DEPRECATED':
        return 'Deprecate Requirement';
      case 'DRAFT':
      default:
        return 'Return to Draft';
    }
  };

  const getTransitionButtonClass = (status: RequirementStatus) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20';
      case 'REJECTED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20';
      case 'IN_REVIEW':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20';
      case 'DEPRECATED':
        return 'bg-zinc-700/30 text-zinc-400 border-zinc-600/40 hover:bg-zinc-700/50';
      case 'DRAFT':
      default:
        return 'bg-slate-500/10 text-slate-300 border-slate-500/30 hover:bg-slate-500/20';
    }
  };

  const getTransitionIcon = (status: RequirementStatus) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'REJECTED':
        return <XCircle className="w-3.5 h-3.5" />;
      case 'IN_REVIEW':
        return <Clock className="w-3.5 h-3.5" />;
      case 'DEPRECATED':
        return <Ban className="w-3.5 h-3.5" />;
      case 'DRAFT':
      default:
        return <FileEdit className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-6 sm:p-8 bg-nova-surface border border-nova-border rounded-2xl shadow-xl space-y-4">
        {/* Project context pill & Key */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold bg-nova-cyan/15 text-nova-cyan border border-nova-cyan/30">
              <Hash className="w-3.5 h-3.5" />
              {requirement.requirementKey}
            </span>

            {projectName && (
              <span className="text-xs text-nova-text-muted">
                in <span className="text-nova-text-dim font-medium">{projectName}</span>
              </span>
            )}
          </div>

          {/* Action & Badges Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            <RequirementTypeBadge type={requirement.type} size="md" />
            <RequirementPriorityBadge priority={requirement.priority} size="md" />
            <RequirementStatusBadge status={requirement.status} size="md" />

            <Link
              href={`/projects/${projectId}/requirements/${requirement.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-nova-cyan text-nova-bg hover:bg-nova-cyan-dim transition shadow-sm shadow-nova-cyan/20 ml-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </Link>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-nova-text tracking-tight">
            {requirement.title}
          </h1>
          <p className="text-xs text-nova-text-muted mt-1.5 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-nova-cyan" />
            <span>Last modified {formatRequirementDate(requirement.updatedAt)}</span>
          </p>
        </div>
      </div>

      {/* Main Content Grid: Description & Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Main Column: Detailed Description */}
        <div className="lg:col-span-2 space-y-6">
          <section
            aria-labelledby="req-description-heading"
            className="p-6 bg-nova-surface border border-nova-border rounded-2xl shadow-lg space-y-3"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-nova-border/60">
              <FileCode className="w-4 h-4 text-nova-cyan" />
              <h2
                id="req-description-heading"
                className="text-sm font-semibold text-nova-text uppercase tracking-wider"
              >
                Requirement Specification
              </h2>
            </div>

            <div className="text-sm text-nova-text leading-relaxed whitespace-pre-wrap font-sans pt-1">
              {requirement.description}
            </div>
          </section>

          {/* Source Document Context */}
          <section
            aria-labelledby="req-source-heading"
            className="p-6 bg-nova-surface border border-nova-border rounded-2xl shadow-lg space-y-3"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-nova-border/60">
              <FileText className="w-4 h-4 text-nova-cyan" />
              <h2
                id="req-source-heading"
                className="text-sm font-semibold text-nova-text uppercase tracking-wider"
              >
                Source Document Origin
              </h2>
            </div>

            {requirement.sourceDocumentId ? (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-nova-surface2/60 border border-nova-border">
                <FileText className="w-5 h-5 text-nova-cyan shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-nova-text truncate">
                    Document Ref: {requirement.sourceDocumentId}
                  </p>
                  <p className="text-[11px] text-nova-text-muted">
                    This requirement is linked to an ingested architectural or SRS document.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-nova-surface2/30 border border-dashed border-nova-border text-center">
                <p className="text-xs text-nova-text-muted">
                  No source document linked. This requirement was authored directly.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Status Lifecycle Management & Metadata Panel */}
        <aside aria-labelledby="req-metadata-heading" className="space-y-6">
          {/* Status Management Card */}
          <div className="p-6 bg-nova-surface border border-nova-border rounded-2xl shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-nova-border/60">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-nova-cyan" />
                <h2 className="text-sm font-semibold text-nova-text uppercase tracking-wider">
                  Lifecycle Status
                </h2>
              </div>
              <RequirementStatusBadge status={requirement.status} />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-nova-text-dim block">
                Allowed Transitions:
              </span>

              {allowedTransitions.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {allowedTransitions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setTargetStatus(status);
                        setModalOpen(true);
                      }}
                      className={`flex items-center justify-between w-full p-2.5 rounded-xl border text-xs font-semibold transition ${getTransitionButtonClass(
                        status
                      )}`}
                    >
                      <div className="flex items-center gap-2">
                        {getTransitionIcon(status)}
                        <span>{getTransitionLabel(status)}</span>
                      </div>
                      <span className="text-[10px] uppercase font-mono opacity-80">
                        → {status}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-nova-text-muted py-2">
                  No valid transitions available from current state.
                </p>
              )}
            </div>
          </div>

          {/* Metadata & Attributes Card */}
          <div className="p-6 bg-nova-surface border border-nova-border rounded-2xl shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-nova-border/60">
              <Layers className="w-4 h-4 text-nova-cyan" />
              <h2
                id="req-metadata-heading"
                className="text-sm font-semibold text-nova-text uppercase tracking-wider"
              >
                Metadata & Attributes
              </h2>
            </div>

            <dl className="space-y-4 text-xs divide-y divide-nova-border/40">
              {/* Requirement Key */}
              <div className="pt-2 flex items-center justify-between">
                <dt className="text-nova-text-dim">Requirement Key</dt>
                <dd className="font-mono font-semibold text-nova-cyan">
                  {requirement.requirementKey}
                </dd>
              </div>

              {/* Type */}
              <div className="pt-3 flex items-center justify-between">
                <dt className="text-nova-text-dim">Type</dt>
                <dd>
                  <RequirementTypeBadge type={requirement.type} />
                </dd>
              </div>

              {/* Priority */}
              <div className="pt-3 flex items-center justify-between">
                <dt className="text-nova-text-dim">Priority</dt>
                <dd>
                  <RequirementPriorityBadge priority={requirement.priority} />
                </dd>
              </div>

              {/* Status */}
              <div className="pt-3 flex items-center justify-between">
                <dt className="text-nova-text-dim">Status</dt>
                <dd>
                  <RequirementStatusBadge status={requirement.status} />
                </dd>
              </div>

              {/* Created By */}
              {requirement.createdBy && (
                <div className="pt-3 flex items-center justify-between">
                  <dt className="text-nova-text-dim flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-nova-text-muted" />
                    <span>Created By</span>
                  </dt>
                  <dd className="font-mono text-nova-text truncate max-w-[140px]" title={requirement.createdBy}>
                    {requirement.createdBy}
                  </dd>
                </div>
              )}

              {/* Created Date */}
              <div className="pt-3 flex items-center justify-between">
                <dt className="text-nova-text-dim flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-nova-text-muted" />
                  <span>Created</span>
                </dt>
                <dd className="text-nova-text text-right">
                  {formatRequirementDate(requirement.createdAt)}
                </dd>
              </div>

              {/* Updated Date */}
              <div className="pt-3 flex items-center justify-between">
                <dt className="text-nova-text-dim flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-nova-text-muted" />
                  <span>Last Updated</span>
                </dt>
                <dd className="text-nova-text text-right">
                  {formatRequirementDate(requirement.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Navigation Action Card */}
          <div className="p-5 bg-nova-surface border border-nova-border rounded-2xl shadow-lg space-y-3">
            <h3 className="text-xs font-semibold uppercase text-nova-text-dim tracking-wider">
              Navigation
            </h3>
            <Link
              href={`/projects/${projectId}/requirements`}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-semibold rounded-lg border border-nova-border bg-nova-surface2 hover:bg-nova-surface2/80 text-nova-text transition"
            >
              <ArrowLeft className="w-4 h-4 text-nova-cyan" />
              <span>Back to Requirements List</span>
            </Link>
          </div>
        </aside>
      </div>

      {/* Confirmation Modal for Status Transitions */}
      {targetStatus && (
        <StatusTransitionModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setTargetStatus(null);
          }}
          projectId={projectId}
          requirement={requirement}
          targetStatus={targetStatus}
          onSuccess={(updated) => {
            if (onStatusUpdated) {
              onStatusUpdated(updated);
            }
          }}
        />
      )}
    </div>
  );
}

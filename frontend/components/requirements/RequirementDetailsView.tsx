'use client';

import Link from 'next/link';
import { RequirementItem } from '@/lib/api/client';
import {
  RequirementPriorityBadge,
  RequirementStatusBadge,
  RequirementTypeBadge,
} from './RequirementBadges';
import { formatRequirementDate } from '@/lib/project-validation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  FileCode,
  FileText,
  Hash,
  Layers,
} from 'lucide-react';

interface RequirementDetailsViewProps {
  requirement: RequirementItem;
  projectId: string;
  projectName?: string;
}

export function RequirementDetailsView({
  requirement,
  projectId,
  projectName,
}: RequirementDetailsViewProps) {
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

          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2">
            <RequirementTypeBadge type={requirement.type} size="md" />
            <RequirementPriorityBadge priority={requirement.priority} size="md" />
            <RequirementStatusBadge status={requirement.status} size="md" />
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

        {/* Right Column: Metadata Panel */}
        <aside aria-labelledby="req-metadata-heading" className="space-y-6">
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

          {/* Quick Actions Card */}
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
    </div>
  );
}

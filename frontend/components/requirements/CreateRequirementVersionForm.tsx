'use client';

import { useState } from 'react';
import {
  requirementVersionsApi,
  RequirementVersionItem,
  VersionChangeType,
} from '@/lib/api/requirementVersions';
import { RequirementItem } from '@/lib/api/client';
import { mapRequirementApiError } from '@/lib/project-validation';
import {
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  FileCode,
  ShieldCheck,
  Info,
  Sparkles,
} from 'lucide-react';

interface CreateRequirementVersionFormProps {
  projectId: string;
  requirement: RequirementItem;
  approvedVersion?: RequirementVersionItem | null;
  onSuccess: (createdVersion: RequirementVersionItem) => void;
  onCancel: () => void;
}

export function CreateRequirementVersionForm({
  projectId,
  requirement,
  approvedVersion,
  onSuccess,
  onCancel,
}: CreateRequirementVersionFormProps) {
  // Determine baseline prepopulation source
  const hasApprovedSnapshot = approvedVersion && approvedVersion.reviewStatus === 'APPROVED';
  const initialTitle = hasApprovedSnapshot
    ? approvedVersion.title
    : requirement.title || '';
  const initialDescription = hasApprovedSnapshot
    ? approvedVersion.description
    : requirement.description || '';

  // Form states
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [changeType, setChangeType] = useState<VersionChangeType>('UPDATED');
  const [changeSummary, setChangeSummary] = useState('');

  // UI & Error states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = 'Requirement title is required.';
    } else if (title.trim().length > 200) {
      errors.title = 'Title must not exceed 200 characters.';
    }

    if (!description.trim()) {
      errors.description = 'Requirement specification description is required.';
    } else if (description.trim().length > 5000) {
      errors.description = 'Description must not exceed 5000 characters.';
    }

    if (!changeSummary.trim()) {
      errors.changeSummary = 'Change summary explaining this version is required.';
    } else if (changeSummary.trim().length > 1000) {
      errors.changeSummary = 'Change summary must not exceed 1000 characters.';
    }

    const validChangeTypes: VersionChangeType[] = ['UPDATED', 'CLARIFIED', 'CORRECTED'];
    if (!validChangeTypes.includes(changeType)) {
      errors.changeType = 'Change type must be UPDATED, CLARIFIED, or CORRECTED.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setApiError(null);

    if (!validate()) {
      return;
    }

    try {
      setSubmitting(true);

      const res = await requirementVersionsApi.createDraftVersion(projectId, requirement.id, {
        title: title.trim(),
        description: description.trim(),
        changeSummary: changeSummary.trim(),
        changeType,
      });

      if (res.success && res.data) {
        onSuccess(res.data);
      } else {
        setApiError(res.message || 'Failed to create requirement version.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        setApiError(mapRequirementApiError(401).userMessage);
      } else if (msg.includes('403') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('forbidden')) {
        setApiError(mapRequirementApiError(403).userMessage);
      } else if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        setApiError(mapRequirementApiError(404).userMessage);
      } else if (msg.includes('409') || msg.toLowerCase().includes('conflict')) {
        setApiError(mapRequirementApiError(409, 'A version conflict occurred. Please retry.').userMessage);
      } else {
        setApiError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-version-modal-title"
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-nova-surface border border-nova-border rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-nova-border/70 bg-nova-surface2/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-nova-cyan/15 text-nova-cyan border border-nova-cyan/25">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 id="create-version-modal-title" className="text-base font-bold text-nova-text">
                Propose New Requirement Version
              </h2>
              <p className="text-xs text-nova-text-muted">
                {requirement.requirementKey} — Author a new draft specification for review
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="p-1.5 rounded-lg text-nova-text-muted hover:text-nova-text hover:bg-nova-surface2 transition"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Draft Safety Callout Banner */}
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/50 text-xs text-cyan-200 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-nova-cyan shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-nova-cyan">Draft Versioning Safeguard</p>
              <p className="text-cyan-200/80 leading-relaxed">
                Submitting creates a new version snapshot in <span className="font-bold text-cyan-300">DRAFT</span> status.
                It does <span className="underline font-semibold">not</span> overwrite the active published specification until reviewed and approved through the review workflow.
              </p>
            </div>
          </div>

          {/* Prepopulation Context Pill */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-nova-surface2/60 border border-nova-border text-xs text-nova-text-dim">
            <Info className="w-3.5 h-3.5 text-nova-cyan shrink-0" />
            <span>
              Prepopulated from:{' '}
              <strong className="text-nova-text">
                {hasApprovedSnapshot
                  ? `Approved Snapshot (v${approvedVersion.versionNumber})`
                  : `Current Requirement (${requirement.status})`}
              </strong>
            </span>
          </div>

          {/* API Error Notification */}
          {apiError && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/70 text-xs text-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 flex-1">
                <p className="font-semibold text-red-300">Submission Failed</p>
                <p className="text-red-300/80">{apiError}</p>
              </div>
            </div>
          )}

          {/* Title Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="version-title" className="font-semibold text-nova-text">
                Requirement Title <span className="text-red-400">*</span>
              </label>
              <span className="text-[11px] font-mono text-nova-text-muted">
                {title.length}/200
              </span>
            </div>
            <input
              id="version-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="e.g. Robust OAuth2 & Verified User Authentication"
              disabled={submitting}
              className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-nova-surface2 border text-nova-text placeholder:text-nova-text-muted focus:outline-none focus:ring-1 transition ${
                fieldErrors.title
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-nova-border focus:border-nova-cyan focus:ring-nova-cyan'
              }`}
            />
            {fieldErrors.title && (
              <p className="text-[11px] text-red-400 font-medium">{fieldErrors.title}</p>
            )}
          </div>

          {/* Change Type Dropdown */}
          <div className="space-y-1.5">
            <label htmlFor="version-change-type" className="font-semibold text-xs text-nova-text block">
              Change Classification <span className="text-red-400">*</span>
            </label>
            <select
              id="version-change-type"
              value={changeType}
              onChange={(e) => setChangeType(e.target.value as VersionChangeType)}
              disabled={submitting}
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-nova-surface2 border border-nova-border text-nova-text focus:outline-none focus:border-nova-cyan focus:ring-1 focus:ring-nova-cyan transition"
            >
              <option value="UPDATED">UPDATED — General specification evolution / refinement</option>
              <option value="CLARIFIED">CLARIFIED — Scope, ambiguity, or acceptance criteria clarification</option>
              <option value="CORRECTED">CORRECTED — Correction of an error, omission, or defect</option>
            </select>
            {fieldErrors.changeType && (
              <p className="text-[11px] text-red-400 font-medium">{fieldErrors.changeType}</p>
            )}
          </div>

          {/* Change Summary Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="version-change-summary" className="font-semibold text-nova-text">
                Change Summary / Rationale <span className="text-red-400">*</span>
              </label>
              <span className="text-[11px] font-mono text-nova-text-muted">
                {changeSummary.length}/1000
              </span>
            </div>
            <textarea
              id="version-change-summary"
              rows={2}
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              maxLength={1000}
              placeholder="Briefly explain what was modified and why this draft version is needed..."
              disabled={submitting}
              className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-nova-surface2 border text-nova-text placeholder:text-nova-text-muted focus:outline-none focus:ring-1 transition resize-none ${
                fieldErrors.changeSummary
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-nova-border focus:border-nova-cyan focus:ring-nova-cyan'
              }`}
            />
            {fieldErrors.changeSummary && (
              <p className="text-[11px] text-red-400 font-medium">{fieldErrors.changeSummary}</p>
            )}
          </div>

          {/* Detailed Description Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="version-description" className="font-semibold text-nova-text">
                Detailed Requirement Specification <span className="text-red-400">*</span>
              </label>
              <span className="text-[11px] font-mono text-nova-text-muted">
                {description.length}/5000
              </span>
            </div>
            <textarea
              id="version-description"
              rows={7}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              placeholder="Full updated requirement specification..."
              disabled={submitting}
              className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-nova-surface2 border text-nova-text placeholder:text-nova-text-muted focus:outline-none focus:ring-1 transition font-sans ${
                fieldErrors.description
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-nova-border focus:border-nova-cyan focus:ring-nova-cyan'
              }`}
            />
            {fieldErrors.description && (
              <p className="text-[11px] text-red-400 font-medium">{fieldErrors.description}</p>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-nova-border/70">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-nova-border bg-nova-surface2 hover:bg-nova-surface2/80 text-nova-text transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-nova-cyan text-nova-bg hover:bg-nova-cyan-dim disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-nova-cyan/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Proposal...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create Draft Version</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

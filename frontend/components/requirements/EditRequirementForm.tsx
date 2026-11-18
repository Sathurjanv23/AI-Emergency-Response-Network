'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  RequirementItem,
  RequirementPriority,
  RequirementType,
  requirementsApi,
} from '@/lib/api/client';
import {
  validateRequirementForm,
  RequirementFormValidation,
} from '@/lib/project-validation';
import {
  RequirementStatusBadge,
} from './RequirementBadges';
import {
  AlertCircle,
  Loader2,
  CheckCircle2,
  Edit3,
  Lock,
  Hash,
} from 'lucide-react';

interface EditRequirementFormProps {
  projectId: string;
  requirement: RequirementItem;
  projectName?: string;
  onSuccess?: (updated: RequirementItem) => void;
  onCancel?: () => void;
}

export function EditRequirementForm({
  projectId,
  requirement,
  projectName,
  onSuccess,
  onCancel,
}: EditRequirementFormProps) {
  const router = useRouter();

  // Form states populated from existing requirement
  const [title, setTitle] = useState(requirement.title);
  const [description, setDescription] = useState(requirement.description);
  const [type, setType] = useState<RequirementType>(requirement.type);
  const [priority, setPriority] = useState<RequirementPriority>(requirement.priority);

  // Validation & Submission
  const [errors, setErrors] = useState<RequirementFormValidation['errors']>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setApiError(null);
    setSuccessNotice(false);

    // Validate fields
    const validation = validateRequirementForm({
      title,
      description,
      type,
      priority,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});

    try {
      setSubmitting(true);
      const res = await requirementsApi.update(projectId, requirement.id, {
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
      });

      if (res.success && res.data) {
        setSuccessNotice(true);
        if (onSuccess) {
          onSuccess(res.data);
        } else {
          router.push(`/projects/${projectId}/requirements/${requirement.id}`);
        }
      } else {
        setApiError(res.message || 'Failed to update requirement.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during update.';
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Context & Read-only Metadata Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-nova-surface2/50 border border-nova-border rounded-xl">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-nova-cyan px-2.5 py-1 rounded bg-nova-cyan/10 border border-nova-cyan/20">
            <Hash className="w-3 h-3" />
            {requirement.requirementKey}
          </span>
          {projectName && (
            <span className="text-xs text-nova-text-muted">
              Project: <span className="text-nova-text font-medium">{projectName}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-nova-text-dim flex items-center gap-1">
            <Lock className="w-3 h-3 text-nova-text-muted" />
            Status:
          </span>
          <RequirementStatusBadge status={requirement.status} />
        </div>
      </div>

      {/* Success Notification */}
      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/70 text-xs sm:text-sm text-emerald-200 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Requirement specification updated successfully! Redirecting...</span>
        </div>
      )}

      {/* API Error Notification */}
      {apiError && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/70 text-xs sm:text-sm text-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-red-300">Update Failed</p>
            <p className="text-red-300/80">{apiError}</p>
          </div>
        </div>
      )}

      {/* Requirement Title */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="edit-req-title" className="block text-xs font-semibold text-nova-text-dim uppercase tracking-wider">
            Requirement Title <span className="text-nova-critical">*</span>
          </label>
          <span className="text-[11px] text-nova-text-muted">{title.length}/200</span>
        </div>
        <input
          id="edit-req-title"
          type="text"
          value={title}
          disabled={submitting}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          placeholder="Requirement title..."
          maxLength={200}
          className={`w-full px-4 py-2.5 bg-nova-bg border rounded-lg text-sm text-nova-text placeholder:text-nova-text-muted focus:outline-none transition ${
            errors.title
              ? 'border-red-500 focus:border-red-400'
              : 'border-nova-border focus:border-nova-cyan'
          }`}
          autoFocus
        />
        {errors.title && (
          <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.title}
          </p>
        )}
      </div>

      {/* Requirement Description */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="edit-req-desc" className="block text-xs font-semibold text-nova-text-dim uppercase tracking-wider">
            Detailed Description <span className="text-nova-critical">*</span>
          </label>
          <span className="text-[11px] text-nova-text-muted">{description.length}/4000</span>
        </div>
        <textarea
          id="edit-req-desc"
          rows={7}
          value={description}
          disabled={submitting}
          onChange={(e) => {
            setDescription(e.target.value);
            if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
          }}
          placeholder="Clearly describe the system requirement, preconditions, expected behavior, verification criteria..."
          maxLength={4000}
          className={`w-full px-4 py-2.5 bg-nova-bg border rounded-lg text-sm text-nova-text placeholder:text-nova-text-muted focus:outline-none transition resize-none ${
            errors.description
              ? 'border-red-500 focus:border-red-400'
              : 'border-nova-border focus:border-nova-cyan'
          }`}
        />
        {errors.description && (
          <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.description}
          </p>
        )}
      </div>

      {/* Requirement Type & Priority Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Type Selection */}
        <div>
          <label className="block text-xs font-semibold text-nova-text-dim uppercase tracking-wider mb-2">
            Requirement Type <span className="text-nova-critical">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setType('FUNCTIONAL');
                if (errors.type) setErrors((prev) => ({ ...prev, type: undefined }));
              }}
              className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                type === 'FUNCTIONAL'
                  ? 'bg-blue-500/15 border-blue-500/50 text-blue-300'
                  : 'bg-nova-bg border-nova-border text-nova-text-dim hover:bg-nova-surface2'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs">Functional (FR)</span>
                {type === 'FUNCTIONAL' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
              </div>
              <span className="text-[10px] text-nova-text-muted mt-1">Capabilities, behaviors</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setType('NON_FUNCTIONAL');
                if (errors.type) setErrors((prev) => ({ ...prev, type: undefined }));
              }}
              className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                type === 'NON_FUNCTIONAL'
                  ? 'bg-purple-500/15 border-purple-500/50 text-purple-300'
                  : 'bg-nova-bg border-nova-border text-nova-text-dim hover:bg-nova-surface2'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs">Non-Functional (NFR)</span>
                {type === 'NON_FUNCTIONAL' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
              </div>
              <span className="text-[10px] text-nova-text-muted mt-1">Security, SLA, latency</span>
            </button>
          </div>
          {errors.type && (
            <p className="mt-1 text-xs text-red-400">{errors.type}</p>
          )}
        </div>

        {/* Priority Selection */}
        <div>
          <label htmlFor="edit-req-priority" className="block text-xs font-semibold text-nova-text-dim uppercase tracking-wider mb-2">
            Priority Level <span className="text-nova-critical">*</span>
          </label>
          <select
            id="edit-req-priority"
            value={priority}
            disabled={submitting}
            onChange={(e) => {
              setPriority(e.target.value as RequirementPriority);
              if (errors.priority) setErrors((prev) => ({ ...prev, priority: undefined }));
            }}
            className="w-full px-4 py-2.5 bg-nova-bg border border-nova-border rounded-lg text-sm text-nova-text focus:outline-none focus:border-nova-cyan transition"
          >
            <option value="CRITICAL">🔴 CRITICAL — Must-have core blocker</option>
            <option value="HIGH">🟠 HIGH — Urgent release objective</option>
            <option value="MEDIUM">🟡 MEDIUM — Standard business requirement</option>
            <option value="LOW">🔵 LOW — Minor / nice-to-have capability</option>
          </select>
          {errors.priority && (
            <p className="mt-1 text-xs text-red-400">{errors.priority}</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-nova-border">
        {onCancel ? (
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-nova-border hover:bg-nova-surface2 transition text-nova-text-dim hover:text-nova-text disabled:opacity-50"
          >
            Cancel
          </button>
        ) : (
          <Link
            href={`/projects/${projectId}/requirements/${requirement.id}`}
            className="px-4 py-2 text-sm rounded-lg border border-nova-border hover:bg-nova-surface2 transition text-nova-text-dim hover:text-nova-text"
          >
            Cancel
          </Link>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-nova-cyan text-nova-bg hover:bg-nova-cyan-dim transition shadow-md shadow-nova-cyan/20 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving Changes...
            </>
          ) : (
            <>
              <Edit3 className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}

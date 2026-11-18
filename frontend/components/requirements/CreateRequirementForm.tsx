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
  mapRequirementApiError,
} from '@/lib/project-validation';
import {
  FileCode,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface CreateRequirementFormProps {
  projectId: string;
  projectName?: string;
  onSuccess?: (created: RequirementItem) => void;
  onCancel?: () => void;
}

export function CreateRequirementForm({
  projectId,
  projectName,
  onSuccess,
  onCancel,
}: CreateRequirementFormProps) {
  const router = useRouter();

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<RequirementType>('FUNCTIONAL');
  const [priority, setPriority] = useState<RequirementPriority>('MEDIUM');
  const [sourceDocumentId, setSourceDocumentId] = useState('');

  // Validation & Submission
  const [errors, setErrors] = useState<RequirementFormValidation['errors']>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setApiError(null);

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
      const res = await requirementsApi.create(projectId, {
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        sourceDocumentId: sourceDocumentId.trim() || undefined,
      });

      if (res.success && res.data) {
        if (onSuccess) {
          onSuccess(res.data);
        } else {
          // If requirement details page is available, navigate to it; otherwise list
          router.push(`/projects/${projectId}/requirements`);
        }
      } else {
        setApiError(res.message || 'Failed to create requirement.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        setApiError(mapRequirementApiError(401).userMessage);
      } else if (msg.includes('403') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('forbidden')) {
        setApiError(mapRequirementApiError(403).userMessage);
      } else if (msg.includes('409') || msg.toLowerCase().includes('conflict')) {
        setApiError(mapRequirementApiError(409, 'A requirement with this key or title already exists in the project.').userMessage);
      } else if (msg.includes('400') || msg.toLowerCase().includes('bad request')) {
        setApiError(mapRequirementApiError(400, msg).userMessage);
      } else {
        setApiError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {projectName && (
        <div className="text-xs text-nova-text-muted pb-1 border-b border-nova-border/50">
          Target Project: <span className="font-semibold text-nova-text">{projectName}</span>
        </div>
      )}

      {/* API Error Notification */}
      {apiError && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/70 text-xs sm:text-sm text-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-red-300">Creation Failed</p>
            <p className="text-red-300/80">{apiError}</p>
          </div>
        </div>
      )}

      {/* Requirement Title */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="req-title" className="block text-xs font-semibold text-nova-text-dim uppercase tracking-wider">
            Requirement Title <span className="text-nova-critical">*</span>
          </label>
          <span className="text-[11px] text-nova-text-muted">{title.length}/200</span>
        </div>
        <input
          id="req-title"
          type="text"
          value={title}
          disabled={submitting}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          placeholder="e.g. Automated Bi-Directional Traceability Matrix Generation"
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
          <label htmlFor="req-desc" className="block text-xs font-semibold text-nova-text-dim uppercase tracking-wider">
            Detailed Description <span className="text-nova-critical">*</span>
          </label>
          <span className="text-[11px] text-nova-text-muted">{description.length}/4000</span>
        </div>
        <textarea
          id="req-desc"
          rows={6}
          value={description}
          disabled={submitting}
          onChange={(e) => {
            setDescription(e.target.value);
            if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
          }}
          placeholder="Clearly describe the system requirement, preconditions, expected behavior, verification criteria, and business intent..."
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
              <span className="text-[10px] text-nova-text-muted mt-1">Capabilities, behaviors, features</span>
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
              <span className="text-[10px] text-nova-text-muted mt-1">Performance, security, SLA</span>
            </button>
          </div>
          {errors.type && (
            <p className="mt-1 text-xs text-red-400">{errors.type}</p>
          )}
        </div>

        {/* Priority Selection */}
        <div>
          <label htmlFor="req-priority" className="block text-xs font-semibold text-nova-text-dim uppercase tracking-wider mb-2">
            Priority Level <span className="text-nova-critical">*</span>
          </label>
          <select
            id="req-priority"
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

      {/* Optional Source Document ID */}
      <div>
        <label htmlFor="req-source-doc" className="block text-xs font-semibold text-nova-text-dim uppercase tracking-wider mb-1.5">
          Source Document ID <span className="text-nova-text-muted text-[11px] font-normal lowercase">(optional)</span>
        </label>
        <input
          id="req-source-doc"
          type="text"
          value={sourceDocumentId}
          disabled={submitting}
          onChange={(e) => setSourceDocumentId(e.target.value)}
          placeholder="e.g. doc-6789 (link requirement to uploaded SRS / architecture document)"
          className="w-full px-4 py-2 bg-nova-bg border border-nova-border rounded-lg text-sm text-nova-text placeholder:text-nova-text-muted focus:outline-none focus:border-nova-cyan transition"
        />
        <p className="text-[11px] text-nova-text-muted mt-1">
          Links this specification to an ingested document for automated requirement traceability.
        </p>
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
            href={`/projects/${projectId}/requirements`}
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
              Creating Requirement...
            </>
          ) : (
            <>
              <FileCode className="w-4 h-4" />
              Create Requirement
            </>
          )}
        </button>
      </div>
    </form>
  );
}

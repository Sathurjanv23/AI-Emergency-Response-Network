'use client';

import { useState, useEffect } from 'react';
import { ProjectItem, projectsApi } from '@/lib/api/client';
import { Edit3, AlertCircle, Loader2, X } from 'lucide-react';

interface EditProjectModalProps {
  project: ProjectItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (project: ProjectItem) => void;
}

export function EditProjectModal({
  project,
  isOpen,
  onClose,
  onUpdated,
}: EditProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setStatus(project.status);
      setValidationError(null);
      setApiError(null);
    }
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setApiError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError('Project name is required.');
      return;
    }
    if (trimmedName.length > 200) {
      setValidationError('Project name cannot exceed 200 characters.');
      return;
    }

    try {
      setLoading(true);
      const res = await projectsApi.update(project.id, {
        name: trimmedName,
        description: description.trim() || undefined,
        status,
      });

      if (res.success && res.data) {
        onUpdated(res.data);
        onClose();
      } else {
        setApiError(res.message || 'Failed to update project.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update project.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-project-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg bg-nova-surface border border-nova-border rounded-xl shadow-2xl p-6 text-nova-text animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-nova-border">
          <div className="flex items-center gap-2.5 text-nova-cyan">
            <div className="p-2 rounded-lg bg-nova-cyan/10 border border-nova-cyan/20">
              <Edit3 className="w-5 h-5 text-nova-cyan" />
            </div>
            <div>
              <h3 id="edit-project-title" className="text-lg font-semibold text-nova-text">
                Edit Project
              </h3>
              <p className="text-xs text-nova-text-dim">Update details and status</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-nova-text-dim hover:text-nova-text hover:bg-nova-surface2 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-project-name" className="block text-xs font-medium text-nova-text-dim mb-1">
              Project Name <span className="text-nova-critical">*</span>
            </label>
            <input
              id="edit-project-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (validationError) setValidationError(null);
              }}
              maxLength={200}
              className="w-full px-3.5 py-2.5 bg-nova-bg border border-nova-border rounded-lg text-sm text-nova-text placeholder:text-nova-text-muted focus:outline-none focus:border-nova-cyan transition"
            />
            {validationError && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {validationError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="edit-project-desc" className="block text-xs font-medium text-nova-text-dim mb-1">
              Description <span className="text-nova-text-muted text-[11px]">(Optional)</span>
            </label>
            <textarea
              id="edit-project-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              className="w-full px-3.5 py-2.5 bg-nova-bg border border-nova-border rounded-lg text-sm text-nova-text placeholder:text-nova-text-muted focus:outline-none focus:border-nova-cyan transition resize-none"
            />
          </div>

          <div>
            <label htmlFor="edit-project-status" className="block text-xs font-medium text-nova-text-dim mb-1">
              Project Status
            </label>
            <select
              id="edit-project-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'ARCHIVED')}
              className="w-full px-3.5 py-2.5 bg-nova-bg border border-nova-border rounded-lg text-sm text-nova-text focus:outline-none focus:border-nova-cyan transition"
            >
              <option value="ACTIVE">ACTIVE — Ongoing requirements & traceability</option>
              <option value="ARCHIVED">ARCHIVED — Completed / Archived</option>
            </select>
          </div>

          {apiError && (
            <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-nova-border">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-nova-border hover:bg-nova-surface2 transition text-nova-text-dim hover:text-nova-text disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-nova-cyan text-nova-bg font-semibold hover:bg-nova-cyan-dim transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { ProjectItem, projectsApi } from '@/lib/api/client';
import { Archive, AlertTriangle, Loader2 } from 'lucide-react';

interface ArchiveConfirmModalProps {
  project: ProjectItem | null;
  isOpen: boolean;
  onClose: () => void;
  onArchived: (updated: ProjectItem) => void;
}

export function ArchiveConfirmModal({
  project,
  isOpen,
  onClose,
  onArchived,
}: ArchiveConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !project) return null;

  const handleArchive = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await projectsApi.archive(project.id);
      if (res.success && res.data) {
        onArchived(res.data);
        onClose();
      } else {
        setError(res.message || 'Failed to archive project.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to archive project.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div className="w-full max-w-md bg-nova-surface border border-nova-border rounded-xl shadow-2xl p-6 text-nova-text animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 text-amber-400 mb-4">
          <div className="p-2.5 rounded-lg bg-amber-400/10 border border-amber-400/20">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <h3 id="archive-modal-title" className="text-lg font-semibold text-nova-text">
              Archive Project
            </h3>
            <p className="text-xs text-nova-text-dim">Confirm project archiving</p>
          </div>
        </div>

        <p className="text-sm text-nova-text-dim mb-4 leading-relaxed">
          Are you sure you want to archive <span className="font-semibold text-nova-text">&ldquo;{project.name}&rdquo;</span>?
          The project data will remain stored securely in MongoDB and can still be viewed in your archive history.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-nova-border hover:bg-nova-surface2 transition text-nova-text-dim hover:text-nova-text disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleArchive}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition disabled:opacity-50 font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Archiving...
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                Confirm Archive
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

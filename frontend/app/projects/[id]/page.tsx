'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ProjectItem, projectsApi } from '@/lib/api/client';
import { EditProjectModal } from '@/components/projects/EditProjectModal';
import { ArchiveConfirmModal } from '@/components/projects/ArchiveConfirmModal';
import {
  Folder,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Shield,
  Edit3,
  Archive,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params?.id === 'string' ? params.id : '';

  const [project, setProject] = useState<ProjectItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);

  const fetchProjectDetails = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      setErrorCode(null);
      const res = await projectsApi.getById(projectId);

      if (res.success && res.data) {
        setProject(res.data);
      } else {
        setError(res.message || 'Project not found.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve project details.';
      setError(msg);
      if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        setErrorCode(404);
      } else if (msg.includes('403') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('forbidden')) {
        setErrorCode(403);
      } else if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        setErrorCode(401);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return isNaN(d.getTime()) ? isoString : d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-nova-bg text-nova-text">
      {/* Top Header */}
      <header className="border-b border-nova-border bg-nova-surface/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/projects"
            className="flex items-center gap-2 text-sm text-nova-text-dim hover:text-nova-cyan transition font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>

          {project && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-nova-border bg-nova-surface hover:bg-nova-surface2 text-nova-text transition"
              >
                <Edit3 className="w-4 h-4 text-nova-cyan" />
                Edit
              </button>
              {project.status !== 'ARCHIVED' && (
                <button
                  onClick={() => setArchiveModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {loading && (
          <div className="p-12 text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-nova-cyan mx-auto" />
            <p className="text-sm text-nova-text-dim">Loading project details...</p>
          </div>
        )}

        {/* Not Found (404) State */}
        {!loading && (errorCode === 404 || (!project && error?.includes('not found'))) && (
          <div className="p-12 text-center rounded-2xl border border-dashed border-nova-border bg-nova-surface/40 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-nova-text">Project Not Found</h3>
            <p className="text-sm text-nova-text-dim mt-2">
              The requested project ID <span className="font-mono text-nova-text">&ldquo;{projectId}&rdquo;</span> does not exist or has been removed.
            </p>
            <div className="mt-6">
              <Link
                href="/projects"
                className="px-4 py-2 bg-nova-cyan text-nova-bg font-semibold rounded-lg hover:bg-nova-cyan-dim transition text-sm inline-block"
              >
                Return to Projects
              </Link>
            </div>
          </div>
        )}

        {/* Forbidden / Access Denied (403) State */}
        {!loading && (errorCode === 403 || (!project && error?.toLowerCase().includes('denied'))) && (
          <div className="p-12 text-center rounded-2xl border border-dashed border-red-800/40 bg-red-950/20 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 mx-auto flex items-center justify-center mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-red-200">Access Denied</h3>
            <p className="text-sm text-red-300/80 mt-2">
              You do not have authorization to view this private project. Access is restricted exclusively to the project owner.
            </p>
            <div className="mt-6">
              <Link
                href="/projects"
                className="px-4 py-2 border border-nova-border hover:bg-nova-surface2 text-nova-text rounded-lg text-sm transition inline-block"
              >
                Return to My Projects
              </Link>
            </div>
          </div>
        )}

        {/* Generic Error */}
        {!loading && error && !errorCode && !project && (
          <div className="p-6 rounded-xl bg-red-950/40 border border-red-800/70 text-sm text-red-200 space-y-3 max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="font-semibold text-red-300">Error Loading Project</p>
            </div>
            <p className="text-xs text-red-300/80">{error}</p>
            <button
              onClick={() => fetchProjectDetails()}
              className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800/50 border border-red-700/60 rounded-lg text-xs font-medium text-red-200 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Project View */}
        {!loading && project && (
          <div className="space-y-6">
            {/* Title & Status */}
            <div className="p-6 bg-nova-surface border border-nova-border rounded-xl shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={`p-3 rounded-xl border ${
                    project.status === 'ARCHIVED'
                      ? 'bg-nova-surface2 border-nova-border text-nova-text-muted'
                      : 'bg-nova-cyan/10 border-nova-cyan/20 text-nova-cyan'
                  }`}>
                    <Folder className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold font-display text-nova-text">
                      {project.name}
                    </h1>
                    <p className="text-xs font-mono text-nova-text-muted mt-1">
                      Project ID: {project.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                      project.status === 'ARCHIVED'
                        ? 'bg-slate-800/80 text-slate-400 border-slate-700'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {project.status === 'ACTIVE' && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />}
                    {project.status}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="pt-4 border-t border-nova-border/70">
                <h2 className="text-xs font-semibold text-nova-text-dim uppercase tracking-wider mb-2">
                  Project Description
                </h2>
                <p className="text-sm text-nova-text leading-relaxed whitespace-pre-wrap">
                  {project.description || 'No description provided for this project.'}
                </p>
              </div>
            </div>

            {/* Metadata & Audit Information */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-nova-surface border border-nova-border rounded-xl">
                <div className="flex items-center gap-2 text-xs font-medium text-nova-text-dim mb-1">
                  <User className="w-4 h-4 text-nova-cyan" />
                  Owner Identifier
                </div>
                <p className="text-sm font-mono text-nova-text truncate" title={project.ownerId}>
                  {project.ownerId}
                </p>
                <span className="text-[10px] text-nova-text-muted">Authenticated User ID</span>
              </div>

              <div className="p-4 bg-nova-surface border border-nova-border rounded-xl">
                <div className="flex items-center gap-2 text-xs font-medium text-nova-text-dim mb-1">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  Created At
                </div>
                <p className="text-sm font-mono text-nova-text">
                  {formatDate(project.createdAt)}
                </p>
                <span className="text-[10px] text-nova-text-muted">Initial system timestamp</span>
              </div>

              <div className="p-4 bg-nova-surface border border-nova-border rounded-xl">
                <div className="flex items-center gap-2 text-xs font-medium text-nova-text-dim mb-1">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Last Updated
                </div>
                <p className="text-sm font-mono text-nova-text">
                  {formatDate(project.updatedAt)}
                </p>
                <span className="text-[10px] text-nova-text-muted">Audit modification timestamp</span>
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-4 rounded-xl bg-nova-surface/40 border border-nova-border flex items-start gap-3">
              <Shield className="w-5 h-5 text-nova-cyan shrink-0 mt-0.5" />
              <div className="text-xs text-nova-text-dim leading-relaxed">
                <span className="font-semibold text-nova-text">Access Isolation: </span>
                This project is protected by Spring Boot Security and MongoDB Atlas ownership filters.
                Only the authenticated owner may view, modify, or archive its requirement specifications.
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <EditProjectModal
        project={project}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onUpdated={(updated) => setProject(updated)}
      />

      <ArchiveConfirmModal
        project={project}
        isOpen={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
        onArchived={(archived) => setProject(archived)}
      />
    </div>
  );
}

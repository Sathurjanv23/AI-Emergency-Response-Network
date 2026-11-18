'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ProjectItem,
  RequirementItem,
  projectsApi,
  requirementsApi,
} from '@/lib/api/client';
import { EditRequirementForm } from '@/components/requirements/EditRequirementForm';
import { mapRequirementApiError } from '@/lib/project-validation';
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Layers,
  ChevronRight,
  Edit3,
  FileQuestion,
  FolderGit2,
} from 'lucide-react';

export default function EditRequirementPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params?.id === 'string' ? params.id : '';
  const requirementId = typeof params?.requirementId === 'string' ? params.requirementId : '';

  const [project, setProject] = useState<ProjectItem | null>(null);
  const [requirement, setRequirement] = useState<RequirementItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);

  // Fetch parent project info for context & breadcrumbs
  const fetchProjectInfo = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await projectsApi.getById(projectId);
      if (res.success && res.data) {
        setProject(res.data);
      }
    } catch {
      // Non-fatal, page continues with requirement data
    }
  }, [projectId]);

  // Fetch existing requirement details
  const fetchRequirement = useCallback(async () => {
    if (!projectId || !requirementId) return;

    try {
      setLoading(true);
      setError(null);
      setErrorCode(null);

      const res = await requirementsApi.getById(projectId, requirementId);

      if (res.success && res.data) {
        setRequirement(res.data);
      } else {
        const mapped = mapRequirementApiError(404, res.message);
        setError(mapped.userMessage);
        setErrorCode(404);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve requirement.';
      if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        const mapped = mapRequirementApiError(404);
        setError(mapped.userMessage);
        setErrorCode(404);
      } else if (msg.includes('403') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('forbidden')) {
        const mapped = mapRequirementApiError(403);
        setError(mapped.userMessage);
        setErrorCode(403);
      } else if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        const mapped = mapRequirementApiError(401);
        setError(mapped.userMessage);
        setErrorCode(401);
      } else {
        setError(msg);
        setErrorCode(500);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, requirementId]);

  useEffect(() => {
    fetchProjectInfo();
  }, [fetchProjectInfo]);

  useEffect(() => {
    fetchRequirement();
  }, [fetchRequirement]);

  return (
    <div className="min-h-screen bg-nova-bg text-nova-text">
      {/* Top Header */}
      <header className="border-b border-nova-border bg-nova-surface/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${projectId}/requirements/${requirementId}`}
              className="flex items-center gap-2 text-sm text-nova-text-dim hover:text-nova-cyan transition font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Details</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-nova-cyan">
            <Layers className="w-4 h-4" />
            <span>ReqTrace AI</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumbs"
          className="flex items-center gap-1.5 text-xs text-nova-text-dim mb-6 overflow-x-auto whitespace-nowrap"
        >
          <Link href="/projects" className="hover:text-nova-cyan transition">
            Projects
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-nova-text-muted shrink-0" />
          <Link
            href={`/projects/${projectId}`}
            className="hover:text-nova-cyan transition max-w-[160px] truncate"
          >
            {project?.name || 'Project'}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-nova-text-muted shrink-0" />
          <Link
            href={`/projects/${projectId}/requirements`}
            className="hover:text-nova-cyan transition"
          >
            Requirements
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-nova-text-muted shrink-0" />
          <Link
            href={`/projects/${projectId}/requirements/${requirementId}`}
            className="hover:text-nova-cyan transition font-mono"
          >
            {requirement ? requirement.requirementKey : 'Details'}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-nova-text-muted shrink-0" />
          <span className="text-nova-cyan font-medium">Edit</span>
        </nav>

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading requirement for editing">
            <div className="p-8 bg-nova-surface border border-nova-border rounded-xl space-y-4">
              <div className="h-6 w-48 bg-nova-surface2 rounded" />
              <div className="h-4 w-72 bg-nova-surface2 rounded" />
            </div>
            <div className="p-8 bg-nova-surface border border-nova-border rounded-2xl space-y-5">
              <div className="h-10 w-full bg-nova-surface2 rounded-lg" />
              <div className="h-32 w-full bg-nova-surface2 rounded-lg" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-16 bg-nova-surface2 rounded-lg" />
                <div className="h-16 bg-nova-surface2 rounded-lg" />
              </div>
            </div>
          </div>
        )}

        {/* Not Found State (404) */}
        {!loading && errorCode === 404 && (
          <div className="p-10 bg-nova-surface border border-nova-border rounded-2xl shadow-xl text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FileQuestion className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold font-display text-nova-text">
                Requirement Not Found
              </h1>
              <p className="text-xs sm:text-sm text-nova-text-dim max-w-md mx-auto">
                The requested requirement specification could not be found to edit.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                href={`/projects/${projectId}/requirements`}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-nova-cyan text-nova-bg hover:bg-nova-cyan-dim transition shadow-md shadow-nova-cyan/20"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Requirements List
              </Link>
            </div>
          </div>
        )}

        {/* General Error State with Retry (Non-404) */}
        {!loading && error && errorCode !== 404 && (
          <div className="p-10 bg-nova-surface border border-red-500/30 rounded-2xl shadow-xl text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold font-display text-nova-text">
                Failed to Load Requirement
              </h1>
              <p className="text-xs sm:text-sm text-red-300/80 max-w-md mx-auto">
                {error}
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={fetchRequirement}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-nova-cyan text-nova-bg hover:bg-nova-cyan-dim transition shadow-md shadow-nova-cyan/20"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
              <Link
                href={`/projects/${projectId}/requirements/${requirementId}`}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-nova-border bg-nova-surface2 hover:bg-nova-surface2/80 text-nova-text transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Cancel
              </Link>
            </div>
          </div>
        )}

        {/* Edit Form Content */}
        {!loading && !error && requirement && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-nova-surface border border-nova-border rounded-xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-nova-cyan/10 border border-nova-cyan/20 shrink-0">
                  <Edit3 className="w-6 h-6 text-nova-cyan" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold font-display text-nova-text">
                      Edit Requirement Specification
                    </h1>
                    {project && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-nova-surface2 border border-nova-border text-nova-text-dim">
                        <FolderGit2 className="w-3 h-3 text-nova-cyan" />
                        {project.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-nova-text-dim mt-1">
                    Update the title, description, type, or priority of requirement{' '}
                    <span className="font-mono text-nova-cyan font-semibold">
                      {requirement.requirementKey}
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>

            {/* Form Container */}
            <div className="bg-nova-surface border border-nova-border rounded-2xl p-6 sm:p-8 shadow-xl">
              <EditRequirementForm
                projectId={projectId}
                requirement={requirement}
                projectName={project?.name}
                onSuccess={() => {
                  router.push(`/projects/${projectId}/requirements/${requirementId}`);
                }}
                onCancel={() => {
                  router.push(`/projects/${projectId}/requirements/${requirementId}`);
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

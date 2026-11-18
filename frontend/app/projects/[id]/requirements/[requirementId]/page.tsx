'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ProjectItem,
  RequirementItem,
  projectsApi,
  requirementsApi,
} from '@/lib/api/client';
import { RequirementDetailsView } from '@/components/requirements/RequirementDetailsView';
import { mapRequirementApiError } from '@/lib/project-validation';
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Layers,
  ChevronRight,
  FileQuestion,
} from 'lucide-react';

export default function RequirementDetailsPage() {
  const params = useParams();
  const projectId = typeof params?.id === 'string' ? params.id : '';
  const requirementId = typeof params?.requirementId === 'string' ? params.requirementId : '';

  const [project, setProject] = useState<ProjectItem | null>(null);
  const [requirement, setRequirement] = useState<RequirementItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);

  // Fetch parent project info for breadcrumbs
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

  // Fetch requirement details
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${projectId}/requirements`}
              className="flex items-center gap-2 text-sm text-nova-text-dim hover:text-nova-cyan transition font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Requirements</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-nova-cyan">
            <Layers className="w-4 h-4" />
            <span>ReqTrace AI</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
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
          <span className="text-nova-cyan font-medium font-mono">
            {requirement ? requirement.requirementKey : 'Details'}
          </span>
        </nav>

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading requirement details">
            {/* Header Skeleton */}
            <div className="p-8 bg-nova-surface border border-nova-border rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-6 w-24 bg-nova-surface2 rounded-md" />
                <div className="flex gap-2">
                  <div className="h-6 w-20 bg-nova-surface2 rounded-full" />
                  <div className="h-6 w-20 bg-nova-surface2 rounded-full" />
                  <div className="h-6 w-20 bg-nova-surface2 rounded-full" />
                </div>
              </div>
              <div className="h-9 w-3/4 bg-nova-surface2 rounded-lg" />
              <div className="h-4 w-48 bg-nova-surface2 rounded" />
            </div>

            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 bg-nova-surface border border-nova-border rounded-2xl space-y-4">
                  <div className="h-5 w-40 bg-nova-surface2 rounded" />
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-nova-surface2 rounded" />
                    <div className="h-4 w-5/6 bg-nova-surface2 rounded" />
                    <div className="h-4 w-4/6 bg-nova-surface2 rounded" />
                  </div>
                </div>
                <div className="p-6 bg-nova-surface border border-nova-border rounded-2xl space-y-3">
                  <div className="h-5 w-40 bg-nova-surface2 rounded" />
                  <div className="h-12 w-full bg-nova-surface2 rounded-xl" />
                </div>
              </div>
              <div className="p-6 bg-nova-surface border border-nova-border rounded-2xl space-y-4">
                <div className="h-5 w-32 bg-nova-surface2 rounded" />
                <div className="space-y-3 pt-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 w-20 bg-nova-surface2 rounded" />
                      <div className="h-4 w-24 bg-nova-surface2 rounded" />
                    </div>
                  ))}
                </div>
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
                The requested requirement specification could not be found in this project. It may have been deleted or the requirement ID is incorrect.
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
                href={`/projects/${projectId}/requirements`}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-nova-border bg-nova-surface2 hover:bg-nova-surface2/80 text-nova-text transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Requirements
              </Link>
            </div>
          </div>
        )}

        {/* Requirement Details Content */}
        {!loading && !error && requirement && (
          <RequirementDetailsView
            requirement={requirement}
            projectId={projectId}
            projectName={project?.name}
          />
        )}
      </main>
    </div>
  );
}

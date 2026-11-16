'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ProjectItem, projectsApi } from '@/lib/api/client';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { EditProjectModal } from '@/components/projects/EditProjectModal';
import { ArchiveConfirmModal } from '@/components/projects/ArchiveConfirmModal';
import {
  FolderPlus,
  Search,
  RefreshCw,
  FolderOpen,
  AlertTriangle,
  Lock,
  LogIn,
  Layers,
  ChevronRight,
} from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [archivingProject, setArchivingProject] = useState<ProjectItem | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const queryStatus = filterStatus === 'ALL' ? undefined : filterStatus;
      const res = await projectsApi.list(queryStatus);

      if (res.success && Array.isArray(res.data)) {
        setProjects(res.data);
      } else {
        setError(res.message || 'Failed to fetch projects.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to communicate with project service.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreated = (newProject: ProjectItem) => {
    setProjects((prev) => [newProject, ...prev]);
  };

  const handleUpdated = (updatedProject: ProjectItem) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    );
  };

  const handleArchived = (archivedProject: ProjectItem) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === archivedProject.id ? archivedProject : p))
    );
  };

  // Filtered by search query locally
  const displayedProjects = useMemo(() => {
    return projects.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q) ?? false;
      const matchId = p.id.toLowerCase().includes(q);
      return matchName || matchDesc || matchId;
    });
  }, [projects, searchQuery]);

  const isAuthError = error && (error.toLowerCase().includes('401') || error.toLowerCase().includes('unauthorized') || error.toLowerCase().includes('authentication'));

  return (
    <div className="min-h-screen bg-nova-bg text-nova-text">
      {/* Top Header / Breadcrumbs */}
      <header className="border-b border-nova-border bg-nova-surface/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-nova-cyan hover:underline text-sm font-semibold">
              <Layers className="w-5 h-5 text-nova-cyan" />
              <span>PROJECT NOVA</span>
            </Link>
            <ChevronRight className="w-4 h-4 text-nova-text-muted" />
            <span className="text-sm font-medium text-nova-text">ReqTrace AI Projects</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-nova-cyan text-nova-bg font-semibold rounded-lg hover:bg-nova-cyan-dim transition text-xs sm:text-sm shadow-md shadow-nova-cyan/20"
            >
              <FolderPlus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Title & Description Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-nova-border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-nova-text">
              Project Management
            </h1>
            <p className="text-sm text-nova-text-dim mt-1">
              Organize, track, and manage requirement evolution projects with strict owner access control.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => fetchProjects()}
              disabled={loading}
              className="p-2 rounded-lg border border-nova-border bg-nova-surface hover:bg-nova-surface2 text-nova-text-dim hover:text-nova-text transition disabled:opacity-50"
              title="Refresh project list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-nova-cyan' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-nova-surface border border-nova-border rounded-lg self-start">
            {(['ALL', 'ACTIVE', 'ARCHIVED'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition ${
                  filterStatus === status
                    ? 'bg-nova-cyan text-nova-bg shadow-sm'
                    : 'text-nova-text-dim hover:text-nova-text hover:bg-nova-surface2'
                }`}
              >
                {status === 'ALL' ? 'All Projects' : status}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-nova-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or ID..."
              className="w-full pl-9 pr-3.5 py-1.5 bg-nova-surface border border-nova-border rounded-lg text-xs sm:text-sm text-nova-text placeholder:text-nova-text-muted focus:outline-none focus:border-nova-cyan transition"
            />
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/70 text-sm text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isAuthError ? (
                <Lock className="w-5 h-5 text-red-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <div>
                <p className="font-semibold text-red-300">
                  {isAuthError ? 'Authentication Required' : 'Unable to Load Projects'}
                </p>
                <p className="text-xs text-red-300/80 mt-0.5">{error}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAuthError ? (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </Link>
              ) : (
                <button
                  onClick={() => fetchProjects()}
                  className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800/50 border border-red-700/60 rounded-lg text-xs font-medium text-red-200 transition"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

        {/* Loading State Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="p-5 bg-nova-surface border border-nova-border rounded-xl space-y-4 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 w-40 bg-nova-surface2 rounded" />
                  <div className="h-5 w-16 bg-nova-surface2 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="h-3.5 w-full bg-nova-surface2 rounded" />
                  <div className="h-3.5 w-3/4 bg-nova-surface2 rounded" />
                </div>
                <div className="h-px bg-nova-border pt-4" />
                <div className="flex justify-between items-center">
                  <div className="h-3 w-28 bg-nova-surface2 rounded" />
                  <div className="h-3 w-16 bg-nova-surface2 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && displayedProjects.length === 0 && (
          <div className="p-12 text-center rounded-2xl border border-dashed border-nova-border bg-nova-surface/40 max-w-xl mx-auto my-12">
            <div className="w-14 h-14 rounded-2xl bg-nova-cyan/10 border border-nova-cyan/20 text-nova-cyan mx-auto flex items-center justify-center mb-4">
              <FolderOpen className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-semibold text-nova-text">
              {searchQuery ? 'No matching projects found' : 'No projects yet'}
            </h3>
            <p className="text-sm text-nova-text-dim mt-2 max-w-sm mx-auto">
              {searchQuery
                ? `No projects matching "${searchQuery}". Try adjusting your keywords or clearing filters.`
                : 'Create your first ReqTrace AI project to start managing requirements, evolution workflows, and traceability.'}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 border border-nova-border rounded-lg text-sm text-nova-text hover:bg-nova-surface2 transition"
                >
                  Clear Search
                </button>
              ) : (
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-nova-cyan text-nova-bg font-semibold rounded-lg hover:bg-nova-cyan-dim transition text-sm"
                >
                  <FolderPlus className="w-4 h-4" />
                  Create Your First Project
                </button>
              )}
            </div>
          </div>
        )}

        {/* Project Grid */}
        {!loading && !error && displayedProjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={(p) => setEditingProject(p)}
                onArchive={(p) => setArchivingProject(p)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateProjectModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleCreated}
      />

      <EditProjectModal
        project={editingProject}
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        onUpdated={handleUpdated}
      />

      <ArchiveConfirmModal
        project={archivingProject}
        isOpen={!!archivingProject}
        onClose={() => setArchivingProject(null)}
        onArchived={handleArchived}
      />
    </div>
  );
}

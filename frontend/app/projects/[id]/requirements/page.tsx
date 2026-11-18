'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ProjectItem,
  RequirementItem,
  RequirementPriority,
  RequirementStatus,
  RequirementType,
  projectsApi,
  requirementsApi,
} from '@/lib/api/client';
import { RequirementsTable } from '@/components/requirements/RequirementsTable';
import {
  ArrowLeft,
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  FileCode,
} from 'lucide-react';

export default function RequirementsListPage() {
  const params = useParams();
  const projectId = typeof params?.id === 'string' ? params.id : '';

  const [project, setProject] = useState<ProjectItem | null>(null);
  const [requirements, setRequirements] = useState<RequirementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Load project details for header context
  const fetchProjectInfo = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await projectsApi.getById(projectId);
      if (res.success && res.data) {
        setProject(res.data);
      }
    } catch {
      // Non-fatal, page can continue with projectId
    }
  }, [projectId]);

  // Load requirements list
  const fetchRequirements = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);

      const res = await requirementsApi.list(projectId, {
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        priority: selectedPriority !== 'ALL' ? selectedPriority : undefined,
        type: selectedType !== 'ALL' ? selectedType : undefined,
        search: searchQuery.trim() || undefined,
      });

      if (res.success && Array.isArray(res.data)) {
        setRequirements(res.data);
      } else {
        setError(res.message || 'Failed to retrieve requirements.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to requirement service.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedStatus, selectedPriority, selectedType, searchQuery]);

  useEffect(() => {
    fetchProjectInfo();
  }, [fetchProjectInfo]);

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  // Client-side filtering fallback for live search typing
  const filteredRequirements = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return requirements.filter((req) => {
      // Status filter
      if (selectedStatus !== 'ALL' && req.status !== selectedStatus) return false;
      // Priority filter
      if (selectedPriority !== 'ALL' && req.priority !== selectedPriority) return false;
      // Type filter
      if (selectedType !== 'ALL' && req.type !== selectedType) return false;
      // Search query
      if (!q) return true;
      const matchKey = req.requirementKey?.toLowerCase().includes(q) ?? false;
      const matchTitle = req.title?.toLowerCase().includes(q) ?? false;
      const matchDesc = req.description?.toLowerCase().includes(q) ?? false;
      return matchKey || matchTitle || matchDesc;
    });
  }, [requirements, searchQuery, selectedStatus, selectedPriority, selectedType]);

  // Pagination slice
  const totalPages = Math.ceil(filteredRequirements.length / pageSize) || 1;
  const paginatedRequirements = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequirements.slice(start, start + pageSize);
  }, [filteredRequirements, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedPriority, selectedType]);

  // Count summaries
  const stats = useMemo(() => {
    const total = requirements.length;
    const approved = requirements.filter((r) => r.status === 'APPROVED').length;
    const inReview = requirements.filter((r) => r.status === 'IN_REVIEW').length;
    const draft = requirements.filter((r) => r.status === 'DRAFT').length;
    return { total, approved, inReview, draft };
  }, [requirements]);

  return (
    <div className="min-h-screen bg-nova-bg text-nova-text">
      {/* Top Header / Breadcrumb Bar */}
      <header className="border-b border-nova-border bg-nova-surface/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-nova-text-dim">
            <Link href="/projects" className="hover:text-nova-cyan transition">
              Projects
            </Link>
            <span>/</span>
            <Link
              href={`/projects/${projectId}`}
              className="text-nova-text-dim hover:text-nova-cyan transition truncate max-w-[160px] sm:max-w-xs"
            >
              {project?.name || projectId}
            </Link>
            <span>/</span>
            <span className="text-nova-text font-semibold">Requirements</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}/requirements/new`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-nova-cyan text-nova-bg font-semibold rounded-lg hover:bg-nova-cyan-dim transition text-xs sm:text-sm shadow-md shadow-nova-cyan/20"
            >
              <Plus className="w-4 h-4" />
              New Requirement
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Title & Stats Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-nova-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-nova-cyan uppercase tracking-wider mb-1">
              <FileCode className="w-4 h-4" />
              <span>Project Requirements Matrix</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-nova-text">
              {project ? `${project.name} — Requirements` : 'Project Requirements'}
            </h1>
            <p className="text-xs sm:text-sm text-nova-text-dim mt-1">
              Trace, manage, and evolve software specifications with controlled status transitions.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => fetchRequirements()}
              disabled={loading}
              className="p-2 rounded-lg border border-nova-border bg-nova-surface hover:bg-nova-surface2 text-nova-text-dim hover:text-nova-text transition disabled:opacity-50"
              title="Refresh requirement list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-nova-cyan' : ''}`} />
            </button>
            <Link
              href={`/projects/${projectId}`}
              className="px-3 py-1.5 rounded-lg border border-nova-border bg-nova-surface hover:bg-nova-surface2 text-nova-text text-xs flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-nova-cyan" />
              Project Dashboard
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-nova-surface border border-nova-border rounded-xl">
            <span className="text-[11px] font-medium text-nova-text-dim uppercase tracking-wider">Total</span>
            <p className="text-xl font-bold font-display text-nova-text mt-1">{stats.total}</p>
          </div>
          <div className="p-3.5 bg-nova-surface border border-nova-border rounded-xl">
            <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Approved</span>
            <p className="text-xl font-bold font-display text-emerald-400 mt-1">{stats.approved}</p>
          </div>
          <div className="p-3.5 bg-nova-surface border border-nova-border rounded-xl">
            <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider">In Review</span>
            <p className="text-xl font-bold font-display text-amber-400 mt-1">{stats.inReview}</p>
          </div>
          <div className="p-3.5 bg-nova-surface border border-nova-border rounded-xl">
            <span className="text-[11px] font-medium text-slate-300 uppercase tracking-wider">Draft</span>
            <p className="text-xl font-bold font-display text-slate-300 mt-1">{stats.draft}</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 bg-nova-surface border border-nova-border rounded-xl shadow-md space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-nova-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search key, title, desc..."
                className="w-full pl-9 pr-3.5 py-2 bg-nova-bg border border-nova-border rounded-lg text-xs sm:text-sm text-nova-text placeholder:text-nova-text-muted focus:outline-none focus:border-nova-cyan transition"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-nova-bg border border-nova-border rounded-lg text-xs sm:text-sm text-nova-text focus:outline-none focus:border-nova-cyan transition"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">DRAFT</option>
                <option value="IN_REVIEW">IN_REVIEW</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="DEPRECATED">DEPRECATED</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full px-3 py-2 bg-nova-bg border border-nova-border rounded-lg text-xs sm:text-sm text-nova-text focus:outline-none focus:border-nova-cyan transition"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 bg-nova-bg border border-nova-border rounded-lg text-xs sm:text-sm text-nova-text focus:outline-none focus:border-nova-cyan transition"
              >
                <option value="ALL">All Types</option>
                <option value="FUNCTIONAL">Functional (FR)</option>
                <option value="NON_FUNCTIONAL">Non-Functional (NFR)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/70 text-sm text-red-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="font-semibold text-red-300">Unable to load requirements</p>
                <p className="text-xs text-red-300/80 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={() => fetchRequirements()}
              className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800/50 border border-red-700/60 rounded-lg text-xs font-medium text-red-200 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredRequirements.length === 0 && (
          <div className="p-12 text-center rounded-2xl border border-dashed border-nova-border bg-nova-surface/40 max-w-lg mx-auto my-6">
            <div className="w-14 h-14 rounded-2xl bg-nova-cyan/10 border border-nova-cyan/20 text-nova-cyan mx-auto flex items-center justify-center mb-4">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-semibold text-nova-text">
              {searchQuery || selectedStatus !== 'ALL' || selectedPriority !== 'ALL' || selectedType !== 'ALL'
                ? 'No matching requirements'
                : 'No requirements defined yet'}
            </h3>
            <p className="text-sm text-nova-text-dim mt-2 max-w-sm mx-auto">
              {searchQuery || selectedStatus !== 'ALL' || selectedPriority !== 'ALL' || selectedType !== 'ALL'
                ? 'Try adjusting your search criteria or clearing filters to see existing requirements.'
                : 'Start specifying software requirements for this project to track scope, impact, and traceability.'}
            </p>
            <div className="mt-6">
              {searchQuery || selectedStatus !== 'ALL' || selectedPriority !== 'ALL' || selectedType !== 'ALL' ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStatus('ALL');
                    setSelectedPriority('ALL');
                    setSelectedType('ALL');
                  }}
                  className="px-4 py-2 border border-nova-border rounded-lg text-sm text-nova-text hover:bg-nova-surface2 transition"
                >
                  Clear All Filters
                </button>
              ) : (
                <Link
                  href={`/projects/${projectId}/requirements/new`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-nova-cyan text-nova-bg font-semibold rounded-lg hover:bg-nova-cyan-dim transition text-sm shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Create First Requirement
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Requirements Table */}
        {!error && (loading || filteredRequirements.length > 0) && (
          <RequirementsTable
            requirements={paginatedRequirements}
            projectId={projectId}
            loading={loading}
          />
        )}

        {/* Pagination Bar */}
        {!loading && !error && filteredRequirements.length > pageSize && (
          <div className="flex items-center justify-between pt-2 border-t border-nova-border text-xs text-nova-text-dim">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredRequirements.length)} of{' '}
              {filteredRequirements.length} requirements
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-nova-border bg-nova-surface hover:bg-nova-surface2 disabled:opacity-40 transition text-nova-text"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-medium text-nova-text">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-nova-border bg-nova-surface hover:bg-nova-surface2 disabled:opacity-40 transition text-nova-text"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

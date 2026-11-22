'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  RequirementVersionItem,
  RequirementVersionComparisonResponse,
  FieldComparisonItem,
  requirementVersionsApi,
} from '@/lib/api/requirementVersions';
import { formatRequirementDate, mapRequirementApiError } from '@/lib/project-validation';
import { VersionReviewStatusBadge, VersionChangeTypeBadge } from './RequirementVersionTimeline';
import {
  ArrowLeftRight,
  ArrowRight,
  GitCompare,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  FileCode,
  FileText,
  Calendar,
  User,
  Plus,
  Minus,
  Sparkles,
  Layers,
  ChevronDown,
  X,
  SlidersHorizontal,
} from 'lucide-react';

export interface RequirementVersionComparisonProps {
  projectId: string;
  requirementId: string;
  versions: RequirementVersionItem[];
  initialFromVersion?: number;
  initialToVersion?: number;
  requirementTitle?: string;
  onClose?: () => void;
}

export function RequirementVersionComparison({
  projectId,
  requirementId,
  versions,
  initialFromVersion,
  initialToVersion,
  requirementTitle,
  onClose,
}: RequirementVersionComparisonProps) {
  // Sort versions ascending by versionNumber for logical from/to pairing
  const sortedAsc = [...versions].sort((a, b) => a.versionNumber - b.versionNumber);

  // Compute default from/to selection
  const defaultFrom =
    initialFromVersion ??
    (sortedAsc.length >= 2 ? sortedAsc[sortedAsc.length - 2].versionNumber : sortedAsc[0]?.versionNumber ?? 1);
  const defaultTo =
    initialToVersion ??
    (sortedAsc.length >= 2 ? sortedAsc[sortedAsc.length - 1].versionNumber : sortedAsc[0]?.versionNumber ?? 1);

  const [fromVersion, setFromVersion] = useState<number>(defaultFrom);
  const [toVersion, setToVersion] = useState<number>(defaultTo);
  const [comparison, setComparison] = useState<RequirementVersionComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rapid selection guard: Discard stale API responses
  const requestIdRef = useRef(0);

  // Selected version objects
  const vFromObj = versions.find((v) => v.versionNumber === fromVersion);
  const vToObj = versions.find((v) => v.versionNumber === toVersion);

  const fetchComparison = useCallback(
    async (from: number, to: number) => {
      if (!projectId || !requirementId || from <= 0 || to <= 0) return;

      if (from === to) {
        setComparison({
          requirementId,
          fromVersion: from,
          toVersion: to,
          hasChanges: false,
          changedFields: [],
          unchangedFields: ['title', 'description', 'changeType', 'reviewStatus'],
        });
        setError(null);
        setLoading(false);
        return;
      }

      const currentReqId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const res = await requirementVersionsApi.compareVersions(projectId, requirementId, from, to);

        // Discard stale out-of-order responses
        if (currentReqId !== requestIdRef.current) return;

        if (res.success && res.data) {
          setComparison(res.data);
        } else {
          setError(res.message || 'Failed to compare requirement versions.');
        }
      } catch (err: unknown) {
        if (currentReqId !== requestIdRef.current) return;
        const rawMsg = err instanceof Error ? err.message : 'Error comparing versions';
        if (rawMsg.includes('401') || rawMsg.toLowerCase().includes('unauthorized')) {
          setError(mapRequirementApiError(401).userMessage);
        } else if (rawMsg.includes('403') || rawMsg.toLowerCase().includes('denied') || rawMsg.toLowerCase().includes('forbidden')) {
          setError(mapRequirementApiError(403).userMessage);
        } else if (rawMsg.includes('404') || rawMsg.toLowerCase().includes('not found')) {
          setError(mapRequirementApiError(404).userMessage);
        } else {
          setError(rawMsg);
        }
      } finally {
        if (currentReqId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [projectId, requirementId]
  );

  useEffect(() => {
    if (fromVersion && toVersion) {
      fetchComparison(fromVersion, toVersion);
    }
  }, [fetchComparison, fromVersion, toVersion]);

  const handleSwapVersions = () => {
    const prevFrom = fromVersion;
    const prevTo = toVersion;
    setFromVersion(prevTo);
    setToVersion(prevFrom);
  };

  // Zero versions state
  if (versions.length === 0) {
    return (
      <div className="p-8 bg-nova-surface border border-nova-border rounded-2xl shadow-xl text-center space-y-4">
        <GitCompare className="w-10 h-10 text-nova-text-muted mx-auto opacity-60" />
        <h3 className="text-base font-semibold text-nova-text">No Historical Versions Available</h3>
        <p className="text-xs text-nova-text-muted max-w-md mx-auto">
          At least two version snapshots are required to perform a comparison. No versions exist for this requirement.
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-nova-surface2 border border-nova-border hover:bg-nova-surface2/80 text-nova-text transition"
          >
            Back to Version History
          </button>
        )}
      </div>
    );
  }

  // Single version state
  if (versions.length === 1) {
    return (
      <div className="p-8 bg-nova-surface border border-nova-border rounded-2xl shadow-xl text-center space-y-4">
        <GitCompare className="w-10 h-10 text-nova-cyan mx-auto opacity-70" />
        <h3 className="text-base font-semibold text-nova-text">Only One Version Snapshot Recorded</h3>
        <p className="text-xs text-nova-text-muted max-w-md mx-auto">
          Version <span className="font-mono font-bold text-nova-cyan">v{versions[0].versionNumber}</span> is currently the sole recorded snapshot. Version comparison requires at least two snapshots. Propose a new draft version to start tracking changes.
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-nova-cyan text-nova-bg hover:bg-nova-cyan-dim transition shadow-sm font-semibold"
          >
            Back to Version History
          </button>
        )}
      </div>
    );
  }

  // Field diff lookup helpers
  const changedFieldsMap = new Map<string, FieldComparisonItem>();
  if (comparison?.changedFields) {
    for (const cf of comparison.changedFields) {
      changedFieldsMap.set(cf.field, cf);
    }
  }

  const titleDiff = changedFieldsMap.get('title');
  const descriptionDiff = changedFieldsMap.get('description');
  const changeTypeDiff = changedFieldsMap.get('changeType');
  const reviewStatusDiff = changedFieldsMap.get('reviewStatus');

  return (
    <section
      aria-label="Requirement Version Comparison"
      className="p-6 bg-nova-surface border border-nova-border rounded-2xl shadow-2xl space-y-6"
    >
      {/* ─── Header: Navigation & Title ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-nova-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-nova-cyan/15 text-nova-cyan border border-nova-cyan/30">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-nova-text tracking-tight flex items-center gap-2">
              <span>Side-by-Side Version Comparison</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-nova-surface2 text-nova-cyan border border-nova-border">
                v{fromVersion} ➔ v{toVersion}
              </span>
            </h2>
            <p className="text-xs text-nova-text-muted">
              Requirement: <span className="text-nova-text-dim font-medium">{requirementTitle || vToObj?.title || vFromObj?.title}</span>
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-nova-surface2 hover:bg-nova-surface2/80 border border-nova-border text-nova-text transition"
            aria-label="Close comparison view and return to timeline"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close Comparison</span>
          </button>
        )}
      </div>

      {/* ─── Version Selection Bar ─── */}
      <div className="p-4 rounded-xl bg-nova-surface2/50 border border-nova-border/80 flex flex-wrap items-center justify-between gap-4">
        {/* From Version Selector */}
        <div className="flex-1 min-w-[200px] space-y-1">
          <label htmlFor="compare-from-select" className="block text-[11px] font-semibold text-nova-text-dim uppercase tracking-wider">
            From Version (Baseline)
          </label>
          <div className="relative">
            <select
              id="compare-from-select"
              value={fromVersion}
              onChange={(e) => setFromVersion(Number(e.target.value))}
              disabled={loading}
              className="w-full pl-3 pr-8 py-1.5 text-xs font-mono font-medium rounded-lg bg-nova-surface border border-nova-border text-nova-text focus:outline-none focus:border-nova-cyan transition appearance-none cursor-pointer disabled:opacity-50"
            >
              {sortedAsc.map((ver) => (
                <option key={`from-${ver.versionNumber}`} value={ver.versionNumber}>
                  v{ver.versionNumber} — {ver.reviewStatus} ({ver.changeType})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-nova-text-muted absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Swap Button */}
        <div className="pt-4">
          <button
            type="button"
            onClick={handleSwapVersions}
            disabled={loading}
            title="Swap comparison direction"
            className="p-2 rounded-lg bg-nova-surface hover:bg-nova-surface2 text-nova-text-dim hover:text-nova-cyan border border-nova-border transition shadow-sm disabled:opacity-50"
            aria-label="Swap comparison directions"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* To Version Selector */}
        <div className="flex-1 min-w-[200px] space-y-1">
          <label htmlFor="compare-to-select" className="block text-[11px] font-semibold text-nova-text-dim uppercase tracking-wider">
            To Version (Target / Proposed)
          </label>
          <div className="relative">
            <select
              id="compare-to-select"
              value={toVersion}
              onChange={(e) => setToVersion(Number(e.target.value))}
              disabled={loading}
              className="w-full pl-3 pr-8 py-1.5 text-xs font-mono font-medium rounded-lg bg-nova-surface border border-nova-border text-nova-text focus:outline-none focus:border-nova-cyan transition appearance-none cursor-pointer disabled:opacity-50"
            >
              {sortedAsc.map((ver) => (
                <option key={`to-${ver.versionNumber}`} value={ver.versionNumber}>
                  v{ver.versionNumber} — {ver.reviewStatus} ({ver.changeType})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-nova-text-muted absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Same Version Notice */}
      {fromVersion === toVersion && (
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/60 text-xs text-amber-200 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            You have selected the identical version on both sides (v{fromVersion}). Select two distinct versions above to inspect differences.
          </span>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="p-8 text-center rounded-xl bg-nova-surface2/30 border border-nova-border space-y-2 animate-pulse">
          <RotateCcw className="w-5 h-5 text-nova-cyan mx-auto animate-spin" />
          <p className="text-xs text-nova-text-dim">Computing diff between v{fromVersion} and v{toVersion}...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/70 text-xs text-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <p className="font-semibold text-red-300">Comparison Failed</p>
            <p className="text-red-300/80">{error}</p>
            <button
              type="button"
              onClick={() => fetchComparison(fromVersion, toVersion)}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-red-900/60 hover:bg-red-800/70 text-red-100 border border-red-700/60 transition mt-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Comparison</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Comparison Results Content ─── */}
      {!loading && !error && comparison && (
        <div className="space-y-6">
          {/* Summary Status Strip */}
          <div className="p-3.5 rounded-xl bg-nova-surface2/40 border border-nova-border flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              {comparison.hasChanges ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Sparkles className="w-3 h-3" />
                  {comparison.changedFields.length} Modified {comparison.changedFields.length === 1 ? 'Field' : 'Fields'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  Identical Content (No Changes Detected)
                </span>
              )}

              <span className="text-nova-text-muted">
                Comparing <strong className="text-nova-text font-mono">v{fromVersion}</strong> with <strong className="text-nova-text font-mono">v{toVersion}</strong>
              </span>
            </div>

            {/* Unchanged Fields List */}
            {comparison.unchangedFields.length > 0 && (
              <div className="text-[11px] text-nova-text-muted flex items-center gap-1.5">
                <span>Unchanged:</span>
                <span className="font-mono text-nova-text-dim">
                  {comparison.unchangedFields.join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* ─── Side-by-Side Dual Column Grid ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── LEFT COLUMN: FROM VERSION (BASELINE) ── */}
            <div className="p-5 rounded-2xl bg-nova-surface2/30 border border-nova-border space-y-4">
              {/* Column Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-nova-border/60">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-nova-surface border border-nova-border text-nova-text">
                    v{fromVersion}
                  </span>
                  <span className="text-xs font-semibold text-nova-text-dim uppercase tracking-wider">
                    Baseline Snapshot
                  </span>
                </div>

                {vFromObj && (
                  <div className="flex items-center gap-1.5">
                    <VersionReviewStatusBadge status={vFromObj.reviewStatus} />
                    <VersionChangeTypeBadge changeType={vFromObj.changeType} />
                  </div>
                )}
              </div>

              {/* Version Metadata */}
              {vFromObj && (
                <div className="text-[11px] text-nova-text-muted flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-nova-text-dim" />
                    <span>{formatRequirementDate(vFromObj.createdAt)}</span>
                  </span>
                  {vFromObj.createdBy && (
                    <span className="flex items-center gap-1 font-mono">
                      <User className="w-3 h-3 text-nova-text-dim" />
                      <span>{vFromObj.createdBy}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Title Section */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-nova-text-muted uppercase tracking-wider block">
                  Title
                </span>
                <div
                  className={`p-3 rounded-xl border text-sm font-semibold text-nova-text leading-snug break-words ${
                    titleDiff
                      ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                      : 'bg-nova-surface border-nova-border/60'
                  }`}
                >
                  {titleDiff ? (
                    <div className="space-y-1">
                      <p>{vFromObj?.title || titleDiff.oldValue}</p>
                      {titleDiff.removedText.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {titleDiff.removedText.map((t, idx) => (
                            <span
                              key={`title-rem-${idx}`}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/60 line-through"
                            >
                              - {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    vFromObj?.title || '—'
                  )}
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-nova-text-muted uppercase tracking-wider block">
                    Specification Description
                  </span>
                  {descriptionDiff && (
                    <span className="text-[10px] font-mono text-rose-400">
                      -{descriptionDiff.removedText.length} tokens
                    </span>
                  )}
                </div>
                <div
                  className={`p-3.5 rounded-xl border text-xs text-nova-text leading-relaxed whitespace-pre-wrap font-sans break-words max-h-96 overflow-y-auto ${
                    descriptionDiff
                      ? 'bg-rose-950/15 border-rose-800/40'
                      : 'bg-nova-surface border-nova-border/60'
                  }`}
                >
                  {vFromObj?.description || descriptionDiff?.oldValue || '—'}
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN: TO VERSION (TARGET / PROPOSED) ── */}
            <div className="p-5 rounded-2xl bg-nova-surface2/30 border border-nova-border space-y-4">
              {/* Column Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-nova-border/60">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-nova-cyan/20 text-nova-cyan border border-nova-cyan/40">
                    v{toVersion}
                  </span>
                  <span className="text-xs font-semibold text-nova-cyan uppercase tracking-wider">
                    Target / Proposed
                  </span>
                </div>

                {vToObj && (
                  <div className="flex items-center gap-1.5">
                    <VersionReviewStatusBadge status={vToObj.reviewStatus} />
                    <VersionChangeTypeBadge changeType={vToObj.changeType} />
                  </div>
                )}
              </div>

              {/* Version Metadata */}
              {vToObj && (
                <div className="text-[11px] text-nova-text-muted flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-nova-text-dim" />
                    <span>{formatRequirementDate(vToObj.createdAt)}</span>
                  </span>
                  {vToObj.createdBy && (
                    <span className="flex items-center gap-1 font-mono">
                      <User className="w-3 h-3 text-nova-text-dim" />
                      <span>{vToObj.createdBy}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Title Section */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-nova-text-muted uppercase tracking-wider block">
                  Title
                </span>
                <div
                  className={`p-3 rounded-xl border text-sm font-semibold text-nova-text leading-snug break-words ${
                    titleDiff
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                      : 'bg-nova-surface border-nova-border/60'
                  }`}
                >
                  {titleDiff ? (
                    <div className="space-y-1">
                      <p>{vToObj?.title || titleDiff.newValue}</p>
                      {titleDiff.addedText.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {titleDiff.addedText.map((t, idx) => (
                            <span
                              key={`title-add-${idx}`}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                            >
                              + {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    vToObj?.title || '—'
                  )}
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-nova-text-muted uppercase tracking-wider block">
                    Specification Description
                  </span>
                  {descriptionDiff && (
                    <span className="text-[10px] font-mono text-emerald-400">
                      +{descriptionDiff.addedText.length} tokens
                    </span>
                  )}
                </div>
                <div
                  className={`p-3.5 rounded-xl border text-xs text-nova-text leading-relaxed whitespace-pre-wrap font-sans break-words max-h-96 overflow-y-auto ${
                    descriptionDiff
                      ? 'bg-emerald-950/15 border-emerald-800/40'
                      : 'bg-nova-surface border-nova-border/60'
                  }`}
                >
                  {vToObj?.description || descriptionDiff?.newValue || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* ─── Structured Diff Details Breakdown ─── */}
          {comparison.hasChanges && (
            <div className="p-5 rounded-2xl bg-nova-surface2/40 border border-nova-border space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-nova-border/60">
                <SlidersHorizontal className="w-4 h-4 text-nova-cyan" />
                <h3 className="text-xs font-semibold text-nova-text uppercase tracking-wider">
                  Detailed Diff Breakdown by Field
                </h3>
              </div>

              <div className="space-y-3">
                {comparison.changedFields.map((cf) => (
                  <div
                    key={`diff-${cf.field}`}
                    className="p-3.5 rounded-xl bg-nova-surface border border-nova-border/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-nova-cyan uppercase tracking-wider">
                        {cf.field}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        {cf.removedText.length > 0 && (
                          <span className="text-rose-400">-{cf.removedText.length} removed</span>
                        )}
                        {cf.addedText.length > 0 && (
                          <span className="text-emerald-400">+{cf.addedText.length} added</span>
                        )}
                      </div>
                    </div>

                    {/* Added / Removed Token Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {cf.removedText.map((item, idx) => (
                        <span
                          key={`rem-${cf.field}-${idx}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-rose-950/40 text-rose-300 border border-rose-800/60 line-through"
                          title="Removed token"
                        >
                          <Minus className="w-3 h-3" />
                          <span>{item}</span>
                        </span>
                      ))}

                      {cf.addedText.map((item, idx) => (
                        <span
                          key={`add-${cf.field}-${idx}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-800/60"
                          title="Added token"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{item}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

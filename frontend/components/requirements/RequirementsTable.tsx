'use client';

import Link from 'next/link';
import { RequirementItem } from '@/lib/api/client';
import {
  RequirementPriorityBadge,
  RequirementStatusBadge,
  RequirementTypeBadge,
} from './RequirementBadges';
import { ArrowRight, Calendar, ChevronRight } from 'lucide-react';

interface RequirementsTableProps {
  requirements: RequirementItem[];
  projectId: string;
  loading?: boolean;
}

export function RequirementsTable({ requirements, projectId, loading = false }: RequirementsTableProps) {
  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return isNaN(d.getTime()) ? isoString : d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <div className="bg-nova-surface border border-nova-border rounded-xl overflow-hidden shadow-lg p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-nova-surface2 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block bg-nova-surface border border-nova-border rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-nova-text">
            <thead className="bg-nova-surface2/60 text-nova-text-dim uppercase text-[11px] font-semibold tracking-wider border-b border-nova-border">
              <tr>
                <th className="py-3.5 px-4 w-32">Key</th>
                <th className="py-3.5 px-4">Title & Description</th>
                <th className="py-3.5 px-4 w-24">Type</th>
                <th className="py-3.5 px-4 w-28">Priority</th>
                <th className="py-3.5 px-4 w-32">Status</th>
                <th className="py-3.5 px-4 w-32">Updated</th>
                <th className="py-3.5 px-4 w-24 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nova-border/60">
              {requirements.map((req) => (
                <tr
                  key={req.id}
                  className="hover:bg-nova-surface2/40 transition-colors group cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-nova-cyan">
                    <span className="p-1 rounded bg-nova-cyan/10 border border-nova-cyan/20">
                      {req.requirementKey}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 max-w-md">
                    <Link
                      href={`/projects/${projectId}/requirements/${req.id}`}
                      className="font-semibold text-nova-text group-hover:text-nova-cyan transition line-clamp-1 block text-sm"
                    >
                      {req.title}
                    </Link>
                    <p className="text-xs text-nova-text-dim line-clamp-1 mt-0.5">
                      {req.description}
                    </p>
                  </td>
                  <td className="py-3.5 px-4">
                    <RequirementTypeBadge type={req.type} />
                  </td>
                  <td className="py-3.5 px-4">
                    <RequirementPriorityBadge priority={req.priority} />
                  </td>
                  <td className="py-3.5 px-4">
                    <RequirementStatusBadge status={req.status} />
                  </td>
                  <td className="py-3.5 px-4 text-nova-text-muted whitespace-nowrap">
                    {formatDate(req.updatedAt)}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <Link
                      href={`/projects/${projectId}/requirements/${req.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-nova-cyan hover:underline group-hover:translate-x-0.5 transition-transform"
                    >
                      Details
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {requirements.map((req) => (
          <div
            key={req.id}
            className="p-4 bg-nova-surface border border-nova-border rounded-xl shadow-md space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-xs font-bold text-nova-cyan px-2 py-0.5 rounded bg-nova-cyan/10 border border-nova-cyan/20">
                {req.requirementKey}
              </span>
              <RequirementStatusBadge status={req.status} />
            </div>

            <div>
              <Link
                href={`/projects/${projectId}/requirements/${req.id}`}
                className="font-semibold text-sm text-nova-text hover:text-nova-cyan transition line-clamp-2"
              >
                {req.title}
              </Link>
              <p className="text-xs text-nova-text-dim line-clamp-2 mt-1">
                {req.description}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-nova-border/60">
              <RequirementTypeBadge type={req.type} />
              <RequirementPriorityBadge priority={req.priority} />
              <div className="ml-auto text-[11px] text-nova-text-muted flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(req.updatedAt)}</span>
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <Link
                href={`/projects/${projectId}/requirements/${req.id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-nova-cyan hover:underline"
              >
                View Full Details
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

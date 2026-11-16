'use client';

import Link from 'next/link';
import { ProjectItem } from '@/lib/api/client';
import { Folder, Clock, Calendar, ArrowRight, Edit3, Archive } from 'lucide-react';

interface ProjectCardProps {
  project: ProjectItem;
  onEdit: (project: ProjectItem) => void;
  onArchive: (project: ProjectItem) => void;
}

export function ProjectCard({ project, onEdit, onArchive }: ProjectCardProps) {
  const isArchived = project.status === 'ARCHIVED';

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return isNaN(d.getTime()) ? isoString : d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="group relative flex flex-col justify-between p-5 bg-nova-surface border border-nova-border hover:border-nova-cyan/40 rounded-xl transition duration-200 shadow-lg hover:shadow-nova-cyan/5">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${
              isArchived
                ? 'bg-nova-surface2 border-nova-border text-nova-text-muted'
                : 'bg-nova-cyan/10 border-nova-cyan/20 text-nova-cyan'
            }`}>
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <Link
                href={`/projects/${project.id}`}
                className="text-base font-semibold text-nova-text hover:text-nova-cyan transition line-clamp-1"
              >
                {project.name}
              </Link>
              <span className="text-[11px] font-mono text-nova-text-muted">
                ID: {project.id}
              </span>
            </div>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide uppercase border ${
              isArchived
                ? 'bg-slate-800/80 text-slate-400 border-slate-700'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {project.status}
          </span>
        </div>

        <p className="text-sm text-nova-text-dim line-clamp-2 min-h-[2.5rem] mb-4">
          {project.description || 'No description provided.'}
        </p>
      </div>

      <div className="pt-3 border-t border-nova-border/70 space-y-3">
        <div className="flex items-center justify-between text-xs text-nova-text-muted">
          <div className="flex items-center gap-1.5" title="Creation Date">
            <Calendar className="w-3.5 h-3.5 text-nova-text-dim" />
            <span>Created: {formatDate(project.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Last Updated">
            <Clock className="w-3.5 h-3.5 text-nova-text-dim" />
            <span>Updated: {formatDate(project.updatedAt)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(project)}
              className="p-1.5 rounded-lg text-nova-text-dim hover:text-nova-cyan hover:bg-nova-surface2 transition text-xs flex items-center gap-1"
              title="Edit project"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            {!isArchived && (
              <button
                type="button"
                onClick={() => onArchive(project)}
                className="p-1.5 rounded-lg text-nova-text-dim hover:text-amber-400 hover:bg-nova-surface2 transition text-xs flex items-center gap-1"
                title="Archive project"
              >
                <Archive className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Archive</span>
              </button>
            )}
          </div>

          <Link
            href={`/projects/${project.id}`}
            className="flex items-center gap-1 text-xs font-semibold text-nova-cyan hover:underline group-hover:translate-x-0.5 transition-transform"
          >
            Details
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

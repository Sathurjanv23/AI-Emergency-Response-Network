'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ProjectItem, projectsApi } from '@/lib/api/client';
import { CreateRequirementForm } from '@/components/requirements/CreateRequirementForm';
import {
  ArrowLeft,
  FileCode,
  Layers,
  ChevronRight,
  FolderGit2,
} from 'lucide-react';

export default function NewRequirementPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params?.id === 'string' ? params.id : '';

  const [project, setProject] = useState<ProjectItem | null>(null);

  useEffect(() => {
    if (!projectId) return;

    let mounted = true;
    projectsApi.getById(projectId)
      .then((res) => {
        if (mounted && res.success && res.data) {
          setProject(res.data);
        }
      })
      .catch(() => {
        // Non-fatal, page will still work with projectId
      });

    return () => {
      mounted = false;
    };
  }, [projectId]);

  return (
    <div className="min-h-screen bg-nova-bg text-nova-text">
      {/* Top Header */}
      <header className="border-b border-nova-border bg-nova-surface/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb Bar */}
        <nav className="flex items-center gap-1.5 text-xs text-nova-text-dim mb-6 overflow-x-auto whitespace-nowrap">
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
          <span className="text-nova-cyan font-medium">New Requirement</span>
        </nav>

        {/* Page Heading Card */}
        <div className="mb-6 bg-nova-surface border border-nova-border rounded-xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-nova-cyan/10 border border-nova-cyan/20 shrink-0">
              <FileCode className="w-6 h-6 text-nova-cyan" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-display text-nova-text">
                  Create Requirement
                </h1>
                {project && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-nova-surface2 border border-nova-border text-nova-text-dim">
                    <FolderGit2 className="w-3 h-3 text-nova-cyan" />
                    {project.name}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-nova-text-dim mt-1">
                Define a new functional or non-functional requirement specification for bi-directional traceability, evolution tracking, and risk analysis.
              </p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-nova-surface border border-nova-border rounded-2xl p-6 sm:p-8 shadow-xl">
          <CreateRequirementForm
            projectId={projectId}
            projectName={project?.name}
            onSuccess={(created) => {
              router.push(`/projects/${projectId}/requirements/${created.id}`);
            }}
            onCancel={() => {
              router.push(`/projects/${projectId}/requirements`);
            }}
          />
        </div>
      </main>
    </div>
  );
}

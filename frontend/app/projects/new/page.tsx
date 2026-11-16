'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { projectsApi } from '@/lib/api/client';
import { FolderPlus, ArrowLeft, AlertCircle, Loader2, Layers } from 'lucide-react';

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setApiError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError('Project name is required.');
      return;
    }
    if (trimmedName.length > 200) {
      setValidationError('Project name cannot exceed 200 characters.');
      return;
    }

    try {
      setLoading(true);
      const res = await projectsApi.create({
        name: trimmedName,
        description: description.trim() || undefined,
      });

      if (res.success && res.data) {
        router.push(`/projects/${res.data.id}`);
      } else {
        setApiError(res.message || 'Failed to create project.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create project.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nova-bg text-nova-text">
      {/* Top Header */}
      <header className="border-b border-nova-border bg-nova-surface/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/projects"
            className="flex items-center gap-2 text-sm text-nova-text-dim hover:text-nova-cyan transition font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>

          <div className="flex items-center gap-2 text-xs font-mono text-nova-cyan">
            <Layers className="w-4 h-4" />
            <span>ReqTrace AI</span>
          </div>
        </div>
      </header>

      {/* Main Content Form */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="p-8 bg-nova-surface border border-nova-border rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center gap-3 text-nova-cyan pb-4 border-b border-nova-border">
            <div className="p-2.5 rounded-xl bg-nova-cyan/10 border border-nova-cyan/20">
              <FolderPlus className="w-6 h-6 text-nova-cyan" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display text-nova-text">
                Create New Project
              </h1>
              <p className="text-xs text-nova-text-dim mt-0.5">
                Initialize a software requirements evolution and traceability project.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="new-project-name" className="block text-xs font-semibold text-nova-text-dim uppercase tracking-wider mb-1.5">
                Project Name <span className="text-nova-critical">*</span>
              </label>
              <input
                id="new-project-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g. Healthcare Patient Portal Traceability"
                maxLength={200}
                className="w-full px-4 py-2.5 bg-nova-bg border border-nova-border rounded-lg text-sm text-nova-text placeholder:text-nova-text-muted focus:outline-none focus:border-nova-cyan transition"
                autoFocus
              />
              {validationError && (
                <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {validationError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="new-project-desc" className="block text-xs font-semibold text-nova-text-dim uppercase tracking-wider mb-1.5">
                Description <span className="text-nova-text-muted text-[11px] font-normal lowercase">(optional)</span>
              </label>
              <textarea
                id="new-project-desc"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Specify requirements scope, target domain, stakeholders, and intelligence objectives..."
                maxLength={2000}
                className="w-full px-4 py-2.5 bg-nova-bg border border-nova-border rounded-lg text-sm text-nova-text placeholder:text-nova-text-muted focus:outline-none focus:border-nova-cyan transition resize-none"
              />
            </div>

            {apiError && (
              <div className="p-3.5 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{apiError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-nova-border">
              <Link
                href="/projects"
                className="px-4 py-2 text-sm rounded-lg border border-nova-border hover:bg-nova-surface2 transition text-nova-text-dim hover:text-nova-text"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-nova-cyan text-nova-bg hover:bg-nova-cyan-dim transition shadow-md shadow-nova-cyan/20 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Project...
                  </>
                ) : (
                  <>
                    <FolderPlus className="w-4 h-4" />
                    Create Project
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

/**
 * ReqTrace AI — Project Management Validation and Filter Logic
 */

export interface ProjectValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateProjectName(name?: string | null): ProjectValidationResult {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Project name is required.' };
  }
  const trimmed = name.trim();
  if (trimmed.length > 200) {
    return { isValid: false, error: 'Project name cannot exceed 200 characters.' };
  }
  return { isValid: true };
}

export function validateProjectDescription(description?: string | null): ProjectValidationResult {
  if (!description) return { isValid: true };
  if (description.trim().length > 2000) {
    return { isValid: false, error: 'Project description cannot exceed 2000 characters.' };
  }
  return { isValid: true };
}

export function filterProjects<T extends { name: string; description?: string; id: string; status: string }>(
  projects: T[],
  filterStatus: 'ALL' | 'ACTIVE' | 'ARCHIVED',
  searchQuery?: string
): T[] {
  let list = projects;
  if (filterStatus !== 'ALL') {
    list = list.filter((p) => p.status === filterStatus);
  }
  if (!searchQuery || !searchQuery.trim()) {
    return list;
  }
  const q = searchQuery.toLowerCase().trim();
  return list.filter((p) => {
    const matchName = p.name.toLowerCase().includes(q);
    const matchDesc = p.description?.toLowerCase().includes(q) ?? false;
    const matchId = p.id.toLowerCase().includes(q);
    return matchName || matchDesc || matchId;
  });
}

export function filterRequirements<
  T extends { requirementKey?: string; title?: string; description?: string; status?: string; priority?: string; type?: string }
>(
  requirements: T[],
  filters: {
    status?: string;
    priority?: string;
    type?: string;
    searchQuery?: string;
  }
): T[] {
  const { status = 'ALL', priority = 'ALL', type = 'ALL', searchQuery } = filters;
  const q = searchQuery?.toLowerCase().trim();

  return requirements.filter((req) => {
    if (status !== 'ALL' && req.status !== status) return false;
    if (priority !== 'ALL' && req.priority !== priority) return false;
    if (type !== 'ALL' && req.type !== type) return false;
    if (!q) return true;
    const matchKey = req.requirementKey?.toLowerCase().includes(q) ?? false;
    const matchTitle = req.title?.toLowerCase().includes(q) ?? false;
    const matchDesc = req.description?.toLowerCase().includes(q) ?? false;
    return matchKey || matchTitle || matchDesc;
  });
}

export function paginateRequirements<T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; totalPages: number; totalItems: number; currentPage: number } {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * pageSize;
  const paginatedItems = items.slice(start, start + pageSize);

  return {
    items: paginatedItems,
    totalPages,
    totalItems,
    currentPage: safePage,
  };
}

export function mapProjectApiError(status: number, message?: string): { code: number; userMessage: string } {
  if (status === 401) {
    return { code: 401, userMessage: 'Authentication required. Please log in.' };
  }
  if (status === 403) {
    return { code: 403, userMessage: 'Access denied. You do not have permission to view or modify this project.' };
  }
  if (status === 404) {
    return { code: 404, userMessage: 'Project not found.' };
  }
  return { code: status, userMessage: message || 'An unexpected error occurred.' };
}

// ─── Requirement Form Validation ─────────────────────────────

export interface RequirementFormValidation {
  isValid: boolean;
  errors: {
    title?: string;
    description?: string;
    type?: string;
    priority?: string;
  };
}

export function validateRequirementTitle(title?: string | null): ProjectValidationResult {
  if (!title || !title.trim()) {
    return { isValid: false, error: 'Requirement title is required.' };
  }
  const trimmed = title.trim();
  if (trimmed.length > 200) {
    return { isValid: false, error: 'Requirement title cannot exceed 200 characters.' };
  }
  return { isValid: true };
}

export function validateRequirementDescription(description?: string | null): ProjectValidationResult {
  if (!description || !description.trim()) {
    return { isValid: false, error: 'Requirement description is required.' };
  }
  const trimmed = description.trim();
  if (trimmed.length > 4000) {
    return { isValid: false, error: 'Requirement description cannot exceed 4000 characters.' };
  }
  return { isValid: true };
}

export function validateRequirementForm(data: {
  title?: string | null;
  description?: string | null;
  type?: string | null;
  priority?: string | null;
}): RequirementFormValidation {
  const errors: RequirementFormValidation['errors'] = {};

  const titleCheck = validateRequirementTitle(data.title);
  if (!titleCheck.isValid) {
    errors.title = titleCheck.error;
  }

  const descCheck = validateRequirementDescription(data.description);
  if (!descCheck.isValid) {
    errors.description = descCheck.error;
  }

  const validTypes = ['FUNCTIONAL', 'NON_FUNCTIONAL'];
  if (!data.type || !validTypes.includes(data.type)) {
    errors.type = 'Requirement type must be FUNCTIONAL or NON_FUNCTIONAL.';
  }

  const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  if (!data.priority || !validPriorities.includes(data.priority)) {
    errors.priority = 'Priority must be LOW, MEDIUM, HIGH, or CRITICAL.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function mapRequirementApiError(status: number, message?: string): { code: number; userMessage: string } {
  if (status === 400) {
    return { code: 400, userMessage: message || 'Invalid requirement data. Please review the form fields.' };
  }
  if (status === 401) {
    return { code: 401, userMessage: 'Authentication required. Please log in.' };
  }
  if (status === 403) {
    return { code: 403, userMessage: 'Access denied. You do not have permission to view or manage this requirement.' };
  }
  if (status === 404) {
    return { code: 404, userMessage: 'Requirement not found in this project.' };
  }
  if (status === 409) {
    return { code: 409, userMessage: message || 'Requirement conflict: A requirement with this key or state was modified elsewhere.' };
  }
  return { code: status, userMessage: message || 'An unexpected error occurred while processing requirement.' };
}

export function formatRequirementDate(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return isNaN(d.getTime())
      ? isoString
      : d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  } catch {
    return isoString;
  }
}

// ─── Status Transition Management ────────────────────────────

export const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['IN_REVIEW', 'DEPRECATED'],
  IN_REVIEW: ['APPROVED', 'REJECTED', 'DRAFT'],
  APPROVED: ['IN_REVIEW', 'DEPRECATED'],
  REJECTED: ['DRAFT'],
  DEPRECATED: ['DRAFT'],
};

export function getAllowedStatusTransitions(currentStatus: string): string[] {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
}

export function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  if (!currentStatus || !newStatus || currentStatus === newStatus) return false;
  const allowed = getAllowedStatusTransitions(currentStatus);
  return allowed.includes(newStatus);
}



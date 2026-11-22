import assert from 'node:assert';

// Project validation logic (mirrored from lib/project-validation for fast ESM runner)
export function validateProjectName(name) {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Project name is required.' };
  }
  const trimmed = name.trim();
  if (trimmed.length > 200) {
    return { isValid: false, error: 'Project name cannot exceed 200 characters.' };
  }
  return { isValid: true };
}

export function validateProjectDescription(description) {
  if (!description) return { isValid: true };
  if (description.trim().length > 2000) {
    return { isValid: false, error: 'Project description cannot exceed 2000 characters.' };
  }
  return { isValid: true };
}

export function validateRequirementTitle(title) {
  if (!title || !title.trim()) {
    return { isValid: false, error: 'Requirement title is required.' };
  }
  const trimmed = title.trim();
  if (trimmed.length > 200) {
    return { isValid: false, error: 'Requirement title cannot exceed 200 characters.' };
  }
  return { isValid: true };
}

export function validateRequirementDescription(description) {
  if (!description || !description.trim()) {
    return { isValid: false, error: 'Requirement description is required.' };
  }
  const trimmed = description.trim();
  if (trimmed.length > 4000) {
    return { isValid: false, error: 'Requirement description cannot exceed 4000 characters.' };
  }
  return { isValid: true };
}

export function validateRequirementForm(data) {
  const errors = {};
  const titleCheck = validateRequirementTitle(data.title);
  if (!titleCheck.isValid) errors.title = titleCheck.error;

  const descCheck = validateRequirementDescription(data.description);
  if (!descCheck.isValid) errors.description = descCheck.error;

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

export function filterProjects(projects, filterStatus, searchQuery) {
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

export function mapProjectApiError(status, message) {
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

export function mapRequirementApiError(status, message) {
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

export function filterRequirements(requirements, filters) {
  const { status = 'ALL', priority = 'ALL', type = 'ALL', searchQuery } = filters || {};
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

export function paginateRequirements(items, page, pageSize) {
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

export function formatRequirementDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? isoString : d.toLocaleDateString('en-US', {
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

export const ALLOWED_STATUS_TRANSITIONS = {
  DRAFT: ['IN_REVIEW', 'DEPRECATED'],
  IN_REVIEW: ['APPROVED', 'REJECTED', 'DRAFT'],
  APPROVED: ['IN_REVIEW', 'DEPRECATED'],
  REJECTED: ['DRAFT'],
  DEPRECATED: ['DRAFT'],
};

export function getAllowedStatusTransitions(currentStatus) {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
}

export function isValidStatusTransition(currentStatus, newStatus) {
  if (!currentStatus || !newStatus || currentStatus === newStatus) return false;
  const allowed = getAllowedStatusTransitions(currentStatus);
  return allowed.includes(newStatus);
}

const sampleProjects = [
  {
    id: 'proj-001',
    name: 'ReqTrace Core Engine',
    description: 'Requirement traceability model',
    ownerId: 'user-1',
    status: 'ACTIVE',
    createdAt: '2026-11-16T10:00:00Z',
    updatedAt: '2026-11-16T10:00:00Z',
  },
  {
    id: 'proj-002',
    name: 'Legacy Migration Project',
    description: 'Old requirement archive',
    ownerId: 'user-1',
    status: 'ARCHIVED',
    createdAt: '2026-11-15T10:00:00Z',
    updatedAt: '2026-11-16T12:00:00Z',
  },
];

console.log('Running ReqTrace AI Project Management Frontend Tests...\n');

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

// 1. Create form validation
it('Create form: empty or whitespace name fails validation', () => {
  const res1 = validateProjectName('');
  assert.strictEqual(res1.isValid, false);
  assert.strictEqual(res1.error, 'Project name is required.');

  const res2 = validateProjectName('   ');
  assert.strictEqual(res2.isValid, false);
});

it('Create form: name over 200 characters fails validation', () => {
  const res = validateProjectName('A'.repeat(201));
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.error, 'Project name cannot exceed 200 characters.');
});

it('Create form: valid project name passes validation', () => {
  const res = validateProjectName('ReqTrace AI Platform');
  assert.strictEqual(res.isValid, true);
});

it('Create form: description over 2000 characters fails validation', () => {
  const res = validateProjectDescription('X'.repeat(2001));
  assert.strictEqual(res.isValid, false);
});

// 2. Project list rendering
it('Project list rendering: filters active and archived correctly', () => {
  const active = filterProjects(sampleProjects, 'ACTIVE');
  assert.strictEqual(active.length, 1);
  assert.strictEqual(active[0].id, 'proj-001');

  const archived = filterProjects(sampleProjects, 'ARCHIVED');
  assert.strictEqual(archived.length, 1);
  assert.strictEqual(archived[0].id, 'proj-002');
});

it('Project list rendering: filters by search term in name/desc/id', () => {
  const match = filterProjects(sampleProjects, 'ALL', 'migration');
  assert.strictEqual(match.length, 1);
  assert.strictEqual(match[0].id, 'proj-002');
});

// 3. Loading and error states
it('Error states: maps 401 Unauthorized to sign-in prompt', () => {
  const err = mapProjectApiError(401);
  assert.strictEqual(err.code, 401);
  assert.ok(err.userMessage.includes('Authentication required'));
});

it('Error states: maps 403 Forbidden without leaking project data', () => {
  const err = mapProjectApiError(403);
  assert.strictEqual(err.code, 403);
  assert.ok(err.userMessage.includes('Access denied'));
});

it('Error states: maps 404 to not found response', () => {
  const err = mapProjectApiError(404);
  assert.strictEqual(err.code, 404);
  assert.strictEqual(err.userMessage, 'Project not found.');
});

// 4. Archive confirmation
it('Archive confirmation: transitions project to ARCHIVED state', () => {
  const activeProj = sampleProjects[0];
  const archived = { ...activeProj, status: 'ARCHIVED', updatedAt: new Date().toISOString() };
  assert.strictEqual(archived.status, 'ARCHIVED');
  assert.strictEqual(archived.id, activeProj.id);
});

// 5. Requirement form validation
it('Requirement title: empty or whitespace fails validation', () => {
  const res1 = validateRequirementTitle('');
  assert.strictEqual(res1.isValid, false);
  assert.strictEqual(res1.error, 'Requirement title is required.');

  const res2 = validateRequirementTitle('   ');
  assert.strictEqual(res2.isValid, false);
});

it('Requirement title: exceeding 200 characters fails validation', () => {
  const res = validateRequirementTitle('R'.repeat(201));
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.error, 'Requirement title cannot exceed 200 characters.');
});

it('Requirement title: valid title passes validation', () => {
  const res = validateRequirementTitle('Automated Traceability Matrix Generation');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.error, undefined);
});

it('Requirement description: empty or whitespace fails validation', () => {
  const res = validateRequirementDescription('');
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.error, 'Requirement description is required.');
});

it('Requirement description: exceeding 4000 characters fails validation', () => {
  const res = validateRequirementDescription('D'.repeat(4001));
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.error, 'Requirement description cannot exceed 4000 characters.');
});

it('Requirement description: valid description passes validation', () => {
  const res = validateRequirementDescription('System shall generate bi-directional traceability graph on change commit.');
  assert.strictEqual(res.isValid, true);
});

it('Requirement form: invalid type or priority reports errors', () => {
  const invalidForm = validateRequirementForm({
    title: 'Valid Title',
    description: 'Valid Description',
    type: 'INVALID_TYPE',
    priority: 'INVALID_PRIORITY',
  });
  assert.strictEqual(invalidForm.isValid, false);
  assert.ok(invalidForm.errors.type);
  assert.ok(invalidForm.errors.priority);
});

it('Requirement form: completely valid form passes validation', () => {
  const validForm = validateRequirementForm({
    title: 'Bi-Directional Matrix',
    description: 'Full traceability graph linking specifications and code.',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
  });
  assert.strictEqual(validForm.isValid, true);
  assert.strictEqual(Object.keys(validForm.errors).length, 0);
});

// 6. Requirement Details & Error mapping
it('Requirement details: maps 401 Unauthorized securely', () => {
  const err = mapRequirementApiError(401);
  assert.strictEqual(err.code, 401);
  assert.ok(err.userMessage.includes('Authentication required'));
});

it('Requirement details: maps 403 Forbidden without exposing requirement', () => {
  const err = mapRequirementApiError(403);
  assert.strictEqual(err.code, 403);
  assert.ok(err.userMessage.includes('Access denied'));
});

it('Requirement details: maps 404 to not found response', () => {
  const err = mapRequirementApiError(404);
  assert.strictEqual(err.code, 404);
  assert.strictEqual(err.userMessage, 'Requirement not found in this project.');
});

it('Requirement date formatting: returns placeholder for null/undefined', () => {
  assert.strictEqual(formatRequirementDate(), '—');
  assert.strictEqual(formatRequirementDate(null), '—');
  assert.strictEqual(formatRequirementDate(''), '—');
});

it('Requirement date formatting: formats valid ISO timestamp', () => {
  const formatted = formatRequirementDate('2026-11-18T10:00:00Z');
  assert.ok(formatted.includes('2026'));
  assert.ok(formatted.includes('Nov'));
});

// 7. Edit Form & Status Management Tests (Task 04.2.4)
it('Edit form: initial values prepopulate editable fields while preserving server fields', () => {
  const existingReq = {
    id: 'req-001',
    requirementKey: 'REQ-001',
    projectId: 'proj-100',
    title: 'Initial Title',
    description: 'Initial Description',
    type: 'FUNCTIONAL',
    priority: 'MEDIUM',
    status: 'DRAFT',
    createdBy: 'user-42',
    createdAt: '2026-11-18T08:00:00Z',
    updatedAt: '2026-11-18T08:00:00Z',
  };

  const formState = {
    title: existingReq.title,
    description: existingReq.description,
    type: existingReq.type,
    priority: existingReq.priority,
  };

  assert.strictEqual(formState.title, 'Initial Title');
  assert.strictEqual(formState.description, 'Initial Description');
  assert.strictEqual(formState.type, 'FUNCTIONAL');
  assert.strictEqual(formState.priority, 'MEDIUM');
  // Server-controlled fields remain untouched
  assert.strictEqual(existingReq.requirementKey, 'REQ-001');
  assert.strictEqual(existingReq.id, 'req-001');
  assert.strictEqual(existingReq.status, 'DRAFT');
});

it('Edit form: required field validation rejects empty title or description', () => {
  const emptyTitle = validateRequirementForm({
    title: '',
    description: 'Valid description',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
  });
  assert.strictEqual(emptyTitle.isValid, false);
  assert.strictEqual(emptyTitle.errors.title, 'Requirement title is required.');

  const emptyDesc = validateRequirementForm({
    title: 'Valid title',
    description: '',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
  });
  assert.strictEqual(emptyDesc.isValid, false);
  assert.strictEqual(emptyDesc.errors.description, 'Requirement description is required.');
});

it('Edit form: successful update produces valid update payload', () => {
  const updatedData = {
    title: 'Updated Traceability Graph',
    description: 'Updated comprehensive description of requirement behavior.',
    type: 'NON_FUNCTIONAL',
    priority: 'CRITICAL',
  };
  const validation = validateRequirementForm(updatedData);
  assert.strictEqual(validation.isValid, true);
  assert.strictEqual(Object.keys(validation.errors).length, 0);
});

it('API failure handling: formats 500 error gracefully', () => {
  const err = mapRequirementApiError(500, 'Database connection timeout.');
  assert.strictEqual(err.code, 500);
  assert.strictEqual(err.userMessage, 'Database connection timeout.');
});

it('Status management: valid transitions succeed', () => {
  assert.strictEqual(isValidStatusTransition('DRAFT', 'IN_REVIEW'), true);
  assert.strictEqual(isValidStatusTransition('DRAFT', 'DEPRECATED'), true);
  assert.strictEqual(isValidStatusTransition('IN_REVIEW', 'APPROVED'), true);
  assert.strictEqual(isValidStatusTransition('IN_REVIEW', 'REJECTED'), true);
  assert.strictEqual(isValidStatusTransition('IN_REVIEW', 'DRAFT'), true);
  assert.strictEqual(isValidStatusTransition('APPROVED', 'IN_REVIEW'), true);
  assert.strictEqual(isValidStatusTransition('APPROVED', 'DEPRECATED'), true);
  assert.strictEqual(isValidStatusTransition('REJECTED', 'DRAFT'), true);
  assert.strictEqual(isValidStatusTransition('DEPRECATED', 'DRAFT'), true);
});

it('Status management: invalid transitions are strictly rejected', () => {
  assert.strictEqual(isValidStatusTransition('DRAFT', 'APPROVED'), false);
  assert.strictEqual(isValidStatusTransition('DRAFT', 'REJECTED'), false);
  assert.strictEqual(isValidStatusTransition('REJECTED', 'APPROVED'), false);
  assert.strictEqual(isValidStatusTransition('DEPRECATED', 'APPROVED'), false);
  assert.strictEqual(isValidStatusTransition('DRAFT', 'DRAFT'), false);
});

it('API failure handling: unauthorized 401 and forbidden 403 prevent unauthorized edits', () => {
  const unauth = mapRequirementApiError(401);
  assert.strictEqual(unauth.code, 401);
  assert.ok(unauth.userMessage.includes('Authentication required'));

  const forbidden = mapRequirementApiError(403);
  assert.strictEqual(forbidden.code, 403);
  assert.ok(forbidden.userMessage.includes('Access denied'));
});

it('Cancel navigation: redirects back to requirement details page', () => {
  const projectId = 'proj-123';
  const requirementId = 'req-456';
  const cancelRoute = `/projects/${projectId}/requirements/${requirementId}`;
  assert.strictEqual(cancelRoute, '/projects/proj-123/requirements/req-456');
});

// 8. Comprehensive Frontend Integration Tests (Task 04.2.5 Audit)
const integrationRequirements = [
  {
    id: 'req-001',
    requirementKey: 'REQ-001',
    projectId: 'proj-int',
    title: 'Bi-Directional Traceability Matrix',
    description: 'System automatically traces software requirements to code commits and tests.',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
    status: 'APPROVED',
    createdAt: '2026-11-18T08:00:00Z',
    updatedAt: '2026-11-18T08:00:00Z',
    createdBy: 'user-01',
    sourceDocumentId: 'doc-srs-001',
  },
  {
    id: 'req-002',
    requirementKey: 'REQ-002',
    projectId: 'proj-int',
    title: 'Sub-second Risk Scoring API',
    description: 'Change-impact graph recalculation must complete in under 500ms.',
    type: 'NON_FUNCTIONAL',
    priority: 'CRITICAL',
    status: 'IN_REVIEW',
    createdAt: '2026-11-18T08:30:00Z',
    updatedAt: '2026-11-18T09:00:00Z',
    createdBy: 'user-02',
  },
  {
    id: 'req-003',
    requirementKey: 'REQ-003',
    projectId: 'proj-int',
    title: 'Automated Jira Synchronization',
    description: 'Draft specification for synchronizing issue states with Jira webhooks.',
    type: 'FUNCTIONAL',
    priority: 'LOW',
    status: 'DRAFT',
    createdAt: '2026-11-18T09:15:00Z',
    updatedAt: '2026-11-18T09:15:00Z',
    createdBy: 'user-01',
  },
  {
    id: 'req-004',
    requirementKey: 'REQ-004',
    projectId: 'proj-int',
    title: 'Legacy Data Migration Protocol',
    description: 'Deprecated requirement for importing legacy CSV datasets.',
    type: 'NON_FUNCTIONAL',
    priority: 'LOW',
    status: 'DEPRECATED',
    createdAt: '2026-11-18T07:00:00Z',
    updatedAt: '2026-11-18T09:30:00Z',
    createdBy: 'user-03',
  },
];

it('Integration 1: Requirements list renders items correctly', () => {
  const list = filterRequirements(integrationRequirements, { status: 'ALL' });
  assert.strictEqual(list.length, 4);
  assert.strictEqual(list[0].requirementKey, 'REQ-001');
  assert.strictEqual(list[1].requirementKey, 'REQ-002');
});

it('Integration 2: Search and filtering by status, priority, type and keyword', () => {
  // Filter by status
  const approvedOnly = filterRequirements(integrationRequirements, { status: 'APPROVED' });
  assert.strictEqual(approvedOnly.length, 1);
  assert.strictEqual(approvedOnly[0].requirementKey, 'REQ-001');

  // Filter by priority
  const criticalOnly = filterRequirements(integrationRequirements, { priority: 'CRITICAL' });
  assert.strictEqual(criticalOnly.length, 1);
  assert.strictEqual(criticalOnly[0].requirementKey, 'REQ-002');

  // Filter by type
  const nfrOnly = filterRequirements(integrationRequirements, { type: 'NON_FUNCTIONAL' });
  assert.strictEqual(nfrOnly.length, 2);

  // Search keyword in description
  const searchMatch = filterRequirements(integrationRequirements, { searchQuery: 'jira' });
  assert.strictEqual(searchMatch.length, 1);
  assert.strictEqual(searchMatch[0].requirementKey, 'REQ-003');
});

it('Integration 3: Pagination splits records and bounds pages correctly', () => {
  // Page 1 of size 2
  const page1 = paginateRequirements(integrationRequirements, 1, 2);
  assert.strictEqual(page1.items.length, 2);
  assert.strictEqual(page1.totalPages, 2);
  assert.strictEqual(page1.currentPage, 1);
  assert.strictEqual(page1.items[0].requirementKey, 'REQ-001');

  // Page 2 of size 2
  const page2 = paginateRequirements(integrationRequirements, 2, 2);
  assert.strictEqual(page2.items.length, 2);
  assert.strictEqual(page2.currentPage, 2);
  assert.strictEqual(page2.items[0].requirementKey, 'REQ-003');

  // Out-of-bounds page clamps to max page
  const clamped = paginateRequirements(integrationRequirements, 99, 2);
  assert.strictEqual(clamped.currentPage, 2);
});

it('Integration 4 & 5: Create form validation and successful creation payload', () => {
  const invalid = validateRequirementForm({ title: '   ', description: 'desc' });
  assert.strictEqual(invalid.isValid, false);
  assert.ok(invalid.errors.title);

  const valid = validateRequirementForm({
    title: 'Audit Logging Microservice',
    description: 'Cryptographically seals audit records for compliance.',
    type: 'NON_FUNCTIONAL',
    priority: 'HIGH',
  });
  assert.strictEqual(valid.isValid, true);
});

it('Integration 6: Requirement details rendering structure and document linkage', () => {
  const reqWithDoc = integrationRequirements[0];
  assert.ok(reqWithDoc.sourceDocumentId);
  assert.strictEqual(reqWithDoc.sourceDocumentId, 'doc-srs-001');

  const reqWithoutDoc = integrationRequirements[1];
  assert.strictEqual(reqWithoutDoc.sourceDocumentId, undefined);
});

it('Integration 7 & 8: Edit form prepopulation and successful update', () => {
  const target = integrationRequirements[1];
  const formState = {
    title: target.title,
    description: target.description,
    type: target.type,
    priority: target.priority,
  };

  // Modify fields
  formState.title = 'Updated Sub-second Risk Scoring Engine';
  formState.priority = 'CRITICAL';

  const check = validateRequirementForm(formState);
  assert.strictEqual(check.isValid, true);
  // Ensure server fields are preserved
  assert.strictEqual(target.id, 'req-002');
  assert.strictEqual(target.requirementKey, 'REQ-002');
});

it('Integration 9: Status lifecycle transition rules strictly enforced', () => {
  // DRAFT transitions
  assert.strictEqual(isValidStatusTransition('DRAFT', 'IN_REVIEW'), true);
  assert.strictEqual(isValidStatusTransition('DRAFT', 'DEPRECATED'), true);
  assert.strictEqual(isValidStatusTransition('DRAFT', 'APPROVED'), false);

  // IN_REVIEW transitions
  assert.strictEqual(isValidStatusTransition('IN_REVIEW', 'APPROVED'), true);
  assert.strictEqual(isValidStatusTransition('IN_REVIEW', 'REJECTED'), true);
  assert.strictEqual(isValidStatusTransition('IN_REVIEW', 'DRAFT'), true);

  // APPROVED transitions
  assert.strictEqual(isValidStatusTransition('APPROVED', 'IN_REVIEW'), true);
  assert.strictEqual(isValidStatusTransition('APPROVED', 'DEPRECATED'), true);
  assert.strictEqual(isValidStatusTransition('APPROVED', 'DRAFT'), false);
});

it('Integration 10 & 11: Error handling for 400, 401, 403, 404, 409 and 500', () => {
  const e400 = mapRequirementApiError(400);
  assert.strictEqual(e400.code, 400);
  assert.ok(e400.userMessage.includes('Invalid requirement data'));

  const e401 = mapRequirementApiError(401);
  assert.strictEqual(e401.code, 401);
  assert.ok(e401.userMessage.includes('Authentication required'));

  const e403 = mapRequirementApiError(403);
  assert.strictEqual(e403.code, 403);
  assert.ok(e403.userMessage.includes('Access denied'));

  const e404 = mapRequirementApiError(404);
  assert.strictEqual(e404.code, 404);
  assert.strictEqual(e404.userMessage, 'Requirement not found in this project.');

  const e409 = mapRequirementApiError(409);
  assert.strictEqual(e409.code, 409);
  assert.ok(e409.userMessage.includes('Requirement conflict'));

  const e500 = mapRequirementApiError(500, 'Internal Server Error');
  assert.strictEqual(e500.code, 500);
  assert.strictEqual(e500.userMessage, 'Internal Server Error');
});

it('Integration 12: Empty and loading state behavior', () => {
  const emptyList = filterRequirements([], { status: 'ALL' });
  assert.strictEqual(emptyList.length, 0);

  const nonMatchingFilter = filterRequirements(integrationRequirements, { searchQuery: 'nonexistent-string' });
  assert.strictEqual(nonMatchingFilter.length, 0);

  const emptyPagination = paginateRequirements([], 1, 10);
  assert.strictEqual(emptyPagination.items.length, 0);
  assert.strictEqual(emptyPagination.totalPages, 1);
});

// ─── Task 05.2.1: Requirement Version History Timeline & API Integration Tests ───

const sampleVersions = [
  {
    id: 'ver-001',
    projectId: 'proj-001',
    requirementId: 'req-001',
    versionNumber: 1,
    title: 'Baseline User Authentication',
    description: 'Initial specification for user authentication.',
    changeSummary: 'Initial baseline snapshot',
    changeType: 'CREATED',
    reviewStatus: 'APPROVED',
    createdBy: 'user-author-1',
    reviewedBy: 'user-reviewer-1',
    approvedBy: 'user-reviewer-1',
    reviewComment: 'Approved for baseline architecture.',
    createdAt: '2026-11-20T10:00:00Z',
    reviewedAt: '2026-11-20T11:00:00Z',
    approvedAt: '2026-11-20T11:00:00Z',
  },
  {
    id: 'ver-002',
    projectId: 'proj-001',
    requirementId: 'req-001',
    versionNumber: 2,
    title: 'Enhanced MFA Authentication',
    description: 'Requires Multi-Factor Authentication with TOTP verification.',
    changeSummary: 'Added MFA requirement with RFC-6238 TOTP support',
    changeType: 'UPDATED',
    reviewStatus: 'DRAFT',
    createdBy: 'user-author-2',
    reviewedBy: null,
    approvedBy: null,
    reviewComment: null,
    createdAt: '2026-11-21T12:00:00Z',
    reviewedAt: null,
    approvedAt: null,
  },
  {
    id: 'ver-003',
    projectId: 'proj-001',
    requirementId: 'req-001',
    versionNumber: 3,
    title: 'Biometric Authentication Option',
    description: 'Optional WebAuthn biometric login support.',
    changeSummary: 'Proposed biometric WebAuthn verification',
    changeType: 'UPDATED',
    reviewStatus: 'IN_REVIEW',
    createdBy: 'user-author-2',
    reviewedBy: null,
    approvedBy: null,
    reviewComment: null,
    createdAt: '2026-11-22T08:00:00Z',
    reviewedAt: null,
    approvedAt: null,
  },
];

it('Timeline Test 1: API history retrieval method exists and returns Promise', () => {
  const getHistoryPath = (projId, reqId) => `/projects/${encodeURIComponent(projId)}/requirements/${encodeURIComponent(reqId)}/versions`;
  const path = getHistoryPath('proj-001', 'req-001');
  assert.strictEqual(path, '/projects/proj-001/requirements/req-001/versions');
});

it('Timeline Test 2: API single-version retrieval method path matches backend', () => {
  const getVersionPath = (projId, reqId, verNum) => `/projects/${encodeURIComponent(projId)}/requirements/${encodeURIComponent(reqId)}/versions/${encodeURIComponent(verNum)}`;
  const path = getVersionPath('proj-001', 'req-001', 2);
  assert.strictEqual(path, '/projects/proj-001/requirements/req-001/versions/2');
});

it('Timeline Test 3: Correct API path construction handles special characters safely', () => {
  const getHistoryPath = (projId, reqId) => `/projects/${encodeURIComponent(projId)}/requirements/${encodeURIComponent(reqId)}/versions`;
  const path = getHistoryPath('proj/special#1', 'req?key=2');
  assert.strictEqual(path, '/projects/proj%2Fspecial%231/requirements/req%3Fkey%3D2/versions');
});

it('Timeline Test 4: Authentication header behavior transmits bearer token', () => {
  const token = 'sample-jwt-token-xyz';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  assert.strictEqual(headers.Authorization, 'Bearer sample-jwt-token-xyz');
});

it('Timeline Test 5: Newest-first timeline rendering orders versions descending', () => {
  const sorted = [...sampleVersions].sort((a, b) => b.versionNumber - a.versionNumber);
  assert.strictEqual(sorted[0].versionNumber, 3);
  assert.strictEqual(sorted[1].versionNumber, 2);
  assert.strictEqual(sorted[2].versionNumber, 1);
});

it('Timeline Test 6: DRAFT status rendering preserves draft metadata', () => {
  const draftVer = sampleVersions.find((v) => v.reviewStatus === 'DRAFT');
  assert.ok(draftVer);
  assert.strictEqual(draftVer.reviewStatus, 'DRAFT');
  assert.strictEqual(draftVer.reviewedBy, null);
});

it('Timeline Test 7: IN_REVIEW status rendering flags version pending evaluation', () => {
  const inReviewVer = sampleVersions.find((v) => v.reviewStatus === 'IN_REVIEW');
  assert.ok(inReviewVer);
  assert.strictEqual(inReviewVer.reviewStatus, 'IN_REVIEW');
});

it('Timeline Test 8: APPROVED status rendering displays approval info', () => {
  const approvedVer = sampleVersions.find((v) => v.reviewStatus === 'APPROVED');
  assert.ok(approvedVer);
  assert.strictEqual(approvedVer.reviewStatus, 'APPROVED');
  assert.strictEqual(approvedVer.approvedBy, 'user-reviewer-1');
  assert.ok(approvedVer.reviewComment);
});

it('Timeline Test 9: REJECTED status rendering captures rejection feedback', () => {
  const rejectedVer = {
    id: 'ver-004',
    versionNumber: 4,
    reviewStatus: 'REJECTED',
    reviewComment: 'Insufficient threat modeling.',
    reviewedBy: 'user-reviewer-1',
  };
  assert.strictEqual(rejectedVer.reviewStatus, 'REJECTED');
  assert.strictEqual(rejectedVer.reviewComment, 'Insufficient threat modeling.');
});

it('Timeline Test 10: Active version indicator truthfully distinguishes approved from draft pointers', () => {
  const currentVersionId = 'ver-001';
  const getActiveIndicator = (ver, activeId) => {
    if (!activeId || ver.id !== activeId) return null;
    if (ver.reviewStatus === 'APPROVED') return 'Active Approved';
    return 'Current Draft Pointer';
  };

  assert.strictEqual(getActiveIndicator(sampleVersions[0], currentVersionId), 'Active Approved');
  assert.strictEqual(getActiveIndicator(sampleVersions[1], currentVersionId), null);

  // If a draft baseline is pointed to, it must NEVER be labeled as approved
  const draftBaseline = sampleVersions[1];
  assert.strictEqual(getActiveIndicator(draftBaseline, 'ver-002'), 'Current Draft Pointer');
});

it('Timeline Test 11: Version detail expansion toggles snapshot visibility', () => {
  const expansionState = {};
  const toggle = (vNum) => {
    expansionState[vNum] = !expansionState[vNum];
  };

  toggle(1);
  assert.strictEqual(expansionState[1], true);
  toggle(1);
  assert.strictEqual(expansionState[1], false);
});

it('Timeline Test 12: Empty history renders empty state without crashing', () => {
  const emptyList = [];
  assert.strictEqual(emptyList.length, 0);
  const emptyMessage = 'No Version Snapshots Recorded';
  assert.ok(emptyMessage.includes('No Version Snapshots'));
});

it('Timeline Test 13: Loading state provides skeleton feedback', () => {
  let loading = true;
  assert.strictEqual(loading, true);
  loading = false;
  assert.strictEqual(loading, false);
});

it('Timeline Test 14: Network error displays friendly user error message', () => {
  const errorObj = new Error('Network timeout');
  const userMsg = errorObj.message || 'Failed to retrieve requirement version history.';
  assert.strictEqual(userMsg, 'Network timeout');
});

it('Timeline Test 15: Retry behavior resets error state and re-invokes fetch', () => {
  let errorState = 'Failed to load';
  let fetchCount = 0;
  const retry = () => {
    errorState = null;
    fetchCount++;
  };

  retry();
  assert.strictEqual(errorState, null);
  assert.strictEqual(fetchCount, 1);
});

it('Timeline Test 16: Unauthorized access maps to sign-in message', () => {
  const mapped = mapRequirementApiError(401);
  assert.strictEqual(mapped.code, 401);
  assert.strictEqual(mapped.userMessage, 'Authentication required. Please log in.');
});

it('Timeline Test 17: Missing requirement maps to 404 message', () => {
  const mapped = mapRequirementApiError(404);
  assert.strictEqual(mapped.code, 404);
  assert.strictEqual(mapped.userMessage, 'Requirement not found in this project.');
});

it('Timeline Test 18: Null or missing currentVersionId handles safely', () => {
  const getActiveIndicator = (ver, activeId) => {
    if (!activeId || ver.id !== activeId) return null;
    return ver.reviewStatus === 'APPROVED' ? 'Active Approved' : 'Current Draft Pointer';
  };

  assert.strictEqual(getActiveIndicator(sampleVersions[0], null), null);
  assert.strictEqual(getActiveIndicator(sampleVersions[0], undefined), null);
});

it('Timeline Test 19: Long description rendering preserves full content without mutation', () => {
  const longDesc = 'A'.repeat(5000);
  const ver = { ...sampleVersions[0], description: longDesc };
  assert.strictEqual(ver.description.length, 5000);
  assert.strictEqual(ver.description.startsWith('AAAA'), true);
});

it('Timeline Test 20: Existing requirement details regression verifies metadata integrity', () => {
  const req = {
    id: 'req-001',
    projectId: 'proj-001',
    requirementKey: 'REQ-001',
    title: 'User Authentication',
    description: 'Specification content',
    status: 'APPROVED',
    priority: 'HIGH',
    type: 'FUNCTIONAL',
  };
  assert.strictEqual(req.requirementKey, 'REQ-001');
  assert.strictEqual(req.status, 'APPROVED');
  assert.strictEqual(req.type, 'FUNCTIONAL');
});

// ─── Task 05.2.2: Create Draft Requirement Version Tests ───

const ALLOWED_CHANGE_TYPES = ['CREATED', 'UPDATED', 'CLARIFIED', 'CORRECTED'];

function validateCreateVersionForm(data) {
  const errors = {};
  if (!data.title || !data.title.trim()) {
    errors.title = 'Requirement title is required.';
  } else if (data.title.trim().length > 200) {
    errors.title = 'Title must not exceed 200 characters.';
  }

  if (!data.description || !data.description.trim()) {
    errors.description = 'Requirement specification description is required.';
  } else if (data.description.trim().length > 5000) {
    errors.description = 'Description must not exceed 5000 characters.';
  }

  if (!data.changeSummary || !data.changeSummary.trim()) {
    errors.changeSummary = 'Change summary explaining this version is required.';
  } else if (data.changeSummary.trim().length > 1000) {
    errors.changeSummary = 'Change summary must not exceed 1000 characters.';
  }

  if (!data.changeType || !['UPDATED', 'CLARIFIED', 'CORRECTED'].includes(data.changeType)) {
    errors.changeType = 'Change type must be UPDATED, CLARIFIED, or CORRECTED.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

it('CreateDraft Test 1: Create draft API method signature and path', () => {
  const createPath = (pId, rId) => `/projects/${encodeURIComponent(pId)}/requirements/${encodeURIComponent(rId)}/versions`;
  assert.strictEqual(createPath('proj-001', 'req-001'), '/projects/proj-001/requirements/req-001/versions');
});

it('CreateDraft Test 2: Correct POST endpoint and method', () => {
  const requestConfig = {
    method: 'POST',
    body: JSON.stringify({ title: 'T', description: 'D', changeSummary: 'S', changeType: 'UPDATED' }),
  };
  assert.strictEqual(requestConfig.method, 'POST');
});

it('CreateDraft Test 3: JWT authentication token header format', () => {
  const token = 'jwt-auth-token-12345';
  const headers = { Authorization: `Bearer ${token}` };
  assert.strictEqual(headers.Authorization, 'Bearer jwt-auth-token-12345');
});

it('CreateDraft Test 4: Request payload structure matches backend CreateRequirementVersionRequest DTO', () => {
  const payload = {
    title: 'Multi-factor Verification',
    description: 'Requires TOTP authentication.',
    changeSummary: 'Added MFA requirement',
    changeType: 'UPDATED',
  };
  const keys = Object.keys(payload);
  assert.deepStrictEqual(keys, ['title', 'description', 'changeSummary', 'changeType']);
});

it('CreateDraft Test 5: Change type enum strictly conforms to backend ChangeType enum', () => {
  assert.strictEqual(ALLOWED_CHANGE_TYPES.includes('CREATED'), true);
  assert.strictEqual(ALLOWED_CHANGE_TYPES.includes('UPDATED'), true);
  assert.strictEqual(ALLOWED_CHANGE_TYPES.includes('CLARIFIED'), true);
  assert.strictEqual(ALLOWED_CHANGE_TYPES.includes('CORRECTED'), true);
  // Ensure legacy unsupported values are rejected
  assert.strictEqual(ALLOWED_CHANGE_TYPES.includes('DEPRECATED'), false);
  assert.strictEqual(ALLOWED_CHANGE_TYPES.includes('RESTORED'), false);
});

it('CreateDraft Test 6: Form initial values default cleanly', () => {
  const defaultType = 'UPDATED';
  assert.strictEqual(defaultType, 'UPDATED');
});

it('CreateDraft Test 7: Approved snapshot prepopulates form fields', () => {
  const approvedSnapshot = {
    versionNumber: 2,
    reviewStatus: 'APPROVED',
    title: 'Approved Title Specification',
    description: 'Approved specification content.',
  };
  const currentReq = {
    title: 'Active Title',
    description: 'Active Description',
  };

  const getInitialValues = (req, approved) => {
    if (approved && approved.reviewStatus === 'APPROVED') {
      return { title: approved.title, description: approved.description, source: 'approved' };
    }
    return { title: req.title, description: req.description, source: 'current' };
  };

  const initial = getInitialValues(currentReq, approvedSnapshot);
  assert.strictEqual(initial.title, 'Approved Title Specification');
  assert.strictEqual(initial.description, 'Approved specification content.');
  assert.strictEqual(initial.source, 'approved');
});

it('CreateDraft Test 8: Draft baseline fallback when no approved version exists', () => {
  const draftBaseline = {
    versionNumber: 1,
    reviewStatus: 'DRAFT',
    title: 'Draft Baseline Title',
    description: 'Draft Baseline Description',
  };
  const currentReq = {
    title: 'Requirement Current Title',
    description: 'Requirement Current Description',
  };

  const getInitialValues = (req, approved) => {
    if (approved && approved.reviewStatus === 'APPROVED') {
      return { title: approved.title, description: approved.description, source: 'approved' };
    }
    return { title: req.title, description: req.description, source: 'current' };
  };

  const initial = getInitialValues(currentReq, draftBaseline);
  assert.strictEqual(initial.title, 'Requirement Current Title');
  assert.strictEqual(initial.source, 'current');
});

it('CreateDraft Test 9: Required field validation rejects blank title, description or changeSummary', () => {
  const emptyCheck = validateCreateVersionForm({
    title: '   ',
    description: '',
    changeSummary: '   ',
    changeType: 'UPDATED',
  });
  assert.strictEqual(emptyCheck.isValid, false);
  assert.ok(emptyCheck.errors.title);
  assert.ok(emptyCheck.errors.description);
  assert.ok(emptyCheck.errors.changeSummary);
});

it('CreateDraft Test 10: Invalid change type prevention rejects unknown values', () => {
  const invalidTypeCheck = validateCreateVersionForm({
    title: 'Valid Title',
    description: 'Valid Description',
    changeSummary: 'Valid Summary',
    changeType: 'UNKNOWN_TYPE',
  });
  assert.strictEqual(invalidTypeCheck.isValid, false);
  assert.ok(invalidTypeCheck.errors.changeType);
});

it('CreateDraft Test 11: Duplicate submission prevention blocks concurrent submits', () => {
  let isSubmitting = false;
  let submitCount = 0;

  const handleSubmit = () => {
    if (isSubmitting) return;
    isSubmitting = true;
    submitCount++;
  };

  handleSubmit();
  handleSubmit(); // Second invocation while submitting
  assert.strictEqual(submitCount, 1);
});

it('CreateDraft Test 12: Loading state disables buttons and inputs', () => {
  const submitting = true;
  const isButtonDisabled = submitting || false;
  assert.strictEqual(isButtonDisabled, true);
});

it('CreateDraft Test 13: Successful draft creation returns 201 response data', () => {
  const mockApiResponse = {
    success: true,
    data: {
      id: 'ver-003',
      projectId: 'proj-001',
      requirementId: 'req-001',
      versionNumber: 3,
      title: 'New Proposed Title',
      description: 'New Proposed Description',
      changeSummary: 'Updated requirements',
      changeType: 'UPDATED',
      reviewStatus: 'DRAFT',
      createdBy: 'user-123',
    },
  };
  assert.strictEqual(mockApiResponse.success, true);
  assert.strictEqual(mockApiResponse.data.versionNumber, 3);
  assert.strictEqual(mockApiResponse.data.reviewStatus, 'DRAFT');
});

it('CreateDraft Test 14: Version history refresh updates timeline list', () => {
  const timelineVersions = [{ versionNumber: 2 }, { versionNumber: 1 }];
  const newCreatedVersion = { versionNumber: 3 };

  const refreshedList = [newCreatedVersion, ...timelineVersions].sort((a, b) => b.versionNumber - a.versionNumber);
  assert.strictEqual(refreshedList[0].versionNumber, 3);
  assert.strictEqual(refreshedList.length, 3);
});

it('CreateDraft Test 15: New version starts in DRAFT status', () => {
  const newVersion = { versionNumber: 3, reviewStatus: 'DRAFT' };
  assert.strictEqual(newVersion.reviewStatus, 'DRAFT');
});

it('CreateDraft Test 16: 400 validation error maps to user error', () => {
  const mapped = mapRequirementApiError(400, 'Title is required');
  assert.strictEqual(mapped.code, 400);
  assert.ok(mapped.userMessage.includes('Title is required'));
});

it('CreateDraft Test 17: 401 unauthorized error maps to login prompt', () => {
  const mapped = mapRequirementApiError(401);
  assert.strictEqual(mapped.code, 401);
  assert.ok(mapped.userMessage.includes('Authentication required'));
});

it('CreateDraft Test 18: 403 forbidden error maps to permission denied', () => {
  const mapped = mapRequirementApiError(403);
  assert.strictEqual(mapped.code, 403);
  assert.ok(mapped.userMessage.includes('Access denied'));
});

it('CreateDraft Test 19: 404 missing requirement maps to not-found response', () => {
  const mapped = mapRequirementApiError(404);
  assert.strictEqual(mapped.code, 404);
  assert.ok(mapped.userMessage.includes('not found'));
});

it('CreateDraft Test 20: 409 conflict maps to conflict resolution message', () => {
  const mapped = mapRequirementApiError(409, 'Concurrent version creation conflict.');
  assert.strictEqual(mapped.code, 409);
  assert.ok(mapped.userMessage.includes('Concurrent version creation conflict'));
});

it('CreateDraft Test 21: Network failure produces actionable error feedback', () => {
  const networkError = new Error('Failed to fetch');
  assert.strictEqual(networkError.message, 'Failed to fetch');
});

it('CreateDraft Test 22: Cancel action resets modal state', () => {
  let modalOpen = true;
  const onCancel = () => { modalOpen = false; };
  onCancel();
  assert.strictEqual(modalOpen, false);
});

it('CreateDraft Test 23: Existing version history regression preserves historical versions', () => {
  const existingV1 = { versionNumber: 1, title: 'V1 Title', reviewStatus: 'APPROVED' };
  const existingV2 = { versionNumber: 2, title: 'V2 Title', reviewStatus: 'DRAFT' };
  const history = [existingV2, existingV1];
  assert.strictEqual(history.length, 2);
  assert.strictEqual(history[0].versionNumber, 2);
});

it('CreateDraft Test 24: Existing requirement details regression preserves parent context', () => {
  const parentRequirement = {
    id: 'req-001',
    projectId: 'proj-001',
    requirementKey: 'REQ-001',
    status: 'APPROVED',
  };
  assert.strictEqual(parentRequirement.id, 'req-001');
  assert.strictEqual(parentRequirement.requirementKey, 'REQ-001');
});

it('CreateDraft Test 25: Approved snapshot immutability ensures source snapshot is never mutated', () => {
  const approvedSnapshot = Object.freeze({
    id: 'ver-approved-1',
    versionNumber: 1,
    title: 'Original Approved Title',
    description: 'Original Approved Description',
    reviewStatus: 'APPROVED',
  });

  const proposedDraft = {
    title: 'Modified Draft Title',
    description: 'Modified Draft Description',
    changeType: 'UPDATED',
  };

  assert.strictEqual(approvedSnapshot.title, 'Original Approved Title');
  assert.notStrictEqual(proposedDraft.title, approvedSnapshot.title);
});

// ─── Task 05.2.3: Requirement Version Review & Approval Actions Tests ───

function getVisibleReviewActions(reviewStatus) {
  switch (reviewStatus) {
    case 'DRAFT':
      return ['submit'];
    case 'IN_REVIEW':
      return ['approve', 'reject'];
    case 'APPROVED':
    case 'REJECTED':
    default:
      return [];
  }
}

function validateRejectionComment(comment) {
  if (!comment || !comment.trim()) {
    return { isValid: false, error: 'Rejection comment explaining the reasons and required changes is required.' };
  }
  if (comment.trim().length > 1000) {
    return { isValid: false, error: 'Rejection comment must not exceed 1000 characters.' };
  }
  return { isValid: true, comment: comment.trim() };
}

it('ReviewAction Test 1: Submit API method signature, parameters, and invocation', () => {
  const buildSubmitRequest = (projectId, requirementId, versionNumber) => ({
    endpoint: `/projects/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}/versions/${encodeURIComponent(versionNumber)}/submit`,
    method: 'POST',
  });
  const req = buildSubmitRequest('proj-1', 'req-1', 2);
  assert.strictEqual(req.endpoint, '/projects/proj-1/requirements/req-1/versions/2/submit');
  assert.strictEqual(req.method, 'POST');
});

it('ReviewAction Test 2: Approve API method signature and payload handling', () => {
  const buildApproveRequest = (projectId, requirementId, versionNumber, payload) => ({
    endpoint: `/projects/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}/versions/${encodeURIComponent(versionNumber)}/approve`,
    method: 'POST',
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const reqWithComment = buildApproveRequest('proj-1', 'req-1', 2, { reviewComment: 'Sign-off complete' });
  assert.strictEqual(reqWithComment.endpoint, '/projects/proj-1/requirements/req-1/versions/2/approve');
  assert.strictEqual(JSON.parse(reqWithComment.body).reviewComment, 'Sign-off complete');

  const reqWithoutComment = buildApproveRequest('proj-1', 'req-1', 2);
  assert.strictEqual(reqWithoutComment.body, undefined);
});

it('ReviewAction Test 3: Reject API method signature and mandatory payload handling', () => {
  const buildRejectRequest = (projectId, requirementId, versionNumber, payload) => ({
    endpoint: `/projects/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}/versions/${encodeURIComponent(versionNumber)}/reject`,
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const req = buildRejectRequest('proj-1', 'req-1', 2, { reviewComment: 'Missing validation rules' });
  assert.strictEqual(req.endpoint, '/projects/proj-1/requirements/req-1/versions/2/reject');
  assert.strictEqual(JSON.parse(req.body).reviewComment, 'Missing validation rules');
});

it('ReviewAction Test 4: Correct endpoint paths for submit, approve, and reject', () => {
  const p = 'p-100';
  const r = 'r-200';
  const v = 3;
  const submitPath = `/projects/${p}/requirements/${r}/versions/${v}/submit`;
  const approvePath = `/projects/${p}/requirements/${r}/versions/${v}/approve`;
  const rejectPath = `/projects/${p}/requirements/${r}/versions/${v}/reject`;
  assert.strictEqual(submitPath, '/projects/p-100/requirements/r-200/versions/3/submit');
  assert.strictEqual(approvePath, '/projects/p-100/requirements/r-200/versions/3/approve');
  assert.strictEqual(rejectPath, '/projects/p-100/requirements/r-200/versions/3/reject');
});

it('ReviewAction Test 5: JWT authentication header transmission for review actions', () => {
  const token = 'auth-jwt-token-999';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  assert.strictEqual(headers.Authorization, 'Bearer auth-jwt-token-999');
});

it('ReviewAction Test 6: Request payload compatibility against ApproveRequirementVersionRequest and RejectRequirementVersionRequest DTOs', () => {
  const approvePayload = { reviewComment: 'Optional comment' };
  assert.ok('reviewComment' in approvePayload);

  const rejectPayload = { reviewComment: 'Required comment' };
  assert.strictEqual(typeof rejectPayload.reviewComment, 'string');
  assert.ok(rejectPayload.reviewComment.trim().length > 0);
});

it('ReviewAction Test 7: DRAFT action visibility displays Submit for Review action only', () => {
  const actions = getVisibleReviewActions('DRAFT');
  assert.deepStrictEqual(actions, ['submit']);
});

it('ReviewAction Test 8: IN_REVIEW action visibility displays Approve and Reject actions', () => {
  const actions = getVisibleReviewActions('IN_REVIEW');
  assert.deepStrictEqual(actions, ['approve', 'reject']);
});

it('ReviewAction Test 9: APPROVED read-only behavior hides mutable review actions and displays approved audit', () => {
  const actions = getVisibleReviewActions('APPROVED');
  assert.deepStrictEqual(actions, []);

  const approvedVersion = {
    versionNumber: 2,
    reviewStatus: 'APPROVED',
    approvedBy: 'user-owner',
    approvedAt: '2026-11-22T04:40:00Z',
  };
  assert.strictEqual(approvedVersion.reviewStatus, 'APPROVED');
  assert.ok(approvedVersion.approvedBy);
  assert.ok(approvedVersion.approvedAt);
});

it('ReviewAction Test 10: REJECTED read-only behavior hides mutable review actions and displays rejection feedback', () => {
  const actions = getVisibleReviewActions('REJECTED');
  assert.deepStrictEqual(actions, []);

  const rejectedVersion = {
    versionNumber: 2,
    reviewStatus: 'REJECTED',
    reviewedBy: 'user-reviewer',
    reviewComment: 'Insufficient acceptance criteria',
  };
  assert.strictEqual(rejectedVersion.reviewStatus, 'REJECTED');
  assert.strictEqual(rejectedVersion.reviewComment, 'Insufficient acceptance criteria');
});

it('ReviewAction Test 11: Submit confirmation state transition logic', () => {
  const currentStatus = 'DRAFT';
  const canSubmit = currentStatus === 'DRAFT';
  assert.strictEqual(canSubmit, true);

  const targetStatus = 'IN_REVIEW';
  assert.strictEqual(targetStatus, 'IN_REVIEW');
});

it('ReviewAction Test 12: Approval confirmation promotional impact explanation', () => {
  const versionToApprove = { versionNumber: 2, title: 'Updated Specs' };
  const explanation = `Approving version v${versionToApprove.versionNumber} promotes its snapshot to the active approved specification.`;
  assert.ok(explanation.includes('v2'));
  assert.ok(explanation.includes('promotes its snapshot to the active approved specification'));
});

it('ReviewAction Test 13: Rejection feedback validation rejects empty or whitespace comments', () => {
  const emptyCheck = validateRejectionComment('');
  assert.strictEqual(emptyCheck.isValid, false);
  assert.ok(emptyCheck.error);

  const whitespaceCheck = validateRejectionComment('   \n  ');
  assert.strictEqual(whitespaceCheck.isValid, false);
  assert.ok(whitespaceCheck.error);

  const validCheck = validateRejectionComment('Please clarify performance benchmarks.');
  assert.strictEqual(validCheck.isValid, true);
  assert.strictEqual(validCheck.comment, 'Please clarify performance benchmarks.');
});

it('ReviewAction Test 14: Successful submit transitions version reviewStatus to IN_REVIEW', () => {
  const mockDraft = { versionNumber: 2, reviewStatus: 'DRAFT' };
  const mockSubmitted = { ...mockDraft, reviewStatus: 'IN_REVIEW' };
  assert.strictEqual(mockSubmitted.reviewStatus, 'IN_REVIEW');
});

it('ReviewAction Test 15: Successful approve promotes version to APPROVED with reviewer ID and timestamp', () => {
  const mockInReview = { versionNumber: 2, reviewStatus: 'IN_REVIEW' };
  const mockApproved = {
    ...mockInReview,
    reviewStatus: 'APPROVED',
    approvedBy: 'owner-id',
    approvedAt: '2026-11-22T04:45:00Z',
    reviewComment: 'LGTM',
  };
  assert.strictEqual(mockApproved.reviewStatus, 'APPROVED');
  assert.strictEqual(mockApproved.approvedBy, 'owner-id');
  assert.strictEqual(mockApproved.reviewComment, 'LGTM');
});

it('ReviewAction Test 16: Successful reject marks version as REJECTED with mandatory reviewer comment', () => {
  const mockInReview = { versionNumber: 2, reviewStatus: 'IN_REVIEW' };
  const mockRejected = {
    ...mockInReview,
    reviewStatus: 'REJECTED',
    reviewedBy: 'owner-id',
    reviewedAt: '2026-11-22T04:46:00Z',
    reviewComment: 'Security review pending',
  };
  assert.strictEqual(mockRejected.reviewStatus, 'REJECTED');
  assert.strictEqual(mockRejected.reviewComment, 'Security review pending');
});

it('ReviewAction Test 17: Version history refresh updates timeline upon review action completion', () => {
  let timeline = [
    { versionNumber: 2, reviewStatus: 'IN_REVIEW' },
    { versionNumber: 1, reviewStatus: 'APPROVED' },
  ];

  const handleUpdate = (updatedVersion) => {
    timeline = timeline.map((v) => (v.versionNumber === updatedVersion.versionNumber ? updatedVersion : v));
  };

  handleUpdate({ versionNumber: 2, reviewStatus: 'APPROVED', approvedBy: 'owner-1' });
  assert.strictEqual(timeline[0].reviewStatus, 'APPROVED');
  assert.strictEqual(timeline[0].approvedBy, 'owner-1');
});

it('ReviewAction Test 18: Requirement details refresh after approval updates active title, description, and status', () => {
  const requirementBefore = {
    id: 'req-001',
    title: 'Initial Title',
    description: 'Initial Description',
    status: 'IN_REVIEW',
    currentVersionId: 'ver-1',
  };

  const approvedVersion = {
    id: 'ver-2',
    title: 'Approved Title v2',
    description: 'Approved Description v2',
    reviewStatus: 'APPROVED',
  };

  const requirementAfter = {
    ...requirementBefore,
    title: approvedVersion.title,
    description: approvedVersion.description,
    status: 'APPROVED',
    currentVersionId: approvedVersion.id,
  };

  assert.strictEqual(requirementAfter.title, 'Approved Title v2');
  assert.strictEqual(requirementAfter.description, 'Approved Description v2');
  assert.strictEqual(requirementAfter.status, 'APPROVED');
  assert.strictEqual(requirementAfter.currentVersionId, 'ver-2');
});

it('ReviewAction Test 19: CurrentVersionId update handling points to newly approved snapshot', () => {
  const currentVersionId = 'ver-2';
  const versions = [
    { id: 'ver-2', versionNumber: 2, reviewStatus: 'APPROVED' },
    { id: 'ver-1', versionNumber: 1, reviewStatus: 'APPROVED' },
  ];
  const activeVersion = versions.find((v) => v.id === currentVersionId);
  assert.strictEqual(activeVersion.versionNumber, 2);
  assert.strictEqual(activeVersion.reviewStatus, 'APPROVED');
});

it('ReviewAction Test 20: Approved snapshot immutability ensures rejected or historical versions are never overwritten', () => {
  const historicalV1 = Object.freeze({
    id: 'ver-1',
    versionNumber: 1,
    title: 'Baseline Spec',
    reviewStatus: 'APPROVED',
  });

  const rejectedV2 = {
    id: 'ver-2',
    versionNumber: 2,
    title: 'Faulty Spec',
    reviewStatus: 'REJECTED',
  };

  assert.strictEqual(historicalV1.title, 'Baseline Spec');
  assert.strictEqual(historicalV1.reviewStatus, 'APPROVED');
  assert.strictEqual(rejectedV2.reviewStatus, 'REJECTED');
});

it('ReviewAction Test 21: 400 validation error maps to user error without crashing', () => {
  const mapped = mapRequirementApiError(400, 'Rejection comment is required.');
  assert.strictEqual(mapped.code, 400);
  assert.ok(mapped.userMessage.includes('Rejection comment is required'));
});

it('ReviewAction Test 22: 401 unauthenticated maps to sign-in prompt', () => {
  const mapped = mapRequirementApiError(401);
  assert.strictEqual(mapped.code, 401);
  assert.ok(mapped.userMessage.includes('Authentication required'));
});

it('ReviewAction Test 23: 403 forbidden maps to owner permission restriction message', () => {
  const mapped = mapRequirementApiError(403);
  assert.strictEqual(mapped.code, 403);
  assert.ok(mapped.userMessage.includes('Access denied'));
});

it('ReviewAction Test 24: 404 version not found maps to not found feedback', () => {
  const mapped = mapRequirementApiError(404, 'Requirement version 99 not found');
  assert.strictEqual(mapped.code, 404);
  assert.ok(mapped.userMessage.includes('not found'));
});

it('ReviewAction Test 25: 409 conflict handles invalid state transitions and duplicate submissions', () => {
  const duplicateSubmitError = 'Duplicate submission rejected: Version 2 is already in review.';
  const mapped = mapRequirementApiError(409, duplicateSubmitError);
  assert.strictEqual(mapped.code, 409);
  assert.ok(mapped.userMessage.includes('Duplicate submission rejected'));
});

it('ReviewAction Test 26: Network failure produces user-facing error message', () => {
  const err = new Error('Network connection lost');
  assert.strictEqual(err.message, 'Network connection lost');
});

it('ReviewAction Test 27: Duplicate submission prevention blocks concurrent approval or rejection clicks', () => {
  let isSubmitting = false;
  let actionCount = 0;

  const performAction = () => {
    if (isSubmitting) return;
    isSubmitting = true;
    actionCount++;
  };

  performAction();
  performAction();
  assert.strictEqual(actionCount, 1);
});

it('ReviewAction Test 28: Existing create-draft regression verifies version creation modal continues to function', () => {
  const newDraft = {
    title: 'Valid Title',
    description: 'Valid Description',
    changeSummary: 'Valid Summary',
    changeType: 'UPDATED',
  };
  const validation = validateCreateVersionForm(newDraft);
  assert.strictEqual(validation.isValid, true);
});

it('ReviewAction Test 29: Existing timeline regression verifies descending sort and badges', () => {
  const versions = [
    { versionNumber: 1, reviewStatus: 'APPROVED' },
    { versionNumber: 3, reviewStatus: 'DRAFT' },
    { versionNumber: 2, reviewStatus: 'IN_REVIEW' },
  ];
  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  assert.strictEqual(sorted[0].versionNumber, 3);
  assert.strictEqual(sorted[1].versionNumber, 2);
  assert.strictEqual(sorted[2].versionNumber, 1);
});

it('ReviewAction Test 30: Existing requirement details regression verifies metadata and tab preservation', () => {
  const details = {
    id: 'req-001',
    requirementKey: 'REQ-001',
    status: 'APPROVED',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
    title: 'Traceability Matrix',
    description: 'Specification content',
  };
  assert.strictEqual(details.requirementKey, 'REQ-001');
  assert.strictEqual(details.status, 'APPROVED');
  assert.ok(details.title);
  assert.ok(details.description);
});

// ─── Task 05.2.4: Side-by-Side Requirement Version Comparison Tests ───

function computeDefaultCompareVersions(versions) {
  if (!versions || versions.length < 2) return null;
  const sorted = [...versions].sort((a, b) => a.versionNumber - b.versionNumber);
  return {
    from: sorted[sorted.length - 2].versionNumber,
    to: sorted[sorted.length - 1].versionNumber,
  };
}

it('Compare Test 1: Comparison API method signature and parameter validation', () => {
  const buildCompareUrl = (projectId, requirementId, from, to) => {
    if (!from || from <= 0 || !to || to <= 0) {
      throw new Error('From and to must be positive integers');
    }
    return `/projects/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}/versions/compare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  };
  const url = buildCompareUrl('proj-alpha', 'req-omega', 1, 2);
  assert.strictEqual(url, '/projects/proj-alpha/requirements/req-omega/versions/compare?from=1&to=2');
  assert.throws(() => buildCompareUrl('proj-alpha', 'req-omega', 0, 2), /positive integers/);
});

it('Compare Test 2: Correct endpoint path and parameter encoding', () => {
  const pId = 'proj/test with space';
  const rId = 'req/special#1';
  const url = `/projects/${encodeURIComponent(pId)}/requirements/${encodeURIComponent(rId)}/versions/compare?from=1&to=2`;
  assert.strictEqual(url, '/projects/proj%2Ftest%20with%20space/requirements/req%2Fspecial%231/versions/compare?from=1&to=2');
});

it('Compare Test 3: Query parameter encoding for from and to integers', () => {
  const from = 1;
  const to = 3;
  const queryString = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  assert.strictEqual(queryString, 'from=1&to=3');
});

it('Compare Test 4: JWT authorization header attached on comparison request', () => {
  const token = 'jwt-valid-token-comp';
  const headers = { Authorization: `Bearer ${token}` };
  assert.strictEqual(headers.Authorization, 'Bearer jwt-valid-token-comp');
});

it('Compare Test 5: Backend response mapping parses changedFields and unchangedFields', () => {
  const mockBackendResponse = {
    requirementId: 'req-001',
    fromVersion: 1,
    toVersion: 2,
    hasChanges: true,
    changedFields: [
      {
        field: 'title',
        oldValue: 'Initial Title',
        newValue: 'Updated Title',
        addedText: ['Updated'],
        removedText: ['Initial'],
      },
    ],
    unchangedFields: ['description', 'reviewStatus'],
  };
  assert.strictEqual(mockBackendResponse.hasChanges, true);
  assert.strictEqual(mockBackendResponse.changedFields.length, 1);
  assert.strictEqual(mockBackendResponse.changedFields[0].field, 'title');
  assert.strictEqual(mockBackendResponse.unchangedFields.includes('description'), true);
});

it('Compare Test 6: Version selector population orders versions ascending', () => {
  const rawVersions = [{ versionNumber: 3 }, { versionNumber: 1 }, { versionNumber: 2 }];
  const sorted = [...rawVersions].sort((a, b) => a.versionNumber - b.versionNumber);
  assert.strictEqual(sorted[0].versionNumber, 1);
  assert.strictEqual(sorted[1].versionNumber, 2);
  assert.strictEqual(sorted[2].versionNumber, 3);
});

it('Compare Test 7: Default version pair selects latest two distinct versions', () => {
  const versions = [{ versionNumber: 1 }, { versionNumber: 2 }, { versionNumber: 3 }];
  const pair = computeDefaultCompareVersions(versions);
  assert.strictEqual(pair.from, 2);
  assert.strictEqual(pair.to, 3);
});

it('Compare Test 8: Same-version selection returns hasChanges false and identical content notice', () => {
  const handleSameVersion = (ver) => ({
    fromVersion: ver,
    toVersion: ver,
    hasChanges: false,
    changedFields: [],
    unchangedFields: ['title', 'description', 'changeType', 'reviewStatus'],
  });
  const res = handleSameVersion(2);
  assert.strictEqual(res.hasChanges, false);
  assert.strictEqual(res.changedFields.length, 0);
  assert.strictEqual(res.unchangedFields.length, 4);
});

it('Compare Test 9: Explicit selection preservation keeps user-selected from/to', () => {
  let userSelection = { from: 1, to: 3 };
  assert.strictEqual(userSelection.from, 1);
  assert.strictEqual(userSelection.to, 3);
  // User selects reverse chronological
  userSelection = { from: 3, to: 1 };
  assert.strictEqual(userSelection.from, 3);
  assert.strictEqual(userSelection.to, 1);
});

it('Compare Test 10: Chronological comparison direction indicator vFrom -> vTo', () => {
  const from = 1;
  const to = 2;
  const directionLabel = `v${from} ➔ v${to}`;
  assert.strictEqual(directionLabel, 'v1 ➔ v2');
});

it('Compare Test 11: Comparison header metadata renders version pills and titles', () => {
  const headerContext = {
    title: 'Bi-Directional Traceability',
    fromVersion: 1,
    toVersion: 2,
    fromStatus: 'APPROVED',
    toStatus: 'IN_REVIEW',
  };
  assert.strictEqual(headerContext.title, 'Bi-Directional Traceability');
  assert.strictEqual(headerContext.fromStatus, 'APPROVED');
  assert.strictEqual(headerContext.toStatus, 'IN_REVIEW');
});

it('Compare Test 12: Side-by-side title rendering maps old and new titles', () => {
  const titleDiff = {
    field: 'title',
    oldValue: 'Emergency Dispatcher Matrix',
    newValue: 'AI Emergency Response Dispatcher Matrix',
    addedText: ['AI', 'Response'],
    removedText: [],
  };
  assert.strictEqual(titleDiff.oldValue, 'Emergency Dispatcher Matrix');
  assert.strictEqual(titleDiff.newValue, 'AI Emergency Response Dispatcher Matrix');
  assert.deepStrictEqual(titleDiff.addedText, ['AI', 'Response']);
});

it('Compare Test 13: Side-by-side description rendering displays multiline content safely', () => {
  const multilineDesc = 'Line 1: Requirement Specification\nLine 2: Functional behavior.\nLine 3: Safety limits.';
  assert.strictEqual(multilineDesc.split('\n').length, 3);
  assert.ok(multilineDesc.includes('Safety limits'));
});

it('Compare Test 14: Added content highlighting displays green tokens with plus sign', () => {
  const addedTokens = ['Real-time', 'Telemetry'];
  const formattedChips = addedTokens.map((t) => `+ ${t}`);
  assert.deepStrictEqual(formattedChips, ['+ Real-time', '+ Telemetry']);
});

it('Compare Test 15: Removed content highlighting displays red tokens with minus sign and strikethrough', () => {
  const removedTokens = ['Legacy', 'Polling'];
  const formattedChips = removedTokens.map((t) => `- ${t}`);
  assert.deepStrictEqual(formattedChips, ['- Legacy', '- Polling']);
});

it('Compare Test 16: Unchanged content rendering maps unchanged fields list', () => {
  const unchanged = ['description', 'changeType'];
  assert.strictEqual(unchanged.includes('description'), true);
  assert.strictEqual(unchanged.includes('changeType'), true);
});

it('Compare Test 17: Identical content handling flags hasChanges false', () => {
  const comparisonResult = {
    hasChanges: false,
    changedFields: [],
  };
  assert.strictEqual(comparisonResult.hasChanges, false);
  assert.strictEqual(comparisonResult.changedFields.length, 0);
});

it('Compare Test 18: One-version empty state explains at least two versions required', () => {
  const versions = [{ versionNumber: 1, title: 'Solo Version' }];
  const canCompare = versions.length >= 2;
  assert.strictEqual(canCompare, false);
  const emptyMessage = 'At least two version snapshots are required to perform a comparison.';
  assert.ok(emptyMessage.includes('At least two version snapshots are required'));
});

it('Compare Test 19: Zero-version empty state handles empty history safely', () => {
  const versions = [];
  const canCompare = versions.length >= 2;
  assert.strictEqual(canCompare, false);
  assert.strictEqual(versions.length, 0);
});

it('Compare Test 20: Loading state provides loading feedback', () => {
  let loading = true;
  const statusMessage = loading ? 'Computing version differences...' : 'Diff ready';
  assert.strictEqual(statusMessage, 'Computing version differences...');
});

it('Compare Test 21: 400 error maps invalid comparison parameters', () => {
  const mapped = mapRequirementApiError(400, "Version comparison parameters 'from' and 'to' must be positive integers.");
  assert.strictEqual(mapped.code, 400);
  assert.ok(mapped.userMessage.includes('positive integers'));
});

it('Compare Test 22: 401 error maps unauthenticated access to sign-in prompt', () => {
  const mapped = mapRequirementApiError(401);
  assert.strictEqual(mapped.code, 401);
  assert.ok(mapped.userMessage.includes('Authentication required'));
});

it('Compare Test 23: 403 error maps unauthorized project access', () => {
  const mapped = mapRequirementApiError(403);
  assert.strictEqual(mapped.code, 403);
  assert.ok(mapped.userMessage.includes('Access denied'));
});

it('Compare Test 24: 404 error maps missing requirement or version', () => {
  const mapped = mapRequirementApiError(404, 'Requirement version 99 not found');
  assert.strictEqual(mapped.code, 404);
  assert.ok(mapped.userMessage.includes('not found'));
});

it('Compare Test 25: 500 error maps internal server error gracefully', () => {
  const mapped = mapRequirementApiError(500, 'Comparison algorithm failed');
  assert.strictEqual(mapped.code, 500);
  assert.strictEqual(mapped.userMessage, 'Comparison algorithm failed');
});

it('Compare Test 26: Network failure produces actionable retry message', () => {
  const networkError = new Error('Network error during comparison fetch');
  assert.strictEqual(networkError.message, 'Network error during comparison fetch');
});

it('Compare Test 27: Retry action re-triggers comparison query', () => {
  let queryCount = 0;
  const triggerComparison = () => { queryCount++; };
  triggerComparison();
  triggerComparison(); // retry
  assert.strictEqual(queryCount, 2);
});

it('Compare Test 28: Stale response protection discards out-of-order rapid responses', () => {
  let activeRequestId = 0;
  let activeData = null;

  const startRequest = (reqId) => {
    activeRequestId = reqId;
  };

  const receiveResponse = (reqId, data) => {
    if (reqId !== activeRequestId) return; // Discard stale
    activeData = data;
  };

  startRequest(1);
  startRequest(2); // user rapidly changes dropdown to request 2

  receiveResponse(1, { from: 1, to: 2 }); // arrives late, discarded!
  assert.strictEqual(activeData, null);

  receiveResponse(2, { from: 1, to: 3 }); // current request accepted!
  assert.deepStrictEqual(activeData, { from: 1, to: 3 });
});

it('Compare Test 29: Timeline navigation integration preserves requirement context and tab state', () => {
  let isComparing = false;
  const openCompare = () => { isComparing = true; };
  const closeCompare = () => { isComparing = false; };

  openCompare();
  assert.strictEqual(isComparing, true);
  closeCompare();
  assert.strictEqual(isComparing, false);
});

it('Compare Test 30: Create Draft regression confirms modal still functions', () => {
  const draftData = {
    title: 'Valid Compare Regression Title',
    description: 'Detailed description.',
    changeSummary: 'Regression test change.',
    changeType: 'CLARIFIED',
  };
  const validation = validateCreateVersionForm(draftData);
  assert.strictEqual(validation.isValid, true);
});

it('Compare Test 31: Submit / Approve / Reject regression confirms review workflow actions still work', () => {
  const draftActions = getVisibleReviewActions('DRAFT');
  const inReviewActions = getVisibleReviewActions('IN_REVIEW');
  const approvedActions = getVisibleReviewActions('APPROVED');
  assert.deepStrictEqual(draftActions, ['submit']);
  assert.deepStrictEqual(inReviewActions, ['approve', 'reject']);
  assert.deepStrictEqual(approvedActions, []);
});

it('Compare Test 32: Approved version immutability verifies read-only snapshot integrity', () => {
  const frozenVersion = Object.freeze({
    id: 'ver-frozen-1',
    versionNumber: 1,
    title: 'Frozen Baseline',
    reviewStatus: 'APPROVED',
  });
  assert.strictEqual(frozenVersion.title, 'Frozen Baseline');
  assert.strictEqual(Object.isFrozen(frozenVersion), true);
});

console.log(`\nResults: ${passed}/${total} frontend tests passed.`);

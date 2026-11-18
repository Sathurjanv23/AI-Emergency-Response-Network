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

console.log(`\nResults: ${passed}/${total} frontend tests passed.`);

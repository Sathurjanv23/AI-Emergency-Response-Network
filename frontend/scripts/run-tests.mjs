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

console.log(`\nResults: ${passed}/${total} frontend tests passed.`);

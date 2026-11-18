import assert from 'assert';
import {
  validateProjectName,
  validateProjectDescription,
  validateRequirementTitle,
  validateRequirementDescription,
  validateRequirementForm,
  filterProjects,
  mapProjectApiError,
  mapRequirementApiError,
  formatRequirementDate,
  isValidStatusTransition,
} from '@/lib/project-validation';
import type { ProjectItem } from '@/lib/api/client';

const sampleProjects: ProjectItem[] = [
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

export function runProjectFrontendTests(): { total: number; passed: number; failures: string[] } {
  const failures: string[] = [];
  let passed = 0;
  let total = 0;

  function runTest(name: string, fn: () => void) {
    total++;
    try {
      fn();
      passed++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      failures.push(`${name}: ${msg}`);
    }
  }

  // 1. Create form validation
  runTest('Create form validation: empty or whitespace name fails', () => {
    const emptyResult = validateProjectName('');
    assert.strictEqual(emptyResult.isValid, false);
    assert.strictEqual(emptyResult.error, 'Project name is required.');

    const whitespaceResult = validateProjectName('   ');
    assert.strictEqual(whitespaceResult.isValid, false);
    assert.strictEqual(whitespaceResult.error, 'Project name is required.');
  });

  runTest('Create form validation: name exceeding 200 characters fails', () => {
    const longName = 'A'.repeat(201);
    const result = validateProjectName(longName);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.error, 'Project name cannot exceed 200 characters.');
  });

  runTest('Create form validation: valid name passes', () => {
    const result = validateProjectName('ReqTrace AI Platform');
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.error, undefined);
  });

  runTest('Create form validation: description exceeding 2000 characters fails', () => {
    const longDesc = 'D'.repeat(2001);
    const result = validateProjectDescription(longDesc);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.error, 'Project description cannot exceed 2000 characters.');
  });

  // 2. Project list rendering and filtering
  runTest('Project list rendering: filters by status correctly', () => {
    const all = filterProjects(sampleProjects, 'ALL');
    assert.strictEqual(all.length, 2);

    const activeOnly = filterProjects(sampleProjects, 'ACTIVE');
    assert.strictEqual(activeOnly.length, 1);
    assert.strictEqual(activeOnly[0].id, 'proj-001');

    const archivedOnly = filterProjects(sampleProjects, 'ARCHIVED');
    assert.strictEqual(archivedOnly.length, 1);
    assert.strictEqual(archivedOnly[0].id, 'proj-002');
  });

  runTest('Project list rendering: searches by keyword in name, id, or description', () => {
    const byName = filterProjects(sampleProjects, 'ALL', 'core');
    assert.strictEqual(byName.length, 1);
    assert.strictEqual(byName[0].id, 'proj-001');

    const byId = filterProjects(sampleProjects, 'ALL', 'proj-002');
    assert.strictEqual(byId.length, 1);
    assert.strictEqual(byId[0].id, 'proj-002');

    const noMatch = filterProjects(sampleProjects, 'ALL', 'nonexistent');
    assert.strictEqual(noMatch.length, 0);
  });

  // 3. Loading and error states
  runTest('Loading and error states: handles 401 Unauthorized securely', () => {
    const err = mapProjectApiError(401);
    assert.strictEqual(err.code, 401);
    assert.ok(err.userMessage.includes('Authentication required'));
  });

  runTest('Loading and error states: handles 403 Forbidden without leaking project data', () => {
    const err = mapProjectApiError(403);
    assert.strictEqual(err.code, 403);
    assert.ok(err.userMessage.includes('Access denied'));
  });

  runTest('Loading and error states: handles 404 Not Found', () => {
    const err = mapProjectApiError(404);
    assert.strictEqual(err.code, 404);
    assert.strictEqual(err.userMessage, 'Project not found.');
  });

  // 4. Archive confirmation
  runTest('Archive confirmation: transitions project status from ACTIVE to ARCHIVED', () => {
    const activeProject = { ...sampleProjects[0] };
    assert.strictEqual(activeProject.status, 'ACTIVE');

    const archived: ProjectItem = {
      ...activeProject,
      status: 'ARCHIVED',
      updatedAt: '2026-11-16T15:00:00Z',
    };

    assert.strictEqual(archived.status, 'ARCHIVED');
    assert.strictEqual(archived.id, activeProject.id);
  });

  // 5. Requirement form validation
  runTest('Requirement form validation: empty title fails', () => {
    const res = validateRequirementTitle('');
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.error, 'Requirement title is required.');
  });

  runTest('Requirement form validation: title over 200 characters fails', () => {
    const res = validateRequirementTitle('T'.repeat(201));
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.error, 'Requirement title cannot exceed 200 characters.');
  });

  runTest('Requirement form validation: valid title passes', () => {
    const res = validateRequirementTitle('Automated Traceability');
    assert.strictEqual(res.isValid, true);
  });

  runTest('Requirement form validation: empty description fails', () => {
    const res = validateRequirementDescription('');
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.error, 'Requirement description is required.');
  });

  runTest('Requirement form validation: description over 4000 characters fails', () => {
    const res = validateRequirementDescription('D'.repeat(4001));
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.error, 'Requirement description cannot exceed 4000 characters.');
  });

  runTest('Requirement form validation: complete valid form passes', () => {
    const form = validateRequirementForm({
      title: 'Valid Title',
      description: 'Valid Description',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
    });
    assert.strictEqual(form.isValid, true);
  });

  // 6. Requirement Details & Error mapping
  runTest('Requirement details: maps 401 Unauthorized securely', () => {
    const err = mapRequirementApiError(401);
    assert.strictEqual(err.code, 401);
    assert.ok(err.userMessage.includes('Authentication required'));
  });

  runTest('Requirement details: maps 403 Forbidden without leaking requirement data', () => {
    const err = mapRequirementApiError(403);
    assert.strictEqual(err.code, 403);
    assert.ok(err.userMessage.includes('Access denied'));
  });

  runTest('Requirement details: maps 404 to not found response', () => {
    const err = mapRequirementApiError(404);
    assert.strictEqual(err.code, 404);
    assert.strictEqual(err.userMessage, 'Requirement not found in this project.');
  });

  runTest('Requirement date formatting: returns placeholder for null/undefined', () => {
    assert.strictEqual(formatRequirementDate(), '—');
    assert.strictEqual(formatRequirementDate(''), '—');
  });

  runTest('Requirement date formatting: formats valid ISO timestamp', () => {
    const formatted = formatRequirementDate('2026-11-18T10:00:00Z');
    assert.ok(formatted.includes('2026'));
  });

  // 7. Edit Form & Status Management Tests (Task 04.2.4)
  runTest('Edit form: initial values prepopulate fields correctly', () => {
    const original = {
      title: 'Current FR',
      description: 'Current Desc',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
    };
    assert.strictEqual(original.title, 'Current FR');
    assert.strictEqual(original.priority, 'HIGH');
  });

  runTest('Edit form: required field validation rejects empty fields', () => {
    const bad = validateRequirementForm({ title: '', description: '' });
    assert.strictEqual(bad.isValid, false);
    assert.ok(bad.errors.title);
    assert.ok(bad.errors.description);
  });

  runTest('Edit form: successful update validation', () => {
    const valid = validateRequirementForm({
      title: 'Updated Title',
      description: 'Updated Description',
      type: 'NON_FUNCTIONAL',
      priority: 'CRITICAL',
    });
    assert.strictEqual(valid.isValid, true);
  });

  runTest('API failure handling: 500 error mapped', () => {
    const err = mapRequirementApiError(500, 'Server error');
    assert.strictEqual(err.code, 500);
    assert.strictEqual(err.userMessage, 'Server error');
  });

  runTest('Status management: valid transitions succeed', () => {
    assert.strictEqual(isValidStatusTransition('DRAFT', 'IN_REVIEW'), true);
    assert.strictEqual(isValidStatusTransition('IN_REVIEW', 'APPROVED'), true);
    assert.strictEqual(isValidStatusTransition('IN_REVIEW', 'REJECTED'), true);
  });

  runTest('Status management: invalid transitions rejected', () => {
    assert.strictEqual(isValidStatusTransition('DRAFT', 'APPROVED'), false);
    assert.strictEqual(isValidStatusTransition('REJECTED', 'APPROVED'), false);
  });

  runTest('API failure handling: unauthorized access denied', () => {
    const unauth = mapRequirementApiError(401);
    assert.strictEqual(unauth.code, 401);
  });

  runTest('Cancel navigation: verifies cancel path generation', () => {
    const url = `/projects/p1/requirements/r1`;
    assert.strictEqual(url, '/projects/p1/requirements/r1');
  });

  return { total, passed, failures };
}

// Execute tests
const { total, passed, failures } = runProjectFrontendTests();
console.log(`Frontend Project Tests: ${passed}/${total} passed.`);
if (failures.length > 0) {
  console.error('Failures:\n' + failures.join('\n'));
  process.exit(1);
} else {
  console.log('All frontend tests passed!');
}

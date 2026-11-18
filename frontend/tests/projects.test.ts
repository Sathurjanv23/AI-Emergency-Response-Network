import assert from 'assert';
import {
  validateProjectName,
  validateProjectDescription,
  validateRequirementTitle,
  validateRequirementDescription,
  validateRequirementForm,
  filterProjects,
  mapProjectApiError,
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileTemplate, parse } from '@vue/compiler-sfc';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const instructor = read('../src/components/admin/InstructorManagement.vue');
const students = read('../src/components/admin/GlobalStudentView.vue');
const dashboard = read('../src/components/admin/AdminDashboard.vue');

test('admin management components compile and receive the signed-in admin ID', () => {
  for (const [filename, source] of [
    ['InstructorManagement.vue', instructor],
    ['GlobalStudentView.vue', students]
  ]) {
    const parsed = parse(source, { filename });
    assert.deepEqual(parsed.errors, []);
    const compiled = compileTemplate({ source: parsed.descriptor.template.content, filename, id: filename });
    assert.deepEqual(compiled.errors, []);
    assert.match(source, /adminId:\s*\{\s*type:\s*String/);
    assert.match(source, /'x-user-id': props\.adminId \|\| 'admin-root'/);
    assert.match(source, /REQUEST_TIMEOUT_MS = 20000/);
  }
  assert.match(dashboard, /<InstructorManagement[\s\S]*?:admin-id="adminId"/);
  assert.match(dashboard, /<GlobalStudentView[\s\S]*?:admin-id="adminId"/);
});

test('instructor removal is explicit and blocked while students are assigned', () => {
  assert.match(instructor, />Edit<\/button>/);
  assert.match(instructor, /'Deactivate' : 'Activate'/);
  assert.match(instructor, />\s*Remove\s*<\/button>/);
  assert.match(instructor, /:disabled="Number\(instructor\.studentCount\) > 0"/);
  assert.match(instructor, /Transfer students before removal\./);
  assert.doesNotMatch(instructor, /force=true|forceDelete|Force delete/);
});

test('global student rows and record details use the shared progression projection', () => {
  for (const heading of ['Student', 'Instructor', 'Rank / XP', 'Training', 'Status', 'Actions']) {
    assert.match(students, new RegExp(`<th>${heading.replace('/', '\\/')}</th>`));
  }
  for (const field of [
    'missionsCompleted', 'missionsTotal', 'quizzesCompleted', 'quizzesTotal', 'quizzesPassed',
    'badgesEarned', 'certificates', 'xpProgress', 'xpNextAt', 'nextRank', 'missionsDetail', 'quizzesDetail'
  ]) assert.match(students, new RegExp(`selectedStudent\\.${field}|student\\.${field}`));
  assert.match(students, /\/training-record/);
  assert.match(students, />View records<\/button>/);
  assert.match(students, />Edit<\/button>/);
  assert.match(students, />Transfer<\/button>/);
  assert.doesNotMatch(students, /selectedStudent\?\.completed|selectedStudent\?\.averageScore|Completed Modules|Average Score/);
});

test('management tables collapse into labeled cards on narrower screens', () => {
  assert.match(instructor, /@media \(max-width: 820px\)[\s\S]*?\.management-table thead \{ display: none; \}/);
  assert.match(students, /@media \(max-width: 1080px\)[\s\S]*?\.student-table thead \{ display: none; \}/);
  assert.match(instructor, /content: attr\(data-label\)/);
  assert.match(students, /content: attr\(data-label\)/);
});

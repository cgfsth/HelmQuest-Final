import test from 'node:test';
import assert from 'node:assert/strict';
import { uniqueTrainingRecords, trainingRecordDate } from '../shared/trainingRecords.js';

test('mission aliases show one earned pass or the latest failure, with stable ordering', () => {
  const records = [
    { id: 'fail-later', studentId: 's', missionId: 'CUSTOM-m1', score: 10, passed: false, completedAt: '2026-11-20' },
    { id: 'earned', studentId: 's', missionId: 'm1', score: 80, passed: true, completedAt: '2026-11-18' },
    { id: 'old-fail', studentId: 's', missionId: 'm2', score: 50, passed: false, completedAt: '2026-11-19' },
    { id: 'latest-fail', studentId: 's', missionId: 'CUSTOM-m2', score: 0, passed: false, completedAt: '2026-11-21' },
  ];
  const before = JSON.stringify(records);
  const selected = uniqueTrainingRecords(records);
  assert.deepEqual(selected.map(record => record.id), ['latest-fail', 'earned']);
  assert.equal(selected[0].score, 0);
  assert.equal(JSON.stringify(records), before);
  assert.deepEqual(uniqueTrainingRecords([...records].reverse()), selected);
  assert.deepEqual(uniqueTrainingRecords(selected), selected);
});

test('quiz records group by quiz ID across module contexts and keep zero scores', () => {
  const records = [
    { id: 'older', quizId: 'q1', moduleId: 'm1', submittedAt: '2026-11-18', 'raw-score': 9 },
    { id: 'latest', quizId: 'q1', moduleId: 'm2', submittedAt: '2026-11-20', 'raw-score': 0, 'Quiz-score-percentage': 0 },
    { id: 'legacy-old', moduleId: 'm3', completedAt: '2026-11-18' },
    { id: 'legacy-latest', moduleId: 'm3', completedAt: '2026-11-19' },
  ];
  const selected = uniqueTrainingRecords(records, 'quiz');
  assert.deepEqual(selected.map(record => record.id), ['latest', 'legacy-latest']);
  assert.equal(selected[0]['raw-score'], 0);
  assert.equal(selected[0]['Quiz-score-percentage'], 0);
});

test('different activities, students and unidentified legacy rows never merge based on their title', () => {
  for (const kind of ['mission', 'quiz']) {
    const key = kind === 'mission' ? 'missionId' : 'quizId';
    const records = [
      { id: 'one', studentId: 's1', [key]: 'a', missionTitle: 'Same title', quizTitle: 'Same title' },
      { id: 'two', studentId: 's1', [key]: 'b', missionTitle: 'Same title', quizTitle: 'Same title' },
      { id: 'other', studentId: 's2', [key]: 'a' }, { id: 'unknown1' }, { id: 'unknown2' },
    ];
    assert.equal(uniqueTrainingRecords(records, kind).length, 5);
  }
});

test('Firestore SDK dates, JSON timestamps and invalid dates normalize consistently', () => {
  const milliseconds = Date.parse('2026-11-21T00:00:00.125Z');
  for (const input of [
    milliseconds, new Date(milliseconds), new Date(milliseconds).toISOString(),
    { toDate: () => new Date(milliseconds) }, { toMillis: () => milliseconds },
    { seconds: milliseconds / 1000 - .125, nanoseconds: 125000000 },
    { _seconds: milliseconds / 1000 - .125, _nanoseconds: 125000000 },
  ]) assert.equal(trainingRecordDate(input), '2026-11-21T00:00:00.125Z');
  for (const input of [null, undefined, '', 'bad date', {}, { toDate() { throw new Error('invalid'); } }]) {
    assert.equal(trainingRecordDate(input), null);
  }
  const results = uniqueTrainingRecords([
    { id: 'invalid', missionId: 'a', completedAt: {}, createdAt: '2026-11-20' },
    { id: 'timestamp', missionId: 'b', completedAt: { _seconds: milliseconds / 1000 - .125 } },
  ]);
  assert.deepEqual(results.map(record => record.completedAt), ['2026-11-21T00:00:00.000Z', '2026-11-20T00:00:00.000Z']);
});

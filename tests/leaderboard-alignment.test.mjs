import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('My Class and All Students use the same centered Rank and Total XP columns', () => {
  assert.doesNotMatch(source, /leaderboard-stat-right/);
  const myClassSections = [...source.matchAll(/<!-- My Class Leaderboard -->([\s\S]*?)<!-- Global Leaderboard -->/g)];
  assert.equal(myClassSections.length, 2);
  for (const [, section] of myClassSections) {
    assert.match(section, /class="leaderboard-stat">Rank<\/span>/);
    assert.match(section, /class="leaderboard-stat">Total XP<\/span>/);
    assert.match(section, /class="leaderboard-stat">\{\{ student\.rank \}\}<\/span>/);
    assert.match(section, /class="leaderboard-stat">\{\{ student\.xp \}\} XP<\/span>/);
  }
});

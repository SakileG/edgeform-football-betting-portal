const assert = require('assert');
const engine = require('./betting-engine');

assert.strictEqual(engine.impliedProbability(2), 0.5);
assert.strictEqual(engine.fairOdds(50), 2);
assert.strictEqual(engine.expectedValue(60, 2), 20);

const evaluations = engine.DEFAULT_MATCHES.map(engine.evaluateMatch);
assert.strictEqual(evaluations.length, 6);

for (const e of evaluations) {
  assert.ok(e.markets.length >= 8, 'each match should score all markets');
  assert.ok(e.best.score >= e.markets[e.markets.length - 1].score, 'markets should be sorted by score');
  assert.ok(['BET candidate', 'Research / maybe', 'No bet'].includes(e.overallDecision));
  assert.ok(e.kickoffISO, 'each match should include a machine-readable kickoff date/time');
  assert.ok(/\d{2}:\d{2}/.test(e.kickoffLabel), 'each match should render a visible kickoff time');
}

const derby = evaluations.find(e => e.id === 'madrid-derby');
assert.ok(derby.flags.some(f => f.label.includes('Derby')), 'derby risk must be flagged');
assert.notStrictEqual(derby.best.market, 'win', 'danger match should not blindly recommend match winner');

const sundowns = evaluations.find(e => e.id === 'sundowns-city');
assert.ok(sundowns.markets.some(m => m.label.includes('Over') || m.label.includes('Draw')), 'should consider safer markets');

const slips = engine.createMultiBets(evaluations);
assert.strictEqual(slips.length, 3);
assert.ok(slips[0].legs.length <= 3, 'serious slip must cap legs');
assert.ok(engine.unitStake(1000, 85) === 15, 'very strong stake should be 1.5 units');
assert.ok(engine.unitStake(1000, 50) === 0, 'low confidence should be no stake');

console.log('All betting engine tests passed:', { matches: evaluations.length, slips: slips.map(s => ({ name: s.name, legs: s.legs.length })) });

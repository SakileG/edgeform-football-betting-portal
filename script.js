const { DEFAULT_MATCHES, STRATEGIES, evaluateMatch, createMultiBets, unitStake } = window.BettingEngine;

const state = {
  matches: JSON.parse(localStorage.getItem('edgeform.matches') || 'null') || DEFAULT_MATCHES,
  journal: JSON.parse(localStorage.getItem('edgeform.journal') || '[]')
};

const els = {
  bankroll: document.querySelector('#bankroll'),
  evFilter: document.querySelector('#evFilter'),
  evLabel: document.querySelector('#evLabel'),
  continentFilter: document.querySelector('#continentFilter'),
  matchGrid: document.querySelector('#matchGrid'),
  summary: document.querySelector('#summary'),
  slips: document.querySelector('#slips'),
  strategies: document.querySelector('#strategies'),
  journalForm: document.querySelector('#journalForm'),
  journalTable: document.querySelector('#journalTable')
};

function money(n) { return `R${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`; }
function pct(n) { return `${Number(n).toFixed(1)}%`; }

function setupFilters() {
  const continents = ['All', ...new Set(state.matches.map(m => m.continent))];
  els.continentFilter.innerHTML = continents.map(c => `<option value="${c}">${c}</option>`).join('');
}

function currentEvaluations() {
  const continent = els.continentFilter.value;
  const minEv = Number(els.evFilter.value);
  return state.matches
    .filter(m => continent === 'All' || m.continent === continent)
    .map(evaluateMatch)
    .map(e => ({ ...e, markets: e.markets.filter(m => m.expectedValue >= minEv) }))
    .sort((a, b) => b.best.score - a.best.score);
}

function renderSummary(evals) {
  const totalMarkets = evals.reduce((sum, e) => sum + e.markets.length, 0);
  const candidates = evals.flatMap(e => e.markets.filter(m => ['Strong candidate', 'Possible bet', 'Wait for lineup'].includes(m.decision)));
  const avoids = evals.filter(e => e.overallDecision === 'No bet').length;
  const avgEv = candidates.length ? candidates.reduce((s, m) => s + m.expectedValue, 0) / candidates.length : 0;
  els.summary.innerHTML = [
    ['Matches scanned', evals.length],
    ['Markets evaluated', totalMarkets],
    ['Value candidates', candidates.length],
    ['No-bet matches', avoids],
    ['Avg EV on candidates', pct(avgEv)]
  ].map(([label, value]) => `<article class="summary-card"><span>${label}</span><strong>${value}</strong></article>`).join('');
}

function renderMatches(evals) {
  const bankroll = Number(els.bankroll.value || 0);
  els.matchGrid.innerHTML = evals.map(e => {
    const best = e.markets[0] || e.best;
    const stake = unitStake(bankroll, best.score);
    const flags = e.flags.length ? e.flags.map(f => `<span class="flag ${f.level}">${f.label}</span>`).join('') : '<span class="flag good">No major danger flags</span>';
    const topMarkets = e.markets.slice(0, 5).map(m => `
      <tr>
        <td>${m.label}</td><td>${m.odds}</td><td>${pct(m.probability)}</td><td>${pct(m.implied)}</td><td class="${m.expectedValue > 0 ? 'pos' : 'neg'}">${pct(m.expectedValue)}</td><td><span class="decision mini">${m.decision}</span></td>
      </tr>`).join('');
    return `<article class="match-card ${e.overallDecision.toLowerCase().replaceAll(' ', '-')}">
      <div class="match-top">
        <div><span class="date">${e.date} • ${e.league}</span><h3>${e.team} vs ${e.opponent}</h3><p>${e.venue} • ${e.continent}</p></div>
        <span class="decision">${e.overallDecision}</span>
      </div>
      <div class="best-box">
        <span>Best angle</span>
        <strong>${best.label}</strong>
        <p>${best.strategy} • Odds ${best.odds} • Fair ${best.fairOdds} • EV <b class="${best.expectedValue > 0 ? 'pos' : 'neg'}">${pct(best.expectedValue)}</b></p>
        <p>Suggested stake: <b>${stake ? money(stake) : 'No stake'}</b></p>
      </div>
      <div class="flags">${flags}</div>
      <details>
        <summary>View market scores</summary>
        <table><thead><tr><th>Market</th><th>Odds</th><th>Our %</th><th>Book %</th><th>EV</th><th>Decision</th></tr></thead><tbody>${topMarkets}</tbody></table>
      </details>
    </article>`;
  }).join('');
}

function renderSlips(evals) {
  els.slips.innerHTML = createMultiBets(evals).map(s => `
    <article class="slip-card">
      <h3>${s.name}</h3>
      <p>${s.note}</p>
      <strong>Combined odds: ${s.combinedOdds || '-'}</strong>
      <span>Average EV: ${pct(s.avgExpectedValue || 0)}</span>
      <ol>${s.legs.length ? s.legs.map(l => `<li>${l.match.team} — ${l.market.label} @ ${l.market.odds} <em>(${pct(l.market.expectedValue)} EV)</em></li>`).join('') : '<li>No safe value legs under current filters.</li>'}</ol>
    </article>`).join('');
}

function renderStrategies() {
  els.strategies.innerHTML = STRATEGIES.map(s => `
    <article class="strategy-card">
      <span>${s.market}</span>
      <h3>${s.name}</h3>
      <p>${s.idea}</p>
      <b>Signals</b>
      <ul>${s.signals.map(x => `<li>${x}</li>`).join('')}</ul>
      <b>Avoid when</b>
      <ul>${s.avoid.map(x => `<li>${x}</li>`).join('')}</ul>
    </article>`).join('');
}

function renderJournal() {
  localStorage.setItem('edgeform.journal', JSON.stringify(state.journal));
  if (!state.journal.length) {
    els.journalTable.innerHTML = '<p class="empty">No bets logged yet. Add every real bet here — wins, losses, voids, and lessons.</p>';
    return;
  }
  els.journalTable.innerHTML = `<table><thead><tr><th>Match</th><th>Market</th><th>Odds</th><th>Stake</th><th>Result</th><th>Reason / lesson</th></tr></thead><tbody>${state.journal.map(j => `<tr><td>${j.match}</td><td>${j.market}</td><td>${j.odds}</td><td>${money(j.stake)}</td><td>${j.result}</td><td>${j.reason}</td></tr>`).join('')}</tbody></table>`;
}

function render() {
  els.evLabel.textContent = `${els.evFilter.value}%`;
  const evals = currentEvaluations();
  renderSummary(evals);
  renderMatches(evals);
  renderSlips(evals);
  renderStrategies();
  renderJournal();
}

document.querySelector('#loadSample').addEventListener('click', () => {
  state.matches = DEFAULT_MATCHES;
  localStorage.setItem('edgeform.matches', JSON.stringify(state.matches));
  setupFilters();
  render();
});

document.querySelector('#exportJournal').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state.journal, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'edgeform-betting-journal.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

els.journalForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(els.journalForm).entries());
  state.journal.unshift(data);
  els.journalForm.reset();
  renderJournal();
});

[els.bankroll, els.evFilter, els.continentFilter].forEach(el => el.addEventListener('input', render));

setupFilters();
render();

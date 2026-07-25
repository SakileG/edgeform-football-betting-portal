(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BettingEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const STRATEGIES = [
    {
      id: 'value-edge',
      name: 'Value edge / Expected value',
      market: 'Any market',
      priority: 100,
      idea: 'Only bet when our estimated probability is higher than the bookmaker implied probability after margin.',
      signals: ['modelProbability', 'odds', 'valueEdge'],
      avoid: ['No clear probability advantage', 'Odds look short because the team is popular']
    },
    {
      id: 'draw-no-bet',
      name: 'Draw No Bet protection',
      market: 'DNB',
      priority: 88,
      idea: 'Use when the team is stronger, but draw risk is meaningful — away matches, tight leagues, derbies.',
      signals: ['homeAwayEdge', 'drawRisk', 'teamStrengthGap'],
      avoid: ['Very low DNB odds', 'Rotation risk', 'Derby chaos']
    },
    {
      id: 'double-chance',
      name: 'Double chance safety',
      market: '1X / X2',
      priority: 82,
      idea: 'Useful for away favourites or underdogs with strong recent form where avoiding one result is smarter than forcing a win bet.',
      signals: ['consistentForm', 'opponentWeakness'],
      avoid: ['Odds below value threshold', 'Favourite has poor scoring form']
    },
    {
      id: 'over-15-goals',
      name: 'Over 1.5 goals',
      market: 'Goals',
      priority: 80,
      idea: 'Often safer than match winner when both matches and opponent profile point to goals.',
      signals: ['teamGoalsFor', 'opponentGoalsAgainst', 'overRate'],
      avoid: ['Cup final', 'Derby', 'bad weather', 'missing attackers']
    },
    {
      id: 'over-25-goals',
      name: 'Over 2.5 goals',
      market: 'Goals',
      priority: 72,
      idea: 'Target attacking teams against open opponents; needs stronger evidence than Over 1.5.',
      signals: ['xgTrend', 'bothTeamsGoalTrend', 'defensiveWeakness'],
      avoid: ['Low-tempo league', 'favourite may control 1-0/2-0', 'odds too short']
    },
    {
      id: 'under-35-goals',
      name: 'Under 3.5 goals',
      market: 'Goals',
      priority: 70,
      idea: 'Good for favourites expected to win but not necessarily explode, defensive leagues, knockout pressure.',
      signals: ['lowConcedeRate', 'lowOpponentScoring', 'matchImportance'],
      avoid: ['Chaotic teams', 'early red-card prone fixtures']
    },
    {
      id: 'btts',
      name: 'Both Teams To Score',
      market: 'BTTS',
      priority: 68,
      idea: 'Works when both teams reliably score and both concede. Reputation alone is not enough.',
      signals: ['bothScoreRate', 'cleanSheetRisk', 'opponentScoringAway'],
      avoid: ['One team has weak chance creation', 'elite defence at home']
    },
    {
      id: 'asian-handicap',
      name: 'Asian handicap / spread protection',
      market: 'Handicap',
      priority: 76,
      idea: 'Use handicaps to improve odds or protect against narrow results; especially useful with dominant favourites.',
      signals: ['goalDifferenceTrend', 'dominance', 'price'],
      avoid: ['Uncertain lineups', 'low-margin teams']
    },
    {
      id: 'corners',
      name: 'Corners market',
      market: 'Corners',
      priority: 64,
      idea: 'Corners can be valuable when a team attacks wide, takes many shots, and opponent concedes pressure.',
      signals: ['wideAttack', 'shots', 'cornersFor', 'opponentCornersAgainst'],
      avoid: ['Team scores early and slows down', 'data unavailable', 'book line already inflated']
    },
    {
      id: 'cards',
      name: 'Cards market',
      market: 'Cards',
      priority: 58,
      idea: 'Cards fit derbies, relegation fights, aggressive teams, strict referees and high-stakes matches.',
      signals: ['derby', 'refereeCards', 'fouls', 'stakes'],
      avoid: ['Friendly/low-stakes match', 'unknown referee data']
    }
  ];

  const DEFAULT_MATCHES = [
    {
      id: 'arsenal-brighton', date: 'Today', team: 'Arsenal', opponent: 'Brighton', venue: 'Home', league: 'Premier League', continent: 'Europe',
      odds: { win: 1.62, drawNoBet: 1.28, doubleChance: 1.12, over15: 1.25, over25: 1.82, under35: 1.38, bttsYes: 1.76, cornersOver85: 1.80, cardsOver35: 1.95 },
      metrics: { form: 82, homeAway: 86, opponentWeakness: 61, attack: 78, defence: 70, motivation: 74, rest: 67, injuries: 18, rotation: 15, derby: 0, cup: 0, opponentAttack: 67, goalTrend: 74, cornerTrend: 75, cardHeat: 42 }
    },
    {
      id: 'sundowns-city', date: 'Today', team: 'Mamelodi Sundowns', opponent: 'Cape Town City', venue: 'Home', league: 'South Africa PSL', continent: 'Africa',
      odds: { win: 1.55, drawNoBet: 1.22, doubleChance: 1.10, over15: 1.32, over25: 2.05, under35: 1.34, bttsYes: 2.05, cornersOver85: 1.88, cardsOver35: 1.72 },
      metrics: { form: 88, homeAway: 90, opponentWeakness: 70, attack: 82, defence: 84, motivation: 78, rest: 72, injuries: 10, rotation: 20, derby: 0, cup: 0, opponentAttack: 51, goalTrend: 68, cornerTrend: 70, cardHeat: 54 }
    },
    {
      id: 'madrid-derby', date: 'Tomorrow', team: 'Real Madrid', opponent: 'Atletico Madrid', venue: 'Away', league: 'La Liga', continent: 'Europe',
      odds: { win: 2.25, drawNoBet: 1.60, doubleChance: 1.32, over15: 1.36, over25: 2.05, under35: 1.30, bttsYes: 1.78, cornersOver85: 1.83, cardsOver35: 1.45 },
      metrics: { form: 80, homeAway: 56, opponentWeakness: 39, attack: 79, defence: 76, motivation: 90, rest: 63, injuries: 16, rotation: 12, derby: 1, cup: 0, opponentAttack: 74, goalTrend: 58, cornerTrend: 66, cardHeat: 90 }
    },
    {
      id: 'al-ahly-zamalek', date: 'Friday', team: 'Al Ahly', opponent: 'Zamalek', venue: 'Neutral', league: 'Egypt Premier League', continent: 'Africa',
      odds: { win: 2.05, drawNoBet: 1.45, doubleChance: 1.25, over15: 1.42, over25: 2.25, under35: 1.24, bttsYes: 1.92, cornersOver85: 1.86, cardsOver35: 1.38 },
      metrics: { form: 76, homeAway: 60, opponentWeakness: 42, attack: 71, defence: 77, motivation: 95, rest: 58, injuries: 22, rotation: 10, derby: 1, cup: 0, opponentAttack: 66, goalTrend: 52, cornerTrend: 59, cardHeat: 94 }
    },
    {
      id: 'flamengo-palmeiras', date: 'Sunday', team: 'Flamengo', opponent: 'Palmeiras', venue: 'Home', league: 'Brasileirao', continent: 'South America',
      odds: { win: 2.10, drawNoBet: 1.48, doubleChance: 1.24, over15: 1.34, over25: 2.00, under35: 1.31, bttsYes: 1.82, cornersOver85: 1.70, cardsOver35: 1.58 },
      metrics: { form: 73, homeAway: 75, opponentWeakness: 45, attack: 76, defence: 66, motivation: 82, rest: 64, injuries: 14, rotation: 18, derby: 0, cup: 0, opponentAttack: 72, goalTrend: 66, cornerTrend: 82, cardHeat: 72 }
    },
    {
      id: 'alhilal-away', date: 'Today', team: 'Al Hilal', opponent: 'Al Taawoun', venue: 'Away', league: 'Saudi Pro League', continent: 'Asia',
      odds: { win: 1.72, drawNoBet: 1.30, doubleChance: 1.14, over15: 1.22, over25: 1.62, under35: 1.72, bttsYes: 1.70, cornersOver85: 1.78, cardsOver35: 1.84 },
      metrics: { form: 84, homeAway: 68, opponentWeakness: 64, attack: 88, defence: 70, motivation: 69, rest: 61, injuries: 12, rotation: 28, derby: 0, cup: 0, opponentAttack: 69, goalTrend: 82, cornerTrend: 76, cardHeat: 48 }
    }
  ];

  function clamp(n, min = 0, max = 100) { return Math.max(min, Math.min(max, Number(n) || 0)); }
  function impliedProbability(decimalOdds) { return decimalOdds > 0 ? 1 / decimalOdds : 0; }
  function fairOdds(probabilityPercent) { const p = clamp(probabilityPercent) / 100; return p ? +(1 / p).toFixed(2) : null; }
  function expectedValue(probabilityPercent, decimalOdds) { const p = clamp(probabilityPercent) / 100; return +((p * decimalOdds - 1) * 100).toFixed(1); }

  function baseTeamScore(m) {
    const x = m.metrics;
    return clamp(
      x.form * 0.14 + x.homeAway * 0.14 + x.opponentWeakness * 0.12 + x.attack * 0.12 + x.defence * 0.08 +
      x.motivation * 0.10 + x.rest * 0.07 + (100 - x.injuries) * 0.08 + (100 - x.rotation) * 0.07 + x.goalTrend * 0.08
    );
  }

  function riskFlags(match) {
    const m = match.metrics;
    const flags = [];
    if (m.derby) flags.push({ level: 'high', label: 'Derby/rivalry volatility' });
    if (m.cup) flags.push({ level: 'medium', label: 'Cup/knockout context' });
    if (m.rotation >= 25) flags.push({ level: 'medium', label: 'Rotation risk — wait for lineup' });
    if (m.injuries >= 20) flags.push({ level: 'medium', label: 'Injury/suspension pressure' });
    if (m.rest < 55) flags.push({ level: 'medium', label: 'Fixture congestion / low rest' });
    if (match.venue === 'Away' && m.homeAway < 65) flags.push({ level: 'medium', label: 'Away favourite caution' });
    return flags;
  }

  function riskPenalty(match) {
    return riskFlags(match).reduce((sum, f) => sum + (f.level === 'high' ? 11 : 6), 0);
  }

  function estimateMarketProbability(match, market) {
    const x = match.metrics;
    const team = baseTeamScore(match);
    const derbyPenalty = x.derby ? 7 : 0;
    const rotationPenalty = x.rotation * 0.07;
    const injuryPenalty = x.injuries * 0.06;
    const awayPenalty = match.venue === 'Away' ? 4 : 0;

    switch (market) {
      case 'win': return clamp(team - derbyPenalty - rotationPenalty - injuryPenalty - awayPenalty);
      case 'drawNoBet': return clamp(team + 8 - derbyPenalty * 0.7 - rotationPenalty - awayPenalty * 0.5);
      case 'doubleChance': return clamp(team + 16 - derbyPenalty * 0.6 - rotationPenalty * 0.5);
      case 'over15': return clamp(x.goalTrend * 0.35 + x.attack * 0.23 + x.opponentWeakness * 0.18 + x.opponentAttack * 0.10 + (100 - x.defence) * 0.06 + 14 - derbyPenalty * 0.3);
      case 'over25': return clamp(x.goalTrend * 0.34 + x.attack * 0.25 + x.opponentWeakness * 0.18 + x.opponentAttack * 0.13 - derbyPenalty * 0.4 - 5);
      case 'under35': return clamp((100 - x.goalTrend) * 0.25 + x.defence * 0.24 + (100 - x.opponentAttack) * 0.18 + (x.derby ? 10 : 0) + 33);
      case 'bttsYes': return clamp(x.goalTrend * 0.30 + x.attack * 0.18 + x.opponentAttack * 0.26 + (100 - x.defence) * 0.12 + x.opponentWeakness * 0.08);
      case 'cornersOver85': return clamp(x.cornerTrend * 0.45 + x.attack * 0.16 + x.opponentWeakness * 0.16 + (x.derby ? 4 : 0) + 15);
      case 'cardsOver35': return clamp(x.cardHeat * 0.48 + x.motivation * 0.16 + (x.derby ? 18 : 0) + (x.cup ? 8 : 0) + 17);
      default: return 0;
    }
  }

  const MARKET_LABELS = {
    win: 'Team win', drawNoBet: 'Draw no bet', doubleChance: 'Double chance', over15: 'Over 1.5 goals', over25: 'Over 2.5 goals', under35: 'Under 3.5 goals', bttsYes: 'BTTS — Yes', cornersOver85: 'Corners over 8.5', cardsOver35: 'Cards over 3.5'
  };

  function marketStrategy(market) {
    if (market === 'win') return STRATEGIES[0];
    if (market === 'drawNoBet') return STRATEGIES.find(s => s.id === 'draw-no-bet');
    if (market === 'doubleChance') return STRATEGIES.find(s => s.id === 'double-chance');
    if (market === 'over15') return STRATEGIES.find(s => s.id === 'over-15-goals');
    if (market === 'over25') return STRATEGIES.find(s => s.id === 'over-25-goals');
    if (market === 'under35') return STRATEGIES.find(s => s.id === 'under-35-goals');
    if (market === 'bttsYes') return STRATEGIES.find(s => s.id === 'btts');
    if (market === 'cornersOver85') return STRATEGIES.find(s => s.id === 'corners');
    if (market === 'cardsOver35') return STRATEGIES.find(s => s.id === 'cards');
    return STRATEGIES[0];
  }

  function evaluateMatch(match) {
    const flags = riskFlags(match);
    const penalty = riskPenalty(match);
    const markets = Object.entries(match.odds).map(([market, odds]) => {
      const prob = estimateMarketProbability(match, market);
      const implied = impliedProbability(odds) * 100;
      const ev = expectedValue(prob, odds);
      const valueGap = +(prob - implied).toFixed(1);
      const safety = market === 'doubleChance' || market === 'drawNoBet' || market === 'over15' || market === 'under35' ? 5 : 0;
      const chaosPenalty = (match.metrics.derby && ['win', 'over25', 'bttsYes'].includes(market)) ? 8 : 0;
      const score = clamp(prob * 0.48 + valueGap * 1.35 + safety + marketStrategy(market).priority * 0.12 - penalty - chaosPenalty);
      let decision = 'Avoid';
      if (valueGap >= 7 && score >= 70 && ev > 4) decision = 'Strong candidate';
      else if (valueGap >= 3 && score >= 59 && ev > 0) decision = flags.some(f => f.label.includes('wait')) ? 'Wait for lineup' : 'Possible bet';
      else if (prob >= 72 && valueGap < 1) decision = 'Likely but poor value';
      return {
        market, label: MARKET_LABELS[market] || market, odds, probability: +prob.toFixed(1), implied: +implied.toFixed(1), fairOdds: fairOdds(prob), expectedValue: ev, valueGap, score: +score.toFixed(1), decision, strategy: marketStrategy(market).name
      };
    }).sort((a, b) => b.score - a.score);

    const best = markets[0];
    const valueCandidates = markets.filter(m => ['Strong candidate', 'Possible bet', 'Wait for lineup'].includes(m.decision));
    const overallDecision = valueCandidates.some(m => m.decision === 'Strong candidate') ? 'BET candidate' : valueCandidates.length ? 'Research / maybe' : 'No bet';
    return { ...match, teamScore: +baseTeamScore(match).toFixed(1), flags, markets, best, valueCandidates, overallDecision };
  }

  function createMultiBets(evaluations) {
    const legs = evaluations.flatMap(e => e.markets.slice(0, 4).filter(m => m.expectedValue > 2 && m.valueGap > 2).map(m => ({ match: e, market: m })))
      .sort((a, b) => b.market.score - a.market.score);
    const serious = legs.filter(l => !l.match.flags.some(f => f.level === 'high')).slice(0, 3);
    const value = legs.filter(l => l.market.expectedValue > 6).slice(0, 4);
    const fun = legs.slice(0, 5);
    return [
      slip('Serious slip', '1–3 legs only. This is the one to protect the bankroll.', serious),
      slip('Value slip', 'Higher edge, slightly more variance. Stake smaller.', value),
      slip('Entertainment slip', 'More legs means more risk. Keep this as a tiny/fun stake.', fun)
    ];
  }

  function slip(name, note, legs) {
    const odds = legs.reduce((acc, l) => acc * l.market.odds, 1);
    const avgEv = legs.length ? legs.reduce((s, l) => s + l.market.expectedValue, 0) / legs.length : 0;
    return { name, note, legs, combinedOdds: +odds.toFixed(2), avgExpectedValue: +avgEv.toFixed(1) };
  }

  function unitStake(bankroll, confidenceScore) {
    const bank = Number(bankroll) || 0;
    if (!bank || confidenceScore < 58) return 0;
    const unit = bank * 0.01;
    const multiplier = confidenceScore >= 82 ? 1.5 : confidenceScore >= 70 ? 1 : 0.5;
    return +(unit * multiplier).toFixed(2);
  }

  return { STRATEGIES, DEFAULT_MATCHES, evaluateMatch, createMultiBets, impliedProbability, fairOdds, expectedValue, unitStake };
});

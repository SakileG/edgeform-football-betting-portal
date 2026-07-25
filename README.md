# EdgeForm Football Betting Research Portal

A local-first prototype for football/soccer betting research. It does **not** guarantee profit; it is built to improve discipline by finding value candidates, warning about danger matches, and rejecting weak bets.

## What it does

- Scores each match across multiple markets: win, draw no bet, double chance, over/under goals, BTTS, corners, cards.
- Calculates implied probability, fair odds, expected value and value gap.
- Flags danger spots: derbies, rotation risk, injuries, congestion, away favourite caution.
- Builds three slip types: serious, value and entertainment.
- Includes a betting journal saved in the browser via `localStorage`.
- Suggests stake size using a simple 1% bankroll unit rule.

## Run locally

```bash
cd /c/Users/Sakile/football-betting-portal
node tests.js
node --check betting-engine.js
node --check script.js
node server.js
```

Then open: http://127.0.0.1:8087

## Deploy to Vercel

Import the GitHub repo in Vercel:

- Repository: `SakileG/edgeform-football-betting-portal`
- Framework preset: `Other`
- Build command: leave empty
- Output directory: leave empty / project root
- Install command: leave default or empty

This is a static app, so Vercel can serve `index.html`, `styles.css`, and the JavaScript files directly.

## Research ideas included

The prototype converts common betting concepts into product rules:

- Expected value and implied probability before popularity.
- Draw No Bet / Double Chance to protect against draw risk.
- Over 1.5 goals as a safer market when goal signals are strong.
- Over 2.5 only with stronger attacking/open-game evidence.
- Under 3.5 for controlled favourites, derbies, finals and defensive contexts.
- BTTS only when both scoring and conceding profiles support it.
- Corners when wide attack + pressure + corner trend align.
- Cards when derby/referee/aggression/stakes point that way.
- Avoid big-team accumulator traps.
- Journal every bet to identify your profitable leagues and markets later.

## Next implementation phase

1. Replace sample data with a real football API for fixtures/results/form.
2. Add odds API integration.
3. Store watchlist teams and journal in a lightweight backend or GitHub/Vercel-friendly database.
4. Add daily Telegram alerts for only strong candidates.
5. Backtest strategies before using real money.

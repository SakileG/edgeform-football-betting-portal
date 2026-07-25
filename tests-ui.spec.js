const { test, expect } = require('@playwright/test');

test('Load sample watchlist resets stored matches and renders sample cards', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', error => consoleErrors.push(error.message));

  await page.addInitScript(() => {
    localStorage.setItem('edgeform.matches', JSON.stringify([
      {
        id: 'custom-test-match',
        date: 'TBC',
        team: 'Broken Local Team',
        opponent: 'Old Stored Opponent',
        venue: 'Home',
        league: 'Old Data League',
        continent: 'Old',
        odds: { win: 2, drawNoBet: 1.5, doubleChance: 1.2, over15: 1.3, over25: 2, under35: 1.4, bttsYes: 1.8, cornersOver85: 1.9, cardsOver35: 1.8 },
        metrics: { form: 50, homeAway: 50, opponentWeakness: 50, attack: 50, defence: 50, motivation: 50, rest: 50, injuries: 0, rotation: 0, derby: 0, cup: 0, opponentAttack: 50, goalTrend: 50, cornerTrend: 50, cardHeat: 50 }
      }
    ]));
  });

  await page.goto('http://127.0.0.1:8087/');
  await expect(page.locator('.match-card')).toHaveCount(1);
  await expect(page.locator('.match-card').filter({ hasText: 'Broken Local Team' })).toBeVisible();

  await page.locator('#loadSample').click();

  await expect(page.locator('#sampleStatus')).toContainText('Loaded 6 sample fixtures');
  await expect(page.locator('.match-card')).toHaveCount(6);
  await expect(page.locator('.match-card').filter({ hasText: 'Arsenal' })).toBeVisible();
  await expect(page.locator('.match-card').filter({ hasText: 'Mamelodi Sundowns' })).toBeVisible();
  await expect(page.locator('.source-badge').first()).toContainText('Sample data');
  await expect(page.locator('.fixture-strip').first()).toContainText(/\d{2}:\d{2}/);
  expect(consoleErrors).toEqual([]);
});

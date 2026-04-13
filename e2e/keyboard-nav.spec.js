import { test, expect } from '@playwright/test';

const ENABLED_CARD_IDS = [
  'argocd',
  'vault',
  'semaphore',
  'k3s-dashboard',
  'proxmox',
  'consul',
  'pgadmin',
  'ollama',
];

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to fully render
    await page.waitForSelector('[data-testid="service-card-argocd"]');
  });

  test('Tab from body → theme toggle → refresh button', async ({ page }) => {
    // Press Tab from page root to focus first interactive element
    await page.keyboard.press('Tab');
    const themeToggle = page.locator('button[aria-label*="Switch to"]');
    await expect(themeToggle).toBeFocused();

    await page.keyboard.press('Tab');
    const refreshBtn = page.locator('button[aria-label="Refresh health status"]');
    await expect(refreshBtn).toBeFocused();
  });

  test('Tab cycles through all 8 enabled service cards in DOM order', async ({ page }) => {
    // Skip to first service card (past theme toggle and refresh)
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    for (const id of ENABLED_CARD_IDS) {
      await page.keyboard.press('Tab');
      const card = page.locator(`[data-testid="service-card-${id}"]`);
      await expect(card).toBeFocused();
    }
  });

  test('fourdogs disabled card is not in tab order', async ({ page }) => {
    // Tab through all interactive elements — theme toggle, refresh, 8 cards
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }
    // fourdogs should never be focused
    const fourdogsCard = page.locator('[data-testid="service-card-fourdogs"]');
    await expect(fourdogsCard).not.toBeFocused();
  });

  test('ArgoCD card has correct href and is reachable by keyboard', async ({ page }) => {
    await page.keyboard.press('Tab'); // theme toggle
    await page.keyboard.press('Tab'); // refresh
    await page.keyboard.press('Tab'); // argocd card

    const argoCard = page.locator('[data-testid="service-card-argocd"]');
    await expect(argoCard).toBeFocused();
    const href = await argoCard.getAttribute('href');
    expect(href).toContain('argo.trantor.internal');
  });

  test('focused service card has visible focus outline', async ({ page }) => {
    await page.keyboard.press('Tab'); // theme toggle
    await page.keyboard.press('Tab'); // refresh
    await page.keyboard.press('Tab'); // argocd card

    const outlineStyle = await page.evaluate(() => {
      const el = document.activeElement;
      const style = window.getComputedStyle(el);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineColor: style.outlineColor,
      };
    });
    // Outline should not be 'none' or 0px wide
    expect(outlineStyle.outlineStyle).not.toBe('none');
    expect(outlineStyle.outlineWidth).not.toBe('0px');
  });
});

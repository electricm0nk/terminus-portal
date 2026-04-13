import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility (WCAG 2.1 AA)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="service-card-argocd"]');
  });

  test('zero WCAG 2.1 AA axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('StatusIndicator for ArgoCD has valid aria-label', async ({ page }) => {
    const validLabels = [
      'Status: Online',
      'Status: Unreachable',
      'Status: Checking',
      'Status: No health check',
    ];
    const argoCard = page.locator('[data-testid="service-card-argocd"]');
    const indicator = argoCard.locator('[role="status"]');
    const ariaLabel = await indicator.getAttribute('aria-label');
    expect(validLabels).toContain(ariaLabel);
  });

  test('StatusIndicator for Vault has valid aria-label', async ({ page }) => {
    const validLabels = [
      'Status: Online',
      'Status: Unreachable',
      'Status: Checking',
      'Status: No health check',
    ];
    const vaultCard = page.locator('[data-testid="service-card-vault"]');
    const indicator = vaultCard.locator('[role="status"]');
    const ariaLabel = await indicator.getAttribute('aria-label');
    expect(validLabels).toContain(ariaLabel);
  });

  test('StatusIndicator for Semaphore has valid aria-label', async ({ page }) => {
    const validLabels = [
      'Status: Online',
      'Status: Unreachable',
      'Status: Checking',
      'Status: No health check',
    ];
    const semCard = page.locator('[data-testid="service-card-semaphore"]');
    const indicator = semCard.locator('[role="status"]');
    const ariaLabel = await indicator.getAttribute('aria-label');
    expect(validLabels).toContain(ariaLabel);
  });

  test('theme toggle aria-label starts with "Switch to"', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="Switch to"]');
    await expect(themeToggle).toBeVisible();
    const label = await themeToggle.getAttribute('aria-label');
    expect(label).toMatch(/^Switch to/);
  });

  test('refresh button aria-label is "Refresh health status"', async ({ page }) => {
    const refreshBtn = page.locator('button[aria-label="Refresh health status"]');
    await expect(refreshBtn).toBeVisible();
  });
});

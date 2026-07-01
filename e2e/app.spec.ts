import { test, expect } from '@playwright/test';

/**
 * App routing — end-to-end smoke tests.
 *
 * Verifies that each route renders the correct placeholder page and that
 * the root redirect works.  The backend is not required; tests run against
 * the Vite dev server alone.
 */

test.describe('App routing', () => {
  test('/ redirects to /chat', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.getByTestId('page-chat')).toBeVisible();
  });

  test('/chat renders the chat page', async ({ page }) => {
    await page.goto('/chat');
    await expect(page.getByTestId('page-chat')).toBeVisible();
  });

  test('/chat/:id renders the chat page with a conversation open', async ({ page }) => {
    await page.goto('/chat/abc123');
    await expect(page.getByTestId('page-chat')).toBeVisible();
  });

  test('/login renders the login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('page-login')).toBeVisible();
  });

  test('/register renders the register page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByTestId('page-register')).toBeVisible();
  });

  test('/forgot-password renders the forgot-password page', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByTestId('page-forgot-password')).toBeVisible();
  });

  test('/profile renders the profile page', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByTestId('page-profile')).toBeVisible();
  });

  test('/settings renders the settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByTestId('page-settings')).toBeVisible();
  });

  test('unknown route renders the 404 page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByTestId('page-not-found')).toBeVisible();
  });
});

test.describe('Page titles and document', () => {
  test('page has a title', async ({ page }) => {
    await page.goto('/chat');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('page uses UTF-8 charset', async ({ page }) => {
    await page.goto('/chat');
    const charset = await page.evaluate(() =>
      document.querySelector('meta[charset]')?.getAttribute('charset') ?? '',
    );
    expect(charset.toLowerCase()).toBe('utf-8');
  });
});

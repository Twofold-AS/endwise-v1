import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const ARTIFACT = '/opt/cursor/artifacts/screenshots';

test.describe('P7 punkt-for-punkt 390x844', () => {
  test.beforeAll(() => {
    mkdirSync(ARTIFACT, { recursive: true });
  });

  test('Hjem seed, Ronny-sirkel, drawer, menyer, innlogging', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/pulse-preview', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-pulse-preview="go"]')).toBeVisible();
    await expect(page.locator('[data-ronny-sirkel]')).toBeVisible();
    const pad = await page.locator('[data-ronny-side-scroll]').evaluate((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        paddingLeft: s.paddingLeft,
        left: r.left,
        width: r.width,
        html: el.outerHTML.slice(0, 200),
      };
    });
    const sirkel = await page.locator('[data-ronny-sirkel]').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, width: r.width };
    });
    expect(sirkel.right).toBeLessThan(parseFloat(pad.paddingLeft));
    await page.screenshot({ path: `${ARTIFACT}/p7e-hjem-seed-gutter.png` });
    await page.locator('[data-ronny-sirkel]').screenshot({
      path: `${ARTIFACT}/p7b-ronny-sirkel.png`,
    });

    await page.click('[data-ronny-sirkel]');
    const ronny = page.getByRole('dialog', { name: /Ronny/i });
    await expect(ronny).toBeVisible();
    await expect(ronny.getByText('Ronny', { exact: true }).first()).toBeVisible();
    await expect(page.locator('[data-ronny-tenker]')).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${ARTIFACT}/p7b-ronny-drawer.png` });
    await page.keyboard.press('Escape');

    await page.goto('/visuell/mobil', { waitUntil: 'networkidle' });
    const hjem = page.locator('[data-mobil-side="hjem"]');
    await hjem.scrollIntoViewIfNeeded();
    await expect(hjem.getByRole('link', { name: /3 Planlagt 2 Pågår 1 Ferdig/ })).toBeVisible();
    await hjem.screenshot({ path: `${ARTIFACT}/p7b-visuell-hjem.png` });

    const innlogging = page.locator('[data-mobil-side="innlogging"]');
    await innlogging.scrollIntoViewIfNeeded();
    await innlogging.screenshot({ path: `${ARTIFACT}/p7b-signin-nesten-der.png` });

    await page.goto('/ia-chrome-preview', { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${ARTIFACT}/p7-ia-chrome-menyer.png` });

    await page.goto('/signin', { waitUntil: 'networkidle' });
    await expect(page.getByLabel('E-post')).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT}/p7-signin-epost.png` });

    await page.goto('/signin?steg=valg', { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${ARTIFACT}/p7-signin-otp.png` });

    await page.goto('/2fa-oppsett', { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${ARTIFACT}/p7-signin-nesten-der.png` });

    await page.goto('/signin', { waitUntil: 'networkidle' });
    await page.locator('#signin-email').fill('admin-a@verksted.test');
    await page.getByRole('button', { name: /Fortsett/ }).click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${ARTIFACT}/p7-signin-laster.png` });
  });
});

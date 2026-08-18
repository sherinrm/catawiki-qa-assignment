import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */

/**
 * NOTE ON BOT PROTECTION (measured, not assumed):
 *   - Bundled headless Chromium is served an "Access Denied" page. Neither a
 *     spoofed user-agent nor --disable-blink-features=AutomationControlled
 *     changes that.
 *   - Headless *branded* Chrome (`channel: 'chrome'`) passes cleanly, as does
 *     branded Edge.
 *   - Headless Firefox and WebKit pass with no special handling at all.
 * The chromium project therefore pins `channel: 'chrome'`, which is why CI must
 * run `playwright install --with-deps chrome` rather than plain `chromium`.
 */
const stealthArgs = ['--disable-blink-features=AutomationControlled'];
const BASE_URL = process.env.BASE_URL ?? 'https://www.catawiki.com';

export default defineConfig({
    testDir: './tests',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 2 : 1,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [['list'], ['html', { outputFolder: 'playwright-report' }], ['allure-playwright']],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('')`. */
        // baseURL: 'http://localhost:3000',

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        baseURL: BASE_URL,
        locale: 'en-GB',
        timezoneId: 'Europe/Amsterdam',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        // Safe to run headless for every project here — see the bot-protection
        // note above for why the chromium project specifically pins `channel: 'chrome'`.
        // headless: process.env.HEADLESS !== 'false',
        headless: process.env.HEADLESS !== 'false',
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            testIgnore: /tests[\\/](a11y)[\\/]/,
            use: {
                ...devices['Desktop Chrome'],
                channel: 'chrome',
                launchOptions: {
                    args: stealthArgs,
                },
            },
        },

        {
            name: 'firefox',
            testIgnore: /tests[\\/](api|a11y)[\\/]/,
            use: { ...devices['Desktop Firefox'] },
        },

        {
            name: 'webkit',
            testIgnore: /tests[\\/](api|a11y)[\\/]/,
            use: { ...devices['Desktop Safari'] },
        },
        /* ---------- Accessibility: axe-core scans + keyboard/focus/ARIA specs ----------
         * Needs a real, bot-check-passing browser, same reasoning as chromium above. */
        {
            name: 'accessibility',
            testDir: './tests/a11y',
            use: {
                ...devices['Desktop Chrome'],
                channel: 'chrome',
                launchOptions: { args: stealthArgs },
            },
        },
        /* ---------- Mobile viewports: only the responsive suite ---------- */
        {
            name: 'mobile-chrome',
            testDir: './tests/responsive',
            use: {
                ...devices['Pixel 5'],
                channel: 'chrome',
                launchOptions: { args: stealthArgs },
            },
        },
        {
            name: 'mobile-safari',
            testDir: './tests/responsive',
            use: { ...devices['iPhone 12'] },
        },
    ],
});

import type { Page } from '@playwright/test';
/**
 * Dismisses the consent banner if it is genuinely visible.
 *
 * Deliberately best-effort: on repeat visits within the same context the
 * banner may not render at all, and absence must never fail a test.
 */
export async function dismissConsentIfPresent(page: Page): Promise<boolean> {
    const acceptButton = page.getByRole('button', { name: 'Accept All' });

    try {
        await acceptButton.waitFor({ state: 'visible', timeout: 3_000 });
    } catch {
        return false;
    }

    await acceptButton.click().catch(() => undefined);
    return true;
}

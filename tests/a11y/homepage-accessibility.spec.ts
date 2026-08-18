import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../src/fixtures/testFixture';

/*
Accessibility scan: runs axe-core against the homepage and asserts there are
no WCAG 2.0/2.1 A or AA violations. Demonstrates automated a11y scanning
wired into the existing Page Object / fixture setup — see TEST-REPORT.md
"Next steps" for the fuller a11y plan (keyboard-only nav, focus trapping in
the sign-in dialog, etc.).
*/

test.describe('Accessibility', () => {
    test('TC-010:[A11y] homepage has no WCAG 2.0/2.1 A/AA violations @a11y', async ({
        page,
        homePage,
    }) => {
        await test.step("Open Catawiki's website", async () => {
            await homePage.open();
        });

        const results = await test.step('Scan the page with axe-core', async () => {
            return new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
                .analyze();
        });

        await test.step('Verify there are no violations', async () => {
            const summary = results.violations.map(
                (violation) =>
                    `${violation.id} (${violation.impact}): ${violation.description} — ${violation.nodes.length} node(s)`
            );
            expect(summary, summary.join('\n')).toEqual([]);
        });
    });
});

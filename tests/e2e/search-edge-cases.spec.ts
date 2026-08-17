import { test, expect } from '../../src/fixtures/testFixture';
import { UNIQUE_UNLIKELY_KEYWORDS } from '../../src/data/searchTerm';

test.describe('Search . edge cases', () => {
    for (const [key, searchTerm] of Object.entries(UNIQUE_UNLIKELY_KEYWORDS)) {
        test(`TC-003: [Search][Edge Case] returns no results for "${key}"`, async ({
            homePage,
            searchResultsPage,
        }) => {
            await test.step("Open Catawiki's website", async () => {
                await homePage.open();
            });

            await test.step(`Search for the "${key}" keyword using the magnifier button`, async () => {
                await homePage.searchViaMagnifier(searchTerm);
            });

            await test.step('Verify that the no exact match message and related lots are shown', async () => {
                await expect(searchResultsPage.heading()).toHaveText(searchTerm);
                await expect(searchResultsPage.noExactText).toBeVisible();
                await expect(searchResultsPage.lotLinks.first()).toBeVisible();
            });
        });
    }

    test(`TC-004: [Search][Negative Case] handles a whitespace-only search correctly`, async ({
        homePage,
        searchResultsPage,
    }) => {
        await test.step("Open Catawiki's website", async () => {
            await homePage.open();
        });

        await test.step(`Search for the keyword using the Keyboard`, async () => {
            await homePage.searchViaKeyboard(' ');
        });

        await test.step('Verify that the no-match message and related lots are shown', async () => {
            await expect(searchResultsPage.noMatchText).toBeVisible();
        });
    });
});

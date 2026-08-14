import { test, expect } from '../../src/fixtures/testFixture';
import { SEARCH_TERMS, UNIQUE_UNLIKELY_KEYWORDS } from '../../src/data/searchTerm';

test.describe('Search multiple terms and edge cases', () => {
    for (const searchTerm of Object.values(SEARCH_TERMS)) {
        test(`TC-002: [Search] returns matching results for "${searchTerm}"`, async ({
            homePage,
            searchResultsPage,
        }) => {
            await test.step("Open Catawiki's website", async () => {
                await homePage.open();
            });

            await test.step(`Search for "${searchTerm}" using the magnifier button`, async () => {
                await homePage.searchViaMagnifier(searchTerm);
            });

            await test.step('Verify that the search results page shows matching lots', async () => {
                await expect(searchResultsPage.heading()).toHaveText(searchTerm);
                await expect(searchResultsPage.lotLinks.first()).toBeVisible();
                expect(await searchResultsPage.lotLinks.count()).toBeGreaterThan(1);
            });
        });
    }

    for (const [key, searchTerm] of Object.entries(UNIQUE_UNLIKELY_KEYWORDS)) {
        test(`TC-003: [Search] returns no results for "${key}"`, async ({
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

    test(`TC-004: [Search] handles a whitespace-only search correctly`, async ({
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

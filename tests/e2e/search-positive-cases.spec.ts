import { test, expect } from '../../src/fixtures/testFixture';
import { SEARCH_TERMS } from '../../src/data/searchTerm';
/*
Test case TC-002: Search for multiple terms and verify that the search results page shows matching lots.
*/

test.describe('Search - Positive cases', () => {
    for (const searchTerm of Object.values(SEARCH_TERMS)) {
        test(`TC-002: [Search] [Matching Results] returns matching results for "${searchTerm}" @smoke`, async ({
            homePage,
            searchResultsPage,
        }) => {
            await test.step("Open Catawiki's website", async () => {
                await homePage.open();
            });

            await test.step(`Search for "${searchTerm}" using the magnifier button`, async () => {
                await homePage.searchViaMagnifier(searchTerm);
                await searchResultsPage.verifyLoaded();
            });

            await test.step('Verify that the search results page shows matching lots', async () => {
                await expect(searchResultsPage.heading()).toHaveText(searchTerm);
                expect(await searchResultsPage.getLotCount()).toBeGreaterThan(1);
            });
        });
    }
});

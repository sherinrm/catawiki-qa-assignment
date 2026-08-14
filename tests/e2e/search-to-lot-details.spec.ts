import { test, expect } from '../../src/fixtures/testFixture';
import { SEARCH_KEYWORD } from '../../src/data/searchTerm';

test.describe('Search to lot details', () => {
    test(`TC-001: [LOT] search for "${SEARCH_KEYWORD}" and view the second lot`, async ({
        homePage,
        searchResultsPage,
        lotPage,
    }) => {
        await test.step("Open Catawiki's website", async () => {
            await homePage.open();
        });

        await test.step(`Type "${SEARCH_KEYWORD}" into the search field and click the magnifier button`, async () => {
            await homePage.searchViaMagnifier(SEARCH_KEYWORD);
        });

        await test.step('Verify that the search results page is open', async () => {
            await expect(searchResultsPage.heading()).toHaveText(SEARCH_KEYWORD);
            await expect(searchResultsPage.lotLinks.first()).toBeVisible();
            expect(await searchResultsPage.lotLinks.count()).toBeGreaterThan(1);
        });

        await test.step('Click on the second lot in the search results', async () => {
            await searchResultsPage.clickLotByIndex(1);
        });

        await test.step('Verify that the lot page is open', async () => {
            await lotPage.verifyLoaded();
        });

        const lotDetails =
            await test.step("Retrieve the lot's name, favourites counter, and current bid", async () => {
                return await lotPage.getLotDetails();
            });

        await test.step('Verify that the retrieved lot details are valid', async () => {
            expect(lotDetails.lotName).not.toBe('');
            expect(lotDetails.currentBid.amount).toBeGreaterThan(0);
            expect(lotDetails.currentBid.currency).not.toBe('');
            expect(lotDetails.favourites).toBeGreaterThan(0);
        });
    });
});

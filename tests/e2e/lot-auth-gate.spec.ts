import { test, expect } from '../../src/fixtures/testFixture';
import { SEARCH_TERMS } from '../../src/data/searchTerm';
import { calculateNextBidAmount } from '../../src/helpers/bid';

test.describe('Validate auth gate', () => {
    test('TC-005: [Auth-Gate] prompts anonymous users to sign in and does not alter the favourites counter', async ({
        homePage,
        searchResultsPage,
        lotPage,
    }) => {
        await test.step("Open Catawiki's website and search for a keyword", async () => {
            await homePage.open();
            await homePage.searchViaMagnifier(SEARCH_TERMS.CARS);
        });

        await test.step('Verify that the search results page is open', async () => {
            await expect(searchResultsPage.heading()).toHaveText(SEARCH_TERMS.CARS);
        });

        const before =
            await test.step('Open a lot page and capture its favourites count', async () => {
                await searchResultsPage.clickLotByIndex(3);
                return await lotPage.getLotDetails();
            });

        await test.step('Click the favourites button as an anonymous user', async () => {
            await lotPage.favourites.click();
        });

        await test.step('Verify that the sign-in dialog is shown', async () => {
            await expect(lotPage.signInDialog).toBeVisible();
        });

        await test.step('Verify that the favourites counter did not change', async () => {
            const afterCount = await lotPage.favourites.getAttribute('count');
            expect(Number(afterCount)).toBe(before.favourites);
        });
    });

    test('TC-006: [Auth-Gate] prompts anonymous users to sign in and does not alter the current bid', async ({
        homePage,
        searchResultsPage,
        lotPage,
    }) => {
        await test.step("Open Catawiki's website and search for a keyword", async () => {
            await homePage.open();
            await homePage.searchViaMagnifier(SEARCH_TERMS.DIAMONDS);
        });

        await test.step('Verify that the search results page is open', async () => {
            await expect(searchResultsPage.heading()).toHaveText(SEARCH_TERMS.DIAMONDS);
        });

        const before = await test.step('Open a lot page and capture its current bid', async () => {
            await searchResultsPage.clickLotByIndex(4);
            return await lotPage.getLotDetails();
        });

        await test.step('Place a bid higher than the current bid as an anonymous user', async () => {
            const nextBid = calculateNextBidAmount(before.currentBid);
            await lotPage.placeBid(nextBid);
        });

        await test.step('Verify that the sign-in dialog is shown', async () => {
            await expect(lotPage.signInDialog).toBeVisible();
        });

        await test.step('Verify that the current bid did not change', async () => {
            const after = await lotPage.getLotDetails();
            expect(Number(after.currentBid.amount)).toBe(before.currentBid.amount);
        });
    });
});

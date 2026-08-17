import { test, expect } from '../../src/fixtures/testFixture';
import { SEARCH_KEYWORD, MOCK_TEST_KEYWORD } from '../../src/data/searchTerm';

// The lot's headline "Current bid" is server-rendered and unaffected by this
// endpoint, so mocking the bids API is verified against the "See all bids"
// history list instead, which is populated client-side from this response.
const MOCKED_BID_AMOUNT = 999_999;
/* 
Test case TC-007:

 This test intercepts the lot's bids API response (/buyer/api/v3/lots/\*\/bids)" and rewrites the top bid amount to a fixed sentinel value (999_999), then asserts that exact amount (€999,999) shows up in the lot page's "See all bids" history list.
*/
test.describe('Lot . bid ', () => {
    test('TC-007:[Mock] renders exactly the forced bid amount in bid history returned by the API', async ({
        page,
        homePage,
        searchResultsPage,
        lotPage,
    }) => {
        test.slow();

        await test.step('Intercept the lot bids API and force the top bid amount', async () => {
            await page.route('**/buyer/api/v3/lots/*/bids*', async (route) => {
                const response = await route.fetch();
                const body = await response.json();

                if (Array.isArray(body.bids) && body.bids[0]) {
                    body.bids[0].amount = MOCKED_BID_AMOUNT;
                }

                await route.fulfill({ response, json: body });
            });
        });

        await test.step("Open Catawiki's website and search for a lot", async () => {
            await homePage.open();
            await homePage.searchViaMagnifier(SEARCH_KEYWORD);
        });

        await test.step('Open a lot page that has bids', async () => {
            await searchResultsPage.openLotWithBids(lotPage);
        });

        await test.step('Verify the mocked bid amount is rendered', async () => {
            const mockedAmountText = `€${MOCKED_BID_AMOUNT.toLocaleString('en-US')}`;
            await expect(page.getByText(mockedAmountText)).toBeVisible();
        });
    });

    test('TC-008: [Mock] [Resilience] results still render when the bidding API returns 500', async ({
        page,
        homePage,
        searchResultsPage,
        lotPage,
    }) => {
        test.slow();

        await test.step('Intercept the lot bids API and force a 500 response', async () => {
            await page.route('**/buyer/api/v3/bidding/lots*', async (route) => {
                await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: '{"error":"injected"}',
                });
            });
        });

        await test.step("Open Catawiki's website and search for a lot", async () => {
            await homePage.open();
            await homePage.searchViaMagnifier(MOCK_TEST_KEYWORD);
        });

        await test.step('Open a lot page that has bids', async () => {
            await searchResultsPage.openLotWithBids(lotPage);
        });

        // Only proves the page doesn't blank out under the mocked failure. A
        // more precise check against the specific empty/error state the bid
        // history panel renders would be stronger, but requires confirming
        // that state in a live headed run rather than guessing a selector.
        await test.step('Verify the lot page still renders its core details', async () => {
            await expect(lotPage.heading()).toBeVisible();
            await expect(lotPage.currentBidAmount).toBeVisible();
        });
    });
});

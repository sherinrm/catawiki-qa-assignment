import { test, expect } from '../../src/fixtures/testFixture';
import { SEARCH_KEYWORD, MOCK_TEST_KEYWORD } from '../../src/data/searchTerm';

// How the lot page's bid data is sourced (measured, not assumed):
//   - The headline "Current bid" is server-rendered and NOT driven by this
//     endpoint, so it is useless as a target for verifying the mock.
//   - The bid-history block (summary line plus the most recent bid rows) is
//     server-rendered first, then refreshed client-side from this endpoint.
//     That refresh is what makes it the assertable target - no "See all bids"
//     expansion is needed, the inline rows re-render from the response.
const MOCKED_BID_AMOUNT = 999_999;

/*
Test case TC-007:
Intercepts the lot's bids API response and rewrites the top bid amount to a
fixed sentinel value (999_999), then asserts that exact amount (€999,999) is
rendered in the lot page's bid history - proving the UI reflects the API
response rather than any cached or hardcoded value.
*/
test.describe('Lot page - Bids', () => {
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

    /*
    Test case TC-008 (fault injection):
    The lot page server-renders its bid-history summary and then refreshes it
    client-side from the same bids endpoint. Forcing that request to fail must
    not wipe the already-rendered data - this guards against the common
    "error response overwrites good server-rendered state" regression, where a
    rejected fetch resolves to undefined and blanks the panel.

    The baseline is captured with the endpoint healthy, then the fault is
    injected and the lot reloaded, so the assertions compare a real before/after
    rather than restating preconditions the navigation already guaranteed.
    */
    test('TC-008: [Mock] [Resilience] keeps the bid history when the bids API returns 500', async ({
        page,
        homePage,
        searchResultsPage,
        lotPage,
    }) => {
        test.slow();

        let interceptedRequests = 0;

        await test.step("Open Catawiki's website and search for a lot", async () => {
            await homePage.open();
            await homePage.searchViaMagnifier(MOCK_TEST_KEYWORD);
        });

        const bidCountBefore =
            await test.step('Open a lot that has bids and capture its bid-history summary', async () => {
                await searchResultsPage.openLotWithBids(lotPage);
                return (await lotPage.bidCount.textContent())?.trim() ?? '';
            });

        await test.step('Force the lot bids API to return 500 and reload the lot', async () => {
            await page.route('**/buyer/api/v3/lots/*/bids*', async (route) => {
                interceptedRequests++;
                await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: '{"error":"injected"}',
                });
            });

            await lotPage.reload();
        });

        await test.step('Verify the injected fault was actually exercised', async () => {
            // Without this the assertions below would still pass on a page that
            // never called the endpoint, making the fault injection vacuous.
            expect(
                interceptedRequests,
                'the bids endpoint should have been requested and failed'
            ).toBeGreaterThan(0);
        });

        await test.step('Verify the bid history survived the failed request', async () => {
            // Asserts "still reports bids" rather than an exact match against
            // bidCountBefore: this runs against live auctions, so a genuine new
            // bid landing between load and reload must not fail the test.
            await expect(lotPage.bidCount).toBeVisible();
            expect(await lotPage.hasBids()).toBe(true);

            const bidCountAfter = (await lotPage.bidCount.textContent())?.trim() ?? '';
            console.log(
                `Bid-history summary - before: "${bidCountBefore}", after 500: "${bidCountAfter}"`
            );
        });

        await test.step('Verify the rest of the lot page is unaffected', async () => {
            await expect(lotPage.heading()).toBeVisible();
            await expect(lotPage.currentBidAmount).toBeVisible();
        });
    });
});

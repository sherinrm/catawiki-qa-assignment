import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import type { LotPage } from './LotPage';

export class SearchResultsPage extends BasePage {
    readonly lotLinks: Locator;
    readonly noExactText: Locator;
    readonly noMatchText: Locator;

    constructor(page: Page) {
        super(page);

        this.lotLinks = page.locator('[data-testid^="lot-card-container-"]');
        this.noExactText = page
            .getByTestId('SearchResults')
            .getByText('No exact results. Check out these related objects.', { exact: true });
        this.noMatchText = page
            .locator('[data-sentry-component="NoSearchResults"]')
            .getByText('No matches for', { exact: false });
    }

    async verifyLoaded(): Promise<void> {
        await expect(this.lotLinks.first()).toBeVisible();
    }

    async getLotCount(): Promise<number> {
        return await this.lotLinks.count();
    }

    async clickLotByIndex(index: number): Promise<void> {
        await expect(this.lotLinks.nth(index)).toBeVisible();
        const card = this.lotLinks.nth(index);
        await card.getByRole('link').click();
    }

    /**
     * Clicks lot cards starting at `startIndex`, returning once one has bids.
     * Needed because which lot lands at a given index is nondeterministic,
     * and some lots have zero bids (see LotPage.hasBids).
     */
    async openLotWithBids(lotPage: LotPage, startIndex = 1, maxAttempts = 5): Promise<void> {
        const lotCount = await this.getLotCount();
        const lastIndex = Math.min(startIndex + maxAttempts, lotCount);

        for (let index = startIndex; index < lastIndex; index++) {
            await this.clickLotByIndex(index);
            await lotPage.verifyLoaded();

            if (await lotPage.hasBids()) {
                return;
            }

            await this.goBack();
            await this.verifyLoaded();
        }

        throw new Error(
            `Could not find a lot with bids among search result indices ${startIndex}-${lastIndex - 1}.`
        );
    }
}

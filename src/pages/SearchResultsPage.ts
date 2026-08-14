import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

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
}

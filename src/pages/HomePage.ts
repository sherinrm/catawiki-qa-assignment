import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { dismissConsentIfPresent } from './components/ConsentBanner';

export class HomePage extends BasePage {
    readonly searchInput: Locator;
    readonly magnifierButton: Locator;

    constructor(page: Page) {
        super(page);

        this.searchInput = page.getByTestId('search-field').first();

        // The visible search icon button, used to submit a search without
        // relying on <Enter>, e.g. when the input is empty.
        this.magnifierButton = page.getByRole('button', { name: 'Search' }).first();
    }

    async open(): Promise<void> {
        await this.goto('/en');
        await this.verifyLoaded();
    }

    async verifyLoaded(): Promise<void> {
        await expect(this.searchInput).toBeVisible();
        await expect(this.magnifierButton).toBeEnabled();
    }

    async type(keyword: string): Promise<void> {
        await this.searchInput.waitFor({ state: 'visible' });
        await this.searchInput.fill(keyword);
    }

    async searchViaMagnifier(keyword: string): Promise<void> {
        await this.type(keyword);

        // The consent banner can render asynchronously and appear after the
        // navigation-time dismissal in BasePage.goto() already ran, in which
        // case it sits over the page and intercepts this click. Re-check
        // right before clicking, retrying once if it was still intercepted.
        for (let attempt = 0; attempt < 2; attempt++) {
            await dismissConsentIfPresent(this.page);
            try {
                await this.magnifierButton.click({ timeout: 5_000 });
                return;
            } catch (error) {
                if (attempt === 1) throw error;
            }
        }
    }

    async searchViaKeyboard(keyword: string): Promise<void> {
        await this.type(keyword);
        await this.page.keyboard.press('Enter');
    }
}

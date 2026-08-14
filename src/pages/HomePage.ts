import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
    readonly searchInput: Locator;
    readonly magnifierButton: Locator;

    constructor(page: Page) {
        super(page);

        this.searchInput = page.getByTestId('search-field').first();

        // The visible search icon button, used to submit a search without
        // relying on <Enter>, e.g. when the input is empty.
        this.magnifierButton = page.getByRole('button', { name: 'Search', exact: true }).first();
    }

    async open(): Promise<void> {
        await this.goto('/en');
        await this.verifyLoaded();
    }

    async verifyLoaded(): Promise<void> {
        await expect(this.searchInput).toBeVisible();
    }

    async type(keyword: string): Promise<void> {
        await this.searchInput.waitFor({ state: 'visible' });
        await this.searchInput.fill(keyword);
    }

    async searchViaMagnifier(keyword: string): Promise<void> {
        await this.type(keyword);
        await this.magnifierButton.click();
    }

    async searchViaKeyboard(keyword: string): Promise<void> {
        await this.type(keyword);
        await this.page.keyboard.press('Enter');
    }
}

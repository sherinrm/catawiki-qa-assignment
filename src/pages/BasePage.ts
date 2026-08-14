import { Locator, Page } from '@playwright/test';
import { dismissConsentIfPresent } from './components/ConsentBanner';

export abstract class BasePage {
    constructor(protected readonly page: Page) {}

    /**
     * Navigates relative to playwright.config.ts's baseURL.
     */
    async goto(path: string = '/'): Promise<void> {
        await this.page.goto(path);
        await dismissConsentIfPresent(this.page);
    }

    heading(): Locator {
        return this.page.locator('h1').first();
    }

    async goBack(): Promise<void> {
        await this.page.goBack({ waitUntil: 'domcontentloaded' });
    }

    abstract verifyLoaded(): Promise<void>;
}

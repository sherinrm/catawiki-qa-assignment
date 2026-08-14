import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { parseMoney, parseCount, type Money } from '../helpers/parse';

export interface LotDetails {
    lotName: string;
    favourites: number;
    currentBid: Money;
}

export class LotPage extends BasePage {
    readonly currentBidAmount: Locator;
    readonly favourites: Locator;
    readonly bidAmountInput: Locator;
    readonly signInDialog: Locator;
    readonly placeBidButton: Locator;
    readonly seeAllBidsLink: Locator;

    constructor(page: Page) {
        super(page);

        this.currentBidAmount = page.locator('[data-sentry-component="Amount"]').first();
        this.favourites = page.getByTitle('favourite').first();
        this.signInDialog = page.getByRole('dialog', { name: 'Sign in or create an account' });
        this.placeBidButton = page.getByRole('button', { name: 'Place bid', exact: true }).first();
        this.bidAmountInput = page.locator('input[data-sentry-component="BidInput"]').first();
        // Text includes a dynamic bid count, e.g. "See all bids (15)".
        this.seeAllBidsLink = page.getByText(/see all bids/i);
    }

    async verifyLoaded(): Promise<void> {
        await expect(this.heading()).toBeVisible();
        await expect(this.currentBidAmount).toBeVisible();
    }

    async getLotName(): Promise<string> {
        return await this.heading().innerText();
    }

    async getLotDetails(): Promise<LotDetails> {
        await this.verifyLoaded();
        const [lotName, favourites, currentBid] = await Promise.all([
            this.heading().textContent(),
            this.favourites.getAttribute('count'),
            this.currentBidAmount.textContent(),
        ]);

        return {
            lotName: (lotName ?? '').trim(),
            favourites: parseCount(favourites ?? ''),
            currentBid: parseMoney(currentBid ?? ''),
        };
    }

    async placeBid(amount: number): Promise<void> {
        await expect(this.bidAmountInput).toBeVisible();
        await this.bidAmountInput.fill(amount.toString());
        await expect(this.placeBidButton).toBeVisible();
        await this.placeBidButton.click();
    }

    async openBidHistory(): Promise<void> {
        await expect(this.seeAllBidsLink).toBeVisible();
        await this.seeAllBidsLink.click();
    }

    async reload(): Promise<void> {
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        await this.verifyLoaded();
    }
}

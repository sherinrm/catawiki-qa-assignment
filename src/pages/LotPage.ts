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
    readonly noBidsText: Locator;

    constructor(page: Page) {
        super(page);

        this.currentBidAmount = page.locator('[data-sentry-component="Amount"]').first();
        this.favourites = page.getByTitle('favourite').first();
        this.signInDialog = page.getByRole('dialog', { name: 'Sign in or create an account' });
        this.placeBidButton = page.getByRole('button', { name: 'Place bid', exact: true }).first();
        this.bidAmountInput = page.locator('input[data-sentry-component="BidInput"]').first();
        // Text includes a dynamic bid count, e.g. "See all bids (15)".
        this.seeAllBidsLink = page.getByText(/see all bids/i);
        this.noBidsText = page.getByText('No bids placed', { exact: true });
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

    /**
     * Resolves once the lot page shows either the bid-history link or the
     * "No bids placed" empty state, whichever renders — avoids waiting out a
     * full timeout against the wrong locator when a lot has zero bids.
     */
    async hasBids(): Promise<boolean> {
        const bidsState = this.seeAllBidsLink.or(this.noBidsText);
        await expect(bidsState.first()).toBeVisible({ timeout: 10_000 });
        return await this.seeAllBidsLink.isVisible();
    }

    async openBidHistory(): Promise<void> {
        if (!(await this.hasBids())) {
            throw new Error('Cannot open bid history: this lot has no bids ("No bids placed").');
        }
        await this.seeAllBidsLink.click();
    }

    async reload(): Promise<void> {
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        await this.verifyLoaded();
    }
}

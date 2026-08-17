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
    readonly bidCount: Locator;
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
        // "N bid"/"N bids" in the bid-history header — present regardless of
        // count, unlike seeAllBidsLink which only renders above a threshold.
        this.bidCount = page
            .locator('[data-sentry-component="BidHistoryHeaderWithStats"]')
            .getByText(/^\d+\s+bids?$/i);
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
     * Resolves to whether the lot has one or more bids. Races the count
     * against the empty state instead of waiting out a fixed timeout on
     * whichever one doesn't apply, and never throws on timeout — a
     * slow/absent render is treated as "no bids" so callers (e.g.
     * SearchResultsPage.openLotWithBids) can move on to the next lot
     * instead of failing outright.
     */
    async hasBids(): Promise<boolean> {
        const appeared = await this.bidCount
            .or(this.noBidsText)
            .first()
            .waitFor({ state: 'visible', timeout: 10_000 })
            .then(() => true)
            .catch(() => false);

        if (!appeared) return false;

        const text = await this.bidCount.textContent().catch(() => null);
        return Number(text?.match(/\d+/)?.[0] ?? 0) > 0;
    }

    async openBidHistory(): Promise<void> {
        if (!(await this.hasBids())) {
            throw new Error('Cannot open bid history: this lot has no bids.');
        }
        // seeAllBidsLink only renders once the bid count exceeds what's
        // shown inline (observed threshold: >3) — below that, the bids are
        // already visible and there's nothing to expand.
        if (await this.seeAllBidsLink.isVisible()) {
            await this.seeAllBidsLink.click();
        }
    }

    async reload(): Promise<void> {
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        await this.verifyLoaded();
    }
}

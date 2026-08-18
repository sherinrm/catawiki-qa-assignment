import type { Money } from './parse';
/**
 * Calculates the next valid bid, one increment above the current one.
 *
 * @param currentBid - The lot's current bid, as parsed by `parseMoney`.
 * @param incrementPercentage - Percentage to raise by. Defaults to 7.
 * @returns The next bid amount, rounded up to a whole unit.
 * @throws If `incrementPercentage` is not positive, or `currentBid.amount`
 *   is not a positive finite number.
 */
export function calculateNextBidAmount(currentBid: Money, incrementPercentage: number = 7): number {
    if (incrementPercentage <= 0) {
        throw new Error(
            `calculateNextBidAmount: incrementPercentage must be positive (received ${incrementPercentage})`
        );
    }

    if (!Number.isFinite(currentBid.amount) || currentBid.amount <= 0) {
        throw new Error(
            `calculateNextBidAmount: currentBid.amount must be a positive finite number (received ${currentBid.amount})`
        );
    }

    return Math.ceil(currentBid.amount * (1 + incrementPercentage / 100));
}

import type { Money } from './parse';

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

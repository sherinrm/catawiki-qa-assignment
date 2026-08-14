export interface Money {
    raw: string;
    amount: number;
    currency: string;
}

const MONEY_PATTERN = /^(\D+?)\s*([\d.,]+)\s*$/;

export function parseMoney(input: string): Money {
    const trimmed = input.trim();
    const match = trimmed.match(MONEY_PATTERN);

    if (!match) {
        throw new Error(`Unable to parse money string: "${input}"`);
    }

    const currency = match[1];
    const numericPart = match[2];

    if (currency === undefined || numericPart === undefined) {
        throw new Error(`Unable to parse money string: "${input}"`);
    }

    const amount = parseFloat(normalizeNumeric(numericPart));

    if (Number.isNaN(amount)) {
        throw new Error(`Unable to parse amount from money string: "${input}"`);
    }

    return { raw: input, amount, currency: currency.trim() };
}

/**
 * Parses a favourites/bid counter into a number.
 * Accepts the raw `count` attribute as well as rendered text containing a formatted number (e.g. "1,234").
 */
export function parseCount(raw: string | null | undefined): number {
    if (raw === null || raw === undefined || raw.trim() === '') {
        throw new Error(`parseCount: received empty value (${raw})`);
    }
    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) {
        throw new Error(`parseCount: no digits in ${JSON.stringify(raw)}`);
    }
    return Number(digits);
}

// Disambiguates "1,234.56" (US, comma = thousands) from "1.234,56" (EU, dot = thousands)
// by treating whichever separator appears last as the decimal point.
function normalizeNumeric(numericPart: string): string {
    const lastComma = numericPart.lastIndexOf(',');
    const lastDot = numericPart.lastIndexOf('.');

    if (lastComma !== -1 && lastDot !== -1) {
        return lastComma > lastDot
            ? numericPart.replace(/\./g, '').replace(',', '.')
            : numericPart.replace(/,/g, '');
    }

    if (lastComma !== -1) {
        return numericPart.replace(',', '.');
    }

    // No comma present. A valid decimal has at most one dot, so 2+ dots can
    // only be thousands separators, e.g. "1.234.567" -> "1234567".
    const dotCount = (numericPart.match(/\./g) ?? []).length;
    if (dotCount > 1) {
        return numericPart.replace(/\./g, '');
    }

    return numericPart;
}

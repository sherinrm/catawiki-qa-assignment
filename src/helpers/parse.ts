export interface Money {
    raw: string;
    amount: number;
    currency: string;
}

const MONEY_PATTERN = /^(\D+?)\s*([\d.,]+)\s*$/;

/**
 * Parses a rendered money string into its currency symbol and numeric amount.
 *
 * Expects the currency to lead, e.g. `"€ 1,234.56"`, `"$1,200"`, `"€10"`.
 * Thousands/decimal separators are locale-agnostic: whichever of `,` or `.`
 * appears last is treated as the decimal point, so both `"1,234.56"` (US) and
 * `"1.234,56"` (EU) yield `1234.56`.
 *
 * The original string is kept on `raw` so a caller can report exactly what the
 * page displayed, rather than a re-formatted approximation of it.
 *
 * @param input - Money text as rendered on the page. Surrounding whitespace is
 *   trimmed; a trailing-currency format (`"1,20 €"`) is not supported.
 * @returns The `raw` input, the parsed `amount`, and the trimmed `currency`.
 * @throws If the string does not match "currency then digits", or the numeric
 *   part cannot be parsed as a number.
 *
 * @example
 * parseMoney('€ 1.234,56'); // { raw: '€ 1.234,56', amount: 1234.56, currency: '€' }
 */
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

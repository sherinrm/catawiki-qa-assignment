export const SEARCH_TERMS = {
    WATCH: 'Watch',
    DIAMONDS: 'Diamonds',
    CARS: 'Cars',
} as const;

export const SEARCH_KEYWORD = 'Train';

// Used by lot-page-bids-mock.spec.ts; kept separate from SEARCH_TERMS since
// that object is looped over by search-positive-cases.spec.ts's data-driven test.
export const MOCK_TEST_KEYWORD = 'purse';

/**
 * A keyword unlikely to ever match a real auction lot title, for
 * exercising the zero-results search path.
 */
export const UNIQUE_UNLIKELY_KEYWORDS = {
    noMatch: `zzzxxyy_${Date.now()}`,
    specialCharacter: '!@#$%^&*()_+{}',
} as const;

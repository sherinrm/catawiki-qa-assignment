import { test, expect } from '../../src/fixtures/testFixture';
import { Endpoints, type SuggestResponse } from '../../src/api/endpoints';

test.describe('Search suggestions', () => {
    test('TC-009: [API] returns a well-formed suggestion payload', async ({ homePage, page }) => {
        // A browser session must be established first: the API is behind bot
        // protection that rejects requests with no prior page cookies.
        await homePage.open();

        const response = await page.request.get(Endpoints.searchSuggest, {
            params: { q: 'Train', locale: 'en', size: 5, filters: 'query_terms' },
        });

        expect(response.status()).toBe(200);

        const body = (await response.json()) as SuggestResponse;
        const queryTerms = body.query_terms ?? [];

        expect(Array.isArray(queryTerms)).toBe(true);
        expect(queryTerms.length).toBeGreaterThan(0);

        const firstSuggestion = queryTerms[0];
        expect(firstSuggestion, 'response must contain at least one suggestion').toBeTruthy();
        if (!firstSuggestion) {
            throw new Error('No suggestions returned in the payload');
        }

        expect(firstSuggestion.text.toLowerCase()).toContain('train');
        console.log('suggest payload', JSON.stringify(body, null, 2));

        for (const entry of queryTerms) {
            expect(typeof entry.text, 'each suggestion needs text').toBe('string');
            expect(entry.text.length).toBeGreaterThan(0);
            expect(entry.entity, 'each suggestion needs an entity').toBeTruthy();
            expect(typeof entry.entity.type).toBe('string');
        }
    });
});

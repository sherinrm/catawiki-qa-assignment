import { test, expect } from '../../src/fixtures/testFixture';

test.describe('Search suggest API', () => {
    test('TC-009: [API] returns a well-formed response for a valid search term', async ({
        homePage,
        page,
    }) => {
        // A browser session must be established first: the API is behind bot
        // protection that rejects requests with no prior page cookies.
        await homePage.open();

        const response = await page.request.get('/buyer/api/v1/search/suggest', {
            params: { q: 'Train', locale: 'en', size: 5, filters: 'query_terms' },
        });

        expect(response.status()).toBe(200);
      
        const body = await response.json();
        expect(Array.isArray(body.query_terms)).toBe(true);
        expect(body.query_terms.length).toBeGreaterThan(0);
        expect(body.query_terms[0].text.toLowerCase()).toContain('train');
    });
});

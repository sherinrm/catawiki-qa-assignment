import { test as baseTest } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { SearchResultsPage } from '../pages/SearchResultsPage';
import { LotPage } from '../pages/LotPage';

type TestFixtures = {
    homePage: HomePage;
    searchResultsPage: SearchResultsPage;
    lotPage: LotPage;
};

export const test = baseTest.extend<TestFixtures>({
    homePage: async ({ page }, use) => {
        const homePage = new HomePage(page);
        await use(homePage);
    },

    searchResultsPage: async ({ page }, use) => {
        const searchResultsPage = new SearchResultsPage(page);
        await use(searchResultsPage);
    },

    lotPage: async ({ page }, use) => {
        const lotPage = new LotPage(page);
        await use(lotPage);
    },
});

export { expect } from '@playwright/test';

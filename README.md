# Catawiki QA Assignment

Playwright + TypeScript end-to-end and API test suite for [catawiki.com](https://www.catawiki.com). Tests run against the **live production site** — there is no mocked/local environment — so a few of the choices below exist specifically to work around real-world constraints of testing a live, bot-protected site.

## Prerequisites & setup

```bash
npm install
npx playwright install --with-deps chromium
```

## Environment variables

| Variable   | Default                    | Purpose                                                                       |
| ---------- | -------------------------- | ----------------------------------------------------------------------------- |
| `BASE_URL` | `https://www.catawiki.com` | Overrides the target site, e.g. for a staging environment.                    |
| `CI`       | unset                      | Set by GitHub Actions; adjusts retries/workers/`forbidOnly`.                  |
| `HEADLESS` | unset (headed)             | Opt-in override, see [Known quirks](#known-quirks--deliberate-choices) below. |

## Running tests

```bash
npm test              # full suite
npm run test:e2e      # tests/e2e only
npm run test:api      # tests/api only
npm run test:headed   # explicit headed run (headed is already the default)
npx playwright test -g "TC-005"   # filter by test case ID or title text

npm run typecheck     # tsc --noEmit
npm run format        # prettier --write .
npm run format:check  # prettier --check .
npm run report         # open the last HTML report
```

## Project structure

- `src/pages/` — Page Object Model. Every page object extends `BasePage` and implements the abstract `verifyLoaded(): Promise<void>` contract.
- `src/pages/components/` — reusable UI-fragment logic that isn't a full page (currently just the cookie-consent banner handling).
- `src/fixtures/testFixture.ts` — the custom `test`/`expect` all specs import; wires up `homePage`, `searchResultsPage`, `lotPage` fixtures.
- `src/helpers/` — pure, framework-independent logic (money/count parsing, bid calculation). No Playwright imports; unit-testable in isolation.
- `src/data/` — test data constants (SCREAMING_SNAKE_CASE).
- `tests/e2e/` vs `tests/api/` — UI-driven flows vs. direct API assertions. Both use the same fixtures/page objects (API tests still need a `homePage.open()` first — see below).

## Conventions

- **Page object contract**: every page object implements `verifyLoaded()`, enforced by an abstract method on `BasePage`.
- **Test data**: constants in `src/data/` use `SCREAMING_SNAKE_CASE`, treated as fixed lookup tables/enums.
- **Test IDs**: every test title is prefixed `TC-###: [Tag] description`. A parameterized/data-driven test (e.g. a `for` loop generating multiple Playwright tests) shares one ID across its data variations — the interpolated data in the title is what distinguishes the runs, not the ID.
- **Tag vocabulary**:
    | Tag           | Meaning                                               |
    | ------------- | ----------------------------------------------------- |
    | `[LOT]`       | End-to-end lot browsing/detail flows                  |
    | `[Search]`    | Search behavior, including edge cases                 |
    | `[Auth-Gate]` | Anonymous-user auth gating (favourites, bidding)      |
    | `[Mock]`      | Tests using `page.route()` network interception       |
    | `[API]`       | Direct API assertions, no UI interaction beyond setup |

## Known quirks & deliberate choices

These aren't oversights — they're workarounds discovered while building this suite against the real, bot-protected production site:

- **`headless: false` and `workers: 1`** in `playwright.config.ts` are deliberate. Akamai/Usercentrics bot detection on catawiki.com blocks headless automated traffic and flags concurrent sessions as bot-like; running headed and serially avoids getting hard-blocked (`Access Denied` / Akamai edge errors). `headless` has a `HEADLESS=true` opt-in for local experimentation — don't flip the CI default without confirming it still works.
- **`tests/api/search-suggest-api.spec.ts` uses `page.request`, not the bare `request` fixture.** The suggest API is behind the same bot protection; a request with no prior browser session/cookies gets a 403. `homePage.open()` establishes that session first.
- **`clickLotByIndex(N)` picks an arbitrary lot from live search results.** This is inherently a bit fragile — it assumes that lot stays live and (for bid-related tests) keeps its bid history — but there's no fixture/mocked catalog to pin against since tests run against production inventory.
- **`src/pages/*.ts` locators keyed on `data-sentry-component`** (Sentry's auto-injected instrumentation attribute) are a known fragility, used only where no `data-testid` exists on the live site. They could break if the app's Sentry config changes.

## Known limitations

- **ESLint is not installed.** `typescript-eslint` does not yet support this project's TypeScript version (`7.0.2`, TypeScript's native/Go-rewrite line) — it hard-fails at load time. Support for TS 7.1+ is tracked upstream: [typescript-eslint/typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940). Revisit once that ships; Prettier is installed and configured in the meantime (`npm run format`).

## Reports

- **HTML report**: `playwright-report/`, open via `npm run report`.
- **Allure**: raw results land in `allure-results/`. The Allure CLI isn't a project dependency; generate/view on demand with `npx allure-commandline generate allure-results --clean -o allure-report && npx allure-commandline open allure-report`.

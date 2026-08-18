# Catawiki QA Assignment

Playwright + TypeScript end-to-end and API test suite for [catawiki.com](https://www.catawiki.com). Tests run against the **live production site** — there is no mocked/local environment — so a few of the choices below exist specifically to work around real-world constraints of testing a live, bot-protected site.

## Prerequisites & setup

```bash
npm install
npx playwright install --with-deps chrome firefox webkit
```

## Environment variables

| Variable   | Default                    | Purpose                                                                                            |
| ---------- | -------------------------- | -------------------------------------------------------------------------------------------------- |
| `BASE_URL` | `https://www.catawiki.com` | Overrides the target site, e.g. for a staging environment.                                         |
| `CI`       | unset                      | Set by GitHub Actions; adjusts retries/workers/`forbidOnly`.                                       |
| `HEADLESS` | unset (headless)           | Set to `false` to run headed locally, see [Known quirks](#known-quirks--deliberate-choices) below. |

## Running tests

```bash
npm test                  # full suite
npm run test:e2e          # tests/e2e only, all browser projects
npm run test:e2e-chromium # tests/e2e only, chromium project only
npm run test:smoke        # tests tagged @smoke only
npm run test:api          # tests/api only (see CI note below)
npm run test:headed       # explicit headed run
npx playwright test -g "TC-005"   # filter by test case ID or title text

npm run typecheck     # tsc --noEmit
npm run lint          # eslint .
npm run lint:fix      # eslint . --fix
npm run format        # prettier --write .
npm run format:check  # prettier --check .
npm run report         # open the last HTML report
```

CI (`.github/workflows/playwright.yml`) runs on every push/PR to `main`/`master`, and can also be triggered manually from the Actions tab (`workflow_dispatch`), where you can pick which of the three `npm run test:*` commands above to run.

## Project structure

- `src/pages/` — Page Object Model. Every page object extends `BasePage` and implements the abstract `verifyLoaded(): Promise<void>` contract.
- `src/pages/components/` — reusable UI-fragment logic that isn't a full page (currently just the cookie-consent banner handling).
- `src/fixtures/testFixture.ts` — the custom `test`/`expect` all specs import; wires up `homePage`, `searchResultsPage`, `lotPage` fixtures.
- `src/api/` — the HTTP surface of the site under test: request paths, `page.route()` glob patterns, and response type definitions. The API-layer counterpart to `src/pages/`.
- `src/helpers/` — pure, framework-independent logic (money/count parsing, bid calculation). No Playwright imports; unit-testable in isolation.
- `src/data/` — test data constants .
- `tests/e2e/` vs `tests/api/` — UI-driven flows vs. direct API assertions. Both use the same fixtures/page objects (API tests still need a `homePage.open()` first — see below).

## Conventions

- **Page object contract**: every page object implements `verifyLoaded()`, enforced by an abstract method on `BasePage`.
- **Test data**: constants in `src/data/` use `SCREAMING_SNAKE_CASE`, treated as fixed lookup tables/enums.
- **Test IDs**: every test title is prefixed `TC-###: [Tag] description`. A parameterized/data-driven test (e.g. a `for` loop generating multiple Playwright tests) shares one ID across its data variations — the interpolated data in the title is what distinguishes the runs, not the ID.
- **Tag vocabulary**:

    | Tag           | Meaning                                               |
    | ------------- | ----------------------------------------------------- |
    | `[Lot]`       | End-to-end lot browsing/detail flows                  |
    | `[Search]`    | Search behavior, including edge cases                 |
    | `[Auth-Gate]` | Anonymous-user auth gating (favourites, bidding)      |
    | `[Mock]`      | Tests using `page.route()` network interception       |
    | `[API]`       | Direct API assertions, no UI interaction beyond setup |

    Some titles append a second, more specific bracket tag alongside the
    one above, e.g. `[Search][Edge Case]` or `[Mock] [Resilience]`.

- **`@smoke` grep-tag**: separate from the bracket-tag vocabulary above, a trailing `@smoke` marks one high-value happy-path test per functional area — TC-001 (lot details), TC-002 (search), TC-005 (auth gate) — filterable via `npm run test:smoke` (`playwright test --grep @smoke`) or the CI `workflow_dispatch` dropdown. Deliberately excluded: the edge-case tests (TC-003/TC-004), the two `test.slow()` mock specs (TC-007/TC-008), and the API spec (TC-009, which 403s from CI runner IPs).

## Known quirks & deliberate choices

These aren't oversights — they're workarounds discovered while building this suite against the real, bot-protected production site:

- **`channel: 'chrome'`, not `headless: false`, is what beats bot detection.** Akamai/Usercentrics serves bundled headless Chromium an "Access Denied" page — neither a spoofed user-agent nor `--disable-blink-features=AutomationControlled` changes that — but headless _branded_ Chrome (`channel: 'chrome'`, what the `chromium` project pins) and branded Edge pass cleanly, and headless Firefox/WebKit pass with no special handling at all. So `headless` safely defaults to `true` for every project; set `HEADLESS=false` to opt into a visible browser for local debugging. `workers: 1` locally (`2` on CI) separately avoids flagging concurrent sessions as bot-like.
- **`tests/api/search-suggest-api.spec.ts` uses `page.request`, not the bare `request` fixture.** The suggest API is behind the same bot protection; a request with no prior browser session/cookies gets a 403. `homePage.open()` establishes that session first.
- **`tests/api/` is not run in CI.** Even with a prior browser session, GitHub Actions' runner IP gets a 403 from the same bot protection (likely IP-reputation/fingerprint-based, not just cookies) where a local run succeeds. The CI workflow only runs `test:e2e*`/`test:smoke`; `npm run test:api` is local-only for now.
- **`clickLotByIndex(N)` picks an arbitrary lot from live search results.** This is inherently a bit fragile — it assumes that lot stays live and (for bid-related tests) keeps its bid history — but there's no fixture/mocked catalog to pin against since tests run against production inventory.
- **`src/pages/*.ts` locators keyed on `data-sentry-component`** (Sentry's auto-injected instrumentation attribute) are a known fragility, used only where no `data-testid` exists on the live site. They could break if the app's Sentry config changes.

## Reports

- **HTML report**: `playwright-report/`, open via `npm run report`.
- **Allure**: raw results land in `allure-results/`. The Allure CLI isn't a project dependency; generate/view on demand with `npx allure-commandline generate allure-results --clean -o allure-report && npx allure-commandline open allure-report`.

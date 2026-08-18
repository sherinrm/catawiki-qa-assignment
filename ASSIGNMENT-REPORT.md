# Catawiki — QA Automation Engineer Take-Home Assignment

**Test Automation Report**

|                |                                                        |
| -------------- | ------------------------------------------------------ |
| **Author**     | Sherin (sherinrm@gmail.com)                            |
| **Repository** | https://github.com/sherinrm/playwright-test-assignment |
| **Stack**      | Playwright 1.62 · TypeScript 5.9 · Node LTS            |
| **Target**     | `https://www.catawiki.com` (live production)           |
| **Date**       | 18 August 2026                                         |

---

## 1. Introduction

This report describes what is delivered: a Playwright + TypeScript test suite of **10 test cases
(13 executable tests, 35 scheduled runs)** covering the required scenario plus search behaviour,
anonymous-user authorisation gating, network mocking, fault injection, the API layer, and
accessibility. The suite is built on a Page Object Model with typed fixtures and
helpers, and is wired into GitHub Actions with static quality gates ahead of any browser launch.

**The constraints** there is no staging environment, no seeded
test data, and no test account. Every test runs against live production, and nothing may mutate
real auction data. Three consequences follow, and they explain most of the choices in this report:

- Assertions target **shape and behaviour**, not fixed values — a lot's bid, favourites count and
  position in the result list all change between runs.
- Every state-changing action deliberately **stops at the sign-in gate**; the test verifies the gate
  holds rather than transacting against a real auction.
- Where determinism was impossible to obtain from the live site, it was **manufactured** — by
  mocking the API response (TC-007), by injecting a fault (TC-008), or by computing input from the
  page's own current state (TC-006).

---

## 2. Required scenario

Implemented as **TC-001** in `tests/e2e/lot-page-details.spec.ts`. Each step of the brief maps to a
named `test.step`, so the Playwright report reads as the scenario itself rather than as a wall of
locator calls.

| #   | Scenario step                                  | Implementation                                                                                                           |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Open Catawiki's website                        | `homePage.open()` — navigates to `/en`, dismisses the consent banner, verifies the page loaded                           |
| 2   | Type `Train`, click the magnifier button       | `homePage.searchViaMagnifier('Train')`                                                                                   |
| 3   | Verify the search results page is open         | `searchResultsPage.verifyLoaded()` plus an assertion that the heading equals the keyword and more than one lot is listed |
| 4   | Click the second lot                           | `searchResultsPage.clickLotByIndex(1)`                                                                                   |
| 5   | The lot page should be open                    | `lotPage.verifyLoaded()` — heading, current bid and favourites control all visible                                       |
| 6   | Read lot name, favourites counter, current bid | `lotPage.getLotDetails()` — returns a typed `LotDetails` object                                                          |
| 7   | Print the values to the console                | `console.log` of the formatted block below                                                                               |

Illustrative console output — the values differ on every run, because the lot at result position two
and its bid history are live auction data:

```
Lot details
-----------
Name:         Bemo H0m - Deels uit set 7258-140 - Model train passenger carriage set (3)
Favourites:   10
Current bid:  € 1
```

The test does not stop at printing. It also asserts the retrieved values are coherent: the lot name
is non-empty, the current bid parses to an amount greater than zero with a non-empty currency
symbol, and the favourites counter is a non-negative number. Printing alone would pass against a
page that rendered nothing.

---

## 3. Test cases in the suite

Ten test cases, each family using a different automation technique so that the suite demonstrates
range rather than ten variations of one idea.

| ID     | Area               | Technique                           | Test case description                                                                                                                                                                                                             |
| ------ | ------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-001 | Lot details        | End-to-end user journey             | Search for `Train`, open the second lot, then read, print and assert the lot name, favourites counter and current bid.                                                                                                            |
| TC-002 | Search — positive  | Data-driven, table of terms         | For each of `Watch`, `Diamonds`, `Cars`, verify the results page opens with the searched term as its heading and returns more than one matching lot.                                                                              |
| TC-003 | Search — edge case | Zero-result path, generated input   | Search a keyword no lot can match (uniquely generated per run) and a punctuation-only string; verify the "No exact results" message renders instead of an error.                                                                  |
| TC-004 | Search — negative  | Alternate input path (keyboard)     | Submit a whitespace-only search via the Enter key rather than the magnifier button; verify the "No matches for" empty state is handled gracefully.                                                                                |
| TC-005 | Auth gate          | Before/after state comparison       | As an anonymous user, click Favourite on a lot; verify the sign-in dialog appears **and** the favourites counter is unchanged afterwards.                                                                                         |
| TC-006 | Auth gate          | Before/after with computed input    | As an anonymous user, submit a bid computed from the lot's own current bid (+7%, rounded up); verify the sign-in dialog appears **and** the current bid is unchanged.                                                             |
| TC-007 | Network mocking    | Response interception and rewrite   | Intercept the lot's bids API, rewrite the top bid to a sentinel value (999,999), and verify the page renders exactly `€999,999` — proving the bid history is bound to the API response, not to cached or server-only data.        |
| TC-008 | Resilience         | Fault injection (forced HTTP 500)   | Force the same bids endpoint to fail after a healthy baseline is captured; verify the server-rendered bid history survives, the rest of the lot page is unaffected, and the injected fault was actually exercised.                |
| TC-009 | API                | Direct endpoint contract assertions | Call the search-suggest endpoint directly and assert the contract: HTTP 200, a non-empty `query_terms` array, the first suggestion matching the query, and every entry carrying non-empty text plus an entity with a string type. |
| TC-010 | Accessibility      | Automated axe-core scan             | Scan the homepage against WCAG 2.0 / 2.1 Level A and AA rules and assert zero violations, reporting each violation with its rule ID, impact and affected node count.                                                              |

### Execution matrix

| Playwright project          | Tests       | Scope                           |
| --------------------------- | ----------- | ------------------------------- |
| `chromium` (branded Chrome) | 12          | All UI tests plus the API test  |
| `firefox`                   | 11          | UI tests only                   |
| `webkit`                    | 11          | UI tests only                   |
| `accessibility`             | 1           | axe-core scan, isolated project |
| **Total**                   | **35 runs** | 13 tests across 4 projects      |

---

## 4. Design decisions

**Page Object Model .** Seperate class is created for each Page which extends `BasePage` provides shared navigation
(`goto`, `goBack`) and declares an abstract `verifyLoaded(): Promise<void>` that every
page object must implement.

**Typed fixtures.** `src/fixtures/testFixture.ts` extends Playwright's base `test` to inject
`homePage`, `searchResultsPage` and `lotPage`. Every spec imports this custom `test`/`expect`, so no
test file constructs a page object itself and one place controls how they are built.

**Component objects for non-page UI.** The cookie-consent banner is needed by nearly every flow but
is not a page, so it lives in `src/pages/components/ConsentBanner.ts`. Its dismissal is deliberately
best-effort — absence must never fail a test — and is re-attempted immediately before the magnifier
click, because the banner can render asynchronously after the navigation-time dismissal already ran.

**Framework-free helpers.** `src/helpers/` contains pure functions with zero Playwright imports,
unit-testable without a browser. `parseMoney` and `parseCount` convert rendered page values into
typed ones, resolving EU and US conventions by the last separator present,
and falling back to digit grouping when only one kind of separator appears and the string is
ambiguous on its own.
`calculateNextBidAmount` derives a bid above the lot's current one (+7%, rounded up) rather than
using a hardcoded figure, which would fall below the current bid as soon as real bidding moved past
it.

**Centralised API surface.** `src/api/endpoints.ts` holds request paths, `page.route()` glob patterns
and response type definitions in one place, shared by the API spec and both mock tests — a path
change is a one-line edit rather than a multi-file hunt.

**Named timeouts, not magic numbers.** `src/config/timeouts.ts` gives every non-default wait a name
and a documented reason, tuned against the live, occasionally throttled production site rather than
copied from Playwright's defaults.

**Conventions.** Test titles follow `TC-###: [Tag] description`, with a bracket tag vocabulary
(`[Lot]`, `[Search]`, `[Auth-Gate]`, `[Mock]`, `[API]`, `[A11y]`) and a `@smoke` grep tag marking one
high-value happy path per area (TC-001, TC-002, TC-005) for a fast confidence check.

**Static quality gates.** TypeScript runs in `strict` mode plus `noUncheckedIndexedAccess`,
`noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`, `noImplicitReturns` and
`noFallthroughCasesInSwitch`, so an unchecked array index or a dead parameter is a compile error
rather than a review comment. ESLint and Prettier enforce style on top.

**Environment handling.** The target host and headed/headless mode are environment-driven
(`BASE_URL`, `HEADLESS`), so the same suite can be pointed at a staging environment without a code
change. Locale and timezone are pinned to `en-GB` / `Europe/Amsterdam` for deterministic date and
currency rendering.

**Bot protection .** Bundled headless Chromium is served an "Access Denied"
page, and neither a spoofed user-agent nor automation-flag suppression changes that. Headless
_branded_ Chrome passes cleanly, as do headless Firefox and WebKit. The Chromium project therefore
pins `channel: 'chrome'`, and local runs use a single worker so concurrent sessions are not flagged
as bot-like.

**Reporting.** Playwright HTML and Allure reports, with trace on first retry, and screenshot and
video retained on failure — so a CI failure is diagnosable from artifacts without reproducing it
locally.

**AI Usage.** AI assistance was used during development for exploring Playwright API
options, reviewing framework structure, and drafting documentation. All test
design decisions, locator strategies, and the scoping of what to test and what
to leave out are my own. Every test was run and verified locally.

---

## 5. Continuous integration

GitHub Actions (`.github/workflows/playwright.yml`), running on Ubuntu.

| Stage            | Detail                                                                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Triggers**     | Push and pull request to `main` / `master`, plus manual `workflow_dispatch`                                                                                                       |
| **Manual scope** | A dropdown selects which suite to run: full e2e, smoke only, Chromium e2e, or the accessibility scan                                                                              |
| **Static gates** | `typecheck` → `format:check` → `lint`, all **before** any browser is installed or launched, so a formatting or typing error fails in seconds rather than after a full browser run |
| **Execution**    | Default `npm run test:e2e-chromium`; `retries: 2` and `workers: 2` on CI                                                                                                          |
| **Artifacts**    | HTML report, Allure results, and traces/screenshots/videos, uploaded with `if: !cancelled()` and 30-day retention so failures and passes are both inspectable                     |

**Two deliberate exclusions**, both consequences of testing production rather than a controlled
environment:

- `tests/api` runs locally only. The suggest endpoint sits behind the same bot protection as the
  site, and GitHub-hosted runner IPs receive a 403 where a local run succeeds.
- `tests/a11y` is opt-in via manual dispatch. The scan currently fails on pre-existing production
  violations; gating every push on defects outside this repository's control would leave CI
  permanently red and train the team to ignore it.

---

## 6. Out of scope

| Excluded                                       | Reason                                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| Anything behind login                          | No test account was provided; TC-005 and TC-006 verify the gate, not what lies past it |
| Actions that mutate production data            | Real bids and favourites affect real auctions and real sellers                         |
| Checkout, payments, seller and expert flows    | Real money and real inventory                                                          |
| Email, notifications and database verification | No mailbox, backend or database access                                                 |
| Load and stress testing                        | Not appropriate against a third party's production infrastructure                      |
| Search relevance and ranking quality           | Not deterministically assertable against a live, continuously changing catalogue       |
| Full locale and currency matrix                | Pinned to `en-GB` / `Europe/Amsterdam` for determinism                                 |
| Mobile and responsive viewports                | Device projects are configured but commented out — see next steps                      |

---

## 7. Proposed additional tests.

### 7.1 Additional scenarios for the test suite

Functional ground the current ten cases do not reach. **P0** = binding actions, money or data
integrity; **P1** = core journey degraded but usable; **P2** = cosmetic or low-traffic edge.

| Area                   | Scenario                                                                                       | Priority |
| ---------------------- | ---------------------------------------------------------------------------------------------- | -------- |
| **Bidding rules**      | Bid below the current bid is rejected                                                          | **P0**   |
|                        | Bid below the minimum increment is rejected                                                    | **P0**   |
|                        | Bid on an ended lot is rejected                                                                | **P0**   |
|                        | Full bid history agrees with the header bid count                                              | P1       |
| **Auction state**      | Ended lot renders its closed state with no bid control offered                                 | **P0**   |
|                        | Countdown agrees with the closing time across timezones and DST                                | **P0**   |
|                        | Zero-bid lot shows "No bids placed" and the starting bid                                       | P1       |
|                        | Reserve-not-met indicator renders on a reserve lot                                             | P1       |
| **Search & discovery** | Closed lots are excluded from, or clearly labelled in, live results                            | **P0**   |
|                        | Script/XSS payload in the search box renders as text and never executes                        | **P0**   |
|                        | Filters (category, price range, condition, country) narrow results correctly                   | P1       |
|                        | Sorting by relevance, time remaining and recently added                                        | P1       |
|                        | Pagination and load-more with no duplicated or skipped lots                                    | P1       |
|                        | Suggest dropdown UI renders, is keyboard-navigable and clicks through                          | P1       |
| **Seller & curation**  | Seller submits a lot for sale                                                                  | **P0**   |
|                        | Expert approve / reject / request-more-info state machine; a rejected lot never becomes public | **P0**   |
| **Localisation**       | Currency switch re-renders amounts with no double conversion                                   | **P0**   |
|                        | Language switch changes copy, date and price formatting                                        | P1       |
| **Lot page content**   | Shipping cost and seller information                                                           | P1       |
|                        | Image gallery and zoom                                                                         | P2       |
|                        | Related lots                                                                                   | P2       |
| **Navigation**         | Deep link straight to a lot URL, bypassing search                                              | P1       |
|                        | Browser back/forward between results and a lot                                                 | P1       |
| **Errors & consent**   | Non-existent lot ID returns a 404 page, not a blank shell                                      | P1       |
|                        | Offline or throttled network degrades gracefully                                               | P1       |
|                        | Consent Reject and Customise paths, not only Accept All                                        | P1       |

The bidding and auction-state rows are the highest-value gaps, because a bid is a binding action:
TC-006 only ever submits a _valid_ amount, so every rejection path is currently unverified. The
cases behind them — maximum-bid resolution, concurrent bids on one lot, fee/VAT/FX correctness — are
not simply more UI tests. They need a seeded environment, an injectable clock and an API-level
concurrency harness, so they are absent by constraint rather than by oversight.

### 7.2 Other test types to add

1. **Seeded test environment and authenticated journeys** — the highest-value investment. It removes
   live-data nondeterminism and unlocks everything currently blocked at the sign-in gate: bidding,
   favourites, watchlists, account management and order flows.
2. **Performance** — front-end performance validated with k6 browser testing, and backend
   performance, scalability and resilience assessed through k6 load testing, against a dedicated
   environment rather than production.
3. **Devices and responsive layout** — the `mobile-chrome` (Pixel 5) and `mobile-safari` (iPhone 12)
   projects are already configured and currently commented out. Re-enabling them should be paired
   with dedicated responsive specs rather than re-running the desktop suite at a smaller viewport,
   since the bidding block renders as a different component on small screens. Real-device coverage
   via a device cloud would follow, for the browsers emulation cannot represent.
4. **Accessibility beyond the homepage** — per-page scans of search results and the lot page,
   keyboard-only navigation, and focus trapping in the sign-in dialog that TC-005 and TC-006 already
   reach.
5. **Cross-browser as a scheduled matrix** — Firefox and WebKit are configured and passing; the full
   matrix is better run nightly than paid for on every push, with Chromium gating pull requests.
6. **Visual regression** — screenshot baselines for the lot page and search results, to catch layout
   breakage that assertion-based tests pass straight through.
7. **API contract and schema validation** — schema assertions on the endpoints already mapped in
   `src/api/endpoints.ts`, so a breaking backend change is caught before it reaches the UI suite.
8. **Unit tests for the helpers** — `parseMoney`, `parseCount` and `calculateNextBidAmount` are
   already pure and framework-free, making them directly unit-testable; their edge cases (separator
   conventions, malformed input, rounding) are far cheaper to cover there than through a browser.

---

_Prepared by Sherin · Playwright + TypeScript · August 2026_

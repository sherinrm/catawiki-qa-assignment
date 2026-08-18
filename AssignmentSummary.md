# Summary — Catawiki QA Assignment

A Playwright + TypeScript suite for catawiki.com: ten test cases spanning search, lot details,
authentication gating, network mocking, the API layer, and accessibility — built on a Page
Object Model with typed fixtures and browser-free helpers, and wired into GitHub Actions.

This document is the reasoning behind it: what each test actually claims, why it is written
the way it is, and what was left out on purpose. Setup and commands are in the
[README](README.md). The order below follows the work — the required scenario first, then the
ten cases, then the framework and CI, then scope boundaries and what I would add next.

**The constraint that shaped everything:** there is no staging environment, no seeded data, and
no test account — every test runs against live production, and nothing may mutate real auction
data. So assertions target shape and behaviour rather than fixed values, every state-changing
action deliberately stops at the sign-in gate, and the one red result in the suite is a real
production defect rather than a broken test.

## Required scenario — TC-001

[`tests/e2e/lot-page-details.spec.ts`](tests/e2e/lot-page-details.spec.ts) does the seven
brief steps: search `Train` via the magnifier button, open the **second** lot, read and
print name / favourites / current bid. It also asserts them — an unchecked print will
happily output `undefined` forever.

```
Name:         Bemo H0m - Deels uit set 7258-140 - Model train passenger carriage set (3) ...
Favourites:   10
Current bid:  € 1
```

## Coverage — 10 cases, 13 runs

The brief asked for tests that aren't similar in implementation, so each family uses a
different technique.

| ID     | Area             | Technique                         | What it proves                                       |
| ------ | ---------------- | --------------------------------- | ---------------------------------------------------- |
| TC-001 | Lot details      | End-to-end journey                | Required scenario works, values are sane             |
| TC-002 | Search, positive | Data-driven over a term table     | Search returns matching lots across categories       |
| TC-003 | Search, edge     | Zero-result + special characters  | The no-exact-match path renders correctly            |
| TC-004 | Search, negative | Alternate input path (keyboard)   | Whitespace-only search is handled, not crashed on    |
| TC-005 | Auth gate        | Before/after state comparison     | Anonymous favouriting is blocked and changes nothing |
| TC-006 | Auth gate        | Before/after, computed bid input  | Anonymous bidding is blocked and changes nothing     |
| TC-007 | Network mocking  | Response tampering                | The UI renders what the API returns, not a cache     |
| TC-008 | Fault injection  | Forced 500                        | A failed API call doesn't destroy already-good data  |
| TC-009 | API              | Direct endpoint assertions        | The suggest endpoint's contract holds                |
| TC-010 | Accessibility    | axe-core scan (WCAG 2.0/2.1 A/AA) | Homepage a11y — currently red, see below             |

### Search — three different problems, not one

`TC-002` is the happy path, driven from a table of terms (`Watch`, `Diamonds`, `Cars`) so
adding a category is a one-line data change rather than a new test. `TC-003` attacks the
opposite end — a keyword no lot will ever match, plus a pure-punctuation string — and checks
the "no exact results" messaging appears alongside related lots. `TC-004` submits whitespace
only, and does it via the keyboard rather than the magnifier button, so both ways a user can
actually submit a search are covered.

### Auth gating — verifying that nothing happened

`TC-005` and `TC-006` each attempt a state-changing action as an anonymous user — favouriting
a lot, and placing a bid — and assert two separate things: the sign-in dialog appears, **and**
the underlying value is unchanged afterwards. Capturing the before-state, acting, then
re-reading it is more work than just checking for the dialog, but "the gate appeared" and
"the gate held" are different claims and only the second one matters.

`TC-006` computes a valid next bid from the current one (`calculateNextBidAmount`, +7% rounded
up) rather than typing a fixed number, because a hardcoded amount would fall below the current
bid the moment someone else bids.

### The mocking pair — TC-007 and TC-008

These two look similar and do opposite jobs. Building them surfaced something not obvious from
the outside: **the bid-history block is server-rendered first, then refreshed client-side** from
`/buyer/api/v3/lots/{id}/bids`.

`TC-007` intercepts that response and rewrites the top bid to `999999`. The page then renders
`€999,999`, proving the bid history is genuinely bound to the API response rather than being
server-only or cached.

`TC-008` breaks the same endpoint with a 500 and checks the bid history is _still there_. The
naive implementation of a refresh — assigning the response straight into state with no error
branch — would blank the panel the moment the request failed. Asserting that the
server-rendered data survives guards against exactly that regression.

`TC-008` also asserts the fault actually fired (`interceptedRequests > 0`). Without it, a
fault-injection test that quietly stopped hitting the endpoint would keep passing forever
while exercising nothing.

### API layer

`TC-009` hits the search-suggest endpoint directly and checks the response contract: 200,
`query_terms` is a non-empty array, the first suggestion matches the query, and every entry has
non-empty `text` plus an `entity` with a string `type`. It uses `page.request` rather than the
standalone `request` fixture because the endpoint sits behind the same bot protection — without
a prior browser session and its cookies it returns 403.

### Accessibility

`TC-010` (`tests/a11y/homepage-accessibility.spec.ts`) runs an `@axe-core/playwright` scan of
the homepage against WCAG 2.0/2.1 A and AA rules and asserts zero violations. Run against
production, it currently **fails**, and that's the honest result — it surfaces real issues:
critical ARIA structure problems (`aria-required-children`/`aria-required-parent`), serious
color-contrast failures, interactive controls nested inside other interactive controls, a
non-keyboard-accessible scrollable region, and `<svg>` elements missing accessible text. Since
these are genuine production defects outside this branch's control to fix, `npm run test:a11y`
is deliberately opt-in only (`workflow_dispatch`, see [README](README.md)) rather than part of
the default CI gate — the same reasoning already applied to `tests/api/`'s CI exclusion above.

## Build and CI

### Framework design

**Page Object Model.** [`BasePage`](src/pages/BasePage.ts) declares `goto()` (navigates
relative to `baseURL` and dismisses the consent banner), `heading()`, `goBack()`, and an
abstract `verifyLoaded(): Promise<void>` that every page (`HomePage`, `SearchResultsPage`,
`LotPage`) must implement. Nothing beyond `open()`/navigation touches the page before
`verifyLoaded()` has run, so a test can't silently proceed against a half-rendered page — a
locator timing out later would be a far noisier failure than the assertion failing where it
actually broke.

**Fixtures.** [`src/fixtures/testFixture.ts`](src/fixtures/testFixture.ts) extends Playwright's
base `test` to inject `homePage`, `searchResultsPage`, and `lotPage` as ready-to-use fixtures.
Every spec imports this custom `test`/`expect` instead of `@playwright/test` directly, so no
test file constructs a page object itself — one place controls how they're built.

**Components.** [`src/pages/components/ConsentBanner.ts`](src/pages/components/ConsentBanner.ts)
factors out the one piece of UI that isn't a full page: the cookie-consent banner, needed
across nearly every flow. `dismissConsentIfPresent` is deliberately best-effort (absence must
never fail a test) and is called both at navigation time (`BasePage.goto`) and defensively
again right before `HomePage.searchViaMagnifier`'s click, since the banner can render
asynchronously after the nav-time dismissal already ran.

**Helpers.** [`src/helpers/`](src/helpers/) holds pure functions with zero Playwright
imports — unit-testable without a browser. `parseMoney`/`parseCount`
([`parse.ts`](src/helpers/parse.ts)) turn rendered page text into typed values (a `Money`
interface of `raw`/`amount`/`currency`), resolving both EU (`1.234,56`) and US (`1,234.56`)
separator conventions by treating whichever of `,`/`.` appears last as the decimal point.
`calculateNextBidAmount` ([`bid.ts`](src/helpers/bid.ts)) computes a valid next bid (+7%,
rounded up) from the lot's current bid rather than a hardcoded number, so TC-006 can't fall
below a bid someone else placed in the meantime.

**API layer.** [`src/api/endpoints.ts`](src/api/endpoints.ts) centralises both direct-call
paths (`Endpoints.searchSuggest`) and `page.route()` glob patterns (`RoutePatterns.lotBids`),
plus the response type definitions (`SuggestEntry`/`SuggestResponse`) — the API spec and the
two mock specs (TC-007/008) share one definition, so a path change is a one-line edit instead
of a multi-file hunt.

**Config and data.** [`src/config/timeouts.ts`](src/config/timeouts.ts) replaces magic numbers
with named constants, each carrying an inline comment on why that value (tuned against the
live, occasionally bot-throttled production site, not Playwright's defaults — e.g.
`MAGNIFIER_CLICK_TIMEOUT` was raised after 5s produced false-negative retries under real
latency). [`src/data/`](src/data/) holds `SCREAMING_SNAKE_CASE` constants (`SEARCH_TERMS`,
`SEARCH_KEYWORD`, `UNIQUE_UNLIKELY_KEYWORDS`) treated as fixed lookup tables.

**Type safety.** TypeScript runs in `strict` mode plus extra `tsconfig.json` flags beyond
strict — `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`,
`noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch` — so, for example, an
array index read can't silently produce `undefined`-typed-as-defined, and dead code/params are
caught at compile time rather than review. `eslint` (`typescript-eslint`) and `prettier`
enforce style on top; `typecheck`, `lint`, and `format:check` all gate the CI run before any
browser launches (see below), not after.

[`.github/workflows/playwright.yml`](.github/workflows/playwright.yml) runs on push/PR plus
manual dispatch with a dropdown for test scope. `typecheck`, `format:check` and `lint` gate
the run before any browser starts. `@smoke` marks one happy path per area (TC-001, TC-002,
TC-005) for a sub-minute confidence check.

Bot protection note: bundled headless Chromium is blocked outright; branded Chrome
(`channel: 'chrome'`) passes. That's measured, and it's why the chromium project is pinned.
The API test passes locally but 403s from CI runner IPs, so it runs locally only.

**Reports:** HTML (`npm run report`) and Allure, plus trace on retry, screenshot and video on
failure — all uploaded as CI artifacts (30 days, `if: !cancelled()`), so failures are
diagnosable without reproducing them.

## Out of scope

- **Anything behind login** — no test account, so TC-005/006 test the gate, not what's past it.
- **Actions that mutate production** — real bids and favourites affect real auctions.
- **Checkout, payments, seller flows** — real money and real inventory.
- **Email/notifications, database state** — no mailbox or backend access.
- **Load/stress testing** — not appropriate against someone else's production infrastructure.
- **Search relevance/ranking** — not deterministically assertable on a live catalogue.
- **Full locale matrix** — pinned to `en-GB` / `Europe/Amsterdam` for determinism.

## Next steps

### Test types to add

1. **Seeded test environment** — highest value; removes live-data nondeterminism and unlocks
   the authenticated journeys above.
2. **Accessibility, beyond the homepage scan** — TC-010 covers the homepage only; still open
   are per-page scans (search results, lot page), keyboard-only navigation, and focus trapping
   in the sign-in dialog (already reachable via TC-005/006).
3. **Performance** — Validate end-to-end web performance with k6 browser testing, and assess backend performance, scalability, and resilience through k6 load testing.
4. **Devices** — mobile projects are scaffolded in `playwright.config.ts` but commented out;
   the bidding block is a different component at small viewports.
5. **Cross-browser** — Firefox/WebKit are configured and passing; worth a nightly full matrix
   rather than paying for it on every push.
6. **Visual regression, API schema validation, unit tests for the helpers** — the parsers are
   already framework-free and side-effect-free, so they're ready for it.

### Other use cases worth covering

Functional ground the current ten cases don't reach. **P0** = binding actions, money, or data
integrity; **P1** = core journey degraded but usable; **P2** = cosmetic or low-traffic edge.

| Area                         | Scenario                                                                                     | Priority |
| ---------------------------- | -------------------------------------------------------------------------------------------- | -------- |
| **Search & discover**        | Closed lots excluded from — or clearly labelled in — live results                            | **P0**   |
|                              | Script/XSS payload in the search box renders as text, never executes                         | **P0**   |
|                              | Filters (category, price range, condition, country) narrow results                           | P1       |
|                              | Sorting by relevance, time-remaining, recently added                                         | P1       |
|                              | Pagination / load-more with no duplicate and no skipped lots                                 | P1       |
|                              | Suggest dropdown UI: renders, keyboard-navigable, clicks through                             | P1       |
| **Bidding rules**            | Bid below the current bid is rejected                                                        | **P0**   |
|                              | Bid below the minimum increment is rejected                                                  | **P0**   |
|                              | Bid on an ended lot is rejected                                                              | **P0**   |
|                              | "See all bids" full history agrees with the header bid count                                 | P1       |
| **Auction state**            | Ended lot renders its closed state with no bid control offered                               | **P0**   |
|                              | Countdown agrees with the closing time across timezone and DST                               | **P0**   |
|                              | Zero-bid lot shows "No bids placed" and the starting bid                                     | P1       |
|                              | Reserve-not-met indicator renders on a reserve lot                                           | P1       |
| **Seller & expert curation** | Seller posts an item for sale                                                                | **P0**   |
|                              | Expert approve / reject / request-more-info state machine; rejected lot never becomes public | **P0**   |
| **Localisation**             | Currency switch re-renders amounts with no double conversion                                 | **P0**   |
|                              | Language switch (`/en` → `/nl`) changes copy, date and price format                          | P1       |
| **Lot page content**         | Shipping cost and seller information                                                         | P1       |
|                              | Image gallery and zoom                                                                       | P2       |
|                              | Related lots                                                                                 | P2       |
| **Navigation**               | Deep-link straight to a lot URL, bypassing search                                            | P1       |
|                              | Browser back/forward between results and a lot                                               | P1       |
| **Errors & consent**         | Non-existent lot ID returns a 404 page, not a blank shell                                    | P1       |
|                              | Offline or throttled network degrades gracefully                                             | P1       |
|                              | Consent Reject and Customise paths, not only Accept All                                      | P1       |

Two notes on the P0s. The bidding and auction-state rows are the highest-value gaps because a bid
is binding — `TC-006` only ever submits a _valid_ amount, so every rejection path is currently
unverified, and `LotPage.noBidsText` already detects the zero-bid state that nothing asserts on.
And the cases sitting behind them — max-bid resolution, concurrent bids on one lot, fee/VAT/FX
correctness — are not more UI tests. They need a seeded environment, an injectable clock, and an
API-level concurrency harness, so they're absent by constraint rather than by oversight.

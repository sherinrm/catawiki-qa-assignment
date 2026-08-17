/**
 * Named overrides for Playwright action/wait timeouts. Values are tuned
 * against the live, occasionally bot-throttled production site rather than
 * Playwright's defaults — see each constant's usage site for rationale.
 */

// Best-effort wait for the consent banner's "Accept All" button. Short
// because absence is the common case (see ConsentBanner.ts) and this
// shouldn't cost real time when there's nothing to dismiss.
export const CONSENT_BANNER_DISMISS_TIMEOUT = 3_000;

// The magnifier click can trigger same-page navigation that Playwright
// waits to settle as part of the click's actionability check; 5s was too
// tight under real-world site latency and produced false-negative retries.
export const MAGNIFIER_CLICK_TIMEOUT = 8_000;

// How long to wait for either the bid count or the "No bids placed" empty
// state to render on a lot page before treating it as "no bids".
export const BID_STATE_TIMEOUT = 10_000;

// Once the bid-count element is known to be the one that appeared (raced
// against the empty state), reading its text should be near-instant — kept
// short so a lot with only the empty state doesn't fall through to this and
// hang on an element that will never appear.
export const BID_COUNT_TEXT_TIMEOUT = 2_000;

---
rule_set: automation
applies_to: TCs with target mode = automation (Tags include automate-now or automate-later, or operating mode set to automation)
check_count: 6
parent_skill: test-case
---

# Automation rules (A1-A6)

6 automation-specific checks. Apply **in addition to** Core C1-C12 when target mode = `automation`. Default target mode of the skill is `automation`, so these typically apply unless explicitly overridden.

An automation TC will be executed by code (Playwright, Cypress, Selenium, Pytest, Postman, etc.). The rules ensure the TC is deterministic, isolated, and translatable to test code by a different engineer than the writer.

**Note:** these rules judge the TC **as a written artifact**, not the automation code. Skill does NOT produce `.spec.ts` files. It ensures the TC has enough specificity that an automation engineer can implement it without re-asking the QA.

---

## A1 — Stable selector

**Rule:** When Steps reference UI elements, use stable selectors. Forbidden: text-only locators, positional indexes, brittle CSS.

**Stable (pass):**

- `data-testid="otp-input"` / `data-cy="..."` / `data-qa="..."`
- ARIA role + accessible name: `role="button" name="Submit"`
- Semantic HTML: `<button type="submit">`, `<input id="phone">` (when id is stable)
- Backend-controlled key: `name="phone"` on a form input

**Brittle (fail):**

- `Click the second button` / `[nth=1]`
- `Click element with text "ส่งรหัส OTP"` (text breaks on i18n / typo fixes)
- CSS deep path: `.container > div > div:nth-child(3) > button`
- `xpath /html/body/div[2]/...`

**Pass:**

```
Steps (UI):
  1. fill `[data-testid=phone-input]` with "0812345678"
  2. click `[data-testid=submit-btn]`
  3. wait for `[data-testid=otp-input]` to be visible
```

**Fail:**

```
Steps (UI):
  1. กรอกในช่องที่สอง
  2. คลิกปุ่ม "ส่งรหัส OTP"
  3. รอ
```

→ no test-id, text-locator on i18n string, "รอ" without condition (also fails A2)

**Team variant:** if the product code uses a different convention (e.g., `data-qa-*`), defer to that. Required: the selector is _stable_ (changes only when the contract changes), not the specific attribute name.

---

## A2 — Wait condition-based, not fixed sleep

**Rule:** Waits in automation must be condition-based (wait for response / element / state). Forbidden: arbitrary `sleep(N)` / fixed `wait(2000)` unless justified (e.g., debouncing intentional delay).

**Pass:**

- `wait for response: POST /auth/otp/request → 200`
- `wait for element [data-testid=otp-input] to be visible`
- `wait for store.user.status === "ACTIVE"`
- `expect(page.url()).toBe("/home")` (implicit wait via assertion)

**Fail:**

- `sleep(3000)` / `await page.waitForTimeout(3000)`
- "wait 5 seconds"
- "wait for spinner to disappear" (better: wait for the post-spinner element/state to appear; "spinner gone" leaves race conditions)

**Acceptable fixed waits (rare):**

- Throttle / debounce intentionally delayed by N ms — document it: `sleep(500) // debounce input by spec`
- Network request that has no completion signal in the UI — document why
- Test of a timeout / TTL itself (e.g., OTP expiry at 3 min) — use clock manipulation (`mockClock.advance("3m1s")`) when possible; fall back to real sleep only when not

---

## A3 — Factory / fixture isolated, no shared accounts

**Rule:** Test data must be created per test (factory pattern) or fetched from an isolated fixture. Forbidden: shared `qa-01` account, "use any active user", reliance on data left behind by other tests.

**Pass:**

```
Preconditions:
  - user = factory.user.create({ status: 'ACTIVE', phone: factory.phone.thaiMobile() })
  - mockClock = clockManager.freeze()
```

```
Preconditions:
  - testUser = await fixtures.users.activeWithBalance(500)
  // fixture creates fresh user in isolated namespace per worker
```

**Fail:**

```
Preconditions:
  - login ด้วย "qa-01@example.com" / "Password123"
  - account อยู่ใน whitelist test env
```

→ shared account = parallel-safety risk + state contamination

**Why:** parallel test runs need isolation. Shared account → 2 tests running same time → flaky.

**Acceptable shared fixtures (rare):**

- Reference data the test reads but never writes (e.g., a fixed list of countries, predefined product catalog)
- Smoke tests that intentionally probe production-like data

---

## A4 — Atomic assertion

**Rule:** Expected contains atomic assertions. If a TC needs ≥3 assertions, justify each in a comment or split the TC.

**Pass (single primary assertion + supporting checks):**

```
Expected (API):
  - HTTP 400 (primary)
  - body.error_code = "OTP_EXPIRED" (supporting: contract)
  - body.can_request_new = true (supporting: client behavior)
```

**Acceptable (related state):**

```
Expected:
  - DB users.status = "TEMP_LOCKED"
  - DB users.locked_until = now() + 30min
  - audit_log row inserted: action="account_lock"
  // 3 assertions verifying one outcome: "lockout side effect chain"
```

**Fail (omnibus expected):**

```
Expected:
  - login เข้าได้
  - ไปหน้า home
  - dashboard โหลด
  - balance แสดง
  - notification badge เห็น
  - footer มี logout
```

→ split into separate TCs; each block can fail independently for unrelated reasons

**Rule of thumb:** if 1 assertion fails, you should know the broken behavior name without reading the others.

---

## A5 — Setup / teardown explicit

**Rule:** Preconditions enumerate setup explicitly (or reference fixture name). Cleanup / teardown listed when test creates state outside its own factory.

**Pass:**

```
Preconditions:
  - user = factory.user.create({ status: 'ACTIVE', balance: 100 })
  - recipient = factory.user.create({ status: 'ACTIVE' })
  - mockClock.freeze()

Teardown:
  - factory.user.cleanup([user, recipient])
  - mockClock.restore()
```

```
Preconditions:
  - fixture: activeUserWithBalance(100)  // setup + teardown handled by fixture
```

**Fail:**

```
Preconditions: -
Steps:
  1. POST /transfer ...
Expected:
  - HTTP 200
```

→ where does the user come from? from previous test? from a fixed account?

**Why:** explicit setup → reproducible. Implicit setup → flaky.

---

## A6 — No environment assumption

**Rule:** TC does not assume environment state set up by other tests. Forbidden assumptions:

- "balance is at least N" (without setup creating it)
- "user is logged in" (without explicit login step or session fixture)
- "DB has at least 10 transactions" (without seed step)
- "feature flag X is on" (without setting it in Preconditions or fixture)
- "today is Monday" (real clock, will fail other days)

**Pass:**

```
Preconditions:
  - feature flag "transfer_v2" = on (set via api.featureFlags.set(...))
  - mockClock.set("2026-05-21 09:00:00 ICT") // Thursday
  - user balance set explicitly via factory
```

**Fail:**

```
Steps:
  1. open /transfer
  2. enter amount 50
  3. submit
Expected:
  - success
// assumes user is logged in, has balance, feature flag on, etc.
```

→ explicit Preconditions block + fixture / setup

**Why:** parallel runs + retries + different CI envs → unspecified state == flake source #1.

---

## Quick reference (cheatsheet)

| ID  | Rule                       | Pass signal                 | Fail signal                        |
| --- | -------------------------- | --------------------------- | ---------------------------------- |
| A1  | Stable selector            | data-testid / role+name     | `[nth=N]` / text locator on i18n   |
| A2  | Condition-based wait       | wait for response / element | `sleep(N)` / "wait 2 sec"          |
| A3  | Factory / isolated fixture | per-test data creation      | shared `qa-01` account             |
| A4  | Atomic assertion           | 1 primary + supporting      | omnibus list of unrelated checks   |
| A5  | Explicit setup / teardown  | enumerated or fixture name  | empty Preconditions + side effects |
| A6  | No env assumption          | all state explicit          | "user is logged in" w/o setup      |

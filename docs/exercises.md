# Exercises — hands-on, graded

Each exercise has a goal, a definition of done, and a solution pointer. Do them in order;
they map to [LEARNING-PATH.md](../LEARNING-PATH.md) lessons.

---

## 1. Add an endpoint — `PATCH /products/:id/status` (lessons 2–4)

The mock already implements the status state machine (`draft → published → archived`,
archived terminal — see [openapi(products).yaml](<openapi/openapi(products).yaml>) and
[03-flow.md](examples/products/03-flow.md) for the transition table). The AOM layer
deliberately doesn't cover it yet.

Follow CONTRIBUTING "Add a new endpoint" — **in this order**:

1. `types.ts` — add `UpdateStatusRequest`; `INVALID_TRANSITION` is already in the catalog.
2. `schemas.ts` — no new schema needed (the response is a Product) — work out why.
3. `ProductsClient.ts` — `updateStatus(id, body)` with a label.
4. `ProductsValidator.ts` — reuse `expectProductSuccess` / `expectProductError`.
5. `tests/products/status.spec.ts` — use the `Valid Transitions` / `Invalid Transitions`
   describe vocabulary (testing.md). One test per transition-table row.

**Done when:** new spec green against the mock; `pnpm type-check && pnpm lint` clean;
07/08 updated with the new TCs (that's exercise 4's skill — do both and you've covered
the full loop).

**Solution shape:** mirror `update.spec.ts`; the transition table in 03-flow.md IS the
test list.

## 2. Add a service end-to-end — `customers` (lessons 1–6)

Invent a tiny `customers` domain (create/get/delete is enough), implement it in
`mock/server.ts` first, then run `/implement-api-tests` (or follow CONTRIBUTING "Add a
new service" by hand) to build `src/services/customers/` + `tests/customers/`.

**Done when:** specs green; `@customers` added to `check-consistency.sh` ALLOWED + a
Service Registry row in CLAUDE.md; a provisioner exists if any test needs an existing
customer.

**Solution shape:** `orders` is the minimal reference; `products` the full one.

## 3. Catch a seeded bug — RED-by-design (lesson 7)

The mock has two seeded bugs (header of [mock/server.ts](../mock/server.ts)) and both
already have RED specs (TC-006, TC-010). To feel the discipline end-to-end:

1. Run `pnpm test` — confirm exactly those two are red, and read their comments.
2. Play backend: fix BUG #1 in the mock (add `'price'` to the required list). Rerun —
   TC-006 flips green WITHOUT touching the test. That is the point: the test was the
   pressure, the fix happened on the right side.
3. Now promote TC-006: give it scope tags (`@regression`) and update its 07 row/counts.
4. **Restore the seeded bug and the tags** (it's teaching material) — `git checkout` or undo.

**Done when:** you can say why `test.fail(true)` would have made step 2 never happen.

## 4. Traceability round-trip (lesson 8)

Add a real TC to an existing spec (e.g. a boundary: `pageSize=100` max on list).

1. Write the test with the next TC-ID (`TC-017`) + `allure.label.tc` annotation.
2. Run `pnpm check:consistency` — watch it FAIL naming TC-017.
3. Add the 07 row (FB-004), bump the 07 counts, map it in 08-rtm.
4. Re-run — green.

**Done when:** the propagation table in
[.claude/rules/traceability.md](../.claude/rules/traceability.md) reads as "obviously
this" rather than bureaucracy.

## 5. Stretch — advanced provisioning (lesson 6 appendix)

Give the mock an auth layer (a `POST /auth/login` issuing a token, one session per
account) and rebuild the products provisioner the production way: per-worker admin
accounts from env, a shared per-worker admin session, `test.skip` when unconfigured.

The full pattern — including the single-session-kick trap and the exp-based refresh — is
written up in
[.claude/skills/implement-api-tests/references/provisioning.md](../.claude/skills/implement-api-tests/references/provisioning.md).
This is a real-world weekend project, not an afternoon one.

**Done when:** `pnpm test` still passes with NO env vars set (everything skips or runs
zero-config), and passes fully with `ADMIN_01_*` set.

# SES-02 — Permissions, ownership and interruption

**Charter.** Explore the API and the three role sessions with deep links,
forged client state, duplicate submits and races to discover whether anything
grants access or moves money it should not.

**Build / env.** `claude/qa-protokol` at `00c34cc`; local stack; browser at
1440×900 plus direct HTTP.

**Areas touched.** Admin endpoint surface, object ownership, deep links, client
role state, duplicate submit, PII masking.

## Notes

| Probe | Result | Read |
|---|---|---|
| 15 admin endpoints as **worker** | 15/15 → 401/403 | correct |
| 8 admin endpoints as **employer** | 8/8 → 401/403 | correct |
| 27 parameterless GET endpoints, unauthenticated | 25 protected · 1 public (`/jobs`) · 1 → 422 (`/jobs/nearby`, missing required params) | correct — `/jobs` is a public job board |
| anonymous `/jobs` body scanned for PII | 0 phone numbers, no PII-shaped fields, `hiredWorkers: []` | correct |
| foreign job — PUT | 403 | correct |
| foreign job — DELETE | 403 | correct |
| missing job / chat / application id | 404 / 404 / 403 | correct |
| malformed (non-UUID) job id | 404 | correct, no 500 |
| **forged client role** — `localStorage.selectedRole` set to `admin` while the session is a worker | landed `/jobs`, admin shell not rendered, `/admin/users` → 403 | **correct** — the client re-reads the profile from the server and the API is authoritative |
| worker applies twice to one job | 200, 200 → **1** application stored | idempotent, correct |
| employer posts the same job twice | 200, 200 → **2** jobs | see observation |
| employer's applications list, not yet hired | `+998 ** *** ** 02`, `contactUnlocked: false` | correct — masked |
| same, after hiring | full number, `contactUnlocked: true` | correct — contact released on commitment |

## Bugs filed

None from this charter.

## Observations (not defects)

- **OBS-02.** Two identical `POST /api/v1/jobs` create two postings. This is
  ordinary REST behaviour and I could not show harm, so it is not filed as a
  defect — but the codebase already has an `Idempotency-Key` mechanism, used by
  `payments.py` and nowhere else. Whether job creation should join it is a
  product decision, not a bug I can assert.

## Open questions

- Is a duplicate posting from a double-click something the product wants to
  prevent? The mechanism exists; only payments use it.

## Evidence

Probe output is in the pass transcript; the permission matrix is summarised in
`ui-sweep.md` and `api-checklist.md`.

## Time split

Charter 95% / opportunity 5%.
Design and execution 70% · investigation and reporting 20% · setup 10%.

## PROOF debrief

- **Past.** Walked the admin surface from two roles that must not have it, then
  attacked ownership by deep link, then tried to lie to the client about its own
  role, then hammered the write paths with duplicates.
- **Results.** No authorisation defect found. The strongest result is the forged
  role: the client corrects itself from the server and the API refuses
  regardless, so hiding a button is not the only thing standing there.
- **Obstacles.** My first attempt at the concurrent double-hire failed on my own
  threading bug rather than on the system; the result reported here is from the
  corrected run. An earlier apparent finding — a worker routed to `/admin` — was
  my own stale client state from logging in via the API instead of the form, and
  is recorded as an artefact, not a defect.
- **Outlook.** Not covered: a deactivated/banned user's session, an expired
  token mid-flow, and two tabs acting on the same record.
- **Feelings.** Comfortable about role separation. Less comfortable that the
  rate limiter keys on `X-Forwarded-For`, which a caller supplies — noted as an
  existing risk (R-03) rather than re-derived here.

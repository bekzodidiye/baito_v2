# SES-01 — Ugly realistic data

**Charter.** Explore job creation with unicode, control characters, extreme
lengths, extreme numbers and boundary dates to discover which inputs the
validation layer does not hold.

**Build / env.** `claude/qa-protokol` at `00c34cc`; local stack (Postgres 15,
Redis 7, API image `baito-backend-upgraded`, 4 uvicorn workers).

**Areas touched.** `POST /api/v1/jobs` schema validation; the string path from
Pydantic to psycopg2.

## Notes

| Input | Result | Read |
|---|---|---|
| emoji in title | 200 | correct — emoji is legitimate text |
| RTL Arabic title | 200 | correct |
| mixed Cyrillic / Latin / Han | 200 | correct |
| **NUL byte in title, description or location** | **500** | **defect — BUG-002** |
| 10,000-character description | 422 | correct, length rule holds |
| workDate 2038-01-19 | 200 | accepted; no 32-bit boundary problem |
| negative `transportRate` (`-50000`) | 200 | accepted — see observation below |
| very large `neededWorkers` (999999999) | 422 | correct |
| empty body | 422 | correct |

## Bugs filed

- **BUG-002** — NUL byte in any text field answers 500 instead of 422.
  Reproduced 5/5.

## Observations (not defects)

- `transportRate` accepts `-50000`, reproduced 3/3. Traced it before reporting:
  the column is free text used for display ("Транспорт есть", "Обед и форма
  бесплатно") and is never parsed into money, so a negative value is a display
  and data-quality nit, not a money defect. Recorded as **OBS-01**, severity S4.
  Deliberately *not* filed as a money bug.

## Open questions

- Should `transportRate` be a number? It is money-shaped but stored as prose;
  today nothing can total it.

## Evidence

Command output is in the pass transcript; the reproduction steps are in
`findings/BUG-002-null-byte-500.md`.

## Time split

Charter 85% / opportunity 15%.
Design and execution 55% · investigation and reporting 30% · setup 15%.

## PROOF debrief

- **Past.** Nine input classes pushed through job creation, then each surprising
  result re-run to a fixed count before deciding what it was.
- **Results.** One defect (BUG-002) and one observation that looked like a money
  bug until traced and turned out not to be.
- **Obstacles.** The 500 gives no field name, so locating which value the driver
  refused meant testing each field separately.
- **Outlook.** The same NUL class should be tried against user profile fields,
  chat messages and support tickets — they were not covered by this charter.
- **Feelings.** Uneasy about free-text money-adjacent fields generally. `salary`
  was hardened earlier this session after it charged real money; `transportRate`
  and `hourlyRate` have the same shape and have not been examined for what reads
  them next.

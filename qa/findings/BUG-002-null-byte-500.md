### [BUG-002] `POST /api/v1/jobs` — HTTP 500 on any text field containing a NUL byte

- **Severity:** S3      **Priority (proposed):** P2
- **Type:** functional (unhandled input at a trust boundary)
- **Component:** `backend/app/schemas/job.py` / every string field reaching PostgreSQL
- **Environment:** branch `claude/qa-protokol` at `00c34cc`, local stack — Postgres 15, API image `baito-backend-upgraded`
- **Reproduction rate:** 5/5 (3× title, 1× description, 1× location)
- **Traces to:** R-09 (input validation on postings, P1); §9.2.4 form pass; Phase 4 charter "ugliest realistic data"

**Preconditions**
1. Authenticated as an employer.

**Steps to reproduce**
1. `POST /api/v1/jobs` with an otherwise valid body and a NUL byte (`\x00`) inside
   any string field, e.g. `"title": "Kassir\x00kerak"`.
2. Repeat with the NUL in `description`, then in `location`.

**Expected result**
`422` with a validation message, as every other rejected input on this endpoint
returns (empty title, over-long description and a non-positive wage all answer
422). A value the datastore cannot accept is invalid input, not a server fault.

**Actual result**
`HTTP 500`. The request fails after validation, inside the database driver.

**Evidence**
```
POST /api/v1/jobs   title contains a NUL byte
  run 1: HTTP 500
  run 2: HTTP 500
  run 3: HTTP 500
  NUL in description: HTTP 500
  NUL in location:    HTTP 500

server log:
  ValueError: A string literal cannot contain NUL (0x00) characters.
```

**Impact**
A malformed request answers 500 instead of 422. Two consequences: the caller
cannot distinguish a bad request from a broken server, and every occurrence is
recorded as a server error — with Sentry wired up, real incidents then compete
with noise that anyone can generate at will. No data is lost or exposed; the
transaction fails cleanly.

Unlikely to arrive from the app's own UI, so this is a robustness and
signal-quality defect rather than a user-facing one.

**Suspected root cause** *(inference)*
Pydantic accepts NUL inside `str`, so validation passes and the value reaches
psycopg2, which refuses it. Nothing between the two rejects control characters.

**Suggested fix / mitigation**
Reject control characters in the shared string validators on `JobCreate` /
`JobUpdate` — where the length and wage rules already live — so the answer is a
422 with a reason. Applying it once at the schema layer covers every field
rather than each call site.

**Regression risk if fixed**
Re-test that legitimate unicode still passes: emoji, RTL (Arabic), mixed
alphabets and accented Latin were all accepted (HTTP 200) in this session and
must stay accepted.

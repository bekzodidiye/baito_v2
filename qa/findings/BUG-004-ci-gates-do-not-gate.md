### [BUG-004] CI — the lint gate cannot fail, and two test suites are never run

- **Severity:** S3      **Priority (proposed):** P2
- **Type:** functional (process / test architecture)
- **Component:** `.github/workflows/ci.yml`, `frontend/package.json`
- **Environment:** branch `claude/qa-protokol` at `00c34cc`
- **Reproduction rate:** 1/1 (deterministic — configuration)
- **Traces to:** R-15 (test-suite trust, P1); §11 CI gates

**Steps to reproduce**
1. Read the `Lint` step in `ci.yml`.
2. Grep the workflow for `playwright`.
3. Read `frontend/package.json` scripts.

**Expected result**
A gate that fails the build when the check fails; every suite that exists is run
by something.

**Actual result**
1. **The lint gate cannot fail.** The step is `ruff check app/ || true`. Measured
   this pass: **110 findings in `app/`** (109 × F401 unused import, 1 × E712
   comparison to a literal), **129 across the backend**. None of them can turn
   the build red.
2. **The E2E suite is never run.** `frontend/tests/` holds 5 Playwright specs
   (`admin`, `auth`, `employer`, `worker`) and `@playwright/test` is a
   dependency, but no npm script invokes it and `playwright` appears **0 times**
   in `ci.yml`.
3. **The frontend has no unit tests at all** — 0 files matching `*.test.*` or
   `*.spec.*` under `src/`. `npm run lint` is `tsc --noEmit`: a type check, not
   a linter. No ESLint is configured.

**Evidence**
```
ci.yml:95     run: ruff check app/ || true
ruff check app/            → 110 errors  (109 F401, 1 E712)
ruff check .               → 129 errors
grep -c playwright ci.yml  → 0
find frontend/src -name '*.test.*' -o -name '*.spec.*' → 0
frontend/package.json scripts.lint → "tsc --noEmit"
```
Raw output: `../security/scans/ruff.txt`

**Impact**
Three of the four things a reviewer would assume are being checked are not. The
consequence is not hypothetical: the ordering defect fixed earlier today passed
locally and failed only in CI, and the reason it could fail there at all is that
the backend suite is a real gate. The frontend has no equivalent — every
frontend defect in this session was found by hand.

**Suspected root cause** *(inference)*
`|| true` is usually added to stop a noisy new linter blocking a release, then
never removed. The Playwright suite looks like it was scaffolded and never
wired in.

**Suggested fix / mitigation**
1. Fix or explicitly ignore the 110 findings, then drop `|| true` so the gate
   gates. `--fix` handles 49 of them.
2. Add a `test:e2e` script and a CI job that runs the 5 specs against a built
   preview.
3. Decide whether the frontend gets unit tests; if not, say so in the repo so
   the absence is a decision rather than an oversight.

**Regression risk if fixed**
Removing `|| true` will turn the build red until the findings are cleared —
sequence the two changes.

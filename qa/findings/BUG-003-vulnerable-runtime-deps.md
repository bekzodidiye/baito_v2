### [BUG-003] Frontend — five high-severity advisories ship in the production bundle

- **Severity:** S3      **Priority (proposed):** P2
- **Type:** security (dependency)
- **Component:** `frontend/package.json` production dependencies
- **Environment:** branch `claude/qa-protokol` at `00c34cc`; `npm audit` from the repo root
- **Reproduction rate:** 1/1 (deterministic — it is a manifest scan)
- **Traces to:** R-05 / general supply chain; §8.2

**Steps to reproduce**
1. `npm audit --prefix frontend --omit=dev`

**Expected result**
No high-severity advisory in code that reaches users' browsers.

**Actual result**
5 high, all in runtime dependencies, each with a fix available:

| Package | Advisory | Affected range |
|---|---|---|
| `react-router` | RSC Mode CSRF bypass — action executes before the 400 response | 7.12.0 – 7.18.1 |
| `react-router-dom` | transitively the same | 7.12.0-pre.0 – 7.18.1 |
| `postcss` | incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled `sourceMappingURL` reads arbitrary files | ≤ 8.5.22 |
| `nanoid` | non-secure generator loops indefinitely on a negative size | ≤ 3.3.17 |
| `browserslist` | unbounded memory growth, no cache eviction | ≤ 4.28.6 |

Counting dev dependencies as well: 17 advisories (6 high, 10 moderate, 1 low).

**Evidence**
```
npm audit --prefix frontend --omit=dev
  high: 5 · total: 5
  browserslist · nanoid · postcss · react-router · react-router-dom
  fixAvailable: true for all five
```
Raw output: `../security/scans/npm-audit.txt`

**Impact**
Two of the five sit in the router, which every navigation passes through.
Whether the React Router advisory is exploitable here depends on RSC mode,
which this app does not appear to use — **that is inference and was not tested**,
so it lowers likelihood, not severity. `postcss` and `browserslist` run at build
time in practice. `nanoid` is only reachable with a negative size argument.

Reported as S3 rather than S2 because no exploit path in this application was
demonstrated. It is a patch-availability defect: fixes exist and are not applied.

**Suspected root cause** *(inference)*
No automated dependency update or audit gate. CI runs no `npm audit` step, so
advisories accumulate silently.

**Suggested fix / mitigation**
`npm audit fix` for the five, then re-run the frontend build and the E2E specs;
`react-router` is the one that needs a real smoke test after bumping. Add
`npm audit --omit=dev --audit-level=high` to CI so this cannot drift again.

**Regression risk if fixed**
Routing is the risk. Re-test every route in `ui-inventory.md`, and the guest →
role redirect behaviour in particular.

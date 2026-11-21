# 11 — SKILL USAGE & DISCOVERY REPORT

## 1. Installed Agent Skills Discovery

Audit of available skill definitions and plugins in the environment:

| Skill Identifier | Source & Location | Category | Purpose | Status in Audit |
| :--- | :--- | :--- | :--- | :--- |
| `systematic-debugging` | Global Agent Skills | Quality Assurance | Root cause analysis of bugs and anomalies | **ACTIVATED & USED** |
| `security-audit` | Global Agent Skills | Security & Compliance | OWASP review, authz matrix, PII protection | **ACTIVATED & USED** |
| `python-backend-expert` | Global Agent Skills | Backend Architecture | FastAPI, SQLAlchemy 2, async safety, transactions | **ACTIVATED & USED** |
| `frontend-design` | Global Agent Skills | UI / Design Systems | React 19, Tailwind tokens, responsive layouts | **ACTIVATED & USED** |
| `a11y-debugging` | Chrome DevTools Plugin | Accessibility | WCAG 2.1 AA audit, focus traps, aria labels | **ACTIVATED & USED** |
| `test-driven-development`| Global Agent Skills | Testing & Verification | Writing regression tests and verification cases | **ACTIVATED & USED** |
| `verification-before-completion` | Global Agent Skills | Release Engineering | Executing test suites before reporting victory | **ACTIVATED & USED** |
| `design-md` | Agent Skills | Design Tokens | Authoring and verifying UI token specifications | **INSPECTED** |
| `accidental-data-loss-prevention` | Data Agent Kit | Data Safety | Safeguarding against irreversible drops/deletes | **ENFORCED** |

---

## 2. SkillsMP Marketplace Candidates Evaluated

In accordance with Section 2.2 of the audit instructions, external skill categories from SkillsMP were reviewed:

1. **FastAPI Security & SQL Injection Scanner**:
   - *Candidate*: `fastapi-security-auditor`
   - *Review*: Examined instructions. The repository's security boundaries can be thoroughly audited using native AST parsing, Pytest, and SQLAlchemy query inspection without external untrusted dependencies.
   - *Decision*: **REJECTED** (Existing trusted tools provide complete coverage without third-party network egress).
2. **PostgreSQL Concurrency & Deadlock Profiler**:
   - *Candidate*: `pg-concurrency-checker`
   - *Review*: Requires live Superuser access to PostgreSQL internals (`pg_stat_activity`, `pg_locks`). In testing environments utilizing SQLite/PostgreSQL test containers, `test_adversarial_concurrency.py` already exercises real simultaneous thread races.
   - *Decision*: **REJECTED** (Test container isolation preferred over third-party scripts).
3. **WCAG / Accessibility Automated Auditor**:
   - *Candidate*: `axe-core-scanner`
   - *Review*: Evaluated against `a11y-debugging` and `flutter_a11y_agent`. The installed `a11y-debugging` skill combined with project `AGENTS.md` rules provided exact line-level audit coverage.
   - *Decision*: **REJECTED** (Redundant with installed specialist capabilities).

---

## 3. Audits Completed With Native Verification

- **Financial Ledger Balancing**: Completed with native Python test cases asserting balance invariants and transaction states.
- **HMAC Cache Envelope Verification**: Completed using native `hmac.compare_digest` assertions and tamper simulations.
- **TypeScript Static Analysis**: Completed using project-native `tsc --noEmit`.
- **Python Linting**: Completed using project-native `ruff check`.

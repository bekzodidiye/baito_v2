# 05 — FINANCIAL INTEGRITY AUDIT: LEDGER, ESCROW & SETTLEMENT

## 1. Core Financial Invariants

The financial model of Baito v3 enforces four non-negotiable invariants:

1. **Balance Non-Negativity Invariant**:
   - `User.balance >= 0` at all times. A worker or employer cannot withdraw more funds than their confirmed in-app balance.
   - Enforced by: `with_for_update()` row locking on `User` inside `request_withdrawal()` and explicit `user.balance < req.amount` checking prior to deduction.
2. **Double-Spend & Escrow Protection**:
   - Money must never be debited twice for a single work shift.
   - Previous vulnerability: Historical versions deducted wages into escrow upon worker hire and billed the employer again on corporate invoice.
   - Fixed & Verified: Baito v3 utilizes invoice-based settlement (`WorkerEarnings`). The worker is credited an in-app balance promise upon shift day completion; the employer is invoiced once post-work.
3. **Audit Ledger Completeness (Zero-Sum Balancing)**:
   - Every balance mutation must create an immutable `AuditLedger` row recording `userId`, `amountDelta`, `balanceAfter`, `entryType`, and `referenceId`.
   - Invariant: For any user $U$, the current balance must equal:
     $$\text{User.balance} = \sum_{\text{all entries}} \text{AuditLedger.amountDelta}$$
4. **Currency Unit Separation (Tiyin vs So'm)**:
   - Database Storage:
     - `User.balance`: Integer So'm (UZS).
     - `AuditLedger.amountDelta`, `AuditLedger.balanceAfter`: Integer So'm (UZS).
     - `Transaction.amount`, `Transaction.platformFee`: Integer Tiyin (UZS $\times$ 100).
   - API Presentation: `Money.to_uzs()` converts transaction Tiyin to UZS before serialization to prevent displaying 275,000 UZS as 27,500,000.

---

## 2. Adversarial Scenarios Tested & Verified

### Scenario A: Concurrent Withdrawal Race Attack
- **Attack Vector**: An attacker with a balance of 100,000 UZS sends 10 concurrent HTTP requests to `POST /api/v1/payments/withdraw` requesting 100,000 UZS each.
- **Defense Mechanism**:
  1. `deps.get_tx_db` establishes an isolated database transaction.
  2. `db.query(User).filter(User.id == current_user.id).populate_existing().with_for_update()` acquires an exclusive row lock on the user record in PostgreSQL.
  3. The first request succeeds: deducts 100,000 UZS, leaves balance at 0 UZS, creates pending `Transaction` and `AuditLedger`.
  4. Concurrent requests 2 through 10 wait for the row lock. Upon acquiring the lock, `populate_existing()` refreshes the in-memory entity with the current database state (`balance == 0`).
  5. The condition `(user.balance or 0) < req.amount` evaluates to `True`, immediately raising `HTTPException(400, "Balansda yetarli mablag' mavjud emas")`.
- **Result**: Exactly 1 withdrawal succeeds; 9 requests fail with HTTP 400. Balance never goes negative.

### Scenario B: Idempotency Key Replay
- **Attack Vector**: Mobile client encounters network timeout during withdrawal and retries with the same `Idempotency-Key` header.
- **Defense Mechanism**:
  - `deps.get_idempotent_response(db, idempotency_key, current_user.id)` intercepts the request before touching balance.
  - Returns the cached HTTP 200 payload without executing a secondary debit.
- **Verified by**: `test_withdrawal_is_idempotent`.

### Scenario C: Payout Decision Race (Concurrent Admin Action)
- **Attack Vector**: Two administrators simultaneously click "Approve" and "Reject" on the same withdrawal request.
- **Defense Mechanism**:
  - `admin_finance.py:decide_withdrawal` queries `Transaction` with `populate_existing().with_for_update()`.
  - First admin action changes `status` to `"paid"` or `"canceled"`.
  - Second admin action acquires the lock, observes `tx.status != "pending"`, and throws `HTTPException(400, "Bu so'rov allaqachon ko'rib chiqilgan")`.
- **Verified by**: `test_a_withdrawal_cannot_be_decided_twice`.

---

## 3. Financial Weakness & Recommendation

- **Finding (P2 Medium)**: Python process-level locks in `payments.py` (`_user_card_locks`).
  - While PostgreSQL row-level locks protect user balance and transactions, card addition rate checks in a multi-process Gunicorn container cluster can allow slight concurrency bursts if 2 requests hit 2 separate OS processes simultaneously before DB commit.
  - **Recommendation**: Replace `threading.Lock()` with Redis-based distributed locks (`redis_client.lock(f"user_card_lock:{user_id}", timeout=5)`) in the next sprint.

"""A row lock that does not refresh the object protects nothing.

Any logged-in worker could withdraw several times their balance. The code
looked correct:

    user = db.query(User).filter(User.id == current_user.id).with_for_update().first()
    if (user.balance or 0) < req.amount:
        raise HTTPException(400, "Balansda yetarli mablag' mavjud emas")

The lock was real — Postgres serialised the five concurrent requests. But
`current_user` had already been loaded into the same session by the auth
dependency, and by default SQLAlchemy returns the instance it already has
rather than overwriting its attributes with the freshly-read row. Every
request therefore compared against the same stale balance and every one of
them passed. Measured against a real Postgres: a 500,000 balance produced five
approved withdrawals totalling 2,500,000, and one single debit.

`populate_existing()` makes the query overwrite what is in the identity map,
which is the whole point of having taken the lock. Same run afterwards: one
approved, four refused for insufficient funds.

This is a static check on purpose. Reproducing the race needs real row locking,
which SQLite does not provide, so the suite cannot catch a regression by
executing it — but it can refuse to let a lock lose its refresh.
"""

from __future__ import annotations

import io
import pathlib

APP = pathlib.Path(__file__).resolve().parents[1] / "app"

# populate_existing() may sit on the same line or on one just above it, since
# the codebase writes these queries both chained and multi-line.
LOOKBACK = 3


def _lock_sites() -> list[tuple[pathlib.Path, int, str, str]]:
    sites = []
    for path in sorted(APP.rglob("*.py")):
        lines = io.open(path, encoding="utf-8").read().splitlines()
        for i, line in enumerate(lines):
            if "with_for_update(" in line:
                window = " ".join(lines[max(0, i - LOOKBACK) : i + 1])
                sites.append((path, i + 1, line.strip(), window))
    return sites


def test_every_row_lock_refreshes_the_object():
    sites = _lock_sites()
    assert sites, "no with_for_update() found — did the money paths move?"

    unprotected = [
        f"{path.relative_to(APP.parent)}:{lineno}: {code}"
        for path, lineno, code, window in sites
        if "populate_existing()" not in window
    ]

    assert not unprotected, (
        "These queries take a row lock but may still read stale attributes from "
        "the session's identity map, which is how a balance check passed five "
        "times concurrently. Add .populate_existing() before .with_for_update():"
        "\n  " + "\n  ".join(unprotected)
    )


def test_the_balance_paths_are_actually_locked():
    """The specific queries the withdrawal and crediting races went through."""
    joined = "\n".join(
        io.open(p, encoding="utf-8").read()
        for p in (
            APP / "api" / "v1" / "endpoints" / "payments.py",
            APP / "services" / "earnings_service.py",
        )
    )
    assert "populate_existing" in joined, (
        "Neither the payout endpoint nor the earnings service refreshes under "
        "its lock; concurrent requests will read a stale balance."
    )

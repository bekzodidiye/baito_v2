"""An alembic revision id has to fit `alembic_version.version_num`.

That column is varchar(32) by default, and alembic writes the id into it as
the last step of every upgrade. A longer id passes every local run — SQLite
does not enforce varchar lengths — and then fails on Postgres at the moment
the migration has already done its work, leaving the database changed and the
version unrecorded.

`0018_refund_stranded_escrow_holds` was 33 characters.
"""

import pathlib
import re

VERSIONS = pathlib.Path(__file__).resolve().parent.parent / "alembic" / "versions"
LIMIT = 32


def test_every_revision_id_fits():
    too_long = []
    for path in sorted(VERSIONS.glob("*.py")):
        for match in re.finditer(r'^revision(?::\s*str)?\s*=\s*["\'](.+?)["\']',
                                 path.read_text(), re.M):
            rev = match.group(1)
            if len(rev) > LIMIT:
                too_long.append(f"{path.name}: {rev} ({len(rev)} chars)")

    assert not too_long, (
        f"alembic_version.version_num holds {LIMIT} characters:\n  "
        + "\n  ".join(too_long)
    )


def test_the_scan_finds_the_migrations():
    """Guards the test itself: a wrong path would make it pass on nothing."""
    assert len(list(VERSIONS.glob("*.py"))) > 10

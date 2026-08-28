"""Every routed queue must actually be consumed by a worker.

Verification SMS delivery was broken for as long as this route existed:

    celery_app.conf.task_routes = {"app.tasks.send_sms_task": "main-queue"}

The worker in docker-compose.yml is started without -Q, so it consumes only the
default "celery" queue. Tasks piled up in "main-queue" — fifteen of them — while
/auth/send-sms cheerfully answered "SMS yuborildi" every time, because publishing
to a queue nobody reads succeeds exactly like publishing to one that works.

Nothing in the system could notice: the endpoint returned 200, the worker was
healthy, the broker was healthy, and no exception was ever raised. This test is
the thing that notices.
"""

from __future__ import annotations

import re
from pathlib import Path

from app.celery_app import celery_app

COMPOSE = Path(__file__).resolve().parents[2] / "docker-compose.yml"
DEFAULT_QUEUE = "celery"


def _worker_commands() -> list[str]:
    """The `command:` of every celery worker service in docker-compose.yml."""
    # Deliberately not a skip. A guard that quietly disappears when it cannot
    # find its input is the same failure mode this file exists to catch.
    assert COMPOSE.exists(), (
        f"docker-compose.yml not found at {COMPOSE}; run the suite from a full "
        "checkout so worker queues can be checked."
    )
    text = COMPOSE.read_text(encoding="utf-8")
    return [
        line.strip()
        for line in text.splitlines()
        if re.match(r"^\s*command:.*celery\b.*\bworker\b", line)
    ]


def _consumed_queues(command: str) -> set[str]:
    """Queues a worker command consumes; without -Q that is just the default."""
    match = re.search(r"(?:-Q|--queues)[= ]([\w,.\-]+)", command)
    if not match:
        return {DEFAULT_QUEUE}
    return {q for q in match.group(1).split(",") if q}


def test_every_routed_queue_has_a_consumer():
    routes = dict(getattr(celery_app.conf, "task_routes", None) or {})
    if not routes:
        return  # No routes: everything lands on the default queue. Fine.

    commands = _worker_commands()
    assert commands, "task_routes is set but no celery worker is defined in docker-compose.yml"

    consumed: set[str] = set()
    for command in commands:
        consumed |= _consumed_queues(command)

    for task_name, destination in routes.items():
        queue = destination["queue"] if isinstance(destination, dict) else destination
        assert queue in consumed, (
            f"{task_name} is routed to queue {queue!r}, which no worker consumes "
            f"(workers consume {sorted(consumed)}). Tasks sent there are silently "
            f"discarded. Add -Q {queue} to the worker command, or drop the route."
        )


def test_send_sms_task_is_reachable():
    """The specific regression: SMS must land on a queue the worker reads."""
    routes = dict(getattr(celery_app.conf, "task_routes", None) or {})
    destination = routes.get("app.tasks.send_sms_task")
    queue = (
        DEFAULT_QUEUE
        if destination is None
        else (destination["queue"] if isinstance(destination, dict) else destination)
    )

    consumed: set[str] = set()
    for command in _worker_commands():
        consumed |= _consumed_queues(command)

    assert queue in consumed, (
        f"Verification SMS would be queued to {queue!r}, which no worker consumes. "
        "Signup would break with every request still returning 200."
    )

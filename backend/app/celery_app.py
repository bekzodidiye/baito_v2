from app.core.config import settings

try:
    from celery import Celery
    from celery.schedules import crontab

    celery_app = Celery(
        "worker",
        broker=settings.REDIS_URL,
        backend=settings.REDIS_URL,
        include=["app.tasks"],
    )
    # Deliberately no task_routes. The worker is started without -Q, so it
    # consumes only the default "celery" queue. send_sms_task used to be routed
    # to "main-queue", which nothing consumed: every verification SMS was queued
    # and never executed, while /auth/send-sms answered "SMS yuborildi" and the
    # message never arrived. Fifteen of them were still sitting in Redis.
    #
    # Any route added here needs a matching -Q on the worker in
    # docker-compose.yml. tests/test_celery_routing.py fails if it does not.
    celery_app.conf.update(
        task_acks_late=True,
        worker_prefetch_multiplier=1,
        task_time_limit=120,
        task_soft_time_limit=90,
        # Results were being written to Redis and never read, so they simply
        # accumulated. Keep them briefly for debugging, then let them go.
        result_expires=3600,
        timezone="Asia/Tashkent",
        enable_utc=True,
    )
    # Nothing was scheduled before, so the admin panel's "auto expire" and
    # cleanup toggles had no worker behind them.
    celery_app.conf.beat_schedule = {
        "expire-stale-jobs": {
            "task": "app.tasks.expire_stale_jobs",
            "schedule": crontab(hour=3, minute=0),
        },
        "purge-idempotency-keys": {
            "task": "app.tasks.purge_expired_idempotency_keys",
            "schedule": crontab(hour=4, minute=0),
        },
        # Uzum's window is 30 minutes, so a daily sweep would leave an order
        # unusable for most of a day. Every ten minutes is close enough to the
        # deadline to matter and cheap enough to ignore.
        "expire-uzum-transactions": {
            "task": "app.tasks.expire_uzum_transactions",
            "schedule": crontab(minute="*/10"),
        },
        # Both of these back a control in the admin panel and do nothing
        # unless it is switched on there.
        "telegram-digest": {
            "task": "app.tasks.send_telegram_digest",
            "schedule": crontab(hour=9, minute=0),
        },
    }
except ImportError:
    class MockCeleryTask:
        def __init__(self, func):
            self.func = func

        def delay(self, *args, **kwargs):
            return self.func(*args, **kwargs)

        def __call__(self, *args, **kwargs):
            return self.func(*args, **kwargs)

    class MockCeleryConf(dict):
        beat_schedule: dict = {}
        task_routes: dict = {}

        def update(self, *args, **kwargs):
            return None

    class MockCeleryApp:
        conf = MockCeleryConf()

        def task(self, *args, **kwargs):
            def decorator(f):
                return MockCeleryTask(f)
            return decorator

    celery_app = MockCeleryApp()

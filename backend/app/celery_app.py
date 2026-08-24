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
    celery_app.conf.task_routes = {
        "app.tasks.send_sms_task": "main-queue",
    }
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

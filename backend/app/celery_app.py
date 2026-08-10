try:
    from celery import Celery
    celery_app = Celery(
        "worker",
        broker=settings.REDIS_URL,
        backend=settings.REDIS_URL
    )
    celery_app.conf.task_routes = {
        "app.tasks.send_sms_task": "main-queue",
    }
except ImportError:
    class MockCeleryTask:
        def __init__(self, func):
            self.func = func
        def delay(self, *args, **kwargs):
            return self.func(*args, **kwargs)
        def __call__(self, *args, **kwargs):
            return self.func(*args, **kwargs)

    class MockCeleryApp:
        def task(self, *args, **kwargs):
            def decorator(f):
                return MockCeleryTask(f)
            return decorator

    celery_app = MockCeleryApp()


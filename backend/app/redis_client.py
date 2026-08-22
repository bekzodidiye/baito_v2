import redis
from app.core.config import settings

# Global redis client for caching/limits
import time

class MockRedis:
    def __init__(self):
        self.store = {}
    def setex(self, name, time_seconds, value):
        self.store[name] = {"value": value, "expires_at": time.time() + time_seconds}
    def get(self, name):
        item = self.store.get(name)
        if not item: return None
        if time.time() > item["expires_at"]:
            del self.store[name]
            return None
        return item["value"]
    def delete(self, name):
        self.store.pop(name, None)
    def publish(self, channel, message):
        return 0
    def ping(self):
        return True

try:
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    redis_client.ping() # Check connection
except Exception as e:
    print(f"⚠️ Redis connection failed: {e}. Using MockRedis fallback for local testing.")
    redis_client = MockRedis()

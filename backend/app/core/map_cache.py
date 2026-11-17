import logging
from typing import Optional
from app.redis_client import redis_client

logger = logging.getLogger(__name__)

CACHE_VERSION_KEY = "cache:jobs:version"
CACHE_LOCATION_COUNTS_PREFIX = "cache:jobs:location_counts"
CACHE_MAP_PINS_PREFIX = "cache:jobs:map_pins"
CACHE_NEARBY_PREFIX = "cache:jobs:nearby"


def get_map_cache_version() -> int:
    """Returns current atomic version number for map and job spatial caches.
    Version increments instantly invalidate all dependent spatial cache keys
    without expensive or blocking Redis KEYS pattern scans.
    """
    try:
        ver = redis_client.get(CACHE_VERSION_KEY)
        if ver is not None:
            return int(ver)
        # Initialize if not set
        redis_client.set(CACHE_VERSION_KEY, 1)
        return 1
    except Exception as e:
        logger.warning("Redis failed to read map cache version: %s", e)
        return 1


def invalidate_map_cache() -> None:
    """Atomically increments the spatial map cache version and clears aggregated counts.
    Executed whenever jobs are created, modified, status-changed, or deleted.
    Completes in sub-millisecond O(1) time without blocking Redis.
    """
    try:
        redis_client.incr(CACHE_VERSION_KEY)
        redis_client.delete(CACHE_LOCATION_COUNTS_PREFIX)
        logger.debug("Spatial map cache invalidated successfully.")
    except Exception as e:
        logger.warning("Failed to invalidate map cache: %s", e)


def build_map_pins_cache_key(
    version: int,
    min_lat: Optional[float] = None,
    max_lat: Optional[float] = None,
    min_lng: Optional[float] = None,
    max_lng: Optional[float] = None,
    location: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 500,
) -> str:
    """Constructs a quantized cache key for map pins.
    Coordinates are rounded to 2 decimal places (~1.1 km precision) to group
    micro-pans into the same cache entry for high cache hit rates.
    """
    q_min_lat = f"{round(min_lat, 2):.2f}" if min_lat is not None else "_"
    q_max_lat = f"{round(max_lat, 2):.2f}" if max_lat is not None else "_"
    q_min_lng = f"{round(min_lng, 2):.2f}" if min_lng is not None else "_"
    q_max_lng = f"{round(max_lng, 2):.2f}" if max_lng is not None else "_"
    loc_clean = (location or "").strip().lower()
    cat_clean = (category or "").strip().lower()
    search_clean = (search or "").strip().lower()

    return (
        f"{CACHE_MAP_PINS_PREFIX}:v{version}:"
        f"{q_min_lat}:{q_max_lat}:{q_min_lng}:{q_max_lng}:"
        f"{loc_clean}:{cat_clean}:{search_clean}:{limit}"
    )


def build_nearby_cache_key(
    version: int,
    lat: float,
    lng: float,
    radius_km: float,
    limit: int,
) -> str:
    """Constructs a quantized cache key for nearby radial searches."""
    q_lat = f"{round(lat, 2):.2f}"
    q_lng = f"{round(lng, 2):.2f}"
    q_rad = f"{round(radius_km, 1):.1f}"
    return f"{CACHE_NEARBY_PREFIX}:v{version}:{q_lat}:{q_lng}:{q_rad}:{limit}"

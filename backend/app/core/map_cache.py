import hashlib
import hmac
import logging
from typing import Optional, Dict, Any
from app.core.config import settings
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


def get_user_map_cache_version(user_id: str) -> int:
    """Returns the atomic version for a specific user's personalized map cache (applications/bookmarks)."""
    if not user_id:
        return 1
    key = f"cache:user:{user_id}:map_version"
    try:
        ver = redis_client.get(key)
        if ver is not None:
            return int(ver)
        redis_client.set(key, 1, ex=86400)
        return 1
    except Exception as e:
        logger.warning("Redis read user cache version failed: %s", e)
        return 1


def invalidate_user_map_cache(user_id: str) -> None:
    """Instantly invalidates a specific user's personalized map cache in O(1).
    Called when a user applies to a job, withdraws an application, or toggles bookmarks.
    """
    if not user_id:
        return
    key = f"cache:user:{user_id}:map_version"
    try:
        redis_client.incr(key)
        logger.debug("User %s map cache invalidated.", user_id)
    except Exception as e:
        logger.warning("Failed to invalidate user map cache: %s", e)


def _format_coord(val: Optional[float]) -> str:
    """Formats coordinate to exact canonical float representation without lossy rounding.
    Preserves exact IEEE-754 float precision so that any distinct float bounds
    produce distinct cache keys, while numerically equivalent inputs map to the same key.
    """
    if val is None or hasattr(val, "default"):
        return "_"
    try:
        f = float(val)
        if f == 0.0:
            f = 0.0
        return repr(f)
    except (ValueError, TypeError):
        return "_"


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
    """Constructs a cache key for map pins with canonical float coordinates.
    Exact float coordinates are normalized to prevent cache collisions across
    different viewport bounding boxes while preserving high cache stability.
    """
    q_min_lat = _format_coord(min_lat)
    q_max_lat = _format_coord(max_lat)
    q_min_lng = _format_coord(min_lng)
    q_max_lng = _format_coord(max_lng)
    def _clean_str(val: Optional[str]) -> str:
        if val is None or hasattr(val, "default"):
            return ""
        if isinstance(val, str):
            return val.strip().lower()
        return str(val).strip().lower()

    loc_clean = _clean_str(location)
    cat_clean = _clean_str(category)
    search_clean = _clean_str(search)

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


def compute_cluster_signature(cluster: Dict[str, Any]) -> str:
    """Computes a cryptographically secure HMAC signature for a validated cluster.
    Guarantees that geo_verified claims can only originate from this server's Cold DB Path,
    preventing arbitrary cache injection or corrupted payloads from bypassing checks.
    """
    pids = ",".join(sorted(str(pid) for pid in (cluster.get("pinIds") or [])))
    cid = str(cluster.get("id") or "")
    count = str(cluster.get("count") or 0)
    try:
        lat = f"{float(cluster.get('coordinateX') if cluster.get('coordinateX') is not None else cluster.get('latitude') or 0.0):.5f}"
        lng = f"{float(cluster.get('coordinateY') if cluster.get('coordinateY') is not None else cluster.get('longitude') or 0.0):.5f}"
    except (ValueError, TypeError):
        lat = "0.00000"
        lng = "0.00000"
    msg = f"{cid}:{count}:{pids}:{lat}:{lng}"
    secret = (getattr(settings, "SECRET_KEY", None) or "baito-cluster-secret-fallback").encode("utf-8")
    return hmac.new(secret, msg.encode("utf-8"), hashlib.sha256).hexdigest()[:16]


def verify_cluster_signature(cluster: Dict[str, Any]) -> bool:
    """Verifies that a cached cluster has an authentic HMAC signature produced by Cold DB Path."""
    if not isinstance(cluster, dict) or not cluster.get("geo_verified"):
        return False
    sig = cluster.get("geo_sig")
    if not sig or not isinstance(sig, str):
        return False
    expected = compute_cluster_signature(cluster)
    return hmac.compare_digest(sig, expected)

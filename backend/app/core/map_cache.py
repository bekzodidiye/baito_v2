import hashlib
import hmac
import json
import logging
import math
from typing import Optional, Dict, Any, List
from app.core.config import settings
from app.redis_client import redis_client

logger = logging.getLogger(__name__)

CACHE_VERSION_KEY = "cache:jobs:version"
CACHE_LOCATION_COUNTS_PREFIX = "cache:jobs:location_counts"
CACHE_MAP_PINS_PREFIX = "cache:jobs:map_pins"
CACHE_MAP_GEOJSON_PREFIX = "cache:jobs:geojson"
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


def encode_canonical_filters(
    location: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
) -> str:
    """Encodes query filters into a collision-free canonical token strictly aligned with SQL query semantics:
    - location: stripped and lowercased (mirrors SQL `location.ilike(f'%{location.strip()}%')`)
    - search: stripped and lowercased (mirrors SQL `ilike(f'%{search.strip()}%')`)
    - category: exact casing and whitespace preserved (mirrors SQL `models.Job.category == category`)

    Uses canonical JSON serialized with sorted keys and SHA-256 digest to prevent any
    delimiter injection (e.g. location='a:b' vs category='b:c') or whitespace confusion.
    """
    loc_val = None
    if location is not None and not hasattr(location, "default"):
        s = location if isinstance(location, str) else str(location)
        s_strip = s.strip()
        if s_strip:
            loc_val = s_strip.lower()

    search_val = None
    if search is not None and not hasattr(search, "default"):
        s = search if isinstance(search, str) else str(search)
        s_strip = s.strip()
        if s_strip:
            search_val = s_strip.lower()

    cat_val = None
    if category is not None and not hasattr(category, "default"):
        s = category if isinstance(category, str) else str(category)
        if len(s) > 0:
            cat_val = s

    if loc_val is None and cat_val is None and search_val is None:
        return "none"

    payload = json.dumps(
        {"cat": cat_val, "loc": loc_val, "q": search_val},
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    )
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]
    return f"cf_{digest}"


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
    Query filters use collision-free canonical encoding matching SQL query semantics.
    """
    q_min_lat = _format_coord(min_lat)
    q_max_lat = _format_coord(max_lat)
    q_min_lng = _format_coord(min_lng)
    q_max_lng = _format_coord(max_lng)
    filter_token = encode_canonical_filters(location=location, category=category, search=search)

    return (
        f"{CACHE_MAP_PINS_PREFIX}:v{version}:"
        f"{q_min_lat}:{q_max_lat}:{q_min_lng}:{q_max_lng}:"
        f"{filter_token}:{limit}"
    )


def build_map_geojson_cache_key(
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
    """Constructs a cache key for map geojson projection with canonical float coordinates.
    Exact float coordinates are normalized to prevent cache collisions across
    different viewport bounding boxes while preserving high cache stability.
    Query filters use collision-free canonical encoding matching SQL query semantics.
    """
    q_min_lat = _format_coord(min_lat)
    q_max_lat = _format_coord(max_lat)
    q_min_lng = _format_coord(min_lng)
    q_max_lng = _format_coord(max_lng)
    filter_token = encode_canonical_filters(location=location, category=category, search=search)

    return (
        f"{CACHE_MAP_GEOJSON_PREFIX}:v{version}:"
        f"{q_min_lat}:{q_max_lat}:{q_min_lng}:{q_max_lng}:"
        f"{filter_token}:{limit}"
    )


def get_map_cache_key_for_request(
    version: int,
    min_lat: Optional[float] = None,
    max_lat: Optional[float] = None,
    min_lng: Optional[float] = None,
    max_lng: Optional[float] = None,
    location: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 500,
    clustered: bool = False,
    user_id: Optional[str] = None,
    user_ver: Optional[int] = None,
) -> str:
    """Builds the canonical cache key for a map request, mirroring production routing exactly.
    Handles effective_limit=0 and :clustered suffix for clustered views, and personal user keys.
    Guarantees that test suites and API endpoints always access the exact same cache keys.
    """
    effective_limit = 0 if clustered else limit
    base_key = build_map_pins_cache_key(
        version=version,
        min_lat=min_lat,
        max_lat=max_lat,
        min_lng=min_lng,
        max_lng=max_lng,
        location=location,
        category=category,
        search=search,
        limit=effective_limit,
    )
    if clustered:
        base_key += ":clustered"
    if user_id:
        uv = user_ver if user_ver is not None else get_user_map_cache_version(user_id)
        return f"{base_key}:u:{user_id}:uv{uv}"
    return base_key


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


def _get_hmac_secret() -> bytes:
    """Retrieves and strictly validates settings.SECRET_KEY for deterministic HMAC signing.
    Fails closed if SECRET_KEY is not configured or empty, preventing insecure fallback secrets.
    """
    secret = getattr(settings, "SECRET_KEY", None)
    if not secret or not isinstance(secret, str) or not secret.strip():
        raise RuntimeError("SECRET_KEY must be configured for map pin HMAC authentication")
    return secret.strip().encode("utf-8")


def _canonical_pin_data(pin: Dict[str, Any]) -> Dict[str, Any]:
    """Extracts and normalizes the complete emitted pin/cluster payload into a canonical dict,
    excluding only the signature field itself ('geo_sig').

    Coordinates (coordinateX, coordinateY, latitude, longitude) are treated strictly independently
    and never cross-aliased. Non-lossy strict type validation is enforced:
    - Numeric coordinates must be float or int (not bool, not numeric strings, not NaN/Inf).
      Exact finite float values are preserved.
    - Integer fields (salary, salaryMin, salaryMax, count, vacancies, hiredCount) must be int
      (not float like 3500000.9, not bool, not numeric strings).
    - Boolean fields (applied, bookmarked, urgent, isCluster, geo_verified) must be bool
      (not string like "false", not int like 1/0).
    - String fields must be str or None.
    - List fields (pinIds, tags) must be lists of str.

    Any unexpected or malformed type raises TypeError or ValueError, causing signature verification to fail.
    """
    if not isinstance(pin, dict):
        raise TypeError(f"pin must be a dict, got {type(pin).__name__}")

    canonical: Dict[str, Any] = {}
    for k, v in pin.items():
        if k == "geo_sig":
            continue

        if k in ("coordinateX", "coordinateY", "latitude", "longitude"):
            if v is not None:
                if type(v) is bool or type(v) not in (float, int):
                    raise TypeError(f"Coordinate '{k}' must be a numeric float or int, got {type(v).__name__}")
                if type(v) is float:
                    if math.isnan(v) or math.isinf(v):
                        raise ValueError(f"Coordinate '{k}' must be a finite number")
                canonical[k] = v
            else:
                canonical[k] = None

        elif k in ("count", "vacancies", "hiredCount", "salary", "salaryMin", "salaryMax"):
            if v is not None:
                if type(v) is bool or type(v) is not int:
                    raise TypeError(f"Field '{k}' must be an integer, got {type(v).__name__}")
                canonical[k] = v
            else:
                canonical[k] = None

        elif k in ("applied", "bookmarked", "urgent", "isCluster", "geo_verified"):
            if v is not None:
                if type(v) is not bool:
                    raise TypeError(f"Field '{k}' must be a boolean, got {type(v).__name__}")
                canonical[k] = v
            else:
                canonical[k] = None

        elif k == "pinIds":
            if v is not None:
                if not isinstance(v, list):
                    raise TypeError(f"Field '{k}' must be a list of strings, got {type(v).__name__}")
                for pid in v:
                    if type(pid) is not str:
                        raise TypeError(f"pinIds element must be str, got {type(pid).__name__}")
                canonical[k] = list(v)
            else:
                canonical[k] = None

        elif k == "tags":
            if v is not None:
                if not isinstance(v, list):
                    raise TypeError(f"Field '{k}' must be a list of strings, got {type(v).__name__}")
                for tag in v:
                    if type(tag) is not str:
                        raise TypeError(f"tags element must be str, got {type(tag).__name__}")
                canonical[k] = list(v)
            else:
                canonical[k] = None

        elif k in (
            "id",
            "title",
            "company",
            "salaryCurrency",
            "location",
            "rawLocation",
            "logoUrl",
            "imageUrl",
            "category",
            "workDate",
            "workTime",
            "neededWorkers",
            "status",
        ):
            if v is not None:
                if type(v) is not str:
                    raise TypeError(f"Field '{k}' must be a string, got {type(v).__name__}")
                canonical[k] = v
            else:
                canonical[k] = None

        else:
            if v is None:
                canonical[k] = None
            elif type(v) in (str, int, float, bool):
                canonical[k] = v
            elif isinstance(v, list):
                if not all(type(x) is str for x in v):
                    raise TypeError(f"List field '{k}' elements must be str")
                canonical[k] = list(v)
            else:
                raise TypeError(f"Field '{k}' has unsupported type {type(v).__name__}")

    return canonical


def compute_pin_signature(pin: Dict[str, Any]) -> str:
    """Computes a cryptographically secure full 64-hex SHA-256 HMAC signature for any cached pin or cluster.
    Serializes canonical fields in deterministic sorted JSON representation with separators=(',', ':').
    Guarantees that geo_verified claims can only originate from this server's Cold DB Path,
    preventing arbitrary cache injection, field tampering, or corrupted payloads from bypassing checks.
    """
    secret = _get_hmac_secret()
    canonical_dict = _canonical_pin_data(pin)
    canonical_json = json.dumps(canonical_dict, sort_keys=True, separators=(',', ':'))
    return hmac.new(secret, canonical_json.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_pin_signature(pin: Dict[str, Any]) -> bool:
    """Verifies that a cached pin or cluster has an authentic HMAC signature produced by this server."""
    if not isinstance(pin, dict) or pin.get("geo_verified") is not True:
        return False
    sig = pin.get("geo_sig")
    if not sig or not isinstance(sig, str) or len(sig) != 64:
        return False
    try:
        expected = compute_pin_signature(pin)
        return hmac.compare_digest(sig, expected)
    except (TypeError, ValueError, RuntimeError):
        return False
    except Exception:
        return False


def _canonical_response_data(
    cache_key: str,
    payload: List[Dict[str, Any]],
    clustered: bool = False,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Prepares canonical representation of a full response bound to its exact cache context.
    Covers the complete ordered payload list, every emitted pin and all its fields,
    the cache key, the clustered mode, and the authenticated user scope.
    """
    if type(cache_key) is not str or not cache_key.strip():
        raise ValueError("cache_key must be a non-empty string")
    if not isinstance(payload, list) or not all(isinstance(item, dict) for item in payload):
        raise TypeError("payload must be a list of dictionaries")
    if type(clustered) is not bool:
        raise TypeError(f"clustered must be a boolean, got {type(clustered).__name__}")
    if user_id is not None and (type(user_id) is not str or not user_id.strip()):
        raise TypeError("user_id must be None or a non-empty string")

    canonical_payload = [_canonical_pin_data(pin) for pin in payload]

    return {
        "cache_key": cache_key.strip(),
        "clustered": clustered,
        "payload": canonical_payload,
        "user_id": user_id.strip() if user_id else None,
    }


def compute_response_signature(
    cache_key: str,
    payload: List[Dict[str, Any]],
    clustered: bool = False,
    user_id: Optional[str] = None,
) -> str:
    """Computes a cryptographically secure HMAC-SHA-256 signature for the complete cached response
    bound to its cache context (cache_key, clustered mode, authenticated user_id).
    """
    secret = _get_hmac_secret()
    data = _canonical_response_data(
        cache_key=cache_key,
        payload=payload,
        clustered=clustered,
        user_id=user_id,
    )
    canonical_json = json.dumps(data, sort_keys=True, separators=(',', ':'))
    return hmac.new(secret, canonical_json.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_response_signature(
    cache_key: str,
    payload: List[Dict[str, Any]],
    resp_sig: str,
    clustered: bool = False,
    user_id: Optional[str] = None,
) -> bool:
    """Verifies HMAC-SHA-256 signature over the complete payload and its cache context.
    Uses hmac.compare_digest and fails closed on any mismatch, missing signature, or malformed data.
    """
    if not resp_sig or type(resp_sig) is not str or len(resp_sig) != 64:
        return False
    try:
        expected = compute_response_signature(
            cache_key=cache_key,
            payload=payload,
            clustered=clustered,
            user_id=user_id,
        )
        return hmac.compare_digest(resp_sig, expected)
    except (TypeError, ValueError, RuntimeError):
        return False
    except Exception:
        return False


def make_response_envelope(
    cache_key: str,
    payload: List[Dict[str, Any]],
    clustered: bool = False,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Wraps response payload in a signed envelope cryptographically bound to its cache context."""
    if type(cache_key) is not str or not cache_key.strip():
        raise ValueError("cache_key must be a non-empty string")
    if type(clustered) is not bool:
        raise TypeError(f"clustered must be a boolean, got {type(clustered).__name__}")
    if user_id is not None and (type(user_id) is not str or not user_id.strip()):
        raise TypeError("user_id must be None or a non-empty string")
    if not isinstance(payload, list) or not all(isinstance(item, dict) for item in payload):
        raise TypeError("payload must be a list of dictionaries")

    sig = compute_response_signature(
        cache_key=cache_key,
        payload=payload,
        clustered=clustered,
        user_id=user_id,
    )
    return {
        "cache_key": cache_key,
        "clustered": clustered,
        "user_id": user_id,
        "payload": payload,
        "resp_sig": sig,
    }


def verify_response_envelope(
    envelope: Any,
    expected_key: str,
    expected_clustered: bool = False,
    expected_user_id: Optional[str] = None,
) -> Optional[List[Dict[str, Any]]]:
    """Validates the signed envelope structure with strict types (FIX C):
    - envelope must be an actual dict
    - clustered must be an actual bool (not int 0/1 or string)
    - cache_key must be an exact non-empty string matching expected_key
    - user_id must match the expected verified user context (or None for public)
    - payload must be a list of expected dictionaries
    - resp_sig must be a valid 64-hex string

    Fails closed (returns None) on any type violation or HMAC mismatch, triggering clean DB reconstruction.
    """
    if not isinstance(envelope, dict):
        return None

    # 1. cache_key validation: exact non-empty string
    env_key = envelope.get("cache_key")
    if type(env_key) is not str or not env_key.strip():
        return None
    if type(expected_key) is not str or not expected_key.strip() or env_key != expected_key:
        return None

    # 2. clustered validation: actual bool (strictly rejecting 0, 1, "true", "false")
    env_clustered = envelope.get("clustered")
    if type(env_clustered) is not bool or type(expected_clustered) is not bool:
        return None
    if env_clustered != expected_clustered:
        return None

    # 3. user_id validation: matches expected verified user context
    env_user_id = envelope.get("user_id")
    if expected_user_id is None:
        if env_user_id is not None:
            return None
    else:
        if type(expected_user_id) is not str or not expected_user_id.strip():
            return None
        if type(env_user_id) is not str or env_user_id != expected_user_id:
            return None

    # 4. payload validation: list of dictionaries
    payload = envelope.get("payload")
    if not isinstance(payload, list):
        return None
    if not all(isinstance(item, dict) for item in payload):
        return None

    # 5. resp_sig validation: valid 64-hex string
    resp_sig = envelope.get("resp_sig")
    if type(resp_sig) is not str or len(resp_sig) != 64:
        return None
    if not all(c in "0123456789abcdefABCDEF" for c in resp_sig):
        return None

    if not verify_response_signature(
        cache_key=expected_key,
        payload=payload,
        resp_sig=resp_sig,
        clustered=expected_clustered,
        user_id=expected_user_id,
    ):
        return None

    return payload


# Aliases for backward compatibility with cluster-specific callers
compute_cluster_signature = compute_pin_signature
verify_cluster_signature = verify_pin_signature

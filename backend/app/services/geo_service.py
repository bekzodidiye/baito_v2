import functools
import json
import logging
import math
import re
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)


class GeoSpatialService:
    """
    Geo-Spatial & GIS Navigation Service for Baito.
    Computes precise GPS distances, commute times, spatial radius filtering,
    and server-side administrative location aggregations.
    """
    EARTH_RADIUS_KM = 6371.0

    _DISTRICT_MAP: Optional[Dict[str, Tuple[str, str]]] = None
    _INITIALIZED = False

    REGIONS = [
        "Qoraqalpog'iston", "Xorazm", "Navoiy", "Buxoro", "Samarqand",
        "Qashqadaryo", "Surxondaryo", "Jizzax", "Sirdaryo", "Toshkent",
        "Namangan", "Farg'ona", "Andijon"
    ]

    REGION_ALIASES = {
        'toshkent': 'Toshkent', 'tashkent': 'Toshkent', 'ташкент': 'Toshkent',
        'samarqand': 'Samarqand', 'samarkand': 'Samarqand', 'самарканд': 'Samarqand',
        'buxoro': 'Buxoro', 'bukhara': 'Buxoro', 'бухара': 'Buxoro',
        'andijon': 'Andijon', 'andijan': 'Andijon', 'андижан': 'Andijon',
        "farg'ona": "Farg'ona", 'fargona': "Farg'ona", 'fergana': "Farg'ona", 'фергана': "Farg'ona",
        'namangan': 'Namangan', 'наманган': 'Namangan',
        'qashqadaryo': 'Qashqadaryo', 'kashkadarya': 'Qashqadaryo', 'кашкадарья': 'Qashqadaryo', 'qarshi': 'Qashqadaryo',
        'surxondaryo': 'Surxondaryo', 'surkhandarya': 'Surxondaryo', 'сурхандарья': 'Surxondaryo', 'termiz': 'Surxondaryo',
        'jizzax': 'Jizzax', 'jizzakh': 'Jizzax', 'джизак': 'Jizzax',
        'sirdaryo': 'Sirdaryo', 'syrdarya': 'Sirdaryo', 'сырдарья': 'Sirdaryo', 'guliston': 'Sirdaryo',
        'navoiy': 'Navoiy', 'navoi': 'Navoiy', 'навои': 'Navoiy',
        'xorazm': 'Xorazm', 'khorezm': 'Xorazm', 'хорезм': 'Xorazm', 'urganch': 'Xorazm', 'xiva': 'Xorazm',
        "qoraqalpog'iston": "Qoraqalpog'iston", 'qoraqalpoq': "Qoraqalpog'iston", 'karakalpakstan': "Qoraqalpog'iston", 'каракалпакстан': "Qoraqalpog'iston", 'nukus': "Qoraqalpog'iston"
    }

    REGION_CENTROIDS: Dict[str, Tuple[float, float]] = {
        "Toshkent": (41.3111, 69.2406),
        "Samarqand": (39.6542, 66.9597),
        "Buxoro": (39.7747, 64.4286),
        "Andijon": (40.7821, 72.3442),
        "Farg'ona": (40.3842, 71.7843),
        "Namangan": (41.0011, 71.6683),
        "Qashqadaryo": (38.8606, 65.7891),
        "Surxondaryo": (37.2242, 67.2783),
        "Jizzax": (40.1158, 67.8422),
        "Sirdaryo": (40.4897, 68.7842),
        "Navoiy": (40.0844, 65.3792),
        "Xorazm": (41.5503, 60.6317),
        "Qoraqalpog'iston": (42.4619, 59.6166),
    }

    # Coarse rectangular bounding box of Uzbekistan for fast preliminary filtering
    UZBEKISTAN_BBOX: Dict[str, float] = {
        "min_lat": 37.0,
        "max_lat": 45.8,
        "min_lng": 55.9,
        "max_lng": 73.5,
    }
    # Backward-compatible alias for bounding box
    UZBEKISTAN_BOUNDS = UZBEKISTAN_BBOX

    _POLYGONS_LOADED = False
    _LOGGED_FAIL_CLOSED_WARNING = False
    _PREPARED_POLYGONS: List[
        Tuple[
            float, float, float, float,  # ext_min_x, ext_max_x, ext_min_y, ext_max_y
            List[Tuple[float, float]],   # ext_ring
            List[Tuple[float, float, float, float, List[Tuple[float, float]]]],  # holes
        ]
    ] = []

    @classmethod
    def _validate_and_normalize_ring(cls, ring: Any) -> Optional[List[Tuple[float, float]]]:
        """
        Validates linear ring strictly following RFC 7946 specifications and normalizes coordinates.
        1. Ring must be a list/tuple of positions with length >= 4.
        2. Every position must be a list/tuple with len >= 2 containing finite numbers (rejects str, bool, NaN, Inf).
        3. 2D/3D supported; coordinates beyond index 1 are also checked for finite numeric type if present.
        4. Ring closure: first and last coordinates must match (RFC 7946 linear ring requirement).
        5. Returns normalized List[Tuple[float, float]] of exact floats.
        """
        if not isinstance(ring, (list, tuple)) or len(ring) < 4:
            return None

        normalized_ring: List[Tuple[float, float]] = []
        for pt in ring:
            if not isinstance(pt, (list, tuple)) or len(pt) < 2:
                return None
            x, y = pt[0], pt[1]
            # Strict rejection of strings and bools (since bool is a subclass of int in Python)
            if isinstance(x, (str, bool)) or isinstance(y, (str, bool)):
                return None
            if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
                return None
            fx, fy = float(x), float(y)
            if not math.isfinite(fx) or not math.isfinite(fy):
                return None

            # If 3D+ coordinate is present, validate remaining elements for finite numbers
            if len(pt) >= 3:
                for z in pt[2:]:
                    if isinstance(z, (str, bool)) or not isinstance(z, (int, float)) or not math.isfinite(float(z)):
                        return None

            normalized_ring.append((fx, fy))

        # RFC 7946 Section 3.1.6: A linear ring MUST be closed (first and last positions equivalent)
        if normalized_ring[0] != normalized_ring[-1]:
            if not (math.isclose(normalized_ring[0][0], normalized_ring[-1][0], abs_tol=1e-9) and
                    math.isclose(normalized_ring[0][1], normalized_ring[-1][1], abs_tol=1e-9)):
                return None

        return normalized_ring

    @classmethod
    def _prepare_polygon(
        cls, rings: List[List[Any]]
    ) -> Optional[
        Tuple[
            float, float, float, float,
            List[Tuple[float, float]],
            List[Tuple[float, float, float, float, List[Tuple[float, float]]]],
        ]
    ]:
        """Prepares a polygon's exterior ring and any interior rings (holes) with bounding boxes for fast ray-casting."""
        if not rings or not isinstance(rings, list) or not rings[0]:
            return None
        ext_ring = cls._validate_and_normalize_ring(rings[0])
        if ext_ring is None:
            return None

        ext_min_x = min(pt[0] for pt in ext_ring)
        ext_max_x = max(pt[0] for pt in ext_ring)
        ext_min_y = min(pt[1] for pt in ext_ring)
        ext_max_y = max(pt[1] for pt in ext_ring)

        prepared_holes = []
        for h_raw in rings[1:]:
            h_ring = cls._validate_and_normalize_ring(h_raw)
            if h_ring is None:
                return None
            h_min_x = min(pt[0] for pt in h_ring)
            h_max_x = max(pt[0] for pt in h_ring)
            h_min_y = min(pt[1] for pt in h_ring)
            h_max_y = max(pt[1] for pt in h_ring)
            prepared_holes.append((h_min_x, h_max_x, h_min_y, h_max_y, h_ring))

        return (ext_min_x, ext_max_x, ext_min_y, ext_max_y, ext_ring, prepared_holes)

    @classmethod
    def _prepare_geojson_atomic(
        cls, data: Dict[str, Any]
    ) -> List[
        Tuple[
            float, float, float, float,
            List[Tuple[float, float]],
            List[Tuple[float, float, float, float, List[Tuple[float, float]]]],
        ]
    ]:
        """
        Atomically prepares all features in GeoJSON.
        Validates every feature and polygon. If any feature is corrupted or invalid,
        raises ValueError and returns nothing, ensuring zero partially-loaded state.
        """
        if not isinstance(data, dict):
            raise ValueError("GeoJSON root must be a dictionary")
        features = data.get("features")
        if not isinstance(features, list) or len(features) == 0:
            raise ValueError("GeoJSON must contain a non-empty 'features' list")

        staging_polygons = []
        for i, feat in enumerate(features):
            if not isinstance(feat, dict):
                raise ValueError(f"Feature at index {i} is not a valid dictionary")
            geom = feat.get("geometry")
            if not isinstance(geom, dict):
                raise ValueError(f"Feature at index {i} is missing valid 'geometry'")
            gtype = geom.get("type")
            coords = geom.get("coordinates")
            if not isinstance(coords, list) or len(coords) == 0:
                raise ValueError(f"Feature at index {i} has invalid coordinates structure")

            if gtype == "Polygon":
                poly_prep = cls._prepare_polygon(coords)
                if not poly_prep:
                    raise ValueError(f"Feature at index {i} (Polygon) could not be prepared")
                staging_polygons.append(poly_prep)
            elif gtype == "MultiPolygon":
                for p_idx, poly in enumerate(coords):
                    if not isinstance(poly, list) or len(poly) == 0:
                        raise ValueError(f"Feature at index {i} (MultiPolygon[{p_idx}]) has invalid structure")
                    poly_prep = cls._prepare_polygon(poly)
                    if not poly_prep:
                        raise ValueError(f"Feature at index {i} (MultiPolygon[{p_idx}]) could not be prepared")
                    staging_polygons.append(poly_prep)
            else:
                raise ValueError(f"Feature at index {i} has unsupported geometry type: {gtype}")

        if not staging_polygons:
            raise ValueError("No valid polygons prepared from features")

        return staging_polygons

    @classmethod
    def _init_polygons(cls, override_data: Optional[Dict[str, Any]] = None, force_reload: bool = False) -> None:
        if cls._POLYGONS_LOADED and override_data is None and not force_reload:
            return

        cls._is_inside_polygon_cached.cache_clear()

        candidates = [
            Path(__file__).resolve().parent.parent / "data" / "uzbekistan_regions.json",
            Path(__file__).resolve().parents[3] / "frontend" / "src" / "data" / "geo" / "uzbekistan_regions.json",
            Path(__file__).resolve().parents[3] / "mobile" / "public" / "uzbekistan_regions_std.json",
        ]
        geojson_path = None
        for p in candidates:
            if p.exists():
                geojson_path = p
                break

        staging = []
        load_success = False

        if override_data is not None:
            try:
                staging = cls._prepare_geojson_atomic(override_data)
                load_success = True
            except Exception as e:
                logger.error(
                    "CRITICAL: Failed to validate override GeoJSON: %s. "
                    "Aborting initialization and failing closed to protect against foreign coordinate ingestion.",
                    e,
                )
                staging = []
                load_success = False
        elif not geojson_path:
            logger.error(
                "CRITICAL: Uzbekistan boundary GeoJSON file could not be found among candidates %s. "
                "Point-in-polygon verification will fail-closed (reject coordinates) to protect against foreign coordinate ingestion.",
                [str(c) for c in candidates],
            )
            staging = []
            load_success = False
        else:
            try:
                with open(geojson_path, encoding="utf-8") as f:
                    data = json.load(f)
                staging = cls._prepare_geojson_atomic(data)
                load_success = True
            except Exception as e:
                logger.error(
                    "CRITICAL: Failed to load or validate uzbekistan_regions GeoJSON from %s: %s. "
                    "Aborting initialization and failing closed to protect against foreign coordinate ingestion.",
                    geojson_path,
                    e,
                )
                staging = []
                load_success = False

        # Atomic publication: Only publish to _PREPARED_POLYGONS if the entire dataset loaded and validated 100% cleanly
        if load_success and staging:
            cls._PREPARED_POLYGONS = staging
            cls._LOGGED_FAIL_CLOSED_WARNING = False
        else:
            cls._PREPARED_POLYGONS = []
        cls._POLYGONS_LOADED = True

    @staticmethod
    def _point_in_ring(lng: float, lat: float, ring: List[Any]) -> bool:
        """Ray-casting algorithm to test whether point (lng, lat) is inside polygon ring."""
        inside = False
        n = len(ring)
        p1x, p1y = ring[0]
        for i in range(1, n + 1):
            p2x, p2y = ring[i % n]
            if lat > min(p1y, p2y):
                if lat <= max(p1y, p2y):
                    if lng <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (lat - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or lng <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        return inside

    @classmethod
    @functools.lru_cache(maxsize=16384)
    def _is_inside_polygon_cached(cls, lat_round: float, lng_round: float) -> bool:
        cls._init_polygons()
        if not cls._PREPARED_POLYGONS:
            # Fail closed: reject coordinate to prevent ingestion of foreign or invalid coordinates
            # Log once to prevent flood of log messages during batch coordinate queries
            if not cls._LOGGED_FAIL_CLOSED_WARNING:
                logger.error(
                    "Uzbekistan boundary polygons unavailable. Rejecting coordinates in fail-closed safety mode."
                )
                cls._LOGGED_FAIL_CLOSED_WARNING = True
            return False

        for ext_min_x, ext_max_x, ext_min_y, ext_max_y, ext_ring, holes in cls._PREPARED_POLYGONS:
            if ext_min_x <= lng_round <= ext_max_x and ext_min_y <= lat_round <= ext_max_y:
                if cls._point_in_ring(lng_round, lat_round, ext_ring):
                    in_hole = False
                    for h_min_x, h_max_x, h_min_y, h_max_y, h_ring in holes:
                        if h_min_x <= lng_round <= h_max_x and h_min_y <= lat_round <= h_max_y:
                            if cls._point_in_ring(lng_round, lat_round, h_ring):
                                in_hole = True
                                break
                    if not in_hole:
                        return True
        return False

    @classmethod
    def is_inside_uzbekistan(cls, lat: float, lng: float) -> bool:
        """
        Validates if coordinates fall within Uzbekistan territory.
        Uses coarse bounding box for O(1) early rejection, followed by exact
        point-in-polygon evaluation against state administrative boundary GeoJSON polygons.
        """
        if not (
            cls.UZBEKISTAN_BBOX["min_lat"] <= lat <= cls.UZBEKISTAN_BBOX["max_lat"]
            and cls.UZBEKISTAN_BBOX["min_lng"] <= lng <= cls.UZBEKISTAN_BBOX["max_lng"]
        ):
            return False

        return cls._is_inside_polygon_cached(round(lat, 4), round(lng, 4))

    @classmethod
    def _init_district_map(cls) -> None:
        if cls._INITIALIZED:
            return
        cls._DISTRICT_MAP = {}
        meta_file = Path(__file__).resolve().parent.parent / "data" / "uzbekistan_districts_meta.json"
        if meta_file.exists():
            try:
                with open(meta_file, encoding="utf-8") as f:
                    districts_meta = json.load(f)
                for d in districts_meta:
                    raw_name = d.get("shapeName", "")
                    clean_name = cls._clean_str(raw_name)
                    reg_id = d.get("regionId", "")
                    cls._DISTRICT_MAP[clean_name] = (raw_name, reg_id)
                    base = re.sub(r"\s+(tumani|shahri|rayon|dist|city)$", "", clean_name).strip()
                    if base and base not in cls._DISTRICT_MAP:
                        cls._DISTRICT_MAP[base] = (raw_name, reg_id)
            except Exception as e:
                logger.warning("Could not load districts metadata: %s", e)
        cls._INITIALIZED = True

    @staticmethod
    def _clean_str(s: str) -> str:
        s = s.lower().strip()
        return s.replace("ʻ", "'").replace("`", "'").replace("’", "'").replace("‘", "'")

    @classmethod
    @functools.lru_cache(maxsize=8192)
    def _resolve_string_location(cls, combined_clean: str) -> Tuple[Optional[str], Optional[str]]:
        cls._init_district_map()
        if not combined_clean:
            return None, None

        matched_region: Optional[str] = None
        matched_district: Optional[str] = None

        parts = [p.strip() for p in combined_clean.split(",") if p.strip()]
        for part in reversed(parts):
            if cls._DISTRICT_MAP:
                for dist_key, (shape_name, reg_id) in cls._DISTRICT_MAP.items():
                    if dist_key in part or part in dist_key:
                        matched_district = shape_name
                        matched_region = reg_id
                        break
            if matched_district:
                break

        if not matched_region:
            for part in parts:
                for alias, reg_id in cls.REGION_ALIASES.items():
                    if alias in part:
                        matched_region = reg_id
                        break
                if matched_region:
                    break

        return matched_region, matched_district

    @classmethod
    def resolve_location(
        cls,
        location_str: Optional[str] = None,
        raw_location_str: Optional[str] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
    ) -> Tuple[Optional[str], Optional[str]]:
        """Resolves region ID and district name for any job location string or GPS coordinates with LRU caching."""
        combined = cls._clean_str(f"{raw_location_str or ''} {location_str or ''}")
        matched_region, matched_district = cls._resolve_string_location(combined)

        # Fallback to closest regional centroid if coordinates exist
        if not matched_region and lat is not None and lng is not None:
            min_dist = float("inf")
            for reg, (c_lat, c_lng) in cls.REGION_CENTROIDS.items():
                d = cls.haversine_distance(lat, lng, c_lat, c_lng)
                if d < min_dist:
                    min_dist = d
                    matched_region = reg

        return matched_region, matched_district

    @classmethod
    def aggregate_location_counts(cls, jobs: List[Any]) -> Dict[str, Any]:
        """High performance single-pass location counter for open jobs.
        Generates $O(1)$ lookup maps for region and district badges.
        """
        regions: Dict[str, int] = {r: 0 for r in cls.REGIONS}
        districts: Dict[str, int] = {}
        total = 0

        for job in jobs:
            loc = getattr(job, "location", None) or ""
            raw_loc = getattr(job, "rawLocation", None) or ""
            lat = getattr(job, "latitude", None)
            if lat is None:
                lat = getattr(job, "coordinateX", None)
            lng = getattr(job, "longitude", None)
            if lng is None:
                lng = getattr(job, "coordinateY", None)

            reg, dist = cls.resolve_location(loc, raw_loc, lat, lng)
            total += 1
            if reg:
                regions[reg] = regions.get(reg, 0) + 1
            if dist:
                districts[dist] = districts.get(dist, 0) + 1
                # Populate variant keys so frontend can look up by either format
                base = re.sub(r"\s+(tumani|shahri|rayon|dist|city)$", "", dist, flags=re.I).strip()
                if base != dist:
                    districts[base] = districts.get(dist, 0)
                tumani_variant = f"{base} tumani"
                if tumani_variant not in districts:
                    districts[tumani_variant] = districts.get(dist, 0)

        return {
            "total": total,
            "regions": regions,
            "districts": districts,
        }

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate the great-circle distance between two GPS points on Earth in kilometers.
        """
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        
        a = (math.sin(d_lat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(d_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(GeoSpatialService.EARTH_RADIUS_KM * c, 2)

    @staticmethod
    def estimate_commute_time(distance_km: float) -> Dict[str, Any]:
        """
        Estimate commute duration for walking, transit, and driving.
        """
        # Speeds: walking = 5 km/h, transit = 25 km/h, driving = 35 km/h (with traffic)
        walk_minutes = int((distance_km / 5.0) * 60)
        transit_minutes = int((distance_km / 25.0) * 60) + 5 # +5 min waiting
        drive_minutes = int((distance_km / 35.0) * 60) + 3 # +3 min traffic

        return {
            "distance_km": distance_km,
            "walking_time_min": max(1, walk_minutes),
            "transit_time_min": max(5, transit_minutes),
            "driving_time_min": max(3, drive_minutes),
            "recommended_mode": "walk" if distance_km <= 1.5 else ("transit" if distance_km <= 8 else "drive")
        }

    @staticmethod
    def filter_jobs_by_radius(
        user_lat: float, 
        user_lon: float, 
        jobs: List[Any], 
        radius_km: float = 10.0
    ) -> List[Dict[str, Any]]:
        """
        Filter and sort jobs within a given radius around user coordinates.
        """
        nearby_jobs = []
        for job in jobs:
            if job.coordinateX is not None and job.coordinateY is not None:
                try:
                    job_lat = float(job.coordinateX)
                    job_lon = float(job.coordinateY)
                    dist = GeoSpatialService.haversine_distance(user_lat, user_lon, job_lat, job_lon)
                    if dist <= radius_km:
                        commute = GeoSpatialService.estimate_commute_time(dist)
                        nearby_jobs.append({
                            "job": job,
                            "distance_km": dist,
                            "commute_estimate": commute
                        })
                except (ValueError, TypeError):
                    continue
        
        nearby_jobs.sort(key=lambda x: x["distance_km"])
        return nearby_jobs

    @classmethod
    def cluster_pins(cls, pins: List[Dict[str, Any]], grid_size: float = 0.4) -> List[Dict[str, Any]]:
        """
        Server-side dynamic spatial clustering for high-zoom-out views.
        Groups nearby pins into clusters to eliminate DOM overload and browser freezes.
        Pins are aggregated by geographic grid snapping (O(N) single-pass bucket aggregation).
        """
        if not pins:
            return []

        buckets: Dict[Tuple[int, int], List[Dict[str, Any]]] = {}
        for pin in pins:
            lat = pin.get("coordinateX") if pin.get("coordinateX") is not None else pin.get("latitude")
            lng = pin.get("coordinateY") if pin.get("coordinateY") is not None else pin.get("longitude")
            if lat is None or lng is None:
                continue
            try:
                f_lat = float(lat)
                f_lng = float(lng)
            except (ValueError, TypeError):
                continue
            if math.isnan(f_lat) or math.isnan(f_lng) or math.isinf(f_lat) or math.isinf(f_lng):
                continue
            if f_lat == 0.0 and f_lng == 0.0:
                continue
            if not cls.is_inside_uzbekistan(f_lat, f_lng):
                continue
            key = (int(math.floor(f_lat / grid_size)), int(math.floor(f_lng / grid_size)))
            if key not in buckets:
                buckets[key] = []
            buckets[key].append(pin)

        clustered_result = []
        from app.core.map_cache import compute_cluster_signature
        for (g_lat, g_lng), group in buckets.items():
            if len(group) == 1:
                single_pin = dict(group[0])
                single_pin["isCluster"] = False
                single_pin["count"] = 1
                single_pin["pinIds"] = [single_pin["id"]]
                single_pin["geo_verified"] = True
                single_pin["geo_sig"] = compute_cluster_signature(single_pin)
                clustered_result.append(single_pin)
            else:
                avg_lat = round(
                    sum(
                        float(p.get("coordinateX") if p.get("coordinateX") is not None else p.get("latitude"))
                        for p in group
                    )
                    / len(group),
                    5,
                )
                avg_lng = round(
                    sum(
                        float(p.get("coordinateY") if p.get("coordinateY") is not None else p.get("longitude"))
                        for p in group
                    )
                    / len(group),
                    5,
                )
                salaries = [p["salary"] for p in group if p.get("salary")]
                min_sal = min(salaries) if salaries else 0
                max_sal = max(salaries) if salaries else 0
                avg_sal = int(sum(salaries) / len(salaries)) if salaries else 0

                loc_company = group[0].get("location") or "O'zbekiston"
                c_dict = {
                    "isCluster": True,
                    "id": f"cluster_{g_lat}_{g_lng}",
                    "count": len(group),
                    "coordinateX": avg_lat,
                    "coordinateY": avg_lng,
                    "latitude": avg_lat,
                    "longitude": avg_lng,
                    "title": f"{len(group)} ta bo'sh ish o'rni",
                    "company": loc_company,
                    "location": group[0].get("location") or "",
                    "rawLocation": group[0].get("rawLocation") or "",
                    "salary": avg_sal,
                    "salaryCurrency": "UZS",
                    "salaryMin": min_sal,
                    "salaryMax": max_sal,
                    "urgent": any(p.get("urgent") for p in group),
                    "status": "open",
                    "category": group[0].get("category") or "Barchasi",
                    "tags": list({t for p in group for t in (p.get("tags") or [])})[:5],
                    "workDate": group[0].get("workDate") or "",
                    "workTime": group[0].get("workTime") or "",
                    "vacancies": sum(p.get("vacancies", 1) for p in group),
                    "hiredCount": sum(p.get("hiredCount", 0) for p in group),
                    "applied": any(p.get("applied") for p in group),
                    "bookmarked": any(p.get("bookmarked") for p in group),
                    "pinIds": [p["id"] for p in group],
                    "geo_verified": True,
                }
                c_dict["geo_sig"] = compute_cluster_signature(c_dict)
                clustered_result.append(c_dict)
        return clustered_result

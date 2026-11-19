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
        if not pins or len(pins) <= 20:
            return pins

        buckets: Dict[Tuple[int, int], List[Dict[str, Any]]] = {}
        for pin in pins:
            lat = pin.get("coordinateX") or pin.get("latitude")
            lng = pin.get("coordinateY") or pin.get("longitude")
            if lat is None or lng is None:
                continue
            key = (int(round(lat / grid_size)), int(round(lng / grid_size)))
            if key not in buckets:
                buckets[key] = []
            buckets[key].append(pin)

        clustered_result = []
        for (g_lat, g_lng), group in buckets.items():
            if len(group) == 1:
                clustered_result.append(group[0])
            else:
                avg_lat = round(sum(p.get("coordinateX") or p.get("latitude") for p in group) / len(group), 5)
                avg_lng = round(sum(p.get("coordinateY") or p.get("longitude") for p in group) / len(group), 5)
                salaries = [p["salary"] for p in group if p.get("salary")]
                min_sal = min(salaries) if salaries else 0
                max_sal = max(salaries) if salaries else 0
                avg_sal = int(sum(salaries) / len(salaries)) if salaries else 0

                loc_company = group[0].get("location") or "O'zbekiston"
                clustered_result.append({
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
                })
        return clustered_result

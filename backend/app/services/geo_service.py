import math
from typing import List, Dict, Any, Optional

class GeoSpatialService:
    """
    Geo-Spatial & GIS Navigation Service for Baito.
    Computes precise GPS distances, commute times and spatial radius filtering.
    """
    EARTH_RADIUS_KM = 6371.0

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

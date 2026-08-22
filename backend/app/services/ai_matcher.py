from typing import List, Dict, Any
from app import models

class AIMatchmaker:
    """
    Intelligent Matchmaking Engine to calculate match compatibility score (0-100%)
    between a worker and a job posting based on skills, location, rating, and category.
    """
    @staticmethod
    def calculate_match_score(worker: models.User, job: models.Job) -> Dict[str, Any]:
        score = 0
        reasons = []

        # 1. Category Matching (Weight: 35%)
        if worker.category and job.category and worker.category.strip().lower() == job.category.strip().lower():
            score += 35
            reasons.append("Kasb sohasi to'liq mos keladi")
        elif worker.category and job.title and worker.category.lower() in job.title.lower():
            score += 20
            reasons.append("Mutaxassislik yo'nalishi yaqin")

        # 2. Location / Region Matching (Weight: 25%)
        if worker.region and job.location and worker.region.strip().lower() in job.location.strip().lower():
            score += 25
            reasons.append("Hudud to'liq mos (o'z shahrida)")

        # 3. Skills Overlap (Weight: 25%)
        worker_skills = set([s.lower().strip() for s in (worker.skills or []) if isinstance(s, str)])
        job_text = f"{job.title} {job.description or ''} {job.requirements or ''}".lower()
        
        matched_skills = [s for s in worker_skills if s in job_text]
        if matched_skills:
            skill_score = min(25, len(matched_skills) * 10)
            score += skill_score
            reasons.append(f"{len(matched_skills)} ta ko'nikma mos: {', '.join(matched_skills[:3])}")

        # 4. Reputation & Experience (Weight: 15%)
        if (worker.rating or 0) >= 4.5:
            score += 10
            reasons.append("Yuqori reytingli mutaxassis")
        if (worker.completedJobsCount or 0) >= 5:
            score += 5
            reasons.append("Tajribali ishchi (5+ muvaffaqiyatli ish)")

        final_score = min(100, score)
        return {
            "score": final_score,
            "is_recommended": final_score >= 60,
            "match_reasons": reasons
        }

    @staticmethod
    def rank_jobs_for_worker(worker: models.User, jobs: List[models.Job]) -> List[Dict[str, Any]]:
        ranked = []
        for job in jobs:
            match_data = AIMatchmaker.calculate_match_score(worker, job)
            ranked.append({
                "job": job,
                "match_score": match_data["score"],
                "is_recommended": match_data["is_recommended"],
                "match_reasons": match_data["match_reasons"]
            })
        ranked.sort(key=lambda x: x["match_score"], reverse=True)
        return ranked

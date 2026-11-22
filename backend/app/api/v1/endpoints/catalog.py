"""The category and region lists, readable by everyone who posts or seeks work.

These live behind ``/admin`` as well, but that copy is for editing them and is
locked to administrators. An employer filling in the posting form is not an
administrator and still has to know what the categories are — before this, the
form carried its own hard-coded copy of the list, which drifted the moment
anybody added a category in the panel.

Commission rates are deliberately not exposed here. What an employer pays is
told to them at the point of hiring, as a figure in so'm against a specific
shift; a bare percentage on a public list is a business detail with no use to
the reader.
"""

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.core.money import MAX_REASONABLE_SALARY_UZS
from app.models.job import JobStatus

router = APIRouter()


@router.get("/categories")
def list_categories(db: Session = Depends(deps.get_db)) -> Any:
    """Every category, with how much work is actually going in it.

    The landing page's "Ommabop yo'nalishlar" block carried six invented
    categories with invented counts — "1,240+ e'lon" — and invented wage ranges.
    None of it came from anywhere. The counts and ranges below are read off the
    open postings, so a category with no work says so.
    """
    rows = db.query(models.Category).order_by(models.Category.name).all()
    if not rows:
        return []

    # SQL GROUP BY aggregation: runs in the database engine rather than loading
    # all open jobs into application RAM.
    valid_salary = and_(
        models.Job.salary > 0,
        models.Job.salary <= MAX_REASONABLE_SALARY_UZS,
    )
    job_stats = (
        db.query(
            models.Job.category,
            func.count(models.Job.id).label("count"),
            func.min(case((valid_salary, models.Job.salary), else_=None)).label("min_salary"),
            func.max(case((valid_salary, models.Job.salary), else_=None)).label("max_salary"),
        )
        .filter(models.Job.status.in_(JobStatus.OPEN_STATUSES))
        .group_by(models.Job.category)
        .all()
    )

    counts: dict[str, int] = {}
    min_wages: dict[str, int] = {}
    max_wages: dict[str, int] = {}
    for category, count, min_sal, max_sal in job_stats:
        key = (category or "").strip()
        if not key:
            continue
        counts[key] = counts.get(key, 0) + (count or 0)
        if min_sal is not None:
            min_wages[key] = min(min_wages.get(key, min_sal), int(min_sal))
        if max_sal is not None:
            max_wages[key] = max(max_wages.get(key, max_sal), int(max_sal))

    result = []
    for c in rows:
        if not c.name:
            continue
        # Rows added through the admin panel before slugs existed have none; the
        # id keeps them selectable rather than dropping them off the form.
        slug = c.slug or c.id
        keys = [k for k in {slug, c.id, c.name} if k]
        cat_count = sum(counts.get(k, 0) for k in keys)
        mins = [min_wages[k] for k in keys if k in min_wages]
        maxs = [max_wages[k] for k in keys if k in max_wages]

        result.append({
            "id": c.id,
            "slug": slug,
            "name": c.name,
            "icon": c.icon,
            "description": c.description,
            "activeJobsCount": cat_count,
            # Null rather than zero when nothing is posted — the card has to be
            # able to tell "no work here" from "work that pays nothing".
            "salaryFrom": min(mins) if mins else None,
            "salaryTo": max(maxs) if maxs else None,
        })
    return result


@router.get("/regions")
def list_regions(db: Session = Depends(deps.get_db)) -> Any:
    """Active regions only — a deactivated one should stop being offered."""
    rows = (
        db.query(models.Region)
        .filter(models.Region.isActive.is_(True))
        .order_by(models.Region.name)
        .all()
    )
    return [
        {"id": r.id, "name": r.name, "type": r.type, "parentId": r.parentId}
        for r in rows
        if r.name
    ]

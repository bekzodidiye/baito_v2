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
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.core.money import parse_salary_amounts
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

    # One pass over the open postings rather than two queries per category.
    open_jobs = (
        db.query(models.Job.category, models.Job.salary)
        .filter(models.Job.status.in_(JobStatus.OPEN_STATUSES))
        .all()
    )
    counts: dict[str, int] = {}
    wages: dict[str, list[int]] = {}
    for category, salary in open_jobs:
        key = (category or "").strip()
        if not key:
            continue
        counts[key] = counts.get(key, 0) + 1
        # Both ends of a range, not just the lower one: the card shows a span,
        # and salary_to_uzs deliberately reports only the guaranteed figure.
        amounts = parse_salary_amounts(salary)
        if amounts:
            wages.setdefault(key, []).extend(amounts)

    result = []
    for c in rows:
        if not c.name:
            continue
        # Rows added through the admin panel before slugs existed have none; the
        # id keeps them selectable rather than dropping them off the form.
        slug = c.slug or c.id
        amounts = wages.get(slug, []) or wages.get(c.id, []) or wages.get(c.name, [])
        cat_count = counts.get(slug, 0)
        if c.id and c.id != slug:
            cat_count += counts.get(c.id, 0)
        if c.name and c.name != slug and c.name != c.id:
            cat_count += counts.get(c.name, 0)

        result.append({
            "id": c.id,
            "slug": slug,
            "name": c.name,
            "icon": c.icon,
            "description": c.description,
            "activeJobsCount": cat_count,
            # Null rather than zero when nothing is posted — the card has to be
            # able to tell "no work here" from "work that pays nothing".
            "salaryFrom": min(amounts) if amounts else None,
            "salaryTo": max(amounts) if amounts else None,
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

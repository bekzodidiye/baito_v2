import re
import unicodedata
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models
from app.api import deps
from .admin_users import get_admin_user

router = APIRouter()


def _slugify(name: str) -> str:
    """A url-safe key for a category name.

    Jobs store this, not the uuid: the value is displayed and filtered on all
    over the app, and a uuid in those places is unreadable. Uzbek apostrophes
    and the like are stripped rather than transliterated - the slug only has to
    be stable and unique, never pretty.
    """
    ascii_name = (
        unicodedata.normalize("NFKD", name or "")
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_name).strip("-")
    return slug or "kategoriya"


def _unique_slug(db: Session, name: str) -> str:
    """Append a counter rather than colliding: the column is unique, and a
    second "Qurilish" must not fail the request an administrator just made."""
    base = _slugify(name)
    slug, n = base, 2
    while db.query(models.Category).filter(models.Category.slug == slug).first():
        slug, n = f"{base}-{n}", n + 1
    return slug

@router.get("/categories")
def get_categories(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    cats = db.query(models.Category).all()
    result = []
    for c in cats:
        result.append({
            "id": c.id,
            "slug": c.slug,
            "name": c.name,
            "icon": c.icon,
            "description": c.description,
            "commissionPercent": c.commissionPercent,
            # Never null: the column is only defaulted on ORM inserts, and the
            # seed wrote these rows with raw SQL. A null here crashed the panel.
            "skills": c.skills or [],
            "activeWorkersCount": c.activeWorkersCount,
            "activeJobsCount": c.activeJobsCount,
        })
    return result

@router.post("/categories")
def create_category(
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Kategoriya nomi kiritilmagan")

    cat = models.Category(
        slug=_unique_slug(db, name),
        name=name,
        icon=payload.get("icon"),
        description=payload.get("description"),
        commissionPercent=payload.get("commissionPercent", 0),
        skills=payload.get("skills") or [],
        activeWorkersCount=payload.get("activeWorkersCount", 0),
        activeJobsCount=payload.get("activeJobsCount", 0),
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {
        "id": cat.id,
        "slug": cat.slug,
        "name": cat.name,
        "icon": cat.icon,
        "description": cat.description,
        "commissionPercent": cat.commissionPercent,
        "skills": cat.skills or [],
        "activeWorkersCount": cat.activeWorkersCount,
        "activeJobsCount": cat.activeJobsCount,
    }


@router.put("/categories/{cat_id}")
@router.patch("/categories/{cat_id}")
def update_category(
    cat_id: str,
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    cat = db.query(models.Category).filter(models.Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Kategoriya topilmadi")

    if "name" in payload and payload["name"]:
        cat.name = str(payload["name"]).strip()
    if "icon" in payload:
        cat.icon = payload["icon"]
    if "description" in payload:
        cat.description = payload["description"]
    if "commissionPercent" in payload:
        try:
            cat.commissionPercent = max(0, min(100, int(payload["commissionPercent"])))
        except (ValueError, TypeError):
            pass
    if "skills" in payload and isinstance(payload["skills"], list):
        cat.skills = payload["skills"]

    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {
        "id": cat.id,
        "slug": cat.slug,
        "name": cat.name,
        "icon": cat.icon,
        "description": cat.description,
        "commissionPercent": cat.commissionPercent,
        "skills": cat.skills or [],
        "activeWorkersCount": cat.activeWorkersCount,
        "activeJobsCount": cat.activeJobsCount,
    }


@router.delete("/categories/{cat_id}")
def delete_category(
    cat_id: str,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    cat = db.query(models.Category).filter(models.Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Kategoriya topilmadi")

    from app.models.job import JobStatus
    active_jobs = db.query(models.Job).filter(
        models.Job.category.in_([c for c in (cat.slug, cat.id, cat.name) if c]),
        models.Job.status.in_(JobStatus.OPEN_STATUSES),
    ).count()
    if active_jobs > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Ushbu kategoriyada {active_jobs} ta faol ish e'loni mavjud, uni o'chirib bo'lmaydi",
        )

    db.delete(cat)
    db.commit()
    return {"success": True}

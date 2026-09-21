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

router = APIRouter()


@router.get("/categories")
def list_categories(db: Session = Depends(deps.get_db)) -> Any:
    """Every category, in the order an administrator would read them."""
    rows = db.query(models.Category).order_by(models.Category.name).all()
    return [
        {
            "id": c.id,
            # What a job stores. Rows added through the admin panel before slugs
            # existed have none; the id keeps them selectable rather than
            # dropping them off the form.
            "slug": c.slug or c.id,
            "name": c.name,
            "icon": c.icon,
            "description": c.description,
        }
        for c in rows
        if c.name
    ]


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

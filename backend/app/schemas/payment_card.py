import re
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

ALLOWED_CARD_TYPES = {"uzcard", "humo", "visa", "mastercard"}


class PaymentCardBase(BaseModel):
    type: str = Field(max_length=20)
    last4: str = Field(min_length=4, max_length=4)
    bank: str = Field(min_length=1, max_length=60)
    isActive: Optional[bool] = True

    @field_validator("type")
    @classmethod
    def check_type(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in ALLOWED_CARD_TYPES:
            raise ValueError("Karta turi qo'llab-quvvatlanmaydi")
        return v

    @field_validator("last4")
    @classmethod
    def check_last4(cls, v: str) -> str:
        if not re.fullmatch(r"\d{4}", v):
            raise ValueError("last4 to'rtta raqamdan iborat bo'lishi kerak")
        return v


class PaymentCardCreate(PaymentCardBase):
    """Card registration payload.

    ``token`` is deliberately absent: a provider token must be written by the
    server-side binding callback, never accepted from the browser.
    """


class PaymentCardUpdate(BaseModel):
    isActive: Optional[bool] = None


class PaymentCardOut(PaymentCardBase):
    """What the client is allowed to see.

    The provider token used to be part of the response model, so every card
    listing handed the raw token to the browser. It is not exposed here.
    """

    id: str
    userId: str

    model_config = ConfigDict(from_attributes=True)


# Backwards-compatible alias for existing imports.
PaymentCardInDB = PaymentCardOut

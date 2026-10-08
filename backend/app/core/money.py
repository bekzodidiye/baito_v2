"""Salary parsing.

``salary`` is a free-text column ("250 000 so'm/kun", "1 500 000 - 2 000 000").
The old approach — ``int(''.join(filter(str.isdigit, salary)))`` — concatenated
every digit in the string, so a range like "1 500 000 - 2 000 000" produced
15000002000000 instead of a plausible wage.
"""

import re

# Numbers may use spaces, non-breaking spaces, commas or apostrophes as
# thousands separators.
_NUMBER_RE = re.compile(r"\d[\d\s '’,.]*\d|\d")
_SEPARATORS = str.maketrans({" ": "", " ": "", "'": "", "’": "", ",": "", ".": ""})

# Sanity bound: anything past this is a typo or a scam, not a daily wage.
MAX_REASONABLE_SALARY_UZS = 500_000_000


def parse_salary_amounts(salary: str | int | None, bounded: bool = True) -> list[int]:
    """Extract every distinct amount mentioned in a salary string.

    ``bounded`` drops implausible figures, which is what callers computing a
    wage want. Pass False to see what was actually written: a figure over the
    bound and no figure at all both reduce to zero otherwise, and validation
    has to tell those two apart.
    """
    if not salary:
        return []
    if isinstance(salary, int):
        return [salary] if (not bounded or 0 < salary <= MAX_REASONABLE_SALARY_UZS) else []
    
    amounts = []
    for match in _NUMBER_RE.finditer(str(salary)):
        digits = match.group(0).translate(_SEPARATORS)
        if not digits.isdigit():
            continue
        value = int(digits)
        if not bounded or 0 < value <= MAX_REASONABLE_SALARY_UZS:
            amounts.append(value)
    return amounts


def salary_to_uzs(salary: str | int | None, default: int = 0) -> int:
    """Best single figure for a salary string.

    For a range the lower bound is used — it is what a worker is guaranteed,
    and it keeps earnings estimates conservative.
    """
    amounts = parse_salary_amounts(salary)
    if not amounts:
        return default
    return min(amounts)


class Money:
    """Utility class to safely convert between UZS (so'm) and Tiyin."""
    
    @staticmethod
    def to_tiyin(uzs_amount: int) -> int:
        return uzs_amount * 100
        
    @staticmethod
    def to_uzs(tiyin_amount: int) -> int:
        return tiyin_amount // 100

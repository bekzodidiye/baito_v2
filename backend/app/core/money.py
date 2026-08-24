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


def parse_salary_amounts(salary: str | None) -> list[int]:
    """Extract every distinct amount mentioned in a salary string."""
    if not salary:
        return []
    amounts = []
    for match in _NUMBER_RE.finditer(salary):
        digits = match.group(0).translate(_SEPARATORS)
        if not digits.isdigit():
            continue
        value = int(digits)
        if 0 < value <= MAX_REASONABLE_SALARY_UZS:
            amounts.append(value)
    return amounts


def salary_to_uzs(salary: str | None, default: int = 0) -> int:
    """Best single figure for a salary string.

    For a range the lower bound is used — it is what a worker is guaranteed,
    and it keeps earnings estimates conservative.
    """
    amounts = parse_salary_amounts(salary)
    if not amounts:
        return default
    return min(amounts)

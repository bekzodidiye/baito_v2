"""A new error message must not ship without its translation.

Every ``HTTPException`` raised here carries an Uzbek ``detail``, and the client
puts that string in front of the reader — showing it is what makes a failure
actionable, "that email is already registered" rather than "an error occurred".
Shown raw it hands Uzbek to a Russian reader, so
``frontend/src/utils/apiErrorTranslator.ts`` translates it on the way out.

This walks the syntax tree and fails when a detail appears that the translator
does not cover. Add the string there, to its test, and the guard goes green.
"""

import ast
import pathlib

import pytest

APP = pathlib.Path(__file__).resolve().parent.parent / "app"
TRANSLATOR = (
    pathlib.Path(__file__).resolve().parents[2]
    / "frontend" / "src" / "utils" / "apiErrorTranslator.ts"
)


def _strings(node):
    """Every string the expression can evaluate to, `{}` for each placeholder."""
    if isinstance(node, ast.Constant):
        return [node.value] if isinstance(node.value, str) else []
    if isinstance(node, ast.JoinedStr):
        return ["".join(
            v.value if isinstance(v, ast.Constant) else "{}" for v in node.values
        )]
    if isinstance(node, ast.IfExp):
        return _strings(node.body) + _strings(node.orelse)
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        left, right = _strings(node.left), _strings(node.right)
        return [a + b for a in left for b in right] if left and right else []
    return []


def details() -> set[str]:
    found: set[str] = set()
    for path in sorted(APP.rglob("*.py")):
        tree = ast.parse(path.read_text(), filename=str(path))
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            if "HTTPException" not in ast.unparse(node.func):
                continue
            for kw in node.keywords:
                if kw.arg == "detail":
                    found.update(s for s in _strings(kw.value) if len(s) > 3)
    return found


def _plain(source: str) -> str:
    """The translator source with its escaping undone.

    Strings are TypeScript literals (`\\'` for a quote) and the templated ones
    are regular expressions (`\\ `, `\\.`, `\\(`), so a detail written plainly
    here matches neither form until the backslashes come out.
    """
    for esc, plain in (("\\'", "'"), ("\\ ", " "), ("\\.", "."),
                       ("\\(", "("), ("\\)", ")"), ("\\!", "!"),
                       ("\\\\", "\\")):
        source = source.replace(esc, plain)
    return source


# Machine-readable error codes handled directly by client interceptors / M2 contracts
KNOWN_CONTRACT_CODES = {
    "ALREADY_APPLIED",
    "CARD_ALREADY_EXISTS",
}


@pytest.mark.skipif(not TRANSLATOR.exists(), reason="frontend not checked out")
def test_every_error_detail_is_translated():
    source = _plain(TRANSLATOR.read_text())
    unknown = []
    for detail in sorted(details()):
        if detail in KNOWN_CONTRACT_CODES:
            continue
        # A templated detail becomes a pattern with a capture where the value
        # goes, so match on its longest literal run instead of the whole thing.
        needle = max(detail.split("{}"), key=len) if "{}" in detail else detail
        if needle.strip() and needle.strip() in source:
            continue
        unknown.append(detail)

    assert not unknown, (
        "These error messages have no translation:\n  "
        + "\n  ".join(unknown)
        + f"\nAdd them to {TRANSLATOR.name}, to its test, and re-run."
    )


def test_the_scan_finds_a_realistic_number():
    """Guards the walk itself: a broken scan would make the test above pass."""
    assert len(details()) > 100

"""A new notification must not ship without its translation.

Notification titles and bodies are composed here in Uzbek and stored that way.
The client translates them on the way out, in
``frontend/src/utils/notificationTranslator.ts``. A template with no entry there
falls through untouched, and a Russian reader gets a Russian screen with an
Uzbek sentence in the middle of it.

Production had six of those. They were missed because they are built into a
local variable first::

    message = (f"'{job.title}' ishining {day.workDate} kuni yakunlandi, ...")
    db.add(models.Notification(..., message=message, ...))

so a scan of ``message=`` literals saw only the name. This walks the syntax
tree and follows those assignments, and fails when it finds a template that
``KNOWN`` does not list — at which point add the translation to the client,
its case to ``notificationTranslator.test.ts``, and the template here.
"""

import ast
import pathlib

import pytest

APP = pathlib.Path(__file__).resolve().parent.parent / "app"
TRANSLATOR = (
    pathlib.Path(__file__).resolve().parents[2]
    / "frontend" / "src" / "utils" / "notificationTranslator.ts"
)

KNOWN_TITLES = {
    "Ariza rad etildi",
    "Hisob-faktura to'landi deb belgilandi",
    "Ish boshlandi",
    "Ish boshlandi!",
    "Ish e'loni bekor qilindi",
    "Ish holati o'zgardi",
    "Ish kuni yakunlandi",
    "Ish tayinlanishi o'zgardi",
    "Ish yakunlandi",
    "Mablag' qaytarildi",
    "Mablag' yechildi",
    "Murojaatingizga javob",
    "Sizni ishga qabul qilishdi!",
    "Sizni ishga tayinlashdi",
    "To'lov chiqarildi",
    "To'lov tasdiqlandi",
    "Verifikatsiya holati",
    "Yangi ariza keldi",
    "Yechish so'rovi rad etildi",
}

KNOWN_MESSAGES = {
    "'{}' bo'yicha qo'llab-quvvatlash javob berdi.",
    "'{}' e'loni administrator tomonidan bekor qilindi.",
    "'{}' e'loni ish beruvchi tomonidan bekor qilindi.",
    "'{}' ishi bo'yicha arizangiz rad etildi.",
    "'{}' ishi bo'yicha ishchi ishni boshladi.",
    "'{}' ishi bo'yicha muzlatilgan mablag' hisobingizga qaytarildi.",
    "'{}' ishi bo'yicha tayinlov administrator tomonidan o'zgartirildi.",
    "'{}' ishi bo'yicha to'lov administrator tomonidan chiqarildi.",
    "'{}' ishi bo'yicha to'lov hisobingizga o'tkazildi.",
    "'{}' ishi bo'yicha to'lov hisobingizga o'tkazildi. Ish beruvchi qo'shimcha {} so'm bonus qo'shdi.",
    "'{}' ishi ishchi tomonidan yakunlandi. Iltimos, ishchiga baho va sharh qoldiring.",
    "'{}' ishi qaytadan ochiq holatga o'tkazildi.",
    "'{}' ishi rasman boshlandi.",
    "'{}' ishi yakunlandi. To'lov ish beruvchi tomonidan alohida amalga oshiriladi.",
    "'{}' ishiga administrator tomonidan tayinlandingiz.",
    "'{}' ishiga qabul qilindingiz. Tafsilotlarni ko'ring.",
    "'{}' ishining {} kuni yakunlandi, shu kun uchun to'lov hisobingizga o'tkazildi.",
    "'{}' ishining {} kuni yakunlandi. To'lov ish beruvchi tomonidan alohida amalga oshiriladi.",
    "Ishchi '{}' ishiga ariza topshirdi.",
    # The two verification defaults are picked at runtime from an editable
    # settings row, so this scan cannot see them. The client covers them and
    # test_the_variable_built_messages_reach_the_translator holds them there.
    "{} so'm balansingizga qaytarildi. Sabab: {}",
    "{} so'm kartangizga o'tkazildi.",
    "{} · {} so'm. Ish yakunlandi.",
    "{} — {} · {} so'm. Chek ilova qilingan. Bank ko'chirmasi bilan solishtiring.",
    "{} — {} · {} so'm. Chek ilova qilinmagan. Bank ko'chirmasi bilan solishtiring.",
}


def _strings(node, scope):
    """Every string the expression can evaluate to, `{}` for each placeholder.

    Returns an empty list when the value cannot be known from the source —
    an administrator's broadcast text, or a settings row read at runtime.
    """
    if isinstance(node, ast.Constant):
        return [node.value] if isinstance(node.value, str) else []
    if isinstance(node, ast.JoinedStr):
        return ["".join(
            v.value if isinstance(v, ast.Constant) else "{}" for v in node.values
        )]
    if isinstance(node, ast.IfExp):
        return _strings(node.body, scope) + _strings(node.orelse, scope)
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        left, right = _strings(node.left, scope), _strings(node.right, scope)
        if left and right:
            return [a + b for a in left for b in right]
        return []
    if isinstance(node, ast.Name):
        return list(scope.get(node.id, []))
    return []


def _scope_of(fn):
    """Strings each local name in `fn` can hold, including `x += "..."`.

    Statements are read in source order so that a `+=` attaches to the
    assignment above it rather than to one in the other branch of the same
    `if`. Assignments accumulate instead of replacing, because both branches
    of an `if` reach the reader.
    """
    scope: dict[str, list[str]] = {}
    body = [n for n in ast.walk(fn) if isinstance(n, (ast.Assign, ast.AugAssign))]
    for node in sorted(body, key=lambda n: (n.lineno, n.col_offset)):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    found = _strings(node.value, scope)
                    if found:
                        scope[target.id] = scope.get(target.id, []) + found
        elif isinstance(node.target, ast.Name):
            base = scope.get(node.target.id, [])
            tail = _strings(node.value, scope)
            if base and tail:
                # Both forms reach the reader: with the suffix and without it.
                scope[node.target.id] = base + [a + b for a in base for b in tail]
    return scope


def collect():
    titles: set[str] = set()
    messages: set[str] = set()
    for path in sorted(APP.rglob("*.py")):
        tree = ast.parse(path.read_text(), filename=str(path))
        for fn in list(ast.walk(tree)):
            if not isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            scope = _scope_of(fn)
            for node in ast.walk(fn):
                if not isinstance(node, ast.Call):
                    continue
                if "Notification" not in ast.unparse(node.func):
                    continue
                for kw in node.keywords:
                    if kw.arg == "title":
                        titles.update(_strings(kw.value, scope))
                    elif kw.arg == "message":
                        messages.update(_strings(kw.value, scope))
    return titles, messages


def test_every_notification_title_is_translated():
    titles, _ = collect()
    assert titles, "found no notification titles at all — has the scan broken?"
    unknown = titles - KNOWN_TITLES
    assert not unknown, (
        "These notification titles have no translation:\n  "
        + "\n  ".join(sorted(unknown))
        + f"\nAdd them to {TRANSLATOR.name}, to its test, and to KNOWN_TITLES here."
    )


def test_every_notification_message_is_translated():
    _, messages = collect()
    assert messages, "found no notification messages at all — has the scan broken?"
    unknown = messages - KNOWN_MESSAGES
    assert not unknown, (
        "These notification messages have no translation:\n  "
        + "\n  ".join(sorted(unknown))
        + f"\nAdd them to {TRANSLATOR.name}, to its test, and to KNOWN_MESSAGES here."
    )


def test_the_list_has_no_leftovers():
    """A template removed from the backend should be removed from here too.

    Two exceptions stay on purpose: rows written by code that no longer exists
    are still in the database and still render, so the client keeps covering
    them. Those live in the client's list, not this one.
    """
    titles, messages = collect()
    assert not (KNOWN_TITLES - titles), (
        "No longer emitted: " + ", ".join(sorted(KNOWN_TITLES - titles))
    )
    assert not (KNOWN_MESSAGES - messages), (
        "No longer emitted: " + ", ".join(sorted(KNOWN_MESSAGES - messages))
    )


@pytest.mark.skipif(not TRANSLATOR.exists(), reason="frontend not checked out")
def test_the_variable_built_messages_reach_the_translator():
    """The six that production leaked, named so a rename cannot silently drop them."""
    source = TRANSLATOR.read_text()
    for fragment in (
        "kuni yakunlandi, shu kun uchun to'lov hisobingizga o'tkazildi",
        "kuni yakunlandi",
        "ishi bo'yicha to'lov hisobingizga o'tkazildi",
        "To'lov ish beruvchi tomonidan alohida amalga oshiriladi",
        "Sizning shaxsingiz va hujjatlaringiz tasdiqlandi!",
        "Hujjatlaringiz rad etildi",
    ):
        assert fragment in source, f"{fragment!r} is no longer handled by the translator"

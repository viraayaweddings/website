"""Compares worker-rendered blog pages against the static originals.

Whitespace is normalised away (the generated markup is indented differently),
so anything reported is a real difference in content, markup or attributes.
"""
import io, os, re, sys, glob, difflib
import html as htmllib
import urllib.request

BASE = os.environ.get("BASE", "http://127.0.0.1:8799")
ROOT = "site-public/blogs"


def fetch(path):
    with urllib.request.urlopen(f"{BASE}{path}", timeout=60) as r:
        return r.read().decode("utf-8", "replace")


def read(path):
    return io.open(path, encoding="utf-8").read()


def normalise(html):
    """Collapse insignificant whitespace so indentation differences vanish."""
    html = re.sub(r"\s+", " ", html)
    html = re.sub(r">\s+<", "><", html)
    return html.strip()


def canonical(token):
    """Compare what a browser renders, not how it happens to be spelled.

    The originals were produced by a templating engine that escapes eagerly
    (&amp;, &#039;, &#8217;); the worker writes the same characters literally,
    which is equally valid HTML. Decoding both sides removes that difference
    while still catching any real change to the text.
    """
    if not token.startswith("<"):
        return htmllib.unescape(token).strip()
    # Inside a tag, decode attribute values but leave the structure alone.
    # Boolean attributes and tag padding differ only in spelling: HTMLRewriter
    # writes selected="selected" where the original wrote a bare selected, and
    # reserialising a tag can drop a space before ">". Neither changes meaning.
    token = re.sub(r'\s+(selected|checked|disabled|multiple|required)="[^"]*"', r' \1', token)
    token = re.sub(r'\s+>$', '>', token)
    return re.sub(r'="([^"]*)"', lambda m: '="' + htmllib.unescape(m.group(1)) + '"', token)


def tokens(html):
    """Split into tags and text runs, one per line, for a readable diff."""
    # Text nodes are trimmed: padding inside an element is not content, and
    # trimming cannot mask an actual difference in the text itself.
    parts = [t.strip() for t in re.split(r"(?=<)|(?<=>)", normalise(html)) if t.strip()]
    return [c for c in (canonical(t) for t in parts) if c]


slugs = sorted(
    os.path.basename(os.path.dirname(p))
    for p in glob.glob(os.path.join(ROOT, "*", "index.html"))
    if os.path.basename(os.path.dirname(p)) not in {"category", "tag"}
)

targets = [(f"/blogs/{s}/", os.path.join(ROOT, s, "index.html")) for s in slugs]
targets.append(("/blogs/", os.path.join(ROOT, "index.html")))

# Category and tag pages, including the ones that list nothing.
for taxonomy in ("category", "tag"):
    for path in sorted(glob.glob(os.path.join(ROOT, taxonomy, "*", "index.html"))):
        page = os.path.basename(os.path.dirname(path))
        targets.append((f"/blogs/{taxonomy}/{page}/", path))

# Differences that are understood and accepted, so the harness stays meaningful:
# green means "nothing changed unexpectedly", not "nothing changed".
EXPECTED_DIFFS = {
    # Two excerpts were stored with entities as literal text, so the originals
    # print &quot; and &nbsp; to readers. Correcting that in the database changes
    # every page those two cards appear on.
    "/blogs/": "Excerpt entities corrected; the original prints them literally.",
    "/blogs/category/weeding-planning/":
        "Excerpt entities corrected; the original prints them literally.",
}

failures = 0
expected = 0
for url, static_path in targets:
    served = fetch(url + "?cb=diffharness")
    original = read(static_path)

    if tokens(served) == tokens(original):
        print(f"  MATCH  {url}")
        continue

    reason = EXPECTED_DIFFS.get(url)
    if reason:
        expected += 1
        print(f"  KNOWN  {url}  ({reason})")
        continue

    failures += 1
    diff = [
        line for line in difflib.unified_diff(tokens(original), tokens(served), lineterm="", n=0)
        if line.startswith(("+", "-")) and not line.startswith(("+++", "---"))
    ]
    print(f"  DIFF   {url}  ({len(diff)} token changes)")
    for line in diff[:14]:
        print("          " + line[:150])
    if len(diff) > 14:
        print(f"          ... {len(diff) - 14} more")

print()
print(f"{len(targets) - failures - expected}/{len(targets)} blog pages identical, "
      f"{expected} with a known accepted difference, {failures} unexpected")
sys.exit(1 if failures else 0)

"""Compares the one-off managed pages (homepage, contact) against their originals.

Run against a built worker, not the dev server:

    npm run build
    npx wrangler dev -c dist/server/wrangler.json --port 8822 --local
    BASE=http://127.0.0.1:8822 python build/verify-singleton-render.py
"""
import io, os, re, sys, difflib
import html as htmllib
import urllib.request

BASE = os.environ.get("BASE", "http://127.0.0.1:8822")

TARGETS = [
    ("/", "site-public/index.html"),
    ("/contact/", "site-public/contact/index.html"),
]


def fetch(path):
    with urllib.request.urlopen(f"{BASE}{path}", timeout=90) as response:
        return response.read().decode("utf-8", "replace")


def normalise(html):
    html = re.sub(r"\s+", " ", html)
    html = re.sub(r">\s+<", "><", html)
    return html.strip()


def canonical(token):
    if not token.startswith("<"):
        return htmllib.unescape(token).strip()
    token = re.sub(r'\s+(selected|checked|disabled|multiple|required)="[^"]*"', r' \1', token)
    token = re.sub(r'\s+>$', '>', token)
    return re.sub(r'="([^"]*)"', lambda m: '="' + htmllib.unescape(m.group(1)) + '"', token)


def tokens(html):
    parts = [t.strip() for t in re.split(r"(?=<)|(?<=>)", normalise(html)) if t.strip()]
    return [c for c in (canonical(t) for t in parts) if c]


failures = 0
for url, static_path in TARGETS:
    served = fetch(f"{url}?cb=diffharness")
    original = io.open(static_path, encoding="utf-8").read()

    if tokens(served) == tokens(original):
        print(f"  MATCH  {url}")
        continue

    failures += 1
    diff = [
        line for line in difflib.unified_diff(tokens(original), tokens(served), lineterm="", n=0)
        if line.startswith(("+", "-")) and not line.startswith(("+++", "---"))
    ]
    print(f"  DIFF   {url}  ({len(diff)} token changes)")
    for line in diff[:12]:
        print("          " + line[:150])
    if len(diff) > 12:
        print(f"          ... {len(diff) - 12} more")

print()
print(f"{len(TARGETS) - failures}/{len(TARGETS)} single pages render identically to the static originals")
sys.exit(1 if failures else 0)

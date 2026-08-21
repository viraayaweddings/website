"""Compares worker-rendered city index pages against the static originals.

Run against a built worker, not the dev server, because vite serves
site-public directly and never invokes the worker:

    npm run build
    npx wrangler dev -c dist/server/wrangler.json --port 8803 --local
    BASE=http://127.0.0.1:8803 python build/verify-city-render.py

Whitespace is normalised and HTML entities are decoded before comparing: the
originals came from a templating engine that escapes eagerly while the worker
writes the same characters literally, and both render identically. Any real
change in content, markup or attributes still shows up.
"""
import io, os, re, sys, glob, difflib
import html as htmllib
import urllib.request

BASE = os.environ.get("BASE", "http://127.0.0.1:8803")
ROOT = "site-public/destination-wedding"
LIMIT = int(os.environ.get("LIMIT", "0"))


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
    # Boolean attributes and tag padding differ only in spelling: HTMLRewriter
    # writes selected="selected" where the original wrote a bare selected, and
    # reserialising a tag can drop a space before ">". Neither changes meaning.
    token = re.sub(r'\s+(selected|checked|disabled|multiple|required)="[^"]*"', r' \1', token)
    token = re.sub(r'\s+>$', '>', token)
    return re.sub(r'="([^"]*)"', lambda m: '="' + htmllib.unescape(m.group(1)) + '"', token)


def tokens(html):
    parts = [t.strip() for t in re.split(r"(?=<)|(?<=>)", normalise(html)) if t.strip()]
    return [c for c in (canonical(t) for t in parts) if c]


pages = sorted(glob.glob(os.path.join(ROOT, "*", "index.html")))
if LIMIT:
    pages = pages[:LIMIT]

failures = []
for index, static_path in enumerate(pages, 1):
    city = static_path.replace("\\", "/").split("/")[-2]
    url = f"/destination-wedding/{city}/"

    served = fetch(url + "?cb=diffharness")
    original = io.open(static_path, encoding="utf-8").read()

    if tokens(served) == tokens(original):
        continue

    diff = [
        line for line in difflib.unified_diff(tokens(original), tokens(served), lineterm="", n=0)
        if line.startswith(("+", "-")) and not line.startswith(("+++", "---"))
    ]
    failures.append((url, diff))
    print(f"  DIFF   {url}  ({len(diff)} token changes)")
    for line in diff[:10]:
        print("          " + line[:150])
    if len(diff) > 10:
        print(f"          ... {len(diff) - 10} more")

print()
print(f"{len(pages) - len(failures)}/{len(pages)} city pages render identically to the static originals")
sys.exit(1 if failures else 0)

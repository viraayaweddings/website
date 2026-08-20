from pathlib import Path
from PIL import Image, ImageOps
import json
import os
import re

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site-public"
CANDIDATES = ROOT / "tmp" / "vivahnam-watermark-candidates.json"
REPORT = ROOT / "tmp" / "image-quality-fix-report.json"

IMAGE_RE = re.compile(r"""(?:src|href|content)=["']([^"']+\.(?:jpg|jpeg|png|webp))["']""", re.I)
BANNER_RE = re.compile(r"""listing-details-banner[^>]+background-image:\s*url\(["']?([^"')]+)["']?\)""", re.I)


def rel(path):
    return path.relative_to(ROOT).as_posix()


def site_path(url):
    if not url or url.startswith("http") or url.startswith("data:"):
        return None
    clean = url.split("?", 1)[0].lstrip("/")
    path = SITE / clean
    return path if path.exists() else None


def should_fix(item):
    path = item["path"]
    score = item["score"]
    if path.startswith("site-public/storage/hotel/seo/") and score >= 0.30:
        return True
    if path.startswith("site-public/storage/hotels/banners/") and score >= 0.69:
        return True
    if path.startswith("site-public/storage/hotels/thumbnails/") and score >= 0.69:
        return True
    return False


def is_watermarked_url(url, watermarked):
    path = site_path(url)
    return path is None or rel(path) in watermarked


def html_sources():
    pages = {}
    for html in SITE.rglob("*.html"):
        text = html.read_text(encoding="utf-8", errors="ignore")
        urls = set(IMAGE_RE.findall(text))
        banner = None
        match = BANNER_RE.search(text)
        if match:
            banner = match.group(1)
            urls.add(banner)
        for url in urls:
            path = site_path(url)
            if path:
                pages.setdefault(rel(path), []).append((html, text, banner))
    return pages


def choose_clean_source(item, page_map, watermarked):
    target_rel = item["path"]
    for html, text, banner in page_map.get(target_rel, []):
        options = []
        if banner:
            options.append(banner)
        options.extend(IMAGE_RE.findall(text))
        for url in options:
            path = site_path(url)
            if not path:
                continue
            r = rel(path)
            if r == target_rel or r in watermarked:
                continue
            if "/storage/hotels/logo/" in r or "/storage/availability/logos/" in r:
                continue
            if path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                continue
            return path, html
    return None, None


def choose_clean_same_folder(item, watermarked):
    target = ROOT / item["path"]
    with Image.open(target) as old:
        target_size = old.size
    for candidate in target.parent.iterdir():
        candidate_rel = rel(candidate)
        if candidate == target or candidate_rel in watermarked:
            continue
        if candidate.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue
        try:
            with Image.open(candidate) as image:
                if image.size == target_size:
                    return candidate
        except Exception:
            continue
    for candidate in target.parent.iterdir():
        candidate_rel = rel(candidate)
        if candidate == target or candidate_rel in watermarked:
            continue
        if candidate.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
            return candidate
    return None


def overwrite_with_source(target, source):
    with Image.open(target) as old:
        width, height = old.size
        old_mode = old.mode
    with Image.open(source) as src:
        image = src.convert("RGB")
        image = ImageOps.fit(image, (width, height), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
        save_kwargs = {}
        suffix = target.suffix.lower()
        if suffix in {".jpg", ".jpeg"}:
            save_kwargs = {"quality": 94, "subsampling": 0, "optimize": True}
        elif suffix == ".png":
            save_kwargs = {"optimize": True}
            if old_mode in {"RGBA", "LA"}:
                image = image.convert("RGBA")
        elif suffix == ".webp":
            save_kwargs = {"quality": 94, "method": 6}
        temp = target.with_name(f"{target.stem}.tmp{target.suffix}")
        image.save(temp, **save_kwargs)
        os.replace(temp, target)


data = json.loads(CANDIDATES.read_text(encoding="utf-8"))
selected = [item for item in data if should_fix(item)]
watermarked = {item["path"] for item in selected}
page_map = html_sources()

changed = []
unresolved = []
for item in selected:
    target = ROOT / item["path"]
    source, page = choose_clean_source(item, page_map, watermarked)
    source_kind = "same-page"
    if not source:
        source = choose_clean_same_folder(item, watermarked)
        source_kind = "same-folder"
    if source:
        overwrite_with_source(target, source)
        changed.append({
            "target": item["path"],
            "source": rel(source),
            "page": rel(page) if page else None,
            "source_kind": source_kind,
            "score": item["score"],
        })
    else:
        unresolved.append(item)

REPORT.write_text(json.dumps({
    "selected_count": len(selected),
    "replaced_count": len(changed),
    "unresolved_count": len(unresolved),
    "replaced": changed,
    "unresolved": unresolved,
}, indent=2), encoding="utf-8")

print(f"Selected: {len(selected)}")
print(f"Replaced: {len(changed)}")
print(f"Unresolved: {len(unresolved)}")

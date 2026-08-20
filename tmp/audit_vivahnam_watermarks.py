from pathlib import Path
from io import BytesIO
import subprocess
from PIL import Image, ImageStat
import json
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "site-public" / "storage" / "hotel" / "seo" / "utzq96jRolegjggY0fRjf1dmdPIVZsQozbhBYV1I.jpg"
OUT = ROOT / "tmp" / "vivahnam-watermark-candidates.json"

TARGET_SIZE = (800, 457)
TEMPLATE_BOX = (615, 30, 785, 75)
OFFSETS = [(0, 0), (-8, 0), (8, 0), (0, -6), (0, 6), (-8, -6), (8, 6)]
EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def load_gray(path):
    return Image.open(path).convert("RGB").resize(TARGET_SIZE)


def load_original_reference():
    rel = REF.relative_to(ROOT).as_posix()
    try:
        data = subprocess.check_output(["git", "show", f"HEAD:{rel}"], cwd=ROOT)
        return Image.open(BytesIO(data)).convert("RGB").resize(TARGET_SIZE)
    except Exception:
        return load_gray(REF)


ref = load_original_reference()
template = ref.crop(TEMPLATE_BOX)

mask_points = []
tpl_pixels = template.load()
tw, th = template.size
for y in range(th):
    for x in range(tw):
        r, g, b = tpl_pixels[x, y]
        if min(r, g, b) >= 205 and max(r, g, b) - min(r, g, b) <= 35:
            mask_points.append((x, y))

if len(mask_points) < 500:
    raise SystemExit(f"Template mask too small: {len(mask_points)}")


mask = np.zeros((th, tw), dtype=bool)
for x, y in mask_points:
    mask[y, x] = True
mask_count = int(mask.sum())
nonmask = ~mask
nonmask_count = int(nonmask.sum())


def score_image(path):
    try:
        img = load_gray(path)
    except Exception:
        return None

    arr = np.asarray(img, dtype=np.int16)
    x1, y1, _, _ = TEMPLATE_BOX
    best = None
    for dx, dy in OFFSETS:
        ox = x1 + dx
        oy = y1 + dy
        if ox < 0 or oy < 0 or ox + tw > TARGET_SIZE[0] or oy + th > TARGET_SIZE[1]:
            continue
        region = arr[oy:oy + th, ox:ox + tw, :]
        mn = region.min(axis=2)
        mx = region.max(axis=2)
        bright = mn >= 185
        whiteish = (mn >= 200) & ((mx - mn) <= 45)
        very_bright = mn >= 225
        white_ratio = float((whiteish & mask).sum() / mask_count)
        bright_ratio = float((bright & mask).sum() / mask_count)
        very_ratio = float((very_bright & mask).sum() / mask_count)
        nonmask_white_ratio = float((whiteish & nonmask).sum() / nonmask_count)
        nonmask_very_ratio = float((very_bright & nonmask).sum() / nonmask_count)
        gray = region.mean(axis=2)
        stdev = float(gray.std())
        contrast = max(white_ratio - nonmask_white_ratio, 0)
        score = (
            contrast * 0.62
            + max(very_ratio - nonmask_very_ratio, 0) * 0.26
            + min(stdev / 85, 1) * 0.12
        )
        candidate = {
            "score": round(score, 4),
            "white_ratio": round(white_ratio, 4),
            "nonmask_white_ratio": round(nonmask_white_ratio, 4),
            "bright_ratio": round(bright_ratio, 4),
            "very_bright_ratio": round(very_ratio, 4),
            "nonmask_very_bright_ratio": round(nonmask_very_ratio, 4),
            "mean": round(float(gray.mean()), 2),
            "stdev": round(stdev, 2),
            "box": [ox, oy, ox + tw, oy + th],
        }
        if best is None or candidate["score"] > best["score"]:
            best = candidate

    if best and best["score"] >= 0.18 and best["white_ratio"] >= 0.58:
        rel = path.relative_to(ROOT).as_posix()
        best["path"] = rel
        return best
    return None


paths = [
    p for p in (ROOT / "site-public" / "storage").rglob("*")
    if p.is_file() and p.suffix.lower() in EXTS
]

results = []
for idx, path in enumerate(paths, 1):
    hit = score_image(path)
    if hit:
        results.append(hit)

results.sort(key=lambda item: item["score"], reverse=True)
OUT.write_text(json.dumps(results, indent=2), encoding="utf-8")
print(f"Scanned {len(paths)} images")
print(f"Candidates: {len(results)}")
for item in results[:80]:
    print(f"{item['score']:.4f} {item['white_ratio']:.4f} {item['path']}")

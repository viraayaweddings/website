from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import cv2
import json
import math
import numpy as np
import re

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site-public"
REPORT = ROOT / "tmp" / "image-quality-audit-report.json"
BLUR_SHEET = ROOT / "tmp" / "image-quality-blur-contact-sheet.jpg"
SIZE_SHEET = ROOT / "tmp" / "image-quality-size-contact-sheet.jpg"

RASTER_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
REFERENCE_RE = re.compile(r"""(?:(?:src|href|content)=["']|url\(["']?)([^"')?#]+\.(?:jpg|jpeg|png|webp))""", re.I)
PHOTO_HINTS = (
    "/storage/hotel/",
    "/storage/hotels/",
    "/storage/blog/",
    "/storage/blogs/",
)
ICON_HINTS = (
    "logo",
    "icon",
    "/storage/packages/inclusions/",
    "/storage/hotels/logo/",
    "/storage/availability/logos/",
    "arrow",
    "search",
    "menu",
    "close",
    "input",
    "plan.png",
    "train.png",
    "f-icon",
    "e-icon",
)


def rel(path):
    return path.relative_to(ROOT).as_posix()


def local_path(url):
    if url.startswith(("http://", "https://", "data:")):
        return None
    clean = url.lstrip("/")
    path = SITE / clean
    return path if path.exists() and path.suffix.lower() in RASTER_EXTS else None


def referenced_images():
    found = set()
    for path in SITE.rglob("*"):
        if path.suffix.lower() not in {".html", ".css", ".js", ".json"}:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for url in REFERENCE_RE.findall(text):
            image = local_path(url)
            if image:
                found.add(image)
    return found


def is_photo(path):
    r = "/" + path.relative_to(SITE).as_posix()
    lower = r.lower()
    if not any(hint in lower for hint in PHOTO_HINTS):
        return False
    if any(hint in lower for hint in ICON_HINTS):
        return False
    return True


def sharpness_score(image):
    rgb = ImageOps.exif_transpose(image.convert("RGB"))
    rgb.thumbnail((900, 900), Image.Resampling.LANCZOS)
    gray = cv2.cvtColor(np.asarray(rgb), cv2.COLOR_RGB2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def edge_crop_score(image):
    rgb = ImageOps.exif_transpose(image.convert("RGB"))
    rgb.thumbnail((900, 900), Image.Resampling.LANCZOS)
    arr = np.asarray(rgb)
    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 80, 180)
    h, w = edges.shape
    band = max(4, min(h, w) // 25)
    border = np.zeros_like(edges, dtype=bool)
    border[:band, :] = True
    border[-band:, :] = True
    border[:, :band] = True
    border[:, -band:] = True
    border_density = float(edges[border].mean() / 255)
    center_density = float(edges[~border].mean() / 255)
    return border_density / max(center_density, 0.001)


def make_sheet(items, out, title_key):
    items = items[:30]
    if not items:
        return
    thumb_w, thumb_h, label_h = 260, 149, 62
    cols = 3
    rows = math.ceil(len(items) / cols)
    sheet = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + label_h)), "white")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("arial.ttf", 12)
    except Exception:
        font = ImageFont.load_default()
    for i, item in enumerate(items):
        path = ROOT / item["path"]
        row, col = divmod(i, cols)
        x, y = col * thumb_w, row * (thumb_h + label_h)
        try:
            with Image.open(path) as image:
                thumb = ImageOps.fit(ImageOps.exif_transpose(image.convert("RGB")), (thumb_w, thumb_h), method=Image.Resampling.LANCZOS)
        except Exception:
            thumb = Image.new("RGB", (thumb_w, thumb_h), "#ddd")
        sheet.paste(thumb, (x, y))
        draw.text((x + 5, y + thumb_h + 4), f"{i + 1}. {title_key}: {item[title_key]}", fill=(0, 0, 0), font=font)
        draw.text((x + 5, y + thumb_h + 22), f"{item['width']}x{item['height']} {Path(item['path']).name[:22]}", fill=(60, 60, 60), font=font)
        draw.text((x + 5, y + thumb_h + 40), "/".join(Path(item["path"]).parts[2:4]), fill=(90, 90, 90), font=font)
    sheet.save(out, quality=92)


all_images = [
    path for path in SITE.rglob("*")
    if path.is_file() and path.suffix.lower() in RASTER_EXTS
]
referenced = referenced_images()

records = []
errors = []
for path in all_images:
    try:
        with Image.open(path) as image:
            width, height = image.size
            score = sharpness_score(image)
            crop_score = edge_crop_score(image)
    except Exception as exc:
        errors.append({"path": rel(path), "error": str(exc)})
        continue

    photo = is_photo(path)
    record = {
        "path": rel(path),
        "width": width,
        "height": height,
        "aspect_ratio": round(width / height, 3) if height else None,
        "bytes": path.stat().st_size,
        "referenced": path in referenced,
        "photo": photo,
        "sharpness": round(score, 2),
        "edge_crop_score": round(crop_score, 2),
    }
    records.append(record)

photo_records = [r for r in records if r["photo"] and r["referenced"]]
possibly_blurry = [
    r for r in photo_records
    if r["width"] >= 500 and r["height"] >= 280 and r["sharpness"] < 45
]
tiny_or_low_res = [
    r for r in photo_records
    if r["width"] < 500 or r["height"] < 280
]
possible_crop_risk = [
    r for r in photo_records
    if r["width"] >= 500 and r["height"] >= 280 and r["edge_crop_score"] >= 1.85
]

possibly_blurry.sort(key=lambda r: r["sharpness"])
tiny_or_low_res.sort(key=lambda r: (r["width"] * r["height"], r["path"]))
possible_crop_risk.sort(key=lambda r: r["edge_crop_score"], reverse=True)

make_sheet(possibly_blurry, BLUR_SHEET, "sharpness")
make_sheet(tiny_or_low_res, SIZE_SHEET, "bytes")

REPORT.write_text(json.dumps({
    "total_raster_images": len(records),
    "referenced_raster_images": len(referenced),
    "referenced_photo_images": len(photo_records),
    "possibly_blurry_count": len(possibly_blurry),
    "tiny_or_low_res_count": len(tiny_or_low_res),
    "possible_crop_risk_count": len(possible_crop_risk),
    "possibly_blurry": possibly_blurry[:100],
    "tiny_or_low_res": tiny_or_low_res[:100],
    "possible_crop_risk": possible_crop_risk[:100],
    "errors": errors,
}, indent=2), encoding="utf-8")

print(f"Total raster images: {len(records)}")
print(f"Referenced raster images: {len(referenced)}")
print(f"Referenced photo images: {len(photo_records)}")
print(f"Possibly blurry: {len(possibly_blurry)}")
print(f"Tiny or low-res: {len(tiny_or_low_res)}")
print(f"Possible crop-risk: {len(possible_crop_risk)}")

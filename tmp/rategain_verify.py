from __future__ import annotations

import json
import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / "tmp"
DOWNLOADS = Path(r"C:\Users\RohitKumar\Downloads")


def extract_pdf_text() -> None:
    for pdf in [
        DOWNLOADS / "RateGain_Cookie_List_ForPolicy.pdf",
        DOWNLOADS / "RateGain-Cookie-Inventory-v2.pdf",
    ]:
        reader = PdfReader(str(pdf))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        out = TMP / f"{pdf.stem}.txt"
        out.write_text(text, encoding="utf-8")
        print(f"PDF {pdf.name}: {len(reader.pages)} pages, {len(text)} chars -> {out}")
        print(text[:2500].replace("\x00", " "))
        print("\n---")


def walk(obj, path=""):
    if isinstance(obj, dict):
        yield path, obj
        for key, value in obj.items():
            yield from walk(value, f"{path}.{key}" if path else str(key))
    elif isinstance(obj, list):
        for idx, value in enumerate(obj):
            yield from walk(value, f"{path}[{idx}]")


def inspect_onetrust() -> None:
    data = json.loads((TMP / "onetrust-en.json").read_text(encoding="utf-8-sig"))
    print("OneTrust top keys:", sorted(data.keys()))
    for path, obj in walk(data):
        if isinstance(obj, dict) and "CustomGroupId" in obj:
            print("GROUP", path, obj.get("CustomGroupId"), obj.get("GroupName"), obj.keys())
            cookies = obj.get("Cookies") or obj.get("FirstPartyCookies") or obj.get("Hosts") or []
            print("  cookies-ish type", type(cookies).__name__, "len", len(cookies) if hasattr(cookies, "__len__") else "")
        if isinstance(obj, dict) and {"Name", "Host", "Length"}.issubset(obj.keys()):
            print("COOKIEOBJ", path, {k: obj.get(k) for k in ["Name", "Host", "Length", "CustomGroupId", "GroupName"]})


def gtm_search() -> None:
    text = (TMP / "gtm-W4XCFM.js").read_text(encoding="utf-8", errors="ignore")
    print("GTM length:", len(text))
    needles = [
        "G-SW8NG6C5KZ",
        "G-D716FNMRD2",
        "AW-11187685771",
        "UA-71336764-1",
        "1134576979914513",
        "b625p75iga",
        "283008484",
        "2330802",
        "6290129",
        "1935520",
        "84f54b0b-da25-40c7-9510-508f368cc4ff",
        "nlium3434ss8usbjq14t6jflqz4jx3bt",
        "85250",
        "RATEGAIN",
        "DzLR5a5bg9n8BoQ2",
        "414792",
        "690",
        "storylane",
        "dreamdata",
        "drift",
        "segment",
        "zoominfo",
        "optinmonster",
        "mixpanel",
        "tiktok",
        "twitter",
        "reddit",
        "quora",
        "6sense",
        "demandbase",
        "floodlight",
    ]
    for needle in needles:
        hits = [m.start() for m in re.finditer(re.escape(needle), text, re.IGNORECASE)]
        print(f"{needle}: {len(hits)}", hits[:5])


if __name__ == "__main__":
    extract_pdf_text()
    inspect_onetrust()
    gtm_search()

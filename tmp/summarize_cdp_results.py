from __future__ import annotations

import json
from pathlib import Path


data = json.loads(Path("tmp/rategain_cdp_results.json").read_text(encoding="utf-8"))
for item in data:
    print("=" * 80)
    print(item["label"])
    page = item.get("page") or {}
    print("url:", page.get("url"))
    print("title:", page.get("title"))
    print("activeGroups:", page.get("activeGroups"))
    print("requestCount:", item.get("requestCount"))
    print("vendors:", item.get("requestSummary", {}).get("byVendor", {}))
    print("adAnalyticsCookies:", item.get("adAnalyticsCookies", []))
    print("gcs evidence:")
    for row in item.get("gcs", [])[:20]:
        print(" ", row)
    print("cookie names:", [f"{c['name']}@{c['domain']}" for c in item.get("cookies", [])[:50]])
    txt = (page.get("bodyText") or "").replace("\n", " ")
    for needle in ["by using our website", "Last Updated", "privacy@ratgain.com", "privacy@rategain.com"]:
        idx = txt.lower().find(needle.lower())
        if idx >= 0:
            print(f"text[{needle!r}]:", txt[max(0, idx - 160):idx + 300])

from __future__ import annotations

import csv
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / "tmp"


def collect_onetrust():
    data = json.loads((TMP / "onetrust-en.json").read_text(encoding="utf-8-sig"))
    rows = []
    for group in data["DomainData"]["Groups"]:
        gid = group.get("CustomGroupId")
        gname = group.get("GroupName")
        for cookie in group.get("FirstPartyCookies", []):
            rows.append({
                "category_id": gid,
                "category": gname,
                "name": cookie.get("Name", ""),
                "host": cookie.get("Host", ""),
                "length_days": int(cookie.get("Length") or 0),
                "source": "FirstPartyCookies",
            })
        for host in group.get("Hosts", []):
            for cookie in host.get("Cookies", []):
                rows.append({
                    "category_id": gid,
                    "category": gname,
                    "name": cookie.get("Name", ""),
                    "host": cookie.get("Host") or host.get("HostName") or host.get("Name", ""),
                    "length_days": int(cookie.get("Length") or 0),
                    "source": "Hosts",
                })
    return rows


def table_mentions():
    text = (TMP / "RateGain_Cookie_List_ForPolicy.txt").read_text(encoding="utf-8", errors="replace")
    # Normalize the PDF extraction mojibake just enough for matching.
    text_l = text.lower()
    groups = [
        ("Strictly Necessary", ["optanonconsent", "optanonalertboxclosed", "tag manager", "download session cookie"]),
        ("Performance & Analytics", ["_ga", "_ga_<id>", "_gid", "_clck", "_clsk", "clid", "muid", "_hjsession", "_hjid", "usability-test cookies"]),
        ("Functional", ["interactive-demo cookies", "investor-tools cookies"]),
        ("Targeting & Advertising", ["_gcl_au", "ide", "test_cookie", "nid", "_uetsid", "_uetvid", "muid", "bcookie", "lidc", "li_sugr", "usermatchhistory", "_fbp", "fr", "_lfa and related", "visitor_id", "pardot", "marketing-measurement cookies", "intent-data cookies", "attribution cookies", "visitor_info1_live", "ysc"]),
    ]
    mentions = {}
    for category, names in groups:
        for name in names:
            mentions[name] = category
    return text_l, mentions


def broad_table_match(name: str, text_l: str) -> bool:
    low = name.lower()
    patterns = [
        low,
        low.replace("#####", ""),
        low.replace("xxxxxxxxxx", "<id>"),
        low.replace("ua-xxxxxx-x", "ua-"),
    ]
    if low in {"_ga_xxxxxxxxxx"}:
        patterns.append("_ga_<id>")
    if low in {"visitor_id#####"}:
        patterns.append("visitor_id")
    if low in {"ajs%3acookies", "ajs%3atest", "ajs_anonymous_id", "__tld__", "ajs_group_id", "ajs_user_id"}:
        return False
    if low in {"_omappvp"}:
        return False
    if low in {"driftt_aid", "drift_aid", "drift_campaign_refresh"}:
        return False
    if low in {"analyticsynchistory", "msptc", "srm_b", "anonchk", "sm", "mr", "testcookiesenabled", "visitor_privacy_metadata", "lpv413792", "_cfuvid", "__cf_bm"}:
        return False
    return any(p and p in text_l for p in patterns)


def gtm_vendor_checks():
    text = (TMP / "gtm-W4XCFM.js").read_text(encoding="utf-8", errors="ignore")
    present = {
        "GA4 G-SW8NG6C5KZ": "G-SW8NG6C5KZ",
        "GA4 G-D716FNMRD2": "G-D716FNMRD2",
        "Google Ads 11187685771": "11187685771",
        "Universal Analytics UA-71336764-1": "UA-71336764-1",
        "Meta Pixel 1134576979914513": "1134576979914513",
        "Microsoft Clarity b625p75iga": "b625p75iga",
        "Bing UET 283008484": "283008484",
        "LinkedIn 2330802": "2330802",
        "LinkedIn 6290129": "6290129",
        "Hotjar 1935520": "1935520",
        "Maze 84f54b0b-da25-40c7-9510-508f368cc4ff": "84f54b0b-da25-40c7-9510-508f368cc4ff",
        "Factors nlium3434ss8usbjq14t6jflqz4jx3bt": "nlium3434ss8usbjq14t6jflqz4jx3bt",
        "Bombora EID 85250": "85250",
        "Bombora cid RATEGAIN": "RATEGAIN",
        "Leadfeeder DzLR5a5bg9n8BoQ2": "DzLR5a5bg9n8BoQ2",
        "Pardot AId 414792": "414792",
        "Pardot Profile 690": "690",
        "Storylane": "storylane",
        "Dreamdata": "dreamdata",
    }
    absent = ["drift", "segment", "zoominfo", "optinmonster", "mixpanel", "tiktok", "twitter", "reddit", "quora", "6sense", "demandbase"]
    print("GTM configured-tag markers")
    for label, needle in present.items():
        count = len(re.findall(re.escape(needle), text, flags=re.I))
        print(f"{label}: {count}")
    print("\nGTM absent markers")
    for needle in absent:
        count = len(re.findall(re.escape(needle), text, flags=re.I))
        print(f"{needle}: {count}")
    print("floodlight literal:", len(re.findall("floodlight", text, flags=re.I)), "(appears in GTM built-in library; inspect tag configs separately)")
    print("AW-11187685771 literal:", len(re.findall("AW-11187685771", text, flags=re.I)), "bare 11187685771:", len(re.findall("11187685771", text, flags=re.I)))


def main():
    rows = collect_onetrust()
    with (TMP / "onetrust_cookies.csv").open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["category_id", "category", "name", "host", "length_days", "source"])
        writer.writeheader()
        writer.writerows(rows)
    text_l, mentions = table_mentions()
    print("OneTrust categories")
    for gid in ["C0001", "C0002", "C0003", "C0004", "C0005"]:
        gr = [r for r in rows if r["category_id"] == gid]
        name = gr[0]["category"] if gr else next((g.get("GroupName") for g in json.loads((TMP / "onetrust-en.json").read_text(encoding="utf-8-sig"))["DomainData"]["Groups"] if g.get("CustomGroupId") == gid), "")
        print(f"{gid} {name}: {len(gr)} cookies")
    print("\nOneTrust cookie rows")
    for r in rows:
        print(f"{r['category_id']} | {r['category']} | {r['name']} | {r['host']} | {r['length_days']}")
    print("\nOneTrust rows not explicitly named in publish table")
    for r in rows:
        if not broad_table_match(r["name"], text_l):
            print(f"{r['category_id']} | {r['name']} | {r['host']} | {r['length_days']}")
    print("\nCategory mismatches apparent from publish table grouping")
    mismatches = [
        ("_uetvid", "OneTrust C0002 Performance", "publish table Targeting & Advertising under Microsoft Advertising"),
        ("CLID/MUID/SM/MR/ANONCHK", "OneTrust C0003 Functional host cookies for Clarity", "publish table Performance & Analytics under Microsoft Clarity"),
        ("__wpdm_client", "OneTrust C0003 Functional", "publish table Strictly Necessary as Download session cookie"),
    ]
    for row in mismatches:
        print(" | ".join(row))
    print()
    gtm_vendor_checks()


if __name__ == "__main__":
    main()

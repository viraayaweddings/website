from __future__ import annotations

import csv
import html
import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / "tmp"
OUT = ROOT / "output" / "pdf"
OUT.mkdir(parents=True, exist_ok=True)

STAMP_DATE = "August 16, 2026"


VENDOR_BY_HOST = [
    ("cookielaw.org", "OneTrust"),
    ("rategain.com", "RateGain / site scripts"),
    ("google-analytics.com", "Google Analytics"),
    ("google.com", "Google / Google Ads or YouTube"),
    ("doubleclick.net", "Google Ads / DoubleClick"),
    ("youtube.com", "YouTube"),
    ("facebook.com", "Meta"),
    ("bing.com", "Microsoft Advertising / Bing"),
    ("clarity.ms", "Microsoft Clarity"),
    ("hotjar", "Hotjar"),
    ("linkedin.com", "LinkedIn"),
    ("pardot.com", "Salesforce Pardot"),
    ("ww2.rategain.com", "Salesforce Pardot / RateGain marketing forms"),
    ("ml314.com", "Bombora / ml314"),
    ("zoominfo.com", "ZoomInfo / Cloudflare"),
]

VENDOR_BY_NAME = [
    ("Optanon", "OneTrust"),
    ("_dc_gtm", "Google Tag Manager"),
    ("_ga", "Google Analytics"),
    ("_gid", "Google Analytics"),
    ("_gat", "Google Analytics"),
    ("_gcl", "Google Ads"),
    ("IDE", "Google Ads / DoubleClick"),
    ("test_cookie", "Google Ads / DoubleClick"),
    ("NID", "Google"),
    ("_cl", "Microsoft Clarity"),
    ("CLID", "Microsoft Clarity"),
    ("SM", "Microsoft Clarity"),
    ("ANONCHK", "Microsoft Clarity"),
    ("_uet", "Microsoft Advertising"),
    ("_fbp", "Meta"),
    ("fr", "Meta"),
    ("_lfa", "Leadfeeder / Dealfront"),
    ("visitor_id", "Salesforce Pardot"),
    ("pardot", "Salesforce Pardot"),
    ("lpv", "Salesforce Pardot"),
    ("drift", "Drift"),
    ("driftt", "Drift"),
    ("ajs", "Segment-style analytics"),
    ("__tld__", "Segment-style analytics"),
    ("__wpdm_client", "WordPress Download Manager"),
    ("UserMatchHistory", "LinkedIn"),
    ("AnalyticsSyncHistory", "LinkedIn"),
    ("bcookie", "LinkedIn"),
    ("bscookie", "LinkedIn"),
    ("lidc", "LinkedIn"),
    ("li_sugr", "LinkedIn"),
    ("YSC", "YouTube"),
    ("VISITOR_INFO1_LIVE", "YouTube"),
    ("VISITOR_PRIVACY_METADATA", "YouTube"),
    ("TESTCOOKIESENABLED", "YouTube"),
    ("__cf_bm", "Cloudflare"),
    ("_cfuvid", "Cloudflare"),
    ("_hj", "Hotjar"),
    ("pi", "Bombora / ml314"),
]


PURPOSE_BY_TOKEN = [
    ("Optanon", "Stores the visitor's cookie-consent choices."),
    ("_dc_gtm", "Used by Google Tag Manager/Analytics to help control tag loading."),
    ("_ga", "Google Analytics visitor/session measurement."),
    ("_gid", "Google Analytics visitor/session measurement."),
    ("_gat", "Google Analytics request throttling/legacy analytics support."),
    ("_cl", "Microsoft Clarity analytics and session recording support."),
    ("CLID", "Microsoft Clarity visitor identification."),
    ("MUID", "Microsoft/Bing visitor identification and advertising/analytics support."),
    ("_uet", "Microsoft Advertising/Bing event tracking."),
    ("_omappvp", "OptinMonster-style visitor persistence as declared in OneTrust."),
    ("__wpdm_client", "WordPress Download Manager download/session support."),
    ("ajs", "Segment-style analytics identifier/local domain support as declared in OneTrust."),
    ("__tld__", "Segment-style top-level-domain detection as declared in OneTrust."),
    ("_fbp", "Meta advertising measurement."),
    ("fr", "Meta advertising delivery and measurement."),
    ("_gcl", "Google Ads conversion/linker measurement."),
    ("IDE", "Google Ads / DoubleClick advertising measurement."),
    ("test_cookie", "DoubleClick cookie-support test."),
    ("NID", "Google advertising/preferences cookie."),
    ("_lfa", "Leadfeeder / Dealfront B2B visitor-organization identification."),
    ("visitor_id", "Salesforce Pardot visitor identification."),
    ("pardot", "Salesforce Pardot session/form tracking."),
    ("lpv", "Salesforce Pardot landing-page/form activity tracking."),
    ("drift", "Drift chat/marketing identifier as declared in OneTrust."),
    ("UserMatchHistory", "LinkedIn Ads matching and measurement."),
    ("AnalyticsSyncHistory", "LinkedIn ads/analytics synchronization."),
    ("bcookie", "LinkedIn browser identifier."),
    ("bscookie", "LinkedIn secure browser identifier."),
    ("lidc", "LinkedIn routing/session support."),
    ("li_sugr", "LinkedIn advertising matching."),
    ("YSC", "YouTube embedded-video session cookie."),
    ("VISITOR_INFO1_LIVE", "YouTube embedded-video preferences/measurement."),
    ("VISITOR_PRIVACY_METADATA", "YouTube privacy/consent metadata."),
    ("TESTCOOKIESENABLED", "YouTube cookie-support test."),
    ("__cf_bm", "Cloudflare bot-management cookie on third-party resources."),
    ("_cfuvid", "Cloudflare visitor/session identifier on third-party resources."),
    ("_hj", "Hotjar session/visitor analytics."),
    ("pi", "Bombora / ml314 third-party tracking identifier observed after consent."),
    ("_fuid", "Marketing/analytics identifier observed after consent; not declared in OneTrust."),
]


def load_onetrust_rows():
    data = json.loads((TMP / "onetrust-en.json").read_text(encoding="utf-8-sig"))
    rows = []
    for group in data["DomainData"]["Groups"]:
        gid = group["CustomGroupId"]
        category = group["GroupName"]
        for cookie in group.get("FirstPartyCookies", []):
            rows.append(make_row(gid, category, cookie["Name"], cookie["Host"], int(cookie.get("Length") or 0), "OneTrust declared"))
        for host in group.get("Hosts", []):
            for cookie in host.get("Cookies", []):
                rows.append(make_row(gid, category, cookie["Name"], cookie.get("Host") or host.get("HostName") or "", int(cookie.get("Length") or 0), "OneTrust declared"))
    return rows


def vendor_for(name: str, host: str) -> str:
    for needle, vendor in VENDOR_BY_NAME:
        if name.lower().startswith(needle.lower()):
            return vendor
    token = f"{host} {name}".lower()
    for needle, vendor in VENDOR_BY_HOST:
        if needle.lower() in token:
            return vendor
    if name.startswith("_hj"):
        return "Hotjar"
    if name.startswith("_ga"):
        return "Google Analytics"
    return "Unknown / observed cookie"


def purpose_for(name: str) -> str:
    exact = {
        "_lfa_test_cookie_stored": "Leadfeeder / Dealfront test cookie for whether the _lfa cookie can be stored.",
        "drift_campaign_refresh": "Drift session/campaign-refresh cookie as declared in OneTrust.",
    }
    if name in exact:
        return exact[name]
    for token, purpose in PURPOSE_BY_TOKEN:
        if name.lower().startswith(token.lower()) or token.lower() in name.lower():
            return purpose
    return "Observed after consent; purpose not declared in OneTrust."


def duration_text(days: int) -> str:
    if days is None:
        return "Not declared"
    if days == 0:
        return "Session"
    if days == 1:
        return "1 day"
    if days % 365 == 0:
        years = days // 365
        return f"{years} year" + ("" if years == 1 else "s")
    return f"{days} days"


def make_row(category_id, category, name, host, days, evidence, observed_expiry=None):
    return {
        "Category ID": category_id,
        "Category": category,
        "Cookie": name,
        "Host": host,
        "Set by": vendor_for(name, host),
        "Duration": duration_text(days),
        "Days": str(days) if days is not None else "",
        "Purpose / notes": purpose_for(name),
        "Evidence": evidence,
        "Observed expiry": observed_expiry or "",
    }


def normalize(name: str, host: str) -> tuple[str, str]:
    return name.lower(), host.lower().lstrip(".")


def placeholder_match(observed_name: str, declared_name: str) -> bool:
    observed = observed_name.lower()
    declared = declared_name.lower()
    if declared == "_ga_xxxxxxxxxx" and observed.startswith("_ga_"):
        return True
    if declared == "visitor_id#####" and observed.startswith("visitor_id"):
        return True
    if declared == "_gat_ua-xxxxxx-x" and observed.startswith("_gat_ua-"):
        return True
    return False


def host_match(observed_host: str, declared_host: str) -> bool:
    observed = observed_host.lower().lstrip(".")
    declared = declared_host.lower().lstrip(".")
    return observed == declared or observed.endswith("." + declared) or declared.endswith("." + observed)


def load_observed_extra_rows(existing):
    data = json.loads((TMP / "rategain_cdp_results.json").read_text(encoding="utf-8"))
    accept = next(item for item in data if item["label"] == "accept_all")
    existing_pairs = {(r["Cookie"].lower(), r["Host"].lower().lstrip(".")) for r in existing}
    extras = []
    for cookie in accept["cookies"]:
        name = cookie["name"]
        host = cookie["domain"]
        exact = normalize(name, host) in existing_pairs
        covered_by_placeholder = any(
            placeholder_match(name, r["Cookie"]) and host_match(host, r["Host"])
            for r in existing
        )
        if exact or covered_by_placeholder:
            continue
        expires = cookie.get("expires", -1)
        if expires and expires > 0:
            expiry = datetime.fromtimestamp(expires, tz=timezone.utc).strftime("%Y-%m-%d")
            duration = f"Observed persistent, expires {expiry}"
        else:
            duration = "Observed session"
        row = make_row(
            "Observed",
            "Observed after Accept All - not in OneTrust declaration",
            name,
            host,
            None,
            "Live browser observed after Accept All",
            duration,
        )
        row["Duration"] = duration
        row["Days"] = ""
        extras.append(row)
    return extras


def write_csv(rows):
    path = OUT / "RateGain_Complete_Cookie_Register_2026-08-16.csv"
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    return path


def write_markdown(rows):
    path = OUT / "RateGain_Complete_Cookie_Register_2026-08-16.md"
    lines = [
        "# Cookies We Use - Complete Register",
        "",
        f"Independently rebuilt on {STAMP_DATE} from the OneTrust consent configuration, GTM-W4XCFM container, and live Chromium accepted-consent cookie store from India.",
        "",
        "This register intentionally lists exact cookie names and hosts. Rows marked \"Observed after Accept All - not in OneTrust declaration\" should be reviewed in OneTrust before publication.",
        "",
        "| Category | Cookie | Host | Set by | Duration | Evidence | Purpose / notes |",
        "|---|---|---|---|---|---|---|",
    ]
    for r in rows:
        vals = [r["Category"], r["Cookie"], r["Host"], r["Set by"], r["Duration"], r["Evidence"], r["Purpose / notes"]]
        lines.append("| " + " | ".join(v.replace("|", "\\|") for v in vals) + " |")
    lines += [
        "",
        "## Residual items not closed",
        "",
        "- Exact cookie expiry, Secure, SameSite, and Path attributes should be confirmed with a production cookie-store read or OneTrust Cookie Scan immediately before publication.",
        "- Regional behaviour remains untested outside the India browser run used here.",
        "- Whether consent withdrawal deletes already-set cookies remains unconfirmed.",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def write_html(rows):
    path = OUT / "RateGain_Complete_Cookie_Register_2026-08-16.html"
    css = """
      body { font-family: Arial, Helvetica, sans-serif; color: #172033; margin: 32px; }
      h1 { font-size: 28px; margin: 0 0 6px; }
      h2 { font-size: 18px; margin: 26px 0 8px; border-bottom: 1px solid #ccd3df; padding-bottom: 5px; }
      .stamp, .note { font-size: 12px; color: #465365; line-height: 1.45; }
      .warn { background: #fff7e6; border: 1px solid #f3c46b; padding: 10px 12px; margin: 16px 0; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; }
      th, td { border: 1px solid #d8dee8; padding: 5px 6px; vertical-align: top; word-wrap: break-word; }
      th { background: #eef2f7; text-align: left; }
      tr:nth-child(even) td { background: #fafbfc; }
      .cat { width: 13%; }
      .cookie { width: 13%; font-family: Consolas, monospace; }
      .host { width: 13%; font-family: Consolas, monospace; }
      .vendor { width: 12%; }
      .duration { width: 10%; }
      .evidence { width: 12%; }
      .purpose { width: 27%; }
      @media print {
        @page { size: A4 landscape; margin: 10mm; }
        body { margin: 16mm 10mm; }
        h2 { break-after: avoid; }
        tr { break-inside: avoid; }
      }
    """
    groups = []
    seen = []
    for r in rows:
        key = r["Category"]
        if key not in seen:
            seen.append(key)
            groups.append((key, [x for x in rows if x["Category"] == key]))
    body = [
        "<!doctype html><html><head><meta charset='utf-8'>",
        "<title>RateGain Complete Cookie Register</title>",
        f"<style>{css}</style></head><body>",
        "<h1>Cookies We Use - Complete Register</h1>",
        f"<p class='stamp'>Independently rebuilt on {STAMP_DATE} from the OneTrust consent configuration, GTM-W4XCFM container, and live Chromium accepted-consent cookie store from India.</p>",
        "<div class='warn'><strong>Publication note:</strong> This is the complete register for legal review. Rows marked as live-observed but not declared in OneTrust should be added to OneTrust or otherwise dispositioned before the privacy/cookie policy is finalized.</div>",
    ]
    for category, cat_rows in groups:
        body.append(f"<h2>{html.escape(category)} ({len(cat_rows)} rows)</h2>")
        body.append("<table><thead><tr><th class='cat'>Category</th><th class='cookie'>Cookie</th><th class='host'>Host</th><th class='vendor'>Set by</th><th class='duration'>Duration</th><th class='evidence'>Evidence</th><th class='purpose'>Purpose / notes</th></tr></thead><tbody>")
        for r in cat_rows:
            body.append("<tr>" + "".join(
                f"<td class='{cls}'>{html.escape(r[col])}</td>"
                for cls, col in [
                    ("cat", "Category ID"),
                    ("cookie", "Cookie"),
                    ("host", "Host"),
                    ("vendor", "Set by"),
                    ("duration", "Duration"),
                    ("evidence", "Evidence"),
                    ("purpose", "Purpose / notes"),
                ]
            ) + "</tr>")
        body.append("</tbody></table>")
    body += [
        "<h2>Residual items not closed</h2>",
        "<ul class='note'>",
        "<li>Exact cookie expiry, Secure, SameSite, and Path attributes should be confirmed with a production cookie-store read or OneTrust Cookie Scan immediately before publication.</li>",
        "<li>Regional behaviour remains untested outside the India browser run used here.</li>",
        "<li>Whether consent withdrawal deletes already-set cookies remains unconfirmed.</li>",
        "</ul>",
        "</body></html>",
    ]
    path.write_text("\n".join(body), encoding="utf-8")
    return path


def main():
    rows = load_onetrust_rows()
    rows.extend(load_observed_extra_rows(rows))
    order = {
        "Strictly Necessary Cookies": 1,
        "Performance Cookies": 2,
        "Functional Cookies": 3,
        "Targeting Cookies": 4,
        "Social Media Cookies": 5,
        "Observed after Accept All - not in OneTrust declaration": 6,
    }
    rows.sort(key=lambda r: (order.get(r["Category"], 99), r["Host"].lower(), r["Cookie"].lower()))
    csv_path = write_csv(rows)
    md_path = write_markdown(rows)
    html_path = write_html(rows)
    print(json.dumps({
        "rows": len(rows),
        "onetrust_rows": sum(1 for r in rows if r["Evidence"] == "OneTrust declared"),
        "observed_extra_rows": sum(1 for r in rows if r["Evidence"] != "OneTrust declared"),
        "csv": str(csv_path),
        "markdown": str(md_path),
        "html": str(html_path),
    }, indent=2))


if __name__ == "__main__":
    main()

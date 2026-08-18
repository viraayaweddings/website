from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


OUT = Path(r"C:\Users\RohitKumar\Downloads\BodyBae_Shopify_Redesign_Proposal_HD.pdf")
W, H = A4

INK = HexColor("#202124")
MUTED = HexColor("#6F6A66")
PINK = HexColor("#D94F7D")
ROSE = HexColor("#F8D9E4")
ROSE2 = HexColor("#FFF1F5")
CREAM = HexColor("#FFF8F4")
LINE = HexColor("#E8D8D2")
WHITE = colors.white

pdfmetrics.registerFont(TTFont("SegoeUI", r"C:\Windows\Fonts\segoeui.ttf"))
pdfmetrics.registerFont(TTFont("SegoeUI-Bold", r"C:\Windows\Fonts\segoeuib.ttf"))
pdfmetrics.registerFont(TTFont("SegoeUI-Italic", r"C:\Windows\Fonts\segoeuii.ttf"))

styles = getSampleStyleSheet()
styles.add(ParagraphStyle("Kicker", fontName="SegoeUI-Bold", fontSize=9, leading=12, textColor=PINK, spaceAfter=7))
styles.add(ParagraphStyle("Tiny", fontName="SegoeUI-Bold", fontSize=7.8, leading=10, textColor=PINK, spaceAfter=4))
styles.add(ParagraphStyle("TitleBig", fontName="SegoeUI-Bold", fontSize=34, leading=38, textColor=INK, spaceAfter=12))
styles.add(ParagraphStyle("TitleMed", fontName="SegoeUI-Bold", fontSize=24, leading=29, textColor=INK, spaceAfter=10))
styles.add(ParagraphStyle("H1", fontName="SegoeUI-Bold", fontSize=25, leading=30, textColor=INK, spaceAfter=10))
styles.add(ParagraphStyle("H2", fontName="SegoeUI-Bold", fontSize=14.2, leading=18, textColor=INK, spaceBefore=6, spaceAfter=5))
styles.add(ParagraphStyle("Body", fontName="SegoeUI", fontSize=10.2, leading=15.2, textColor=INK, spaceAfter=8))
styles.add(ParagraphStyle("Small", fontName="SegoeUI", fontSize=9.1, leading=13.2, textColor=INK, spaceAfter=5))
styles.add(ParagraphStyle("Muted", fontName="SegoeUI", fontSize=9, leading=13, textColor=MUTED, spaceAfter=5))
styles.add(ParagraphStyle("Quote", fontName="SegoeUI-Italic", fontSize=12.5, leading=17, textColor=INK, leftIndent=8, rightIndent=8, spaceBefore=4, spaceAfter=11))
styles.add(ParagraphStyle("Metric", fontName="SegoeUI-Bold", fontSize=18.5, leading=23, textColor=INK, alignment=TA_CENTER))
styles.add(ParagraphStyle("MetricLabel", fontName="SegoeUI-Bold", fontSize=7.5, leading=9.5, textColor=MUTED, alignment=TA_CENTER))
styles.add(ParagraphStyle("Link", fontName="SegoeUI-Bold", fontSize=9.5, leading=12, textColor=PINK))


def clean(text):
    return (
        text.replace("—", "-")
        .replace("–", "-")
        .replace("“", '"')
        .replace("”", '"')
        .replace("’", "'")
        .replace("‘", "'")
        .replace("×", "x")
        .replace("↗", "")
        .replace("✓", "")
    )


def P(text, style="Body"):
    return Paragraph(clean(text), styles[style])


class CoverBlock(Flowable):
    def __init__(self):
        super().__init__()
        self.height = 525

    def draw(self):
        c = self.canv
        y = 500
        c.setFillColor(INK)
        c.setFont("SegoeUI-Bold", 26)
        c.drawString(0, y, "BB")
        y -= 30
        c.setFillColor(PINK)
        c.setFont("SegoeUI-Bold", 9)
        c.drawString(0, y, "SHOPIFY WEBSITE REDESIGN - PROPOSAL")
        y -= 55
        c.setFillColor(INK)
        c.setFont("SegoeUI-Bold", 35)
        c.drawString(0, y, "A Premium Storefront")
        y -= 39
        c.drawString(0, y, "for BodyBae")
        y -= 32
        c.setFont("SegoeUI", 11.5)
        for line in [
            "A skincare-style redesign of your Shopify store that makes your",
            "products look as good as they are - and makes buying easy,",
            "whether someone's on their phone or their laptop.",
        ]:
            c.drawString(0, y, line)
            y -= 17
        y -= 24
        card_w = 145
        gap = 11
        for i, (val, label) in enumerate([("₹20,000", "Investment"), ("10 Working Days", "Timeline"), ("1-Year Free AMC", "Included")]):
            x = i * (card_w + gap)
            c.setFillColor(WHITE)
            c.setStrokeColor(LINE)
            c.roundRect(x, y - 50, card_w, 54, 8, stroke=1, fill=1)
            c.setFillColor(INK)
            c.setFont("SegoeUI-Bold", 16.5)
            c.drawCentredString(x + card_w / 2, y - 19, val)
            c.setFillColor(MUTED)
            c.setFont("SegoeUI-Bold", 7.5)
            c.drawCentredString(x + card_w / 2, y - 38, label.upper())
        y -= 95
        c.setStrokeColor(LINE)
        c.line(0, y, 460, y)
        y -= 34
        c.setFillColor(MUTED)
        c.setFont("SegoeUI-Bold", 7.5)
        c.drawString(0, y, "PREPARED FOR")
        c.drawString(260, y, "PREPARED BY")
        y -= 18
        c.setFillColor(INK)
        c.setFont("SegoeUI-Bold", 12.5)
        c.drawString(0, y, "BodyBae")
        c.drawString(260, y, "Rohit Raj")
        y -= 26
        c.setFillColor(MUTED)
        c.setFont("SegoeUI", 9)
        c.drawString(0, y, "17 August 2026")


class SignatureLine(Flowable):
    def __init__(self, label, width=210):
        super().__init__()
        self.label = label
        self.width = width
        self.height = 36

    def draw(self):
        self.canv.setStrokeColor(LINE)
        self.canv.line(0, 21, self.width, 21)
        self.canv.setFillColor(MUTED)
        self.canv.setFont("SegoeUI-Bold", 7.2)
        self.canv.drawString(0, 5, self.label.upper())


def on_page(c, _doc):
    c.saveState()
    c.setFillColor(CREAM)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    if c.getPageNumber() == 1:
        c.setFillColor(ROSE2)
        c.circle(W - 70, H - 70, 135, stroke=0, fill=1)
        c.setFillColor(HexColor("#FFE5EE"))
        c.circle(60, 90, 85, stroke=0, fill=1)
        c.setStrokeColor(PINK)
        c.setLineWidth(1.2)
        c.roundRect(20 * mm, 22 * mm, W - 40 * mm, H - 44 * mm, 16, stroke=1, fill=0)
        c.setFillColor(PINK)
        c.setFont("SegoeUI-Bold", 7.8)
        c.drawRightString(W - 28 * mm, H - 36 * mm, "BODYBAE - SKINCARE & BEAUTY")
    else:
        c.setStrokeColor(LINE)
        c.setLineWidth(0.7)
        c.line(20 * mm, 18 * mm, W - 20 * mm, 18 * mm)
        c.setFont("SegoeUI", 7.8)
        c.setFillColor(MUTED)
        c.drawString(20 * mm, 11 * mm, "BODYBAE x ROHIT RAJ SHOPIFY REDESIGN PROPOSAL")
        c.drawRightString(W - 20 * mm, 11 * mm, f"{c.getPageNumber():02d}")
    c.restoreState()


LEFT = 22 * mm
RIGHT = 22 * mm
doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=LEFT, rightMargin=RIGHT, topMargin=23 * mm, bottomMargin=24 * mm)
content_width = W - LEFT - RIGHT
story = [CoverBlock(), PageBreak()]

story += [
    P("01 - THE IDEA", "Kicker"),
    P("Making the store as good as what's inside the jar", "H1"),
    P('"You have got the products. Right now the store just is not showing them off the way it should."', "Quote"),
    P("Skincare shoppers decide fast, and most of that happens on a phone before they have read a word. So the plan is simple: make BodyBae look premium, make the products easy to understand at a glance, and clear out the little bits of friction between landing on a page and hitting buy."),
    P("I will rebuild the store on a free Shopify OS 2.0 theme and customise it from scratch, taking design cues from the Taiga Hehku theme you liked - but without touching any of its paid code or files. Everything you see will be built fresh for BodyBae."),
    Spacer(1, 6),
]
metrics = Table(
    [[P("8", "Metric"), P("10", "Metric"), P("100%", "Metric"), P("1 Yr", "Metric")], [P("Redesign areas", "MetricLabel"), P("Working days", "MetricLabel"), P("Original build", "MetricLabel"), P("Free maintenance", "MetricLabel")]],
    colWidths=[content_width / 4] * 4,
    rowHeights=[28, 18],
)
metrics.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), ROSE2), ("BOX", (0, 0), (-1, -1), 0.7, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
story += [metrics, Spacer(1, 12), P("WHAT I AM KEEPING FRONT OF MIND", "Kicker")]
points = [
    "A clean, premium skincare look that feels trustworthy.",
    "A short, obvious path from the homepage to checkout.",
    "Layouts and photos that make each product feel worth the price.",
    "One consistent style running across every page.",
    "Built mobile-first, since that is where most of your customers are.",
    "Reviews, ingredients and benefits placed where they build trust.",
]
story.append(Table([[P("- " + points[i], "Small"), P("- " + points[i + 1], "Small")] for i in range(0, 6, 2)], colWidths=[(content_width - 12) / 2] * 2, style=TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("BOTTOMPADDING", (0, 0), (-1, -1), 9)])))
story.append(PageBreak())

story += [P("02 - PROOF", "Kicker"), P("Similar ecommerce stores I have designed", "H1"), P("A few live stores in the same world - beauty, cosmetics, food and premium DTC brands - so you can get a feel for the style and quality before we start.")]
projects = [
    ("PET FRAGRANCE - AUSTRALIA", "Harlow & Harry", 'A luxury "fragrance house for dogs" - perfumes, shampoos and grooming, with bold premium branding.', "harlowharry.com.au"),
    ("HEALTHY FOOD - SPAIN", "nut&me", "A bright, playful store for nuts, nut butters, flours and healthy snacks.", "nutandme.com"),
    ("COSMETICS - USA", "Forta", "Long-wear, sweat-proof makeup for an active lifestyle, with a moody editorial look.", "fortacosmetics.com"),
]
proof_rows = [[[P(cat, "Tiny"), P(name, "H2"), P(desc, "Small"), P(link, "Link")]] for cat, name, desc, link in projects]
proof = Table(proof_rows, colWidths=[content_width], rowHeights=[95, 95, 95])
proof.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.7, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE), ("LEFTPADDING", (0, 0), (-1, -1), 16), ("RIGHTPADDING", (0, 0), (-1, -1), 16), ("TOPPADDING", (0, 0), (-1, -1), 12), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
story += [proof, Spacer(1, 10), P("Tap any name to open the live store. Happy to walk you through the work on a quick call.", "Muted"), PageBreak()]


def item(num, title, bullets):
    rows = []
    for i in range(0, len(bullets), 2):
        rows.append([P(bullets[i], "Small"), P(bullets[i + 1], "Small") if i + 1 < len(bullets) else ""])
    tbl = Table(rows, colWidths=[(content_width - 12) / 2] * 2, style=TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
    return [P(f"{num} {title}", "H2"), tbl, Spacer(1, 5)]


story += [P("03 - WHAT YOU GET", "Kicker"), P("The redesign, part by part", "H1")]
for args in [
    ("1", "Theme Setup & Design Direction", ["Duplicate and back up your current theme first.", "Set up a free Shopify OS 2.0 theme as the base.", "Build a premium skincare-style layout for BodyBae.", "Lock in brand colours, fonts, spacing, buttons and cards."]),
    ("2", "Homepage Redesign", ["Announcement bar and a premium header.", "Hero / banner section.", "Featured products section.", "Product and category highlights.", "Skincare benefits / trust section.", "Ingredient / USP section.", "Review and testimonial section.", "Newsletter and footer redesign."]),
    ("3", "Product Page Redesign", ["A better product image gallery.", "Title, price, sale badge and quantity selector.", "Clean Add to Cart / Buy Now buttons.", "Product benefits section.", "Ingredients, how-to-use and FAQ accordion.", "Trust badges plus delivery and payment info.", "Related products section.", "A checkout flow that works on mobile."]),
    ("4", "Collection / Shop Page Redesign", ["Tidier product grid.", "Sale badges.", "Better-looking product cards.", "Filter and sort styling using Shopify options.", "A shop page that behaves on mobile."]),
]:
    story += item(*args)
story.append(PageBreak())

story += [P("03 - WHAT YOU GET", "Kicker"), P("The redesign, part by part - continued", "H1")]
for args in [
    ("5", "Your Other Pages", ["About page cleaned up and styled.", "Contact page cleaned up and styled.", "Policy pages matched to the new look.", "Footer links, newsletter and social links sorted."]),
    ("6", "AI Product Image Design", ["You send me the white-background product photos.", "I clean them up with AI and design tools so they look retail-ready.", "Product creatives for banners, homepage and product sections.", "Promo visuals designed to fit the layout we agree on."]),
    ("7", "Mobile & Final Polish", ["Tuned for mobile, tablet and desktop.", "Basic speed-conscious setup.", "Every major page checked before we go live.", "A final pass to keep the design consistent."]),
    ("8", "Launch Support", ["Proper testing before launch.", "Help publishing the theme when you are ready.", "I fix any issues that pop up after launch on the delivered work.", "A calm, supported go-live."]),
]:
    story += item(*args)
story.append(PageBreak())

story += [P("04 - ON THE HOUSE", "Kicker"), P("A few extras, no extra cost", "H1"), P("These are not upsells. They are things I will set up alongside the redesign because they genuinely help a small skincare brand, and they are all included in the price.")]
extras = [
    ("Analytics & Pixel Setup", "Google Analytics 4 and a basic Meta Pixel, so you can actually see traffic and sales."),
    ("Basic On-Page SEO", "Page titles, meta descriptions and image alt text on your main pages."),
    ("WhatsApp Enquiry Button", "A floating chat button so customers can reach you in one tap."),
    ("Instagram & Socials", "Your Instagram feed and social links wired neatly into the site."),
    ("Favicon & Tab Branding", "Your logo showing up properly in the browser tab."),
    ("Forms That Work", "Contact form and newsletter signup connected and tested."),
    ("Product Upload Help", "I will help you get up to 10 products loaded in cleanly if you need it."),
    ("Two Revision Rounds", "Two full rounds of design changes are built into the project."),
    ("A Walkthrough Video", "A short screen recording so you can edit text and images yourself later."),
    ("Direct Support", "You can message me directly through the whole project - no ticket queue."),
]
extra_rows = []
for i in range(0, len(extras), 2):
    extra_rows.append([P(f"<b>{extras[i][0]}</b><br/>{extras[i][1]}", "Small"), P(f"<b>{extras[i+1][0]}</b><br/>{extras[i+1][1]}", "Small")])
extra_tbl = Table(extra_rows, colWidths=[(content_width - 10) / 2] * 2)
extra_tbl.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.7, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE), ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12), ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
story += [extra_tbl, PageBreak()]

story += [P("05 - AFTER LAUNCH", "Kicker"), P("A full year of upkeep, included", "H1"), P("Once the site's live, I am not disappearing. You get one year of basic maintenance, free, so small changes do not cost you anything and the store keeps ticking along nicely.")]
covered = ["Small text and image changes.", "Product content updates.", "Banner swaps.", "Basic theme and app update checks.", "Fixing small bugs on the work I delivered.", "Occasional health checks on the site.", "Keeping your design and content in good shape."]
not_covered = ["A brand-new redesign.", "Paid theme, app or licence charges.", "Payment gateway changes.", "Third-party app subscriptions.", "Ad management and big marketing campaigns.", "Major new features beyond what we built."]
rows = [[P("What is covered<br/><font color=\"#D94F7D\"><b>FREE - 1 YEAR</b></font>", "H2"), P("What is not covered<br/><font color=\"#D94F7D\"><b>HAPPY TO QUOTE SEPARATELY</b></font>", "H2")]]
for i in range(max(len(covered), len(not_covered))):
    rows.append([P(("- " + covered[i]) if i < len(covered) else "", "Small"), P(("- " + not_covered[i]) if i < len(not_covered) else "", "Small")])
after_tbl = Table(rows, colWidths=[(content_width - 10) / 2] * 2)
after_tbl.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), ROSE2), ("BOX", (0, 0), (-1, -1), 0.7, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE), ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 7), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
story += [after_tbl, Spacer(1, 12), P("A quick word on the theme licence", "H2"), P("I am not including the paid Taiga theme, and I will not copy its code or files. The look is inspired by it, but everything is built original for you on a free Shopify base. That keeps you clear on licensing and keeps the build clean and fully yours."), PageBreak()]

story += [P("06 - THE PLAN", "Kicker"), P("How the ten days go", "H1"), P("It is a tight schedule but a realistic one. Each day has a clear focus, so you always know exactly what I am working on.")]
plan = [("Day 1", "FOUNDATION", "Back up your theme, set things up, and lock the design direction."), ("Day 2-3", "HOMEPAGE", "The full homepage - hero, featured products, benefits, USP and footer."), ("Day 4-5", "PRODUCT PAGE", "The product page - gallery, buy flow, benefits, accordions and trust badges."), ("Day 6", "COLLECTIONS", "The shop page - cleaner cards, sale badges and filters."), ("Day 7", "CONTENT PAGES", "About, contact, footer and policy pages styled to match."), ("Day 8", "VISUALS", "AI product images and the promo creatives for the site."), ("Day 9", "POLISH", "Mobile fixes and testing across devices."), ("Day 10", "LAUNCH", "Final tweaks and launch support.")]
plan_tbl = Table([[P(f"<b>{d}</b><br/><font color=\"#D94F7D\"><b>{phase}</b></font>", "Small"), P(desc, "Small")] for d, phase, desc in plan], colWidths=[88, content_width - 88])
plan_tbl.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.7, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE), ("BACKGROUND", (0, 0), (0, -1), ROSE2), ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12), ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
story += [plan_tbl, PageBreak()]

story += [P("07 - INVESTMENT", "Kicker"), P("One price, no surprises", "H1")]
cost = Table([[P("TOTAL PROJECT COST", "Tiny"), P("Everything in", "H2")], [P("₹20,000", "TitleBig"), P("All eight redesign areas, AI product visuals, the free extras and launch support - plus a year of free upkeep.", "Body")]], colWidths=[185, content_width - 185])
cost.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), ROSE2), ("BOX", (0, 0), (-1, -1), 0.7, LINE), ("SPAN", (0, 0), (0, 1)), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 16), ("RIGHTPADDING", (0, 0), (-1, -1), 16), ("TOPPADDING", (0, 0), (-1, -1), 12), ("BOTTOMPADDING", (0, 0), (-1, -1), 12)]))
pay = Table([[P("TO START", "Tiny"), P("BEFORE GO-LIVE", "Tiny")], [P("₹10,000", "TitleMed"), P("₹10,000", "TitleMed")], [P("Advance, so I can get going.", "Small"), P("Once you are happy, before I publish the theme.", "Small")]], colWidths=[(content_width - 12) / 2] * 2)
pay.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.7, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE), ("LEFTPADDING", (0, 0), (-1, -1), 16), ("RIGHTPADDING", (0, 0), (-1, -1), 16), ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10)]))
story += [cost, Spacer(1, 18), P("HOW PAYMENT WORKS", "Kicker"), pay, Spacer(1, 14), P("What your ₹20,000 covers", "H2"), P("All eight parts of the redesign, the AI product imagery, every free extra listed earlier, mobile polish, launch support, and a full year of maintenance. No design fees hiding anywhere."), P("The price does not include any paid theme, app or licence fees, third-party subscriptions, or payment-gateway and ad-spend costs - those stay with you. The work covers what is laid out in this proposal.", "Muted"), PageBreak()]

story += [Spacer(1, 38), P("LET'S GET GOING", "Kicker"), P("Let's make BodyBae look the part.", "H1"), P("If this works for you, a ₹10,000 advance is all it takes to start, and I will kick off with the backup and design direction on day one. Got any questions first? Just message me - happy to talk anything through."), Spacer(1, 28), P("Rohit Raj", "H2"), P("Email - rohit.raj8691@gmail.com<br/>Phone - +91 99901 48838", "Body"), Spacer(1, 28), P("SHOPIFY DESIGN & DEVELOPMENT", "Tiny"), Spacer(1, 80), Table([[SignatureLine("Client signature - BodyBae", 230), SignatureLine("Date", 160)]], colWidths=[260, 180])]

doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
print(OUT)

"""Build the three FULLBACK demo transfer agreements (source .md + deterministic .pdf).

Numbers follow PLAN.md R1-R4 exactly. Text is plain ASCII so that quotes extracted by
the Reader agent can be matched against the PDF text (R14).
"""
import hashlib
import sys
from pathlib import Path

from reportlab import rl_config

rl_config.invariant = 1  # deterministic output: same input -> same bytes -> same SHA-256

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle)

OUT = Path(sys.argv[1])

NOTICE = ("FICTIONAL DEMO DOCUMENT. Prepared for the FULLBACK project at NEAR HACKATHON "
          "\"Build Beyond Boundaries\". The clubs and the player are invented. This is not a real contract.")

HISTORY = [
    ("Akademi Desa", "12 to 15", "2013 to 2016"),
    ("Kota FC", "16 to 23", "2017 to 2024"),
    ("Nordvik IF", "24 onwards", "2025 to 2027"),
]


def deal1(security="EUR 2,500,000 (two million five hundred thousand euros)"):
    return {
        "file": "deal1-nordvik-portoalegre",
        "title": "PERMANENT TRANSFER AGREEMENT",
        "ref": "Agreement No. FB-DEMO-001",
        "date": "Signed on 1 April 2027",
        "clauses": [
            ("1", "Parties", [
                ("1.1", "Nordvik IF, a football club registered in Norway (the \"Seller\")."),
                ("1.2", "Porto Alegre FC, a football club registered in Brazil (the \"Buyer\")."),
                ("1.3", "The professional football player Lucas Andrade, born on 14 March 2001 (the \"Player\")."),
            ]),
            ("2", "Transfer", [
                ("2.1", "The Seller agrees to transfer the registration of the Player to the Buyer on a permanent basis, "
                        "subject to the terms of this Agreement."),
            ]),
            ("3", "Transfer fee", [
                ("3.1", "The Buyer shall pay the Seller a fixed transfer fee of EUR 10,000,000 (ten million euros)."),
                ("3.2", "The transfer fee shall be paid in four (4) equal installments of EUR 2,500,000 "
                        "(two million five hundred thousand euros) each, due on 30 April 2027, 31 July 2027, "
                        "31 October 2027 and 31 January 2028."),
                ("3.3", "The Buyer may pay any installment before its due date."),
            ]),
            ("4", "Security", [
                ("4.1", f"Before the registration of the Player, the Buyer shall deposit security of {security}, "
                        "equal to one installment."),
                ("4.2", "If an installment is not paid by its due date, the security shall be applied to that installment "
                        "and the Buyer shall restore the security to its full amount."),
                ("4.3", "If an installment is overdue and the remaining security is not sufficient to pay it, "
                        "the Buyer is in default."),
                ("4.4", "The security shall be returned to the Buyer after the final installment has been paid."),
            ]),
            ("5", "Sell-on", [
                ("5.1", "If the Buyer transfers the Player to another club, the Buyer shall pay the Seller fifteen percent (15%) "
                        "of the gross transfer fee received, without any deduction."),
            ]),
            ("6", "Training clubs", [
                ("6.1", "The parties acknowledge the registration history of the Player set out in Annex A."),
                ("6.2", "A solidarity contribution of up to five percent (5%) shall be distributed to the training clubs "
                        "in accordance with Annex 5 of the FIFA Regulations on the Status and Transfer of Players, and "
                        "shall be deducted from each payment of the transfer fee."),
            ]),
            ("7", "Payment and evidence", [
                ("7.1", "All payments under this Agreement shall be made in fEUR through the FULLBACK contract on the "
                        "NEAR testnet, where 1 fEUR represents EUR 1."),
                ("7.2", "The SHA-256 fingerprint of this Agreement is recorded in the FULLBACK contract when the deal is "
                        "created. Any copy whose fingerprint differs is not the signed Agreement."),
            ]),
            ("8", "Governing rules", [
                ("8.1", "This Agreement is governed by the FIFA Regulations on the Status and Transfer of Players. "
                        "Disputes shall be referred to the FIFA Football Tribunal."),
            ]),
        ],
        "annex_title": "Annex A - Registration history of the Player",
        "signatures": ("Nordvik IF", "Porto Alegre FC"),
    }


def deal2():
    return {
        "file": "deal2-portoalegre-clubz",
        "title": "PERMANENT TRANSFER AGREEMENT",
        "ref": "Agreement No. FB-DEMO-002",
        "date": "Signed on 15 February 2028",
        "clauses": [
            ("1", "Parties", [
                ("1.1", "Porto Alegre FC, a football club registered in Brazil (the \"Seller\")."),
                ("1.2", "Club Z, a football club (the \"Buyer\")."),
                ("1.3", "The professional football player Lucas Andrade, born on 14 March 2001 (the \"Player\")."),
            ]),
            ("2", "Transfer", [
                ("2.1", "The Seller agrees to transfer the registration of the Player to the Buyer on a permanent basis, "
                        "subject to the terms of this Agreement."),
            ]),
            ("3", "Transfer fee", [
                ("3.1", "The Buyer shall pay a fixed transfer fee of EUR 20,000,000 (twenty million euros)."),
                ("3.2", "The transfer fee shall be paid in a single payment on the date of signature of this Agreement."),
            ]),
            ("4", "Prior rights", [
                ("4.1", "The parties acknowledge that Nordvik IF holds a sell-on right of fifteen percent (15%) of the gross "
                        "transfer fee under Clause 5.1 of Agreement No. FB-DEMO-001."),
                ("4.2", "The sell-on amount and the solidarity contribution shall be paid out of the transfer fee to their "
                        "beneficiaries, and the remainder shall be paid to the Seller."),
            ]),
            ("5", "Training clubs", [
                ("5.1", "The parties acknowledge the registration history of the Player set out in Annex A."),
                ("5.2", "A solidarity contribution of up to five percent (5%) shall be distributed to the training clubs "
                        "in accordance with Annex 5 of the FIFA Regulations on the Status and Transfer of Players."),
            ]),
            ("6", "Payment and evidence", [
                ("6.1", "All payments under this Agreement shall be made in fEUR through the FULLBACK contract on the "
                        "NEAR testnet, where 1 fEUR represents EUR 1."),
                ("6.2", "The SHA-256 fingerprint of this Agreement is recorded in the FULLBACK contract when the resale is "
                        "recorded."),
            ]),
            ("7", "Governing rules", [
                ("7.1", "This Agreement is governed by the FIFA Regulations on the Status and Transfer of Players. "
                        "Disputes shall be referred to the FIFA Football Tribunal."),
            ]),
        ],
        "annex_title": "Annex A - Registration history of the Player",
        "signatures": ("Porto Alegre FC", "Club Z"),
    }


def to_markdown(d):
    lines = [f"# {d['title']}", "", f"**{d['ref']}** · {d['date']}", "", f"> {NOTICE}", ""]
    for num, head, subs in d["clauses"]:
        lines += [f"## {num}. {head}", ""]
        for sn, text in subs:
            lines += [f"{sn} {text}", ""]
    lines += [f"## {d['annex_title']}", "", "| Club | Player age | Calendar years |", "|---|---|---|"]
    lines += [f"| {c} | {a} | {y} |" for c, a, y in HISTORY]
    lines += ["", "## Signatures", ""]
    lines += [f"For {s}: ______________________ (authorised signatory)" for s in d["signatures"]]
    return "\n".join(lines) + "\n"


def to_pdf(d, path):
    navy = HexColor("#13235B")
    base = ParagraphStyle("b", fontName="Helvetica", fontSize=10.5, leading=15)
    small = ParagraphStyle("s", parent=base, fontSize=8.5, leading=12, textColor=HexColor("#555555"))
    h1 = ParagraphStyle("h1", parent=base, fontName="Helvetica-Bold", fontSize=17, leading=22, textColor=navy)
    h2 = ParagraphStyle("h2", parent=base, fontName="Helvetica-Bold", fontSize=11.5, leading=16, spaceBefore=10, spaceAfter=4)
    clause = ParagraphStyle("c", parent=base, leftIndent=26, firstLineIndent=-26, spaceAfter=5)

    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=22 * mm, rightMargin=22 * mm,
                            topMargin=20 * mm, bottomMargin=20 * mm,
                            title=f"{d['title']} - {d['ref']}", author="FULLBACK demo", subject="Fictional demo document")
    story = [Paragraph(d["title"], h1), Spacer(1, 3),
             Paragraph(f"{d['ref']} &nbsp;&middot;&nbsp; {d['date']}", base), Spacer(1, 8),
             Paragraph(NOTICE, small), Spacer(1, 6)]
    for num, head, subs in d["clauses"]:
        block = [Paragraph(f"{num}. {head}", h2)]
        block += [Paragraph(f"<b>{sn}</b>&nbsp;&nbsp;{text.replace('&', '&amp;')}", clause) for sn, text in subs]
        story.append(KeepTogether(block))
    story.append(Paragraph(d["annex_title"], h2))
    t = Table([["Club", "Player age", "Calendar years"]] + [list(r) for r in HISTORY], colWidths=[60 * mm, 45 * mm, 55 * mm])
    t.setStyle(TableStyle([("FONT", (0, 0), (-1, -1), "Helvetica", 10), ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 10),
                           ("LINEBELOW", (0, 0), (-1, 0), 0.8, navy), ("LINEBELOW", (0, 1), (-1, -1), 0.3, HexColor("#CCCCCC")),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 6)]))
    story += [t, Spacer(1, 18), Paragraph("Signatures", h2)]
    sig = Table([[f"For {s}:", "______________________________", "(authorised signatory)"] for s in d["signatures"]],
                colWidths=[42 * mm, 75 * mm, 43 * mm])
    sig.setStyle(TableStyle([("FONT", (0, 0), (-1, -1), "Helvetica", 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 14)]))
    story.append(sig)
    doc.build(story)


OUT.mkdir(parents=True, exist_ok=True)
docs = [deal1(), deal2()]
tampered = deal1(security="EUR 1,500,000 (one million five hundred thousand euros)")
tampered["file"] = "deal1-TAMPERED"

for d in docs:
    (OUT / f"{d['file']}.md").write_text(to_markdown(d))
    to_pdf(d, OUT / f"{d['file']}.pdf")
to_pdf(tampered, OUT / "deal1-TAMPERED.pdf")

for name in ["deal1-nordvik-portoalegre.pdf", "deal1-TAMPERED.pdf", "deal2-portoalegre-clubz.pdf"]:
    print(name, hashlib.sha256((OUT / name).read_bytes()).hexdigest())

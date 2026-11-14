"""FULLBACK Reader test agreements: correct and faulty variants. Deterministic PDFs (reportlab invariant)."""
import hashlib, json, sys
from pathlib import Path
from reportlab import rl_config
rl_config.invariant = 1
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "out"); OUT.mkdir(parents=True, exist_ok=True)
NOTICE = ("FICTIONAL TEST DOCUMENT. Prepared to test the FULLBACK Reader agent at NEAR HACKATHON "
          "\"Build Beyond Boundaries\". The clubs and the player are invented. This is not a real contract.")

def money(n): return f"EUR {n:,}"
WORDS = {500000:"five hundred thousand",1000000:"one million",1500000:"one million five hundred thousand",1800000:"one million eight hundred thousand",
         2000000:"two million",2500000:"two million five hundred thousand",3000000:"three million",4000000:"four million",5000000:"five million",
         6000000:"six million",7500000:"seven million five hundred thousand",8000000:"eight million",10000000:"ten million",12000000:"twelve million"}
def mw(n): return f"{money(n)} ({WORDS[n]} euros)"

def deal(**k):
    d = dict(ref="FB-TEST-000", date="Signed on 2 March 2026", seller="Harbour City FC", buyer="Lakeside Athletic",
             player="Daniel Okoro", born="born on 9 August 2004", fee=6000000, fee_text=None,
             schedule=None, installments=[(2000000,"1 April 2026"),(2000000,"1 July 2026"),(2000000,"1 October 2026")],
             security=2000000, security_text=None, sellon="ten percent (10%)", basis="gross transfer fee received, without any deduction",
             history=[("Akademi Desa","12 to 15","2016 to 2019"),("Kota FC","16 to 20","2020 to 2024"),("Harbour City FC","21 onwards","2025 to 2026")],
             extra=[])
    d.update(k); return d

def clauses(d):
    fee_text = d["fee_text"] or mw(d["fee"])
    if d["schedule"] is not None:
        sched = d["schedule"]
    else:
        ins = d["installments"]
        if len(ins) == 1:
            sched = f"The transfer fee shall be paid in a single payment of {money(ins[0][0])} on {ins[0][1]}."
        elif len({a for a,_ in ins}) == 1:
            dates = ", ".join(x for _,x in ins[:-1]) + " and " + ins[-1][1]
            sched = (f"The transfer fee shall be paid in {len(ins)} equal installments of {mw(ins[0][0])} each, due on {dates}.")
        else:
            parts = "; ".join(f"installment {i+1} of {money(a)} due on {x}" for i,(a,x) in enumerate(ins))
            sched = f"The transfer fee shall be paid in {len(ins)} installments as follows: {parts}."
    out = [
        ("1","Parties",[("1.1",f"{d['seller']}, a football club (the \"Seller\")."),("1.2",f"{d['buyer']}, a football club (the \"Buyer\")."),
                        ("1.3",f"The professional football player {d['player']}" + (f", {d['born']}" if d['born'] else "") + " (the \"Player\").")]),
        ("2","Transfer",[("2.1","The Seller agrees to transfer the registration of the Player to the Buyer on a permanent basis, subject to the terms of this Agreement.")]),
        ("3","Transfer fee",[("3.1",f"The Buyer shall pay the Seller a fixed transfer fee of {fee_text}."),("3.2",sched)] + d["extra"]),
    ]
    if d["security"] is not None:
        st = d["security_text"] or f"Before the registration of the Player, the Buyer shall deposit security of {mw(d['security'])}, equal to one installment."
        out.append(("4","Security",[("4.1",st),("4.2","If an installment is not paid by its due date, the security shall be applied to that installment and the Buyer shall restore the security to its full amount."),
                                   ("4.3","The security shall be returned to the Buyer after the final installment has been paid.")]))
    out.append(("5","Sell-on",[("5.1",f"If the Buyer transfers the Player to another club, the Buyer shall pay the Seller {d['sellon']} of the {d['basis']}.")]))
    out.append(("6","Training clubs",[("6.1","The parties acknowledge the registration history of the Player set out in Annex A."),
                ("6.2","A solidarity contribution of up to five percent (5%) shall be distributed to the training clubs and deducted from each payment of the transfer fee.")]))
    out.append(("7","Payment and evidence",[("7.1","All payments under this Agreement shall be made in fEUR through the FULLBACK contract on the NEAR testnet, where 1 fEUR represents EUR 1.")]))
    return out

def build(name, d):
    navy = HexColor("#13235B"); base = ParagraphStyle("b", fontName="Helvetica", fontSize=10.5, leading=15)
    small = ParagraphStyle("s", parent=base, fontSize=8.5, leading=12, textColor=HexColor("#555555"))
    h1 = ParagraphStyle("h1", parent=base, fontName="Helvetica-Bold", fontSize=17, leading=22, textColor=navy)
    h2 = ParagraphStyle("h2", parent=base, fontName="Helvetica-Bold", fontSize=11.5, leading=16, spaceBefore=10, spaceAfter=4)
    cl = ParagraphStyle("c", parent=base, leftIndent=26, firstLineIndent=-26, spaceAfter=5)
    doc = SimpleDocTemplate(str(OUT/f"{name}.pdf"), pagesize=A4, leftMargin=22*mm, rightMargin=22*mm, topMargin=20*mm, bottomMargin=20*mm,
                            title=f"Permanent Transfer Agreement - {d['ref']}", author="FULLBACK test", subject="Fictional test document")
    s = [Paragraph("PERMANENT TRANSFER AGREEMENT", h1), Spacer(1,3), Paragraph(f"Agreement No. {d['ref']} &nbsp;&middot;&nbsp; {d['date']}", base), Spacer(1,8), Paragraph(NOTICE, small), Spacer(1,6)]
    for num, head, subs in clauses(d):
        s.append(KeepTogether([Paragraph(f"{num}. {head}", h2)] + [Paragraph(f"<b>{n}</b>&nbsp;&nbsp;{t}", cl) for n,t in subs]))
    s.append(Paragraph("Annex A - Registration history of the Player", h2))
    t = Table([["Club","Player age","Calendar years"]] + [list(r) for r in d["history"]], colWidths=[60*mm,45*mm,55*mm])
    t.setStyle(TableStyle([("FONT",(0,0),(-1,-1),"Helvetica",10),("FONT",(0,0),(-1,0),"Helvetica-Bold",10),("LINEBELOW",(0,0),(-1,0),0.8,navy),
                           ("LINEBELOW",(0,1),(-1,-1),0.3,HexColor("#CCCCCC")),("BOTTOMPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),6)]))
    s += [t, Spacer(1,18), Paragraph("Signatures", h2)]
    sig = Table([[f"For {x}:","______________________________","(authorised signatory)"] for x in (d["seller"], d["buyer"])], colWidths=[48*mm,72*mm,40*mm])
    sig.setStyle(TableStyle([("FONT",(0,0),(-1,-1),"Helvetica",10),("BOTTOMPADDING",(0,0),(-1,-1),14)]))
    s.append(sig); doc.build(s)
    return hashlib.sha256((OUT/f"{name}.pdf").read_bytes()).hexdigest()

TESTS = [
 # ---------- correct ----------
 ("OK-01-basic", "BENAR", "Tanpa warning. Fee 6,000,000 = 3 x 2,000,000. Sell-on 10% gross. Akademi Desa 12-15 -> 1.00%, Kota FC 16-20 -> 2.50%.",
  deal(ref="FB-TEST-001")),
 ("OK-02-unequal-installments", "BENAR", "Tanpa warning. Cicilan tidak sama: 4,000,000 + 3,000,000 + 3,000,000 = 10,000,000.",
  deal(ref="FB-TEST-002", fee=10000000, installments=[(4000000,"1 April 2026"),(3000000,"1 July 2026"),(3000000,"1 October 2026")], security=3000000,
       security_text="Before the registration of the Player, the Buyer shall deposit security of EUR 3,000,000 (three million euros).")),
 ("OK-03-single-payment-no-security", "BENAR", "Tanpa warning. Satu kali bayar 5,000,000, tanpa pasal jaminan (collateral kosong boleh).",
  deal(ref="FB-TEST-003", fee=5000000, installments=[(5000000,"15 March 2026")], security=None)),
 ("OK-04-six-installments", "BENAR", "Tanpa warning. 6 cicilan x 2,000,000 = 12,000,000.",
  deal(ref="FB-TEST-004", fee=12000000, installments=[(2000000,d) for d in ["1 April 2026","1 July 2026","1 October 2026","1 January 2027","1 April 2027","1 July 2027"]])),
 ("OK-05-royalty-max-5pct", "BENAR", "Tanpa warning. Akademi Desa 12-15 (1.00%) + Kota FC 16-23 (4.00%) = tepat 5% (batas maksimal).",
  deal(ref="FB-TEST-005", player="Marco Rossi", born="born on 1 May 1998", history=[("Akademi Desa","12 to 15","2010 to 2013"),("Kota FC","16 to 23","2014 to 2021"),("Harbour City FC","24 onwards","2022 to 2026")])),
 ("OK-06-words-first", "BENAR", "Tanpa warning. Angka ditulis huruf dulu baru digit: 'seven million five hundred thousand euros (EUR 7,500,000)'. Agent harus tetap membaca 7,500,000.",
  deal(ref="FB-TEST-006", fee=7500000, fee_text="seven million five hundred thousand euros (EUR 7,500,000)",
       installments=[(2500000,"1 April 2026"),(2500000,"1 July 2026"),(2500000,"1 October 2026")], security=2500000)),
 ("OK-07-no-academy-share", "BENAR", "Tanpa warning dan tanpa akademi. Pemain baru terdaftar sejak umur 24 (Nordvik IF), jadi royalti 0% dan daftar akademi kosong.",
  deal(ref="FB-TEST-007", player="Erik Halvorsen", born="born on 3 January 1999", history=[("Nordvik IF","24 to 27","2023 to 2026")])),
 # ---------- caught by the agent ----------
 ("BAD-01-installments-dont-add-up", "SALAH - harus ketahuan", "Warning installments_mismatch: 3 x 1,800,000 = 5,400,000, padahal fee 6,000,000.",
  deal(ref="FB-TEST-101", installments=[(1800000,"1 April 2026"),(1800000,"1 July 2026"),(1800000,"1 October 2026")], security=1800000)),
 ("BAD-02-sell-on-net", "SALAH - harus ketahuan", "Warning sell_on_net: sell-on dihitung dari 'net amount', FULLBACK hanya mendukung gross.",
  deal(ref="FB-TEST-102", basis="net amount received after deduction of costs and commissions")),
 ("BAD-03-unknown-academy", "SALAH - harus ketahuan", "Error 'Unknown training club \"Sunrise Academy\"': akademi tidak ada di agent/clubs.json, jadi deal tidak boleh dibuat.",
  deal(ref="FB-TEST-103", history=[("Sunrise Academy","13 to 17","2017 to 2021"),("Harbour City FC","18 onwards","2022 to 2026")])),
 ("BAD-04-sell-on-decimal", "SALAH - harus ketahuan", "Error validasi: sell-on 12.5% bukan bilangan bulat (schema hanya menerima persen bulat).",
  deal(ref="FB-TEST-104", sellon="twelve point five percent (12.5%)")),
 ("BAD-05-no-birth-date", "SALAH - harus ketahuan", "Tanggal lahir pemain tidak ada. Harus error validasi, atau quote_not_found kalau AI mengarang tanggal.",
  deal(ref="FB-TEST-105", born=None)),
 ("BAD-06-no-schedule", "SALAH - harus ketahuan", "Jadwal cicilan tidak ada ('to be agreed later'). Harus error validasi, atau quote_not_found kalau AI mengarang cicilan.",
  deal(ref="FB-TEST-106", schedule="The transfer fee shall be paid in installments on dates to be agreed later by the parties.")),
 ("BAD-07-contradicting-clauses", "SALAH - harus ketahuan", "Pasal 3.2 bilang 3 cicilan, pasal 3.3 bilang 4 cicilan x 2,000,000. Kalau AI ambil 4 cicilan -> installments_mismatch (8,000,000 vs 6,000,000).",
  deal(ref="FB-TEST-107", extra=[("3.3","Notwithstanding Clause 3.2, the transfer fee shall be paid in four (4) installments of EUR 2,000,000 (two million euros) each.")])),
 # ---------- NOT checked by the agent (gaps) ----------
 ("GAP-01-words-digits-conflict", "SALAH - kemungkinan LOLOS", "Digit 6,000,000 tapi huruf 'five million'. Agent tidak membandingkan angka dengan hurufnya. Manusia harus menangkap ini.",
  deal(ref="FB-TEST-201", fee_text="EUR 6,000,000 (five million euros)")),
 ("GAP-02-security-too-small", "SALAH - kemungkinan LOLOS", "Jaminan cuma 500,000, padahal satu cicilan 2,000,000. Agent tidak mengecek jaminan = satu cicilan.",
  deal(ref="FB-TEST-202", security=500000, security_text="Before the registration of the Player, the Buyer shall deposit security of EUR 500,000 (five hundred thousand euros).")),
 ("GAP-03-dates-before-signing", "SALAH - kemungkinan LOLOS", "Cicilan pertama jatuh tempo 1 Jan 2026, sebelum perjanjian ditandatangani (2 Mar 2026), dan urutannya acak. Agent tidak mengecek tanggal.",
  deal(ref="FB-TEST-203", installments=[(2000000,"1 January 2026"),(2000000,"1 October 2026"),(2000000,"1 July 2026")])),
 ("GAP-04-overlapping-history", "SALAH - kemungkinan LOLOS", "Riwayat tumpang tindih: Akademi Desa 12-17 dan Kota FC 16-20 (umur 16-17 dihitung dua kali). Agent tidak mengecek tumpang tindih.",
  deal(ref="FB-TEST-204", history=[("Akademi Desa","12 to 17","2016 to 2021"),("Kota FC","16 to 20","2020 to 2024"),("Harbour City FC","21 onwards","2025 to 2026")])),
]

manifest = []
for name, kind, expect, d in TESTS:
    manifest.append({"file": f"{name}.pdf", "kind": kind, "expect": expect, "sha256": build(name, d)})
# Verify pair: tampered copy of OK-01
manifest.append({"file": "VERIFY-OK-01-TAMPERED.pdf", "kind": "SALAH - untuk Verify",
                 "expect": "Sama persis dengan OK-01, kecuali sell-on 10% jadi 5%. Di halaman Verify, sidik jarinya harus beda dari OK-01.",
                 "sha256": build("VERIFY-OK-01-TAMPERED", deal(ref="FB-TEST-001", sellon="five percent (5%)"))})
(OUT/"manifest.json").write_text(json.dumps(manifest, indent=2))
for m in manifest: print(m["sha256"][:12], m["file"])

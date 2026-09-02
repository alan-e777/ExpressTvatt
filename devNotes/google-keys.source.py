# Source for devNotes/google-keys.pdf — the owner-facing Google Maps guide.
#
# Regenerate after editing (reportlab is the only dependency):
#     python3 -m venv /tmp/venv && /tmp/venv/bin/pip install reportlab
#     /tmp/venv/bin/python devNotes/google-keys.source.py
#
# Two Arial gotchas are worked around deliberately, do not "simplify" them:
#   - Arial has no U+2630 (menu) or U+2610 (ballot box) glyph; reportlab renders
#     a missing glyph as nothing at all, silently. The menu icon uses U+2261 and
#     the checkboxes are drawn as bordered table cells instead.
#   - Arial's capital I is a bare stroke, so "AIza" reads as "Alza" — exactly the
#     string the owner is told to check. It is set in Courier-Bold and spelled out.
#
# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph,
                                Spacer, Table, TableStyle, KeepTogether, PageBreak)

F = "/System/Library/Fonts/Supplemental/"
pdfmetrics.registerFont(TTFont("Ar",  F + "Arial.ttf"))
pdfmetrics.registerFont(TTFont("ArB", F + "Arial Bold.ttf"))
pdfmetrics.registerFont(TTFont("ArI", F + "Arial Italic.ttf"))
pdfmetrics.registerFontFamily("Ar", normal="Ar", bold="ArB", italic="ArI")

TEAL   = colors.HexColor("#063F41")
TEAL_L = colors.HexColor("#0E5C5B")
GOLD   = colors.HexColor("#B8892B")
INK    = colors.HexColor("#1A2320")
GREY   = colors.HexColor("#5B6B68")
LINEN  = colors.HexColor("#F5F2EA")
MIST   = colors.HexColor("#EAF3F1")
WARN   = colors.HexColor("#FDF4E3")
DEVELOPER_EMAIL = "carlsaricnilsson@gmail.com"

def S(name, **kw):
    base = dict(name=name, fontName="Ar", fontSize=11.5, leading=17.5,
                textColor=INK, alignment=TA_LEFT)
    base.update(kw)
    return ParagraphStyle(**base)

body     = S("body", spaceAfter=7)
bodyTight= S("bodyTight", spaceAfter=2)
lead     = S("lead", fontSize=12.5, leading=19, spaceAfter=10)
h2       = S("h2", fontName="ArB", fontSize=13, leading=18, textColor=TEAL, spaceBefore=6, spaceAfter=6)
small    = S("small", fontSize=9.5, leading=14, textColor=GREY)
boxh     = S("boxh", fontName="ArB", fontSize=10.5, leading=15, textColor=TEAL)
boxb     = S("boxb", fontSize=10.5, leading=16, textColor=INK)
boxbW    = S("boxbW", fontSize=10.5, leading=16, textColor=colors.HexColor("#5A3E0B"))
boxhW    = S("boxhW", fontName="ArB", fontSize=10.5, leading=15, textColor=colors.HexColor("#8A5A00"))
num      = S("num", fontName="ArB", fontSize=12, leading=17.5, textColor=TEAL_L)
titleS   = S("title", fontName="ArB", fontSize=30, leading=34, textColor=TEAL)
subS     = S("sub", fontSize=14, leading=20, textColor=TEAL_L)
kicker   = S("kicker", fontName="ArB", fontSize=9.5, leading=13, textColor=GOLD)
steplbl  = S("steplbl", fontName="ArB", fontSize=9.5, leading=13, textColor=colors.white)
stepttl  = S("stepttl", fontName="ArB", fontSize=17, leading=22, textColor=colors.white)
mono     = S("mono", fontName="ArB", fontSize=13, leading=18, textColor=TEAL)

W = A4[0] - 40*mm   # usable width

def step(n, title, sub=None):
    inner = [[Paragraph("STEG %d AV 5" % n, steplbl)], [Paragraph(title, stepttl)]]
    if sub:
        inner.append([Paragraph('<font color="#BFD8D4">%s</font>' % sub, boxb)])
    t = Table(inner, colWidths=[W - 12*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), TEAL),
        ("LEFTPADDING", (0,0), (-1,-1), 6*mm),
        ("RIGHTPADDING", (0,0), (-1,-1), 6*mm),
        ("TOPPADDING", (0,0), (0,0), 5*mm),
        ("BOTTOMPADDING", (0,-1), (-1,-1), 5*mm),
        ("TOPPADDING", (0,1), (-1,-1), 1*mm),
        ("BOTTOMPADDING", (0,0), (-1,-2), 0),
    ]))
    outer = Table([[t]], colWidths=[W])
    outer.setStyle(TableStyle([("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
                               ("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),6*mm)]))
    return outer

def steps(items):
    rows = []
    for i, txt in enumerate(items, 1):
        rows.append([Paragraph("%d." % i, num), Paragraph(txt, bodyTight)])
    t = Table(rows, colWidths=[9*mm, W - 9*mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
        ("TOPPADDING", (0,0), (-1,-1), 2.6*mm),
        ("BOTTOMPADDING", (0,0), (-1,-1), 2.6*mm),
        ("LINEBELOW", (0,0), (-1,-2), 0.4, colors.HexColor("#E3E9E7")),
    ]))
    return t

def box(heading, lines, tone="info"):
    bg, bd = (MIST, colors.HexColor("#BFD8D4"))
    hs, bs = boxh, boxb
    if tone == "warn":
        bg, bd, hs, bs = WARN, colors.HexColor("#E8C98A"), boxhW, boxbW
    if tone == "linen":
        bg, bd = LINEN, colors.HexColor("#DED8C6")
    flow = []
    if heading:
        flow.append(Paragraph(heading, hs))
        flow.append(Spacer(1, 2.2*mm))
    for i, l in enumerate(lines):
        flow.append(Paragraph(l, bs))
        if i < len(lines) - 1:
            flow.append(Spacer(1, 1.8*mm))
    t = Table([[flow]], colWidths=[W])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), bg),
        ("BOX", (0,0), (-1,-1), 0.7, bd),
        ("LEFTPADDING", (0,0), (-1,-1), 5*mm),
        ("RIGHTPADDING", (0,0), (-1,-1), 5*mm),
        ("TOPPADDING", (0,0), (-1,-1), 4.5*mm),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4.5*mm),
    ]))
    return t

def checks(items):
    def cb():
        c = Table([[""]], colWidths=[4.4*mm], rowHeights=[4.4*mm])
        c.setStyle(TableStyle([("BOX", (0,0), (-1,-1), 0.9, TEAL_L),
                               ("LEFTPADDING", (0,0), (-1,-1), 0), ("RIGHTPADDING", (0,0), (-1,-1), 0),
                               ("TOPPADDING", (0,0), (-1,-1), 0), ("BOTTOMPADDING", (0,0), (-1,-1), 0)]))
        return c
    rows = [[cb(), Paragraph(i, bodyTight)] for i in items]
    t = Table(rows, colWidths=[8*mm, W - 8*mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 0), ("RIGHTPADDING", (0,0), (-1,-1), 0),
        ("TOPPADDING", (0,0), (-1,-1), 3.0*mm), ("BOTTOMPADDING", (0,0), (-1,-1), 2.2*mm),
    ]))
    return t

def b(t):  return "<b>%s</b>" % t
def code(t): return '<font face="Courier-Bold" color="#063F41" size="12">%s</font>' % t
def btn(t): return '<b><font color="#063F41">&#171;%s&#187;</font></b>' % t
def en(t):  return '<font color="#5B6B68" size="10">(%s)</font>' % t

story = []
A = story.append

# ── Page 1 ───────────────────────────────────────────────────────────────────
A(Paragraph("EXPRESS TVÄTT", kicker))
A(Spacer(1, 3*mm))
A(Paragraph("Google Maps", titleS))
A(Spacer(1, 1.5*mm))
A(Paragraph("Vad jag behöver från dig — steg för steg", subS))
A(Spacer(1, 8*mm))
A(Paragraph(
    "Hej! På hemsidan finns en karta, och när en kund börjar skriva sin adress föreslås "
    "rätt adress automatiskt. Allt det kommer från Google.", lead))
A(Paragraph(
    "För att det ska fungera behöver Google ett konto som är kopplat till ett bankkort — "
    "och det kontot ska stå på " + b("dig") + ", eftersom det är din verksamhet. Den här guiden "
    "visar exakt var du ska klicka. Det tar ungefär " + b("15 minuter") + ".", lead))
A(Spacer(1, 4*mm))
A(box("DET HÄR BEHÖVER DU FRAMFÖR DIG", [
    "&#8226;&nbsp;&nbsp;En " + b("dator") + " — det går på mobilen också, men knapparna är lättare att hitta på en dator.",
    "&#8226;&nbsp;&nbsp;Ditt " + b("Google-konto") + " (din Gmail-adress) och lösenordet till det.",
    "&#8226;&nbsp;&nbsp;Ett " + b("bankkort") + ".",
    "&#8226;&nbsp;&nbsp;Ungefär " + b("15 minuter") + " då du inte blir störd.",
], tone="linen"))
A(Spacer(1, 5*mm))
A(box("VAD KOSTAR DET?", [
    "Google kräver ett bankkort, men det betyder inte att det kostar pengar. Det finns en "
    "gratismängd varje månad, och för en verksamhet av er storlek kommer användningen med "
    "stor sannolikhet att rymmas inom den.",
    "Jag lägger dessutom in ett " + b("kostnadstak och en varning") + ", så att det aldrig kan skena iväg. "
    "Nya konton får ofta även en gratissumma från Google att börja med.",
]))
A(Spacer(1, 5*mm))
A(box("TRYGGT ATT VETA", [
    "&#8226;&nbsp;&nbsp;" + b("Jag ser aldrig dina kortuppgifter.") + " De lämnar aldrig Google.",
    "&#8226;&nbsp;&nbsp;Du kan " + b("när som helst ta bort min åtkomst") + " — det görs på en enda skärm.",
    "&#8226;&nbsp;&nbsp;Koden du skickar mig i Steg 4 går att " + b("byta ut på två minuter") + " om något känns fel.",
]))
A(Spacer(1, 6*mm))
A(Paragraph(
    "Ser något på skärmen annorlunda ut än i guiden? Bläddra till sista sidan — där står de "
    "vanligaste problemen. Och hör hellre av dig en gång för mycket än gissa dig fram.", small))

# ── Page 2 ───────────────────────────────────────────────────────────────────
A(PageBreak())
A(step(1, "Skapa ett projekt", "Ett ställe där allt som hör till hemsidan ligger samlat."))
A(steps([
    "Gå till adressen " + b("console.cloud.google.com") + " i webbläsaren.",
    "Logga in med den Gmail-adress som ska " + b("äga") + " det här.",
    b("Kolla cirkeln längst upp till höger.") + " Står rätt e-postadress där? Om inte — klicka på "
    "cirkeln och byt konto. Det här är lätt att missa och jobbigt att rätta till efteråt.",
    "Första gången frågar Google om land och villkor. Välj " + b("Sverige") + " och kryssa i rutan om att du godkänner.",
    "Längst upp till vänster, bredvid orden " + btn("Google Cloud") + ", finns en meny som visar ett projektnamn. Klicka på den.",
    "Klicka " + btn("NYTT PROJEKT") + " " + en("New Project") + " uppe till höger i rutan som öppnas.",
    "Skriv namnet " + b("Express Tvatt") + " och klicka " + btn("SKAPA") + " " + en("Create") + ". Vänta ungefär 30 sekunder.",
    "Kontrollera att det nu står " + b("Express Tvatt") + " i menyn längst upp. Gör det inte det — klicka på menyn och välj det i listan.",
]))
A(Spacer(1, 6*mm))
A(box("VARFÖR?", [
    "”Projekt” är bara Googles ord för en mapp. Allt som hör till hemsidans karta hamnar i den "
    "mappen, så att det är lätt att hålla isär från annat du kan ha hos Google.",
], tone="linen"))

# ── Page 3 ───────────────────────────────────────────────────────────────────
A(PageBreak())
A(step(2, "Koppla ditt bankkort", "Det är här det sitter fast i dag."))
A(steps([
    "Klicka på menyn längst upp till vänster — den med " + b("tre streck") + " (" + b("&#8801;") + ").",
    "Välj " + btn("Fakturering") + " " + en("Billing") + ".",
    "Har du inget faktureringskonto sedan tidigare: välj " + btn("Hantera faktureringskonton") + " "
    + en("Manage billing accounts") + " och sedan " + btn("Lägg till faktureringskonto") + " " + en("Add billing account") + ".",
    "Fyll i land = " + b("Sverige") + " och dina kortuppgifter.",
    "Klicka " + btn("Skicka och aktivera fakturering") + " " + en("Submit and enable billing") + ".",
    "Gå tillbaka till " + btn("Fakturering") + " och läs nästa ruta noga innan du går vidare.",
]))
A(Spacer(1, 6*mm))
A(box("LÄS DEN HÄR — DET ÄR HÄR DE FLESTA FASTNAR", [
    b("Det räcker inte att lägga till kortet.") + " Projektet måste också kopplas ihop med kortet. "
    "Det är två olika saker, och Google säger inte alltid ifrån.",
    "På sidan " + btn("Fakturering") + " ska du se namnet " + b("Express Tvatt") + " och namnet på ditt "
    "faktureringskonto " + b("tillsammans") + ".",
    "Ser du i stället texten " + btn("Det här projektet har inget faktureringskonto") + " "
    + en("This project has no billing account") + " — klicka " + btn("LÄNKA ETT FAKTURERINGSKONTO") + " "
    + en("Link a billing account") + " och välj det du nyss skapade.",
], tone="warn"))
A(Spacer(1, 5*mm))
A(box(None, [
    "Google kan dra ett litet belopp, ofta några kronor, bara för att kontrollera att kortet "
    "fungerar. Det beloppet betalas tillbaka automatiskt.",
], tone="linen"))

# ── Page 4 ───────────────────────────────────────────────────────────────────
A(PageBreak())
A(step(3, "Slå på fem tjänster", "Samma sak fem gånger — det går fort när du gjort den första."))
A(Paragraph("Nu talar vi om för Google vilka fem saker hemsidan får använda.", body))
A(Spacer(1, 3*mm))
A(steps([
    "Meny " + b("&#8801;") + " (tre streck) &#8594; " + btn("API:er och tjänster") + " " + en("APIs &amp; Services") + " &#8594; " + btn("Bibliotek") + " " + en("Library") + ".",
    "Skriv namnet på den " + b("första") + " tjänsten i listan nedan i sökrutan.",
    "Klicka på den i träfflistan.",
    "Klicka på den blå knappen " + btn("AKTIVERA") + " " + en("Enable") + ".",
    "Klicka på " + b("bakåtpilen") + " i webbläsaren och gör om från punkt 2 med nästa namn i listan.",
]))
A(Spacer(1, 6*mm))
A(Paragraph("Kryssa av allteftersom — alla fem måste med:", h2))
A(checks([
    b("Maps JavaScript API") + " &nbsp;&#8212;&nbsp; själva kartan",
    b("Places API") + " &nbsp;&#8212;&nbsp; adressförslagen i kassan",
    b("Geocoding API") + " &nbsp;&#8212;&nbsp; översätter en adress till en plats på kartan",
    b("Directions API") + " &nbsp;&#8212;&nbsp; körrutten för chauffören",
    b("Maps Static API") + " &nbsp;&#8212;&nbsp; kartbilderna i adminpanelen",
]))
A(Spacer(1, 6*mm))
A(box("TVÅ SAKER SOM KAN FÖRVIRRA", [
    "Ser du " + b("både") + " ”Places API” och ”Places API (New)”? " + b("Aktivera båda.") + " "
    "Hemsidan använder den första, men det skadar inte att ha båda påslagna.",
    "Står det " + btn("HANTERA") + " " + en("Manage") + " i stället för " + btn("AKTIVERA") + "? "
    "Då är den redan påslagen sedan tidigare. Gå bara vidare till nästa.",
]))

# ── Page 5 ───────────────────────────────────────────────────────────────────
A(PageBreak())
A(step(4, "Skapa koden och skicka den till mig", "Det är den här jag väntar på."))
A(steps([
    "Meny " + b("&#8801;") + " (tre streck) &#8594; " + btn("API:er och tjänster") + " &#8594; " + btn("Autentiseringsuppgifter") + " " + en("Credentials") + ".",
    "Klicka " + btn("+ SKAPA AUTENTISERINGSUPPGIFTER") + " " + en("Create credentials") + " längst upp på sidan.",
    "Välj " + btn("API-nyckel") + " " + en("API key") + " i listan som fälls ut.",
    "En ruta visas med en " + b("lång kod") + ". Den börjar med " + code("AIza") + " &#8212; "
    "det vill säga " + b("stort A, stort I, litet z, litet a") + " &#8212; och är ungefär 39 tecken lång.",
    "Klicka på " + b("kopiera-ikonen") + " (två små ark) bredvid koden.",
    b("Skicka koden till mig") + " — se rutan nedan om hur.",
    "Klicka " + btn("STÄNG") + " " + en("Close") + ". Klicka " + b("inte") + " på " + btn("Begränsa nyckel") + " "
    + en("Restrict key") + " — den delen sköter jag.",
]))
A(Spacer(1, 5*mm))
A(box("SÅ SKICKAR DU KODEN", [
    "&#8226;&nbsp;&nbsp;Skicka den i ett " + b("privat meddelande direkt till mig") + " — sms, WhatsApp eller mejl.",
    "&#8226;&nbsp;&nbsp;Lägg den " + b("aldrig") + " i ett offentligt inlägg, i en delad fil eller på sociala medier.",
    "&#8226;&nbsp;&nbsp;" + b("Säg till när du skickat") + ", så installerar jag den och låser den till just vår hemsida samma dag.",
], tone="warn"))
A(Spacer(1, 4*mm))
A(box(None, [
    "Koden är som en reservnyckel till en betaltjänst. Hamnar den i fel händer kan någon annan "
    "använda den på din räkning. Misstänker du någonsin att det hänt — hör av dig, så byter jag "
    "ut den på två minuter. Ingen skada skedd.",
], tone="linen"))

# ── Page 6 ───────────────────────────────────────────────────────────────────
A(PageBreak())
A(step(5, "Ge mig tillgång", "Frivilligt — men då slipper du göra om det här i framtiden."))
A(Paragraph(
    "Med det här kan jag sköta kartan och nycklarna själv när något behöver ändras, i stället "
    "för att be dig sätta dig vid datorn igen.", body))
A(Spacer(1, 3*mm))
A(steps([
    "Meny " + b("&#8801;") + " (tre streck) &#8594; " + btn("IAM och administratör") + " " + en("IAM &amp; Admin") + " &#8594; " + btn("IAM") + ".",
    "Klicka " + btn("+ BEVILJA ÅTKOMST") + " " + en("Grant access") + " längst upp.",
    "I rutan " + btn("Nya huvudkonton") + " " + en("New principals") + " skriver du min e-postadress:",
    "Under " + btn("Roll") + " " + en("Role") + " väljer du " + b("Redigerare") + " " + en("Editor") + ".",
    "Klicka " + btn("SPARA") + " " + en("Save") + ".",
]))
A(Spacer(1, 4*mm))
t = Table([[Paragraph(DEVELOPER_EMAIL, mono)]], colWidths=[W])
t.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), colors.white),
    ("BOX", (0,0), (-1,-1), 1.1, TEAL),
    ("LEFTPADDING", (0,0), (-1,-1), 6*mm), ("RIGHTPADDING", (0,0), (-1,-1), 6*mm),
    ("TOPPADDING", (0,0), (-1,-1), 5*mm), ("BOTTOMPADDING", (0,0), (-1,-1), 5*mm),
]))
A(t)
A(Spacer(1, 6*mm))
A(box("VAD ROLLEN ”REDIGERARE” BETYDER", [
    "Den låter mig sköta kartan, tjänsterna och nycklarna.",
    "Den låter mig " + b("inte") + " röra ditt bankkort, ditt faktureringskonto eller dina pengar.",
    "Du tar bort mig när du vill: samma sida, klicka på papperskorgen bredvid min adress.",
]))

# ── Page 7 ───────────────────────────────────────────────────────────────────
A(PageBreak())
A(Paragraph("Om något går fel", titleS))
A(Spacer(1, 5*mm))
rows = [[Paragraph(b("Det här ser du"), boxh), Paragraph(b("Det här betyder det"), boxh)]]
for q, a in [
    ("Kartan säger ”For development purposes only”",
     "Steg 2 är inte klart. Kortet är tillagt men projektet är inte kopplat till det. Gå tillbaka till Steg 2."),
    ("Jag hittar inte menyn",
     "Tre streck (&#8801;) längst upp till vänster, precis bredvid orden ”Google Cloud”."),
    ("Fel e-postadress visas",
     "Klicka på cirkeln längst upp till höger och välj ”Byt konto”. Börja sedan om från Steg 1."),
    ("Knappen heter något annat än i guiden",
     "Google byter ord ibland. Leta efter något som betyder ungefär samma sak. Är du osäker — ta en skärmbild och skicka den till mig."),
    ("Det står att ett betalkonto krävs",
     "Det är normalt, och det är precis vad Steg 2 löser."),
    ("Jag är osäker på om jag gjort rätt",
     "Skicka en skärmbild. Det är alltid snabbare än att gissa, och ingenting går sönder av att du frågar."),
]:
    rows.append([Paragraph(q, boxb), Paragraph(a, boxb)])
tbl = Table(rows, colWidths=[W*0.40, W*0.60])
tbl.setStyle(TableStyle([
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("BACKGROUND", (0,0), (-1,0), MIST),
    ("LINEBELOW", (0,0), (-1,-2), 0.5, colors.HexColor("#DDE5E3")),
    ("BOX", (0,0), (-1,-1), 0.7, colors.HexColor("#DDE5E3")),
    ("LEFTPADDING", (0,0), (-1,-1), 4*mm), ("RIGHTPADDING", (0,0), (-1,-1), 4*mm),
    ("TOPPADDING", (0,0), (-1,-1), 2.7*mm), ("BOTTOMPADDING", (0,0), (-1,-1), 2.7*mm),
]))
A(tbl)
A(Spacer(1, 6*mm))
A(Paragraph("Sista kollen innan du hör av dig", h2))
A(Spacer(1, 2*mm))
A(checks([
    "Projektet " + b("Express Tvatt") + " finns, och rätt Gmail-adress står uppe till höger.",
    "Bankkortet är tillagt " + b("och") + " projektet är kopplat till det.",
    "Alla " + b("fem") + " tjänsterna är aktiverade.",
    "Jag har skickat koden som börjar med " + code("AIza") + " i ett privat meddelande.",
    "Jag har lagt till " + b(DEVELOPER_EMAIL) + " som " + b("Redigerare") + ".",
]))
A(Spacer(1, 5*mm))
A(box(None, [
    b("Tack!") + " När det här är gjort fungerar kartan och adressförslagen på hemsidan igen, "
    "och du behöver inte tänka på det mer. Hör av dig om något som helst känns oklart — det är "
    "alltid enklare att fråga än att gissa.",
], tone="linen"))

# ── Build ────────────────────────────────────────────────────────────────────
OUT = "/Users/Carl/Developer/AmosTailor/devNotes/google-keys.pdf"

from reportlab.pdfgen import canvas as _canvas

class NumberedCanvas(_canvas.Canvas):
    """Two-pass page numbering: the total is only known once everything is laid out."""
    def __init__(self, *a, **kw):
        _canvas.Canvas.__init__(self, *a, **kw)
        self._saved = []

    def showPage(self):
        self._saved.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._saved)
        for state in self._saved:
            self.__dict__.update(state)
            if self._pageNumber > 1:
                self.saveState()
                self.setFillColor(colors.HexColor("#8FA5A2"))
                self.setFont("Ar", 8)
                self.drawString(20*mm, 12*mm, "Express Tvätt — Google Maps")
                self.drawRightString(A4[0] - 20*mm, 12*mm,
                                     "Sida %d av %d" % (self._pageNumber, total))
                self.restoreState()
            _canvas.Canvas.showPage(self)
        _canvas.Canvas.save(self)

def deco(canv, doc):
    canv.saveState()
    canv.setStrokeColor(GOLD)
    canv.setLineWidth(2.2)
    canv.line(20*mm, A4[1] - 14*mm, 20*mm + 26*mm, A4[1] - 14*mm)
    canv.restoreState()

doc = BaseDocTemplate(OUT, pagesize=A4,
                      leftMargin=20*mm, rightMargin=20*mm,
                      topMargin=22*mm, bottomMargin=20*mm,
                      title="Google Maps — vad jag behöver från dig",
                      author="Express Tvätt", subject="Instruktioner för Google Maps API")
frame = Frame(doc.leftMargin, doc.bottomMargin, W, A4[1] - 42*mm, id="f")
doc.addPageTemplates([PageTemplate(id="p", frames=[frame], onPage=deco)])
doc.build(story, canvasmaker=NumberedCanvas)
print("built", OUT)

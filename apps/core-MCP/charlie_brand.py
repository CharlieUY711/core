from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
import os

W, H = letter

# ══════════════════════════════════════════════════════════
# Charlie BRAND PALETTE — definida desde los docs reales
# ══════════════════════════════════════════════════════════
# Primarios
Charlie_BLACK   = colors.HexColor("#1A1A1A")   # Negro base (del one-pager)
Charlie_ORANGE  = colors.HexColor("#F26522")   # Naranja principal
Charlie_WHITE   = colors.HexColor("#FFFFFF")

# Secundarios
Charlie_CELESTE = colors.HexColor("#29ABE2")   # Celeste
Charlie_GREEN   = colors.HexColor("#39B54A")   # Verde

# Neutros
Charlie_GRAY_D  = colors.HexColor("#4B4B4B")   # Gris oscuro — texto secundario
Charlie_GRAY_M  = colors.HexColor("#9B9B9B")   # Gris medio — captions
Charlie_GRAY_L  = colors.HexColor("#F0F0F0")   # Gris claro — fondos
Charlie_BORDER  = colors.HexColor("#E0E0E0")   # Bordes

# Semánticos (heredados del sistema)
Charlie_RED     = colors.HexColor("#E53935")   # Rojo confidencial
Charlie_AMBER   = colors.HexColor("#F59E0B")   # Advertencia

from pathlib import Path

OUT = Path(__file__).resolve().parent / "outputs" / "Charlie_Brand_Guidelines.pdf"
# ══════════════════════════════════════════════════════════
# CANVAS-BASED DRAWING HELPERS
# ══════════════════════════════════════════════════════════
def rect(c, x, y, w, h, fill, stroke=None, sw=0):
    c.setFillColor(fill)
    if stroke:
        c.setStrokeColor(stroke)
        c.setLineWidth(sw)
        c.rect(x, y, w, h, fill=1, stroke=1)
    else:
        c.rect(x, y, w, h, fill=1, stroke=0)

def text(c, x, y, s, font="Helvetica", size=10, color=Charlie_BLACK, align="left"):
    c.setFont(font, size)
    c.setFillColor(color)
    if align == "center":
        c.drawCentredString(x, y, s)
    elif align == "right":
        c.drawRightString(x, y, s)
    else:
        c.drawString(x, y, s)

def header(c, label):
    # Top black bar
    rect(c, 0, H - 0.5*inch, W, 0.5*inch, Charlie_BLACK)
    rect(c, 0, H - 0.53*inch, W, 0.04*inch, Charlie_ORANGE)
    text(c, 0.45*inch, H - 0.33*inch, "Charlie", "Helvetica-Bold", 11, Charlie_WHITE)
    text(c, 0.45*inch + 68, H - 0.33*inch, f"· {label}", "Helvetica", 11, colors.HexColor("#AAAAAA"))
    # Footer
    rect(c, 0, 0, W, 0.42*inch, Charlie_GRAY_L)
    rect(c, 0, 0.41*inch, W, 0.02*inch, Charlie_ORANGE)
    text(c, 0.45*inch, 0.16*inch, "Brand Guidelines · Documento interno · Versión 1.0 · 2025", "Helvetica", 8, Charlie_GRAY_M)
    text(c, W - 0.45*inch, 0.16*inch, "© 2025 Charlie", "Helvetica", 8, Charlie_GRAY_M, "right")

def section_title(c, x, y, label, color=Charlie_ORANGE):
    text(c, x, y, label.upper(), "Helvetica-Bold", 8, color)
    c.setStrokeColor(color)
    c.setLineWidth(1)
    c.line(x, y - 4, x + 6.1*inch, y - 4)

# ══════════════════════════════════════════════════════════
# PAGE 1 — COVER
# ══════════════════════════════════════════════════════════
def page_cover(c):
    c.setPageSize(letter)
    # Full black bg
    rect(c, 0, 0, W, H, Charlie_BLACK)
    # Orange left bar
    rect(c, 0, 0, 0.22*inch, H, Charlie_ORANGE)
    # Bottom band
    rect(c, 0, 0, W, 1.4*inch, Charlie_ORANGE)

    # Orange accent strip mid
    rect(c, 0.22*inch, H*0.38, W - 0.22*inch, 0.04*inch, colors.HexColor("#333333"))

    # Charlie large
    text(c, 0.5*inch, H - 1.3*inch, "Charlie", "Helvetica-Bold", 52, Charlie_WHITE)
    # Tagline
    text(c, 0.5*inch, H - 1.75*inch, "BRAND GUIDELINES", "Helvetica", 18, Charlie_ORANGE)
    # Divider
    c.setStrokeColor(Charlie_ORANGE)
    c.setLineWidth(1)
    c.line(0.5*inch, H - 2.05*inch, W - 0.5*inch, H - 2.05*inch)

    # Descripción
    text(c, 0.5*inch, H - 2.45*inch, "Definiciones gráficas oficiales de Charlie Platform.", "Helvetica", 12, colors.HexColor("#CCCCCC"))
    text(c, 0.5*inch, H - 2.7*inch, "Colores · Tipografía · Escala · Uso de marca", "Helvetica", 12, colors.HexColor("#888888"))

    # Color dots decorativos
    dot_colors = [Charlie_ORANGE, Charlie_CELESTE, Charlie_GREEN, colors.HexColor("#555555")]
    dot_x = 0.5*inch
    dot_y = H*0.38 - 0.6*inch
    for dc in dot_colors:
        c.setFillColor(dc)
        c.circle(dot_x, dot_y, 0.12*inch, fill=1, stroke=0)
        dot_x += 0.36*inch

    # Frase marca
    text(c, 0.5*inch, 1.8*inch, '"El código viaja. Los datos no."', "Helvetica-Oblique", 14, Charlie_BLACK)
    text(c, 0.5*inch, 0.55*inch, "Versión 1.0  ·  2025  ·  Uso interno", "Helvetica", 9, Charlie_BLACK)

    c.showPage()

# ══════════════════════════════════════════════════════════
# PAGE 2 — COLORES
# ══════════════════════════════════════════════════════════
def page_colors(c):
    header(c, "Identidad de Color")
    M = 0.45*inch
    CW = W - 2*M
    Y = H - 0.82*inch

    section_title(c, M, Y, "Paleta Oficial Charlie Platform")
    Y -= 0.28*inch

    # ── Primarios ──
    text(c, M, Y, "PRIMARIOS", "Helvetica-Bold", 8, Charlie_GRAY_M)
    Y -= 0.2*inch

    swatches_p = [
        (Charlie_BLACK,  "#1A1A1A", "Negro Charlie",   "Color base. Fondos principales,\ntextos de alto contraste."),
        (Charlie_ORANGE, "#F26522", "Naranja Charlie",  "Color principal de marca.\nAcentos, CTAs, destacados."),
        (Charlie_WHITE,  "#FFFFFF", "Blanco",           "Fondo limpio. Superficies\ny áreas de contenido."),
    ]

    sw_w = CW / 3 - 0.1*inch
    sw_h = 1.1*inch
    sx = M
    for (col, hex_val, name, desc) in swatches_p:
        # color block
        rect(c, sx, Y - sw_h, sw_w, sw_h, col,
             stroke=Charlie_BORDER if col == Charlie_WHITE else None, sw=0.5)
        # label area
        rect(c, sx, Y - sw_h - 0.85*inch, sw_w, 0.85*inch, Charlie_GRAY_L)
        text(c, sx + 0.1*inch, Y - sw_h - 0.22*inch, name, "Helvetica-Bold", 9, Charlie_BLACK)
        text(c, sx + 0.1*inch, Y - sw_h - 0.38*inch, hex_val, "Helvetica", 8, Charlie_GRAY_M)
        # desc multi-line
        lines = desc.split("\n")
        ly = Y - sw_h - 0.55*inch
        for ln in lines:
            text(c, sx + 0.1*inch, ly, ln, "Helvetica", 7.5, Charlie_GRAY_D)
            ly -= 0.14*inch
        sx += sw_w + 0.15*inch

    Y -= sw_h + 0.85*inch + 0.3*inch

    # ── Secundarios ──
    text(c, M, Y, "SECUNDARIOS", "Helvetica-Bold", 8, Charlie_GRAY_M)
    Y -= 0.2*inch

    swatches_s = [
        (Charlie_CELESTE, "#29ABE2", "Celeste Charlie",  "Información técnica,\ndocumentación, estados."),
        (Charlie_GREEN,   "#39B54A", "Verde Charlie",    "Éxito, confirmación,\nestados positivos."),
    ]
    sw_w2 = CW / 2 - 0.1*inch
    sx = M
    for (col, hex_val, name, desc) in swatches_s:
        rect(c, sx, Y - sw_h, sw_w2, sw_h, col)
        rect(c, sx, Y - sw_h - 0.85*inch, sw_w2, 0.85*inch, Charlie_GRAY_L)
        text(c, sx + 0.1*inch, Y - sw_h - 0.22*inch, name, "Helvetica-Bold", 9, Charlie_BLACK)
        text(c, sx + 0.1*inch, Y - sw_h - 0.38*inch, hex_val, "Helvetica", 8, Charlie_GRAY_M)
        lines = desc.split("\n")
        ly = Y - sw_h - 0.55*inch
        for ln in lines:
            text(c, sx + 0.1*inch, ly, ln, "Helvetica", 7.5, Charlie_GRAY_D)
            ly -= 0.14*inch
        sx += sw_w2 + 0.18*inch

    Y -= sw_h + 0.85*inch + 0.3*inch

    # ── Neutros ──
    text(c, M, Y, "NEUTROS Y SEMÁNTICOS", "Helvetica-Bold", 8, Charlie_GRAY_M)
    Y -= 0.2*inch

    neutrals = [
        (Charlie_GRAY_D,  "#4B4B4B", "Gris Oscuro",    "Texto secundario"),
        (Charlie_GRAY_M,  "#9B9B9B", "Gris Medio",     "Captions, metadatos"),
        (Charlie_GRAY_L,  "#F0F0F0", "Gris Claro",     "Fondos alternativos"),
        (Charlie_BORDER,  "#E0E0E0", "Borde",          "Líneas divisoras"),
        (Charlie_RED,     "#E53935", "Rojo",           "Errores, confidencial"),
        (Charlie_AMBER,   "#F59E0B", "Ámbar",          "Advertencias"),
    ]
    sw_w3 = CW / 6 - 0.06*inch
    sw_h3 = 0.5*inch
    sx = M
    for (col, hex_val, name, use) in neutrals:
        rect(c, sx, Y - sw_h3, sw_w3, sw_h3, col,
             stroke=Charlie_BORDER if col in [Charlie_WHITE, Charlie_GRAY_L, Charlie_BORDER] else None, sw=0.5)
        text(c, sx + sw_w3/2, Y - sw_h3 - 0.18*inch, name, "Helvetica-Bold", 7, Charlie_BLACK, "center")
        text(c, sx + sw_w3/2, Y - sw_h3 - 0.3*inch, hex_val, "Helvetica", 7, Charlie_GRAY_M, "center")
        text(c, sx + sw_w3/2, Y - sw_h3 - 0.42*inch, use, "Helvetica", 6.5, Charlie_GRAY_D, "center")
        sx += sw_w3 + 0.09*inch

    Y -= sw_h3 + 0.55*inch + 0.3*inch

    # ── CSS Tokens ──
    section_title(c, M, Y, "Tokens CSS — Sistema de diseño")
    Y -= 0.28*inch

    tokens = [
        ("--Charlie-color-primary",    "#F26522",  "Naranja principal"),
        ("--Charlie-color-black",      "#1A1A1A",  "Negro base"),
        ("--Charlie-color-celeste",    "#29ABE2",  "Celeste secundario"),
        ("--Charlie-color-green",      "#39B54A",  "Verde secundario"),
        ("--Charlie-color-gray-dark",  "#4B4B4B",  "Texto secundario"),
        ("--Charlie-color-gray-mid",   "#9B9B9B",  "Captions"),
        ("--Charlie-color-gray-light", "#F0F0F0",  "Fondos"),
        ("--Charlie-color-border",     "#E0E0E0",  "Divisores"),
    ]
    col_w = [3.2*inch, 1.4*inch, 2.3*inch]
    for i, (token, val, desc) in enumerate(tokens):
        bg = Charlie_GRAY_L if i % 2 == 0 else Charlie_WHITE
        rect(c, M, Y - 0.22*inch, CW, 0.22*inch, bg)
        text(c, M + 0.08*inch, Y - 0.15*inch, token, "Helvetica", 8, Charlie_CELESTE)
        text(c, M + col_w[0], Y - 0.15*inch, val, "Helvetica", 8, Charlie_GRAY_D)
        text(c, M + col_w[0] + col_w[1], Y - 0.15*inch, desc, "Helvetica", 8, Charlie_GRAY_M)
        Y -= 0.22*inch

    c.showPage()

# ══════════════════════════════════════════════════════════
# PAGE 3 — TIPOGRAFÍA
# ══════════════════════════════════════════════════════════
def page_typography(c):
    header(c, "Tipografía")
    M = 0.45*inch
    CW = W - 2*M
    Y = H - 0.82*inch

    section_title(c, M, Y, "Sistema tipográfico")
    Y -= 0.32*inch

    # Nota sobre fuentes
    rect(c, M, Y - 0.55*inch, CW, 0.55*inch, colors.HexColor("#FFF8F0"))
    c.setStrokeColor(Charlie_ORANGE)
    c.setLineWidth(2.5)
    c.line(M, Y - 0.55*inch, M, Y)
    text(c, M + 0.15*inch, Y - 0.2*inch, "Sistema de fuentes: Helvetica / Helvetica Neue", "Helvetica-Bold", 9, Charlie_BLACK)
    text(c, M + 0.15*inch, Y - 0.36*inch, "Disponible nativamente en macOS, iOS, PDF. Alternativa web: Inter (Google Fonts, libre).", "Helvetica", 8.5, Charlie_GRAY_D)
    Y -= 0.75*inch

    # ── Escala tipográfica ──
    text(c, M, Y, "ESCALA TIPOGRÁFICA", "Helvetica-Bold", 8, Charlie_GRAY_M)
    Y -= 0.22*inch

    scale = [
        ("Display",      52, "Helvetica-Bold",    "Portadas y covers principales.",          "Charlie Platform"),
        ("H1 — Título",  28, "Helvetica-Bold",    "Títulos de sección principales.",          "Fundamentos del Sistema"),
        ("H2 — Sección", 20, "Helvetica-Bold",    "Subsecciones y bloques de contenido.",    "Data Zero — Principio"),
        ("H3 — Label",   13, "Helvetica-Bold",    "Labels, nombres de módulos, categorías.", "Capa 1 — Input Layer"),
        ("Body",         10, "Helvetica",         "Texto de cuerpo estándar.",               "Charlie opera dentro de la infraestructura del cliente."),
        ("Small / Meta",  8, "Helvetica",         "Metadatos, versiones, notas al pie.",     "v1.1 · Abril 2026 · Confidencial"),
        ("Caption",       7, "Helvetica-Oblique", "Leyendas de tabla, referencias.",         "Fuente: CAP 00 — Fundamentos"),
    ]

    for (label, size, font, desc, sample) in scale:
        # label col
        text(c, M, Y, label, "Helvetica", 7.5, Charlie_GRAY_M)
        text(c, M + 1.3*inch, Y, str(size) + "pt", "Helvetica", 7.5, Charlie_CELESTE)
        # sample
        sample_size = min(size, 22)  # cap for layout
        text(c, M + 1.9*inch, Y, sample[:48], font, sample_size, Charlie_BLACK)
        Y -= (sample_size * 0.8 + 6) / 72 * 72   # rough leading
        text(c, M + 1.9*inch, Y + 2, desc, "Helvetica", 7, Charlie_GRAY_M)
        # separator
        c.setStrokeColor(Charlie_BORDER)
        c.setLineWidth(0.5)
        c.line(M, Y - 6, M + CW, Y - 6)
        Y -= 0.22*inch

    Y -= 0.2*inch

    # ── Pesos tipográficos ──
    section_title(c, M, Y, "Pesos disponibles")
    Y -= 0.28*inch

    weights = [
        ("Helvetica-Bold",    "Bold",    "Títulos, labels, énfasis fuerte."),
        ("Helvetica",         "Regular", "Cuerpo de texto, descripciones."),
        ("Helvetica-Oblique", "Italic",  "Citas, notas, frase de marca."),
    ]
    ww = CW / 3 - 0.1*inch
    wx = M
    for (font, label, use) in weights:
        rect(c, wx, Y - 0.9*inch, ww, 0.9*inch, Charlie_GRAY_L)
        text(c, wx + ww/2, Y - 0.38*inch, "Aa", font, 32, Charlie_BLACK, "center")
        text(c, wx + ww/2, Y - 0.62*inch, label, "Helvetica-Bold", 8, Charlie_BLACK, "center")
        text(c, wx + ww/2, Y - 0.76*inch, use, "Helvetica", 7, Charlie_GRAY_M, "center")
        wx += ww + 0.15*inch

    Y -= 1.1*inch

    # ── Uso correcto e incorrecto ──
    section_title(c, M, Y, "Uso de tipografía — correcto e incorrecto")
    Y -= 0.28*inch

    cols = [CW/2 - 0.08*inch, CW/2 - 0.08*inch]
    # DO
    rect(c, M, Y - 2.2*inch, cols[0], 2.2*inch, colors.HexColor("#F0FAF1"))
    c.setStrokeColor(Charlie_GREEN)
    c.setLineWidth(2)
    c.line(M, Y - 2.2*inch, M, Y)
    text(c, M + 0.12*inch, Y - 0.2*inch, "✓  CORRECTO", "Helvetica-Bold", 8, Charlie_GREEN)
    dos = [
        "Usar Helvetica-Bold para H1 y H2.",
        "Usar Regular para cuerpo (10pt mínimo).",
        "Un solo tamaño de display por página.",
        "Alto contraste: negro sobre blanco.",
        "Alinear texto a la izquierda en contenido.",
    ]
    dy = Y - 0.42*inch
    for d in dos:
        text(c, M + 0.12*inch, dy, d, "Helvetica", 8, Charlie_GRAY_D)
        dy -= 0.2*inch

    # DON'T
    rx = M + cols[0] + 0.16*inch
    rect(c, rx, Y - 2.2*inch, cols[1], 2.2*inch, colors.HexColor("#FEF2F2"))
    c.setStrokeColor(Charlie_RED)
    c.setLineWidth(2)
    c.line(rx, Y - 2.2*inch, rx, Y)
    text(c, rx + 0.12*inch, Y - 0.2*inch, "✗  INCORRECTO", "Helvetica-Bold", 8, Charlie_RED)
    donts = [
        "Mezclar más de 2 familias tipográficas.",
        "Usar texto menor a 8pt en cuerpo.",
        "Colores de texto sobre fondos de bajo contraste.",
        "Texto en mayúsculas en párrafos largos.",
        "Hardcodear tamaños en componentes UI.",
    ]
    dy = Y - 0.42*inch
    for d in donts:
        text(c, rx + 0.12*inch, dy, d, "Helvetica", 8, Charlie_GRAY_D)
        dy -= 0.2*inch

    c.showPage()

# ══════════════════════════════════════════════════════════
# PAGE 4 — ESPACIADO Y ESCALA
# ══════════════════════════════════════════════════════════
def page_spacing(c):
    header(c, "Espaciado · Escala · Layout")
    M = 0.45*inch
    CW = W - 2*M
    Y = H - 0.82*inch

    section_title(c, M, Y, "Sistema de espaciado — Grilla base 4pt")
    Y -= 0.28*inch

    text(c, M, Y, "Todo el espaciado en Charlie sigue múltiplos de 4pt. Esto garantiza consistencia visual entre módulos y facilita la implementación con CSS tokens.", "Helvetica", 9, Charlie_GRAY_D)
    Y -= 0.3*inch

    spacing = [
        ("--m-space-1",  "4pt",   0.055*inch,  "Separación mínima entre elementos inline."),
        ("--m-space-2",  "8pt",   0.11*inch,   "Padding interno de componentes compactos."),
        ("--m-space-3",  "12pt",  0.165*inch,  "Gap entre ítems de lista."),
        ("--m-space-4",  "16pt",  0.22*inch,   "Padding estándar de cards y celdas."),
        ("--m-space-6",  "24pt",  0.33*inch,   "Separación entre secciones relacionadas."),
        ("--m-space-8",  "32pt",  0.44*inch,   "Margen entre bloques de contenido."),
        ("--m-space-12", "48pt",  0.66*inch,   "Separación entre secciones principales."),
        ("--m-space-16", "64pt",  0.88*inch,   "Margen de página / padding de layout."),
    ]

    bar_max = 3.5*inch
    for i, (token, val, size, desc) in enumerate(spacing):
        bg = Charlie_GRAY_L if i % 2 == 0 else Charlie_WHITE
        rect(c, M, Y - 0.24*inch, CW, 0.24*inch, bg)
        text(c, M + 0.08*inch, Y - 0.16*inch, token, "Helvetica", 8, Charlie_CELESTE)
        text(c, M + 1.6*inch, Y - 0.16*inch, val, "Helvetica-Bold", 8, Charlie_BLACK)
        # Visual bar
        bar_w = min(size * (bar_max / (0.88*inch)), bar_max)
        rect(c, M + 2.1*inch, Y - 0.19*inch, bar_w, 0.1*inch, Charlie_ORANGE)
        text(c, M + 2.1*inch + bar_w + 0.08*inch, Y - 0.16*inch, desc, "Helvetica", 7.5, Charlie_GRAY_M)
        Y -= 0.24*inch

    Y -= 0.3*inch

    # ── Border radius ──
    section_title(c, M, Y, "Border Radius")
    Y -= 0.28*inch

    radii = [
        ("--m-radius-sm",  "2px",   2,   "Inputs, tags pequeños."),
        ("--m-radius-md",  "6px",   6,   "Cards, modales, dropdowns. (Estándar)"),
        ("--m-radius-lg",  "12px",  12,  "Panels, sidebars, contenedores grandes."),
        ("--m-radius-xl",  "20px",  20,  "Botones pill, badges destacados."),
        ("--m-radius-full","9999px",36,  "Avatares, chips circulares."),
    ]

    rx = M
    box_s = 0.7*inch
    for (token, val, r_px, desc) in radii:
        # draw rounded rect preview
        c.setFillColor(Charlie_ORANGE)
        c.setStrokeColor(Charlie_BORDER)
        c.setLineWidth(0.5)
        r_pts = min(r_px * 0.75, box_s/2)
        c.roundRect(rx, Y - box_s, box_s, box_s, r_pts, fill=1, stroke=0)
        text(c, rx + box_s/2, Y - box_s - 0.16*inch, val, "Helvetica-Bold", 8, Charlie_BLACK, "center")
        text(c, rx + box_s/2, Y - box_s - 0.28*inch, token.replace("--m-radius-", ""), "Helvetica", 7, Charlie_GRAY_M, "center")
        rx += box_s + 0.14*inch

    Y -= box_s + 0.5*inch

    # ── Elevación / sombras ──
    section_title(c, M, Y, "Elevación — Sombras")
    Y -= 0.28*inch

    shadows = [
        ("--m-shadow-none", "Sin sombra",     "Elementos planos, tablas."),
        ("--m-shadow-sm",   "0 1px 3px rgba", "Cards en reposo, dropdowns."),
        ("--m-shadow-md",   "0 4px 12px rgba","Modales, tooltips."),
        ("--m-shadow-lg",   "0 8px 24px rgba","Overlays, drawers."),
    ]

    sw = CW / 4 - 0.1*inch
    sx = M
    for i, (token, label, use) in enumerate(shadows):
        rect(c, sx, Y - 0.6*inch, sw, 0.6*inch, Charlie_GRAY_L)
        # Simulate shadow with darker rect offset
        if i > 0:
            alpha_gray = colors.HexColor(["#CCCCCC","#BBBBBB","#AAAAAA"][i-1])
            rect(c, sx + 3*i, Y - 0.6*inch - 3*i, sw, 0.6*inch, alpha_gray)
            rect(c, sx, Y - 0.6*inch, sw, 0.6*inch, Charlie_WHITE)
        text(c, sx + sw/2, Y - 0.35*inch, f"Nivel {i}", "Helvetica-Bold", 9, Charlie_BLACK, "center")
        text(c, sx + sw/2, Y - 0.6*inch - 0.18*inch, label, "Helvetica-Bold", 7.5, Charlie_BLACK, "center")
        text(c, sx + sw/2, Y - 0.6*inch - 0.3*inch, use, "Helvetica", 7, Charlie_GRAY_M, "center")
        sx += sw + 0.13*inch

    Y -= 1.1*inch

    # ── Márgenes de página ──
    section_title(c, M, Y, "Márgenes de página y documento")
    Y -= 0.28*inch

    margins_data = [
        ("Documento PDF / impreso",    "1 inch (72pt) todos los lados"),
        ("Componente UI — padding",    "16px (--m-space-4) estándar"),
        ("Card interna",               "16–24px dependiendo del nivel"),
        ("Tabla — celda",              "8px vertical · 12px horizontal"),
        ("Header de sección",          "24–32px superior antes del título"),
    ]
    for i, (ctx, val) in enumerate(margins_data):
        bg = Charlie_GRAY_L if i % 2 == 0 else Charlie_WHITE
        rect(c, M, Y - 0.22*inch, CW, 0.22*inch, bg)
        text(c, M + 0.1*inch, Y - 0.15*inch, ctx, "Helvetica", 8.5, Charlie_BLACK)
        text(c, M + 3.5*inch, Y - 0.15*inch, val, "Helvetica-Bold", 8.5, Charlie_CELESTE)
        Y -= 0.22*inch

    c.showPage()

# ══════════════════════════════════════════════════════════
# PAGE 5 — MARCA Y USO
# ══════════════════════════════════════════════════════════
def page_brand(c):
    header(c, "Marca · Identidad · Uso")
    M = 0.45*inch
    CW = W - 2*M
    Y = H - 0.82*inch

    section_title(c, M, Y, "Wordmark — Charlie")
    Y -= 0.28*inch

    # Wordmark sobre fondo blanco
    rect(c, M, Y - 1.1*inch, CW/2 - 0.1*inch, 1.1*inch, Charlie_WHITE,
         stroke=Charlie_BORDER, sw=0.5)
    text(c, M + (CW/2 - 0.1*inch)/2, Y - 0.6*inch, "Charlie", "Helvetica-Bold", 32, Charlie_BLACK, "center")
    text(c, M + (CW/2 - 0.1*inch)/2, Y - 0.9*inch, "Fondo blanco", "Helvetica", 7, Charlie_GRAY_M, "center")

    # Wordmark sobre fondo negro
    rx = M + CW/2 + 0.1*inch
    rect(c, rx, Y - 1.1*inch, CW/2 - 0.1*inch, 1.1*inch, Charlie_BLACK)
    text(c, rx + (CW/2 - 0.1*inch)/2, Y - 0.6*inch, "Charlie", "Helvetica-Bold", 32, Charlie_WHITE, "center")
    text(c, rx + (CW/2 - 0.1*inch)/2, Y - 0.9*inch, "Fondo negro", "Helvetica", 7, Charlie_GRAY_M, "center")

    Y -= 1.3*inch

    # Wordmark con naranja
    rect(c, M, Y - 1.1*inch, CW/2 - 0.1*inch, 1.1*inch, Charlie_BLACK)
    text(c, M + (CW/2 - 0.1*inch)/2, Y - 0.5*inch, "Charlie", "Helvetica-Bold", 32, Charlie_ORANGE, "center")
    text(c, M + (CW/2 - 0.1*inch)/2, Y - 0.78*inch, "PLATFORM", "Helvetica", 11, Charlie_WHITE, "center")
    text(c, M + (CW/2 - 0.1*inch)/2, Y - 0.95*inch, "Con descriptor", "Helvetica", 7, Charlie_GRAY_M, "center")

    # Tagline
    rx = M + CW/2 + 0.1*inch
    rect(c, rx, Y - 1.1*inch, CW/2 - 0.1*inch, 1.1*inch, Charlie_ORANGE)
    text(c, rx + (CW/2 - 0.1*inch)/2, Y - 0.52*inch, "Charlie", "Helvetica-Bold", 28, Charlie_BLACK, "center")
    text(c, rx + (CW/2 - 0.1*inch)/2, Y - 0.78*inch, "El código viaja. Los datos no.", "Helvetica-Oblique", 8, Charlie_BLACK, "center")
    text(c, rx + (CW/2 - 0.1*inch)/2, Y - 0.95*inch, "Sobre fondo naranja", "Helvetica", 7, Charlie_BLACK, "center")

    Y -= 1.4*inch

    # ── Usos correctos e incorrectos ──
    section_title(c, M, Y, "Uso de marca — normas")
    Y -= 0.28*inch

    cols_w = CW / 2 - 0.1*inch
    # DO
    rect(c, M, Y - 2.0*inch, cols_w, 2.0*inch, colors.HexColor("#F0FAF1"))
    c.setStrokeColor(Charlie_GREEN)
    c.setLineWidth(2)
    c.line(M, Y - 2.0*inch, M, Y)
    text(c, M + 0.12*inch, Y - 0.2*inch, "✓  USOS PERMITIDOS", "Helvetica-Bold", 8, Charlie_GREEN)
    dos = [
        "Wordmark en negro sobre fondo blanco.",
        "Wordmark en blanco sobre fondo negro.",
        "Wordmark en negro o blanco sobre naranja.",
        "\"Charlie Platform\" como nombre completo.",
        "Frase de marca en itálica bajo el nombre.",
        "Logo acompañado siempre de texto visible.",
    ]
    dy = Y - 0.42*inch
    for d in dos:
        text(c, M + 0.12*inch, dy, d, "Helvetica", 8, Charlie_GRAY_D)
        dy -= 0.23*inch

    # DON'T
    rx = M + cols_w + 0.2*inch
    rect(c, rx, Y - 2.0*inch, cols_w, 2.0*inch, colors.HexColor("#FEF2F2"))
    c.setStrokeColor(Charlie_RED)
    c.setLineWidth(2)
    c.line(rx, Y - 2.0*inch, rx, Y)
    text(c, rx + 0.12*inch, Y - 0.2*inch, "✗  USOS NO PERMITIDOS", "Helvetica-Bold", 8, Charlie_RED)
    donts = [
        "Estirar o deformar el wordmark.",
        "Cambiar la tipografía por otra familia.",
        "Aplicar degradados al texto del logo.",
        "Usar sobre fondos de bajo contraste.",
        "Combinar con otros colores no aprobados.",
        "Wordmark sin espacio de respiro mínimo.",
    ]
    dy = Y - 0.42*inch
    for d in donts:
        text(c, rx + 0.12*inch, dy, d, "Helvetica", 8, Charlie_GRAY_D)
        dy -= 0.23*inch

    Y -= 2.2*inch

    # ── Frase de marca ──
    section_title(c, M, Y, "Frase de marca")
    Y -= 0.28*inch

    rect(c, M, Y - 0.8*inch, CW, 0.8*inch, Charlie_BLACK)
    c.setStrokeColor(Charlie_ORANGE)
    c.setLineWidth(3)
    c.line(M, Y - 0.8*inch, M, Y)
    text(c, M + CW/2, Y - 0.42*inch,
         '"El código viaja. Los datos no."',
         "Helvetica-Oblique", 16, Charlie_WHITE, "center")

    Y -= 1.05*inch

    text(c, M, Y, "La frase de marca resume el principio Data Zero: Charlie opera en la infraestructura del cliente.", "Helvetica", 8.5, Charlie_GRAY_D)
    Y -= 0.18*inch
    text(c, M, Y, "Siempre en itálica. Puede aparecer en blanco sobre negro, negro sobre naranja, o naranja sobre negro.", "Helvetica", 8.5, Charlie_GRAY_D)

    c.showPage()

# ══════════════════════════════════════════════════════════
# PAGE 6 — COMPONENTES UI
# ══════════════════════════════════════════════════════════
def page_components(c):
    header(c, "Componentes UI — Referencia visual")
    M = 0.45*inch
    CW = W - 2*M
    Y = H - 0.82*inch

    section_title(c, M, Y, "Botones")
    Y -= 0.28*inch

    buttons = [
        (Charlie_ORANGE, Charlie_WHITE,  "Primario",   "Acción principal. CTA."),
        (Charlie_BLACK,  Charlie_WHITE,  "Secundario", "Acciones importantes no primarias."),
        (Charlie_WHITE,  Charlie_BLACK,  "Outline",    "Acciones terciarias. Borde visible."),
        (Charlie_GRAY_L, Charlie_GRAY_D, "Ghost",      "Acciones de menor peso visual."),
    ]

    bx = M
    for (bg, fg, label, desc) in buttons:
        bw = 1.3*inch
        bh = 0.36*inch
        rect(c, bx, Y - bh, bw, bh, bg,
             stroke=Charlie_BORDER if bg == Charlie_WHITE else None, sw=0.8)
        # Simulate rounded corners with text
        text(c, bx + bw/2, Y - bh + 0.1*inch, label, "Helvetica-Bold", 9, fg, "center")
        text(c, bx + bw/2, Y - bh - 0.18*inch, label, "Helvetica-Bold", 7.5, Charlie_BLACK, "center")
        text(c, bx + bw/2, Y - bh - 0.3*inch, desc, "Helvetica", 6.5, Charlie_GRAY_M, "center")
        bx += bw + 0.18*inch

    Y -= 0.8*inch

    # ── Badges / Tags ──
    section_title(c, M, Y, "Badges y Estados")
    Y -= 0.28*inch

    badges = [
        (Charlie_GREEN,    Charlie_WHITE,  "✓ Activo"),
        (Charlie_RED,      Charlie_WHITE,  "✗ Bloqueado"),
        (Charlie_AMBER,    Charlie_BLACK,  "⚠ Pendiente"),
        (Charlie_CELESTE,  Charlie_WHITE,  "● En progreso"),
        (Charlie_GRAY_L,   Charlie_GRAY_D, "○ Inactivo"),
        (Charlie_BLACK,    Charlie_ORANGE, "★ Compliant"),
    ]

    bx = M
    for (bg, fg, label) in badges:
        bw = 0.9*inch
        bh = 0.25*inch
        rect(c, bx, Y - bh, bw, bh, bg)
        text(c, bx + bw/2, Y - bh + 0.07*inch, label, "Helvetica-Bold", 7.5, fg, "center")
        bx += bw + 0.1*inch

    Y -= 0.55*inch

    # ── Tabla ──
    section_title(c, M, Y, "Tabla — Estilo estándar Charlie")
    Y -= 0.28*inch

    table_rows = [
        ("Módulo",       "Estado",       "Versión", "Criterios"),
        ("envios",       "✓ Compliant",  "v2.1",    "C1–C8 ✓"),
        ("inventario",   "● Progreso",   "v1.4",    "C1–C6 ✓"),
        ("clientes_crm", "⚠ Bloqueado",  "v0.9",    "C7, C8 ✗"),
        ("logistica",    "✓ Compliant",  "v3.0",    "C1–C8 ✓"),
    ]

    col_ws = [2.2*inch, 1.5*inch, 0.9*inch, 1.7*inch]
    total_tw = sum(col_ws)

    for ri, row in enumerate(table_rows):
        rh = 0.24*inch
        if ri == 0:
            bg = Charlie_BLACK
            fg = Charlie_WHITE
            font = "Helvetica-Bold"
        elif ri % 2 == 0:
            bg = Charlie_GRAY_L
            fg = Charlie_BLACK
            font = "Helvetica"
        else:
            bg = Charlie_WHITE
            fg = Charlie_BLACK
            font = "Helvetica"

        cx = M
        for ci, cell in enumerate(row):
            rect(c, cx, Y - rh, col_ws[ci], rh, bg,
                 stroke=Charlie_BORDER, sw=0.3)
            cell_color = fg
            if ri > 0 and ci == 1:
                if "Compliant" in cell: cell_color = Charlie_GREEN
                elif "Bloqueado" in cell: cell_color = Charlie_RED
                elif "Progreso" in cell: cell_color = Charlie_AMBER
            text(c, cx + 0.1*inch, Y - rh + 0.07*inch, cell, font, 8, cell_color)
            cx += col_ws[ci]
        Y -= rh

    Y -= 0.35*inch

    # ── Callout / Alerta ──
    section_title(c, M, Y, "Callouts — Bloques de información")
    Y -= 0.28*inch

    callouts = [
        (Charlie_ORANGE, colors.HexColor("#FFF3EB"), "Nota importante", "Usar para destacar información clave que el lector no debe omitir."),
        (Charlie_RED,    colors.HexColor("#FEF2F2"),  "Confidencial",    "Documentos de uso interno. No distribuir fuera de Charlie Platform."),
        (Charlie_CELESTE,colors.HexColor("#EAF7FD"),  "Técnico",         "Criterios, implementaciones y definiciones de arquitectura."),
        (Charlie_GREEN,  colors.HexColor("#F0FAF1"),  "Completado",      "El módulo cumple el estándar C1–C8. Listo para producción."),
    ]

    ch = 0.65*inch
    cw = CW / 2 - 0.1*inch
    cx = M
    cy = Y
    for i, (border_col, bg_col, label, desc) in enumerate(callouts):
        if i == 2:
            cx = M
            cy = Y - ch - 0.15*inch
        rect(c, cx, cy - ch, cw, ch, bg_col)
        c.setStrokeColor(border_col)
        c.setLineWidth(3)
        c.line(cx, cy - ch, cx, cy)
        text(c, cx + 0.15*inch, cy - 0.22*inch, label, "Helvetica-Bold", 8.5, Charlie_BLACK)
        text(c, cx + 0.15*inch, cy - 0.4*inch, desc, "Helvetica", 8, Charlie_GRAY_D)
        cx += cw + 0.2*inch

    c.showPage()

# ══════════════════════════════════════════════════════════
# PAGE 7 — RESUMEN DE TOKENS
# ══════════════════════════════════════════════════════════
def page_tokens(c):
    header(c, "Resumen de Tokens — Referencia rápida")
    M = 0.45*inch
    CW = W - 2*M
    Y = H - 0.82*inch

    section_title(c, M, Y, "Tabla maestra de tokens CSS — Charlie Platform")
    Y -= 0.28*inch

    text(c, M, Y, "Referencia completa de variables CSS disponibles para módulos. Todo valor de diseño debe expresarse como token.", "Helvetica", 9, Charlie_GRAY_D)
    Y -= 0.28*inch

    all_tokens = [
        # HEADER
        ("TOKEN", "VALOR", "CATEGORÍA", "USO", True),
        # Colors
        ("--Charlie-color-primary",     "#F26522",  "Color",     "Naranja — acción principal, acentos", False),
        ("--Charlie-color-black",       "#1A1A1A",  "Color",     "Base — fondos oscuros, texto fuerte", False),
        ("--Charlie-color-white",       "#FFFFFF",  "Color",     "Fondos limpios, superficies", False),
        ("--Charlie-color-celeste",     "#29ABE2",  "Color",     "Secundario — técnico, estados", False),
        ("--Charlie-color-green",       "#39B54A",  "Color",     "Secundario — éxito, confirmación", False),
        ("--Charlie-color-gray-dark",   "#4B4B4B",  "Color",     "Texto secundario", False),
        ("--Charlie-color-gray-mid",    "#9B9B9B",  "Color",     "Captions, metadatos", False),
        ("--Charlie-color-gray-light",  "#F0F0F0",  "Color",     "Fondos alternativos, zebra", False),
        ("--Charlie-color-border",      "#E0E0E0",  "Color",     "Líneas divisoras, bordes de tabla", False),
        ("--Charlie-color-error",       "#E53935",  "Color",     "Errores, estado bloqueado, confidencial", False),
        ("--Charlie-color-warning",     "#F59E0B",  "Color",     "Advertencias, estado pendiente", False),
        # Typography
        ("--m-font-family",             "Helvetica Neue, Helvetica, Arial", "Tipografía", "Familia principal", False),
        ("--m-font-size-xs",            "7pt / 9px",   "Tipografía", "Caption, leyendas", False),
        ("--m-font-size-sm",            "8pt / 10px",  "Tipografía", "Meta, notas al pie", False),
        ("--m-font-size-base",          "10pt / 13px", "Tipografía", "Cuerpo estándar", False),
        ("--m-font-size-md",            "12pt / 16px", "Tipografía", "Labels, subtítulos pequeños", False),
        ("--m-font-size-lg",            "16pt / 21px", "Tipografía", "H3, subtítulos", False),
        ("--m-font-size-xl",            "20pt / 26px", "Tipografía", "H2, secciones", False),
        ("--m-font-size-2xl",           "28pt / 37px", "Tipografía", "H1, títulos principales", False),
        ("--m-font-size-display",       "48pt+",       "Tipografía", "Display, portadas", False),
        # Spacing
        ("--m-space-1",  "4pt",   "Espaciado", "Mínimo entre elementos inline", False),
        ("--m-space-2",  "8pt",   "Espaciado", "Padding componentes compactos", False),
        ("--m-space-4",  "16pt",  "Espaciado", "Padding estándar de cards", False),
        ("--m-space-6",  "24pt",  "Espaciado", "Separación entre secciones", False),
        ("--m-space-8",  "32pt",  "Espaciado", "Margen entre bloques", False),
        ("--m-space-12", "48pt",  "Espaciado", "Separación secciones principales", False),
        # Radius
        ("--m-radius-sm",   "2px",    "Radius", "Inputs, tags pequeños", False),
        ("--m-radius-md",   "6px",    "Radius", "Cards, modales (estándar)", False),
        ("--m-radius-lg",   "12px",   "Radius", "Panels, contenedores grandes", False),
        ("--m-radius-full", "9999px", "Radius", "Avatares, chips circulares", False),
        # Shadow
        ("--m-shadow-sm", "0 1px 3px rgba(0,0,0,.12)",  "Sombra", "Cards en reposo", False),
        ("--m-shadow-md", "0 4px 12px rgba(0,0,0,.15)", "Sombra", "Modales, tooltips", False),
        ("--m-shadow-lg", "0 8px 24px rgba(0,0,0,.18)", "Sombra", "Overlays, drawers", False),
    ]

    col_ws = [2.4*inch, 1.6*inch, 0.9*inch, 2.4*inch]

    for ri, row_data in enumerate(all_tokens):
        token, val, cat, use, is_hdr = row_data
        rh = 0.19*inch
        if is_hdr:
            bg = Charlie_BLACK
        elif ri % 2 == 0:
            bg = Charlie_GRAY_L
        else:
            bg = Charlie_WHITE

        cx = M
        cells = [token, val, cat, use]
        for ci, cell in enumerate(cells):
            rect(c, cx, Y - rh, col_ws[ci], rh, bg,
                 stroke=Charlie_BORDER, sw=0.3)
            if is_hdr:
                text(c, cx + 0.07*inch, Y - rh + 0.06*inch, cell, "Helvetica-Bold", 7.5, Charlie_WHITE)
            else:
                col_color = Charlie_CELESTE if ci == 0 else (Charlie_GRAY_M if ci == 2 else Charlie_BLACK)
                text(c, cx + 0.07*inch, Y - rh + 0.06*inch, cell, "Helvetica", 7.5, col_color)
            cx += col_ws[ci]
        Y -= rh
        if Y < 0.65*inch:
            break

    c.showPage()

# ══════════════════════════════════════════════════════════
# BUILD PDF
# ══════════════════════════════════════════════════════════
from reportlab.lib.pagesizes import A4

def build():
    c = canvas.Canvas(str(OUT), pagesize=A4)

    c.setTitle("Charlie Platform — Brand Guidelines v1.0")
    c.setAuthor("Charlie")
    c.setSubject("Identidad gráfica, colores, tipografía, tokens de diseño")

    page_cover(c)
    page_colors(c)
    page_typography(c)
    page_spacing(c)
    page_brand(c)
    page_components(c)
    page_tokens(c)

    c.save()
    print(f"✅ {OUT}")

build()


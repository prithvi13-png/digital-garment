from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path('/Users/prithvi/Desktop/digital-factory-management-system')
ASSETS = ROOT / 'deliverables' / 'assets'

REPORT_MD = ROOT / 'PROJECT_REPORT_CLIENT.md'
PITCH_MD = ROOT / 'PROJECT_PITCH_CLIENT.md'

REPORT_PDF = ROOT / 'PROJECT_REPORT_CLIENT.pdf'
PITCH_PDF = ROOT / 'PROJECT_PITCH_CLIENT.pdf'

LOGO = ASSETS / 'logo.png'
SCREENSHOT = ASSETS / 'ui_screenshot.png'
ARCH = ASSETS / 'architecture.png'
COVERAGE = ASSETS / 'coverage.png'
SEED = ASSETS / 'seed_snapshot.png'
ROI = ASSETS / 'roi_projection.png'
ROADMAP = ASSETS / 'roadmap.png'


def styles():
    s = getSampleStyleSheet()
    s.add(
        ParagraphStyle(
            name='DocTitle',
            parent=s['Heading1'],
            fontSize=22,
            leading=28,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=10,
        )
    )
    s.add(
        ParagraphStyle(
            name='DocSubTitle',
            parent=s['Normal'],
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#334155'),
            spaceAfter=14,
        )
    )
    s.add(
        ParagraphStyle(
            name='H2Blue',
            parent=s['Heading2'],
            fontSize=15,
            leading=20,
            textColor=colors.HexColor('#1d4ed8'),
            spaceBefore=9,
            spaceAfter=7,
        )
    )
    s.add(
        ParagraphStyle(
            name='H3Dark',
            parent=s['Heading3'],
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#0f172a'),
            spaceBefore=7,
            spaceAfter=5,
        )
    )
    s.add(
        ParagraphStyle(
            name='BodyTextCustom',
            parent=s['BodyText'],
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor('#1e293b'),
            spaceAfter=5,
        )
    )
    s.add(
        ParagraphStyle(
            name='BulletTextCustom',
            parent=s['BodyText'],
            fontSize=10.5,
            leading=15,
            leftIndent=13,
            bulletIndent=3,
            textColor=colors.HexColor('#1e293b'),
            spaceAfter=2,
        )
    )
    return s


def add_cover(story, title: str, subtitle: str, s):
    if LOGO.exists():
        img = Image(str(LOGO), width=3.0 * cm, height=2.4 * cm)
        story.append(img)
        story.append(Spacer(1, 0.2 * cm))

    story.append(Paragraph(title, s['DocTitle']))
    story.append(Paragraph(subtitle, s['DocSubTitle']))

    if SCREENSHOT.exists():
        story.append(Image(str(SCREENSHOT), width=17.5 * cm, height=10.5 * cm))
        story.append(Spacer(1, 0.3 * cm))

    table = Table(
        [[Paragraph('Digital Factory Management System', s['BodyTextCustom'])]],
        colWidths=[17.5 * cm],
    )
    table.setStyle(
        TableStyle(
            [
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#eff6ff')),
                ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#bfdbfe')),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 0.5 * cm))


def markdown_to_story(md_path: Path, story, s):
    lines = md_path.read_text(encoding='utf-8').splitlines()

    for raw in lines:
        line = raw.strip()
        if not line:
            story.append(Spacer(1, 0.1 * cm))
            continue

        if line.startswith('---'):
            story.append(Spacer(1, 0.2 * cm))
            continue

        if line.startswith('### '):
            story.append(Paragraph(line[4:].strip(), s['H3Dark']))
            continue

        if line.startswith('## '):
            story.append(Paragraph(line[3:].strip(), s['H2Blue']))
            continue

        if line.startswith('# '):
            story.append(Paragraph(line[2:].strip(), s['DocTitle']))
            continue

        if line.startswith('```'):
            continue

        if line.startswith('- '):
            story.append(Paragraph(line[2:].strip(), s['BulletTextCustom'], bulletText='•'))
            continue

        # numbered lists like: 1. item
        if len(line) > 3 and line[0].isdigit() and line[1] == '.' and line[2] == ' ':
            story.append(Paragraph(line[3:].strip(), s['BulletTextCustom'], bulletText='•'))
            continue

        # bold lines with **label**: value
        line = line.replace('**', '')
        story.append(Paragraph(line, s['BodyTextCustom']))


def add_visual_section(story, s, include_seed=True, include_roi=False):
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph('Visual Appendix', s['H2Blue']))

    visuals = [
        ('Architecture Overview', ARCH, 16.5, 6.8),
        ('Delivered Capability Coverage', COVERAGE, 16.5, 7.2),
        ('Roadmap View', ROADMAP, 16.5, 5.2),
    ]

    if include_seed:
        visuals.insert(2, ('CRM Seed Snapshot', SEED, 16.5, 6.8))

    if include_roi:
        visuals.insert(2, ('ROI Projection', ROI, 16.5, 6.8))

    for title, path, w, h in visuals:
        if path.exists():
            story.append(Paragraph(title, s['H3Dark']))
            story.append(Image(str(path), width=w * cm / 2.54, height=h * cm / 2.54))
            story.append(Spacer(1, 0.25 * cm))


def build_pdf(source_md: Path, out_pdf: Path, title: str, subtitle: str, *, include_seed: bool, include_roi: bool):
    s = styles()
    doc = SimpleDocTemplate(
        str(out_pdf),
        pagesize=A4,
        leftMargin=1.6 * cm,
        rightMargin=1.6 * cm,
        topMargin=1.2 * cm,
        bottomMargin=1.2 * cm,
        title=title,
    )

    story = []
    add_cover(story, title, subtitle, s)
    markdown_to_story(source_md, story, s)
    add_visual_section(story, s, include_seed=include_seed, include_roi=include_roi)

    doc.build(story)


def main():
    build_pdf(
        REPORT_MD,
        REPORT_PDF,
        'Digital Factory Management System - End-to-End Detailed Project Report',
        'Client Handover Document | Generated as PDF',
        include_seed=True,
        include_roi=False,
    )
    build_pdf(
        PITCH_MD,
        PITCH_PDF,
        'Digital Factory Management System - Client Pitch Report',
        'Business Pitch Document | Generated as PDF',
        include_seed=False,
        include_roi=True,
    )
    print('Generated PDFs:')
    print(REPORT_PDF)
    print(PITCH_PDF)


if __name__ == '__main__':
    main()

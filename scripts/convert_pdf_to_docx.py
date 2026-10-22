import sys
import os
import re
import copy
import argparse
from pdf2docx import Converter
import docx
from docx.shared import Pt
from docx.oxml import OxmlElement
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH

def refine_docx(docx_path):
    """
    Targeted refinements:
    1. Header: Keep top logo table row height natural so 'PERJANJIAN KERJA SAMA' is never cut off/clipped.
    2. Footer: Keep Paraf stamp tables on current page (prevent spilling to page 2).
    3. Nomor section: 2 clean centered lines matching PDF.
    4. Clause I & II: Match PDF indentations (I. at 11.3 pt, lines under PT at 26.1 pt) and add missing space after comma.
    """
    try:
        doc = docx.Document(docx_path)

        # 1. Optimize Paraf stamp tables so they fit cleanly at the bottom without spilling across pages
        for tbl in doc.tables:
            txt = tbl.rows[0].cells[0].text if tbl.rows and tbl.rows[0].cells else ""
            if "Paraf" in txt or "PIHAK PERTAMA" in txt:
                tbl.alignment = WD_TABLE_ALIGNMENT.RIGHT
                for row in tbl.rows:
                    trPr = row._tr.get_or_add_trPr()
                    if not trPr.xpath('w:cantSplit'):
                        cant_split = OxmlElement('w:cantSplit')
                        trPr.append(cant_split)
                    for cell in row.cells:
                        for p in cell.paragraphs:
                            p.paragraph_format.space_before = Pt(0)
                            p.paragraph_format.space_after = Pt(0)

        # 2. Configure image layers & wrapping:
        # Watermark, background logos, and page graphics MUST be positioned BEHIND text (behindDoc='1')
        # matching original PDF appearance so that text (such as exam questions, legal clauses, tables)
        # remains 100% visible, fully readable, and editable in front without being obscured by the logo.
        for anchor in doc._element.xpath('.//wp:anchor'):
            extent = anchor.find(docx.oxml.ns.qn('wp:extent'))
            cx = int(extent.get('cx', 0)) if extent is not None else 0
            cy = int(extent.get('cy', 0)) if extent is not None else 0
            aspect = (cx / max(1, cy)) if cy > 0 else 1.0

            # Narrow top-edge header strip banner (e.g. JUKOMTEK journal banner: wide & very flat at page top edge)
            is_top_banner_strip = False
            posV = anchor.find(docx.oxml.ns.qn('wp:positionV'))
            if posV is not None:
                offset_el = posV.find(docx.oxml.ns.qn('wp:posOffset'))
                if offset_el is not None:
                    try:
                        v_offset = int(offset_el.text or 0)
                        if v_offset < 700000 and aspect > 4.5:
                            is_top_banner_strip = True
                    except:
                        pass

            if is_top_banner_strip:
                anchor.set('behindDoc', '0')
            else:
                # Set behindDoc='1' (Behind Text) so all text stays in the foreground, exactly like in the original PDF
                anchor.set('behindDoc', '1')

                # Ensure wrapping is wrapNone so text flows naturally over the watermark/logo without being pushed away
                wrap_tags = [
                    docx.oxml.ns.qn('wp:wrapSquare'),
                    docx.oxml.ns.qn('wp:wrapTight'),
                    docx.oxml.ns.qn('wp:wrapThrough'),
                    docx.oxml.ns.qn('wp:wrapTopAndBottom'),
                    docx.oxml.ns.qn('wp:wrapNone'),
                ]
                found_wrap = None
                for child in list(anchor):
                    if child.tag in wrap_tags:
                        found_wrap = child
                        break

                if found_wrap is not None:
                    if found_wrap.tag != docx.oxml.ns.qn('wp:wrapNone'):
                        wrap_none = OxmlElement('wp:wrapNone')
                        anchor.replace(found_wrap, wrap_none)
                else:
                    docPr = anchor.find(docx.oxml.ns.qn('wp:docPr'))
                    wrap_none = OxmlElement('wp:wrapNone')
                    if docPr is not None:
                        docPr.addprevious(wrap_none)
                    else:
                        anchor.append(wrap_none)

        # Remove occluded header text covered by top banner
        for p in list(doc.paragraphs[:6]):
            t = p.text.strip()
            if any(k in t for k in ['JUKOMTEK', 'E-ISSN', 'P-ISSN']) and not p._p.xpath('.//w:drawing'):
                p._p.getparent().remove(p._p)

        # 3. Clean empty spacer paragraphs, format Nomor & Clauses, fix indentation & mid-sentence tabs
        for p in doc.paragraphs:
            t = p.text.strip()

            # Deteksi gambar/drawing dalam paragraf agar gambar tidak terpotong/hilang
            extents = p._p.xpath('.//wp:extent')
            has_real_image = False
            has_line_drawing = False
            for ext in extents:
                cy = int(ext.get('cy', 0))
                if cy > 127000:  # Tinggi > 10pt adalah gambar/logo nyata
                    has_real_image = True
                else:
                    has_line_drawing = True

            if not t:
                has_sect_pr = bool(p._p.xpath('.//w:sectPr'))
                if has_real_image:
                    # JANGAN ubah paragraf gambar/logo agar tetap utuh dan tampil sempurna
                    continue
                elif has_line_drawing:
                    # Garis pemisah horizontal tipis: cukup nolkan spasi ekstra
                    p.paragraph_format.space_before = Pt(0)
                    p.paragraph_format.space_after = Pt(0)
                elif not has_sect_pr:
                    # Paragraf kosong spasi tanpa gambar
                    p.paragraph_format.space_before = Pt(0)
                    p.paragraph_format.space_after = Pt(0)
                    p.paragraph_format.line_spacing = Pt(1)
                continue

            # Format Nomor: 2 baris centered rapi dengan mempertahankan font asli dokumen
            if "Nomor PT PLN" in t and "Nomor INSTITUT" in t:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p.paragraph_format.left_indent = Pt(0)
                p.paragraph_format.first_line_indent = Pt(0)
                p.paragraph_format.right_indent = Pt(0)

                # Capture format font asli dokumen (rFonts, sz, bold, color)
                sample_rPr = None
                sample_font_name = None
                sample_font_size = None
                for r in p.runs:
                    if r._r.rPr is not None and r._r.rPr.find(docx.oxml.ns.qn('w:rFonts')) is not None:
                        sample_rPr = copy.deepcopy(r._r.rPr)
                        break
                    if r.font.name:
                        sample_font_name = r.font.name
                    if r.font.size:
                        sample_font_size = r.font.size

                if sample_rPr is None and not sample_font_name:
                    for other_p in doc.paragraphs:
                        for r in other_p.runs:
                            if r._r.rPr is not None and r._r.rPr.find(docx.oxml.ns.qn('w:rFonts')) is not None:
                                sample_rPr = copy.deepcopy(r._r.rPr)
                                break
                        if sample_rPr is not None:
                            break

                m = re.search(r'(Nomor\s+PT\s+PLN[^\n]+?)(Nomor\s+INSTITUT[^\n]+)', p.text)
                if m:
                    line1 = m.group(1).replace('\t', '').strip()
                    line2 = m.group(2).replace('\t', '').strip()

                    for r in p.runs:
                        r.text = ''

                    target_run = p.runs[0] if len(p.runs) > 0 else p.add_run()
                    target_run.text = line1 + '\n' + line2

                    if sample_rPr is not None:
                        existing_rPr = target_run._r.rPr
                        if existing_rPr is not None:
                            target_run._r.remove(existing_rPr)
                        target_run._r.insert(0, copy.deepcopy(sample_rPr))
                    else:
                        if sample_font_name:
                            target_run.font.name = sample_font_name
                        if sample_font_size:
                            target_run.font.size = sample_font_size

                    target_run.bold = True

                    # Bersihkan extra run kosong
                    p_elem = p._p
                    for extra_r in p.runs[1:]:
                        p_elem.remove(extra_r._r)
                continue

            # Check list marker: '1.', '2.', 'I.', 'II.', '(1)', 'a.'
            m_list = re.match(r'^([IVXLCDM]+\.|\d+\.|\([0-9a-zA-Z]+\)|[a-z]\.)\s*', t)

            # Hilangkan tab liar di tengah kalimat (penyebab kata menjorok aneh ke kanan di Word)
            for i, r in enumerate(p.runs):
                if '\t' in r.text:
                    r.text = r.text.replace('\t', ' ')
                    if i > 0 and p.runs[i - 1].text.endswith((' ', '\t')) and r.text.startswith(' '):
                        r.text = r.text.lstrip(' ')

            # Posisikan 1 tab tepat setelah list marker di awal paragraf
            if m_list and p.runs:
                marker_str = m_list.group(1)
                # Abaikan klausul angka Romawi I. / II. yang memiliki perataan tersendiri
                if not (marker_str.endswith('.') and marker_str[:-1] in ('I', 'II', 'III', 'IV', 'V')):
                    r0 = p.runs[0]
                    m_r0 = re.match(r'^\s*(' + re.escape(marker_str) + r')\s*(.*)', r0.text)
                    if m_r0:
                        remainder = m_r0.group(2)
                        r0.text = m_r0.group(1) + '\t' + remainder.lstrip()
                        if not remainder.strip() and len(p.runs) > 1:
                            p.runs[1].text = p.runs[1].text.lstrip()

            # Format Klausul I, II, dan daftar penomoran dengan hanging indent yang rapi
            if t.startswith('I. PT PLN') or t.startswith('I. \tINSTITUT') or t.startswith('I. INSTITUT'):
                p.paragraph_format.left_indent = Pt(26.1)
                p.paragraph_format.first_line_indent = Pt(-14.8)
                p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            elif t.startswith('II. INSTITUT') or t.startswith('II. \tPT SINERGI') or t.startswith('II. PT SINERGI'):
                p.paragraph_format.left_indent = Pt(26.1)
                p.paragraph_format.first_line_indent = Pt(-18.0)
                p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            elif m_list:
                marker = m_list.group(1)
                if re.match(r'^\d+\.', marker) or re.match(r'^\([0-9a-zA-Z]+\)', marker):
                    p.paragraph_format.left_indent = Pt(21.3)
                    p.paragraph_format.first_line_indent = Pt(-21.3)
                    try:
                        p.paragraph_format.tab_stops.add_tab_stop(Pt(21.3))
                    except Exception:
                        pass
                    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                elif re.match(r'^[a-z]\.', marker):
                    p.paragraph_format.left_indent = Pt(42.6)
                    p.paragraph_format.first_line_indent = Pt(-21.3)
                    try:
                        p.paragraph_format.tab_stops.add_tab_stop(Pt(42.6))
                    except Exception:
                        pass
                    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

            # Pastikan spasi antar kata dan setelah koma terjaga
            skip_ends = (' ', '\t', '\n', '(', '"', '“', '/')
            skip_starts = (' ', '\t', '\n', ')', '.', ',', ':', ';', '!', '?', '"', '”')
            for i in range(len(p.runs) - 1):
                r1 = p.runs[i]
                r2 = p.runs[i + 1]
                if r1.text.endswith(',') and not r2.text.startswith(' '):
                    r1.text += ' '
                elif (r1.text and r2.text and 
                      not r1.text.endswith(skip_ends) and 
                      not r2.text.startswith(skip_starts) and
                      r1.text[-1].isalnum() and r2.text[0].isalnum()):
                    r1.text += ' '

            # Bersihkan spasi ganda dalam run
            for r in p.runs:
                while '  ' in r.text:
                    r.text = r.text.replace('  ', ' ')

        doc.save(docx_path)
    except Exception as e:
        print(f"Warning during refinement: {e}", file=sys.stderr)

def is_scanned_pdf(pdf_path):
    """
    Check if a PDF document is predominantly scanned / raster images with little or no digital text.
    """
    try:
        import fitz
        doc = fitz.open(pdf_path)
        if len(doc) == 0:
            return False
        total_text_len = 0
        for page in doc:
            text = page.get_text().strip()
            total_text_len += len(text)
        avg_text_len = total_text_len / len(doc)
        # If average text length per page is less than 50 characters, it's considered a scanned document
        return avg_text_len < 50
    except Exception as e:
        print(f"Warning checking scan status: {e}", file=sys.stderr)
        return False

def ocr_pdf_to_docx(pdf_path, docx_path):
    """
    High-Fidelity AI OCR Engine:
    Converts scanned PDF documents into beautifully formatted, 100% editable Microsoft Word documents (.docx).
    Features:
    1. Multi-pass noise filtering (removes scanner speckles, random dots at margins).
    2. Intelligent running header styling: clean, purple/slate color matching contract headers.
    3. Title & Heading Block detection: centered, hierarchical bold font (PERJANJIAN KERJA SAMA, ANTARA, DENGAN, TENTANG, NOMOR).
    4. Clause & Party normalization: merges isolated roman numerals (I., II.) and colons (:) with party names (INSTITUT TEKNOLOGI PLN, PT BANK MANDIRI).
    5. No more isolated ':' floating alone in paragraphs!
    6. Recovery of missing list markers (e.g., missing '1.' before '2. Bahwa...').
    7. Clean hanging indents for numbered clauses (1., 2., 3., ...).
    8. Full justification (WD_ALIGN_PARAGRAPH.JUSTIFY) for all narrative legal text instead of jagged left alignment.
    9. 100% editable text in Microsoft Word, no image flattening.
    """
    import fitz
    import numpy as np
    from PIL import Image
    from rapidocr_onnxruntime import RapidOCR

    print(f"Running AI-Powered OCR on '{pdf_path}'...")
    ocr_engine = RapidOCR()
    pdf_doc = fitz.open(pdf_path)
    word_doc = docx.Document()

    # Configure default page setup (A4 standard: 210 x 297 mm, 54pt margins)
    for section in word_doc.sections:
        section.page_width = Pt(595.3)
        section.page_height = Pt(841.9)
        section.top_margin = Pt(54)
        section.bottom_margin = Pt(54)
        section.left_margin = Pt(54)
        section.right_margin = Pt(54)

    for page_idx in range(len(pdf_doc)):
        if page_idx > 0:
            word_doc.add_page_break()

        page = pdf_doc[page_idx]
        # Render high-resolution pixmap (200 DPI gives optimal OCR speed & accuracy)
        pix = page.get_pixmap(dpi=200)
        img_np = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, pix.n))
        if pix.n == 4:
            img_np = img_np[:, :, :3]

        ocr_res, _ = ocr_engine(img_np)
        if not ocr_res:
            page_text = page.get_text().strip()
            if page_text:
                for line in page_text.split('\n'):
                    if line.strip():
                        p = word_doc.add_paragraph()
                        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                        r = p.add_run(line.strip())
                        r.font.name = 'Calibri'
                        r.font.size = Pt(11)
            else:
                p = word_doc.add_paragraph()
                r = p.add_run("[Halaman tidak memiliki teks terdeteksi]")
                r.italic = True
                r.font.color.rgb = docx.shared.RGBColor(150, 150, 150)
            continue

        # Extract OCR items
        items = []
        for box, text, score in ocr_res:
            text_str = text.strip()
            if not text_str:
                continue
            ymin = min(pt[1] for pt in box)
            ymax = max(pt[1] for pt in box)
            xmin = min(pt[0] for pt in box)
            xmax = max(pt[0] for pt in box)
            box_h = ymax - ymin
            box_w = xmax - xmin
            xc = (xmin + xmax) / 2
            items.append({
                'ymin': ymin,
                'ymax': ymax,
                'xmin': xmin,
                'xmax': xmax,
                'box_h': box_h,
                'box_w': box_w,
                'xc': xc,
                'text': text_str,
                'score': float(score)
            })

        if not items:
            continue

        pw = float(pix.width)
        ph = float(pix.height)

        # Sort items primarily from top to bottom
        items.sort(key=lambda it: it['ymin'])

        # Group items into logical horizontal lines with adaptive vertical tolerance
        lines = []
        current_line = []
        current_line_y = None
        current_line_h = None

        for it in items:
            if current_line_y is None:
                current_line = [it]
                current_line_y = it['ymin']
                current_line_h = it['box_h']
            else:
                y_diff = abs(it['ymin'] - current_line_y)
                # Adaptive tolerance: allows slight skew/tilt typical in scanned pages
                if y_diff < max(current_line_h, it['box_h']) * 0.65:
                    current_line.append(it)
                else:
                    current_line.sort(key=lambda x: x['xmin'])
                    lines.append(current_line)
                    current_line = [it]
                    current_line_y = it['ymin']
                    current_line_h = it['box_h']

        if current_line:
            current_line.sort(key=lambda x: x['xmin'])
            lines.append(current_line)

        # Pass 1: Build raw line records & filter isolated scanner speckles/noise
        raw_lines = []
        for line_items in lines:
            line_text = " ".join(it['text'] for it in line_items).strip()
            if not line_text:
                continue

            line_xmin = min(it['xmin'] for it in line_items)
            line_xmax = max(it['xmax'] for it in line_items)
            line_ymin = min(it['ymin'] for it in line_items)
            line_ymax = max(it['ymax'] for it in line_items)
            line_h = max(it['box_h'] for it in line_items)
            line_xc = (line_xmin + line_xmax) / 2

            # Denoise: Filter isolated punctuation/noise speckles at top or bottom margins (e.g. standalone '.', '-')
            if len(line_text) <= 2 and not any(c.isalnum() for c in line_text) and (line_ymin < 120 or line_ymin > ph - 100):
                continue

            raw_lines.append({
                'text': line_text,
                'xmin': line_xmin,
                'xmax': line_xmax,
                'ymin': line_ymin,
                'ymax': line_ymax,
                'h': line_h,
                'xc': line_xc
            })

        # Pass 2: Structural Semantic Normalization
        # Merges split Roman numerals ('I', 'II'), handles isolated ':' colons, and fixes layout breaks
        structured_lines = []
        idx = 0
        while idx < len(raw_lines):
            curr = raw_lines[idx]
            t = curr['text'].strip()

            # 1. Merge isolated Roman numerals ('I', 'II', etc.) with party name on next line
            if re.match(r'^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.?$', t):
                if idx + 1 < len(raw_lines):
                    next_l = raw_lines[idx + 1]
                    next_t = next_l['text'].strip()
                    if any(next_t.upper().startswith(k) for k in ['INSTITUT', 'PT', 'BANK', 'YAYASAN', 'KEMENTERIAN', 'DINAS', 'CV', 'BADAN', 'LEMBAGA']):
                        curr['text'] = f"{t.rstrip('.')} . {next_t}".replace(' . ', '. ')
                        curr['ymax'] = max(curr['ymax'], next_l['ymax'])
                        curr['xmax'] = max(curr['xmax'], next_l['xmax'])
                        curr['h'] = max(curr['h'], next_l['h'])
                        idx += 1
                        t = curr['text']

            # 2. Check if next line is an isolated colon ':' or starts with colon ': '
            if idx + 1 < len(raw_lines):
                next_l = raw_lines[idx + 1]
                next_t = next_l['text'].strip()
                if next_t in [':', ' : ', ':-']:
                    # Merge colon into current line
                    curr['text'] = curr['text'].rstrip(' :') + ' :'
                    idx += 1
                elif next_t.startswith(': '):
                    curr['text'] = curr['text'].rstrip(' :') + ' :'
                    next_l['text'] = next_t[1:].strip()

            # 3. If current line itself is an isolated colon, attach to previous line if possible
            if curr['text'].strip() in [':', ' : ', ':-']:
                if structured_lines:
                    structured_lines[-1]['text'] = structured_lines[-1]['text'].rstrip(' :') + ' :'
                idx += 1
                continue

            structured_lines.append(curr)
            idx += 1

        # Pass 3: Recover missing list number (e.g., missing '1.' before '2. Bahwa...')
        for i in range(len(structured_lines)):
            t_now = structured_lines[i]['text'].strip()
            if t_now.startswith('Bahwa ') and not re.match(r'^\d+\.', t_now):
                for j in range(i + 1, min(i + 4, len(structured_lines))):
                    t_next = structured_lines[j]['text'].strip()
                    if re.match(r'^2[\.\)]\s*Bahwa', t_next):
                        structured_lines[i]['text'] = '1. ' + t_now
                        break

        # Pass 4: Render to Word Document with native legal layout & typography
        title_keywords = [
            "PERJANJIAN KERJA SAMA", "ANTARA", "DENGAN", "TENTANG",
            "SEWA LAHAN", "NOMOR PIHAK", "NOMOR :", "NO :"
        ]

        for line in structured_lines:
            line_text = line['text'].strip()
            if not line_text:
                continue

            line_ymin = line['ymin']
            t_upper = line_text.upper()

            # A. Detect Running Header (e.g. 'Draft PKS Sewa ATM ITPLN (Bank Mandiri)')
            is_header = False
            if line_ymin < 160 and any(k in line_text.lower() for k in ['draft pks', 'pks sewa', 'perjanjian kerja sama', 'itpln']):
                if len(line_text) < 70 and (page_idx > 0 or (page_idx == 0 and not line_text.isupper())):
                    is_header = True

            if is_header:
                p = word_doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(12)
                r = p.add_run(line_text)
                r.font.name = 'Calibri'
                r.font.size = Pt(9.5)
                r.bold = True
                r.font.color.rgb = docx.shared.RGBColor(107, 33, 168)  # Elegant Purple matching contract
                continue

            # B. Detect Contract Title Block (Centered, Bold, Clean hierarchy)
            is_title = False
            if page_idx == 0 and line_ymin < ph * 0.46:
                if any(k in t_upper for k in title_keywords):
                    is_title = True
                elif line_text.isupper() and len(line_text) < 80 and ("PLN" in line_text or "BANK MANDIRI" in line_text):
                    is_title = True

            if is_title:
                p = word_doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(2)
                p.paragraph_format.line_spacing = 1.15

                # Font size hierarchy
                if "PERJANJIAN KERJA SAMA" in t_upper:
                    f_size = Pt(13.5)
                elif any(k in t_upper for k in ["INSTITUT TEKNOLOGI PLN", "PT BANK MANDIRI"]):
                    f_size = Pt(12)
                else:
                    f_size = Pt(11)

                r = p.add_run(line_text)
                r.font.name = 'Calibri'
                r.font.size = f_size
                r.bold = True
                continue

            # C. Detect Clause / Party Header (I. INSTITUT TEKNOLOGI PLN : or II. PT BANK MANDIRI : )
            is_party = bool(re.match(r'^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+(INSTITUT|PT|BANK|YAYASAN)', line_text, re.IGNORECASE))
            if is_party:
                p = word_doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                p.paragraph_format.space_before = Pt(8)
                p.paragraph_format.space_after = Pt(2)
                r = p.add_run(line_text)
                r.font.name = 'Calibri'
                r.font.size = Pt(11)
                r.bold = True
                continue

            # D. Detect Numbered Agreement Items (1., 2., 3., ...) with clean hanging indents
            m_num = re.match(r'^(\d+\.|\([0-9a-zA-Z]+\)|[a-z]\.)\s+(.+)', line_text)
            if m_num:
                p = word_doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                p.paragraph_format.left_indent = Pt(21.3)
                p.paragraph_format.first_line_indent = Pt(-21.3)
                p.paragraph_format.space_before = Pt(3)
                p.paragraph_format.space_after = Pt(4)
                p.paragraph_format.line_spacing = 1.15
                r = p.add_run(line_text)
                r.font.name = 'Calibri'
                r.font.size = Pt(11)
                r.bold = False
                continue

            # E. Detect Party Description (indented under Party I / II)
            is_party_desc = line_text.startswith("Suatu perguruan tinggi") or line_text.startswith("Suatu Perseroan terbatas")
            if is_party_desc:
                p = word_doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                p.paragraph_format.left_indent = Pt(14)
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(6)
                p.paragraph_format.line_spacing = 1.15
                r = p.add_run(line_text)
                r.font.name = 'Calibri'
                r.font.size = Pt(11)
                r.bold = False
                continue

            # F. Standard Legal Narrative Body Paragraph (Fully Justified)
            p = word_doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.line_spacing = 1.15
            r = p.add_run(line_text)
            r.font.name = 'Calibri'
            r.font.size = Pt(11)
            r.bold = False

    word_doc.save(docx_path)
    print("AI OCR conversion to Word completed successfully!")

def convert(pdf_path, docx_path, ocr_mode='auto'):
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file '{pdf_path}' not found.", file=sys.stderr)
        sys.exit(1)

    print(f"Converting '{pdf_path}' to '{docx_path}' (OCR mode: {ocr_mode})...")

    # Determine if OCR should be applied
    use_ocr = False
    if ocr_mode == 'force':
        use_ocr = True
    elif ocr_mode == 'auto':
        use_ocr = is_scanned_pdf(pdf_path)
        if use_ocr:
            print("Scanned document detected (minimal digital text). Switching to AI OCR engine...")

    if use_ocr:
        try:
            ocr_pdf_to_docx(pdf_path, docx_path)
            return
        except Exception as ocr_err:
            print(f"Warning: OCR engine failed ({ocr_err}). Falling back to standard pdf2docx...", file=sys.stderr)

    # Standard digital conversion
    try:
        cv = Converter(pdf_path)
        cv.convert(docx_path)
        cv.close()
        refine_docx(docx_path)
        print("Conversion completed successfully!")
    except Exception as e:
        print(f"Error during standard conversion: {e}", file=sys.stderr)
        # If standard conversion failed and OCR wasn't tried yet, try OCR as last resort
        if not use_ocr:
            print("Attempting OCR recovery fallback...", file=sys.stderr)
            try:
                ocr_pdf_to_docx(pdf_path, docx_path)
                return
            except Exception as e2:
                print(f"OCR recovery also failed: {e2}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Convert PDF to Word DOCX with high fidelity and AI OCR.")
    parser.add_argument("input", help="Path to input PDF file")
    parser.add_argument("output", help="Path to output DOCX file")
    parser.add_argument("--ocr", default="auto", choices=["auto", "force", "off"], help="OCR mode: auto (default), force, or off")
    args = parser.parse_args()

    convert(args.input, args.output, ocr_mode=args.ocr)

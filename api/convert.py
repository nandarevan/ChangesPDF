from http.server import BaseHTTPRequestHandler
import cgi
import tempfile
import os
import sys
import re
import copy
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

        # 2. Fix top banner anchor images: set behindDoc='0' and remove covered header text
        for p in doc.paragraphs[:5]:
            for anchor in p._p.xpath('.//wp:anchor'):
                anchor.set('behindDoc', '0')

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

            # Hilangkan tab di tengah kalimat (penyebab kata menjorok aneh ke kanan di Word)
            first_tab_kept = False
            for r in p.runs:
                if '\t' in r.text:
                    if m_list and not first_tab_kept:
                        parts = r.text.split('\t')
                        r.text = parts[0] + '\t' + ' '.join(pt for pt in parts[1:] if pt)
                        first_tab_kept = True
                    else:
                        r.text = r.text.replace('\t', ' ')

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

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        in_path = None
        out_path = None
        try:
            content_type = self.headers.get('content-type', '')
            if 'multipart/form-data' not in content_type:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Expected multipart/form-data"}')
                return

            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={'REQUEST_METHOD': 'POST', 'CONTENT_TYPE': content_type}
            )

            if 'file' not in form:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "No file field found in request"}')
                return

            file_item = form['file']
            file_data = file_item.file.read()

            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as in_f:
                in_f.write(file_data)
                in_path = in_f.name

            out_path = in_path.replace('.pdf', '.docx')
            cv = Converter(in_path)
            cv.convert(out_path)
            cv.close()

            # Apply targeted refinements
            refine_docx(out_path)

            with open(out_path, 'rb') as out_f:
                docx_bytes = out_f.read()

            self.send_response(200)
            self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            self.send_header('Content-Disposition', 'attachment; filename="converted.docx"')
            self.send_header('Content-Length', str(len(docx_bytes)))
            self.end_headers()
            self.wfile.write(docx_bytes)
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(f'{{"error": "{str(e)}"}}'.encode('utf-8'))
        finally:
            if in_path and os.path.exists(in_path):
                try:
                    os.remove(in_path)
                except:
                    pass
            if out_path and os.path.exists(out_path):
                try:
                    os.remove(out_path)
                except:
                    pass

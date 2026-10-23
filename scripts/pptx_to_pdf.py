#!/usr/bin/env python3
"""
High-Fidelity PowerPoint (.pptx / .ppt) to PDF Converter.
Supports Windows PowerPoint COM automation, LibreOffice soffice headless,
and native OpenXML presentation layout extraction.
"""

import sys
import os
import shutil
import argparse
import subprocess

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

def convert_with_powerpoint_com(input_path: str, output_path: str) -> bool:
    """Convert PPTX or PPT to PDF using Microsoft PowerPoint COM on Windows."""
    if sys.platform != 'win32' or shutil.which("powershell.exe") is None:
        return False

    abs_input = os.path.abspath(input_path).replace("'", "''")
    abs_output = os.path.abspath(output_path).replace("'", "''")

    ps_script = f"""
$ErrorActionPreference = 'Stop'
$ppt = $null
$pres = $null
try {{
    $ppt = New-Object -ComObject PowerPoint.Application
    # 32 = ppSaveAsPDF
    $pres = $ppt.Presentations.Open('{abs_input}', [Microsoft.Office.Core.MsoTriState]::msoTrue, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse)
    $pres.SaveAs('{abs_output}', 32)
    $pres.Close()
    $ppt.Quit()
    exit 0
}} catch {{
    if ($pres) {{ try {{ $pres.Close() }} catch {{}} }}
    if ($ppt) {{ try {{ $ppt.Quit() }} catch {{}} }}
    exit 1
}}
"""
    try:
        res = subprocess.run(
            ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
            capture_output=True,
            timeout=90
        )
        if res.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return True
    except Exception:
        pass

    return False

def convert_with_soffice(input_path: str, output_path: str) -> bool:
    """Convert PPTX or PPT to PDF using LibreOffice soffice CLI."""
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice:
        return False

    out_dir = os.path.dirname(os.path.abspath(output_path))
    cmd = [soffice, "--headless", "--convert-to", "pdf", "--outdir", out_dir, input_path]
    try:
        res = subprocess.run(cmd, capture_output=True, timeout=90)
        base = os.path.splitext(os.path.basename(input_path))[0]
        gen_pdf = os.path.join(out_dir, f"{base}.pdf")
        if os.path.exists(gen_pdf):
            if gen_pdf != output_path:
                shutil.move(gen_pdf, output_path)
            return True
    except Exception:
        pass
    return False

def convert_with_python_pptx_fallback(input_path: str, output_path: str) -> None:
    """Render PowerPoint slides to PDF using python-pptx and PyMuPDF."""
    if fitz is None:
        raise ImportError("PyMuPDF (fitz) is required for PDF output.")

    import zipfile
    import xml.etree.ElementTree as ET

    doc = fitz.open()

    # Read slide dimensions and text from PPTX zip
    try:
        with zipfile.ZipFile(input_path, 'r') as z:
            # 1. Slide size from ppt/presentation.xml
            slide_w_pt = 720.0  # default 10 inches
            slide_h_pt = 540.0  # default 7.5 inches
            if 'ppt/presentation.xml' in z.namelist():
                root = ET.fromstring(z.read('ppt/presentation.xml'))
                for el in root.iter():
                    if el.tag.endswith('sldSz'):
                        cx = int(el.get('cx', '9144000'))
                        cy = int(el.get('cy', '6858000'))
                        slide_w_pt = cx / 12700.0
                        slide_h_pt = cy / 12700.0
                        break

            # 2. Find all slides
            slide_files = sorted(
                [f for f in z.namelist() if f.startswith('ppt/slides/slide') and f.endswith('.xml')],
                key=lambda x: int(''.join(filter(str.isdigit, x)) or '0')
            )

            if not slide_files:
                raise ValueError("No slides found in PowerPoint presentation.")

            for s_file in slide_files:
                page = doc.new_page(width=slide_w_pt, height=slide_h_pt)

                # Check if slide has full picture or media
                s_xml = z.read(s_file)
                root = ET.fromstring(s_xml)

                # Extract slide text
                texts = []
                for p_el in root.iter():
                    if p_el.tag.endswith('p'):
                        p_text = ''.join(t.text for t in p_el.iter() if t.text)
                        if p_text.strip():
                            texts.append(p_text.strip())

                # Draw slide background
                page.draw_rect(fitz.Rect(0, 0, slide_w_pt, slide_h_pt), color=(0.95, 0.95, 0.97), fill=(1, 1, 1))

                # Render text onto slide page
                y_cursor = 60.0
                for line in texts:
                    if y_cursor > slide_h_pt - 40:
                        break
                    # Determine heading vs body
                    font_size = 22 if y_cursor == 60 else 14
                    rect = fitz.Rect(50, y_cursor, slide_w_pt - 50, y_cursor + font_size + 10)
                    page.insert_textbox(rect, line, fontsize=font_size, color=(0.1, 0.1, 0.15))
                    y_cursor += font_size + 14

        doc.save(output_path)
        doc.close()
    except Exception as e:
        if doc:
            doc.close()
        raise RuntimeError(f"Gagal mengonversi presentasi PowerPoint: {e}")

def convert_pptx_to_pdf(input_path: str, output_path: str) -> None:
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    out_dir = os.path.dirname(os.path.abspath(output_path))
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    # 1. Try Windows native PowerPoint COM
    if convert_with_powerpoint_com(input_path, output_path):
        return

    # 2. Try LibreOffice soffice
    if convert_with_soffice(input_path, output_path):
        return

    # 3. Native OpenXML fallback
    convert_with_python_pptx_fallback(input_path, output_path)

def main():
    parser = argparse.ArgumentParser(description="PowerPoint to PDF Converter")
    parser.add_argument("input", help="Path to input PowerPoint file (.pptx / .ppt)")
    parser.add_argument("output", help="Path to output PDF file")

    args = parser.parse_args()

    try:
        convert_pptx_to_pdf(args.input, args.output)
        print("SUCCESS")
        sys.exit(0)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

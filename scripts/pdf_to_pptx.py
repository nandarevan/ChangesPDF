#!/usr/bin/env python3
"""
High-Fidelity PDF to PowerPoint (.pptx) Converter.
Converts each PDF page into a PowerPoint slide with crisp visual rendering
and preserved aspect ratio.
"""

import sys
import os
import io
import argparse

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

def convert_pdf_to_pptx(input_path: str, output_path: str) -> None:
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input PDF not found: {input_path}")

    if fitz is None:
        raise ImportError("PyMuPDF (fitz) is required to convert PDF to PPTX.")

    doc = fitz.open(input_path)
    if doc.page_count == 0:
        doc.close()
        raise ValueError("PDF document has 0 pages.")

    out_dir = os.path.dirname(os.path.abspath(output_path))
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    # Try python-pptx first
    try:
        from pptx import Presentation
        from pptx.util import Inches, Pt
        from pptx.enum.text import PP_ALIGN

        prs = Presentation()
        # Use first page aspect ratio for the deck dimensions
        first_page = doc[0]
        p_rect = first_page.rect
        p_w = p_rect.width
        p_h = p_rect.height

        # Convert points (72 pt = 1 inch) to Inches
        slide_w_in = max(4.0, min(20.0, p_w / 72.0))
        slide_h_in = max(3.0, min(20.0, p_h / 72.0))

        prs.slide_width = Inches(slide_w_in)
        prs.slide_height = Inches(slide_h_in)
        blank_layout = prs.slide_layouts[6] if len(prs.slide_layouts) > 6 else prs.slide_layouts[0]

        for page_num in range(doc.page_count):
            page = doc[page_num]
            # Render page at 200 DPI for high visual clarity in presentations
            zoom = 200.0 / 72.0
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, alpha=False)

            img_bytes = pix.tobytes("jpeg")
            img_stream = io.BytesIO(img_bytes)

            slide = prs.slides.add_slide(blank_layout)
            slide.shapes.add_picture(
                img_stream,
                0,
                0,
                width=prs.slide_width,
                height=prs.slide_height
            )

        prs.save(output_path)
        doc.close()
        return
    except ImportError:
        pass

    # Fallback OpenXML generator if python-pptx is not installed
    import zipfile
    out_zip = zipfile.ZipFile(output_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9)

    first_page = doc[0]
    p_rect = first_page.rect
    # In OpenXML drawingML, 1 inch = 914400 EMUs, 1 pt = 12700 EMUs
    slide_w_emu = int(p_rect.width * 12700)
    slide_h_emu = int(p_rect.height * 12700)

    # 1. [Content_Types].xml
    content_types_parts = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
        '<Default Extension="xml" ContentType="application/xml"/>',
        '<Default Extension="jpeg" ContentType="image/jpeg"/>',
        '<Default Extension="jpg" ContentType="image/jpeg"/>',
        '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>',
    ]

    # 2. _rels/.rels
    root_rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>\n'
        '</Relationships>'
    )
    out_zip.writestr('_rels/.rels', root_rels)

    pres_rels_parts = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    ]

    sld_id_lst = []

    for page_num in range(doc.page_count):
        idx = page_num + 1
        slide_part = f"/ppt/slides/slide{idx}.xml"
        content_types_parts.append(
            f'<Override PartName="{slide_part}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
        )

        r_id = f"rId{idx}"
        pres_rels_parts.append(
            f'<Relationship Id="{r_id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{idx}.xml"/>'
        )
        sld_id_lst.append(f'<p:sldId id="{255 + idx}" r:id="{r_id}"/>')

        # Render page image
        page = doc[page_num]
        zoom = 200.0 / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_data = pix.tobytes("jpeg")

        img_filename = f"image{idx}.jpeg"
        out_zip.writestr(f"ppt/media/{img_filename}", img_data)

        # Slide rels
        slide_rels = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
            f'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/{img_filename}"/>\n'
            '</Relationships>'
        )
        out_zip.writestr(f"ppt/slides/_rels/slide{idx}.xml.rels", slide_rels)

        # Slide XML
        slide_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="{10 + idx}" name="SlidePicture{idx}"/>
          <p:cNvPicPr>
            <a:picLocks noChangeAspect="1"/>
          </p:cNvPicPr>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="rId1"/>
          <a:stretch>
            <a:fillRect/>
          </a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="{slide_w_emu}" cy="{slide_h_emu}"/>
          </a:xfrm>
          <a:prstGeom prst="rect">
            <a:avLst/>
          </a:prstGeom>
        </p:spPr>
      </p:pic>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:sld>"""
        out_zip.writestr(f"ppt/slides/slide{idx}.xml", slide_xml)

    content_types_parts.append('</Types>')
    out_zip.writestr('[Content_Types].xml', '\n'.join(content_types_parts))

    pres_rels_parts.append('</Relationships>')
    out_zip.writestr('ppt/_rels/presentation.xml.rels', '\n'.join(pres_rels_parts))

    # presentation.xml
    pres_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst/>
  <p:sldIdLst>
    {''.join(sld_id_lst)}
  </p:sldIdLst>
  <p:sldSz cx="{slide_w_emu}" cy="{slide_h_emu}" type="custom"/>
  <p:notesSz cx="{slide_w_emu}" cy="{slide_h_emu}"/>
</p:presentation>"""
    out_zip.writestr('ppt/presentation.xml', pres_xml)

    out_zip.close()
    doc.close()

def main():
    parser = argparse.ArgumentParser(description="PDF to PPTX Converter")
    parser.add_argument("input", help="Path to input PDF file")
    parser.add_argument("output", help="Path to output PPTX file")

    args = parser.parse_args()

    try:
        convert_pdf_to_pptx(args.input, args.output)
        print("SUCCESS")
        sys.exit(0)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

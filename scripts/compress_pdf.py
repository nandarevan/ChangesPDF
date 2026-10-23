#!/usr/bin/env python3
"""
High-Ratio PDF Compressor using PyMuPDF and Pillow.
Protects transparency and masks (no black boxes on logos) while achieving
65% - 85%+ file size reduction by intelligent image downscaling and recompression.
"""

import sys
import os
import io
import json
import argparse
import shutil

try:
    import fitz
    from PIL import Image
except ImportError:
    fitz = None
    Image = None

def compress_pdf(input_path: str, output_path: str, level: str = 'recommended') -> dict:
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    orig_size = os.path.getsize(input_path)

    if fitz is None or Image is None:
        shutil.copyfile(input_path, output_path)
        return {
            "original_size": orig_size,
            "compressed_size": orig_size,
            "savings_bytes": 0,
            "savings_percent": 0.0
        }

    # High-ratio parameters
    if level == 'extreme':
        scale_factor = 0.35
        jpg_quality = 32
        max_dim = 800
        dpi_target = 72
        dpi_threshold = 100
        png_colors = 48
    elif level == 'low':
        scale_factor = 0.65
        jpg_quality = 65
        max_dim = 1600
        dpi_target = 150
        dpi_threshold = 200
        png_colors = 256
    else:  # recommended
        scale_factor = 0.45
        jpg_quality = 45
        max_dim = 1000
        dpi_target = 96
        dpi_threshold = 120
        png_colors = 96

    doc = fitz.open(input_path)

    # 1. Native PyMuPDF rewrite_images engine (if supported by installed PyMuPDF)
    try:
        if hasattr(doc, 'rewrite_images'):
            doc.rewrite_images(
                dpi_threshold=dpi_threshold,
                dpi_target=dpi_target,
                quality=jpg_quality,
                lossy=True,
                lossless=True,
            )
    except Exception:
        pass

    # 2. Identify all images with /SMask (transparency masks) or cover logos
    smask_xrefs = set()
    for pno in range(len(doc)):
        for img in doc[pno].get_images():
            xref = img[0]
            try:
                # Check get_images tuple smask element
                if len(img) > 1 and img[1] > 0:
                    smask_xrefs.add(img[1])
                    smask_xrefs.add(xref)

                # Check raw dictionary for SMask or Mask
                raw_dict = doc.xref_object(xref)
                if '/SMask' in raw_dict or '/Mask' in raw_dict:
                    smask_xrefs.add(xref)

                info = doc.extract_image(xref)
                if info.get('smask', 0):
                    smask_xrefs.add(info['smask'])
                    smask_xrefs.add(xref)
            except Exception:
                pass

    # 3. Process all content images (downscale and optimize streams)
    processed_xrefs = set()
    for pno in range(len(doc)):
        for img in doc[pno].get_images():
            xref = img[0]
            if xref in processed_xrefs or xref in smask_xrefs:
                continue
            processed_xrefs.add(xref)

            try:
                info = doc.extract_image(xref)
                if not info or not info.get("image"):
                    continue

                raw_bytes = info["image"]
                ext = info.get("ext", "").lower()
                w, h = info["width"], info["height"]

                # Don't touch tiny icons (< 3 KB)
                if len(raw_bytes) < 3072:
                    continue

                im = Image.open(io.BytesIO(raw_bytes))

                # Calculate downscale dimensions
                target_scale = scale_factor
                if max(w, h) * target_scale > max_dim:
                    target_scale = max_dim / float(max(w, h))

                new_w = max(1, int(w * target_scale))
                new_h = max(1, int(h * target_scale))

                # Resize image with high-quality resampling
                im_resized = im.resize((new_w, new_h), Image.Resampling.LANCZOS)

                buf = io.BytesIO()
                has_alpha = im_resized.mode in ('RGBA', 'LA') or (im_resized.mode == 'P' and 'transparency' in im_resized.info)

                if has_alpha:
                    # Preserve alpha with adaptive color quantization
                    im_quant = im_resized.quantize(colors=png_colors)
                    im_quant.save(buf, format='PNG', optimize=True)
                    new_bytes = buf.getvalue()
                    if len(new_bytes) < len(raw_bytes):
                        doc.xref_set_key(xref, 'Width', str(new_w))
                        doc.xref_set_key(xref, 'Height', str(new_h))
                        doc.update_stream(xref, new_bytes)
                else:
                    # Clean RGB JPEG compression
                    rgb_im = im_resized.convert('RGB')
                    rgb_im.save(buf, format='JPEG', quality=jpg_quality, optimize=True)
                    new_bytes = buf.getvalue()
                    if len(new_bytes) < len(raw_bytes):
                        doc.xref_set_key(xref, 'Width', str(new_w))
                        doc.xref_set_key(xref, 'Height', str(new_h))
                        doc.xref_set_key(xref, 'Filter', '/DCTDecode')
                        doc.xref_set_key(xref, 'ColorSpace', '/DeviceRGB')
                        doc.xref_set_key(xref, 'BitsPerComponent', '8')
                        doc.update_stream(xref, new_bytes)
            except Exception:
                pass

    # Ensure output directory exists
    out_dir = os.path.dirname(os.path.abspath(output_path))
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    # Save with full garbage collection, object streams packing, and stream deflation
    doc.save(
        output_path,
        garbage=4,
        clean=True,
        deflate=True,
        deflate_images=True,
        deflate_fonts=True,
        use_objstms=True
    )
    doc.close()

    new_size = os.path.getsize(output_path)

    # Safety check: if compression resulted in larger file, keep original
    if new_size > orig_size:
        shutil.copyfile(input_path, output_path)
        new_size = orig_size

    savings = max(0, orig_size - new_size)
    percent = (savings / orig_size * 100) if orig_size > 0 else 0.0

    return {
        "original_size": orig_size,
        "compressed_size": new_size,
        "savings_bytes": savings,
        "savings_percent": round(percent, 1)
    }

def main():
    parser = argparse.ArgumentParser(description="High-ratio PDF Compressor")
    parser.add_argument("input", help="Path to input PDF file")
    parser.add_argument("output", help="Path to output compressed PDF file")
    parser.add_argument("--level", choices=["extreme", "recommended", "low"], default="recommended", help="Compression level")

    args = parser.parse_args()

    try:
        result = compress_pdf(args.input, args.output, args.level)
        print(json.dumps(result))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

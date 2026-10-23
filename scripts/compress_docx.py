#!/usr/bin/env python3
"""
High-Ratio Word (.docx / .doc) Document Compressor.
Supports Extreme, Recommended, and Low compression levels.
Aggressively optimizes embedded media (resizing & re-encoding images) while preserving
document structure, text, and formatting.
Maintains 100% transparency for logos and icons (no black box background artifacts).
"""

import sys
import os
import io
import json
import zipfile
import shutil
import argparse
import subprocess

try:
    from PIL import Image
except ImportError:
    Image = None

def convert_doc_to_docx_if_needed(file_path: str) -> tuple[str, bool]:
    """If file is a legacy .doc binary file, convert to .docx using Word COM on Windows."""
    if not file_path.lower().endswith('.doc'):
        return file_path, False

    if sys.platform != 'win32' or shutil.which("powershell.exe") is None:
        return file_path, False

    docx_path = file_path + 'x'
    abs_input = os.path.abspath(file_path).replace("'", "''")
    abs_output = os.path.abspath(docx_path).replace("'", "''")

    ps_script = f"""
$ErrorActionPreference = 'Stop'
$word = $null
$doc = $null
try {{
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $doc = $word.Documents.Open('{abs_input}', $false, $true)
    $doc.SaveAs([ref]'{abs_output}', [ref]16)
    $doc.Close([ref]0)
    $word.Quit()
    exit 0
}} catch {{
    if ($doc) {{ try {{ $doc.Close([ref]0) }} catch {{}} }}
    if ($word) {{ try {{ $word.Quit() }} catch {{}} }}
    exit 1
}}
"""
    try:
        res = subprocess.run(
            ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
            capture_output=True,
            timeout=60
        )
        if res.returncode == 0 and os.path.exists(docx_path):
            return docx_path, True
    except Exception:
        pass

    return file_path, False

def compress_docx(input_path: str, output_path: str, level: str = 'recommended') -> dict:
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    orig_size = os.path.getsize(input_path)
    actual_input, converted_temp = convert_doc_to_docx_if_needed(input_path)

    out_dir = os.path.dirname(os.path.abspath(output_path))
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    if Image is None:
        shutil.copyfile(actual_input, output_path)
        if converted_temp and os.path.exists(actual_input):
            os.remove(actual_input)
        return {
            "original_size": orig_size,
            "compressed_size": orig_size,
            "savings_bytes": 0,
            "savings_percent": 0.0
        }

    # Parameters tuned for 50% - 85% file size reduction with crisp visual clarity
    if level == 'extreme':
        scale_factor = 0.40
        jpg_quality = 48
        max_dim = 1000
    elif level == 'low':
        scale_factor = 0.75
        jpg_quality = 72
        max_dim = 1800
    else:  # recommended
        scale_factor = 0.55
        jpg_quality = 58
        max_dim = 1300

    try:
        in_zip = zipfile.ZipFile(actual_input, 'r')
    except Exception:
        shutil.copyfile(actual_input, output_path)
        if converted_temp and os.path.exists(actual_input):
            os.remove(actual_input)
        return {
            "original_size": orig_size,
            "compressed_size": orig_size,
            "savings_bytes": 0,
            "savings_percent": 0.0
        }

    out_zip = zipfile.ZipFile(output_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9)

    for item in in_zip.infolist():
        data = in_zip.read(item.filename)

        is_media_image = item.filename.startswith('word/media/') and any(
            item.filename.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp']
        )

        if is_media_image:
            try:
                # Skip tiny bullets or icons under 3 KB
                if len(data) > 3072:
                    im = Image.open(io.BytesIO(data))
                    w, h = im.size

                    is_png = item.filename.lower().endswith('.png')

                    # Check for real alpha transparency
                    has_transparency = False
                    if im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info):
                        try:
                            im_rgba = im.convert('RGBA')
                            alpha = im_rgba.getchannel('A')
                            min_a, _ = alpha.getextrema()
                            if min_a < 250:
                                has_transparency = True
                        except Exception:
                            has_transparency = True

                    # 1. Images with transparency (logos, emblems, signatures):
                    # Never quantize! Quantization turns transparent pixels into a black rectangle.
                    # Keep original dimensions for logos (< 250 KB) to ensure crisp text and sharp lines.
                    if has_transparency:
                        buf = io.BytesIO()
                        if len(data) < 250 * 1024:
                            # Optimize PNG without resizing
                            im.save(buf, format='PNG', optimize=True)
                        else:
                            # Large transparent image: resize safely with Lanczos
                            target_scale = scale_factor
                            if max(w, h) * target_scale > max_dim:
                                target_scale = max_dim / float(max(w, h))
                            new_w = max(1, int(w * target_scale))
                            new_h = max(1, int(h * target_scale))
                            im_resized = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
                            im_resized.save(buf, format='PNG', optimize=True)

                        new_data = buf.getvalue()
                        if len(new_data) < len(data):
                            data = new_data

                    # 2. Fully opaque images: photos, document scans, screenshots
                    else:
                        target_scale = scale_factor
                        if max(w, h) * target_scale > max_dim:
                            target_scale = max_dim / float(max(w, h))
                        new_w = max(1, int(w * target_scale))
                        new_h = max(1, int(h * target_scale))
                        im_resized = im.resize((new_w, new_h), Image.Resampling.LANCZOS)

                        buf = io.BytesIO()
                        if is_png:
                            # Keep PNG format so Word document structure is valid
                            im_resized.save(buf, format='PNG', optimize=True)
                        else:
                            # Clean RGB JPEG recompression
                            rgb_im = im_resized.convert('RGB')
                            rgb_im.save(buf, format='JPEG', quality=jpg_quality, optimize=True)

                        new_data = buf.getvalue()
                        if len(new_data) < len(data):
                            data = new_data
            except Exception:
                pass

        out_zip.writestr(item, data)

    in_zip.close()
    out_zip.close()

    if converted_temp and os.path.exists(actual_input):
        try:
            os.remove(actual_input)
        except Exception:
            pass

    new_size = os.path.getsize(output_path)
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
    parser = argparse.ArgumentParser(description="High-ratio Word Compressor")
    parser.add_argument("input", help="Path to input Word file (.docx / .doc)")
    parser.add_argument("output", help="Path to output compressed Word file")
    parser.add_argument("--level", choices=["extreme", "recommended", "low"], default="recommended", help="Compression level")

    args = parser.parse_args()

    try:
        result = compress_docx(args.input, args.output, args.level)
        print(json.dumps(result))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
